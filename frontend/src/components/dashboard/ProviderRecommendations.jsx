"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, ShieldCheck, Sparkles, ChevronRight, Bookmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProviderRecommendations() {
  const [providers, setProviders] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProviders() {
      try {
        const res = await fetch("/api/ai/top-providers");
        const data = await res.json();
        setProviders(data.providers || []);
        setMessage(data.message || "");
      } catch (err) {
        console.error("Providers failed:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProviders();
  }, []);

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Top Recommandations Prestataires</h3>
          </div>
          <p className="text-sm font-medium text-muted-foreground">{message}</p>
        </div>
        <Button variant="ghost" className="text-xs font-bold text-brand flex items-center gap-1 group">
          Voir tout <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {providers.map((provider, i) => (
          <motion.div
            key={provider.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="group overflow-hidden border-border/50 bg-card/50 backdrop-blur-md hover:shadow-2xl hover:shadow-brand/10 transition-all duration-500">
              <div className="relative h-40 overflow-hidden">
                <img 
                  src={provider.image} 
                  alt={provider.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <button className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-brand transition-colors">
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-foreground/80 bg-brand/80 px-2 py-0.5 rounded">
                    Exclusivité EventZella
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-base group-hover:text-brand transition-colors">{provider.name}</h4>
                    <p className="text-xs text-muted-foreground">{provider.type}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-brand/10 text-brand px-2 py-1 rounded-lg text-xs font-bold">
                    <Star className="w-3 h-3 fill-brand" /> {provider.rating}
                  </div>
                </div>
                
                <div className="p-3 rounded-xl bg-brand/10 border border-dashed border-brand/30 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-brand shrink-0" />
                  <p className="text-xs font-bold italic leading-tight text-brand">
                    Pour ces prestataires, vous pouvez les réserver à ce prix uniquement avec nous EventZella.
                  </p>
                </div>

                <Button className="w-full bg-brand hover:bg-brand/90 text-brand-foreground font-bold h-10 rounded-xl group">
                  Réserver l'offre <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
