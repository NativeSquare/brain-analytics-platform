"use client";

type PitchBaseProps = {
  onClick?: () => void;
  svgRef?: React.Ref<SVGSVGElement>;
  children?: React.ReactNode;
};

const PitchBase = ({ onClick, svgRef, children }: PitchBaseProps) => {
  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="w-full p-2">
          <div className="aspect-[4/3] w-full">
            <svg
              ref={svgRef}
              viewBox="0 0 80 60"
              className="h-full w-full"
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
                    .shot-off-target {
                      fill: #000000;
                    }
                    .dark .shot-off-target {
                      fill: #ffffff;
                    }
                  `}
                </style>
              </defs>
              {/* Background */}
              <rect x="0" y="0" width="80" height="60" className="pitch-bg" />
              {/* Outer boundary */}
              <rect
                x="1"
                y="1"
                width="78"
                height="58"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              {/* Penalty area */}
              <rect
                x="18"
                y="1"
                width="44"
                height="17"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              {/* Goal area */}
              <rect
                x="30"
                y="1"
                width="20"
                height="5"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              {/* Penalty spot */}
              <circle
                cx="40"
                cy="12"
                r="0.4"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              {/* Penalty arc */}
              <path
                d="M 31 18 A 9.15 9.15 0 0 0 49 18"
                className="pitch-stroke"
                strokeWidth={0.3}
              />
              {/* Goal line (thicker) */}
              <line
                x1="36"
                y1="1"
                x2="44"
                y2="1"
                className="pitch-stroke"
                strokeWidth={0.9}
              />
              {children}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PitchBase;
