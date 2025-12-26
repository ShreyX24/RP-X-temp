import { useState, useEffect } from 'react';
import { useGames, useDevices } from '../hooks';
import { GameCard } from '../components';
import { startRun } from '../api';
import { getSutInstalledGames, type InstalledGameInfo, type SutInstalledGamesResponse } from '../api/presetManager';
import type { GameConfig } from '../types';

export function Games() {
  const { gamesList, loading, reload } = useGames();
  const { onlineDevices } = useDevices();
  const [reloading, setReloading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameConfig | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);

  // SUT selection for installed games view
  const [selectedSutIp, setSelectedSutIp] = useState<string>('');
  const [installedGames, setInstalledGames] = useState<SutInstalledGamesResponse | null>(null);
  const [loadingInstalled, setLoadingInstalled] = useState(false);
  const [viewMode, setViewMode] = useState<'configs' | 'installed'>('configs');

  const handleReload = async () => {
    setReloading(true);
    try {
      await reload();
    } catch (error) {
      console.error('Reload failed:', error);
    } finally {
      setReloading(false);
    }
  };

  const handleRunGame = (gameName: string) => {
    const game = gamesList.find(g => g.name === gameName);
    if (game) {
      setSelectedGame(game);
      setShowRunModal(true);
    }
  };

  // Fetch installed games when SUT is selected
  useEffect(() => {
    if (!selectedSutIp) {
      setInstalledGames(null);
      return;
    }

    const fetchInstalledGames = async () => {
      setLoadingInstalled(true);
      try {
        const result = await getSutInstalledGames(selectedSutIp);
        setInstalledGames(result);
      } catch (error) {
        console.error('Failed to fetch installed games:', error);
        setInstalledGames(null);
      } finally {
        setLoadingInstalled(false);
      }
    };

    fetchInstalledGames();
  }, [selectedSutIp]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Games</h1>
          <p className="text-gray-500">Configure and run game automation</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('configs')}
              className={`px-3 py-1.5 text-sm font-medium ${
                viewMode === 'configs'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Configs ({gamesList.length})
            </button>
            <button
              onClick={() => setViewMode('installed')}
              className={`px-3 py-1.5 text-sm font-medium ${
                viewMode === 'installed'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Installed on SUT
            </button>
          </div>
          <button
            onClick={handleReload}
            disabled={reloading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:bg-gray-50"
          >
            {reloading ? 'Reloading...' : 'Reload Configs'}
          </button>
        </div>
      </div>

      {/* SUT Selector (shown in installed view) */}
      {viewMode === 'installed' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select SUT to view installed games
              </label>
              <select
                value={selectedSutIp}
                onChange={(e) => setSelectedSutIp(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">Choose a SUT...</option>
                {onlineDevices.map((device) => (
                  <option key={device.device_id} value={device.ip}>
                    {device.hostname || device.ip} ({device.ip})
                  </option>
                ))}
              </select>
            </div>
            {installedGames && (
              <div className="flex gap-4 text-sm">
                <div className="px-3 py-2 bg-gray-100 rounded-lg">
                  <span className="text-gray-500">Total:</span>{' '}
                  <span className="font-semibold">{installedGames.games_count}</span>
                </div>
                <div className="px-3 py-2 bg-green-100 rounded-lg">
                  <span className="text-green-700">With Presets:</span>{' '}
                  <span className="font-semibold text-green-700">{installedGames.games_with_presets}</span>
                </div>
                {installedGames.libraries_scanned && (
                  <div className="px-3 py-2 bg-blue-100 rounded-lg">
                    <span className="text-blue-700">Libraries:</span>{' '}
                    <span className="font-semibold text-blue-700">{installedGames.libraries_scanned}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === 'configs' ? (
        // Game Configs View
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : gamesList.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No games configured</p>
            <p className="text-sm text-gray-400 mt-2">
              Add game configurations to the config directory
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gamesList.map((game) => (
              <GameCard
                key={game.name}
                game={game}
                onSelect={setSelectedGame}
                onRun={handleRunGame}
                isSelected={selectedGame?.name === game.name}
                disabled={onlineDevices.length === 0}
              />
            ))}
          </div>
        )
      ) : (
        // Installed Games View
        !selectedSutIp ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <p className="mt-4 text-gray-500">Select a SUT to view installed games</p>
            <p className="text-sm text-gray-400 mt-2">
              Games will be enriched with preset availability information
            </p>
          </div>
        ) : loadingInstalled ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : installedGames?.error ? (
          <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-700">{installedGames.error}</p>
          </div>
        ) : installedGames?.games.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No games installed on this SUT</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {installedGames?.games.map((game) => (
              <InstalledGameCard
                key={game.steam_app_id || game.name}
                game={game}
                sutIp={selectedSutIp}
                onRun={(presetShortName) => {
                  // Find matching game config and open run modal
                  const config = gamesList.find(g =>
                    g.name.toLowerCase().includes(presetShortName.toLowerCase().replace(/-/g, ' ')) ||
                    presetShortName.toLowerCase().includes(g.name.toLowerCase().replace(/ /g, '-'))
                  );
                  if (config) {
                    setSelectedGame(config);
                    setShowRunModal(true);
                  }
                }}
              />
            ))}
          </div>
        )
      )}

      {/* Run Modal */}
      {showRunModal && selectedGame && (
        <RunGameModal
          game={selectedGame}
          devices={onlineDevices}
          preSelectedSut={selectedSutIp}
          onClose={() => {
            setShowRunModal(false);
            setSelectedGame(null);
          }}
        />
      )}
    </div>
  );
}

// Component for displaying installed games with rich info
interface InstalledGameCardProps {
  game: InstalledGameInfo;
  sutIp: string;
  onRun: (presetShortName: string) => void;
}

function InstalledGameCard({ game, sutIp, onRun }: InstalledGameCardProps) {
  return (
    <div className={`bg-white rounded-lg border p-4 ${
      game.has_presets ? 'border-green-300 ring-1 ring-green-100' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate" title={game.name}>
            {game.name}
          </h3>
          {game.steam_app_id && (
            <p className="text-xs text-gray-500">
              Steam App ID: {game.steam_app_id}
            </p>
          )}
        </div>
        {game.has_presets ? (
          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            Presets
          </span>
        ) : (
          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
            No Presets
          </span>
        )}
      </div>

      {/* Install Path */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 truncate" title={game.install_path || undefined}>
          {game.install_path || 'Path unknown'}
        </p>
      </div>

      {/* Preset Info */}
      {game.has_presets && (
        <div className="mb-3 p-2 bg-green-50 rounded-lg">
          <p className="text-xs font-medium text-green-700 mb-1">
            Matched via: {game.matched_by}
          </p>
          <p className="text-xs text-green-600">
            Preset: {game.preset_short_name}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {game.available_preset_levels.map((level) => (
              <span key={level} className="px-1.5 py-0.5 text-xs bg-green-200 text-green-800 rounded">
                {level}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {game.has_presets && game.preset_short_name && (
        <button
          onClick={() => onRun(game.preset_short_name!)}
          className="w-full px-3 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600"
        >
          Run Automation
        </button>
      )}
    </div>
  );
}

interface RunGameModalProps {
  game: GameConfig;
  devices: Array<{ device_id: string; ip: string; hostname: string }>;
  preSelectedSut?: string;
  onClose: () => void;
}

function RunGameModal({ game, devices, preSelectedSut, onClose }: RunGameModalProps) {
  const [selectedDevice, setSelectedDevice] = useState(preSelectedSut || '');
  const [iterations, setIterations] = useState(1);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installedInfo, setInstalledInfo] = useState<InstalledGameInfo | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Check game availability when device is selected
  useEffect(() => {
    if (!selectedDevice) {
      setInstalledInfo(null);
      return;
    }

    const checkAvailability = async () => {
      setCheckingAvailability(true);
      setError(null);
      try {
        const result = await getSutInstalledGames(selectedDevice);
        if (!result.online) {
          setError('SUT is offline');
          setInstalledInfo(null);
          return;
        }

        // Find the game in installed games list
        const gameNameLower = game.name.toLowerCase();
        const found = result.games.find(g =>
          g.name.toLowerCase().includes(gameNameLower) ||
          gameNameLower.includes(g.name.toLowerCase()) ||
          (g.preset_short_name && gameNameLower.includes(g.preset_short_name.replace(/-/g, ' ')))
        );

        if (found) {
          setInstalledInfo(found);
          if (!found.has_presets) {
            setError('Game is installed but no presets available');
          }
        } else {
          setError('Game not installed on this SUT');
          setInstalledInfo(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check availability');
        setInstalledInfo(null);
      } finally {
        setCheckingAvailability(false);
      }
    };

    checkAvailability();
  }, [selectedDevice, game.name]);

  const handleStart = async () => {
    if (!selectedDevice || !installedInfo?.has_presets) return;

    setStarting(true);
    setError(null);

    try {
      await startRun(selectedDevice, game.name, iterations);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start run');
    } finally {
      setStarting(false);
    }
  };

  const canStart = selectedDevice && installedInfo && installedInfo.has_presets && !starting && !checkingAvailability;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Run {game.display_name || game.name}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select SUT
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Choose a device...</option>
              {devices.map((device) => (
                <option key={device.device_id} value={device.ip}>
                  {device.hostname || device.ip}
                </option>
              ))}
            </select>
          </div>

          {/* Game Info from SUT */}
          {selectedDevice && (
            <div className={`p-4 rounded-lg text-sm ${
              checkingAvailability
                ? 'bg-gray-50'
                : installedInfo?.has_presets
                ? 'bg-green-50 border border-green-200'
                : installedInfo
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {checkingAvailability ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Checking game availability...
                </div>
              ) : installedInfo ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {installedInfo.has_presets ? (
                      <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                    <span className={`font-medium ${installedInfo.has_presets ? 'text-green-700' : 'text-yellow-700'}`}>
                      {installedInfo.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Steam App ID:</span>{' '}
                      <span className="font-mono">{installedInfo.steam_app_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Matched via:</span>{' '}
                      <span>{installedInfo.matched_by || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="text-xs">
                    <span className="text-gray-500">Install path:</span>
                    <p className="font-mono truncate" title={installedInfo.install_path || undefined}>
                      {installedInfo.install_path || 'Unknown'}
                    </p>
                  </div>

                  {installedInfo.has_presets && (
                    <div className="pt-2 border-t border-green-200">
                      <span className="text-xs text-green-600 font-medium">Available Presets:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {installedInfo.available_preset_levels.map((level) => (
                          <span key={level} className="px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded">
                            {level}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Game not installed on this SUT
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Iterations
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={iterations}
              onChange={(e) => setIterations(parseInt(e.target.value) || 1)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              disabled={!canStart}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {starting ? 'Starting...' : checkingAvailability ? 'Checking...' : 'Start Automation'}
          </button>
        </div>
      </div>
    </div>
  );
}
