# UI Animation Plan - Gemma Admin

> **Status**: Future Enhancement
> **Created**: 2025-12-28
> **Library**: [Motion](https://motion.dev) + [Fancy Components](https://www.fancycomponents.dev)

---

## Overview

Transform Gemma Admin into a polished, animated experience using Motion (formerly Framer Motion) and Fancy Components. This document catalogs animation patterns and their intended use cases.

---

## Animation Categories

### 1. Number & Counter Animations

| Use Case | Resource | Notes |
|----------|----------|-------|
| Metric cards (SUTs, Queue, etc.) | [Count Animation](https://motion.dev/examples/react-html-content?tutorial=true) | Animate numbers on load/update |
| Duration displays | [Number Formatting](https://motion.dev/examples/react-number-formatting) | Format with animations |
| Price/stat switcher | [Price Switcher](https://motion.dev/examples/react-number-price-switcher) | For toggling between metrics |
| Simple counter | [Number Counter](https://motion.dev/examples/react-number-counter) | Basic counting animation |
| Rapid stat changes | [Engagement Stats](https://motion.dev/examples/react-number-engagement-stats) | For live run counts |
| Number ticker | [Basic Number Ticker](https://www.fancycomponents.dev/docs/components/text/basic-number-ticker) | Alternative ticker style |

### 2. Entry/Exit Animations

| Use Case | Resource | Notes |
|----------|----------|-------|
| Component unmounting | [Exit Animation](https://motion.dev/examples/react-exit-animation) | Smooth hide animations |
| Page transitions | [Transition](https://motion.dev/examples/react-transition) | Route change animations |
| Modal/dialog | [Modal Shared Layout](https://motion.dev/examples/react-modal-shared-layout) | For screenshot viewer |
| Staggered lists | [Staggered Grid](https://motion.dev/examples/react-staggered-grid) | SUTs, games, runs lists |
| Theme switching | [Variants](https://motion.dev/examples/react-variants) | Future light/dark toggle |

### 3. Interactive Elements

| Use Case | Resource | Notes |
|----------|----------|-------|
| Drag to reorder | [Drag](https://motion.dev/examples/react-drag) | Reorder games, workflows |
| Hover/tap gestures | [Gestures](https://motion.dev/examples/react-gestures) | Button interactions |
| Bouncing toggle | [Bounce Easing](https://motion.dev/examples/react-bounce-easing) | Toggle switches |
| Hold to confirm | [Hold to Confirm](https://motion.dev/examples/react-hold-to-confirm) | Dangerous actions (stop all) |
| Color picker | [Color Picker](https://motion.dev/examples/react-color-picker) | Theme customization |

### 4. Navigation & Tabs

| Use Case | Resource | Notes |
|----------|----------|-------|
| Tab switching | [Smooth Tabs](https://motion.dev/examples/react-smooth-tabs) | Main navigation |
| Toggle groups | [Base Toggle Group](https://motion.dev/examples/react-base-toggle-group) | Filter toggles |
| Toolbar | [Radix Toolbar](https://motion.dev/examples/react-radix-toolbar) | Action toolbars |

### 5. Loading & Progress

| Use Case | Resource | Notes |
|----------|----------|-------|
| Game running animation | [Motion Path](https://motion.dev/examples/react-motion-path) | Replace squircle with game image |
| Reorder loading | [Reorder Items](https://motion.dev/examples/react-reorder-items) | Random reorder effect |
| Progress bars | [Base Progress](https://motion.dev/examples/react-base-progress) | Run progress, queue depth |

### 6. Scrolling & Lists

| Use Case | Resource | Notes |
|----------|----------|-------|
| Horizontal scroll buttons | [Use Presence Data](https://motion.dev/examples/react-use-presence-data) | Game carousel navigation |
| Scroll-linked logs | [Scroll Linked](https://motion.dev/examples/react-scroll-linked) | Log viewer enhancements |
| Infinite scroll | [Infinite Loading](https://motion.dev/examples/react-infinite-loading) | Run history pagination |

### 7. Dialogs & Notifications

| Use Case | Resource | Notes |
|----------|----------|-------|
| Confirm dialogs | [Family Dialog](https://motion.dev/examples/react-family-dialog) | Delete, stop confirmations |
| Toast notifications | [Base Toast](https://motion.dev/examples/react-base-toast) | Scheduled run alerts |
| Multi-state badge | [Multi-State Badge](https://motion.dev/examples/react-multi-state-badge) | Start automation button |

### 8. Text Effects

| Use Case | Resource | Notes |
|----------|----------|-------|
| Log highlighting | [Text Highlighter](https://www.fancycomponents.dev/docs/components/text/text-highlighter) | Highlight errors in logs |
| Character counter | [Characters Remaining](https://motion.dev/examples/react-characters-remaining) | Input fields |
| Variable font hover | [Variable Font Hover](https://www.fancycomponents.dev/docs/components/text/variable-font-hover-by-random-letter) | Alternative start button |
| Font size settings | [Variable Font Cursor](https://www.fancycomponents.dev/docs/components/text/variable-font-and-cursor) | Accessibility settings |
| Rotating text | [Text Rotate](https://www.fancycomponents.dev/docs/components/text/text-rotate) | Dashboard hero text |

### 9. Layout & Containers

| Use Case | Resource | Notes |
|----------|----------|-------|
| Aspect ratio | [Aspect Ratio](https://motion.dev/examples/react-aspect-ratio) | Screenshot containers |

### 10. Showcase & Marketing

For gaming-dashboard or marketing pages:

| Use Case | Resource | Notes |
|----------|----------|-------|
| Game grid (Apple Watch style) | [Apple Watch Home](https://motion.dev/examples/react-apple-watch-home-screen) | Supported games showcase |
| Parallax floating | [Parallax Floating](https://www.fancycomponents.dev/docs/components/image/parallax-floating) | Game artwork display |
| Marquee scroll | [Simple Marquee](https://www.fancycomponents.dev/docs/components/blocks/simple-marquee) | Game logos carousel |
| Pixel trail | [Pixel Trail](https://www.fancycomponents.dev/docs/components/background/pixel-trail) | Fun background effect |

---

## Implementation Priority

### Phase 1: Core Interactions
1. Number animations for metric cards
2. Entry/exit animations for lists
3. Smooth tab navigation
4. Progress bar animations

### Phase 2: Enhanced UX
1. Hold-to-confirm for dangerous actions
2. Toast notifications
3. Modal animations for screenshot viewer
4. Staggered grid for game/SUT lists

### Phase 3: Polish
1. Scroll-linked log viewer
2. Text highlighting in logs
3. Infinite scroll for history
4. Drag-to-reorder workflows

### Phase 4: Delight
1. Loading animations with game images
2. Theme transition effects
3. Pixel trail backgrounds
4. Variable font effects

---

## Installation

```bash
# Motion (primary animation library)
npm install motion

# For React components
npm install framer-motion

# Fancy Components (copy from website - no npm package)
# Components are copy-paste from https://www.fancycomponents.dev
```

---

## Implemented Animations

### Service Flow Diagram (Story View)

The Service Flow Diagram in the Run Story View uses **React Flow** to visualize real-time service-to-service communication with animated edges.

**Location**: `rpx-core/admin/src/components/story/ServiceFlowDiagram.tsx`

#### How It Works

1. **Service Call Tracking**: The backend tracks HTTP calls via `TimelineManager.service_call_started()` and `service_call_completed()` methods.

2. **Data Flow**:
   ```
   Backend (automation_orchestrator.py)
     ↓ sets timeline on clients
   OmniparserClient / NetworkManager
     ↓ calls timeline.service_call_started()
   TimelineManager
     ↓ adds SERVICE_CALL_STARTED event
   WebSocket → Frontend
     ↓ receives serviceCalls array
   ServiceFlowDiagram
     ↓ renders React Flow graph
   ```

3. **Animated Edges**: React Flow's `animated` property on edges creates the "marching ants" effect:
   ```tsx
   edges.push({
     id: edgeKey,
     source,
     target,
     animated: isActive,  // ← This creates the running arrow animation
     style: {
       stroke: isActive ? '#60a5fa' : '#4b5563',
       strokeWidth: isActive ? 2 : 1,
     },
     markerEnd: {
       type: MarkerType.ArrowClosed,
       color: isActive ? '#60a5fa' : '#4b5563',
     },
   });
   ```

4. **Active Detection**: An edge is "active" when the current timeline event matches:
   ```tsx
   const isActive = currentEvent?.metadata?.source_service === source &&
                    currentEvent?.metadata?.target_service === target;
   ```

#### Node Positioning

Nodes are arranged in a star pattern around the central RPX Backend:
```tsx
const centerX = 100;
const centerY = 150;
const radius = 100;

// Calculate position using angle
const angle = ((index - 1) / (serviceList.length - 1)) * Math.PI * 1.5 - Math.PI * 0.25;
const x = centerX + Math.cos(angle) * radius;
const y = centerY + Math.sin(angle) * radius;
```

#### Service Colors

| Service | Background | Border | Text |
|---------|------------|--------|------|
| RPX Backend | `#1e3a5f` | `#3b82f6` | `#93c5fd` |
| SUT | `#1e3f1e` | `#22c55e` | `#86efac` |
| OmniParser | `#3f1e3f` | `#a855f7` | `#d8b4fe` |
| Queue Service | `#3f3f1e` | `#eab308` | `#fef08a` |
| Preset Manager | `#1e3f3f` | `#14b8a6` | `#5eead4` |

#### Active State Styling

When a node/edge is active:
- Node border changes to white (`#fff`)
- Node gets a glow: `boxShadow: '0 0 12px rgba(255,255,255,0.3)'`
- Edge stroke becomes blue (`#60a5fa`) and thicker (2px)
- Edge arrow becomes animated (CSS marching ants)

#### Backend Integration

To track service calls, the automation orchestrator wires the timeline to HTTP clients:

```python
# In automation_orchestrator.py
network = NetworkManager(device.ip, device.port)
if timeline:
    network.set_timeline(timeline)

vision_model = OmniparserClient(...)
if timeline:
    vision_model.set_timeline(timeline)
```

Each client then tracks calls:
```python
# In omniparser_client.py / network.py
def _track_service_call(self, endpoint: str, method: str = "POST"):
    if not self._timeline:
        return None
    return self._timeline.service_call_started(
        source_service="rpx_backend",
        target_service=f"omniparser_{host}",
        endpoint=endpoint,
        method=method,
        linked_event_id=self._linked_event_id,
    )
```

#### Required Package

```bash
npm install @xyflow/react
```

#### CSS Import

```tsx
import '@xyflow/react/dist/style.css';
```

---

## Notes

- Motion.dev examples are React-focused and work well with our stack
- Fancy Components provides copy-paste code snippets
- Consider performance impact of complex animations
- Test on lower-end hardware before deployment
- Animations should enhance, not distract from functionality
