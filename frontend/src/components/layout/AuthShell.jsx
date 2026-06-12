import LogoMark from "@/components/brand/LogoMark";

export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative flex items-center justify-center overflow-hidden px-6 py-12">
          <div className="absolute inset-0 grid-surface opacity-80" />
          <div className="relative z-10 max-w-lg space-y-6">
            <LogoMark className="h-20 w-20" />
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Eventzella Enterprise</p>
            <h1 className="font-display text-4xl leading-tight text-foreground">
              Decision-grade intelligence for modern event operations.
            </h1>
            <p className="text-base text-muted-foreground">
              Role-aware analytics, ML-driven recommendations, and executive-ready dashboards. Built for
              leadership teams that need clarity in real time.
            </p>
            <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-glow">
              <p className="text-sm font-medium text-foreground">What you unlock</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Personalized KPI scorecards and AI forecasts</li>
                <li>Quality, revenue, and marketing health monitoring</li>
                <li>Secure access controls with audit-ready trails</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center bg-card px-6 py-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
