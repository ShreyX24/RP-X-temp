/**
 * Centralized service configuration
 * Service URLs can be configured via environment variables or window.__CONFIG__
 */

interface ServiceConfig {
  rpx: string;
  discovery: string;
  presetManager: string;
  queueService: string;
}

// Check for runtime config (injected by server or env)
declare global {
  interface Window {
    __CONFIG__?: Partial<ServiceConfig>;
  }
}

// Default service URLs (development)
const defaults: ServiceConfig = {
  rpx: 'http://localhost:5000',
  discovery: 'http://localhost:5001',
  presetManager: 'http://localhost:5002',
  queueService: 'http://localhost:9000',
};

// Build service config from environment variables and runtime config
export const SERVICES: ServiceConfig = {
  rpx: import.meta.env.VITE_RPX_URL || window.__CONFIG__?.rpx || defaults.rpx,
  discovery: import.meta.env.VITE_DISCOVERY_URL || window.__CONFIG__?.discovery || defaults.discovery,
  presetManager: import.meta.env.VITE_PRESET_MANAGER_URL || window.__CONFIG__?.presetManager || defaults.presetManager,
  queueService: import.meta.env.VITE_QUEUE_SERVICE_URL || window.__CONFIG__?.queueService || defaults.queueService,
};

// API endpoints derived from service URLs
export const API = {
  // Raptor X Backend
  rpx: {
    base: SERVICES.rpx,
    health: `${SERVICES.rpx}/api/health`,
    status: `${SERVICES.rpx}/api/status`,
    devices: `${SERVICES.rpx}/api/devices`,
    games: `${SERVICES.rpx}/api/games`,
    runs: `${SERVICES.rpx}/api/runs`,
    sut: (id: string) => `${SERVICES.rpx}/api/sut/${id}`,
  },
  // Discovery Service
  discovery: {
    base: SERVICES.discovery,
    health: `${SERVICES.discovery}/health`,
    suts: `${SERVICES.discovery}/api/suts`,
    events: `${SERVICES.discovery}/api/suts/events`,
    status: `${SERVICES.discovery}/api/discovery/status`,
  },
  // Preset Manager
  presetManager: {
    base: SERVICES.presetManager,
    health: `${SERVICES.presetManager}/health`,
    games: `${SERVICES.presetManager}/api/games`,
    presets: (game: string) => `${SERVICES.presetManager}/api/presets/${game}`,
    sync: `${SERVICES.presetManager}/api/sync`,
  },
  // Queue Service
  queueService: {
    base: SERVICES.queueService,
    health: `${SERVICES.queueService}/health`,
    probe: `${SERVICES.queueService}/probe`,
    stats: `${SERVICES.queueService}/stats`,
    jobs: `${SERVICES.queueService}/jobs`,
    queueDepth: `${SERVICES.queueService}/queue-depth`,
  },
};

// Request timeout configuration
export const TIMEOUTS = {
  default: 10000,      // 10 seconds for most requests
  screenshot: 30000,   // 30 seconds for screenshots
  automation: 60000,   // 60 seconds for automation operations
  health: 5000,        // 5 seconds for health checks
};

// SSE/WebSocket reconnection configuration
export const SSE_CONFIG = {
  maxRetries: 5,
  baseDelay: 1000,     // 1 second initial delay
  maxDelay: 30000,     // 30 seconds max delay
  backoffMultiplier: 2,
};

// Log service configuration in development
if (import.meta.env.DEV) {
  console.log('[Config] Service URLs:', SERVICES);
}
