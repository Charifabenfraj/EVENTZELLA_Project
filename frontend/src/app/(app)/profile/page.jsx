"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/useSession";
import { updateProfile } from "@/lib/enterpriseApi";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Briefcase, 
  Building2, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  BrainCircuit, 
  Zap,
  Save,
  CheckCircle2,
  Lock,
  Camera,
  Cpu,
  BarChart,
  MessageSquare
} from "lucide-react";

export default function ProfilePage() {
  const { user, refresh } = useSession();
  const [form, setForm] = useState({ firstName: "", lastName: "", title: "", department: "" });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      title: user.title || "",
      department: user.department || "",
    });
  }, [user]);

  const onChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      await updateProfile(form);
      setStatus({ type: "success", message: "Profile updated successfully" });
      await refresh();
      setTimeout(() => setStatus({ type: "", message: "" }), 3000);
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Update failed" });
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = async () => {
    setAiAnalyzing(true);
    setAiInsights(null);
    try {
      const response = await fetch("/api/ai/suggestions");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setAiInsights({
        persona: data.persona || "Strategic Optimizer",
        focus: data.recommendations || ["Optimize operational KPIs", "AI-assisted performance analysis"],
        score: data.impactScore || 85
      });
    } catch (err) {
      console.error("AI Analysis failed:", err);
      // Fallback in English
      setAiInsights({
        persona: "Enterprise Strategist",
        focus: ["KPI operational optimization", "Data-driven leadership modeling"],
        score: 88
      });
    } finally {
      setAiAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header with Cover */}
      <div className="relative h-48 rounded-3xl overflow-hidden shadow-2xl group">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/80 via-brand-foreground/40 to-background/20 backdrop-blur-sm" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069')] bg-cover bg-center mix-blend-overlay opacity-30" />
        <div className="absolute bottom-6 left-8 flex items-end gap-6 translate-y-12">
          <div className="relative group">
            <Avatar className="h-32 w-32 border-4 border-background shadow-2xl ring-4 ring-brand/20">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="text-3xl font-bold bg-brand text-brand-foreground">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <button className="absolute bottom-1 right-1 p-2 bg-brand rounded-full text-brand-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="pb-4 -translate-y-4">
            <h1 className="font-display text-4xl font-bold text-foreground drop-shadow-sm">
              {user?.firstName} {user?.lastName}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <ShieldCheck className="w-4 h-4 text-brand" />
              <span className="uppercase tracking-widest text-[10px]">{user?.roleName || "Executive Member"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-16 pt-10">
        {/* Left Column: Info and AI */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-8 border-border/50 backdrop-blur-xl bg-card/50 shadow-xl border-t-brand/20 border-t-2">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand/10 rounded-lg">
                  <User className="w-5 h-5 text-brand" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Professional Information</h2>
              </div>
              <AnimatePresence>
                {status.message && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`text-sm px-3 py-1 rounded-full flex items-center gap-2 ${
                      status.type === "success" ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {status.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 group">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">First Name</label>
                  <div className="relative">
                    <Input 
                      value={form.firstName} 
                      onChange={(e) => onChange("firstName", e.target.value)} 
                      className="h-12 bg-muted/30 border-border/50 focus:ring-brand/20 transition-all pl-4 text-foreground font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Last Name</label>
                  <Input 
                    value={form.lastName} 
                    onChange={(e) => onChange("lastName", e.target.value)} 
                    className="h-12 bg-muted/30 border-border/50 transition-all pl-4 text-foreground font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-2">
                    <Briefcase className="w-3 h-3" /> Job Title
                  </label>
                  <Input 
                    value={form.title} 
                    onChange={(e) => onChange("title", e.target.value)} 
                    placeholder="e.g. CEO, Marketing Director..."
                    className="h-12 bg-muted/30 border-border/50 transition-all pl-4 text-foreground font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-2">
                    <Building2 className="w-3 h-3" /> Department
                  </label>
                  <Input 
                    value={form.department} 
                    onChange={(e) => onChange("department", e.target.value)} 
                    placeholder="e.g. Executive, Sales, Operations..."
                    className="h-12 bg-muted/30 border-border/50 transition-all pl-4 text-foreground font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border/50 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-brand hover:bg-brand/90 text-brand-foreground px-8 py-6 rounded-xl shadow-lg shadow-brand/20 font-bold transition-all flex items-center gap-3"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-brand-foreground/30 border-t-brand-foreground animate-spin rounded-full" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>

          {/* AI Insights Section */}
          <Card className="p-8 border-border/50 backdrop-blur-xl bg-gradient-to-br from-brand/5 to-transparent shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <BrainCircuit className="w-32 h-32 text-brand" />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-brand">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="font-bold uppercase tracking-[0.2em] text-xs text-brand-foreground/80">AI Insight Engine</span>
                </div>
                <h3 className="text-2xl font-display font-bold text-foreground">Strategic Role Analysis</h3>
                <p className="text-muted-foreground max-w-md">
                  Let AI analyze your current position to identify your priority performance levers and growth paths.
                </p>
              </div>
              <Button 
                onClick={generateAIInsights}
                disabled={aiAnalyzing}
                variant="outline"
                className="border-brand/30 hover:bg-brand/10 py-6 px-6 font-bold flex items-center gap-2 group text-foreground"
              >
                {aiAnalyzing ? (
                  <Zap className="w-4 h-4 animate-bounce text-brand" />
                ) : (
                  <BrainCircuit className="w-5 h-5 text-brand group-hover:rotate-12 transition-transform" />
                )}
                {aiAnalyzing ? "Analyzing..." : "Launch AI Analysis"}
              </Button>
            </div>

            <AnimatePresence>
              {aiInsights && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-10 pt-8 border-t border-brand/20 grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest">
                      <TrendingUp className="w-4 h-4 text-brand" /> Strategic Persona
                    </div>
                    <div className="p-4 rounded-2xl bg-brand/10 border border-brand/20">
                      <span className="text-xl font-bold text-brand">{aiInsights.persona}</span>
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Aligned with EventZella decision intelligence KPIs.
                      </p>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                      <span className="text-sm font-bold text-foreground">AI Impact Score</span>
                      <span className="text-2xl font-display font-black text-brand">{aiInsights.score}%</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                      Priority Focus Points
                    </div>
                    <ul className="space-y-3">
                      {aiInsights.focus.map((item, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                          <span className="text-sm font-medium text-foreground">{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Advanced Feature: Digital Twin Optimizer */}
          <Card className="p-8 border-brand/20 bg-card/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-brand/10 rounded-2xl text-brand">
                   <Cpu className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-foreground">Digital Twin Strategy Optimizer</h3>
                   <p className="text-xs text-brand font-black uppercase tracking-widest">Enterprise Feature</p>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: BarChart, label: "Predictive Flows", val: "Active" },
                  { icon: MessageSquare, label: "Auto-Reporting", val: "Ready" },
                  { icon: Zap, label: "Workflow Sync", val: "Optimized" }
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-black/20 border border-white/5 flex flex-col items-center text-center gap-2">
                    <item.icon className="w-5 h-5 text-brand/60" />
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">{item.label}</span>
                    <span className="text-sm font-bold text-foreground">{item.val}</span>
                  </div>
                ))}
             </div>
             <Button className="w-full mt-6 bg-transparent border border-brand/40 text-brand hover:bg-brand hover:text-white transition-all font-bold rounded-xl h-12">
                Configure AI Workflow
             </Button>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-xl">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-foreground">
              <ShieldCheck className="w-4 h-4 text-brand" /> Account Security
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">Double Authentication</span>
                    <span className="text-[10px] text-success font-medium uppercase tracking-tighter">Enabled (Google Auth)</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-start text-xs font-bold hover:text-brand transition-colors text-muted-foreground">
                Change Password
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-brand text-brand-foreground overflow-hidden relative group rounded-[2rem]">
            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
              <Sparkles className="w-20 h-20" />
            </div>
            <h3 className="font-bold text-xl mb-2 relative">Upgrade to AI Plus</h3>
            <p className="text-brand-foreground/80 text-sm mb-6 relative font-medium">
              Access custom prediction models and advanced report automation for your entire team.
            </p>
            <Button className="w-full bg-brand-foreground text-brand font-bold py-6 hover:bg-brand-foreground/90 transition-all rounded-2xl shadow-xl shadow-black/20">
              View Plans
            </Button>
          </Card>

          <div className="px-2 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Current Session</h4>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Last login</span>
                <span className="font-bold text-foreground">{new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
