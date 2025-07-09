import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  ChartBarIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  SignalIcon,
  PlayIcon,
  BriefcaseIcon,
  ServerIcon,
  GlobeAltIcon,
  RocketLaunchIcon,
  SparklesIcon,
  ArrowRightIcon,
  BoltIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline';
import { importAPI, importLogsAPI } from '../utils/api';
import { formatNumber, formatDate } from '../utils/format';
import socketService from '../utils/socket';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

export default function HomePage() {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('about');
  const [stats, setStats] = useState({
    import: {},
    importStats: {}
  });
  const [importLogs, setImportLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    sourceName: '',
    startDate: '',
    endDate: ''
  });
  const [socketStatus, setSocketStatus] = useState({
    isConnected: false,
    socketId: null
  });
  const [realtimeUpdates, setRealtimeUpdates] = useState({
    lastCronHit: null,
    lastImportProgress: null,
    importInProgress: false
  });
  const [manualImportLoading, setManualImportLoading] = useState(false);
  const [toastShown, setToastShown] = useState({
    importCompleted: false,
    importStarted: false,
    cronTriggered: false
  });

  useEffect(() => {
    if (activeTab === 'dashboard') {
    loadDashboardData();
    loadImportLogs();
    setupSocketConnection();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
    loadImportLogs();
    }
  }, [pagination.page, filters]);

  const setupSocketConnection = () => {
    // Connect to Socket.IO
    const socket = socketService.connect();
    
    // Join import updates room
    socketService.joinImportUpdates();
    
    // Update socket status
    setSocketStatus(socketService.getConnectionStatus());
    
    // Listen for connection changes
    socket.on('connect', () => {
      setSocketStatus(socketService.getConnectionStatus());
      toast.success('Real-time updates connected');
    });
    
    socket.on('disconnect', () => {
      setSocketStatus(socketService.getConnectionStatus());
      toast.error('Real-time updates disconnected');
    });
    
    // Listen for cron events
    socketService.onImportEvent('cron-status', (data) => {
      console.log('Cron status received:', data);
      setRealtimeUpdates(prev => ({
        ...prev,
        lastCronHit: data
      }));
      
      if (data.type === 'cron-triggered' && !toastShown.cronTriggered) {
        toast.success('🕐 Cron job triggered import process');
        setToastShown(prev => ({ ...prev, cronTriggered: true }));
        // Reset after 5 seconds
        setTimeout(() => setToastShown(prev => ({ ...prev, cronTriggered: false })), 5000);
      } else if (data.type === 'cron-skipped') {
        toast.info('⏭️ Cron skipped - import already running');
      }
    });
    
    // Listen for import started events
    socketService.onImportEvent('import-started', (data) => {
      console.log('Import started:', data);
      setRealtimeUpdates(prev => ({
        ...prev,
        importInProgress: true,
        lastImportProgress: data
      }));
      
      if (!toastShown.importStarted) {
        if (data.type === 'cron-import') {
          toast.success('🚀 Scheduled import started by cron');
        } else {
          toast.success('🚀 Import process started');
        }
        setToastShown(prev => ({ ...prev, importStarted: true }));
        // Reset after 5 seconds
        setTimeout(() => setToastShown(prev => ({ ...prev, importStarted: false })), 5000);
      }
      
      // Reload dashboard data
      loadDashboardData();
    });
    
    // Listen for import progress events
    socketService.onImportEvent('import-progress', (data) => {
      console.log('Import progress:', data);
      setRealtimeUpdates(prev => ({
        ...prev,
        lastImportProgress: data
      }));
    });
    
    // Listen for import completed events
    socketService.onImportEvent('import-completed', (data) => {
      console.log('Import completed:', data);
      setRealtimeUpdates(prev => ({
        ...prev,
        importInProgress: false,
        lastImportProgress: data
      }));
      
      if (!toastShown.importCompleted) {
        if (data.type === 'cron-import') {
          toast.success(`Scheduled import completed! Processed ${data.totalFeeds} feeds`);
        } else {
          toast.success(`Import completed! Processed ${data.totalFeeds} feeds`);
        }
        setToastShown(prev => ({ ...prev, importCompleted: true }));
        // Reset after 5 seconds
        setTimeout(() => setToastShown(prev => ({ ...prev, importCompleted: false })), 5000);
      }
      
      // Reload dashboard data and logs
      loadDashboardData();
      loadImportLogs();
    });
    
    // Listen for import error events
    socketService.onImportEvent('import-error', (data) => {
      console.log('Import error:', data);
      setRealtimeUpdates(prev => ({
        ...prev,
        importInProgress: false
      }));
      
      toast.error(`❌ Import failed: ${data.message}`);
    });
    
    // Cleanup on unmount
    return () => {
      socketService.cleanup();
      // Reset toast flags
      setToastShown({
        importCompleted: false,
        importStarted: false,
        cronTriggered: false
      });
    };
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [importStatus, importStats] = await Promise.all([
        importAPI.getStatus(),
        importLogsAPI.getStats(7) // Last 7 days
      ]);

      setStats({
        import: importStatus.data.import,
        importStats: importStats.data
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Set default stats if API fails
      setStats({
        import: { isRunning: false },
        importStats: {
          totalImports: 0,
          totalJobsFetched: 0,
          totalJobsImported: 0,
          totalNewJobs: 0,
          totalUpdatedJobs: 0,
          totalFailedJobs: 0,
          avgDuration: 0,
          successfulImports: 0,
          failedImports: 0
        }
      });
      
      if (error.message.includes('Database connection not available')) {
        toast.error('Database connection issue. Please try again later.');
      } else {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadImportLogs = async () => {
    try {
      setLogsLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const response = await importLogsAPI.getLogs(params);
      setImportLogs(response.data.importLogs);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
    } catch (error) {
      console.error('Error loading import logs:', error);
      
      // Set empty logs if API fails
      setImportLogs([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
        totalPages: 0
      }));
      
      if (error.message.includes('Database connection not available')) {
        toast.error('Database connection issue. Please try again later.');
      } else {
        toast.error('Failed to load import logs');
      }
    } finally {
      setLogsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleManualImport = async () => {
    try {
      setManualImportLoading(true);
      
      // Check if import is already running
      if (stats.import.isRunning) {
        toast.error('Import is already running. Please wait for it to complete.');
        return;
      }
      
      const response = await importAPI.startImport();
      
      toast.success('Manual import started successfully!');
      
      // Reload dashboard data to show updated status
      loadDashboardData();
      
    } catch (error) {
      console.error('Error starting manual import:', error);
      
      if (error.message.includes('Import is already running')) {
        toast.error('Import is already running. Please wait for it to complete.');
      } else if (error.message.includes('Database connection not available')) {
        toast.error('Database connection issue. Please try again later.');
      } else {
        toast.error(`Failed to start manual import: ${error.message}`);
      }
    } finally {
      setManualImportLoading(false);
    }
  };

  const techStack = [
    { name: 'Node.js', image: '/images/nodejs.png', color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'React', image: '/images/react js.png', color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'MongoDB', image: '/images/mongodb.png', color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'Redis', image: '/images/redis.png', color: 'text-red-600', bg: 'bg-red-100' },
    { name: 'BullMQ', image: '/images/bullmq.png', color: 'text-purple-600', bg: 'bg-purple-100' },
    { name: 'Socket.IO', image: '/images/socketio.png', color: 'text-orange-600', bg: 'bg-orange-100' },
    { name: 'Tailwind CSS', image: '/images/tailwindcss.png', color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { name: 'Next.js', image: '/images/nextjs.png', color: 'text-black', bg: 'bg-gray-100' }
  ];

  const features = [
    {
      title: 'Automated Job Import',
      description: 'Automatically fetches jobs from multiple XML feed APIs with intelligent scheduling',
      icon: BoltIcon,
      color: 'text-blue-600'
    },
    {
      title: 'Real-time Processing',
      description: 'Queue-based job processing with BullMQ for scalable and reliable data handling',
      icon: ListBulletIcon,
      color: 'text-purple-600'
    },
    {
      title: 'Live Dashboard',
      description: 'Real-time monitoring with Socket.IO for instant updates and system status',
      icon: SignalIcon,
      color: 'text-green-600'
    },
    {
      title: 'Job Board',
      description: 'Complete job browsing experience with search, filtering, and application tracking',
      icon: BriefcaseIcon,
      color: 'text-orange-600'
    }
  ];

  return (
    <>
      <Head>
        <title>Knovator Job Importer - Automated Job Processing System</title>
        <meta name="description" content="Advanced job import system with real-time processing, queue management, and comprehensive job board functionality" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm sticky top-0 z-50 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <RocketLaunchIcon className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Knovator Job Importer</h1>
                </div>
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center space-x-4">
                <ThemeToggle />
              </div>

              {/* Navigation Tabs */}
              <nav className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('about')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'about'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  About Project
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'dashboard'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
                <Link
                  href="/jobs"
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-200 flex items-center"
                >
                  Browse Jobs
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'about' ? (
            /* About Project Tab */
            <div className="space-y-12">
              {/* Hero Section */}
              <div className="text-center space-y-6 animate-fade-in">
                <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                  Advanced Job Import
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    Processing System
                  </span>
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                  A production-ready automated job import system that fetches, processes, and displays job listings 
                  from multiple XML feed APIs with real-time monitoring and comprehensive job board functionality.
                </p>
                <div className="flex justify-center space-x-4">
                  <Link href="/jobs" className="btn-primary text-lg px-8 py-3">
                    <BriefcaseIcon className="h-6 w-6 mr-2" />
                    Browse Jobs
                  </Link>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="btn-secondary text-lg px-8 py-3"
                  >
                    <ChartBarIcon className="h-6 w-6 mr-2" />
                    View Dashboard
                  </button>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {features.map((feature, index) => (
                  <div 
                    key={index} 
                    className={`card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-slide-up`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="card-body">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg ${feature.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                          <feature.icon className={`h-8 w-8 ${feature.color}`} />
                        </div>
              <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                          <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tech Stack */}
              <div className="text-center space-y-8 animate-fade-in">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Technology Stack</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {techStack.map((tech, index) => (
                    <div 
                      key={index} 
                      className="card hover:shadow-lg transition-all duration-300 transform hover:scale-105 animate-scale-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="card-body text-center">
                        <div className={`p-4 rounded-lg ${tech.bg} mx-auto w-16 h-16 flex items-center justify-center mb-4`}>
                          <img 
                            src={tech.image} 
                            alt={tech.name}
                            className="h-10 w-10 object-contain"
                          />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{tech.name}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* What's Inside Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Dashboard Section */}
                <div className="card animate-slide-in-left">
                  <div className="card-body">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <ChartBarIcon className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h3>
                    </div>
                                          <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-gray-700 dark:text-gray-300">Real-time import status monitoring</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-gray-700 dark:text-gray-300">Queue statistics and performance metrics</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-gray-700 dark:text-gray-300">Manual import triggers</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-gray-700 dark:text-gray-300">Comprehensive import logs and history</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-gray-700 dark:text-gray-300">System health monitoring</span>
                        </div>
                      </div>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="btn-primary mt-6 w-full hover-glow"
                    >
                      Explore Dashboard
                    </button>
                  </div>
                </div>

                {/* Browse Jobs Section */}
                <div className="card animate-slide-in-right">
                  <div className="card-body">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <BriefcaseIcon className="h-8 w-8 text-orange-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Browse Jobs</h3>
                    </div>
                                          <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-gray-700 dark:text-gray-300">Advanced search and filtering</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-gray-700 dark:text-gray-300">Detailed job information pages</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-gray-700 dark:text-gray-300">Application tracking and statistics</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-gray-700 dark:text-gray-300">Responsive design for all devices</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-gray-700 dark:text-gray-300">Real-time job updates</span>
                        </div>
                      </div>
                    <Link href="/jobs" className="btn-primary mt-6 w-full inline-block text-center hover-glow">
                      Browse Jobs
                    </Link>
                  </div>
                </div>
              </div>

              {/* System Architecture */}
              <div className="card animate-bounce-in">
                <div className="card-body">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">System Architecture</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                          <div className="text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <div className="p-4 bg-blue-100 rounded-lg w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <GlobeAltIcon className="h-8 w-8 text-blue-600" />
                        </div>
                                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">XML Feed Sources</h3>
                      <p className="text-gray-600 dark:text-gray-300">Multiple job feed APIs (Jobicy, HigherEdJobs, etc.)</p>
                      </div>
                      <div className="text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <div className="p-4 bg-purple-100 rounded-lg w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <ListBulletIcon className="h-8 w-8 text-purple-600" />
                        </div>
                                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Queue Processing</h3>
                      <p className="text-gray-600 dark:text-gray-300">BullMQ with Redis for scalable job processing</p>
                      </div>
                      <div className="text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        <div className="p-4 bg-green-100 rounded-lg w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <DocumentTextIcon className="h-8 w-8 text-green-600" />
                        </div>
                                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Data Storage</h3>
                      <p className="text-gray-600 dark:text-gray-300">MongoDB for job data and import logs</p>
                      </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Dashboard Tab */
            <div className="space-y-8">
              {/* Dashboard Header */}
              <div className="text-center space-y-4 animate-fade-in">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Real-time monitoring and control center for the job import system
                </p>
                {/* Real-time status indicator */}
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${socketStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs text-gray-500">
                      {socketStatus.isConnected ? 'Real-time connected' : 'Real-time disconnected'}
                    </span>
                  </div>
                  {realtimeUpdates.importInProgress && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                      <span className="text-xs text-blue-600">Import in progress...</span>
                    </div>
                  )}
                  {realtimeUpdates.lastCronHit && (
                    <div className="flex items-center space-x-2">
                      <SignalIcon className="h-3 w-3 text-orange-500" />
                      <span className="text-xs text-orange-600">
                        Last cron: {new Date(realtimeUpdates.lastCronHit.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-green-600 font-medium">Automated System Active</span>
                  </div>
                </div>
              </div>

              {/* Manual Import Section */}
              <div className="flex justify-center animate-slide-up">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleManualImport}
                    disabled={manualImportLoading || stats.import.isRunning}
                    className={`inline-flex items-center px-6 py-3 border border-transparent text-lg font-medium rounded-md shadow-sm text-white ${
                      manualImportLoading || stats.import.isRunning
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                    } transition-colors duration-200`}
                  >
                    {manualImportLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Starting...
                      </>
                    ) : (
                      <>
                        <PlayIcon className="h-5 w-5 mr-3" />
                        Manual Import
                      </>
                    )}
                  </button>
                  
                  {stats.import.isRunning && (
                    <div className="text-lg text-gray-500">
                      Import in progress...
                    </div>
                  )}
            </div>
          </div>

          {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Total Imports */}
                <div className="card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DocumentTextIcon className="h-8 w-8 text-primary-600" />
                  </div>
                  <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Imports</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {formatNumber(stats.importStats?.totalImports || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Successful Imports */}
                <div className="card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-8 w-8 text-success-600" />
                  </div>
                  <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Successful Imports</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {formatNumber(stats.importStats?.successfulImports || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Failed Imports */}
                <div className="card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-8 w-8 text-error-600" />
                  </div>
                  <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Failed Imports</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {formatNumber(stats.importStats?.failedImports || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manual Import Status */}
                <div 
                  className={`card cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1 animate-slide-up ${
                    !stats.import.isRunning && !manualImportLoading 
                      ? 'hover:border-blue-300 hover-glow' 
                      : 'cursor-not-allowed'
                  }`}
                  style={{ animationDelay: '0.4s' }}
                  onClick={!stats.import.isRunning && !manualImportLoading ? handleManualImport : undefined}
                >
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {manualImportLoading ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        ) : (
                          <PlayIcon className="h-8 w-8 text-blue-600" />
                        )}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Manual Import</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {manualImportLoading ? 'Starting...' : stats.import.isRunning ? 'In Progress' : 'Ready'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {manualImportLoading 
                            ? 'Initializing import...' 
                            : stats.import.isRunning 
                              ? 'Import running...' 
                              : 'Click to start manual import'
                          }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Import Status */}
          {stats.import.isRunning && (
                <div className="mb-8 animate-fade-in">
              <div className="card bg-primary-50 border-primary-200">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-3"></div>
                    <div>
                      <h3 className="text-lg font-medium text-primary-900">
                        Import in Progress
                      </h3>
                      <p className="text-sm text-primary-700">
                        Import ID: {stats.import.currentImportId}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import Logs History */}
              <div className="card animate-slide-up">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Import Logs History</h2>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleManualImport}
                        disabled={manualImportLoading || stats.import.isRunning}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                          manualImportLoading || stats.import.isRunning
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                        } transition-colors duration-200`}
                      >
                        {manualImportLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"></div>
                            Starting...
                          </>
                        ) : (
                          <>
                            <PlayIcon className="h-3 w-3 mr-1.5" />
                            Manual Import
                          </>
                        )}
                      </button>
                <div className="flex items-center space-x-2">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Filters</span>
                      </div>
                </div>
              </div>
            </div>
            
            {/* Filters */}
            <div className="card-body border-b border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="form-select w-full"
                  >
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="running">Running</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source Name</label>
                  <input
                    type="text"
                    value={filters.sourceName}
                    onChange={(e) => handleFilterChange('sourceName', e.target.value)}
                    placeholder="Search source..."
                    className="form-input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="form-input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="form-input w-full"
                  />
                </div>
              </div>
            </div>

            <div className="card-body">
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : importLogs.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead className="table-header">
                        <tr>
                          <th className="table-header-cell">Source</th>
                          <th className="table-header-cell">Status</th>
                          <th className="table-header-cell">Jobs Fetched</th>
                          <th className="table-header-cell">Jobs Imported</th>
                          <th className="table-header-cell">New Jobs</th>
                          <th className="table-header-cell">Updated Jobs</th>
                          <th className="table-header-cell">Time</th>
                        </tr>
                      </thead>
                      <tbody className="table-body">
                        {importLogs.map((importLog) => (
                          <tr key={importLog._id} className="table-row">
                            <td className="table-cell font-medium">
                              {importLog.sourceName}
                            </td>
                            <td className="table-cell">
                              <span className={`badge ${importLog.status === 'completed' ? 'badge-success' : importLog.status === 'failed' ? 'badge-error' : 'badge-warning'}`}>
                                {importLog.status}
                              </span>
                            </td>
                            <td className="table-cell">{formatNumber(importLog.totalFetched)}</td>
                            <td className="table-cell">{formatNumber(importLog.totalImported)}</td>
                            <td className="table-cell">{formatNumber(importLog.newJobs || 0)}</td>
                            <td className="table-cell">{formatNumber(importLog.updatedJobs || 0)}</td>
                            <td className="table-cell text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(importLog.timestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex justify-between items-center mt-6">
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
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No import logs found</p>
              )}
            </div>
          </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
} 