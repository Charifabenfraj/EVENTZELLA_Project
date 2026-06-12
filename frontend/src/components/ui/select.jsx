import { cn } from "@/lib/utils";

export function Select({ className, ...props }) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
        className
      )}
      {...props}
    />
  );
}
