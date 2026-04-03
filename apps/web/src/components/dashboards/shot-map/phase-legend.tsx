"use client";

const PhaseLegend = () => {
  return (
    <div>
      <div className="font-semibold">Phase</div>
      <div className="mt-1">
        <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-6 text-center">
          <span>Set Piece</span>
          <span>Transition</span>
          <span>Build-up</span>
          <span>Contested</span>
        </div>
        <div className="mt-1 grid grid-cols-[repeat(4,minmax(0,1fr))] gap-6 place-items-center">
          <svg width="16" height="16" viewBox="0 0 10 10" aria-hidden className="text-foreground">
            <polygon points="5,1 1,9 9,9" fill="currentColor" stroke="currentColor" strokeWidth="0.4" />
          </svg>
          <svg width="16" height="16" viewBox="0 0 10 10" aria-hidden className="text-foreground">
            <rect x="1" y="1" width="8" height="8" fill="currentColor" stroke="currentColor" strokeWidth="0.4" />
          </svg>
          <svg width="16" height="16" viewBox="0 0 10 10" aria-hidden className="text-foreground">
            <circle cx="5" cy="5" r="4" fill="currentColor" stroke="currentColor" strokeWidth="0.4" />
          </svg>
          <svg width="16" height="16" viewBox="0 0 10 10" aria-hidden className="text-foreground">
            <polygon points="5,1 1,5 5,9 9,5" fill="currentColor" stroke="currentColor" strokeWidth="0.4" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default PhaseLegend;
