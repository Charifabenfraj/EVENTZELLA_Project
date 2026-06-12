import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function KpiCard({ label, value, unit, delta, index }) {
  const trend = Number(delta || 0);
  const trendColor = trend >= 0 ? "text-success" : "text-danger";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Card className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <div className="flex items-end justify-between">
          <p className="text-3xl font-semibold text-foreground">
            {value}
            {unit ? <span className="text-base text-muted-foreground">{unit}</span> : null}
          </p>
          <p className={cn("text-sm font-semibold", trendColor)}>{trend >= 0 ? "+" : ""}{trend}%</p>
        </div>
        <p className="text-xs text-muted-foreground">vs last period</p>
      </Card>
    </motion.div>
  );
}
