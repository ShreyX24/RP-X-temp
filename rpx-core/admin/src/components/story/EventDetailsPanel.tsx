/**
 * Event Details Panel - Shows contextual information for timeline events
 *
 * Displays event-specific details like:
 * - Wait steps: duration from YAML
 * - Game launched: target exe and detected process
 * - Preset applied: preset name and game
 * - Benchmark: duration
 */

import type { TimelineEvent } from '../../api';

interface EventDetailsPanelProps {
  event: TimelineEvent | null;
}

// Icon components
function ClockIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function GamepadIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SettingsIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ChartIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function ServerIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  );
}

// Detail row component
function DetailRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-text-muted text-sm w-32 flex-shrink-0">{label}</span>
      <span className={`text-sm text-text-primary ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-text-tertiary italic">N/A</span>}
      </span>
    </div>
  );
}

// Format duration
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return 'N/A';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function EventDetailsPanel({ event }: EventDetailsPanelProps) {
  if (!event) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-elevated text-text-muted">
        <p className="text-sm">Select an event to view details</p>
      </div>
    );
  }

  const eventType = event.event_type;
  const metadata = event.metadata || {};

  // Determine which panel to show based on event type
  // Wait/Focus events
  if (eventType.includes('focus') || eventType.includes('waiting') ||
      eventType.includes('wait') || event.message?.includes('waiting')) {
    const duration = metadata.duration || metadata.wait_seconds || metadata.timeout || metadata.seconds;
    return (
      <div className="h-full flex flex-col bg-surface-elevated">
        <div className="p-6 flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <ClockIcon className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Wait Operation</h3>
              <p className="text-sm text-text-muted">{event.message}</p>
            </div>
          </div>
          <div className="space-y-1 border-t border-border pt-4">
            <DetailRow label="Wait Duration" value={formatDuration(duration as number)} />
            <DetailRow label="Status" value={
              <span className={`px-2 py-0.5 rounded text-xs ${
                event.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                event.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {event.status}
              </span>
            } />
            {event.duration_ms && (
              <DetailRow label="Actual Duration" value={`${(event.duration_ms / 1000).toFixed(1)}s`} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Game launch events
  if (eventType.includes('game_launch') || eventType.includes('game_ready') ||
      eventType === 'game_launched' || event.message?.includes('launched')) {
    const targetExe = metadata.target_exe || metadata.process_name || metadata.exe;
    const detectedProcess = metadata.detected_process || metadata.process || metadata.detected_exe;
    const gameName = metadata.game_name || metadata.game;
    return (
      <div className="h-full flex flex-col bg-surface-elevated">
        <div className="p-6 flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-green-500/20">
              <GamepadIcon className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Game Launched</h3>
              <p className="text-sm text-text-muted">{gameName || event.message}</p>
            </div>
          </div>
          <div className="space-y-1 border-t border-border pt-4">
            <DetailRow label="Target Executable" value={targetExe} mono />
            <DetailRow label="Detected Process" value={detectedProcess} mono />
            <DetailRow label="Status" value={
              <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                {event.status}
              </span>
            } />
            {event.duration_ms && (
              <DetailRow label="Launch Time" value={`${(event.duration_ms / 1000).toFixed(1)}s`} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Process detection events
  if (eventType.includes('process') || event.message?.includes('Process')) {
    const processName = metadata.process_name || metadata.process || metadata.exe;
    const timeout = metadata.timeout || metadata.wait_seconds;
    return (
      <div className="h-full flex flex-col bg-surface-elevated">
        <div className="p-6 flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-cyan-500/20">
              <ServerIcon className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Process Detection</h3>
              <p className="text-sm text-text-muted">{event.message}</p>
            </div>
          </div>
          <div className="space-y-1 border-t border-border pt-4">
            <DetailRow label="Process Name" value={processName} mono />
            {timeout && <DetailRow label="Timeout" value={formatDuration(timeout as number)} />}
            <DetailRow label="Status" value={
              <span className={`px-2 py-0.5 rounded text-xs ${
                event.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {event.status}
              </span>
            } />
          </div>
        </div>
      </div>
    );
  }

  // Preset events
  if (eventType.includes('preset') || event.message?.includes('Preset')) {
    const presetName = metadata.preset_name || metadata.preset;
    const gameName = metadata.game_name || metadata.game;
    return (
      <div className="h-full flex flex-col bg-surface-elevated">
        <div className="p-6 flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <SettingsIcon className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Preset Applied</h3>
              <p className="text-sm text-text-muted">{event.message}</p>
            </div>
          </div>
          <div className="space-y-1 border-t border-border pt-4">
            <DetailRow label="Preset Name" value={presetName} />
            <DetailRow label="Game" value={gameName} />
            <DetailRow label="Status" value={
              <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                {event.status}
              </span>
            } />
            {event.duration_ms && (
              <DetailRow label="Apply Time" value={`${(event.duration_ms / 1000).toFixed(1)}s`} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Benchmark events
  if (eventType.includes('benchmark') || event.message?.toLowerCase().includes('benchmark')) {
    const duration = metadata.duration || metadata.benchmark_duration || metadata.seconds;
    return (
      <div className="h-full flex flex-col bg-surface-elevated">
        <div className="p-6 flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-orange-500/20">
              <ChartIcon className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Benchmark</h3>
              <p className="text-sm text-text-muted">{event.message}</p>
            </div>
          </div>
          <div className="space-y-1 border-t border-border pt-4">
            <DetailRow label="Duration" value={formatDuration(duration as number)} />
            <DetailRow label="Status" value={
              <span className={`px-2 py-0.5 rounded text-xs ${
                event.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                event.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {event.status}
              </span>
            } />
            {event.duration_ms && (
              <DetailRow label="Actual Duration" value={`${(event.duration_ms / 1000).toFixed(1)}s`} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Automation/Iteration events
  if (eventType.includes('automation') || eventType.includes('iteration')) {
    const totalSteps = metadata.total_steps || metadata.steps;
    const iteration = metadata.iteration || metadata.current_iteration;
    return (
      <div className="h-full flex flex-col bg-surface-elevated">
        <div className="p-6 flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-indigo-500/20">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Automation</h3>
              <p className="text-sm text-text-muted">{event.message}</p>
            </div>
          </div>
          <div className="space-y-1 border-t border-border pt-4">
            {totalSteps && <DetailRow label="Total Steps" value={totalSteps} />}
            {iteration && <DetailRow label="Iteration" value={iteration} />}
            <DetailRow label="Status" value={
              <span className={`px-2 py-0.5 rounded text-xs ${
                event.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                event.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {event.status}
              </span>
            } />
            {event.duration_ms && (
              <DetailRow label="Duration" value={`${(event.duration_ms / 1000).toFixed(1)}s`} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Connection events (SUT, OmniParser)
  if (eventType.includes('connect') || eventType.includes('sut_') || eventType.includes('omniparser')) {
    const target = metadata.ip || metadata.url || metadata.target || metadata.sut_ip;
    return (
      <div className="h-full flex flex-col bg-surface-elevated">
        <div className="p-6 flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-teal-500/20">
              <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Connection</h3>
              <p className="text-sm text-text-muted">{event.message}</p>
            </div>
          </div>
          <div className="space-y-1 border-t border-border pt-4">
            {target && <DetailRow label="Target" value={target} mono />}
            <DetailRow label="Status" value={
              <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                {event.status}
              </span>
            } />
          </div>
        </div>
      </div>
    );
  }

  // Generic fallback for other events
  return (
    <div className="h-full flex flex-col bg-surface-elevated">
      <div className="p-6 flex-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-gray-500/20">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Event Details</h3>
            <p className="text-sm text-text-muted">{event.message}</p>
          </div>
        </div>
        <div className="space-y-1 border-t border-border pt-4">
          <DetailRow label="Event Type" value={eventType} mono />
          <DetailRow label="Status" value={
            <span className={`px-2 py-0.5 rounded text-xs ${
              event.status === 'completed' ? 'bg-green-500/20 text-green-400' :
              event.status === 'failed' ? 'bg-red-500/20 text-red-400' :
              event.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {event.status}
            </span>
          } />
          {event.duration_ms && (
            <DetailRow label="Duration" value={`${(event.duration_ms / 1000).toFixed(1)}s`} />
          )}
          {Object.keys(metadata).length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <span className="text-xs text-text-muted">Metadata</span>
              <pre className="mt-2 p-2 text-xs bg-surface rounded overflow-auto max-h-32 text-text-secondary">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventDetailsPanel;
