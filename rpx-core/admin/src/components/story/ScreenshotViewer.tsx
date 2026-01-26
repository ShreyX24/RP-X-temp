/**
 * Screenshot Viewer with OmniParser Overlay
 *
 * Features:
 * - Full-size screenshot display
 * - Canvas/SVG overlay for bounding boxes
 * - Toggle layers: all detected elements, expected element, matched element
 * - Click target crosshair
 * - Hover tooltips showing element content/type
 * - Zoom/pan support (future)
 */

import React, { useState, useEffect, useRef } from 'react';
import type { ScreenshotInfo, ElementMatch, TimelineEvent, OmniParserElement } from '../../api';
import { getRunOmniparserJson } from '../../api';

interface ScreenshotViewerProps {
  runId: string;
  screenshot: ScreenshotInfo | null;
  elementMatch: ElementMatch | null;
  event: TimelineEvent | null;
}

// Overlay toggle button
function OverlayToggle({
  label,
  enabled,
  color,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  color: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        px-2 py-1 text-xs rounded flex items-center gap-1.5 transition-all
        ${enabled ? 'bg-surface-elevated' : 'bg-transparent'}
        hover:bg-surface-hover
      `}
    >
      <span
        className={`w-2.5 h-2.5 rounded-sm border ${enabled ? 'bg-current' : ''}`}
        style={{ borderColor: color, color: enabled ? color : 'transparent' }}
      />
      <span className={enabled ? 'text-text-primary' : 'text-text-muted'}>{label}</span>
    </button>
  );
}

// Bounding box overlay component
function BoundingBoxOverlay({
  bbox,
  imageWidth,
  imageHeight,
  containerWidth,
  containerHeight,
  color,
  dashed = false,
  label,
  showLabel = false,
}: {
  bbox: [number, number, number, number];
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
  color: string;
  dashed?: boolean;
  label?: string;
  showLabel?: boolean;
}) {
  // Calculate scale to fit image in container while maintaining aspect ratio
  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  const offsetX = (containerWidth - scaledWidth) / 2;
  const offsetY = (containerHeight - scaledHeight) / 2;

  // Convert normalized bbox (0-1) to pixel coordinates
  const [x1, y1, x2, y2] = bbox;
  const left = offsetX + x1 * scaledWidth;
  const top = offsetY + y1 * scaledHeight;
  const width = (x2 - x1) * scaledWidth;
  const height = (y2 - y1) * scaledHeight;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        border: `2px ${dashed ? 'dashed' : 'solid'} ${color}`,
        backgroundColor: `${color}10`,
      }}
    >
      {showLabel && label && (
        <div
          className="absolute -top-5 left-0 px-1 text-xs whitespace-nowrap"
          style={{ backgroundColor: color, color: '#fff' }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

// Click target crosshair
function ClickCrosshair({
  x,
  y,
  imageWidth,
  imageHeight,
  containerWidth,
  containerHeight,
}: {
  x: number;
  y: number;
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
}) {
  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  const offsetX = (containerWidth - scaledWidth) / 2;
  const offsetY = (containerHeight - scaledHeight) / 2;

  const left = offsetX + (x / imageWidth) * scaledWidth;
  const top = offsetY + (y / imageHeight) * scaledHeight;

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: `${left}px`, top: `${top}px` }}
    >
      {/* Vertical line */}
      <div className="absolute w-px h-6 bg-red-500 -translate-y-1/2" />
      {/* Horizontal line */}
      <div className="absolute h-px w-6 bg-red-500 -translate-x-1/2" />
      {/* Center dot */}
      <div className="absolute w-2 h-2 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}

export function ScreenshotViewer({
  runId,
  screenshot,
  elementMatch,
  event,
}: ScreenshotViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [imageSize, setImageSize] = useState({ width: 1920, height: 1080 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [omniparserElements, setOmniparserElements] = useState<OmniParserElement[]>([]);

  // Overlay toggles
  const [showAllElements, setShowAllElements] = useState(false);
  const [showExpected, setShowExpected] = useState(true);
  const [showMatched, setShowMatched] = useState(true);
  const [showClick, setShowClick] = useState(true);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Load OmniParser JSON when screenshot changes
  useEffect(() => {
    if (!screenshot?.omniparser_path) {
      setOmniparserElements([]);
      return;
    }

    const loadOmniparser = async () => {
      try {
        // Extract the filepath from the full path
        const match = screenshot.omniparser_path!.match(/\/omniparser\/(.+)$/);
        if (match) {
          const data = await getRunOmniparserJson(runId, match[1]);
          setOmniparserElements(data.elements || []);
        }
      } catch (err) {
        console.warn('Failed to load OmniParser data:', err);
        setOmniparserElements([]);
      }
    };

    loadOmniparser();
  }, [runId, screenshot?.omniparser_path]);

  // Handle image load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
    setImageError(false);
  };

  // Screenshot URL
  const screenshotUrl = screenshot?.path || null;

  // No screenshot state
  if (!screenshot || !screenshotUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-surface-elevated text-text-muted p-4">
        <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">No screenshot available</p>
        <p className="text-xs text-text-tertiary mt-1">Select a step event to view</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">
            {event?.message || `Step ${screenshot.step}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <OverlayToggle
            label="All Elements"
            enabled={showAllElements}
            color="#6366f1"
            onToggle={() => setShowAllElements(v => !v)}
          />
          <OverlayToggle
            label="Expected"
            enabled={showExpected}
            color="#22c55e"
            onToggle={() => setShowExpected(v => !v)}
          />
          <OverlayToggle
            label="Matched"
            enabled={showMatched}
            color="#3b82f6"
            onToggle={() => setShowMatched(v => !v)}
          />
          <OverlayToggle
            label="Click"
            enabled={showClick}
            color="#ef4444"
            onToggle={() => setShowClick(v => !v)}
          />
        </div>
      </div>

      {/* Screenshot container */}
      <div
        ref={containerRef}
        className="flex-1 relative bg-gray-900 overflow-hidden flex items-center justify-center"
      >
        {/* Screenshot image */}
        <img
          src={screenshotUrl}
          alt={`Step ${screenshot.step} screenshot`}
          onLoad={handleImageLoad}
          onError={() => setImageError(true)}
          className="max-w-full max-h-full object-contain"
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />

        {/* Loading state */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error state */}
        {imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted">
            <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm">Failed to load screenshot</p>
          </div>
        )}

        {/* Overlays (only when image is loaded) */}
        {imageLoaded && (
          <>
            {/* All detected elements from OmniParser */}
            {showAllElements && omniparserElements.map((el, idx) => (
              <BoundingBoxOverlay
                key={`all-${idx}`}
                bbox={el.bbox}
                imageWidth={imageSize.width}
                imageHeight={imageSize.height}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
                color="#6366f1"
                label={el.content || el.type}
                showLabel={false}
              />
            ))}

            {/* Expected element (dashed green) */}
            {showExpected && elementMatch?.actual?.bbox && (
              <BoundingBoxOverlay
                bbox={elementMatch.actual.bbox.map(v => v > 1 ? v / imageSize.width : v) as [number, number, number, number]}
                imageWidth={imageSize.width}
                imageHeight={imageSize.height}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
                color="#22c55e"
                dashed={true}
                label="Expected"
                showLabel={true}
              />
            )}

            {/* Matched element (solid blue) */}
            {showMatched && elementMatch?.actual?.bbox && (
              <BoundingBoxOverlay
                bbox={elementMatch.actual.bbox.map(v => v > 1 ? v / imageSize.width : v) as [number, number, number, number]}
                imageWidth={imageSize.width}
                imageHeight={imageSize.height}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
                color="#3b82f6"
                label={elementMatch.actual.content}
                showLabel={true}
              />
            )}

            {/* Click target crosshair */}
            {showClick && elementMatch?.click_coordinates && (
              <ClickCrosshair
                x={elementMatch.click_coordinates.x}
                y={elementMatch.click_coordinates.y}
                imageWidth={imageSize.width}
                imageHeight={imageSize.height}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ScreenshotViewer;
