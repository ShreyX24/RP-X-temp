/**
 * ServiceHealthPanel - Compact horizontal strip showing all services status
 * Designed for the top of the dashboard
 */

import type { AllServicesHealth, ServiceHealthStatus } from '../types';

interface ServiceHealthPanelProps {
  services: AllServicesHealth | null;
  loading?: boolean;
}

function StatusDot({ status }: { status: ServiceHealthStatus['status'] }) {
  const colors = {
    online: 'bg-emerald-500',
    offline: 'bg-gray-500',
    error: 'bg-red-500',
    starting: 'bg-amber-500 animate-pulse',
  };

  return (
    <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
  );
}

interface ServiceBadgeProps {
  name: string;
  status: ServiceHealthStatus['status'];
  extra?: string;
}

function ServiceBadge({ name, status, extra }: ServiceBadgeProps) {
  const bgColors = {
    online: 'bg-emerald-900/30 border-emerald-700/50',
    offline: 'bg-gray-800 border-gray-600',
    error: 'bg-red-900/30 border-red-700/50',
    starting: 'bg-amber-900/30 border-amber-700/50',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-md border
        ${bgColors[status]}
        text-xs font-medium
      `}
    >
      <StatusDot status={status} />
      <span className="text-gray-200">{name}</span>
      {extra && (
        <span className="text-gray-400">:{extra}</span>
      )}
    </div>
  );
}

export function ServiceHealthPanel({ services, loading }: ServiceHealthPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg border border-gray-800">
        <span className="text-xs text-gray-500">Loading services...</span>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-20 h-6 bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!services) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg border border-gray-800">
        <span className="text-xs text-gray-500">No service data</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-900/50 rounded-lg border border-gray-800">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide mr-2">
        Services
      </span>

      {/* Core services */}
      <ServiceBadge
        name="Backend"
        status={services.gemmaBackend.status}
      />

      <ServiceBadge
        name="Discovery"
        status={services.discoveryService.status}
      />

      <ServiceBadge
        name="Queue"
        status={services.queueService.status}
        extra={services.queueService.queueDepth !== undefined
          ? String(services.queueService.queueDepth)
          : undefined
        }
      />

      <ServiceBadge
        name="Presets"
        status={services.presetManager.status}
      />

      {/* OmniParser instances */}
      {services.omniparserInstances.map((instance) => (
        <ServiceBadge
          key={instance.name}
          name={instance.displayName}
          status={instance.status}
        />
      ))}
    </div>
  );
}

/**
 * Compact single-line version
 */
export function ServiceHealthBar({ services, loading }: ServiceHealthPanelProps) {
  if (loading || !services) {
    return (
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>Services:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-2 h-2 bg-gray-700 rounded-full animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const allServices = [
    { name: 'B', status: services.gemmaBackend.status, title: 'Gemma Backend' },
    { name: 'D', status: services.discoveryService.status, title: 'Discovery Service' },
    { name: 'Q', status: services.queueService.status, title: 'Queue Service' },
    { name: 'P', status: services.presetManager.status, title: 'Preset Manager' },
    ...services.omniparserInstances.map((i, idx) => ({
      name: `O${idx + 1}`,
      status: i.status,
      title: i.displayName,
    })),
  ];

  const onlineCount = allServices.filter(s => s.status === 'online').length;
  const totalCount = allServices.length;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500">
        {onlineCount}/{totalCount}
      </span>
      <div className="flex items-center gap-1">
        {allServices.map((service, idx) => (
          <span
            key={idx}
            title={`${service.title}: ${service.status}`}
            className="cursor-help"
          >
            <StatusDot status={service.status} />
          </span>
        ))}
      </div>
    </div>
  );
}
