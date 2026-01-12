import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getQueueStats,
  getQueueJobs,
  getQueueDepth,
  getQueueHealth,
} from '../api/queueService';
import type { QueueStats, QueueJob, QueueDepthPoint, QueueHealth } from '../types';

interface UseQueueStatsResult {
  stats: QueueStats | null;
  jobs: QueueJob[];
  depthHistory: QueueDepthPoint[];
  health: QueueHealth | null;
  loading: boolean;
  error: string | null;
  isAvailable: boolean;
  refetch: () => Promise<void>;
}

export function useQueueStats(pollInterval: number = 2000): UseQueueStatsResult {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [depthHistory, setDepthHistory] = useState<QueueDepthPoint[]>([]);
  const [health, setHealth] = useState<QueueHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const isMounted = useRef(true);

  const fetchAll = useCallback(async () => {
    try {
      // Fetch all data in parallel
      const [statsData, jobsData, depthData, healthData] = await Promise.all([
        getQueueStats().catch(() => null),
        getQueueJobs(20).catch(() => []),
        getQueueDepth(50).catch(() => []),
        getQueueHealth().catch(() => null),
      ]);

      if (!isMounted.current) return;

      if (statsData) {
        setStats(statsData);
        setIsAvailable(true);
        setError(null);
      } else {
        setIsAvailable(false);
        setError('Queue service unavailable');
      }

      setJobs(jobsData);
      setDepthHistory(depthData);
      setHealth(healthData);
    } catch (err) {
      if (!isMounted.current) return;
      setIsAvailable(false);
      setError(err instanceof Error ? err.message : 'Failed to fetch queue stats');
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
    stats,
    jobs,
    depthHistory,
    health,
    loading,
    error,
    isAvailable,
    refetch: fetchAll,
  };
}
