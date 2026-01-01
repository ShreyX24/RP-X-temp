import { useState, useCallback } from 'react';
import { useRuns, useCampaigns } from '../hooks';
import { RunCard, LogViewer, RunTimeline } from '../components';
import type { AutomationRun, LogEntry, Campaign } from '../types';

export function Runs() {
  const { activeRunsList, history, loading, stop } = useRuns();
  const { activeCampaigns, historyCampaigns, stop: stopCampaign } = useCampaigns();
  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'logs'>('timeline');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  const toggleCampaignExpand = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  // Filter out campaign runs from standalone runs
  const standaloneActiveRuns = activeRunsList.filter(run => !run.campaign_id);
  const standaloneHistory = history.filter(run => !run.campaign_id);

  const fetchLogs = useCallback(async (runId: string) => {
    setLogsLoading(true);
    try {
      const response = await fetch(`/api/runs/${runId}/logs`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const handleViewLogs = (runId: string) => {
    const run = [...activeRunsList, ...history].find(r => r.run_id === runId);
    if (run) {
      setSelectedRun(run);
      setShowLogs(true);
      fetchLogs(runId);
    }
  };

  const stats = {
    active: activeRunsList.length,
    activeCampaigns: activeCampaigns.length,
    completed: history.filter(r => r.status === 'completed').length,
    failed: history.filter(r => r.status === 'failed').length,
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Automation Runs</h1>
        <p className="text-text-muted">Monitor active and past automation runs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-text-muted">Active Runs</p>
          <p className="text-2xl font-bold text-primary">{stats.active}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-text-muted">Campaigns</p>
          <p className="text-2xl font-bold text-purple-500">{stats.activeCampaigns}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-text-muted">Completed</p>
          <p className="text-2xl font-bold text-success">{stats.completed}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-text-muted">Failed</p>
          <p className="text-2xl font-bold text-danger">{stats.failed}</p>
        </div>
      </div>

      {/* Active Campaigns */}
      {activeCampaigns.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Active Campaigns ({activeCampaigns.length})
          </h2>
          <div className="space-y-4">
            {activeCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.campaign_id}
                campaign={campaign}
                expanded={expandedCampaigns.has(campaign.campaign_id)}
                onToggleExpand={() => toggleCampaignExpand(campaign.campaign_id)}
                onStop={() => stopCampaign(campaign.campaign_id).catch(console.error)}
                runs={activeRunsList.filter(r => r.campaign_id === campaign.campaign_id)}
                onViewLogs={handleViewLogs}
                onStopRun={(id, killGame) => stop(id, killGame).catch(console.error)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Standalone Runs */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Active Runs ({standaloneActiveRuns.length})
        </h2>
        {standaloneActiveRuns.length === 0 ? (
          <div className="card p-8 text-center text-text-muted">
            No active standalone runs
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {standaloneActiveRuns.map((run) => (
              <RunCard
                key={run.run_id}
                run={run}
                onStop={(id, killGame) => stop(id, killGame).catch(console.error)}
                onViewLogs={handleViewLogs}
              />
            ))}
          </div>
        )}
      </div>

      {/* Campaign History */}
      {historyCampaigns.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Campaign History ({historyCampaigns.length})
          </h2>
          <div className="space-y-4 mb-6">
            {historyCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.campaign_id}
                campaign={campaign}
                expanded={expandedCampaigns.has(campaign.campaign_id)}
                onToggleExpand={() => toggleCampaignExpand(campaign.campaign_id)}
                onStop={() => {}}
                runs={history.filter(r => r.campaign_id === campaign.campaign_id)}
                onViewLogs={handleViewLogs}
                onStopRun={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Standalone Run History */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Standalone History ({standaloneHistory.length})
        </h2>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-surface-elevated rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-surface-elevated rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : standaloneHistory.length === 0 ? (
          <div className="card p-8 text-center text-text-muted">
            No run history
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-surface-elevated">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Game
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider hidden sm:table-cell">
                      SUT
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">
                      Preset
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">
                      Started
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {standaloneHistory.slice(0, 20).map((run) => (
                    <tr key={run.run_id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                        {run.game_name}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-text-muted hidden sm:table-cell">
                        {run.sut_ip}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-text-muted hidden lg:table-cell">
                        {run.quality && run.resolution ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-700">
                            {run.quality}@{run.resolution}
                          </span>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            run.status === 'completed'
                              ? 'bg-success/20 text-success'
                              : run.status === 'failed'
                              ? 'bg-danger/20 text-danger'
                              : 'bg-surface-elevated text-text-muted'
                          }`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-text-muted hidden md:table-cell">
                        {run.started_at
                          ? new Date(run.started_at).toLocaleString()
                          : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleViewLogs(run.run_id)}
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          View Logs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Run Detail Modal - Full screen on mobile, large on desktop */}
      {showLogs && selectedRun && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-surface rounded-xl p-4 sm:p-6 w-full max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-border shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-text-primary">
                  Run Details
                </h2>
                <p className="text-sm text-text-muted">
                  {selectedRun.game_name} on {selectedRun.sut_ip}
                  {selectedRun.quality && selectedRun.resolution && (
                    <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">
                      {selectedRun.quality}@{selectedRun.resolution}
                    </span>
                  )}
                  <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    selectedRun.status === 'completed' ? 'bg-success/20 text-success' :
                    selectedRun.status === 'failed' ? 'bg-danger/20 text-danger' :
                    selectedRun.status === 'running' ? 'bg-primary/20 text-primary' :
                    'bg-surface-elevated text-text-muted'
                  }`}>
                    {selectedRun.status}
                  </span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowLogs(false);
                  setSelectedRun(null);
                  setLogs([]);
                  setActiveTab('timeline');
                }}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-border">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'timeline'
                    ? 'text-primary border-primary'
                    : 'text-text-muted border-transparent hover:text-text-secondary'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'logs'
                    ? 'text-primary border-primary'
                    : 'text-text-muted border-transparent hover:text-text-secondary'
                }`}
              >
                Logs
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden min-h-0">
              {activeTab === 'timeline' ? (
                <div className="h-full overflow-auto rounded-lg bg-surface-elevated border border-border p-4">
                  <RunTimeline runId={selectedRun.run_id} pollInterval={selectedRun.status === 'running' ? 2000 : 0} />
                </div>
              ) : (
                logsLoading ? (
                  <div className="rounded-lg bg-background p-4 font-mono text-sm text-text-muted flex items-center justify-center h-full">
                    <span className="animate-pulse">Loading logs...</span>
                  </div>
                ) : (
                  <LogViewer logs={logs} maxHeight="calc(90vh - 200px)" />
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Campaign Card Component
interface CampaignCardProps {
  campaign: Campaign;
  expanded: boolean;
  onToggleExpand: () => void;
  onStop: () => void;
  runs: AutomationRun[];
  onViewLogs: (runId: string) => void;
  onStopRun: (runId: string, killGame: boolean) => void;
}

function CampaignCard({ campaign, expanded, onToggleExpand, onStop, runs, onViewLogs, onStopRun }: CampaignCardProps) {
  const progressPercent = campaign.progress.total_games > 0
    ? Math.round(((campaign.progress.completed_games + campaign.progress.failed_games) / campaign.progress.total_games) * 100)
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'partially_completed': return 'bg-yellow-500';
      case 'stopped': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="card overflow-hidden border-2 border-purple-200">
      {/* Campaign Header */}
      <div
        className="p-4 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-1 hover:bg-purple-200 rounded">
              <svg
                className={`h-5 w-5 text-purple-600 transition-transform ${expanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {campaign.name}
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium text-white rounded-full ${getStatusColor(campaign.status)}`}>
                  {campaign.status}
                </span>
              </h3>
              <p className="text-sm text-gray-500">
                {campaign.sut_ip} • {campaign.progress.total_games} games • {campaign.iterations_per_game} iterations each
                {campaign.quality && campaign.resolution && (
                  <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">
                    {campaign.quality}@{campaign.resolution}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Progress */}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {campaign.progress.completed_games}/{campaign.progress.total_games} completed
              </p>
              <div className="w-32 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            {/* Stop Button */}
            {(campaign.status === 'running' || campaign.status === 'queued') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStop();
                }}
                className="px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600"
              >
                Stop Campaign
              </button>
            )}
          </div>
        </div>

        {/* Current Game */}
        {campaign.progress.current_game && (
          <div className="mt-3 flex items-center gap-2 text-sm text-purple-700">
            <svg className="h-4 w-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Currently running: {campaign.progress.current_game}
            <span className="text-purple-500">({campaign.progress.current_game_index}/{campaign.progress.total_games})</span>
          </div>
        )}

        {/* Failed count */}
        {campaign.progress.failed_games > 0 && (
          <div className="mt-2 text-sm text-red-600">
            {campaign.progress.failed_games} game(s) failed
          </div>
        )}
      </div>

      {/* Expanded Runs */}
      {expanded && (
        <div className="p-4 border-t border-purple-200 bg-white">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Campaign Runs</h4>
          {runs.length === 0 ? (
            <p className="text-sm text-gray-500">No runs data available yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {runs.map((run) => (
                <div
                  key={run.run_id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{run.game_name}</p>
                      <p className="text-xs text-gray-500">
                        Iteration {run.current_iteration}/{run.iterations}
                        {run.quality && run.resolution && (
                          <span className="ml-2 text-purple-600">{run.quality}@{run.resolution}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        run.status === 'completed' ? 'bg-green-100 text-green-700' :
                        run.status === 'failed' ? 'bg-red-100 text-red-700' :
                        run.status === 'running' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {run.status}
                      </span>
                      <button
                        onClick={() => onViewLogs(run.run_id)}
                        className="text-xs text-purple-600 hover:text-purple-800"
                      >
                        View
                      </button>
                      {run.status === 'running' && (
                        <button
                          onClick={() => onStopRun(run.run_id, false)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
