"use client";

import { useRef, useEffect } from "react";

export const GOAL_WIDTH = 8; // yards
export const GOAL_HEIGHT = 2.67; // meters

type GoalBaseProps = {
  onClick?: () => void;
  svgRef?: React.Ref<SVGSVGElement>;
  children?: React.ReactNode;
  onScaleChange?: (scale: number) => void;
};

const GoalBase = ({
  onClick,
  svgRef,
  children,
  onScaleChange,
}: GoalBaseProps) => {
  const internalRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!onScaleChange) return;
    const svg = internalRef.current;
    if (!svg) return;

    const viewBoxWidth = GOAL_WIDTH + 4;

    const updateScale = () => {
      const rect = svg.getBoundingClientRect();
      if (rect.width > 0) {
        const scale = rect.width / viewBoxWidth;
        onScaleChange(scale);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(svg);

    return () => observer.disconnect();
  }, [onScaleChange]);

  const setRef = (node: SVGSVGElement | null) => {
    internalRef.current = node;
    if (typeof svgRef === "function") {
      svgRef(node);
    } else if (svgRef && typeof svgRef === "object") {
      // Use Object.assign to work around readonly RefObject in strict mode
      Object.assign(svgRef, { current: node });
    }
  };

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="w-full p-2">
          <div className="aspect-[4/3] w-full">
            <svg
              ref={setRef}
              viewBox={`-2 -2 ${GOAL_WIDTH + 4} ${GOAL_HEIGHT + 4}`}
              className="h-full w-full"
              onClick={onClick}
            >
              <defs>
                <style>
                  {`
                    .goal-bg {
                      fill: none;
                    }
                    .dark .goal-bg {
                      fill: none;
                    }
                    .goal-stroke {
                      stroke: #1a1a1a;
                      fill: none;
                    }
                    .dark .goal-stroke {
                      stroke: #e5e5e5;
                    }
                    .goal-net {
                      stroke: #9ca3af;
                    }
                    .dark .goal-net {
                      stroke: #6b7280;
                    }
                    .shot-off-target {
                      fill: #000000;
                    }
                    .dark .shot-off-target {
                      fill: #ffffff;
                    }
                  `}
                </style>
                <pattern
                  id="goal-net"
                  width="0.5"
                  height="0.5"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 0 0.5 H 0.5 M 0.5 0 V 0.5"
                    className="goal-net"
                    strokeWidth="0.05"
                  />
                </pattern>
              </defs>
              {/* Background */}
              <rect
                x={-2}
                y={-2}
                width={GOAL_WIDTH + 4}
                height={GOAL_HEIGHT + 4}
                className="goal-bg"
              />
              {/* Goal net */}
              <rect
                x="0"
                y="0"
                width={GOAL_WIDTH}
                height={GOAL_HEIGHT}
                fill="url(#goal-net)"
              />
              {/* Goal frame - crossbar */}
              <line
                x1="-0.1"
                y1="0"
                x2={GOAL_WIDTH + 0.1}
                y2="0"
                className="goal-stroke"
                strokeWidth={0.2}
              />
              {/* Goal frame - left post */}
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={GOAL_HEIGHT}
                className="goal-stroke"
                strokeWidth={0.2}
              />
              {/* Goal frame - right post */}
              <line
                x1={GOAL_WIDTH}
                y1="0"
                x2={GOAL_WIDTH}
                y2={GOAL_HEIGHT}
                className="goal-stroke"
                strokeWidth={0.2}
              />
              {/* Goal line */}
              <line
                x1={-2}
                y1={GOAL_HEIGHT}
                x2={GOAL_WIDTH + 2}
                y2={GOAL_HEIGHT}
                className="goal-stroke"
                strokeWidth={0.03}
              />
              {children}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalBase;
