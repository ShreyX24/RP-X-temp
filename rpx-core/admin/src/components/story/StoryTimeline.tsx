/**
 * Story Timeline - Vertical scrolling timeline of run events
 *
 * Features:
 * - Chronological event display
 * - Event cards with icon, timestamp, duration
 * - Click to select and view details
 * - Auto-scroll to active event during playback
 * - Color coding: green=success, red=failed, yellow=skipped
 */

import { useEffect, useRef } from 'react';
import type { TimelineEvent } from '../../api';

interface StoryTimelineProps {
  events: TimelineEvent[];
  selectedEvent: TimelineEvent | null;
  onEventSelect: (event: TimelineEvent, index: number) => void;
  currentIndex: number;
}

// Event type icons
function EventIcon({ eventType }: { eventType: string }) {
  const iconClass = 'w-4 h-4';

  // Step events
  if (eventType.startsWith('step_')) {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }

  // Connection events
  if (eventType.includes('connect') || eventType.includes('sut_')) {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    );
  }

  // Game events
  if (eventType.includes('game_') || eventType.includes('launch')) {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  // Service call events
  if (eventType.includes('service_call')) {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    );
  }

  // Iteration events
  if (eventType.includes('iteration')) {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
  }

  // Preset events
  if (eventType.includes('preset')) {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }

  // Default icon
  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Status colors
function getStatusColors(status: string): { bg: string; border: string; text: string; icon: string } {
  switch (status) {
    case 'completed':
      return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: 'text-green-500' };
    case 'failed':
    case 'error':
      return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: 'text-red-500' };
    case 'skipped':
    case 'warning':
      return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: 'text-yellow-500' };
    case 'in_progress':
      return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: 'text-blue-500' };
    default:
      return { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400', icon: 'text-gray-500' };
  }
}

// Format timestamp
function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--:--:--';
  }
}

// Format duration
function formatDuration(ms: number | null): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Event card component
function EventCard({
  event,
  isSelected,
  onClick,
  serviceCallCount = 0,
}: {
  event: TimelineEvent;
  isSelected: boolean;
  onClick: () => void;
  serviceCallCount?: number;
}) {
  const colors = getStatusColors(event.status);

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-3 py-2 border-l-2 transition-all
        hover:bg-surface-hover
        ${isSelected ? 'bg-surface-elevated border-primary' : `${colors.bg} ${colors.border}`}
      `}
    >
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 ${colors.icon}`}>
          <EventIcon eventType={event.event_type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-mono ${colors.text}`}>
              {formatTime(event.timestamp)}
            </span>
            {event.duration_ms && (
              <span className="text-xs text-text-muted">
                {formatDuration(event.duration_ms)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className={`text-sm truncate flex-1 ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
              {event.message}
            </p>
            {/* Service call count badge */}
            {serviceCallCount > 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30"
                title={`${serviceCallCount} service call${serviceCallCount > 1 ? 's' : ''}`}
              >
                {serviceCallCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export function StoryTimeline({
  events,
  selectedEvent,
  onEventSelect,
  currentIndex,
}: StoryTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected event
  useEffect(() => {
    if (selectedRef.current && containerRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentIndex]);

  // Count service calls linked to each event
  const serviceCallCounts = new Map<string, number>();
  events.forEach(event => {
    if (event.event_type.startsWith('service_call_') && event.metadata?.linked_event_id) {
      const linkedId = event.metadata.linked_event_id;
      serviceCallCounts.set(linkedId, (serviceCallCounts.get(linkedId) || 0) + 1);
    }
  });

  // Filter out replaced events and service_call events (shown in Service Flow instead)
  const visibleEvents = events.filter(event => {
    // Check if this event is replaced by another
    const isReplaced = events.some(e => e.replaces_event_id === event.event_id);
    if (isReplaced) return false;

    // Hide service_call events - they're visualized in the Service Flow diagram
    if (event.event_type.startsWith('service_call_')) return false;

    return true;
  });

  if (visibleEvents.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-muted p-4">
        <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">No events yet</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="divide-y divide-border">
      {visibleEvents.map((event, index) => {
        const isSelected = selectedEvent?.event_id === event.event_id;
        return (
          <div
            key={event.event_id}
            ref={isSelected ? selectedRef : null}
          >
            <EventCard
              event={event}
              isSelected={isSelected}
              onClick={() => onEventSelect(event, index)}
              serviceCallCount={serviceCallCounts.get(event.event_id) || 0}
            />
          </div>
        );
      })}
    </div>
  );
}

export default StoryTimeline;
