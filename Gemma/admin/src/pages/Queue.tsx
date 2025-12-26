/**
 * Queue - Full Queue Service dashboard
 * Shows comprehensive queue stats, job history, and OmniParser status
 */

import { useState } from 'react';
import { useQueueStats, useServiceHealth } from '../hooks';
import {
  MetricCard,
  MetricGrid,
  QueueDepthChart,
  JobHistoryTable,
  StatusDot,
} from '../components';

// OmniParser instance card
function OmniParserCard({
  instance,
}: {
  instance: {
    name: string;
    displayName: string;
    status: 'online' | 'offline' | 'error' | 'starting';
    url?: string;
  };
}) {
  const statusColors = {
    online: 'border-emerald-700/50 bg-emerald-900/20',
    offline: 'border-gray-700 bg-gray-800/50',
    error: 'border-red-700/50 bg-red-900/20',
    starting: 'border-amber-700/50 bg-amber-900/20',
  };

  return (
    <div className={`p-3 rounded-lg border ${statusColors[instance.status]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={instance.status === 'online' ? 'online' : 'offline'} />
          <span className="text-sm font-medium text-gray-200">
            {instance.displayName}
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${
          instance.status === 'online' ? 'bg-emerald-900/50 text-emerald-400' :
          instance.status === 'error' ? 'bg-red-900/50 text-red-400' :
          'bg-gray-800 text-gray-500'
        }`}>
          {instance.status}
        </span>
      </div>
      {instance.url && (
        <div className="mt-2 text-xs text-gray-500 font-mono truncate">
          {instance.url}
        </div>
      )}
    </div>
  );
}

// Worker status component
function WorkerStatus({
  isRunning,
  uptime,
}: {
  isRunning: boolean;
  uptime: number;
}) {
  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      isRunning
        ? 'border-emerald-700/50 bg-emerald-900/20'
        : 'border-red-700/50 bg-red-900/20'
    }`}>
      <div className={`w-3 h-3 rounded-full ${
        isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
      }`} />
      <div>
        <div className="text-sm font-medium text-gray-200">
          Queue Worker
        </div>
        <div className="text-xs text-gray-500">
          {isRunning ? `Running for ${formatUptime(uptime)}` : 'Stopped'}
        </div>
      </div>
    </div>
  );
}

export function Queue() {
  const { stats, jobs, depthHistory, health, isAvailable, refetch } = useQueueStats();
  const { services } = useServiceHealth();
  const [showAllJobs, setShowAllJobs] = useState(false);

  // Format processing time
  const formatTime = (ms: number | undefined) => {
    if (ms === undefined || ms === 0) return '-';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-4 p-4 min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Queue Service</h1>
          <p className="text-sm text-gray-500">
            OmniParser job queue management and monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            isAvailable
              ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/50'
              : 'bg-red-900/30 text-red-400 border border-red-700/50'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isAvailable ? 'bg-emerald-500' : 'bg-red-500'
            }`} />
            {isAvailable ? 'Connected' : 'Disconnected'}
          </span>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {!isAvailable ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">!</div>
          <h2 className="text-xl font-bold text-gray-300 mb-2">
            Queue Service Unavailable
          </h2>
          <p className="text-gray-500 max-w-md">
            Cannot connect to Queue Service at localhost:9000.
            Make sure the service is running.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* Left Panel - Stats */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Worker Status */}
            <WorkerStatus
              isRunning={stats?.worker_running ?? false}
              uptime={stats?.uptime_seconds ?? 0}
            />

            {/* Queue Stats */}
            <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                Queue Statistics
              </h3>
              <MetricGrid columns={2} gap="sm">
                <MetricCard
                  label="Queue Depth"
                  value={stats?.current_queue_size ?? 0}
                  color={
                    (stats?.current_queue_size ?? 0) > 10 ? 'warning' :
                    (stats?.current_queue_size ?? 0) > 20 ? 'error' : 'default'
                  }
                />
                <MetricCard
                  label="Total Processed"
                  value={stats?.total_requests ?? 0}
                  sublabel="all time"
                />
                <MetricCard
                  label="Successful"
                  value={stats?.successful_requests ?? 0}
                  color="success"
                />
                <MetricCard
                  label="Failed"
                  value={stats?.failed_requests ?? 0}
                  color={(stats?.failed_requests ?? 0) > 0 ? 'error' : 'default'}
                />
                <MetricCard
                  label="Timeouts"
                  value={stats?.timeout_requests ?? 0}
                  color={(stats?.timeout_requests ?? 0) > 0 ? 'warning' : 'default'}
                />
                <MetricCard
                  label="Req/min"
                  value={(stats?.requests_per_minute ?? 0).toFixed(1)}
                  sublabel="throughput"
                />
              </MetricGrid>
            </div>

            {/* Performance Stats */}
            <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                Performance
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                  <span className="text-sm text-gray-400">Avg Processing</span>
                  <span className="text-sm font-mono text-gray-200">
                    {formatTime(stats?.avg_processing_time ? stats.avg_processing_time * 1000 : 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                  <span className="text-sm text-gray-400">Avg Wait Time</span>
                  <span className="text-sm font-mono text-gray-200">
                    {formatTime(stats?.avg_queue_wait_time ? stats.avg_queue_wait_time * 1000 : 0)}
                  </span>
                </div>
                {stats && stats.total_requests > 0 && (
                  <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                    <span className="text-sm text-gray-400">Success Rate</span>
                    <span className={`text-sm font-mono ${
                      (stats.successful_requests / stats.total_requests) > 0.95
                        ? 'text-emerald-400'
                        : (stats.successful_requests / stats.total_requests) > 0.8
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}>
                      {((stats.successful_requests / stats.total_requests) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* OmniParser Instances */}
            <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                OmniParser Instances
              </h3>
              {services?.omniparserInstances && services.omniparserInstances.length > 0 ? (
                <div className="space-y-2">
                  {services.omniparserInstances.map((instance) => (
                    <OmniParserCard key={instance.name} instance={instance} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No OmniParser instances configured
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Charts & History */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            {/* Queue Depth Chart */}
            <div className="bg-gray-800/30 rounded-lg border border-gray-700">
              {depthHistory.length > 0 ? (
                <QueueDepthChart
                  data={depthHistory}
                  height={220}
                  className="border-0"
                />
              ) : (
                <div className="flex items-center justify-center h-[220px] text-gray-500 text-sm">
                  No queue depth history available
                </div>
              )}
            </div>

            {/* Job History */}
            <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300">
                  Job History
                </h3>
                <button
                  onClick={() => setShowAllJobs(!showAllJobs)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {showAllJobs ? 'Show Less' : 'Show All'}
                </button>
              </div>

              <JobHistoryTable
                jobs={jobs}
                maxRows={showAllJobs ? 50 : 15}
              />

              {jobs.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No jobs processed yet
                </div>
              )}
            </div>

            {/* Queue Health */}
            {health && (
              <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  System Health
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2 bg-gray-800/50 rounded">
                    <div className="text-xs text-gray-500">Status</div>
                    <div className={`text-sm font-medium ${
                      health.status === 'healthy' ? 'text-emerald-400' :
                      health.status === 'degraded' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
                    </div>
                  </div>
                  <div className="p-2 bg-gray-800/50 rounded">
                    <div className="text-xs text-gray-500">Version</div>
                    <div className="text-sm font-mono text-gray-300">
                      {health.version || 'Unknown'}
                    </div>
                  </div>
                  <div className="p-2 bg-gray-800/50 rounded">
                    <div className="text-xs text-gray-500">Server</div>
                    <div className="text-sm font-mono text-gray-300 truncate">
                      {health.omniparser_url || 'Not configured'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
