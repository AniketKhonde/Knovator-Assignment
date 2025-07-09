import { useState, useEffect } from 'react';
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
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { jobsAPI } from '../utils/api';
import { formatNumber, formatDate } from '../utils/format';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

export default function Jobs() {
  const { isDarkMode } = useTheme();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [filterOptions, setFilterOptions] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    location: '',
    company: '',
    type: '',
    remote: '',
    experience: '',
    category: '',
    minSalary: '',
    maxSalary: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadJobs();
    loadStats();
    loadFilterOptions();
  }, [pagination.page, filters]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const response = await jobsAPI.getJobs(params);
      setJobs(response.data.jobs);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await jobsAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading job stats:', error);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const response = await jobsAPI.getFilterOptions();
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      company: '',
      type: '',
      remote: '',
      experience: '',
      category: '',
      minSalary: '',
      maxSalary: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleJobApplication = async (jobId) => {
    try {
      await jobsAPI.trackApplication(jobId);
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

  return (
    <>
      <Head>
        <title>Jobs - Knovator Job Board</title>
        <meta name="description" content="Browse and search for job opportunities" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/20 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Board</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Browse and search for job opportunities
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <Link href="/" className="btn-secondary">
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BriefcaseIcon className="h-8 w-8 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Jobs</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {formatNumber(stats.totalJobs || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <EyeIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Jobs</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {formatNumber(stats.activeJobs || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <MapPinIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Remote Jobs</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {formatNumber(stats.remoteJobs || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BuildingOfficeIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Companies</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {formatNumber(stats.uniqueCompanies || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card mb-8">
            <div className="card-body">
              {/* Filter Controls */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="btn-secondary"
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
                {(filters.location || filters.company || filters.type || filters.remote || filters.experience || filters.category || filters.minSalary || filters.maxSalary) && (
                  <button
                    onClick={clearFilters}
                    className="btn-secondary"
                  >
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                    <input
                      type="text"
                      placeholder="City, State, or Remote"
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                      className="form-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                    <input
                      type="text"
                      placeholder="Company name"
                      value={filters.company}
                      onChange={(e) => handleFilterChange('company', e.target.value)}
                      className="form-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Type</label>
                    <select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      className="form-select w-full"
                    >
                      <option value="">All Types</option>
                      <option value="full-time">Full Time</option>
                      <option value="part-time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                      <option value="freelance">Freelance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remote</label>
                    <select
                      value={filters.remote}
                      onChange={(e) => handleFilterChange('remote', e.target.value)}
                      className="form-select w-full"
                    >
                      <option value="">All</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="on-site">On-site</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Experience</label>
                    <select
                      value={filters.experience}
                      onChange={(e) => handleFilterChange('experience', e.target.value)}
                      className="form-select w-full"
                    >
                      <option value="">All Levels</option>
                      <option value="entry">Entry Level</option>
                      <option value="junior">Junior</option>
                      <option value="mid">Mid Level</option>
                      <option value="senior">Senior</option>
                      <option value="lead">Lead</option>
                      <option value="executive">Executive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <input
                      type="text"
                      placeholder="Job category"
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="form-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Salary</label>
                    <input
                      type="number"
                      placeholder="Minimum salary"
                      value={filters.minSalary}
                      onChange={(e) => handleFilterChange('minSalary', e.target.value)}
                      className="form-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Salary</label>
                    <input
                      type="number"
                      placeholder="Maximum salary"
                      value={filters.maxSalary}
                      onChange={(e) => handleFilterChange('maxSalary', e.target.value)}
                      className="form-input w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Jobs List */}
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  {loading ? 'Loading jobs...' : `${formatNumber(pagination.total)} jobs found`}
                </h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
              </div>
            </div>

            <div className="card-body">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : jobs.length > 0 ? (
                <>
                  <div className="space-y-6">
                    {jobs.map((job) => (
                      <div key={job._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md dark:hover:shadow-gray-900/20 transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                <Link href={`/jobs/${job._id}`} className="hover:text-primary-600">
                                  {job.title}
                                </Link>
                              </h3>
                              {job.isRemote && (
                                <span className="badge-success text-xs">Remote</span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                              <div className="flex items-center">
                                <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                                {job.company}
                              </div>
                              {job.location && (
                                <div className="flex items-center">
                                  <MapPinIcon className="h-4 w-4 mr-1" />
                                  {job.location}
                                </div>
                              )}
                              <div className="flex items-center">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                {job.age}
                              </div>
                            </div>

                            <div className="flex items-center space-x-4 mb-3">
                              <span className={`badge ${getJobTypeColor(job.type)}`}>
                                {job.type}
                              </span>
                              <span className={`badge ${getRemoteColor(job.remote)}`}>
                                {job.remote}
                              </span>
                              {job.requirements?.experience && (
                                <span className="badge-info">
                                  {job.requirements.experience}
                                </span>
                              )}
                            </div>

                            <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
                              {job.description.substring(0, 200)}...
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                {job.salaryRange !== 'Not specified' && (
                                  <div className="flex items-center">
                                    <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                                    {job.salaryRange}
                                  </div>
                                )}
                                <div className="flex items-center">
                                  <EyeIcon className="h-4 w-4 mr-1" />
                                  {formatNumber(job.views)} views
                                </div>
                                <div className="flex items-center">
                                  <UserPlusIcon className="h-4 w-4 mr-1" />
                                  {formatNumber(job.applications)} applications
                                </div>
                              </div>
                              
                              <div className="flex space-x-2">
                                <Link href={`/jobs/${job._id}`} className="btn-primary">
                                  View Details
                                </Link>
                                {job.applicationUrl && (
                                  <a
                                    href={job.applicationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => handleJobApplication(job._id)}
                                    className="btn-success"
                                  >
                                    Apply Now
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex justify-between items-center mt-8">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                          Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.totalPages}
                          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No jobs found</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Try adjusting your search criteria or filters.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 