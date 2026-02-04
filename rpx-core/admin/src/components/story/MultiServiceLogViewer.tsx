/**
 * Multi-Service Log Viewer - Debug panel for viewing logs from multiple services
 *
 * Features:
 * - Toggle between different service logs (RPX, SUT, OmniParser)
 * - Filter logs by level (info, warning, error)
 * - Search within logs
 * - Auto-scroll to bottom for live updates
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  service: string;
  message: string;
}

interface MultiServiceLogViewerProps {
  runId: string;
  isVisible: boolean;
  onClose: () => void;
}

// Level badge colors
const levelColors: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  debug: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

// Service badge colors
const serviceColors: Record<string, string> = {
  rpx: 'bg-purple-500/20 text-purple-400',
  sut: 'bg-green-500/20 text-green-400',
  omniparser: 'bg-pink-500/20 text-pink-400',
  automation: 'bg-cyan-500/20 text-cyan-400',
};

export function MultiServiceLogViewer({ runId, isVisible, onClose }: MultiServiceLogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Fetch logs
  useEffect(() => {
    if (!isVisible || !runId) return;

    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch logs from the run's log files (using existing API with higher limit)
        const response = await fetch(`/api/runs/${runId}/logs?limit=2000`);
        if (!response.ok) {
          if (response.status === 404) {
            setLogs([]);
            return;
          }
          throw new Error('Failed to fetch logs');
        }
        const data = await response.json();

        // API returns { logs: [{timestamp, level, message}, ...], ... }
        const parsedLogs: LogEntry[] = (data.logs || []).map((log: { timestamp: string; level: string; message: string }) => {
          // Extract service/module from message format: [module_name] message
          let service = 'automation';
          let message = log.message;
          const moduleMatch = log.message.match(/^\[([^\]]+)\]\s*(.*)/);
          if (moduleMatch) {
            const moduleName = moduleMatch[1].toLowerCase();
            message = moduleMatch[2];
            // Map module names to service categories
            if (moduleName.includes('network') || moduleName.includes('sut')) {
              service = 'sut';
            } else if (moduleName.includes('omniparser') || moduleName.includes('vision')) {
              service = 'omniparser';
            } else if (moduleName.includes('automation') || moduleName.includes('simple')) {
              service = 'automation';
            } else {
              service = moduleName.split('.').pop() || 'automation';
            }
          }

          return {
            timestamp: log.timestamp,
            level: (log.level || 'info') as LogEntry['level'],
            service,
            message,
          };
        });

        setLogs(parsedLogs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [runId, isVisible]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (selectedLevel !== 'all' && log.level !== selectedLevel) return false;
      if (selectedService !== 'all' && log.service !== selectedService) return false;
      if (filter && !log.message.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [logs, selectedLevel, selectedService, filter]);

  // Get unique services from logs
  const services = useMemo(() => {
    return [...new Set(logs.map(l => l.service))];
  }, [logs]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-4xl h-[80vh] bg-surface rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Service Logs</h2>
            <p className="text-xs text-text-muted">Run: {runId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-surface-elevated">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-1.5 pl-8 text-sm bg-surface border border-border rounded focus:outline-none focus:border-primary"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Level filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-2 py-1.5 text-sm bg-surface border border-border rounded focus:outline-none focus:border-primary"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>

          {/* Service filter */}
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="px-2 py-1.5 text-sm bg-surface border border-border rounded focus:outline-none focus:border-primary"
          >
            <option value="all">All Services</option>
            {services.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Auto-scroll toggle */}
          <label className="flex items-center gap-1.5 text-sm text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-border"
            />
            Auto-scroll
          </label>
        </div>

        {/* Log content */}
        <div
          ref={logContainerRef}
          className="flex-1 overflow-auto p-4 font-mono text-xs bg-gray-900"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-text-muted">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-400">
              {error}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No logs available</p>
              <p className="text-xs text-text-tertiary mt-1">
                Logs are saved during automation runs
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 py-0.5 hover:bg-white/5 ${
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warning' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}
                >
                  <span className="text-gray-500 w-20 flex-shrink-0">
                    {log.timestamp.split('T')[1]?.substring(0, 8) || '--:--:--'}
                  </span>
                  <span className={`px-1 rounded text-[10px] ${serviceColors[log.service] || 'bg-gray-500/20 text-gray-400'}`}>
                    {log.service}
                  </span>
                  <span className={`px-1 rounded text-[10px] ${levelColors[log.level]}`}>
                    {log.level}
                  </span>
                  <span className="flex-1 break-all">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-muted">
          <span>{filteredLogs.length} of {logs.length} entries</span>
          <span>
            {services.length} service{services.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export default MultiServiceLogViewer;
