import { lazy, type ComponentType } from "react";

type DashboardComponent = ComponentType<{ slug: string }>;

const registry: Record<string, () => Promise<{ default: DashboardComponent }>> = {
  "season-overview": () => import("@/components/dashboards/season-overview"),
  "post-match": () => import("@/components/dashboards/post-match"),
  "shot-map": () => import("@/components/dashboards/shot-map"),
  "heat-maps": () => import("@/components/dashboards/heat-maps"),
  "event-map": () => import("@/components/dashboards/event-map"),
  "player-analysis": () => import("@/components/dashboards/player-analysis"),
  "set-pieces": () => import("@/components/dashboards/set-pieces"),
  "opposition-analysis": () => import("@/components/dashboards/opposition-analysis"),
  "team-trends": () => import("@/components/dashboards/team-trends"),
  "referee-analysis": () => import("@/components/dashboards/referee-analysis"),
  "view-possessions": () => import("@/components/dashboards/view-possessions"),
  "post-match-set-pieces": () => import("@/components/dashboards/post-match-set-pieces"),
  "medical-overview": () => import("@/components/dashboards/medical-overview"),
};

/** Cache lazy-wrapped components so React doesn't remount on every render. */
const lazyCache = new Map<string, ComponentType<{ slug: string }>>();

export function getDashboardComponent(slug: string): ComponentType<{ slug: string }> | null {
  const loader = registry[slug];
  if (!loader) return null;

  const cached = lazyCache.get(slug);
  if (cached) return cached;

  const component = lazy(loader);
  lazyCache.set(slug, component);
  return component;
}
