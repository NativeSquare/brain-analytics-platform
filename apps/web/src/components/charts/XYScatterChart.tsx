"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScatterDataPoint {
  id: string;
  name: string;
  imageUrl?: string;
  [metricKey: string]: number | string | undefined;
}

export interface MetricOption {
  key: string;
  label: string;
}

export interface MetricGroup {
  label: string;
  metrics: MetricOption[];
}

export interface XYScatterChartProps {
  data: ScatterDataPoint[];
  metricGroups: MetricGroup[];
  defaultXMetric: string;
  defaultYMetric: string;
  xReferenceValue?: number;
  yReferenceValue?: number;
  referenceLabel?: string;
  onPointClick?: (point: ScatterDataPoint) => void;
  selectedPointId?: string;
  height?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BRAND_BLUE = "#1b5497";
const REFERENCE_RED = "#991b1b";
const DEFAULT_POINT = "#9ca3af";
const GRID_STROKE = "#d0d0d0";
const DEFAULT_HEIGHT = 420;

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
};

const computeDomain = (
  values: number[],
  extraPaddingTop = 0,
): [number, number] => {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return [0, 1];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const spread = max - min;
  const padding =
    spread === 0 ? Math.max(Math.abs(max) * 0.15, 0.5) : spread * 0.1;
  const domainMin = min - padding;
  const domainMax = max + padding + extraPaddingTop;
  if (domainMax <= domainMin) return [domainMin, domainMin + 1];
  return [domainMin, domainMax];
};

const getNiceStep = (range: number): number => {
  if (range <= 0) return 1;
  const roughStep = range / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;

  if (normalized <= 1) return 1 * magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
};

const computeTicks = (domainMin: number, domainMax: number): number[] => {
  const range = domainMax - domainMin;
  const step = getNiceStep(range);
  const start = Math.ceil(domainMin / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= domainMax; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return ticks.length > 0 ? ticks : [domainMin, domainMax];
};

// ---------------------------------------------------------------------------
// Internal: processed point shape
// ---------------------------------------------------------------------------

interface ProcessedPoint extends ScatterDataPoint {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function XYScatterChart({
  data,
  metricGroups,
  defaultXMetric,
  defaultYMetric,
  xReferenceValue,
  yReferenceValue,
  referenceLabel,
  onPointClick,
  selectedPointId,
  height = DEFAULT_HEIGHT,
  className,
}: XYScatterChartProps) {
  const [xMetricKey, setXMetricKey] = useState(defaultXMetric);
  const [yMetricKey, setYMetricKey] = useState(defaultYMetric);

  // Find current metric labels
  const findMetricLabel = useCallback(
    (key: string): string => {
      for (const group of metricGroups) {
        const found = group.metrics.find((m) => m.key === key);
        if (found) return found.label;
      }
      return key;
    },
    [metricGroups],
  );

  const xLabel = findMetricLabel(xMetricKey);
  const yLabel = findMetricLabel(yMetricKey);

  // Build scatter points
  const points: ProcessedPoint[] = data
    .map((row) => {
      const x = toNumber(row[xMetricKey]);
      const y = toNumber(row[yMetricKey]);
      return { ...row, x, y };
    })
    .filter((row) => Number.isFinite(row.x) && Number.isFinite(row.y));

  // Domain calculation with extra padding for reference line labels
  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);

  if (xReferenceValue !== undefined) xValues.push(xReferenceValue);
  if (yReferenceValue !== undefined) yValues.push(yReferenceValue);

  const xSpread =
    xValues.length > 0
      ? Math.max(...xValues) - Math.min(...xValues)
      : 1;
  const ySpread =
    yValues.length > 0
      ? Math.max(...yValues) - Math.min(...yValues)
      : 1;

  const xDomain = computeDomain(xValues, xSpread * 0.08);
  const yDomain = computeDomain(yValues, ySpread * 0.08);

  const xTicks = computeTicks(xDomain[0], xDomain[1]);
  const yTicks = computeTicks(yDomain[0], yDomain[1]);

  // State for collapsible metric groups
  const [expandedGroupsX, setExpandedGroupsX] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      metricGroups.map((g, i) => [g.label, i === 0]),
    ),
  );
  const [expandedGroupsY, setExpandedGroupsY] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      metricGroups.map((g, i) => [g.label, i === 0]),
    ),
  );

  const toggleGroupX = (group: string) => {
    setExpandedGroupsX((prev) => ({ ...prev, [group]: !prev[group] }));
  };
  const toggleGroupY = (group: string) => {
    setExpandedGroupsY((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Custom scatter shape
  const PointShape = (props: unknown): React.ReactElement => {
    const typedProps = props as {
      cx?: number;
      cy?: number;
      payload?: ProcessedPoint;
    };
    const cx = typedProps.cx ?? 0;
    const cy = typedProps.cy ?? 0;
    const payload = typedProps.payload;
    if (!payload) return <g />;

    const isSelected = payload.id === selectedPointId;

    if (payload.imageUrl) {
      const size = isSelected ? 32 : 28;
      const border = isSelected
        ? `2px solid ${BRAND_BLUE}`
        : `1px solid ${DEFAULT_POINT}`;

      return (
        <g transform={`translate(${cx},${cy})`}>
          <foreignObject
            x={-size / 2}
            y={-size / 2}
            width={size}
            height={size}
          >
            <div
              className="flex items-center justify-center rounded-full bg-background"
              style={{ width: size, height: size, border }}
            >
              <Image
                src={payload.imageUrl}
                alt={payload.name}
                width={size - 4}
                height={size - 4}
                className="rounded-full"
                unoptimized
              />
            </div>
          </foreignObject>
        </g>
      );
    }

    // Default circle
    const radius = isSelected ? 6 : 5;
    const fill = isSelected ? BRAND_BLUE : DEFAULT_POINT;
    const stroke = isSelected ? BRAND_BLUE : DEFAULT_POINT;
    const strokeWidth = isSelected ? 2 : 1;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        style={{ cursor: onPointClick ? "pointer" : undefined }}
      />
    );
  };

  // Handle click on scatter points
  const handleScatterClick = (pointData: ProcessedPoint) => {
    if (onPointClick) {
      onPointClick(pointData);
    }
  };

  // Metric selector builder (DRY for both axes)
  const renderMetricSelector = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    expandedGroups: Record<string, boolean>,
    toggleGroup: (group: string) => void,
  ) => (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          sideOffset={4}
          className="w-[var(--radix-select-trigger-width)]"
        >
          {metricGroups.map((group, groupIndex) => (
            <div key={group.label}>
              {groupIndex > 0 && <SelectSeparator />}
              <SelectGroup>
                <button
                  type="button"
                  className="flex w-full items-center gap-1 px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggleGroup(group.label)}
                >
                  {expandedGroups[group.label] ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  <span>{group.label}</span>
                </button>
                {group.metrics.map((metric) => (
                  <SelectItem
                    key={metric.key}
                    value={metric.key}
                    className={
                      expandedGroups[group.label] ? "" : "hidden"
                    }
                  >
                    {metric.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Card className={cn(className)}>
      <CardHeader className="gap-4">
        <CardTitle>XY Comparison</CardTitle>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {renderMetricSelector(
            "X Axis",
            xMetricKey,
            setXMetricKey,
            expandedGroupsX,
            toggleGroupX,
          )}
          {renderMetricSelector(
            "Y Axis",
            yMetricKey,
            setYMetricKey,
            expandedGroupsY,
            toggleGroupY,
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 40, right: 60, bottom: 36, left: 26 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_STROKE}
                opacity={0.3}
              />
              <XAxis
                type="number"
                dataKey="x"
                domain={xDomain}
                ticks={xTicks}
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => v.toFixed(2)}
                label={{
                  value: xLabel,
                  position: "insideBottom",
                  offset: -14,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={yDomain}
                ticks={yTicks}
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => v.toFixed(2)}
                label={{
                  value: yLabel,
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0)
                    return null;
                  const dataPoint = payload[0]?.payload as
                    | ProcessedPoint
                    | undefined;
                  if (!dataPoint) return null;

                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="mb-2 text-sm font-semibold">
                        {dataPoint.name}
                      </p>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">{xLabel}:</span>{" "}
                          <span>{dataPoint.x.toFixed(2)}</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">{yLabel}:</span>{" "}
                          <span>{dataPoint.y.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              {xReferenceValue !== undefined &&
                Number.isFinite(xReferenceValue) && (
                  <ReferenceLine
                    x={xReferenceValue}
                    stroke={REFERENCE_RED}
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    label={{
                      value: referenceLabel
                        ? `${referenceLabel}: ${xReferenceValue.toFixed(2)}`
                        : `Avg: ${xReferenceValue.toFixed(2)}`,
                      position: "top",
                      fill: REFERENCE_RED,
                      fontSize: 11,
                    }}
                  />
                )}
              {yReferenceValue !== undefined &&
                Number.isFinite(yReferenceValue) && (
                  <ReferenceLine
                    y={yReferenceValue}
                    stroke={REFERENCE_RED}
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    label={{
                      value: referenceLabel
                        ? `${referenceLabel}: ${yReferenceValue.toFixed(2)}`
                        : `Avg: ${yReferenceValue.toFixed(2)}`,
                      position: "right",
                      fill: REFERENCE_RED,
                      fontSize: 11,
                    }}
                  />
                )}
              <Scatter
                data={points}
                shape={PointShape}
                onClick={(data) =>
                  handleScatterClick(data as unknown as ProcessedPoint)
                }
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
