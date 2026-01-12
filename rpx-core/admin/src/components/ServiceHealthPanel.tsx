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
    online: 'bg-success',
    offline: 'bg-text-muted',
    error: 'bg-danger',
    starting: 'bg-warning animate-pulse',
  };

  return (
    <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
  );
}

interface ServiceBadgeProps {
  name: string;
  status: ServiceHealthStatus['status'];
  extra?: string;
  icon?: React.ReactNode;
}

function ServiceBadge({ name, status, extra, icon }: ServiceBadgeProps) {
  const bgColors = {
    online: 'bg-success/10 border-success/30',
    offline: 'bg-surface-elevated border-border',
    error: 'bg-danger/10 border-danger/30',
    starting: 'bg-warning/10 border-warning/30',
  };

  const iconColors = {
    online: 'text-success',
    offline: 'text-text-muted',
    error: 'text-danger',
    starting: 'text-warning',
  };

  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-1.5 w-20 h-16 rounded-lg border
        ${bgColors[status]}
        text-xs font-medium transition-colors
      `}
    >
      {icon && <span className={iconColors[status]}>{icon}</span>}
      <span className="text-text-primary text-center text-[11px] leading-tight">{name}</span>
      {extra && (
        <span className="text-text-muted font-numbers text-[10px] -mt-1">({extra})</span>
      )}
    </div>
  );
}

// Service icons - larger size for vertical layout
const BackendIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const DiscoveryIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const QueueIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const PresetsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
  </svg>
);

const OmniParserIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

export function ServiceHealthPanel({ services, loading }: ServiceHealthPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-3 card">
        <span className="text-xs text-text-muted">Loading services...</span>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-20 h-7 bg-surface-elevated rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!services) {
    return (
      <div className="flex items-center gap-3 p-3 card">
        <span className="text-xs text-text-muted">No service data</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 card">
      <span className="text-xs text-text-muted font-semibold uppercase tracking-wide mr-2">
        Services
      </span>

      {/* Core services */}
      <ServiceBadge
        name="Backend"
        status={services.rpxBackend.status}
        icon={<BackendIcon />}
      />

      <ServiceBadge
        name="Discovery"
        status={services.discoveryService.status}
        icon={<DiscoveryIcon />}
      />

      <ServiceBadge
        name="Queue"
        status={services.queueService.status}
        extra={services.queueService.queueDepth !== undefined
          ? String(services.queueService.queueDepth)
          : undefined
        }
        icon={<QueueIcon />}
      />

      <ServiceBadge
        name="Presets"
        status={services.presetManager.status}
        icon={<PresetsIcon />}
      />

      {/* OmniParser instances */}
      {services.omniparserInstances.map((instance) => (
        <ServiceBadge
          key={instance.name}
          name={instance.displayName}
          status={instance.status}
          icon={<OmniParserIcon />}
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
      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span>Services:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-2 h-2 bg-surface-elevated rounded-full animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const allServices = [
    { name: 'B', status: services.rpxBackend.status, title: 'Raptor X Backend' },
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
      <span className="text-text-muted font-numbers">
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
