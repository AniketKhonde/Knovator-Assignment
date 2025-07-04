import { format, formatDistanceToNow, parseISO } from 'date-fns';

// Format date to readable string
export const formatDate = (date, formatStr = 'MMM dd, yyyy HH:mm') => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    return 'Invalid Date';
  }
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    return 'Invalid Date';
  }
};

// Format duration in milliseconds to readable string
export const formatDuration = (ms) => {
  if (!ms || ms < 0) return '0ms';
  
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
};

// Format number with commas
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString();
};

// Format percentage
export const formatPercentage = (value, total, decimals = 1) => {
  if (!total || total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Format status badge
export const getStatusBadge = (status) => {
  const statusConfig = {
    active: { label: 'Active', className: 'bg-success-100 text-success-800' },
    expired: { label: 'Expired', className: 'bg-warning-100 text-warning-800' },
    filled: { label: 'Filled', className: 'bg-gray-100 text-gray-800' },
    running: { label: 'Running', className: 'bg-primary-100 text-primary-800' },
    completed: { label: 'Completed', className: 'bg-success-100 text-success-800' },
    failed: { label: 'Failed', className: 'bg-error-100 text-error-800' },
    partial: { label: 'Partial', className: 'bg-warning-100 text-warning-800' },
  };
  
  return statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
};

// Format experience level
export const formatExperienceLevel = (level) => {
  const levelConfig = {
    entry: 'Entry Level',
    mid: 'Mid Level',
    senior: 'Senior Level',
    executive: 'Executive Level',
  };
  
  return levelConfig[level] || level;
};

// Format job type
export const formatJobType = (type) => {
  if (!type) return 'N/A';
  
  return type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Format salary range
export const formatSalary = (salary) => {
  if (!salary) return 'N/A';
  
  // Remove common salary prefixes/suffixes and format
  const cleanSalary = salary
    .replace(/^(salary|compensation|pay):\s*/i, '')
    .replace(/\s*(per year|per month|per hour|annually|monthly|hourly)$/i, '');
  
  return cleanSalary;
};

// Format source name for display
export const formatSourceName = (sourceName) => {
  if (!sourceName) return 'Unknown Source';
  
  // Remove common prefixes and format
  return sourceName
    .replace(/^(Jobicy|HigherEdJobs)\s*-\s*/i, '')
    .replace(/\s*\([^)]*\)/g, '') // Remove parentheses content
    .trim();
};

// Format error message for display
export const formatErrorMessage = (error) => {
  if (!error) return 'Unknown error';
  
  // Clean up common error messages
  return error
    .replace(/^Error:\s*/i, '')
    .replace(/^Failed to\s+/i, '')
    .replace(/\.$/, '');
};

// Format pagination info
export const formatPaginationInfo = (pagination) => {
  if (!pagination) return '';
  
  const { page, limit, total } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  
  return `Showing ${start} to ${end} of ${formatNumber(total)} results`;
}; 