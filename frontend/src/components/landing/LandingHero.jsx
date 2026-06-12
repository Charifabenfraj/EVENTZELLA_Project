"use client";

import LogoMark from "@/components/brand/LogoMark";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import BudgetProviderForm from "./BudgetProviderForm";

const highlights = [
  {
    title: "Auto budget generator",
    detail: "Instant budgets in TND based on event type and city demand.",
  },
  {
    title: "Best providers, ranked",
    detail: "Smart recommendations with availability, capacity, and fit score.",
  },
  {
    title: "Planning copilot",
    detail: "From one brief, get timelines, vendors, and next steps.",
  },
];

const stats = [
  { label: "PROVIDERS INDEXED", value: "2.4k" },
  { label: "AVG BUDGET ACCURACY", value: "94%" },
  { label: "TIME SAVED", value: "-38%" },
];

export default function LandingHero() {
  return (
    <div className="dark">
      <div className="relative min-h-screen overflow-hidden bg-background text-foreground selection:bg-brand/30">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/media/eventzella-hero.jpg"
        >
          <source src="/media/eventzella-hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/60 to-black/90" />
        <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-brand/30 blur-[120px]" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-brand/20 blur-[140px]" />

        <div className="relative z-10">
          <header className="flex items-center justify-between px-6 pt-6 lg:px-14">
            <div className="flex items-center gap-3">
              <LogoMark className="h-16 w-16" />
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-brand/80 font-black">EVENTZELLA</p>
                <p className="text-[10px] text-muted-foreground font-bold">Decision ops for event teams</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <Button asChild variant="link" className="font-bold text-foreground hover:text-brand no-underline">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild variant="outline" className="border-brand/40 text-foreground font-bold hover:bg-brand/10 rounded-full px-6">
                <Link href="/signup">Register</Link>
              </Button>
            </div>
          </header>

          <main className="px-6 pb-16 pt-14 lg:px-14">
            <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <p className="text-xs uppercase tracking-[0.4em] text-brand font-black">
                  STOP SEARCHING PROVIDERS ON FACEBOOK AND INSTAGRAM
                </p>
                <h1 className="font-display text-4xl font-semibold text-foreground lg:text-7xl leading-tight">
                  Event planning, budgets, and recommendations in one command center.
                </h1>
                <p className="max-w-xl text-base text-muted-foreground lg:text-xl leading-relaxed">
                  Eventzella generates budgets, recommends best-fit providers, and orchestrates the next steps for your
                  team. One brief in, clear answers out.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild size="lg" className="bg-brand hover:bg-brand/90 text-white font-bold px-8 h-14 rounded-full shadow-xl shadow-brand/20">
                    <Link href="/login">Access the dashboard</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-white/20 text-white font-bold h-14 px-8 rounded-full bg-white/5 backdrop-blur-md hover:bg-white/10">
                    <Link href="/signup">Create an enterprise account</Link>
                  </Button>
                </div>
                <div className="grid gap-4 pt-10 sm:grid-cols-3">
                  {stats.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-brand/20 bg-brand/5 p-5 backdrop-blur-sm">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-brand font-black">{item.label}</p>
                      <p className="mt-2 text-3xl font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="grid gap-4"
              >
                {highlights.map((item, index) => (
                  <motion.article
                    key={item.title}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                    className="rounded-[32px] border border-white/5 bg-white/5 p-8 backdrop-blur-2xl hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-foreground group-hover:text-brand transition-colors">{item.title}</h3>
                      <div className="p-2 rounded-full bg-brand/10 text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                    <p className="mt-3 text-base text-muted-foreground leading-relaxed">{item.detail}</p>
                  </motion.article>
                ))}
              </motion.section>
            </div>

            <motion.section 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-40 border-t border-white/5 pt-24"
            >
              <BudgetProviderForm />
            </motion.section>
          </main>
        </div>
      </div>
    </div>
  );
}
