import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const badgeStyles = {
  info: "bg-muted text-muted-foreground",
  warning: "bg-warning/20 text-warning",
  success: "bg-success/20 text-success",
};

export default function InsightCard({ title, detail, severity = "info" }) {
  return (
    <Card className="space-y-3">
      <Badge className={badgeStyles[severity] || badgeStyles.info}>{severity}</Badge>
      <h4 className="text-lg font-semibold text-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </Card>
  );
}
