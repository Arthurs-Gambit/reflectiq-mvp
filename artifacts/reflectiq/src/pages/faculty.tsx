import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetHeatmap,
  getGetHeatmapQueryKey,
  useGetClusters,
  getGetClustersQueryKey,
  useUpdateClusterAction,
  useSeedDemoData,
  useGetRawStats,
  getGetRawStatsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Settings,
  RefreshCcw,
  Shield,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { SIGNAL_COLORS, TOPICS, formatSignalName } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SIGNALS = [
  "comprehension",
  "surface_understanding",
  "definitional_gap",
  "causal_reasoning_gap",
  "applied_transfer_difficulty",
  "pacing_concern",
  "support_need",
];

const ALL = "__all__";

function SignalBadge({ signal }: { signal: string }) {
  const colors = SIGNAL_COLORS[signal] ?? { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}
      data-testid={`badge-signal-${signal}`}
    >
      {formatSignalName(signal)}
    </span>
  );
}

function TrendIcon({ direction, delta }: { direction: string; delta: number | null | undefined }) {
  if (direction === "up") return <span className="inline-flex items-center gap-1 text-rose-500 text-xs font-medium"><TrendingUp className="w-3.5 h-3.5" />{delta != null ? `+${delta}` : ""}</span>;
  if (direction === "down") return <span className="inline-flex items-center gap-1 text-green-500 text-xs font-medium"><TrendingDown className="w-3.5 h-3.5" />{delta != null ? `${delta}` : ""}</span>;
  return <span className="inline-flex items-center gap-1 text-muted-foreground text-xs"><Minus className="w-3.5 h-3.5" />Stable</span>;
}

function GovernancePanel() {
  const principles = [
    { title: "No Individual Attribution", desc: "No faculty view, table, or API response links a reflection to any student name or ID." },
    { title: "Aggregation Threshold", desc: "Clusters with fewer than 4 students are automatically suppressed and never reach the dashboard." },
    { title: "No Grading or Ranking", desc: "There are no scores, grades, percentiles, or rankings of any individual anywhere in this system." },
    { title: "Student Disclosure", desc: "Students are told before submitting: responses are anonymized and used only for class-level improvement." },
    { title: "Human Authority", desc: "All action chips are labeled 'Suggested action' — they are never auto-applied without faculty decision." },
    { title: "FERPA-Aware Design", desc: "No PII is persisted. The only stored link is reflection → course/topic/timestamp, never to student identity." },
  ];

  return (
    <Card className="border border-primary/20 bg-primary/5" data-testid="card-governance">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Governance and Responsible-AI Principles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {principles.map((p) => (
            <div key={p.title} className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{p.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RawStatsModal() {
  const [open, setOpen] = useState(false);
  const { data: stats, isLoading } = useGetRawStats({
    query: { enabled: open, queryKey: getGetRawStatsQueryKey() },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-governance-stats">
          <Settings className="w-4 h-4" />
          Privacy Filter
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-raw-stats">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Aggregation Threshold — Live Stats
          </DialogTitle>
          <DialogDescription>
            This shows how the MIN_CLUSTER_SIZE filter works. Raw reflections that fall below the threshold are suppressed from all faculty views.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-foreground" data-testid="text-total-raw">{stats.totalRawReflections}</p>
              <p className="text-sm text-muted-foreground mt-1">Total raw reflections</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-600" data-testid="text-visible-clusters">{stats.visibleClusters}</p>
              <p className="text-sm text-muted-foreground mt-1">Visible clusters</p>
            </div>
            <div className="bg-rose-500/10 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-rose-600" data-testid="text-suppressed-clusters">{stats.suppressedClusters}</p>
              <p className="text-sm text-muted-foreground mt-1">Suppressed clusters (below threshold)</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-primary" data-testid="text-min-cluster-size">{stats.minClusterSize}</p>
              <p className="text-sm text-muted-foreground mt-1">MIN_CLUSTER_SIZE</p>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SeedButton() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const seed = useSeedDemoData();

  const handleSeed = async () => {
    try {
      const result = await seed.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetHeatmapQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetClustersQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetRawStatsQueryKey() });
      setOpen(false);
      toast({
        title: "Demo data regenerated",
        description: `${result.reflectionsCreated} reflections and ${result.clustersCreated} clusters created. ${result.suppressedClusters} clusters suppressed by privacy filter.`,
      });
    } catch {
      toast({ title: "Seed failed", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-seed-open">
          <RefreshCcw className="w-4 h-4" />
          Reset Demo Data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Demo Data?</DialogTitle>
          <DialogDescription>
            This will clear all existing data and regenerate a full synthetic dataset with 180-220 reflections across 5 topics and 3 weeks. The dashboard will be repopulated immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSeed}
            disabled={seed.isPending}
            data-testid="button-seed-confirm"
          >
            {seed.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HeatmapSection({ topic, signal, dateFrom, dateTo }: { topic: string; signal: string; dateFrom: string; dateTo: string }) {
  const params = {
    ...(topic !== ALL ? { topic } : {}),
    ...(signal !== ALL ? { signal } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };

  const { data: rows = [], isLoading } = useGetHeatmap(params, {
    query: { queryKey: getGetHeatmapQueryKey(params) },
  });

  const maxCount = Math.max(...rows.flatMap((r) => Object.values(r.signals)), 1);

  const getIntensity = (count: number) => {
    if (count === 0) return "bg-muted/20";
    const ratio = count / maxCount;
    if (ratio > 0.75) return "bg-rose-500/80 text-white";
    if (ratio > 0.5) return "bg-rose-400/60";
    if (ratio > 0.25) return "bg-rose-300/40";
    return "bg-rose-200/30";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="text-heatmap-empty">
        No reflection data yet. Use "Reset Demo Data" to populate the dashboard.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="heatmap-container">
      <table className="w-full text-sm border-collapse min-w-[700px]">
        <thead>
          <tr>
            <th className="text-left py-2 pr-4 font-semibold text-muted-foreground w-48">Topic</th>
            {SIGNALS.map((s) => (
              <th key={s} className="py-2 px-1 text-center font-medium text-xs text-muted-foreground">
                <div className="w-20 mx-auto leading-tight">{formatSignalName(s)}</div>
              </th>
            ))}
            <th className="py-2 px-2 text-center font-semibold text-muted-foreground">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.topic} className={`border-t border-border ${row.isHotspot ? "bg-rose-500/5" : ""}`} data-testid={`heatmap-row-${row.topic.replace(/\s+/g, '-').toLowerCase()}`}>
              <td className="py-3 pr-4 font-medium text-foreground">
                <div className="flex items-center gap-2">
                  {row.isHotspot && (
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>High gap concentration — flagged for attention</TooltipContent>
                    </Tooltip>
                  )}
                  <span>{row.topic}</span>
                </div>
              </td>
              {SIGNALS.map((s) => {
                const count = (row.signals as Record<string, number>)[s] ?? 0;
                return (
                  <td key={s} className="py-3 px-1 text-center" data-testid={`heatmap-cell-${row.topic.replace(/\s+/g, '-').toLowerCase()}-${s}`}>
                    <div className={`w-12 h-10 mx-auto rounded-md flex items-center justify-center text-xs font-semibold transition-all ${getIntensity(count)}`}>
                      {count > 0 ? count : "—"}
                    </div>
                  </td>
                );
              })}
              <td className="py-3 px-2 text-center font-bold text-foreground">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClustersSection({ topic, signal, dateFrom, dateTo }: { topic: string; signal: string; dateFrom: string; dateTo: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const params = {
    ...(topic !== ALL ? { topic } : {}),
    ...(signal !== ALL ? { signal } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };

  const { data: clusters = [], isLoading } = useGetClusters(params, {
    query: { queryKey: getGetClustersQueryKey(params) },
  });

  const updateAction = useUpdateClusterAction();

  const handleAction = async (id: number, actionStatus: string) => {
    try {
      await updateAction.mutateAsync({ id, data: { actionStatus } });
      await queryClient.invalidateQueries({ queryKey: getGetClustersQueryKey(params) });
      toast({ title: `Cluster ${actionStatus}` });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (clusters.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="text-clusters-empty">
        No clusters meet the aggregation threshold yet. Try resetting demo data or submitting more reflections.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="clusters-grid">
      {clusters.map((cluster) => {
        const colors = SIGNAL_COLORS[cluster.signal] ?? { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" };
        const isActedOn = cluster.actionStatus === "acknowledged" || cluster.actionStatus === "dismissed";

        return (
          <Card
            key={cluster.id}
            className={`flex flex-col transition-all hover:shadow-md ${isActedOn ? "opacity-60" : ""}`}
            data-testid={`card-cluster-${cluster.id}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs font-medium">{cluster.topic}</Badge>
                  <SignalBadge signal={cluster.signal} />
                </div>
                <TrendIcon direction={cluster.trendDirection} delta={cluster.trendDelta} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-bold text-foreground" data-testid={`text-student-count-${cluster.id}`}>{cluster.studentCount}</span>
                <span className="text-sm text-muted-foreground">students</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3">
              <div className="space-y-2 flex-1">
                {cluster.representativePhrases.slice(0, 3).map((phrase, i) => (
                  <blockquote
                    key={i}
                    className="border-l-2 border-muted pl-3 text-xs text-muted-foreground leading-relaxed italic"
                    data-testid={`text-phrase-${cluster.id}-${i}`}
                  >
                    "{phrase}"
                  </blockquote>
                ))}
              </div>

              <Separator className="my-1" />

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Suggested action</p>
                <div className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`} data-testid={`text-suggested-action-${cluster.id}`}>
                  {cluster.suggestedAction}
                </div>
              </div>

              {isActedOn ? (
                <div className="text-xs text-muted-foreground italic capitalize" data-testid={`text-action-status-${cluster.id}`}>
                  {cluster.actionStatus}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleAction(cluster.id, "acknowledged")}
                    disabled={updateAction.isPending}
                    data-testid={`button-acknowledge-${cluster.id}`}
                  >
                    Acknowledge
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs text-muted-foreground"
                    onClick={() => handleAction(cluster.id, "dismissed")}
                    disabled={updateAction.isPending}
                    data-testid={`button-dismiss-${cluster.id}`}
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function FacultyDashboard() {
  const [topicFilter, setTopicFilter] = useState(ALL);
  const [signalFilter, setSignalFilter] = useState(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [governanceOpen, setGovernanceOpen] = useState(false);

  const summaryParams = {};
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="page-faculty">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link href="/" className="text-muted-foreground hover:text-foreground text-sm transition-colors">&larr; ReflectIQ</Link>
              <h1 className="text-xl font-bold text-foreground mt-0.5" data-testid="text-dashboard-title">Faculty Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <RawStatsModal />
              <SeedButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="summary-strip">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Reflections this week</p>
              {summaryLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded mt-2" />
              ) : (
                <p className="text-3xl font-bold text-foreground mt-1" data-testid="text-total-reflections-week">{summary?.totalReflectionsThisWeek ?? 0}</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Active clusters</p>
              {summaryLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded mt-2" />
              ) : (
                <p className="text-3xl font-bold text-foreground mt-1" data-testid="text-active-clusters">{summary?.activeClusterCount ?? 0}</p>
              )}
            </CardContent>
          </Card>
          <Card className={`border-border ${(summary?.flaggedTopicCount ?? 0) > 0 ? "bg-rose-500/10 border-rose-500/30" : "bg-card"}`}>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Topics flagged for attention</p>
              {summaryLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded mt-2" />
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-3xl font-bold text-foreground" data-testid="text-flagged-topics">{summary?.flaggedTopicCount ?? 0}</p>
                  {(summary?.flaggedTopicCount ?? 0) > 0 && <AlertTriangle className="w-5 h-5 text-rose-500" />}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border" data-testid="filters-bar">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm font-medium text-muted-foreground">Filter:</span>
              <Select value={topicFilter} onValueChange={setTopicFilter}>
                <SelectTrigger className="w-44" data-testid="select-filter-topic">
                  <SelectValue placeholder="All topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All topics</SelectItem>
                  {TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={signalFilter} onValueChange={setSignalFilter}>
                <SelectTrigger className="w-52" data-testid="select-filter-signal">
                  <SelectValue placeholder="All signals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All signals</SelectItem>
                  {SIGNALS.map((s) => (
                    <SelectItem key={s} value={s}>{formatSignalName(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="text-sm border border-border bg-background rounded-md px-3 py-2 text-foreground"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="input-date-from"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <input
                  type="date"
                  className="text-sm border border-border bg-background rounded-md px-3 py-2 text-foreground"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="input-date-to"
                />
              </div>
              {(topicFilter !== ALL || signalFilter !== ALL || dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setTopicFilter(ALL); setSignalFilter(ALL); setDateFrom(""); setDateTo(""); }} data-testid="button-clear-filters">
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Heatmap */}
        <section data-testid="section-heatmap">
          <h2 className="text-lg font-semibold text-foreground mb-4">Topic Learning Patterns</h2>
          <Card className="border-border">
            <CardContent className="pt-6">
              <HeatmapSection topic={topicFilter} signal={signalFilter} dateFrom={dateFrom} dateTo={dateTo} />
            </CardContent>
          </Card>
        </section>

        {/* Cluster cards */}
        <section data-testid="section-clusters">
          <h2 className="text-lg font-semibold text-foreground mb-4">Learning Clusters</h2>
          <ClustersSection topic={topicFilter} signal={signalFilter} dateFrom={dateFrom} dateTo={dateTo} />
        </section>

        {/* Governance */}
        <section data-testid="section-governance">
          <button
            className="w-full flex items-center justify-between text-left"
            onClick={() => setGovernanceOpen(!governanceOpen)}
            data-testid="button-toggle-governance"
          >
            <h2 className="text-lg font-semibold text-foreground">Governance and Privacy Principles</h2>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${governanceOpen ? "rotate-180" : ""}`} />
          </button>
          {governanceOpen && (
            <div className="mt-4">
              <GovernancePanel />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
