import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function RecommendationCard({ title, detail, impact }) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-foreground">{title}</h4>
        <Badge>{impact}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </Card>
  );
}
