import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { importLogsAPI } from '../utils/api';
import { formatDate, formatNumber, formatDuration, getStatusBadge } from '../utils/format';
import toast from 'react-hot-toast';

export default function ImportLogs() {
  const [importLogs, setImportLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filters, setFilters] = useState({
    page: 1,
    limit: 15,
    status: '',
    sourceName: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadImportLogs();
  }, [filters]);

  const loadImportLogs = async () => {
    try {
      setLoading(true);
      const response = await importLogsAPI.getLogs(filters);
      setImportLogs(response.data.importLogs);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error loading import logs:', error);
      toast.error('Failed to load import logs');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const toggleRowExpansion = (logId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 15,
      status: '',
      sourceName: '',
      startDate: '',
      endDate: ''
    });
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
        <title>Import Logs - Knovator Job Importer</title>
        <meta name="description" content="Import history and logs for Knovator Job Importer" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Import Logs</h1>
                <p className="mt-1 text-sm text-gray-500">
                  View import history and track job processing
                </p>
              </div>
              <Link href="/" className="btn-secondary">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="card mb-6">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Filters
                </h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Clear all
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="select"
                  >
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="running">Running</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Name
                  </label>
                  <input
                    type="text"
                    value={filters.sourceName}
                    onChange={(e) => handleFilterChange('sourceName', e.target.value)}
                    placeholder="Filter by source..."
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Import Logs Table */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Import History</h2>
            </div>
            <div className="card-body">
              {importLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">Source</th>
                        <th className="table-header-cell">Status</th>
                        <th className="table-header-cell">Total Fetched</th>
                        <th className="table-header-cell">New Jobs</th>
                        <th className="table-header-cell">Updated Jobs</th>
                        <th className="table-header-cell">Failed Jobs</th>
                        <th className="table-header-cell">Duration</th>
                        <th className="table-header-cell">Time</th>
                        <th className="table-header-cell">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {importLogs.map((importLog) => {
                        const isExpanded = expandedRows.has(importLog._id);
                        const statusBadge = getStatusBadge(importLog.status);
                        
                        return (
                          <>
                            <tr key={importLog._id} className="table-row">
                              <td className="table-cell font-medium">
                                {importLog.sourceName}
                              </td>
                              <td className="table-cell">
                                <span className={`badge ${statusBadge.className}`}>
                                  {statusBadge.label}
                                </span>
                              </td>
                              <td className="table-cell">{formatNumber(importLog.totalFetched)}</td>
                              <td className="table-cell text-success-600 font-medium">
                                {formatNumber(importLog.newJobs)}
                              </td>
                              <td className="table-cell text-primary-600 font-medium">
                                {formatNumber(importLog.updatedJobs)}
                              </td>
                              <td className="table-cell">
                                {importLog.failedJobs && importLog.failedJobs.length > 0 ? (
                                  <div className="flex items-center">
                                    <span className="text-error-600 font-medium">
                                      {importLog.failedJobs.length}
                                    </span>
                                    <button
                                      onClick={() => toggleRowExpansion(importLog._id)}
                                      className="ml-2 text-gray-400 hover:text-gray-600"
                                    >
                                      {isExpanded ? (
                                        <ChevronUpIcon className="h-4 w-4" />
                                      ) : (
                                        <ChevronDownIcon className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">0</span>
                                )}
                              </td>
                              <td className="table-cell">{formatDuration(importLog.duration)}</td>
                              <td className="table-cell text-sm text-gray-500">
                                {formatDate(importLog.timestamp)}
                              </td>
                              <td className="table-cell">
                                <Link
                                  href={`/import-logs/${importLog._id}`}
                                  className="text-primary-600 hover:text-primary-500 text-sm"
                                >
                                  View Details
                                </Link>
                              </td>
                            </tr>
                            
                            {/* Expanded row for failed jobs */}
                            {isExpanded && importLog.failedJobs && importLog.failedJobs.length > 0 && (
                              <tr>
                                <td colSpan="9" className="bg-gray-50 px-6 py-4">
                                  <div className="space-y-3">
                                    <h4 className="font-medium text-gray-900 flex items-center">
                                      <ExclamationTriangleIcon className="h-4 w-4 text-error-500 mr-2" />
                                      Failed Jobs ({importLog.failedJobs.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {importLog.failedJobs.map((failedJob, index) => (
                                        <div key={index} className="bg-white p-3 rounded border">
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <p className="font-medium text-gray-900">
                                                {failedJob.title || 'Untitled Job'}
                                              </p>
                                              <p className="text-sm text-gray-500">
                                                GUID: {failedJob.guid}
                                              </p>
                                              <p className="text-sm text-error-600 mt-1">
                                                {failedJob.reason}
                                              </p>
                                              {failedJob.error && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                  Error: {failedJob.error}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No import logs found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by triggering an import from the dashboard.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {formatNumber(pagination.total)} results
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </button>
                
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
} 