/**
 * Service Flow Diagram - Visualizes service-to-service communication
 *
 * Uses React Flow to show:
 * - RPX Backend as central node
 * - Connected services (SUT, OmniParser, Queue, Presets)
 * - Animated edges showing request/response flow
 * - Highlights active service during playback
 */

import { useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Position,
  MarkerType,
  Background,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ServiceCall, TimelineEvent } from '../../api';

interface ServiceFlowDiagramProps {
  serviceCalls: ServiceCall[];
  currentEvent: TimelineEvent | null;
}

// Custom node styles
const nodeDefaults = {
  style: {
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid',
    minWidth: '80px',
    textAlign: 'center' as const,
  },
};

// Service colors
const serviceColors: Record<string, { bg: string; border: string; text: string }> = {
  rpx_backend: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' },
  sut: { bg: '#1e3f1e', border: '#22c55e', text: '#86efac' },
  omniparser: { bg: '#3f1e3f', border: '#a855f7', text: '#d8b4fe' },
  queue_service: { bg: '#3f3f1e', border: '#eab308', text: '#fef08a' },
  preset_manager: { bg: '#1e3f3f', border: '#14b8a6', text: '#5eead4' },
};

function getServiceColor(serviceName: string): { bg: string; border: string; text: string } {
  const lower = serviceName.toLowerCase();
  if (lower.includes('sut')) return serviceColors.sut;
  if (lower.includes('omniparser') || lower.includes('queue')) return serviceColors.omniparser;
  if (lower.includes('preset')) return serviceColors.preset_manager;
  if (lower.includes('rpx') || lower.includes('backend')) return serviceColors.rpx_backend;
  return serviceColors.queue_service;
}

function getServiceDisplayName(serviceName: string): string {
  const lower = serviceName.toLowerCase();
  if (lower.includes('sut')) return 'SUT';
  if (lower.includes('omniparser')) return 'OmniParser';
  if (lower.includes('queue')) return 'Queue';
  if (lower.includes('preset')) return 'Presets';
  if (lower.includes('rpx') || lower.includes('backend')) return 'RPX';
  return serviceName;
}

export function ServiceFlowDiagram({ serviceCalls, currentEvent }: ServiceFlowDiagramProps) {
  // Build nodes and edges from service calls
  const { nodes, edges } = useMemo(() => {
    const serviceSet = new Set<string>();
    serviceSet.add('rpx_backend'); // Always include backend

    // Collect unique services
    serviceCalls.forEach(call => {
      if (call.source) serviceSet.add(call.source);
      if (call.target) serviceSet.add(call.target);
    });

    // Create nodes in a star pattern around RPX
    const serviceList = Array.from(serviceSet);
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Position nodes
    const centerX = 100;
    const centerY = 150;
    const radius = 100;

    serviceList.forEach((service, index) => {
      const isCenter = service === 'rpx_backend';
      const angle = isCenter ? 0 : ((index - 1) / (serviceList.length - 1)) * Math.PI * 1.5 - Math.PI * 0.25;
      const x = isCenter ? centerX : centerX + Math.cos(angle) * radius;
      const y = isCenter ? centerY : centerY + Math.sin(angle) * radius;

      const colors = getServiceColor(service);
      const isActive = currentEvent?.metadata?.source_service === service ||
                       currentEvent?.metadata?.target_service === service;

      nodes.push({
        id: service,
        position: { x, y },
        data: { label: getServiceDisplayName(service) },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          ...nodeDefaults.style,
          backgroundColor: colors.bg,
          borderColor: isActive ? '#fff' : colors.border,
          color: colors.text,
          boxShadow: isActive ? '0 0 12px rgba(255,255,255,0.3)' : 'none',
          transition: 'all 0.3s ease',
        },
      });
    });

    // Create edges from service calls
    const edgeCounts = new Map<string, number>();
    serviceCalls.forEach(call => {
      if (!call.source || !call.target) return;
      const edgeKey = `${call.source}-${call.target}`;
      edgeCounts.set(edgeKey, (edgeCounts.get(edgeKey) || 0) + 1);
    });

    edgeCounts.forEach((count, edgeKey) => {
      const [source, target] = edgeKey.split('-');
      const isActive = currentEvent?.metadata?.source_service === source &&
                       currentEvent?.metadata?.target_service === target;

      edges.push({
        id: edgeKey,
        source,
        target,
        animated: isActive,
        style: {
          stroke: isActive ? '#60a5fa' : '#4b5563',
          strokeWidth: isActive ? 2 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isActive ? '#60a5fa' : '#4b5563',
        },
        label: count > 1 ? `${count}` : undefined,
        labelStyle: { fontSize: 10, fill: '#9ca3af' },
        labelBgStyle: { fill: '#1f2937' },
      });
    });

    return { nodes, edges };
  }, [serviceCalls, currentEvent]);

  // Show placeholder if no service calls
  if (serviceCalls.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-muted p-4">
        <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <p className="text-sm text-center">No service calls tracked</p>
        <p className="text-xs text-text-tertiary mt-1">Run again to capture flow</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full" style={{ minHeight: '300px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#374151" />
      </ReactFlow>
    </div>
  );
}

export default ServiceFlowDiagram;
