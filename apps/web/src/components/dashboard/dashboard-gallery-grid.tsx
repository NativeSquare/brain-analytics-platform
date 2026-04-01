import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardGalleryGridProps {
  children: ReactNode;
  /** Additional CSS classes to apply to the grid container. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Responsive gallery grid for dashboard cards.
 * - 1 column on small screens
 * - 2 columns at md breakpoint
 * - 3 columns at xl breakpoint
 */
export function DashboardGalleryGrid({
  children,
  className = "",
}: DashboardGalleryGridProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
