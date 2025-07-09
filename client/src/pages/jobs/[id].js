import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
  MapPinIcon, 
  BuildingOfficeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  EyeIcon,
  UserPlusIcon,
  ArrowLeftIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  CalendarIcon,
  AcademicCapIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { jobsAPI } from '../../utils/api';
import { formatNumber, formatDate } from '../../utils/format';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';

export default function JobDetail() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const { id } = router.query;
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      loadJob();
    }
  }, [id]);

  const loadJob = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await jobsAPI.getJob(id);
      setJob(response.data);
    } catch (error) {
      console.error('Error loading job:', error);
      setError('Failed to load job details');
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleJobApplication = async () => {
    try {
      await jobsAPI.trackApplication(id);
      toast.success('Application tracked successfully!');
    } catch (error) {
      console.error('Error tracking application:', error);
      toast.error('Failed to track application');
    }
  };

  const getJobTypeColor = (type) => {
    const colors = {
      'full-time': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      'part-time': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'contract': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      'internship': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      'freelance': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
    };
    return colors[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const getRemoteColor = (remote) => {
    const colors = {
      'remote': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'hybrid': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      'on-site': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    };
    return colors[remote] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const getExperienceColor = (experience) => {
    const colors = {
      'entry': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'junior': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      'mid': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      'senior': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      'lead': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      'executive': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
    };
    return colors[experience] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Job Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error || 'The job you are looking for does not exist.'}</p>
          <Link href="/jobs" className="btn-primary">
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{job.title} at {job.company} - Knovator Job Board</title>
        <meta name="description" content={job.description.substring(0, 160)} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/20 transition-colors duration-300">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex justify-between items-center mb-4">
                <Link href="/jobs" className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  <ArrowLeftIcon className="h-4 w-4 mr-1" />
                  Back to Jobs
                </Link>
                <ThemeToggle />
              </div>
              
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{job.title}</h1>
                  <div className="flex items-center space-x-4 text-lg text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                      {job.company}
                    </div>
                    {job.location && (
                      <div className="flex items-center">
                        <MapPinIcon className="h-5 w-5 mr-2" />
                        {job.location}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  {job.applicationUrl && (
                    <a
                      href={job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleJobApplication}
                      className="btn-primary"
                    >
                      Apply Now
                    </a>
                  )}
                  {job.applicationEmail && (
                    <a
                      href={`mailto:${job.applicationEmail}?subject=Application for ${job.title}`}
                      onClick={handleJobApplication}
                      className="btn-secondary"
                    >
                      <EnvelopeIcon className="h-5 w-5 mr-2" />
                      Email Apply
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Job Overview */}
              <div className="card mb-8">
                <div className="card-body">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Overview</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center">
                      <BriefcaseIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Job Type</p>
                        <span className={`badge ${getJobTypeColor(job.type)}`}>
                          {job.type}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Work Location</p>
                        <span className={`badge ${getRemoteColor(job.remote)}`}>
                          {job.remote}
                        </span>
                      </div>
                    </div>
                    
                    {job.requirements?.experience && (
                      <div className="flex items-center">
                        <UserPlusIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Experience Level</p>
                          <span className={`badge ${getExperienceColor(job.requirements.experience)}`}>
                            {job.requirements.experience}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Posted</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{job.age}</p>
                      </div>
                    </div>
                    
                    {job.salaryRange !== 'Not specified' && (
                      <div className="flex items-center">
                        <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                                                  <p className="text-sm text-gray-500 dark:text-gray-400">Salary</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{job.salaryRange}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <EyeIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Views</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(job.views)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {job.category && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Category</p>
                      <span className="badge-info">{job.category}</span>
                    </div>
                  )}
                  
                  {job.industry && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Industry</p>
                      <span className="badge-info">{job.industry}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Description */}
              <div className="card mb-8">
                <div className="card-body">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Job Description</h2>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{job.description}</p>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              {job.requirements && (
                <div className="card mb-8">
                  <div className="card-body">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Requirements</h2>
                    
                    {job.requirements.education && (
                      <div className="mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                          <AcademicCapIcon className="h-5 w-5 mr-2" />
                          Education
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300">{job.requirements.education}</p>
                      </div>
                    )}
                    
                    {job.requirements.skills && job.requirements.skills.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {job.requirements.skills.map((skill, index) => (
                            <span key={index} className="badge-success">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {job.requirements.certifications && job.requirements.certifications.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Certifications</h3>
                        <div className="flex flex-wrap gap-2">
                          {job.requirements.certifications.map((cert, index) => (
                            <span key={index} className="badge-warning">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Company Info */}
              <div className="card mb-6">
                <div className="card-body">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Company Information</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Company</p>
                      <p className="font-medium text-gray-900 dark:text-white">{job.company}</p>
                    </div>
                    
                    {job.location && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                        <p className="font-medium text-gray-900 dark:text-white">{job.location}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Source</p>
                      <p className="font-medium text-gray-900 dark:text-white">{job.sourceName}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Posted</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(job.publishedDate || job.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Stats */}
              <div className="card mb-6">
                <div className="card-body">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Job Statistics</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Views</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(job.views)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Applications</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(job.applications)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                      <span className={`badge ${job.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card">
                <div className="card-body">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                  
                  <div className="space-y-3">
                    {job.applicationUrl && (
                      <a
                        href={job.applicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleJobApplication}
                        className="btn-primary w-full justify-center"
                      >
                        <GlobeAltIcon className="h-5 w-5 mr-2" />
                        Apply Online
                      </a>
                    )}
                    
                    {job.applicationEmail && (
                      <a
                        href={`mailto:${job.applicationEmail}?subject=Application for ${job.title}`}
                        onClick={handleJobApplication}
                        className="btn-secondary w-full justify-center"
                      >
                        <EnvelopeIcon className="h-5 w-5 mr-2" />
                        Email Application
                      </a>
                    )}
                    
                    <Link href="/jobs" className="btn-secondary w-full justify-center">
                      <ArrowLeftIcon className="h-5 w-5 mr-2" />
                      Back to Jobs
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 