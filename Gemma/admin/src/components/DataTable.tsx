/**
 * DataTable - Compact, dense table for displaying data
 * Designed for information-dense layouts with minimal chrome
 */

import { ReactNode, useState, useMemo } from 'react';

// Status dot component
export function StatusDot({
  status,
  size = 'sm',
}: {
  status: 'success' | 'error' | 'warning' | 'info' | 'pending' | 'online' | 'offline';
  size?: 'xs' | 'sm' | 'md';
}) {
  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    pending: 'bg-gray-500',
    online: 'bg-emerald-500',
    offline: 'bg-gray-500',
  };

  const sizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };

  return (
    <span className={`inline-block rounded-full ${colors[status]} ${sizes[size]}`} />
  );
}

// Column definition
export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: unknown, row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
  loading?: boolean;
  compact?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  maxHeight?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  emptyMessage = 'No data',
  loading = false,
  compact = true,
  striped = true,
  hoverable = true,
  maxHeight,
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const paddingClass = compact ? 'px-2 py-1' : 'px-3 py-2';

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex items-center justify-center h-24">
          <span className="text-gray-500 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden"
      style={{ maxHeight }}
    >
      <div className="overflow-auto" style={{ maxHeight: maxHeight ? `calc(${maxHeight} - 2px)` : undefined }}>
        <table className="w-full text-sm">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    ${paddingClass}
                    text-xs font-medium text-gray-400 uppercase tracking-wide
                    text-${col.align || 'left'}
                    ${col.sortable ? 'cursor-pointer hover:text-gray-300 select-none' : ''}
                  `}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-gray-500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={`${paddingClass} text-center text-gray-500`}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={String(row[keyField])}
                  className={`
                    border-t border-gray-700/50
                    ${striped && index % 2 === 1 ? 'bg-gray-800/30' : ''}
                    ${hoverable ? 'hover:bg-gray-700/30' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`
                        ${paddingClass}
                        text-gray-300
                        text-${col.align || 'left'}
                      `}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? '-')
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * JobHistoryTable - Specialized table for queue job history
 */
interface JobHistoryTableProps {
  jobs: Array<{
    job_id: string;
    status: 'success' | 'failed' | 'timeout';
    processing_time: number;
    image_size: number;
    timestamp: string;
    error?: string;
  }>;
  maxRows?: number;
}

export function JobHistoryTable({ jobs, maxRows = 10 }: JobHistoryTableProps) {
  // Ensure jobs is an array
  const jobsArray = Array.isArray(jobs) ? jobs : [];
  const displayJobs = maxRows ? jobsArray.slice(0, maxRows) : jobsArray;

  const columns: Column<typeof displayJobs[0]>[] = [
    {
      key: 'status',
      header: '',
      width: '24px',
      render: (_, row) => (
        <StatusDot
          status={row.status === 'success' ? 'success' : 'error'}
          size="sm"
        />
      ),
    },
    {
      key: 'job_id',
      header: 'ID',
      width: '80px',
      render: (value) => (
        <span className="font-mono text-xs text-gray-400">
          #{String(value).slice(-6)}
        </span>
      ),
    },
    {
      key: 'processing_time',
      header: 'Time',
      width: '60px',
      align: 'right',
      render: (value) => (
        <span className="tabular-nums">
          {(Number(value) / 1000).toFixed(1)}s
        </span>
      ),
    },
    {
      key: 'image_size',
      header: 'Size',
      width: '70px',
      align: 'right',
      render: (value) => {
        const mb = Number(value) / (1024 * 1024);
        return (
          <span className="tabular-nums text-gray-400">
            {mb.toFixed(1)}MB
          </span>
        );
      },
    },
    {
      key: 'timestamp',
      header: 'When',
      align: 'right',
      render: (value) => {
        const date = new Date(String(value));
        return (
          <span className="text-gray-500 text-xs">
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={displayJobs}
      keyField="job_id"
      emptyMessage="No jobs yet"
      compact
      maxHeight="200px"
    />
  );
}
