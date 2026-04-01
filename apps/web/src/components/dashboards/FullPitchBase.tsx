"use client";

type FullPitchBaseProps = {
  onClick?: () => void;
  svgRef?: React.Ref<SVGSVGElement>;
  children?: React.ReactNode;
  overlay?: React.ReactNode;
  rightAdornment?: React.ReactNode;
};

const FullPitchBase = ({
  onClick,
  svgRef,
  children,
  overlay,
  rightAdornment,
}: FullPitchBaseProps) => {
  return (
    <div className="w-full">
      <div className="relative flex w-full overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex-grow p-2">
          {/* A full pitch is 80x120. Using aspect ratio 80/120 or 2/3 */}
          <div className="relative aspect-[2/3] w-full">
            <svg
              ref={svgRef}
              viewBox="0 0 80 120"
              className="relative z-0 h-full w-full"
              onClick={onClick}
            >
              <defs>
                <style>
                  {`
                    .pitch-bg {
                      fill: none;
                    }
                    .dark .pitch-bg {
                      fill: none;
                    }
                    .pitch-stroke {
                      stroke: #1a1a1a;
                      fill: none;
                    }
                    .dark .pitch-stroke {
                      stroke: #e5e5e5;
                    }
                  `}
                </style>
              </defs>
              {/* Outer boundary */}
              <rect
                x="0"
                y="0"
                width="80"
                height="120"
                className="pitch-bg"
              />
              <rect
                x="1"
                y="1"
                width="78"
                height="118"
                className="pitch-stroke"
                strokeWidth={0.3}
              />

              {/* Halfway line */}
              <line
                x1="1"
                y1="60"
                x2="79"
                y2="60"
                className="pitch-stroke"
                strokeWidth={0.3}
              />

              {/* Center circle */}
              <circle
                cx="40"
                cy="60"
                r="9.15"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              <circle
                cx="40"
                cy="60"
                r="0.4"
                className="pitch-stroke"
                strokeWidth={0.3}
              />

              {/* Top Penalty Area (0 to 18) */}
              <rect
                x="18"
                y="1"
                width="44"
                height="17"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              {/* Top Goal Area (0 to 6) */}
              <rect
                x="30"
                y="1"
                width="20"
                height="5"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              {/* Top Penalty Spot */}
              <circle
                cx="40"
                cy="12"
                r="0.4"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              {/* Top Penalty Arc */}
              <path
                d="M 31 18 A 9.15 9.15 0 0 0 49 18"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              {/* Top Goal Line */}
              <line
                x1="36"
                y1="1"
                x2="44"
                y2="1"
                className="pitch-stroke"
                strokeWidth={0.9}
              />

              {/* Bottom Penalty Area (102 to 120) */}
              <rect
                x="18"
                y="102"
                width="44"
                height="17"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              {/* Bottom Goal Area (114 to 120) */}
              <rect
                x="30"
                y="114"
                width="20"
                height="5"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              {/* Bottom Penalty Spot */}
              <circle
                cx="40"
                cy="108"
                r="0.4"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              {/* Bottom Penalty Arc */}
              <path
                d="M 31 102 A 9.15 9.15 0 0 1 49 102"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              {/* Bottom Goal Line */}
              <line
                x1="36"
                y1="119"
                x2="44"
                y2="119"
                className="pitch-stroke"
                strokeWidth={0.9}
              />

              {/* Pitch Thirds dashed lines */}
              <line
                x1="1"
                y1="40"
                x2="79"
                y2="40"
                className="pitch-stroke"
                strokeWidth={0.3}
                strokeDasharray="1,1"
                opacity={0.5}
              />
              <line
                x1="1"
                y1="80"
                x2="79"
                y2="80"
                className="pitch-stroke"
                strokeWidth={0.3}
                strokeDasharray="1,1"
                opacity={0.5}
              />

              {children}
            </svg>
            {overlay}
          </div>
        </div>
        {rightAdornment && (
          <div className="flex shrink-0 flex-col border-l">
            {rightAdornment}
          </div>
        )}
      </div>
    </div>
  );
};

export default FullPitchBase;
