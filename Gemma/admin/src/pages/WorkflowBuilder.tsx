/**
 * WorkflowBuilder - Visual workflow builder for game automation
 * Replaces the desktop Tkinter workflow_builder.py with a web-based interface
 */

import { useState, useRef, useCallback } from 'react';
import { useDevices, useWorkflowBuilder } from '../hooks';
import { StatusDot } from '../components';
import type { BoundingBox, WorkflowStep, SUT } from '../types';

// Game metadata interface
interface GameMetadata {
  name: string;
  steamAppId: string;
  processName: string;
  startupDuration: number;
}

// Action types supported
const ACTION_TYPES = [
  { value: 'find_and_click', label: 'Click Element', description: 'Find element and click' },
  { value: 'double_click', label: 'Double Click', description: 'Double click element' },
  { value: 'right_click', label: 'Right Click', description: 'Right click element' },
  { value: 'key', label: 'Press Key', description: 'Press a single key' },
  { value: 'hotkey', label: 'Hotkey', description: 'Press key combination' },
  { value: 'text', label: 'Type Text', description: 'Type text into field' },
  { value: 'wait', label: 'Wait', description: 'Wait for duration' },
  { value: 'scroll', label: 'Scroll', description: 'Scroll up or down' },
  { value: 'drag', label: 'Drag', description: 'Drag element to position' },
] as const;

// Key options for key actions
const KEY_OPTIONS = [
  'enter', 'escape', 'tab', 'space', 'backspace', 'delete',
  'up', 'down', 'left', 'right', 'home', 'end', 'pageup', 'pagedown',
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
];

// Text match options
const TEXT_MATCH_OPTIONS = [
  { value: 'exact', label: 'Exact Match' },
  { value: 'contains', label: 'Contains' },
  { value: 'startswith', label: 'Starts With' },
  { value: 'endswith', label: 'Ends With' },
];

// Element type in selector
interface ElementSelector {
  type: 'icon' | 'text' | 'any';
  text: string;
  textMatch: 'exact' | 'contains' | 'startswith' | 'endswith';
}

// Draft step being edited
interface DraftStep {
  actionType: string;
  element: ElementSelector | null;
  key?: string;
  hotkey?: string;
  text?: string;
  duration?: number;
  scrollDirection?: 'up' | 'down';
  scrollAmount?: number;
  timeout: number;
  delay: number;
  optional: boolean;
  description: string;
}

// Screenshot canvas with bounding box overlay
function ScreenshotCanvas({
  imageUrl,
  elements,
  selectedElement,
  onElementClick,
  zoom,
}: {
  imageUrl: string | null;
  elements: BoundingBox[];
  selectedElement: BoundingBox | null;
  onElementClick: (element: BoundingBox) => void;
  zoom: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">[ ]</div>
          <div className="text-sm">No screenshot</div>
          <div className="text-xs mt-1">Select a SUT and capture screenshot</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto bg-gray-900 rounded-lg border border-gray-700"
      style={{ maxHeight: '500px' }}
    >
      <div
        className="relative inline-block"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
      >
        <img
          src={imageUrl}
          alt="Screenshot"
          className="block"
          draggable={false}
        />
        {/* Bounding boxes */}
        {elements.map((element, index) => {
          const isSelected = selectedElement &&
            selectedElement.x === element.x &&
            selectedElement.y === element.y;

          return (
            <button
              key={index}
              onClick={() => onElementClick(element)}
              className={`absolute border-2 transition-all cursor-pointer hover:bg-blue-500/20 ${
                isSelected
                  ? 'border-yellow-400 bg-yellow-400/20'
                  : element.element_type === 'icon'
                    ? 'border-blue-400 bg-blue-400/10'
                    : 'border-emerald-400 bg-emerald-400/10'
              }`}
              style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
              }}
              title={`${element.element_type}: ${element.element_text}`}
            />
          );
        })}
      </div>
    </div>
  );
}

// SUT selector component
function SUTSelector({
  devices,
  selectedSut,
  onSelect,
}: {
  devices: SUT[];
  selectedSut: SUT | null;
  onSelect: (sut: SUT | null) => void;
}) {
  const onlineDevices = devices.filter(d => d.status === 'online');

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-400 uppercase tracking-wide">
        Target SUT
      </label>
      <select
        value={selectedSut?.device_id || ''}
        onChange={(e) => {
          const sut = devices.find(d => d.device_id === e.target.value);
          onSelect(sut || null);
        }}
        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
      >
        <option value="">Select a SUT...</option>
        {onlineDevices.map((sut) => (
          <option key={sut.device_id} value={sut.device_id}>
            {sut.hostname || sut.ip} ({sut.ip})
          </option>
        ))}
      </select>
      {selectedSut && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <StatusDot status="online" size="xs" />
          <span>Connected to {selectedSut.hostname || selectedSut.ip}</span>
        </div>
      )}
    </div>
  );
}

// Step editor form
function StepEditor({
  draft,
  selectedElement,
  onDraftChange,
  onAddStep,
  onTestStep,
  isExecuting,
}: {
  draft: DraftStep;
  selectedElement: BoundingBox | null;
  onDraftChange: (draft: DraftStep) => void;
  onAddStep: () => void;
  onTestStep: () => void;
  isExecuting: boolean;
}) {
  const needsElement = ['find_and_click', 'double_click', 'right_click', 'drag'].includes(draft.actionType);

  return (
    <div className="space-y-4">
      {/* Action Type */}
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
          Action Type
        </label>
        <select
          value={draft.actionType}
          onChange={(e) => onDraftChange({ ...draft, actionType: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
        >
          {ACTION_TYPES.map((action) => (
            <option key={action.value} value={action.value}>
              {action.label}
            </option>
          ))}
        </select>
        <div className="text-xs text-gray-500 mt-1">
          {ACTION_TYPES.find(a => a.value === draft.actionType)?.description}
        </div>
      </div>

      {/* Element Selector (for click actions) */}
      {needsElement && (
        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 uppercase tracking-wide">
              Target Element
            </label>
            {selectedElement && (
              <button
                onClick={() => {
                  onDraftChange({
                    ...draft,
                    element: {
                      type: selectedElement.element_type,
                      text: selectedElement.element_text,
                      textMatch: 'contains',
                    },
                    description: `Click "${selectedElement.element_text}"`,
                  });
                }}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Use Selected
              </button>
            )}
          </div>

          {draft.element ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  draft.element.type === 'icon' ? 'bg-blue-900/50 text-blue-400' : 'bg-emerald-900/50 text-emerald-400'
                }`}>
                  {draft.element.type}
                </span>
                <span className="text-sm text-gray-200 font-mono">
                  "{draft.element.text}"
                </span>
                <button
                  onClick={() => onDraftChange({ ...draft, element: null })}
                  className="text-gray-500 hover:text-gray-400"
                >
                  x
                </button>
              </div>
              <select
                value={draft.element.textMatch}
                onChange={(e) => onDraftChange({
                  ...draft,
                  element: { ...draft.element!, textMatch: e.target.value as ElementSelector['textMatch'] },
                })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
              >
                {TEXT_MATCH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-center py-3 text-gray-500 text-xs">
              Click an element in the screenshot to select
            </div>
          )}
        </div>
      )}

      {/* Key input (for key action) */}
      {draft.actionType === 'key' && (
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
            Key
          </label>
          <select
            value={draft.key || ''}
            onChange={(e) => onDraftChange({ ...draft, key: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
          >
            <option value="">Select key...</option>
            {KEY_OPTIONS.map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>
      )}

      {/* Hotkey input */}
      {draft.actionType === 'hotkey' && (
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
            Hotkey (e.g., ctrl+s, alt+f4)
          </label>
          <input
            type="text"
            value={draft.hotkey || ''}
            onChange={(e) => onDraftChange({ ...draft, hotkey: e.target.value })}
            placeholder="ctrl+s"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
          />
        </div>
      )}

      {/* Text input */}
      {draft.actionType === 'text' && (
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
            Text to Type
          </label>
          <input
            type="text"
            value={draft.text || ''}
            onChange={(e) => onDraftChange({ ...draft, text: e.target.value })}
            placeholder="Enter text..."
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
          />
        </div>
      )}

      {/* Wait duration */}
      {draft.actionType === 'wait' && (
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
            Duration (seconds)
          </label>
          <input
            type="number"
            value={draft.duration || 1}
            onChange={(e) => onDraftChange({ ...draft, duration: Number(e.target.value) })}
            min={0.1}
            step={0.1}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
          />
        </div>
      )}

      {/* Scroll options */}
      {draft.actionType === 'scroll' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
              Direction
            </label>
            <select
              value={draft.scrollDirection || 'down'}
              onChange={(e) => onDraftChange({ ...draft, scrollDirection: e.target.value as 'up' | 'down' })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
            >
              <option value="down">Down</option>
              <option value="up">Up</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
              Amount
            </label>
            <input
              type="number"
              value={draft.scrollAmount || 3}
              onChange={(e) => onDraftChange({ ...draft, scrollAmount: Number(e.target.value) })}
              min={1}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
            />
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
          Step Description
        </label>
        <input
          type="text"
          value={draft.description}
          onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
          placeholder="Describe this step..."
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
        />
      </div>

      {/* Timing */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
            Timeout (sec)
          </label>
          <input
            type="number"
            value={draft.timeout}
            onChange={(e) => onDraftChange({ ...draft, timeout: Number(e.target.value) })}
            min={1}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
            Delay After (sec)
          </label>
          <input
            type="number"
            value={draft.delay}
            onChange={(e) => onDraftChange({ ...draft, delay: Number(e.target.value) })}
            min={0}
            step={0.5}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
          />
        </div>
      </div>

      {/* Optional */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.optional}
          onChange={(e) => onDraftChange({ ...draft, optional: e.target.checked })}
          className="rounded border-gray-600 bg-gray-700 text-blue-500"
        />
        <span className="text-sm text-gray-300">Optional step (continue if fails)</span>
      </label>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onTestStep}
          disabled={isExecuting}
          className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded transition-colors"
        >
          {isExecuting ? 'Testing...' : 'Test Step'}
        </button>
        <button
          onClick={onAddStep}
          className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded transition-colors"
        >
          Add to Workflow
        </button>
      </div>
    </div>
  );
}

// Workflow steps list
function StepsList({
  steps,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  steps: WorkflowStep[];
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No steps added yet
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {steps.map((step, index) => (
        <div
          key={index}
          className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg border border-gray-700"
        >
          <span className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded text-xs text-gray-400">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-200 truncate">
              {step.description}
            </div>
            <div className="text-xs text-gray-500">
              {step.action_type}
              {step.optional && ' (optional)'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="p-1 text-gray-500 hover:text-gray-300 disabled:opacity-30"
            >
              ^
            </button>
            <button
              onClick={() => onMoveDown(index)}
              disabled={index === steps.length - 1}
              className="p-1 text-gray-500 hover:text-gray-300 disabled:opacity-30"
            >
              v
            </button>
            <button
              onClick={() => onRemove(index)}
              className="p-1 text-red-500 hover:text-red-400"
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Game metadata panel
function MetadataPanel({
  metadata,
  onChange,
}: {
  metadata: GameMetadata;
  onChange: (metadata: GameMetadata) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
          Game Name
        </label>
        <input
          type="text"
          value={metadata.name}
          onChange={(e) => onChange({ ...metadata, name: e.target.value })}
          placeholder="e.g., Cyberpunk 2077"
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
            Steam App ID
          </label>
          <input
            type="text"
            value={metadata.steamAppId}
            onChange={(e) => onChange({ ...metadata, steamAppId: e.target.value })}
            placeholder="e.g., 1091500"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
            Process Name
          </label>
          <input
            type="text"
            value={metadata.processName}
            onChange={(e) => onChange({ ...metadata, processName: e.target.value })}
            placeholder="e.g., Cyberpunk2077.exe"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
          Startup Duration (seconds)
        </label>
        <input
          type="number"
          value={metadata.startupDuration}
          onChange={(e) => onChange({ ...metadata, startupDuration: Number(e.target.value) })}
          min={0}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
        />
      </div>
    </div>
  );
}

// Main WorkflowBuilder page
export function WorkflowBuilder() {
  const { devices } = useDevices();
  const {
    screenshotUrl,
    annotatedImageUrl,
    elements,
    selectedElement,
    isCapturing,
    isParsing,
    isExecuting,
    error,
    captureScreenshot,
    parseCurrentScreenshot,
    selectElement,
    executeAction,
    clearError,
  } = useWorkflowBuilder();

  // Local state
  const [selectedSut, setSelectedSut] = useState<SUT | null>(null);
  const [zoom, setZoom] = useState(100);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [draft, setDraft] = useState<DraftStep>({
    actionType: 'find_and_click',
    element: null,
    timeout: 20,
    delay: 2,
    optional: false,
    description: '',
  });
  const [metadata, setMetadata] = useState({
    name: '',
    steamAppId: '',
    processName: '',
    startupDuration: 120,
  });
  const [showYaml, setShowYaml] = useState(false);

  // Handle screenshot capture
  const handleCapture = useCallback(async () => {
    if (!selectedSut) return;
    await captureScreenshot(selectedSut.device_id);
  }, [selectedSut, captureScreenshot]);

  // Handle parse
  const handleParse = useCallback(async () => {
    await parseCurrentScreenshot();
  }, [parseCurrentScreenshot]);

  // Handle element click
  const handleElementClick = useCallback((element: BoundingBox) => {
    selectElement(element);
    // Auto-populate draft
    setDraft(prev => ({
      ...prev,
      element: {
        type: element.element_type,
        text: element.element_text,
        textMatch: 'contains',
      },
      description: `Click "${element.element_text}"`,
    }));
  }, [selectElement]);

  // Add step to workflow
  const handleAddStep = useCallback(() => {
    const newStep: WorkflowStep = {
      step_number: steps.length + 1,
      description: draft.description || 'Step ' + (steps.length + 1),
      action_type: draft.actionType as WorkflowStep['action_type'],
      expected_delay: draft.delay,
      timeout: draft.timeout,
      optional: draft.optional,
    };

    // Add find config for click actions
    if (draft.element && ['find_and_click', 'double_click', 'right_click'].includes(draft.actionType)) {
      newStep.find = {
        type: draft.element.type,
        text: draft.element.text,
        text_match: draft.element.textMatch,
      };
    }

    // Add action config
    if (draft.actionType === 'key' && draft.key) {
      newStep.action = { type: 'key', key: draft.key };
    } else if (draft.actionType === 'hotkey' && draft.hotkey) {
      newStep.action = { type: 'hotkey', keys: draft.hotkey.split('+').map(k => k.trim()) };
    } else if (draft.actionType === 'text' && draft.text) {
      newStep.action = { type: 'text', text: draft.text };
    } else if (draft.actionType === 'wait') {
      newStep.action = { type: 'wait', duration: draft.duration || 1 };
    } else if (draft.actionType === 'scroll') {
      newStep.action = {
        type: 'scroll',
        direction: draft.scrollDirection || 'down',
        clicks: draft.scrollAmount || 3,
      };
    }

    setSteps([...steps, newStep]);

    // Reset draft
    setDraft({
      actionType: 'find_and_click',
      element: null,
      timeout: 20,
      delay: 2,
      optional: false,
      description: '',
    });
    selectElement(null);
  }, [draft, steps, selectElement]);

  // Test step
  const handleTestStep = useCallback(async () => {
    if (!selectedSut) return;

    // Build action from draft - using the ActionConfig type from workflowBuilder API
    type TestAction = {
      type: 'click' | 'key' | 'text' | 'right_click' | 'double_click' | 'hotkey' | 'drag' | 'scroll';
      key?: string;
      keys?: string[];
      text?: string;
      duration?: number;
      direction?: 'up' | 'down';
      clicks?: number;
    };

    let action: TestAction = { type: 'click' };

    if (draft.element && ['find_and_click', 'double_click', 'right_click'].includes(draft.actionType)) {
      // For element-based clicks, we'd need to call parseScreenshot first and find the element
      // For now, just execute a click action
      action = { type: 'click' };
    } else if (draft.actionType === 'key' && draft.key) {
      action = { type: 'key', key: draft.key };
    } else if (draft.actionType === 'hotkey' && draft.hotkey) {
      action = { type: 'hotkey', keys: draft.hotkey.split('+').map(k => k.trim()) };
    } else if (draft.actionType === 'text' && draft.text) {
      action = { type: 'text', text: draft.text };
    } else if (draft.actionType === 'scroll') {
      action = { type: 'scroll', direction: draft.scrollDirection || 'down', clicks: draft.scrollAmount || 3 };
    }

    await executeAction(selectedSut.device_id, action as Parameters<typeof executeAction>[1]);
  }, [selectedSut, draft, executeAction]);

  // Generate YAML
  const generateYaml = useCallback(() => {
    const workflow = {
      name: metadata.name || 'Untitled Workflow',
      steam_app_id: metadata.steamAppId,
      process_name: metadata.processName,
      startup_duration: metadata.startupDuration,
      steps: steps.map((step, index) => ({
        ...step,
        step_number: index + 1,
      })),
    };

    return `# ${workflow.name}\n# Generated by Raptor X Workflow Builder\n\n` +
      `name: "${workflow.name}"\n` +
      `steam_app_id: "${workflow.steam_app_id}"\n` +
      `process_name: "${workflow.process_name}"\n` +
      `startup_duration: ${workflow.startup_duration}\n\n` +
      `steps:\n` +
      workflow.steps.map(step => {
        let yaml = `  - step_number: ${step.step_number}\n`;
        yaml += `    description: "${step.description}"\n`;
        yaml += `    action_type: "${step.action_type}"\n`;
        if (step.find) {
          yaml += `    find:\n`;
          yaml += `      type: "${step.find.type}"\n`;
          yaml += `      text: "${step.find.text}"\n`;
          yaml += `      text_match: "${step.find.text_match}"\n`;
        }
        if (step.action) {
          yaml += `    action:\n`;
          Object.entries(step.action).forEach(([key, value]) => {
            yaml += `      ${key}: ${typeof value === 'string' ? `"${value}"` : value}\n`;
          });
        }
        yaml += `    expected_delay: ${step.expected_delay}\n`;
        yaml += `    timeout: ${step.timeout}\n`;
        if (step.optional) yaml += `    optional: true\n`;
        return yaml;
      }).join('\n');
  }, [metadata, steps]);

  // Remove step
  const handleRemoveStep = useCallback((index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  }, [steps]);

  // Move step
  const handleMoveStep = useCallback((index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  }, [steps]);

  return (
    <div className="p-4 min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Workflow Builder</h1>
          <p className="text-sm text-gray-500">
            Build and test game automation workflows visually
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowYaml(!showYaml)}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors"
          >
            {showYaml ? 'Hide YAML' : 'Show YAML'}
          </button>
          <button
            onClick={() => {
              const yaml = generateYaml();
              navigator.clipboard.writeText(yaml);
            }}
            disabled={steps.length === 0}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded transition-colors"
          >
            Copy YAML
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-2 mb-4">
          <span className="text-red-300 text-sm">{error}</span>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* YAML Preview Modal */}
      {showYaml && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <h3 className="text-sm font-medium text-gray-200">Workflow YAML</h3>
              <button
                onClick={() => setShowYaml(false)}
                className="text-gray-500 hover:text-gray-400"
              >
                x
              </button>
            </div>
            <pre className="p-4 overflow-auto text-xs text-gray-300 font-mono max-h-[60vh]">
              {generateYaml()}
            </pre>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Panel - Connection & Steps */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* SUT Selector */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
            <SUTSelector
              devices={devices}
              selectedSut={selectedSut}
              onSelect={setSelectedSut}
            />

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleCapture}
                disabled={!selectedSut || isCapturing}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded transition-colors"
              >
                {isCapturing ? 'Capturing...' : 'Capture'}
              </button>
              <button
                onClick={handleParse}
                disabled={!screenshotUrl || isParsing}
                className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded transition-colors"
              >
                {isParsing ? 'Parsing...' : 'Parse'}
              </button>
            </div>
          </div>

          {/* Game Metadata */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Game Info</h3>
            <MetadataPanel metadata={metadata} onChange={setMetadata} />
          </div>

          {/* Workflow Steps */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">
                Workflow Steps ({steps.length})
              </h3>
              {steps.length > 0 && (
                <button
                  onClick={() => setSteps([])}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Clear All
                </button>
              )}
            </div>
            <StepsList
              steps={steps}
              onRemove={handleRemoveStep}
              onMoveUp={(i) => handleMoveStep(i, 'up')}
              onMoveDown={(i) => handleMoveStep(i, 'down')}
            />
          </div>
        </div>

        {/* Center Panel - Screenshot Canvas */}
        <div className="col-span-12 lg:col-span-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {elements.length > 0 ? `${elements.length} elements detected` : 'No elements'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(25, zoom - 25))}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
              >
                -
              </button>
              <span className="text-xs text-gray-400 w-12 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
              >
                +
              </button>
            </div>
          </div>
          <ScreenshotCanvas
            imageUrl={annotatedImageUrl || screenshotUrl}
            elements={elements}
            selectedElement={selectedElement}
            onElementClick={handleElementClick}
            zoom={zoom}
          />
        </div>

        {/* Right Panel - Step Editor */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Define Action
            </h3>
            <StepEditor
              draft={draft}
              selectedElement={selectedElement}
              onDraftChange={setDraft}
              onAddStep={handleAddStep}
              onTestStep={handleTestStep}
              isExecuting={isExecuting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
