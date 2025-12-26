import { useState, useCallback } from 'react';
import {
  takeScreenshot,
  parseScreenshot,
  sendAction,
  launchGame,
  killProcess,
  getPerformance,
  getInstalledGames,
  testWorkflowStep,
  runWorkflow,
  blobToDataURL,
} from '../api/workflowBuilder';
import type {
  ParsedScreenshot,
  BoundingBox,
  WorkflowStep,
  Workflow,
  ActionResult,
  PerformanceMetrics,
} from '../types';

interface UseWorkflowBuilderResult {
  // Screenshot state
  screenshotUrl: string | null;
  screenshotBlob: Blob | null;
  elements: BoundingBox[];
  annotatedImageUrl: string | null;
  selectedElement: BoundingBox | null;

  // Loading states
  isCapturing: boolean;
  isParsing: boolean;
  isExecuting: boolean;

  // Error state
  error: string | null;

  // Performance
  performance: PerformanceMetrics | null;

  // Installed games
  installedGames: Array<{ name: string; steam_app_id?: string }>;

  // Actions
  captureScreenshot: (sutId: string) => Promise<void>;
  parseCurrentScreenshot: () => Promise<void>;
  selectElement: (element: BoundingBox | null) => void;
  executeAction: (sutId: string, action: Parameters<typeof sendAction>[1]) => Promise<ActionResult>;
  executeStep: (sutId: string, step: WorkflowStep) => Promise<ActionResult>;
  launchGameOnSut: (sutId: string, steamAppId: string, processName?: string) => Promise<ActionResult>;
  killProcessOnSut: (sutId: string, processName: string) => Promise<ActionResult>;
  fetchPerformance: (sutId: string) => Promise<void>;
  fetchInstalledGames: (sutId: string) => Promise<void>;
  runFullWorkflow: (sutIp: string, workflow: Workflow) => Promise<{ run_id: string }>;
  clearScreenshot: () => void;
  clearError: () => void;
}

export function useWorkflowBuilder(): UseWorkflowBuilderResult {
  // Screenshot state
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [elements, setElements] = useState<BoundingBox[]>([]);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<BoundingBox | null>(null);

  // Loading states
  const [isCapturing, setIsCapturing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Performance & games
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [installedGames, setInstalledGames] = useState<Array<{ name: string; steam_app_id?: string }>>([]);

  // Capture screenshot from SUT
  const captureScreenshot = useCallback(async (sutId: string) => {
    setIsCapturing(true);
    setError(null);

    try {
      const blob = await takeScreenshot(sutId);
      const dataUrl = await blobToDataURL(blob);

      setScreenshotBlob(blob);
      setScreenshotUrl(dataUrl);
      setElements([]);
      setAnnotatedImageUrl(null);
      setSelectedElement(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture screenshot');
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // Parse the current screenshot with OmniParser
  const parseCurrentScreenshot = useCallback(async () => {
    if (!screenshotBlob) {
      setError('No screenshot to parse');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const result: ParsedScreenshot = await parseScreenshot(screenshotBlob, true);

      setElements(result.elements);

      if (result.annotated_image_base64) {
        setAnnotatedImageUrl(`data:image/png;base64,${result.annotated_image_base64}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse screenshot');
    } finally {
      setIsParsing(false);
    }
  }, [screenshotBlob]);

  // Select an element from the bounding boxes
  const selectElement = useCallback((element: BoundingBox | null) => {
    setSelectedElement(element);
  }, []);

  // Execute a generic action on SUT
  const executeAction = useCallback(async (
    sutId: string,
    action: Parameters<typeof sendAction>[1]
  ): Promise<ActionResult> => {
    setIsExecuting(true);
    setError(null);

    try {
      const result = await sendAction(sutId, action);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute action';
      setError(errorMessage);
      return { success: false, message: errorMessage, error: errorMessage };
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // Execute a workflow step on SUT
  const executeStep = useCallback(async (
    sutId: string,
    step: WorkflowStep
  ): Promise<ActionResult> => {
    setIsExecuting(true);
    setError(null);

    try {
      const result = await testWorkflowStep(sutId, step);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute step';
      setError(errorMessage);
      return { success: false, message: errorMessage, error: errorMessage };
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // Launch game on SUT
  const launchGameOnSut = useCallback(async (
    sutId: string,
    steamAppId: string,
    processName?: string
  ): Promise<ActionResult> => {
    setIsExecuting(true);
    setError(null);

    try {
      const result = await launchGame(sutId, steamAppId, processName);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to launch game';
      setError(errorMessage);
      return { success: false, message: errorMessage, error: errorMessage };
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // Kill process on SUT
  const killProcessOnSut = useCallback(async (
    sutId: string,
    processName: string
  ): Promise<ActionResult> => {
    setIsExecuting(true);
    setError(null);

    try {
      const result = await killProcess(sutId, processName);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to kill process';
      setError(errorMessage);
      return { success: false, message: errorMessage, error: errorMessage };
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // Fetch performance metrics
  const fetchPerformance = useCallback(async (sutId: string) => {
    try {
      const perf = await getPerformance(sutId);
      setPerformance(perf);
    } catch (err) {
      console.error('Failed to fetch performance:', err);
    }
  }, []);

  // Fetch installed games
  const fetchInstalledGames = useCallback(async (sutId: string) => {
    try {
      const games = await getInstalledGames(sutId);
      setInstalledGames(games);
    } catch (err) {
      console.error('Failed to fetch installed games:', err);
    }
  }, []);

  // Run full workflow
  const runFullWorkflow = useCallback(async (
    sutIp: string,
    workflow: Workflow
  ): Promise<{ run_id: string }> => {
    setIsExecuting(true);
    setError(null);

    try {
      const result = await runWorkflow(sutIp, workflow);
      return { run_id: result.run_id };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run workflow';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // Clear screenshot state
  const clearScreenshot = useCallback(() => {
    setScreenshotUrl(null);
    setScreenshotBlob(null);
    setElements([]);
    setAnnotatedImageUrl(null);
    setSelectedElement(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Screenshot state
    screenshotUrl,
    screenshotBlob,
    elements,
    annotatedImageUrl,
    selectedElement,

    // Loading states
    isCapturing,
    isParsing,
    isExecuting,

    // Error state
    error,

    // Performance & games
    performance,
    installedGames,

    // Actions
    captureScreenshot,
    parseCurrentScreenshot,
    selectElement,
    executeAction,
    executeStep,
    launchGameOnSut,
    killProcessOnSut,
    fetchPerformance,
    fetchInstalledGames,
    runFullWorkflow,
    clearScreenshot,
    clearError,
  };
}
