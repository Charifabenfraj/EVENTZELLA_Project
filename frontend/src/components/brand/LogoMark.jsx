import { cn } from "@/lib/utils";

export default function LogoMark({ className, imageClassName }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl bg-card/40 p-2 shadow-lg shadow-brand/10",
        className
      )}
    >
      <img
        src="/media/eventzella-logo.png"
        alt="Eventzella"
        className={cn("h-full w-full object-contain", imageClassName)}
        loading="eager"
      />
    </div>
  );
}
