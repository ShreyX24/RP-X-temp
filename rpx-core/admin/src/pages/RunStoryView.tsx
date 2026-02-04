/**
 * Run Story View - Comprehensive visualization of what happened during an automation run
 *
 * Features:
 * - Service-to-service communication flow diagram
 * - Step-by-step execution timeline with screenshots
 * - OmniParser overlay showing detected elements
 * - Expected vs actual element comparison
 * - Playback controls for stepping through the run
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRunStory, type RunStoryResponse, type TimelineEvent } from '../api';
import { ServiceFlowDiagram } from '../components/story/ServiceFlowDiagram';
import { StoryTimeline } from '../components/story/StoryTimeline';
import { ScreenshotViewer } from '../components/story/ScreenshotViewer';
import { ElementComparisonPanel } from '../components/story/ElementComparisonPanel';
import { PlaybackControls } from '../components/story/PlaybackControls';
import { MultiServiceLogViewer } from '../components/story/MultiServiceLogViewer';

// Icons
function ArrowLeftIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function LoaderIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function AlertIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    cancelled: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    queued: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${statusStyles[status] || statusStyles.queued}`}>
      {status}
    </span>
  );
}

export function RunStoryView() {
  const { runId } = useParams<{ runId: string }>();

  // Story data state
  const [storyData, setStoryData] = useState<RunStoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Selected event for detail view
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  // Log viewer state
  const [showLogViewer, setShowLogViewer] = useState(false);

  // Load story data
  useEffect(() => {
    if (!runId) return;

    const loadStory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRunStory(runId);
        setStoryData(data);
        // Select first step event by default
        const firstStep = data.timeline_events.find(e => e.event_type === 'step_started');
        if (firstStep) {
          setSelectedEvent(firstStep);
          setCurrentEventIndex(data.timeline_events.indexOf(firstStep));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story data');
      } finally {
        setLoading(false);
      }
    };

    loadStory();
  }, [runId]);

  // Playback logic
  useEffect(() => {
    if (!isPlaying || !storyData) return;

    const stepEvents = storyData.timeline_events.filter(e =>
      e.event_type.startsWith('step_') || e.event_type.includes('started') || e.event_type.includes('completed')
    );

    const interval = setInterval(() => {
      setCurrentEventIndex(prev => {
        const next = prev + 1;
        if (next >= stepEvents.length) {
          setIsPlaying(false);
          return prev;
        }
        setSelectedEvent(stepEvents[next]);
        return next;
      });
    }, 2000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, storyData]);

  // Event handlers
  const handleEventSelect = useCallback((event: TimelineEvent, index: number) => {
    setSelectedEvent(event);
    setCurrentEventIndex(index);
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleStepForward = useCallback(() => {
    if (!storyData) return;
    const stepEvents = storyData.timeline_events.filter(e => e.event_type.startsWith('step_'));
    if (currentEventIndex < stepEvents.length - 1) {
      const next = currentEventIndex + 1;
      setCurrentEventIndex(next);
      setSelectedEvent(stepEvents[next]);
    }
  }, [storyData, currentEventIndex]);

  const handleStepBackward = useCallback(() => {
    if (!storyData) return;
    const stepEvents = storyData.timeline_events.filter(e => e.event_type.startsWith('step_'));
    if (currentEventIndex > 0) {
      const prev = currentEventIndex - 1;
      setCurrentEventIndex(prev);
      setSelectedEvent(stepEvents[prev]);
    }
  }, [storyData, currentEventIndex]);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  // Helper to extract step number from event (from metadata or message)
  const getStepFromEvent = (event: TimelineEvent | null): number | null => {
    if (!event) return null;

    // Try metadata.step first
    if (event.metadata?.step != null) {
      return Number(event.metadata.step);
    }

    // Fallback: parse from message like "Step 1 done", "Step 2 failed", etc.
    const match = event.message?.match(/Step\s+(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }

    return null;
  };

  // Get the step number for the selected event
  const selectedStep = getStepFromEvent(selectedEvent);

  // Get current step's element match
  const currentElementMatch = selectedStep != null
    ? storyData?.element_matches.find(m => m.step == selectedStep)
    : null;

  // Get current screenshot info
  const currentScreenshot = selectedStep != null
    ? storyData?.screenshots.find(s => s.step == selectedStep)
    : null;

  // Calculate duration
  const duration = storyData?.started_at && storyData?.completed_at
    ? Math.round((new Date(storyData.completed_at).getTime() - new Date(storyData.started_at).getTime()) / 1000)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoaderIcon className="w-8 h-8 text-primary" />
          <p className="text-text-muted">Loading run story...</p>
        </div>
      </div>
    );
  }

  if (error || !storyData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertIcon className="w-8 h-8 text-red-400" />
          <p className="text-red-400">{error || 'Failed to load story'}</p>
          <Link
            to="/runs"
            className="text-primary hover:underline flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Runs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-surface border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/runs"
              className="text-text-muted hover:text-text-primary transition-colors"
              title="Back to Runs"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">
                {storyData.game_name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-text-muted">
                <span>SUT: {storyData.sut_ip || 'N/A'}</span>
                <span className="text-text-tertiary">|</span>
                <StatusBadge status={storyData.status} />
                {duration !== null && (
                  <>
                    <span className="text-text-tertiary">|</span>
                    <span>{duration}s</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Log viewer button */}
            <button
              onClick={() => setShowLogViewer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
              title="View service logs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Logs
            </button>
            <div className="text-sm text-text-muted">
              Run ID: <code className="text-xs bg-surface-elevated px-1.5 py-0.5 rounded">{runId}</code>
            </div>
          </div>
        </div>
      </header>

      {/* Multi-service log viewer modal */}
      <MultiServiceLogViewer
        runId={runId!}
        isVisible={showLogViewer}
        onClose={() => setShowLogViewer(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Service Flow */}
        <div className="w-64 border-r border-border bg-surface flex flex-col">
          <div className="px-3 py-2 border-b border-border">
            <h2 className="text-sm font-medium text-text-primary">Service Flow</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ServiceFlowDiagram
              serviceCalls={storyData.service_calls}
              currentEvent={selectedEvent}
            />
          </div>
        </div>

        {/* Center Panel - Timeline */}
        <div className="w-80 border-r border-border bg-surface flex flex-col">
          <div className="px-3 py-2 border-b border-border">
            <h2 className="text-sm font-medium text-text-primary">Timeline</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <StoryTimeline
              events={storyData.timeline_events}
              selectedEvent={selectedEvent}
              onEventSelect={handleEventSelect}
              currentIndex={currentEventIndex}
            />
          </div>
        </div>

        {/* Right Panel - Screenshot & Element Comparison */}
        <div className="flex-1 flex flex-col bg-background">
          {/* Screenshot Viewer */}
          <div className="flex-1 relative">
            <ScreenshotViewer
              runId={runId!}
              screenshot={currentScreenshot || null}
              elementMatch={currentElementMatch || null}
              event={selectedEvent}
            />
          </div>

          {/* Element Comparison Panel - always show for step events */}
          {selectedEvent?.event_type?.startsWith('step_') && (
            <div className="h-48 border-t border-border">
              <ElementComparisonPanel
                elementMatch={currentElementMatch}
                event={selectedEvent}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom - Playback Controls (sticky at bottom) */}
      <div className="flex-shrink-0 bg-surface border-t border-border px-4 py-3">
        <PlaybackControls
          isPlaying={isPlaying}
          currentIndex={currentEventIndex}
          totalEvents={storyData.timeline_events.filter(e => e.event_type.startsWith('step_')).length}
          playbackSpeed={playbackSpeed}
          onPlayPause={handlePlayPause}
          onStepForward={handleStepForward}
          onStepBackward={handleStepBackward}
          onSpeedChange={handleSpeedChange}
          onSeek={(index) => {
            const stepEvents = storyData.timeline_events.filter(e => e.event_type.startsWith('step_'));
            if (stepEvents[index]) {
              setCurrentEventIndex(index);
              setSelectedEvent(stepEvents[index]);
            }
          }}
        />
      </div>
    </div>
  );
}

export default RunStoryView;
