import { Card } from "@/components/ui/card";

export default function AlertList({ alerts }) {
  return (
    <Card className="space-y-3">
      <h4 className="text-lg font-semibold text-foreground">Priority alerts</h4>
      <div className="space-y-2">
        {(alerts || []).map((alert, index) => (
          <div key={`${alert.title}-${index}`} className="rounded-xl border border-border bg-muted/50 p-3">
            <p className="text-sm font-semibold text-foreground">{alert.title}</p>
            <p className="text-xs text-muted-foreground">{alert.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
