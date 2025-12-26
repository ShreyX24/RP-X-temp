import { useState, useEffect, useCallback, useRef } from 'react';
import { getSystemStatus } from '../api';
import { getQueueHealth } from '../api/queueService';
import { getSyncStats } from '../api/presetManager';
import type { AllServicesHealth, ServiceHealthStatus } from '../types';

interface UseServiceHealthResult {
  services: AllServicesHealth | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DISCOVERY_SERVICE_URL = 'http://localhost:5001';
const QUEUE_SERVICE_URL = 'http://localhost:9000';
const PRESET_MANAGER_URL = 'http://localhost:5002';

async function checkServiceHealth(
  name: string,
  displayName: string,
  url: string,
  port: number,
  healthEndpoint: string = '/health'
): Promise<ServiceHealthStatus> {
  try {
    const response = await fetch(`${url}${healthEndpoint}`, {
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        name,
        displayName,
        status: 'online',
        url,
        port,
        details: data,
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      name,
      displayName,
      status: 'error',
      url,
      port,
      lastChecked: new Date().toISOString(),
    };
  } catch {
    return {
      name,
      displayName,
      status: 'offline',
      url,
      port,
      lastChecked: new Date().toISOString(),
    };
  }
}

export function useServiceHealth(pollInterval: number = 5000): UseServiceHealthResult {
  const [services, setServices] = useState<AllServicesHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchAll = useCallback(async () => {
    try {
      // Check all services in parallel
      const [
        gemmaBackendStatus,
        discoveryStatus,
        queueStatus,
        presetStatus,
      ] = await Promise.all([
        // Gemma Backend
        getSystemStatus()
          .then((data) => ({
            name: 'gemma-backend',
            displayName: 'Gemma Backend',
            status: 'online' as const,
            url: '/api',
            port: 5000,
            details: {
              mode: data.backend.mode,
              uptime: data.backend.uptime,
              websocket_clients: data.backend.websocket_clients,
            },
            lastChecked: new Date().toISOString(),
          }))
          .catch(() => ({
            name: 'gemma-backend',
            displayName: 'Gemma Backend',
            status: 'offline' as const,
            url: '/api',
            port: 5000,
            lastChecked: new Date().toISOString(),
          })),

        // Discovery Service
        checkServiceHealth(
          'discovery-service',
          'SUT Discovery',
          DISCOVERY_SERVICE_URL,
          5001,
          '/health'
        ),

        // Queue Service with queue depth
        getQueueHealth()
          .then((health) => ({
            name: 'queue-service',
            displayName: 'Queue Service',
            status: health.status === 'healthy' ? 'online' as const : 'error' as const,
            url: QUEUE_SERVICE_URL,
            port: 9000,
            queueDepth: health.queue_size,
            details: {
              worker_running: health.worker_running,
              uptime: health.uptime_seconds,
              omniparser: health.omniparser_status,
            },
            lastChecked: new Date().toISOString(),
          }))
          .catch(() => ({
            name: 'queue-service',
            displayName: 'Queue Service',
            status: 'offline' as const,
            url: QUEUE_SERVICE_URL,
            port: 9000,
            queueDepth: undefined,
            lastChecked: new Date().toISOString(),
          })),

        // Preset Manager
        getSyncStats()
          .then((stats) => ({
            name: 'preset-manager',
            displayName: 'Preset Manager',
            status: stats.sync_manager_ready ? 'online' as const : 'error' as const,
            url: PRESET_MANAGER_URL,
            port: 5002,
            details: {
              total_games: stats.total_games,
              total_presets: stats.total_presets,
              online_suts: stats.online_suts,
            },
            lastChecked: new Date().toISOString(),
          }))
          .catch(() => ({
            name: 'preset-manager',
            displayName: 'Preset Manager',
            status: 'offline' as const,
            url: PRESET_MANAGER_URL,
            port: 5002,
            lastChecked: new Date().toISOString(),
          })),
      ]);

      if (!isMounted.current) return;

      // Check OmniParser instances (we'll check the primary one via system status)
      let omniparserInstances: Array<ServiceHealthStatus & { instanceId: number; enabled: boolean }> = [];

      try {
        const systemStatus = await getSystemStatus();
        if (systemStatus.omniparser) {
          omniparserInstances = [{
            name: 'omniparser-0',
            displayName: 'OmniParser 1',
            instanceId: 0,
            enabled: true,
            status: systemStatus.omniparser.status === 'online' ? 'online' : 'offline',
            url: systemStatus.omniparser.url,
            port: 8000,
            details: {
              queue_size: systemStatus.omniparser.queue_size,
            },
            lastChecked: new Date().toISOString(),
          }];
        }
      } catch {
        // OmniParser check failed, leave empty
      }

      setServices({
        gemmaBackend: gemmaBackendStatus,
        discoveryService: discoveryStatus,
        queueService: queueStatus,
        presetManager: presetStatus,
        omniparserInstances,
      });

      setError(null);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : 'Failed to check service health');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchAll();

    const interval = setInterval(fetchAll, pollInterval);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchAll, pollInterval]);

  return {
    services,
    loading,
    error,
    refetch: fetchAll,
  };
}
