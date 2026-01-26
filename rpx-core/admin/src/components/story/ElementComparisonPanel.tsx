/**
 * Element Comparison Panel - Side-by-side view of expected vs matched element
 *
 * Features:
 * - Left: Expected element criteria (from YAML workflow)
 * - Right: Matched element (from OmniParser)
 * - Highlight differences
 * - Show confidence score
 */

import React from 'react';
import type { ElementMatch, TimelineEvent } from '../../api';

interface ElementComparisonPanelProps {
  elementMatch: ElementMatch;
  event: TimelineEvent | null;
}

// Field row component
function FieldRow({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-text-muted text-xs w-20 flex-shrink-0">{label}:</span>
      <span className={`text-xs ${highlight ? 'text-primary font-medium' : 'text-text-secondary'}`}>
        {value || <span className="text-text-tertiary italic">N/A</span>}
      </span>
    </div>
  );
}

// Section header
function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-border">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-sm font-medium text-text-primary">{title}</span>
    </div>
  );
}

// Confidence indicator
function ConfidenceIndicator({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  const color = percentage >= 90 ? 'bg-green-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-text-muted">{percentage}%</span>
    </div>
  );
}

export function ElementComparisonPanel({ elementMatch }: ElementComparisonPanelProps) {
  const expected = elementMatch.expected;
  const actual = elementMatch.actual;

  // Format find_text (could be string or array)
  const findTextDisplay = expected?.find_text
    ? Array.isArray(expected.find_text)
      ? expected.find_text.join(' | ')
      : expected.find_text
    : null;

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border">
        <h3 className="text-sm font-medium text-text-primary">Element Comparison</h3>
        <p className="text-xs text-text-muted mt-0.5">
          Step {elementMatch.step}: {elementMatch.description || 'Unknown action'}
        </p>
      </div>

      {/* Content - two columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Expected (from YAML) */}
        <div className="flex-1 p-4 border-r border-border overflow-auto">
          <SectionHeader title="Expected (YAML)" color="#22c55e" />

          {expected ? (
            <>
              <FieldRow label="Type" value={expected.find_type || 'any'} />
              <FieldRow label="Text" value={findTextDisplay} highlight />
              <FieldRow label="Match" value={expected.text_match || 'contains'} />
            </>
          ) : (
            <p className="text-xs text-text-muted italic">No expected element defined</p>
          )}

          {/* Click info */}
          {elementMatch.click_coordinates && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <span>Click at ({elementMatch.click_coordinates.x}, {elementMatch.click_coordinates.y})</span>
              </div>
            </div>
          )}
        </div>

        {/* Matched (from OmniParser) */}
        <div className="flex-1 p-4 overflow-auto">
          <SectionHeader title="Matched (OmniParser)" color="#3b82f6" />

          {actual ? (
            <>
              <FieldRow label="Type" value={actual.type} />
              <FieldRow label="Content" value={actual.content} highlight />
              <FieldRow
                label="Confidence"
                value={<ConfidenceIndicator value={actual.confidence} />}
              />
              <FieldRow
                label="BBox"
                value={
                  <span className="font-mono text-[10px]">
                    [{actual.bbox.map(v => v.toFixed(0)).join(', ')}]
                  </span>
                }
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-20 text-text-muted">
              <svg className="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs italic">No element matched</p>
            </div>
          )}
        </div>
      </div>

      {/* Match status footer */}
      <div className="px-4 py-2 border-t border-border bg-surface-elevated">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {actual ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-green-400">Element matched successfully</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-red-400">Element not found</span>
              </>
            )}
          </div>

          {actual?.confidence !== undefined && (
            <span className="text-xs text-text-muted">
              Confidence: {Math.round(actual.confidence * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ElementComparisonPanel;
