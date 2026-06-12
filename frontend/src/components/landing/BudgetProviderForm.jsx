"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, ChevronRight, Star, ShieldCheck, Wallet, MapPin, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function BudgetProviderForm() {
  const [budget, setBudget] = useState("");
  const [eventType, setEventType] = useState("Wedding");
  const [city, setCity] = useState("Tunis");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!budget) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/recommend-by-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget, event_type: eventType, city }),
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("ML Recommendation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-brand">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span className="font-bold uppercase tracking-[0.3em] text-xs">PROVIDER BUDGET MODEL</span>
        </div>
        <h2 className="text-4xl font-display font-bold text-foreground">Select the best providers to optimize your budget and quality.</h2>
        <p className="text-muted-foreground italic text-lg">
          Enter your estimated budget and our AI model will suggest the ideal partners with exclusive rates.
        </p>

        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-10">
          <div className="relative group">
            <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-brand transition-colors z-10" />
            <Input 
              type="number" 
              placeholder="Budget (TND)"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="pl-12 h-14 bg-card/40 border-brand/20 focus:ring-brand/30 text-lg font-bold rounded-2xl"
            />
          </div>
          
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-brand transition-colors z-10" />
            <Select 
              value={eventType} 
              onChange={(e) => setEventType(e.target.value)}
              className="pl-12 h-14"
            >
              <option value="Wedding">Wedding</option>
              <option value="Corporate Event">Corporate Event</option>
              <option value="Birthday">Birthday</option>
              <option value="Private Party">Private Party</option>
            </Select>
          </div>

          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-brand transition-colors z-10" />
            <Select 
              value={city} 
              onChange={(e) => setCity(e.target.value)}
              className="pl-12 h-14"
            >
              <option value="Tunis">Tunis</option>
              <option value="Sousse">Sousse</option>
              <option value="Sfax">Sfax</option>
              <option value="Hammamet">Hammamet</option>
            </Select>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="h-14 bg-brand hover:bg-brand/90 text-brand-foreground rounded-2xl font-bold transition-all shadow-lg shadow-brand/20 flex items-center gap-2"
          >
            {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <Search className="w-5 h-5" />}
            {loading ? "Analyzing..." : "Predict Now"}
          </Button>
        </form>
      </div>

      <AnimatePresence>
        {results && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-center gap-3 py-4 border-y border-brand/10">
              <ShieldCheck className="w-5 h-5 text-brand" />
              <p className="text-sm font-bold text-brand italic">
                For these providers, you can book them at this price only with us EventZella.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {results.providers.map((provider, i) => (
                <motion.div
                  key={provider.name + i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="group overflow-hidden border-border/50 bg-card/30 backdrop-blur-md hover:shadow-2xl hover:shadow-brand/10 transition-all duration-500">
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={provider.image} 
                        alt={provider.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md text-brand px-2 py-1 rounded-lg text-xs font-bold">
                        <Star className="w-3 h-3 fill-brand" /> {provider.rating}
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <h4 className="font-bold text-lg group-hover:text-brand transition-colors">{provider.name}</h4>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">{provider.type}</p>
                      </div>
                      
                      <div className="p-3 rounded-xl bg-brand/5 border border-dashed border-brand/20">
                        <p className="text-xs font-medium text-brand-foreground/80 leading-relaxed italic">
                          "{provider.offer}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Est. price</span>
                        <span className="font-bold text-brand">{provider.price_indicator} TND</span>
                      </div>

                      <Button className="w-full bg-brand/10 hover:bg-brand text-brand hover:text-brand-foreground border border-brand/20 font-bold h-10 rounded-xl transition-all">
                        Book with EventZella
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
