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
  SignalIcon
} from '@heroicons/react/24/outline';
import { importAPI, importLogsAPI } from '../utils/api';
import { formatNumber, formatDate } from '../utils/format';
import socketService from '../utils/socket';
import toast from 'react-hot-toast';

export default function Dashboard() {
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

  useEffect(() => {
    loadDashboardData();
    loadImportLogs();
    setupSocketConnection();
  }, []);

  useEffect(() => {
    loadImportLogs();
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
      
      if (data.type === 'cron-triggered') {
        toast.success('🕐 Cron job triggered import process');
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
      
      if (data.type === 'cron-import') {
        toast.success('🚀 Scheduled import started by cron');
      } else {
        toast.success('🚀 Import process started');
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
      
      if (data.type === 'cron-import') {
        toast.success(`✅ Scheduled import completed! Processed ${data.totalFeeds} feeds`);
      } else {
        toast.success(`✅ Import completed! Processed ${data.totalFeeds} feeds`);
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
      toast.error('Failed to load dashboard data');
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
      toast.error('Failed to load import logs');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - Knovator Job Importer</title>
        <meta name="description" content="Admin dashboard for Knovator Job Importer" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Automated job import system with real-time updates
                </p>
                {/* Real-time status indicator */}
                <div className="mt-2 flex items-center space-x-4">
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

            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Imports */}
            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DocumentTextIcon className="h-8 w-8 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Imports</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatNumber(stats.importStats?.totalImports || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Successful Imports */}
            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-8 w-8 text-success-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Successful Imports</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatNumber(stats.importStats?.successfulImports || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Failed Imports */}
            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-8 w-8 text-error-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Failed Imports</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatNumber(stats.importStats?.failedImports || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Import Status */}
          {stats.import.isRunning && (
            <div className="mb-8">
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
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Import Logs History</h2>
                <div className="flex items-center space-x-2">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Filters</span>
                </div>
              </div>
            </div>
            
            {/* Filters */}
            <div className="card-body border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
                  <input
                    type="text"
                    value={filters.sourceName}
                    onChange={(e) => handleFilterChange('sourceName', e.target.value)}
                    placeholder="Search source..."
                    className="form-input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="form-input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
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
                            <td className="table-cell text-sm text-gray-500">
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
                      <div className="text-sm text-gray-700">
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
                        <span className="flex items-center px-3 py-2 text-sm text-gray-700">
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
                <p className="text-gray-500 text-center py-8">No import logs found</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 