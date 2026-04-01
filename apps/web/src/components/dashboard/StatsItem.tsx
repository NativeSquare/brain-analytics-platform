import { cn } from "@/lib/utils";

export interface StatsItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  className?: string;
}

export function StatsItem({ label, value, subValue, className }: StatsItemProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center gap-1 text-center",
        className,
      )}
    >
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
      {subValue != null && subValue !== "" && (
        <span className="text-xs text-muted-foreground">{subValue}</span>
      )}
    </div>
  );
}
