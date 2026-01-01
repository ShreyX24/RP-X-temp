import { useState, useEffect, useCallback } from 'react';
import { getCampaigns, stopCampaign } from '../api';
import type { Campaign } from '../types';

export function useCampaigns(pollInterval: number = 3000) {
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [historyCampaigns, setHistoryCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await getCampaigns();
      setActiveCampaigns(data.active || []);
      setHistoryCampaigns(data.history || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, pollInterval);
    return () => clearInterval(interval);
  }, [fetchCampaigns, pollInterval]);

  const stop = useCallback(async (campaignId: string) => {
    try {
      await stopCampaign(campaignId);
      await fetchCampaigns();
    } catch (err) {
      throw err;
    }
  }, [fetchCampaigns]);

  const hasActiveCampaigns = activeCampaigns.length > 0;

  return {
    activeCampaigns,
    historyCampaigns,
    hasActiveCampaigns,
    loading,
    error,
    refetch: fetchCampaigns,
    stop,
  };
}
