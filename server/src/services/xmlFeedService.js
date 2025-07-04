const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../utils/logger');

class XMLFeedService {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
      trim: true
    });
    
    this.timeout = parseInt(process.env.REQUEST_TIMEOUT) || 30000;
    this.maxRetries = parseInt(process.env.MAX_RETRIES) || 3;
  }

  // Fetch and parse XML feed
  async fetchFeed(feedUrl, feedName) {
    const startTime = Date.now();
    let retries = 0;
    
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

        const xmlData = response.data;
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
          return {
            jobs: [],
            totalFetched: 0,
            duration,
            success: false,
            error: error.message
          };
        }
        
        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000;
        await this.sleep(delay);
      }
    }
  }

  // Parse XML string to JSON
  async parseXML(xmlString) {
    try {
      return await this.parser.parseStringPromise(xmlString);
    } catch (error) {
      logger.error('XML parsing error:', error);
      throw new Error(`Failed to parse XML: ${error.message}`);
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