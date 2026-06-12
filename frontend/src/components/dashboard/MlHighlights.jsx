import { Card } from "@/components/ui/card";

function renderProviders(prediction) {
  const items = prediction?.recommendations || [];
  if (!items.length) return "No provider recommendations available.";
  return `Top providers: ${items.slice(0, 3).map((item) => item.provider).join(", ")}`;
}

function renderPricing(prediction) {
  if (!prediction) return "No price prediction available.";
  const price = prediction.estimated_price ?? prediction.prediction;
  const band = prediction.budget_band || "Standard";
  return `Estimated price: ${price} (${band})`;
}

function renderForecast(prediction) {
  if (!prediction) return "No forecast data available.";
  const trend = prediction.trend || "Stable";
  const points = prediction.forecast_points?.length || 0;
  return `Demand trend: ${trend}, ${points} future points generated.`;
}

function renderComplaint(prediction) {
  if (!prediction) return "No complaint risk available.";
  return `Complaint risk: ${prediction.risk_level} (${prediction.risk_probability}%)`;
}

function renderCancellation(prediction) {
  if (!prediction) return "No cancellation insight available.";
  return `Cancellation risk: ${prediction.risk_level} (${prediction.cancel_probability}%)`;
}

function renderSegment(prediction) {
  if (!prediction) return "No segment insight available.";
  return `Customer segment: ${prediction.cluster_name || "Unknown"}`;
}

function renderSvd(prediction) {
  const items = prediction?.recommended_items || [];
  if (!items.length) return "No collaborative recommendations available.";
  return `Recommended packages: ${items.slice(0, 3).join(", ")}`;
}

export default function MlHighlights({ predictions }) {
  return (
    <Card className="space-y-3">
      <h4 className="text-lg font-semibold text-foreground">ML insights</h4>
      <div className="space-y-2 text-sm text-muted-foreground">
        {predictions?.providers ? <p>{renderProviders(predictions.providers)}</p> : null}
        {predictions?.pricing ? <p>{renderPricing(predictions.pricing)}</p> : null}
        {predictions?.forecast ? <p>{renderForecast(predictions.forecast)}</p> : null}
        {predictions?.complaints ? <p>{renderComplaint(predictions.complaints)}</p> : null}
        {predictions?.cancellations ? <p>{renderCancellation(predictions.cancellations)}</p> : null}
        {predictions?.segments ? <p>{renderSegment(predictions.segments)}</p> : null}
        {predictions?.recommendations ? <p>{renderSvd(predictions.recommendations)}</p> : null}
      </div>
    </Card>
  );
}
