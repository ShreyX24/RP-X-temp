/**
 * Dashboard - Information-dense control center
 * Shows all services, metrics, and quick actions in a compact layout
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSystemStatus, useDevices, useGames, useRuns, useQueueStats, useServiceHealth } from '../hooks';
import {
  ServiceHealthPanel,
  MetricCard,
  MetricGrid,
  QueueDepthChart,
  JobHistoryTable,
  StatusDot,
  RunCard,
} from '../components';
import type { SUT, GameConfig } from '../types';

// Compact SUT Card for dashboard
function CompactSUTCard({
  sut,
  isSelected,
  onClick,
}: {
  sut: SUT;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full p-2 rounded-lg border text-left transition-all
        ${isSelected
          ? 'bg-blue-900/30 border-blue-500'
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={sut.status === 'online' ? 'online' : 'offline'} />
          <span className="text-sm font-medium text-gray-200 truncate max-w-[100px]">
            {sut.hostname || sut.ip}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {sut.current_task && (
            <span className="text-amber-400" title="Running task">
              ...
            </span>
          )}
          {sut.success_rate !== undefined && sut.success_rate > 0 && (
            <span className="tabular-nums">
              {Math.round(sut.success_rate * 100)}%
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// Quick action button
function ActionButton({
  label,
  onClick,
  disabled,
  variant = 'default',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
}) {
  const variants = {
    default: 'bg-gray-700 hover:bg-gray-600 text-gray-200',
    primary: 'bg-blue-600 hover:bg-blue-500 text-white',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-3 py-1.5 rounded text-sm font-medium transition-colors
        ${variants[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {label}
    </button>
  );
}

export function Dashboard() {
  // Core data hooks
  useSystemStatus();
  const { devices, onlineDevices } = useDevices();
  const { gamesList } = useGames();
  const { activeRunsList, start, stop } = useRuns();

  // New hooks for enhanced dashboard
  const { stats: queueStats, jobs: queueJobs, depthHistory, isAvailable: queueAvailable } = useQueueStats();
  const { services } = useServiceHealth();

  // UI state
  const [selectedSut, setSelectedSut] = useState<SUT | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameConfig | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handlers
  const handleStartRun = async () => {
    if (!selectedSut || !selectedGame) return;

    setIsStarting(true);
    setError(null);

    try {
      await start(selectedSut.ip, selectedGame.name, 1);
      setSelectedSut(null);
      setSelectedGame(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start run');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopAll = async () => {
    for (const run of activeRunsList) {
      await stop(run.run_id).catch(console.error);
    }
  };

  return (
    <div className="space-y-4 p-4 min-h-screen bg-gray-900 text-gray-100">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Gemma Control Center</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/workflow"
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded transition-colors"
          >
            Workflow Builder
          </Link>
          <Link
            to="/settings"
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Service Health Bar */}
      <ServiceHealthPanel services={services} />

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-2">
          <span className="text-red-300 text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Panel (5 cols) - Metrics + SUTs */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          {/* Metrics Grid */}
          <MetricGrid columns={3} gap="sm">
            <MetricCard
              label="Online SUTs"
              value={onlineDevices.length}
              sublabel={`of ${devices.length} total`}
              color={onlineDevices.length > 0 ? 'success' : 'default'}
            />
            <MetricCard
              label="Active Runs"
              value={activeRunsList.length}
              color={activeRunsList.length > 0 ? 'info' : 'default'}
            />
            <MetricCard
              label="Queue"
              value={queueStats?.current_queue_size ?? '-'}
              sublabel={queueAvailable ? 'items' : 'unavailable'}
              color={
                !queueAvailable ? 'error' :
                (queueStats?.current_queue_size ?? 0) > 10 ? 'warning' : 'default'
              }
            />
            <MetricCard
              label="Games"
              value={gamesList.length}
            />
            <MetricCard
              label="Processed"
              value={queueStats?.total_requests ?? 0}
              sublabel="total jobs"
            />
            <MetricCard
              label="Avg Time"
              value={queueStats?.avg_processing_time
                ? `${(queueStats.avg_processing_time).toFixed(1)}s`
                : '-'
              }
              sublabel="per job"
            />
          </MetricGrid>

          {/* Online SUTs Grid */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">
                Online SUTs
              </h3>
              <Link
                to="/devices"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View All
              </Link>
            </div>

            {onlineDevices.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                No online SUTs
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {onlineDevices.slice(0, 8).map((sut) => (
                  <CompactSUTCard
                    key={sut.device_id}
                    sut={sut}
                    isSelected={selectedSut?.device_id === sut.device_id}
                    onClick={() => setSelectedSut(sut)}
                  />
                ))}
              </div>
            )}

            {onlineDevices.length > 8 && (
              <div className="text-center mt-2">
                <Link
                  to="/devices"
                  className="text-xs text-gray-500 hover:text-gray-400"
                >
                  +{onlineDevices.length - 8} more
                </Link>
              </div>
            )}
          </div>

          {/* Quick Start Panel */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Quick Start</h3>

            <div className="space-y-3">
              {/* Selected SUT */}
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded text-sm">
                <span className="text-gray-400">SUT:</span>
                {selectedSut ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-200">{selectedSut.hostname || selectedSut.ip}</span>
                    <button
                      onClick={() => setSelectedSut(null)}
                      className="text-gray-500 hover:text-gray-400"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-500 italic">Select above</span>
                )}
              </div>

              {/* Game Selection */}
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded text-sm">
                <span className="text-gray-400">Game:</span>
                <select
                  value={selectedGame?.name || ''}
                  onChange={(e) => {
                    const game = gamesList.find(g => g.name === e.target.value);
                    setSelectedGame(game || null);
                  }}
                  disabled={!selectedSut}
                  className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 disabled:opacity-50"
                >
                  <option value="">Select game</option>
                  {gamesList.map((game) => (
                    <option key={game.name} value={game.name}>
                      {game.display_name || game.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartRun}
                disabled={!selectedSut || !selectedGame || isStarting}
                className={`
                  w-full py-2 rounded font-medium text-sm transition-colors
                  ${selectedSut && selectedGame
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {isStarting ? 'Starting...' : 'Start Automation'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel (7 cols) - Charts + Tables */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          {/* Queue Depth Chart */}
          {depthHistory.length > 0 && (
            <QueueDepthChart
              data={depthHistory}
              height={180}
            />
          )}

          {/* Active Runs */}
          {activeRunsList.length > 0 && (
            <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-300">
                  Active Runs ({activeRunsList.length})
                </h3>
                <ActionButton
                  label="Stop All"
                  variant="danger"
                  onClick={handleStopAll}
                />
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {activeRunsList.map((run) => (
                  <RunCard
                    key={run.run_id}
                    run={run}
                    onStop={(id) => stop(id).catch(console.error)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Job History */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">
                Recent Jobs
              </h3>
              <Link
                to="/queue"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View All
              </Link>
            </div>

            <JobHistoryTable jobs={queueJobs} maxRows={8} />
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
            <span className="text-xs text-gray-500 mr-2">Actions:</span>
            <ActionButton
              label="Scan SUTs"
              onClick={() => {
                // Trigger discovery scan
                fetch('/api/discovery/scan', { method: 'POST' });
              }}
            />
            <ActionButton
              label="Reload Games"
              onClick={() => {
                fetch('/api/games/reload', { method: 'POST' });
              }}
            />
            <Link
              to="/queue"
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors"
            >
              Queue Dashboard
            </Link>
            <Link
              to="/runs"
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors"
            >
              Run History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
