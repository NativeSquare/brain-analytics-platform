import * as React from "react";

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbSegment {
  id: string;
  label: string;
}

export interface FolderBreadcrumbProps
  extends Omit<React.ComponentProps<"nav">, "children"> {
  segments: BreadcrumbSegment[];
  onNavigate: (folderId: string) => void;
}

function FolderBreadcrumb({
  segments,
  onNavigate,
  ...props
}: FolderBreadcrumbProps) {
  if (segments.length === 0) {
    return null;
  }

  // Truncate when > 3 segments: show first, ellipsis, last two
  const shouldTruncate = segments.length > 3;
  const visibleSegments = shouldTruncate
    ? [segments[0], ...segments.slice(-2)]
    : segments;

  const lastIndex = visibleSegments.length - 1;

  return (
    <Breadcrumb {...props}>
      <BreadcrumbList>
        {visibleSegments.map((segment, index) => {
          const isLast = index === lastIndex;

          // Insert ellipsis after the first segment when truncating
          const showEllipsis = shouldTruncate && index === 0;

          return (
            <React.Fragment key={segment.id}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(segment.id);
                    }}
                  >
                    {segment.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>

              {showEllipsis && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbEllipsis />
                  </BreadcrumbItem>
                </>
              )}

              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export { FolderBreadcrumb };
