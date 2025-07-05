const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../utils/logger');

class XMLFeedService {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
      trim: true,
      strict: false,
      normalize: true,
      normalizeTags: true,
      explicitChildren: false,
      mergeAttrs: false,
      attrNameProcessors: [],
      tagNameProcessors: [],
      valueProcessors: [],
      emptyTag: '',
      renderOpts: {
        pretty: false,
        indent: '',
        newline: ''
      }
    });
    
    this.timeout = parseInt(process.env.REQUEST_TIMEOUT) || 30000;
    this.maxRetries = parseInt(process.env.MAX_RETRIES) || 3;
  }

  // Fetch and parse XML feed
  async fetchFeed(feedUrl, feedName) {
    const startTime = Date.now();
    let retries = 0;
    
    let xmlData = null;
    
    while (retries < this.maxRetries) {
      try {
        logger.info(`Fetching feed: ${feedName} (${feedUrl})`);
        
        const response = await axios.get(feedUrl, {
          timeout: this.timeout,
          headers: {
            'User-Agent': 'Knovator-Job-Importer/1.0',
            'Accept': 'application/xml, text/xml, */*'
          }
        });

        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        xmlData = response.data;
        
        // Check if the response is actually XML
        if (!xmlData || typeof xmlData !== 'string') {
          throw new Error('Response is not valid XML data');
        }
        
        // Check if the response contains XML-like content
        if (!xmlData.includes('<') || !xmlData.includes('>')) {
          throw new Error('Response does not contain XML content');
        }
        
        const parsedData = await this.parseXML(xmlData);
        const jobs = this.extractJobs(parsedData, feedUrl, feedName);
        
        const duration = Date.now() - startTime;
        logger.info(`Successfully fetched ${jobs.length} jobs from ${feedName} in ${duration}ms`);
        
        return {
          jobs,
          totalFetched: jobs.length,
          duration,
          success: true
        };

      } catch (error) {
        retries++;
        logger.error(`Error fetching feed ${feedName} (attempt ${retries}/${this.maxRetries}):`, error.message);
        
        if (retries >= this.maxRetries) {
          const duration = Date.now() - startTime;
          
          // Try to extract basic information even if XML parsing failed
          let fallbackJobs = [];
          try {
            if (xmlData && typeof xmlData === 'string') {
              fallbackJobs = this.extractJobsFromRawXML(xmlData, feedUrl, feedName);
              logger.info(`Extracted ${fallbackJobs.length} jobs using fallback method from ${feedName}`);
            }
          } catch (fallbackError) {
            logger.warn(`Fallback extraction also failed for ${feedName}:`, fallbackError.message);
          }
          
          return {
            jobs: fallbackJobs,
            totalFetched: fallbackJobs.length,
            duration,
            success: fallbackJobs.length > 0,
            error: error.message,
            usedFallback: fallbackJobs.length > 0
          };
        }
        
        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000;
        await this.sleep(delay);
      }
    }
  }

  // Clean and validate XML string
  cleanXML(xmlString) {
    let cleaned = xmlString;
    
    // Remove BOM and other encoding issues
    cleaned = cleaned.replace(/^\uFEFF/, '');
    
    // Remove null bytes
    cleaned = cleaned.replace(/\x00/g, '');
    
    // Fix common malformed attribute issues
    cleaned = cleaned.replace(/(\w+)\s*=\s*(?!["'])/g, '$1=""');
    
    // Remove any HTML entities that might cause issues
    cleaned = cleaned.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;');
    
    // Ensure proper XML declaration
    if (!cleaned.includes('<?xml')) {
      cleaned = '<?xml version="1.0" encoding="UTF-8"?>\n' + cleaned;
    }
    
    return cleaned;
  }

  // Parse XML string to JSON
  async parseXML(xmlString) {
    try {
      // First, clean the XML string
      const cleanedXml = this.cleanXML(xmlString);
      
      // Try to parse the cleaned XML
      return await this.parser.parseStringPromise(cleanedXml);
    } catch (error) {
      logger.error('XML parsing error:', error);
      
      // If the first attempt fails, try with more aggressive cleaning
      try {
        logger.info('Attempting to parse XML with aggressive cleaning...');
        
        // Remove all attributes that might be causing issues
        let aggressiveCleanedXml = xmlString
          .replace(/\x00/g, '')
          .replace(/\s+\w+\s*=\s*(?!["'])/g, '')
          .replace(/\s+\w+\s*=\s*"[^"]*"/g, '')
          .replace(/\s+\w+\s*=\s*'[^']*'/g, '')
          .replace(/^\uFEFF/, '');
        
        // Try to parse with a more lenient parser configuration
        const lenientParser = new xml2js.Parser({
          explicitArray: false,
          ignoreAttrs: true,
          trim: true,
          strict: false,
          normalize: true,
          normalizeTags: true,
          explicitChildren: false,
          mergeAttrs: false,
          emptyTag: '',
          renderOpts: {
            pretty: false,
            indent: '',
            newline: ''
          }
        });
        
        return await lenientParser.parseStringPromise(aggressiveCleanedXml);
      } catch (secondError) {
        logger.error('XML parsing failed even with aggressive cleaning:', secondError);
        
        // Log a sample of the problematic XML for debugging
        const sampleXml = xmlString.substring(0, 500) + '...';
        logger.error('Problematic XML sample:', sampleXml);
        
        throw new Error(`Failed to parse XML after cleaning attempts: ${error.message}`);
      }
    }
  }

  // Extract jobs from parsed XML data
  extractJobs(parsedData, feedUrl, feedName) {
    try {
      const jobs = [];
      
      // Handle different XML feed structures
      let items = [];
      
      if (parsedData.rss && parsedData.rss.channel && parsedData.rss.channel.item) {
        items = Array.isArray(parsedData.rss.channel.item) 
          ? parsedData.rss.channel.item 
          : [parsedData.rss.channel.item];
      } else if (parsedData.feed && parsedData.feed.entry) {
        items = Array.isArray(parsedData.feed.entry) 
          ? parsedData.feed.entry 
          : [parsedData.feed.entry];
      } else if (parsedData.jobs && parsedData.jobs.job) {
        items = Array.isArray(parsedData.jobs.job) 
          ? parsedData.jobs.job 
          : [parsedData.jobs.job];
      }

      for (const item of items) {
        try {
          const job = this.normalizeJob(item, feedUrl, feedName);
          if (job) {
            jobs.push(job);
          }
        } catch (error) {
          logger.warn(`Failed to normalize job from ${feedName}:`, error.message);
        }
      }

      return jobs;
    } catch (error) {
      logger.error(`Error extracting jobs from ${feedName}:`, error);
      throw new Error(`Failed to extract jobs: ${error.message}`);
    }
  }

  // Normalize job data from different feed formats
  normalizeJob(item, feedUrl, feedName) {
    try {
      // Generate unique GUID if not present
      const guid = item.guid || item.id || item.link || `${feedUrl}-${Date.now()}-${Math.random()}`;
      
      // Extract title
      const title = item.title || item.name || item.job_title || 'Untitled Job';
      
      // Extract description
      const description = item.description || item.summary || item.content || item.job_description || '';
      
      // Extract company
      const company = item.company || item.employer || item.organization || 'Unknown Company';
      
      // Extract location
      const location = item.location || item.city || item.place || '';
      
      // Extract job type
      const jobType = item.job_type || item.type || item.employment_type || '';
      
      // Extract category
      const category = item.category || item.industry || item.job_category || '';
      
      // Extract salary
      const salary = item.salary || item.compensation || '';
      
      // Extract URL
      const url = item.link || item.url || item.apply_url || '';
      
      // Parse publication date
      let pubDate = new Date();
      if (item.pubDate) {
        pubDate = new Date(item.pubDate);
      } else if (item.published) {
        pubDate = new Date(item.published);
      } else if (item.date) {
        pubDate = new Date(item.date);
      }
      
      // Extract tags
      const tags = [];
      if (item.tags) {
        if (Array.isArray(item.tags)) {
          tags.push(...item.tags);
        } else if (typeof item.tags === 'string') {
          tags.push(...item.tags.split(',').map(tag => tag.trim()));
        }
      }
      
      // Determine if remote
      const isRemote = this.detectRemoteWork(title, description, location);
      
      // Determine experience level
      const experienceLevel = this.detectExperienceLevel(title, description);
      
      return {
        guid: guid.toString(),
        title: title.toString().trim(),
        description: description.toString().trim(),
        company: company.toString().trim(),
        location: location.toString().trim(),
        jobType: jobType.toString().trim(),
        category: category.toString().trim(),
        salary: salary.toString().trim(),
        url: url.toString().trim(),
        pubDate,
        sourceFeed: feedUrl,
        sourceName: feedName,
        tags: tags.filter(tag => tag && tag.length > 0),
        isRemote,
        experienceLevel,
        status: 'active'
      };
    } catch (error) {
      logger.error('Error normalizing job:', error);
      return null;
    }
  }

  // Detect if job is remote based on title and description
  detectRemoteWork(title, description) {
    const remoteKeywords = [
      'remote', 'work from home', 'wfh', 'telecommute', 'virtual',
      'home-based', 'home based', 'anywhere', 'distributed'
    ];
    
    const text = `${title} ${description}`.toLowerCase();
    return remoteKeywords.some(keyword => text.includes(keyword));
  }

  // Detect experience level based on title and description
  detectExperienceLevel(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('senior') || text.includes('lead') || text.includes('principal')) {
      return 'senior';
    } else if (text.includes('mid') || text.includes('intermediate') || text.includes('experienced')) {
      return 'mid';
    } else if (text.includes('entry') || text.includes('junior') || text.includes('graduate') || text.includes('intern')) {
      return 'entry';
    } else if (text.includes('executive') || text.includes('director') || text.includes('vp') || text.includes('chief')) {
      return 'executive';
    }
    
    return 'mid'; // Default to mid-level
  }

  // Fallback method to extract jobs from raw XML when parsing fails
  extractJobsFromRawXML(xmlString, feedUrl, feedName) {
    try {
      const jobs = [];
      
      // Simple regex-based extraction for common job feed patterns
      const itemPatterns = [
        /<item[^>]*>([\s\S]*?)<\/item>/gi,
        /<entry[^>]*>([\s\S]*?)<\/entry>/gi,
        /<job[^>]*>([\s\S]*?)<\/job>/gi
      ];
      
      for (const pattern of itemPatterns) {
        const matches = xmlString.match(pattern);
        if (matches && matches.length > 0) {
          for (const match of matches) {
            try {
              const job = this.extractJobFromRawXML(match, feedUrl, feedName);
              if (job) {
                jobs.push(job);
              }
            } catch (error) {
              logger.warn(`Failed to extract job from raw XML:`, error.message);
            }
          }
          break; // Use the first pattern that finds matches
        }
      }
      
      return jobs;
    } catch (error) {
      logger.error('Error in fallback job extraction:', error);
      return [];
    }
  }

  // Extract job data from raw XML string using regex
  extractJobFromRawXML(xmlItem, feedUrl, feedName) {
    try {
      // Extract basic fields using regex
      const titleMatch = xmlItem.match(/<title[^>]*>([^<]*)<\/title>/i);
      const descriptionMatch = xmlItem.match(/<(description|summary|content)[^>]*>([^<]*)<\/\1>/i);
      const linkMatch = xmlItem.match(/<link[^>]*>([^<]*)<\/link>/i);
      const companyMatch = xmlItem.match(/<(company|employer|organization)[^>]*>([^<]*)<\/\1>/i);
      const locationMatch = xmlItem.match(/<(location|city|place)[^>]*>([^<]*)<\/\1>/i);
      
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Job';
      const description = descriptionMatch ? descriptionMatch[2].trim() : '';
      const url = linkMatch ? linkMatch[1].trim() : '';
      const company = companyMatch ? companyMatch[2].trim() : 'Unknown Company';
      const location = locationMatch ? locationMatch[2].trim() : '';
      
      // Generate a unique GUID
      const guid = `${feedUrl}-${Date.now()}-${Math.random()}`;
      
      return {
        guid: guid.toString(),
        title: title.toString().trim(),
        description: description.toString().trim(),
        company: company.toString().trim(),
        location: location.toString().trim(),
        jobType: '',
        category: '',
        salary: '',
        url: url.toString().trim(),
        pubDate: new Date(),
        sourceFeed: feedUrl,
        sourceName: feedName,
        tags: [],
        isRemote: this.detectRemoteWork(title, description, location),
        experienceLevel: this.detectExperienceLevel(title, description),
        status: 'active'
      };
    } catch (error) {
      logger.error('Error extracting job from raw XML:', error);
      return null;
    }
  }

  // Sleep utility for retry delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get predefined feed sources
  getFeedSources() {
    return [
      {
        url: 'https://jobicy.com/?feed=job_feed',
        name: 'Jobicy - All Jobs'
      },
      {
        url: 'https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time',
        name: 'Jobicy - SMM Full-time'
      },
      {
        url: 'https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france',
        name: 'Jobicy - Seller France'
      },
      {
        url: 'https://jobicy.com/?feed=job_feed&job_categories=design-multimedia',
        name: 'Jobicy - Design & Multimedia'
      },
      {
        url: 'https://jobicy.com/?feed=job_feed&job_categories=data-science',
        name: 'Jobicy - Data Science'
      },
      {
        url: 'https://jobicy.com/?feed=job_feed&job_categories=copywriting',
        name: 'Jobicy - Copywriting'
      },
      {
        url: 'https://jobicy.com/?feed=job_feed&job_categories=business',
        name: 'Jobicy - Business'
      },
      {
        url: 'https://jobicy.com/?feed=job_feed&job_categories=management',
        name: 'Jobicy - Management'
      },
      {
        url: 'https://www.higheredjobs.com/rss/articleFeed.cfm',
        name: 'HigherEdJobs'
      }
    ];
  }
}

module.exports = new XMLFeedService(); 