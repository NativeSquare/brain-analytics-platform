import { cn } from "@/lib/utils";

export interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-end gap-4 rounded-xl border bg-card p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
