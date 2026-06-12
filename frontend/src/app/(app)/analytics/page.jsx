"use client";

import { Card } from "@/components/ui/card";
import { useSession } from "@/hooks/useSession";
import { fetchDashboard } from "@/lib/enterpriseApi";
import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const { user } = useSession();
  const role = user?.role || "ceo";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDashboard(role)
      .then((payload) => setData(payload))
      .catch((err) => setError(err.message || "Unable to load AI models"))
      .finally(() => setLoading(false));
  }, [role]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement du Centre d'Intelligence IA...</p>;
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Expertise prédictive</p>
        <h1 className="font-display text-4xl text-foreground mt-2">Centre d'Intelligence Artificielle</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Accédez à tous les modèles de Machine Learning spécialisés pour votre rôle. 
          Prenez des décisions basées sur les données et optimisez vos opérations en temps réel.
        </p>
      </header>

      {error && (
        <Card className="p-4 border-danger/50 bg-danger/5">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {data?.allowedModels && data.allowedModels.length > 0 ? (
        <section className="space-y-12">
          {/* Intelligence Financière & Prix */}
          {data.allowedModels.some(m => ["xgboost_price_regression", "intelligent_quote_generator", "provider_budget_model"].includes(m)) && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="bg-muted text-muted-foreground p-2 rounded-md border border-border">💰</span>
                Intelligence Financière & Pricing
              </h3>
              <div className="grid gap-6 lg:grid-cols-3">
                {data.allowedModels.filter(m => ["xgboost_price_regression", "intelligent_quote_generator", "provider_budget_model"].includes(m)).map((modelKey) => (
                  <Card key={modelKey} className="flex flex-col overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow bg-card">
                    <div className="bg-muted/50 border-b border-border px-6 py-4">
                      <h4 className="text-lg font-bold text-foreground">{modelKey.replace(/_/g, " ").toUpperCase()}</h4>
                    </div>
                    <div className="p-6 flex-grow flex flex-col justify-between">
                      <p className="text-muted-foreground mb-6">
                        {modelKey === "xgboost_price_regression" && "Estimez dynamiquement le meilleur prix de vente pour maximiser vos marges selon le contexte de l'événement."}
                        {modelKey === "intelligent_quote_generator" && "Générez automatiquement des devis professionnels et rentables basés sur l'intelligence artificielle."}
                        {modelKey === "provider_budget_model" && "Sélectionnez les meilleurs prestataires pour optimiser votre budget et la qualité."}
                      </p>
                      <a href={`/models/${modelKey}`} className="block w-full text-center bg-accent text-accent-foreground py-2 px-4 rounded-md font-semibold hover:opacity-90 transition-opacity">
                        Ouvrir l'outil
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Prévisions & Gestion des Risques */}
          {data.allowedModels.some(m => ["demand_forecast_ai", "cancellation_rate_model", "complaint_risk_model"].includes(m)) && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="bg-muted text-muted-foreground p-2 rounded-md border border-border">📈</span>
                Prévisions & Gestion des Risques
              </h3>
              <div className="grid gap-6 lg:grid-cols-3">
                {data.allowedModels.filter(m => ["demand_forecast_ai", "cancellation_rate_model", "complaint_risk_model"].includes(m)).map((modelKey) => (
                  <Card key={modelKey} className="flex flex-col overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow bg-card">
                    <div className="bg-muted/50 border-b border-border px-6 py-4">
                      <h4 className="text-lg font-bold text-foreground">{modelKey.replace(/_/g, " ").toUpperCase()}</h4>
                    </div>
                    <div className="p-6 flex-grow flex flex-col justify-between">
                      <p className="text-muted-foreground mb-6">
                        {modelKey === "demand_forecast_ai" && "Anticipez la demande future pour adapter vos ressources et vos campagnes marketing."}
                        {modelKey === "cancellation_rate_model" && "Détectez les événements à haut risque d'annulation pour prendre des mesures préventives."}
                        {modelKey === "complaint_risk_model" && "Identifiez les plaintes potentielles avant qu'elles ne surviennent pour garantir la satisfaction client."}
                      </p>
                      <a href={`/models/${modelKey}`} className="block w-full text-center bg-accent text-accent-foreground py-2 px-4 rounded-md font-semibold hover:opacity-90 transition-opacity">
                        Ouvrir l'outil
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Planification & Stratégie Client */}
          {data.allowedModels.some(m => ["kmeans_clustering", "event_date_model", "planning_copilot", "chatbot_intent_classifier", "svd_collaborative_filter"].includes(m)) && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="bg-muted text-muted-foreground p-2 rounded-md border border-border">🎯</span>
                Planification & Stratégie Client
              </h3>
              <div className="grid gap-6 lg:grid-cols-3">
                {data.allowedModels.filter(m => ["kmeans_clustering", "event_date_model", "planning_copilot", "chatbot_intent_classifier", "svd_collaborative_filter"].includes(m)).map((modelKey) => (
                  <Card key={modelKey} className="flex flex-col overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow bg-card">
                    <div className="bg-muted/50 border-b border-border px-6 py-4">
                      <h4 className="text-lg font-bold text-foreground">{modelKey.replace(/_/g, " ").toUpperCase()}</h4>
                    </div>
                    <div className="p-6 flex-grow flex flex-col justify-between">
                      <p className="text-muted-foreground mb-6">
                        {modelKey === "kmeans_clustering" && "Segmentez vos événements et votre clientèle pour des stratégies personnalisées."}
                        {modelKey === "event_date_model" && "Trouvez la date parfaite pour maximiser la participation et la rentabilité."}
                        {modelKey === "planning_copilot" && "Un assistant IA pour automatiser et optimiser la planification de bout en bout."}
                        {modelKey === "chatbot_intent_classifier" && "Améliorez le support client en classifiant automatiquement les requêtes et intentions."}
                        {modelKey === "svd_collaborative_filter" && "Recommandez les bons événements aux bons participants grâce au filtrage collaboratif."}
                      </p>
                      <a href={`/models/${modelKey}`} className="block w-full text-center bg-accent text-accent-foreground py-2 px-4 rounded-md font-semibold hover:opacity-90 transition-opacity">
                        Ouvrir l'outil
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
        <p className="text-muted-foreground text-center py-12">Aucun modèle disponible pour votre rôle actuel.</p>
      )}
    </div>
  );
}
