/**
 * Playback Controls - Timeline navigation and playback
 *
 * Features:
 * - Play/Pause button
 * - Step forward/backward
 * - Speed control (0.5x, 1x, 2x)
 * - Progress bar with clickable positions
 */

import React from 'react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentIndex: number;
  totalEvents: number;
  playbackSpeed: number;
  onPlayPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (index: number) => void;
}

// Icon components
function PlayIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function StepBackIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  );
}

function StepForwardIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  );
}

// Speed button
function SpeedButton({
  speed,
  currentSpeed,
  onClick,
}: {
  speed: number;
  currentSpeed: number;
  onClick: () => void;
}) {
  const isActive = Math.abs(currentSpeed - speed) < 0.01;

  return (
    <button
      onClick={onClick}
      className={`
        px-2 py-1 text-xs font-mono rounded transition-colors
        ${isActive
          ? 'bg-primary text-white'
          : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
        }
      `}
    >
      {speed}x
    </button>
  );
}

// Progress bar
function ProgressBar({
  current,
  total,
  onSeek,
}: {
  current: number;
  total: number;
  onSeek: (index: number) => void;
}) {
  const percentage = total > 0 ? (current / (total - 1)) * 100 : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPercentage = x / rect.width;
    const newIndex = Math.round(clickPercentage * (total - 1));
    onSeek(Math.max(0, Math.min(newIndex, total - 1)));
  };

  return (
    <div
      className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer group"
      onClick={handleClick}
    >
      <div
        className="h-full bg-primary rounded-full relative transition-all"
        style={{ width: `${percentage}%` }}
      >
        {/* Thumb */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
      </div>
    </div>
  );
}

export function PlaybackControls({
  isPlaying,
  currentIndex,
  totalEvents,
  playbackSpeed,
  onPlayPause,
  onStepForward,
  onStepBackward,
  onSpeedChange,
  onSeek,
}: PlaybackControlsProps) {
  const canStepBack = currentIndex > 0;
  const canStepForward = currentIndex < totalEvents - 1;

  return (
    <div className="flex items-center gap-4">
      {/* Playback buttons */}
      <div className="flex items-center gap-1">
        {/* Step backward */}
        <button
          onClick={onStepBackward}
          disabled={!canStepBack}
          className={`
            p-2 rounded-lg transition-colors
            ${canStepBack
              ? 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              : 'text-text-tertiary cursor-not-allowed'
            }
          `}
          title="Previous step"
        >
          <StepBackIcon />
        </button>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          disabled={totalEvents === 0}
          className={`
            p-2 rounded-lg transition-colors
            ${totalEvents > 0
              ? 'text-text-primary hover:bg-surface-hover'
              : 'text-text-tertiary cursor-not-allowed'
            }
          `}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Step forward */}
        <button
          onClick={onStepForward}
          disabled={!canStepForward}
          className={`
            p-2 rounded-lg transition-colors
            ${canStepForward
              ? 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              : 'text-text-tertiary cursor-not-allowed'
            }
          `}
          title="Next step"
        >
          <StepForwardIcon />
        </button>
      </div>

      {/* Progress bar */}
      <ProgressBar current={currentIndex} total={totalEvents} onSeek={onSeek} />

      {/* Step counter */}
      <div className="text-sm text-text-muted font-mono min-w-[60px] text-center">
        {totalEvents > 0 ? `${currentIndex + 1} / ${totalEvents}` : '0 / 0'}
      </div>

      {/* Speed controls */}
      <div className="flex items-center gap-1 ml-2">
        <SpeedButton speed={0.5} currentSpeed={playbackSpeed} onClick={() => onSpeedChange(0.5)} />
        <SpeedButton speed={1} currentSpeed={playbackSpeed} onClick={() => onSpeedChange(1)} />
        <SpeedButton speed={2} currentSpeed={playbackSpeed} onClick={() => onSpeedChange(2)} />
      </div>
    </div>
  );
}

export default PlaybackControls;
