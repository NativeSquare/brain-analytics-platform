/**
 * Zone definitions for set piece analysis.
 *
 * Zones are defined in StatsBomb coordinates (120x80).
 * The penalty area spans x: 102-120, y: 18-62.
 * The 6-yard box spans x: 114-120, y: 30-50.
 *
 * We define 8 base zones with Left/Right variants = 16 total.
 *
 * SVG mapping (half-pitch, viewBox 0 0 80 60):
 *   svg_x = statsbomb_y       (0-80 -> 0-80)
 *   svg_y = 120 - statsbomb_x (only events with sb_x >= 60 -> svg_y 0-60)
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// ---------- StatsBomb coordinate polygons (4 vertices each) ----------
// Each zone is [{ sbX, sbY }, ...] forming a convex polygon.

interface SbPoint {
  sbX: number;
  sbY: number;
}

interface ZoneDef {
  id: string;
  label: string;
  vertices: SbPoint[];
}

const ZONE_DEFS: ZoneDef[] = [
  // 6-yard box zones (closest to goal)
  {
    id: "6yard-left",
    label: "6yd Left",
    vertices: [
      { sbX: 114, sbY: 30 },
      { sbX: 120, sbY: 30 },
      { sbX: 120, sbY: 40 },
      { sbX: 114, sbY: 40 },
    ],
  },
  {
    id: "6yard-right",
    label: "6yd Right",
    vertices: [
      { sbX: 114, sbY: 40 },
      { sbX: 120, sbY: 40 },
      { sbX: 120, sbY: 50 },
      { sbX: 114, sbY: 50 },
    ],
  },

  // Front of penalty area (between 6-yard and penalty spot line)
  {
    id: "front-left",
    label: "Front Left",
    vertices: [
      { sbX: 108, sbY: 18 },
      { sbX: 114, sbY: 18 },
      { sbX: 114, sbY: 40 },
      { sbX: 108, sbY: 40 },
    ],
  },
  {
    id: "front-right",
    label: "Front Right",
    vertices: [
      { sbX: 108, sbY: 40 },
      { sbX: 114, sbY: 40 },
      { sbX: 114, sbY: 62 },
      { sbX: 108, sbY: 62 },
    ],
  },

  // Back of penalty area (penalty spot area to edge)
  {
    id: "back-left",
    label: "Back Left",
    vertices: [
      { sbX: 102, sbY: 18 },
      { sbX: 108, sbY: 18 },
      { sbX: 108, sbY: 40 },
      { sbX: 102, sbY: 40 },
    ],
  },
  {
    id: "back-right",
    label: "Back Right",
    vertices: [
      { sbX: 102, sbY: 40 },
      { sbX: 108, sbY: 40 },
      { sbX: 108, sbY: 62 },
      { sbX: 102, sbY: 62 },
    ],
  },

  // Extended zones beyond penalty area (wide left / wide right)
  {
    id: "wide-left",
    label: "Wide Left",
    vertices: [
      { sbX: 102, sbY: 0 },
      { sbX: 120, sbY: 0 },
      { sbX: 120, sbY: 18 },
      { sbX: 102, sbY: 18 },
    ],
  },
  {
    id: "wide-right",
    label: "Wide Right",
    vertices: [
      { sbX: 102, sbY: 62 },
      { sbX: 120, sbY: 62 },
      { sbX: 120, sbY: 80 },
      { sbX: 102, sbY: 80 },
    ],
  },

  // 6-yard box flanks
  {
    id: "6yard-near-left",
    label: "6yd Near L",
    vertices: [
      { sbX: 114, sbY: 18 },
      { sbX: 120, sbY: 18 },
      { sbX: 120, sbY: 30 },
      { sbX: 114, sbY: 30 },
    ],
  },
  {
    id: "6yard-near-right",
    label: "6yd Near R",
    vertices: [
      { sbX: 114, sbY: 50 },
      { sbX: 120, sbY: 50 },
      { sbX: 120, sbY: 62 },
      { sbX: 114, sbY: 62 },
    ],
  },

  // Extended back zones beyond penalty area
  {
    id: "deep-left",
    label: "Deep Left",
    vertices: [
      { sbX: 90, sbY: 0 },
      { sbX: 102, sbY: 0 },
      { sbX: 102, sbY: 40 },
      { sbX: 90, sbY: 40 },
    ],
  },
  {
    id: "deep-right",
    label: "Deep Right",
    vertices: [
      { sbX: 90, sbY: 40 },
      { sbX: 102, sbY: 40 },
      { sbX: 102, sbY: 80 },
      { sbX: 90, sbY: 80 },
    ],
  },

  // Penalty arc area
  {
    id: "arc-left",
    label: "Arc Left",
    vertices: [
      { sbX: 95, sbY: 25 },
      { sbX: 102, sbY: 25 },
      { sbX: 102, sbY: 40 },
      { sbX: 95, sbY: 40 },
    ],
  },
  {
    id: "arc-right",
    label: "Arc Right",
    vertices: [
      { sbX: 95, sbY: 40 },
      { sbX: 102, sbY: 40 },
      { sbX: 102, sbY: 55 },
      { sbX: 95, sbY: 55 },
    ],
  },

  // Central penalty spot area
  {
    id: "penalty-left",
    label: "Pen Left",
    vertices: [
      { sbX: 105, sbY: 30 },
      { sbX: 112, sbY: 30 },
      { sbX: 112, sbY: 40 },
      { sbX: 105, sbY: 40 },
    ],
  },
  {
    id: "penalty-right",
    label: "Pen Right",
    vertices: [
      { sbX: 105, sbY: 40 },
      { sbX: 112, sbY: 40 },
      { sbX: 112, sbY: 50 },
      { sbX: 105, sbY: 50 },
    ],
  },
];

// ---------- Coordinate mapping ----------

export interface SvgPoint {
  x: number;
  y: number;
}

/** StatsBomb coords -> SVG half-pitch coords */
export function sbToSvg(sbX: number, sbY: number): SvgPoint {
  return {
    x: sbY,
    y: clamp(120 - sbX, 0, 60),
  };
}

/** Check if a StatsBomb point is in the attacking half (sbX >= 60) */
export function isAttackingHalf(sbX: number): boolean {
  return sbX >= 60;
}

// ---------- Point-in-polygon (ray casting) ----------

export function pointInPolygon(
  px: number,
  py: number,
  polygon: SvgPoint[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ---------- Zone assignment ----------

export interface Zone {
  id: string;
  label: string;
  svgPolygon: SvgPoint[];
  centroid: SvgPoint;
}

function computeCentroid(points: SvgPoint[]): SvgPoint {
  const n = points.length;
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / n, y: sum.y / n };
}

/** Pre-computed zones with SVG polygons */
export const ZONES: Zone[] = ZONE_DEFS.map((def) => {
  const svgPolygon = def.vertices.map((v) => sbToSvg(v.sbX, v.sbY));
  return {
    id: def.id,
    label: def.label,
    svgPolygon,
    centroid: computeCentroid(svgPolygon),
  };
});

/**
 * Assign a set piece to a zone based on its first contact or delivery
 * position in SVG coordinates.
 */
export function assignToZone(svgX: number, svgY: number): Zone | null {
  for (const zone of ZONES) {
    if (pointInPolygon(svgX, svgY, zone.svgPolygon)) {
      return zone;
    }
  }
  return null;
}

/**
 * Get zone by ID.
 */
export function getSetPieceZone(zoneId: string): Zone | undefined {
  return ZONES.find((z) => z.id === zoneId);
}
