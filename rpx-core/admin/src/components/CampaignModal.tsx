import { useState } from 'react';
import { createCampaign } from '../api';
import type { SUT } from '../types';

// Quality and resolution presets
const QUALITY_LEVELS = ['low', 'medium', 'high', 'ultra'] as const;
const RESOLUTIONS = ['720p', '1080p', '1440p', '2160p'] as const;

type QualityLevel = typeof QUALITY_LEVELS[number];
type Resolution = typeof RESOLUTIONS[number];

interface CampaignModalProps {
  selectedGames: string[];
  devices: SUT[];
  onClose: () => void;
  onRemoveGame: (gameName: string) => void;
  onSuccess?: (campaignId: string) => void;
}

export function CampaignModal({ selectedGames, devices, onClose, onRemoveGame, onSuccess }: CampaignModalProps) {
  const [selectedDevice, setSelectedDevice] = useState('');
  const [iterations, setIterations] = useState(1);
  const [campaignName, setCampaignName] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quality/resolution selection
  const [selectedQuality, setSelectedQuality] = useState<QualityLevel>('high');
  const [selectedResolution, setSelectedResolution] = useState<Resolution>('1080p');

  const totalRuns = selectedGames.length * iterations;

  const handleStart = async () => {
    if (!selectedDevice || selectedGames.length === 0) return;

    setStarting(true);
    setError(null);

    try {
      const result = await createCampaign(
        selectedDevice,
        selectedGames,
        iterations,
        campaignName || undefined,
        selectedQuality,
        selectedResolution
      );
      onSuccess?.(result.campaign_id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setStarting(false);
    }
  };

  const canStart = selectedDevice && selectedGames.length > 0 && !starting;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Campaign</h2>
            <p className="text-sm text-gray-500">Run multiple games sequentially</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Selected Games */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Games ({selectedGames.length})
            </label>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {selectedGames.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No games selected. Close this modal and select games.
                </div>
              ) : (
                selectedGames.map((game, index) => (
                  <div key={game} className="flex items-center justify-between p-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-purple-600 w-6">
                        {index + 1}.
                      </span>
                      <span className="text-sm text-gray-900">{game}</span>
                    </div>
                    <button
                      onClick={() => onRemoveGame(game)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Remove from campaign"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SUT Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target SUT
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Choose a device...</option>
              {devices.map((device) => (
                <option key={device.device_id} value={device.ip}>
                  {device.hostname || device.ip} ({device.ip})
                </option>
              ))}
            </select>
            {devices.length === 0 && (
              <p className="mt-1 text-xs text-red-500">No devices online</p>
            )}
          </div>

          {/* Iterations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Iterations per Game
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={iterations}
              onChange={(e) => setIterations(parseInt(e.target.value) || 1)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Each game will run this many benchmark iterations
            </p>
          </div>

          {/* Quality and Resolution */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quality Preset
              </label>
              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value as QualityLevel)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                {QUALITY_LEVELS.map((q) => (
                  <option key={q} value={q}>
                    {q.charAt(0).toUpperCase() + q.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution
              </label>
              <select
                value={selectedResolution}
                onChange={(e) => setSelectedResolution(e.target.value as Resolution)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                {RESOLUTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Campaign Name (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Auto-generated from game names..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Summary */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="text-sm font-medium text-purple-900 mb-2">Campaign Summary</h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-700">{selectedGames.length}</div>
                <div className="text-xs text-purple-600">Games</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-700">{iterations}</div>
                <div className="text-xs text-purple-600">Iterations</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-700">{totalRuns}</div>
                <div className="text-xs text-purple-600">Total Runs</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-700 capitalize">{selectedQuality}</div>
                <div className="text-xs text-purple-600">@ {selectedResolution}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {starting ? 'Starting...' : `Start Campaign (${totalRuns} runs)`}
          </button>
        </div>
      </div>
    </div>
  );
}
