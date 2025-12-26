/**
 * Settings - Service configuration and system settings
 */

import { useState } from 'react';
import { useServiceHealth } from '../hooks';
import { StatusDot } from '../components';

// Setting input component
function SettingInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'url';
  disabled?: boolean;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm text-gray-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

// Settings section component
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-200">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// OmniParser server config
interface OmniParserConfig {
  name: string;
  url: string;
  enabled: boolean;
}

function OmniParserServerRow({
  config,
  onChange,
  onRemove,
  onTest,
  status,
  canRemove,
}: {
  config: OmniParserConfig;
  onChange: (config: OmniParserConfig) => void;
  onRemove: () => void;
  onTest: () => void;
  status?: 'online' | 'offline' | 'testing';
  canRemove: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <input
        type="checkbox"
        checked={config.enabled}
        onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
        className="rounded border-gray-600 bg-gray-700 text-blue-500"
      />
      <div className="flex-1 grid grid-cols-2 gap-2">
        <input
          type="text"
          value={config.name}
          onChange={(e) => onChange({ ...config, name: e.target.value })}
          placeholder="Display Name"
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
        />
        <input
          type="text"
          value={config.url}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          placeholder="http://localhost:8000"
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 font-mono"
        />
      </div>
      <div className="flex items-center gap-2">
        <StatusDot
          status={status === 'online' ? 'online' : status === 'testing' ? 'pending' : 'offline'}
          size="sm"
        />
        <button
          onClick={onTest}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
        >
          Test
        </button>
        {canRemove && (
          <button
            onClick={onRemove}
            className="px-2 py-1 text-red-400 hover:text-red-300 text-xs"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export function Settings() {
  const { services, refetch } = useServiceHealth();

  // Service URLs
  const [serviceUrls, setServiceUrls] = useState({
    gemmaBackend: 'http://localhost:5000',
    discoveryService: 'http://localhost:5001',
    presetManager: 'http://localhost:5002',
    queueService: 'http://localhost:9000',
  });

  // Discovery settings
  const [discoverySettings, setDiscoverySettings] = useState({
    interval: 30,
    timeout: 5,
    networkRange: '',
    manualTargets: '',
  });

  // OmniParser servers
  const [omniparserServers, setOmniparserServers] = useState<OmniParserConfig[]>([
    { name: 'OmniParser 1', url: 'http://localhost:8000', enabled: true },
  ]);
  const [serverStatuses, setServerStatuses] = useState<Record<number, 'online' | 'offline' | 'testing'>>({});

  // Test OmniParser server
  const testServer = async (index: number) => {
    setServerStatuses(prev => ({ ...prev, [index]: 'testing' }));
    try {
      const response = await fetch(`${omniparserServers[index].url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      setServerStatuses(prev => ({ ...prev, [index]: response.ok ? 'online' : 'offline' }));
    } catch {
      setServerStatuses(prev => ({ ...prev, [index]: 'offline' }));
    }
  };

  // Add OmniParser server
  const addServer = () => {
    if (omniparserServers.length >= 5) return;
    setOmniparserServers([
      ...omniparserServers,
      {
        name: `OmniParser ${omniparserServers.length + 1}`,
        url: `http://localhost:${8000 + omniparserServers.length}`,
        enabled: true,
      },
    ]);
  };

  // Remove OmniParser server
  const removeServer = (index: number) => {
    setOmniparserServers(omniparserServers.filter((_, i) => i !== index));
    setServerStatuses(prev => {
      const newStatuses = { ...prev };
      delete newStatuses[index];
      return newStatuses;
    });
  };

  // Update OmniParser server
  const updateServer = (index: number, config: OmniParserConfig) => {
    setOmniparserServers(omniparserServers.map((s, i) => i === index ? config : s));
  };

  // Handle save (in real app, would save to backend)
  const handleSave = async () => {
    // For now, just show a success message
    // In real implementation, this would POST to a settings API
    alert('Settings saved (local only - backend not implemented)');
  };

  return (
    <div className="space-y-4 p-4 min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-gray-500">
            Configure services and system settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors"
          >
            Refresh Status
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          {/* Service Status */}
          <SettingsSection
            title="Service Status"
            description="Current status of all Gemma services"
          >
            <div className="space-y-2">
              {[
                { name: 'Gemma Backend', status: services?.gemmaBackend.status || 'offline', url: serviceUrls.gemmaBackend },
                { name: 'SUT Discovery', status: services?.discoveryService.status || 'offline', url: serviceUrls.discoveryService },
                { name: 'Preset Manager', status: services?.presetManager.status || 'offline', url: serviceUrls.presetManager },
                { name: 'Queue Service', status: services?.queueService.status || 'offline', url: serviceUrls.queueService },
              ].map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={service.status === 'online' ? 'online' : 'offline'} />
                    <span className="text-sm text-gray-200">{service.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{service.url}</span>
                </div>
              ))}
            </div>
          </SettingsSection>

          {/* Service URLs */}
          <SettingsSection
            title="Service URLs"
            description="Configure endpoints for Gemma services"
          >
            <SettingInput
              label="Gemma Backend"
              value={serviceUrls.gemmaBackend}
              onChange={(v) => setServiceUrls({ ...serviceUrls, gemmaBackend: v })}
              placeholder="http://localhost:5000"
              type="url"
            />
            <SettingInput
              label="SUT Discovery Service"
              value={serviceUrls.discoveryService}
              onChange={(v) => setServiceUrls({ ...serviceUrls, discoveryService: v })}
              placeholder="http://localhost:5001"
              type="url"
            />
            <SettingInput
              label="Preset Manager"
              value={serviceUrls.presetManager}
              onChange={(v) => setServiceUrls({ ...serviceUrls, presetManager: v })}
              placeholder="http://localhost:5002"
              type="url"
            />
            <SettingInput
              label="Queue Service"
              value={serviceUrls.queueService}
              onChange={(v) => setServiceUrls({ ...serviceUrls, queueService: v })}
              placeholder="http://localhost:9000"
              type="url"
            />
          </SettingsSection>

          {/* Discovery Settings */}
          <SettingsSection
            title="Discovery Settings"
            description="Configure SUT auto-discovery behavior"
          >
            <div className="grid grid-cols-2 gap-3">
              <SettingInput
                label="Scan Interval (sec)"
                value={String(discoverySettings.interval)}
                onChange={(v) => setDiscoverySettings({ ...discoverySettings, interval: Number(v) })}
                type="number"
                description="Time between discovery scans"
              />
              <SettingInput
                label="Timeout (sec)"
                value={String(discoverySettings.timeout)}
                onChange={(v) => setDiscoverySettings({ ...discoverySettings, timeout: Number(v) })}
                type="number"
                description="Connection timeout per SUT"
              />
            </div>
            <SettingInput
              label="Network Range"
              value={discoverySettings.networkRange}
              onChange={(v) => setDiscoverySettings({ ...discoverySettings, networkRange: v })}
              placeholder="192.168.1.0/24"
              description="CIDR notation for network scanning (optional)"
            />
            <SettingInput
              label="Manual Targets"
              value={discoverySettings.manualTargets}
              onChange={(v) => setDiscoverySettings({ ...discoverySettings, manualTargets: v })}
              placeholder="192.168.1.100, 192.168.1.101"
              description="Comma-separated list of specific IPs to check"
            />
          </SettingsSection>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          {/* OmniParser Servers */}
          <SettingsSection
            title="OmniParser Servers"
            description="Configure OmniParser instances for screen parsing (max 5)"
          >
            <div className="space-y-2">
              {omniparserServers.map((server, index) => (
                <OmniParserServerRow
                  key={index}
                  config={server}
                  onChange={(config) => updateServer(index, config)}
                  onRemove={() => removeServer(index)}
                  onTest={() => testServer(index)}
                  status={serverStatuses[index]}
                  canRemove={omniparserServers.length > 1}
                />
              ))}
            </div>
            {omniparserServers.length < 5 && (
              <button
                onClick={addServer}
                className="w-full py-2 border-2 border-dashed border-gray-700 hover:border-gray-600 text-gray-500 hover:text-gray-400 text-sm rounded-lg transition-colors"
              >
                + Add OmniParser Server
              </button>
            )}
          </SettingsSection>

          {/* System Info */}
          <SettingsSection
            title="System Information"
            description="Current system and service versions"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                <span className="text-sm text-gray-400">Frontend Version</span>
                <span className="text-sm text-gray-200 font-mono">1.0.0-dev</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                <span className="text-sm text-gray-400">Backend Version</span>
                <span className="text-sm text-gray-200 font-mono">
                  {services?.gemmaBackend.status === 'online' ? '1.0.0' : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                <span className="text-sm text-gray-400">Queue Service</span>
                <span className="text-sm text-gray-200 font-mono">
                  {services?.queueService.status === 'online' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                <span className="text-sm text-gray-400">Online SUTs</span>
                <span className="text-sm text-gray-200 font-mono">
                  {services?.discoveryService.onlineSuts ?? 0}
                </span>
              </div>
            </div>
          </SettingsSection>

          {/* Quick Actions */}
          <SettingsSection
            title="Quick Actions"
            description="System maintenance actions"
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fetch('/api/discovery/scan', { method: 'POST' })}
                className="py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors"
              >
                Force SUT Scan
              </button>
              <button
                onClick={() => fetch('/api/games/reload', { method: 'POST' })}
                className="py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors"
              >
                Reload Games
              </button>
              <button
                onClick={() => fetch('/api/presets/scan', { method: 'POST' })}
                className="py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors"
              >
                Scan Presets
              </button>
              <button
                onClick={() => refetch()}
                className="py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors"
              >
                Refresh All
              </button>
            </div>
          </SettingsSection>

          {/* Danger Zone */}
          <SettingsSection
            title="Danger Zone"
            description="Destructive actions - use with caution"
          >
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (confirm('Stop all active automation runs?')) {
                    fetch('/api/runs/stop-all', { method: 'POST' });
                  }
                }}
                className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-red-400 text-sm font-medium rounded transition-colors"
              >
                Stop All Runs
              </button>
              <button
                onClick={() => {
                  if (confirm('Clear all queue jobs?')) {
                    fetch('/api/queue/clear', { method: 'POST' });
                  }
                }}
                className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-red-400 text-sm font-medium rounded transition-colors"
              >
                Clear Queue
              </button>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
