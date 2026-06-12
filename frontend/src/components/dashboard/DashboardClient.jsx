"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchDashboard, fetchDwhSummary } from "@/lib/enterpriseApi";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import ChartCard from "./ChartCard";
import KpiCard from "./KpiCard";

const chartColors = {
  primary: "hsl(var(--brand))",
  secondary: "hsl(var(--accent))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  danger: "hsl(var(--danger))",
  muted: "hsl(var(--muted-foreground))",
};

const pieColors = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.success,
  chartColors.warning,
  chartColors.danger,
];

const POWERBI_EMBEDS = {
  ceo: "https://app.powerbi.com/reportEmbed?reportId=dc7eba58-d54c-40a8-a33e-bd09752178b0&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730&filterPaneEnabled=false&navContentPaneEnabled=false&pageNavigationEnabled=false",
  quality: "https://app.powerbi.com/reportEmbed?reportId=538cfe4d-7e77-4f86-9e09-9a32fc358a86&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730&filterPaneEnabled=false&navContentPaneEnabled=false&pageNavigationEnabled=false",
  business: "https://app.powerbi.com/reportEmbed?reportId=08789f8c-f1b3-4533-849a-bf5ff4671d14&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730&filterPaneEnabled=false&navContentPaneEnabled=false&pageNavigationEnabled=false",
  marketing: "https://app.powerbi.com/reportEmbed?reportId=77fe263b-b50b-41df-a2bc-9c2ac6637373&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730&filterPaneEnabled=false&navContentPaneEnabled=false&pageNavigationEnabled=false",
};

const ROLE_META = {
  ceo: { label: "CEO", focus: "Executive command center" },
  quality: { label: "Quality Manager", focus: "Quality & risk intelligence" },
  business: { label: "Business Manager", focus: "Operations performance" },
  marketing: { label: "Marketing Manager", focus: "Campaign intelligence" },
};

export default function DashboardClient({ role }) {
  const roleKey = String(role || "").toLowerCase();
  const useBackend = process.env.NEXT_PUBLIC_DASHBOARD_SOURCE === "backend";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(useBackend);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("");
  const [dwhSummary, setDwhSummary] = useState(null);
  const [dwhError, setDwhError] = useState("");

  const fallbackData = useMemo(() => {
    const meta = ROLE_META[roleKey] || { label: "Executive", focus: "Decision intelligence" };
    return {
      roleName: meta.label,
      focus: meta.focus,
      lastUpdated: null,
      kpis: [],
      charts: {},
      insights: [],
      predictions: {},
      alerts: [],
      recommendations: [],
    };
  }, [roleKey]);

  const loadData = async () => {
    if (!useBackend) {
      setLoading(false);
      setError("");
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = await fetchDashboard(role);
      setData(payload);
    } catch (err) {
      setError(err.message || "Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (!useBackend) {
      return undefined;
    }
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [role, useBackend]);

  useEffect(() => {
    let cancelled = false;
    const loadSummary = async () => {
      try {
        const summary = await fetchDwhSummary();
        if (!cancelled) {
          setDwhSummary(summary);
          setDwhError("");
        }
      } catch (err) {
        if (!cancelled) {
          setDwhError(err.message || "Impossible de charger les donnees DWH");
        }
      }
    };
    loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const source = data?.lastUpdated || Date.now();
    setLastUpdatedLabel(new Date(source).toLocaleTimeString());
  }, [data?.lastUpdated]);

  if (useBackend && loading && !data) {
    return <p className="text-sm text-muted-foreground">Loading executive dashboard...</p>;
  }

  if (useBackend && error) {
    return (
      <Card>
        <p className="text-sm text-danger">{error}</p>
        <Button className="mt-4" onClick={loadData}>
          Retry
        </Button>
      </Card>
    );
  }

  const viewData = data || fallbackData;
  const embedUrl = POWERBI_EMBEDS[roleKey] || "";
  const currency = new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 0,
  });
  const integer = new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat("fr-TN", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  });
  const formatMonthLabel = (value) => {
    if (!value || typeof value !== "string") return "";
    const [year, month] = value.split("-");
    if (!year || !month) return value;
    const date = new Date(Number(year), Number(month) - 1, 1);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("fr-TN", { month: "short", year: "2-digit" });
  };
  const axisStyle = {
    stroke: "hsl(var(--border))",
    tickLine: false,
    axisLine: false,
    tick: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
  };
  const marketingTrend = useMemo(() => {
    if (viewData?.charts?.marketingTrend?.length) return viewData.charts.marketingTrend;
    if (dwhSummary?.marketing?.length) return dwhSummary.marketing;
    return [];
  }, [viewData?.charts?.marketingTrend, dwhSummary?.marketing]);
  const showMarketingTrend = roleKey === "marketing" && marketingTrend.length > 0;
  const reservationStatus = dwhSummary?.reservation_status || [];
  const visitorsTrend = dwhSummary?.visitors || [];
  const topCities = dwhSummary?.top_cities || [];
  const maxSeriesLength = Math.max(
    dwhSummary?.monthly?.length || 0,
    reservationStatus.length,
    visitorsTrend.length,
    marketingTrend.length
  );
  const xTickInterval = maxSeriesLength > 24 ? 2 : maxSeriesLength > 16 ? 1 : 0;
  const xAxisProps = {
    ...axisStyle,
    tickFormatter: formatMonthLabel,
    angle: -25,
    textAnchor: "end",
    interval: xTickInterval,
    minTickGap: 18,
    height: 48,
  };
  const yAxisProps = {
    ...axisStyle,
    tickFormatter: (value) => compact.format(value),
  };
  const gridProps = {
    strokeDasharray: "3 3",
    stroke: "hsl(var(--border))",
    strokeOpacity: 0.2,
  };
  const dwhKpis = dwhSummary?.kpis
    ? [
        { label: "Bookings", value: integer.format(dwhSummary.kpis.events || 0) },
        { label: "Total Budget", value: currency.format(dwhSummary.kpis.total_budget || 0) },
        { label: "Average Budget", value: currency.format(dwhSummary.kpis.avg_budget || 0) },
        { label: "Average Guests", value: integer.format(dwhSummary.kpis.avg_guests || 0) },
      ]
    : [];

  return (
    <div className="space-y-8">
      <header className="space-y-2 px-6 lg:px-10">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{viewData.roleName}</p>
        <h1 className="font-display text-3xl text-foreground">{viewData.focus}</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Last updated: {lastUpdatedLabel || "--:--:--"}.
        </p>
      </header>

      <section className="px-6 lg:px-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brand font-black">Eventzella DWH</p>
            <h2 className="text-2xl font-bold text-foreground">Dynamic Intelligence Overview</h2>
          </div>
          <p className="text-xs text-muted-foreground font-bold">Real-time Synchronization</p>
        </div>

        {dwhError ? (
          <p className="mt-4 text-sm text-danger">{dwhError}</p>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            {dwhKpis.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-border bg-card px-6 py-6 shadow-md"
          >
            <p className="text-lg font-bold text-foreground">Event Types Distribution</p>
            <div className="mt-6 h-[480px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dwhSummary?.event_types || []}
                    dataKey="events"
                    nameKey="name"
                    innerRadius={110}
                    outerRadius={160}
                    paddingAngle={5}
                  >
                    {(dwhSummary?.event_types || []).map((_, index) => (
                      <Cell key={`dwh-type-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }} />
                  <Legend verticalAlign="bottom" align="center" layout="horizontal" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-border bg-card px-6 py-6 shadow-lg"
          >
            <p className="text-lg font-bold text-foreground">Bookings per Month</p>
            <div className="mt-6 h-[480px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dwhSummary?.monthly || []} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
                  <CartesianGrid {...gridProps} vertical={false} />
                  <XAxis dataKey="month" {...xAxisProps} height={60} />
                  <YAxis {...yAxisProps} width={60} />
                  <Tooltip formatter={(value) => integer.format(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }} />
                  <Bar
                    dataKey="events"
                    fill={chartColors.primary}
                    radius={[8, 8, 0, 0]}
                    animationDuration={1000}
                    animationEasing="ease-out"
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        <div className="mt-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl border border-border bg-card px-6 py-6 shadow-lg"
          >
            <p className="text-lg font-bold text-foreground">Monthly Budget</p>
            <div className="mt-6 h-[480px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dwhSummary?.monthly || []} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
                  <CartesianGrid {...gridProps} vertical={false} />
                  <XAxis dataKey="month" {...xAxisProps} height={60} />
                  <YAxis {...yAxisProps} width={80} />
                  <Tooltip formatter={(value) => currency.format(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }} />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    stroke={chartColors.secondary}
                    strokeWidth={4}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </section>

      {embedUrl && (
        <section className="-mx-6 lg:-mx-10 bg-black">
          <iframe
            src={embedUrl}
            className="block h-[88vh] min-h-[720px] w-full border-0"
            title={`PowerBI - ${viewData.roleName}`}
            allowFullScreen
          />
        </section>
      )}

      <section className="grid gap-4 px-6 lg:grid-cols-2 xl:grid-cols-4 lg:px-10">
        {(viewData.kpis || []).map((kpi, index) => (
          <KpiCard key={kpi.label} {...kpi} index={index} />
        ))}
      </section>

      {/* PowerBI Space - High Priority for Professionals */}
      <section className="grid gap-8 px-6 lg:grid-cols-2 lg:px-12">
        <ChartCard title="Booking Status" description="Confirmed, Pending, Cancelled">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reservationStatus} margin={{ top: 10, right: 10, left: 6, bottom: 24 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip formatter={(value) => integer.format(value)} />
                <Legend />
                <Bar dataKey="confirmed" name="Confirmed" stackId="a" fill={chartColors.success} animationDuration={700} />
                <Bar dataKey="pending" name="Pending" stackId="a" fill={chartColors.warning} animationDuration={700} />
                <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill={chartColors.danger} animationDuration={700} />
                <Bar dataKey="other" name="Other" stackId="a" fill={chartColors.muted} animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Visitor to Booking Conversion" description="Visitors vs Bookings">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitorsTrend} margin={{ top: 10, right: 10, left: 6, bottom: 24 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip formatter={(value) => integer.format(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="visitors"
                  name="Visitors"
                  stroke={chartColors.primary}
                  strokeWidth={3}
                  animationDuration={900}
                  animationEasing="ease-out"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="reservations"
                  name="Bookings"
                  stroke={chartColors.success}
                  strokeWidth={3}
                  animationDuration={900}
                  animationEasing="ease-out"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <section className={`grid gap-8 px-6 lg:px-12 ${showMarketingTrend ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
        <ChartCard title="Top Provider Cities" description="Providers per City">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCities} layout="vertical" margin={{ top: 10, right: 10, left: 40, bottom: 10 }}>
                <CartesianGrid {...gridProps} />
                <XAxis type="number" {...axisStyle} tickFormatter={(value) => compact.format(value)} />
                <YAxis dataKey="name" type="category" {...axisStyle} width={120} />
                <Tooltip formatter={(value) => integer.format(value)} />
                <Bar
                  dataKey="providers"
                  fill={chartColors.secondary}
                  radius={[0, 8, 8, 0]}
                  animationDuration={700}
                  animationEasing="ease-out"
                  maxBarSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {showMarketingTrend ? (
          <ChartCard title="Marketing Spend & New Beneficiaries" description="Monthly Campaign Evolution">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={marketingTrend} margin={{ top: 10, right: 10, left: 6, bottom: 24 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" {...xAxisProps} />
                  <YAxis {...yAxisProps} />
                  <Tooltip
                    formatter={(value, _name, item) =>
                      item?.dataKey === "spend" ? currency.format(value) : integer.format(value)
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="spend"
                    name="Marketing Spend"
                    stroke={chartColors.primary}
                    strokeWidth={3}
                    animationDuration={900}
                    animationEasing="ease-out"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="new_beneficiaries"
                    name="New Beneficiaries"
                    stroke={chartColors.success}
                    strokeWidth={3}
                    animationDuration={900}
                    animationEasing="ease-out"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        ) : null}
      </section>

      {/* Marketing Manager Actions */}
      {roleKey === "marketing" && (
        <section className="px-6 lg:px-12">
          <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand font-black">AI Marketing Tools</p>
                <h2 className="text-2xl font-bold text-foreground">Intelligent Quote Generator</h2>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Link href="/intelligent-quote">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-xl border border-border bg-gradient-to-br from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 px-6 py-8 shadow-sm transition-all duration-200 cursor-pointer text-left group h-full"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-brand transition-colors">
                        Generate Intelligent Quote
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Create AI-powered quotes with provider recommendations and pricing analysis
                      </p>
                      <div className="mt-4 inline-block px-3 py-1 bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 text-xs font-semibold rounded-full">
                        Click to Open Form
                      </div>
                    </div>
                    <span className="text-3xl ml-4">✨</span>
                  </div>
                </motion.div>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Insights and Alerts removed per user request */}

      {/* Recommendations removed per user request */}
    </div>
  );
}
