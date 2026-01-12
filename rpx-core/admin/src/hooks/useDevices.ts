import { useState, useEffect, useCallback, useRef } from 'react';
import { getDevices, pairSut, unpairSut } from '../api';
import { API, SSE_CONFIG } from '../config';
import type { SUT } from '../types';

export function useDevices(pollInterval: number = 10000) {
  const [devices, setDevices] = useState<SUT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const fetchDevices = useCallback(async () => {
    try {
      const data = await getDevices();
      if (isMountedRef.current) {
        // Deduplicate devices by device_id (keep latest occurrence)
        const deviceMap = new Map<string, SUT>();
        for (const device of data.devices) {
          // Use device_id as unique key, or fallback to ip:port
          const key = device.device_id || `${device.ip}:${device.port}`;
          deviceMap.set(key, device);
        }
        setDevices(Array.from(deviceMap.values()));
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch devices');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Connect to SSE for real-time updates with exponential backoff
  useEffect(() => {
    isMountedRef.current = true;

    const getRetryDelay = () => {
      const delay = Math.min(
        SSE_CONFIG.baseDelay * Math.pow(SSE_CONFIG.backoffMultiplier, retryCountRef.current),
        SSE_CONFIG.maxDelay
      );
      return delay;
    };

    const connectSSE = () => {
      if (!isMountedRef.current) return;

      // Clear any pending retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      try {
        const eventSource = new EventSource(API.discovery.events);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          if (!isMountedRef.current) {
            eventSource.close();
            return;
          }
          console.log('[SSE] Connected to Discovery Service');
          setSseConnected(true);
          retryCountRef.current = 0; // Reset retry count on successful connection
        };

        eventSource.onmessage = (event) => {
          if (!isMountedRef.current) return;

          try {
            const data = JSON.parse(event.data);
            console.log('[SSE] Event:', data.type);

            if (data.type === 'sut_online' || data.type === 'sut_offline') {
              fetchDevices();
            }
          } catch (e) {
            console.error('[SSE] Parse error:', e);
          }
        };

        eventSource.onerror = () => {
          if (!isMountedRef.current) {
            eventSource.close();
            return;
          }

          console.log('[SSE] Connection error');
          setSseConnected(false);
          eventSource.close();
          eventSourceRef.current = null;

          // Check retry limit
          if (retryCountRef.current >= SSE_CONFIG.maxRetries) {
            console.log('[SSE] Max retries reached, falling back to polling only');
            setError('Real-time updates unavailable - using polling');
            return;
          }

          // Schedule retry with exponential backoff
          const delay = getRetryDelay();
          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${retryCountRef.current + 1}/${SSE_CONFIG.maxRetries})`);
          retryCountRef.current++;

          retryTimeoutRef.current = setTimeout(connectSSE, delay);
        };
      } catch (e) {
        console.error('[SSE] Failed to connect:', e);

        if (isMountedRef.current && retryCountRef.current < SSE_CONFIG.maxRetries) {
          const delay = getRetryDelay();
          retryCountRef.current++;
          retryTimeoutRef.current = setTimeout(connectSSE, delay);
        }
      }
    };

    // Initial fetch
    fetchDevices();

    // Connect to SSE
    connectSSE();

    // Fallback polling (slower since we have SSE)
    const interval = setInterval(fetchDevices, pollInterval);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [fetchDevices, pollInterval]);

  const pair = useCallback(async (deviceId: string) => {
    try {
      await pairSut(deviceId);
      await fetchDevices();
    } catch (err) {
      throw err;
    }
  }, [fetchDevices]);

  const unpair = useCallback(async (deviceId: string) => {
    try {
      await unpairSut(deviceId);
      await fetchDevices();
    } catch (err) {
      throw err;
    }
  }, [fetchDevices]);

  const onlineDevices = devices.filter(d => d.status === 'online');
  const pairedDevices = devices.filter(d => d.is_paired);

  return {
    devices,
    onlineDevices,
    pairedDevices,
    loading,
    error,
    sseConnected,
    refetch: fetchDevices,
    pair,
    unpair,
  };
}
