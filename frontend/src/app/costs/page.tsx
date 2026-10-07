'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Cloud,
  Cpu,
  Database,
  DollarSign,
  Flame,
  Globe,
  HardDrive,
  Info,
  Lightbulb,
  Network,
  Scale,
  Server,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  api,
  CostSummaryProject,
  CostRecommendation,
  CloudCostBreakdown,
  ScalingScenario,
  OptimizationTip,
  RightsizingRecommendation,
} from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { formatUsd } from '../../lib/format';
import { PageHeader } from '../../components/cerebro/app-shell';
import { Panel, EmptyState, Skeleton, Segmented } from '../../components/cerebro/ui-kit';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

/* ============================================================
   Constants
   ============================================================ */

const PROVIDER_COLORS: Record<string, string> = {
  AWS: '#FF9900',
  AZURE: '#0078D4',
  GCP: '#4285F4',
};

const PROVIDER_LABELS: Record<string, string> = {
  AWS: 'Amazon Web Services',
  AZURE: 'Microsoft Azure',
  GCP: 'Google Cloud Platform',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  compute: <Cpu size={14} />,
  database: <Database size={14} />,
  storage: <HardDrive size={14} />,
  network: <Network size={14} />,
  architecture: <Globe size={14} />,
  billing: <DollarSign size={14} />,
};

const EFFORT_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80' },
  medium: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' },
  high: { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' },
};

const IMPACT_COLORS = EFFORT_COLORS;

const TABS = [
  { key: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
  { key: 'compare', label: 'Multi-Cloud Compare', icon: <Scale size={14} /> },
  { key: 'optimize', label: 'Optimization Advisor', icon: <Lightbulb size={14} /> },
  { key: 'scaling', label: 'Scaling & Traffic', icon: <TrendingUp size={14} /> },
  { key: 'trends', label: 'Trends & Forecast', icon: <Flame size={14} /> },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const PROVIDER_REGIONS: Record<'AWS' | 'AZURE' | 'GCP', string[]> = {
  AWS: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
  AZURE: ['eastus', 'westeurope', 'southeastasia'],
  GCP: ['us-central1', 'us-east1', 'europe-west1', 'asia-southeast1'],
};

/* ============================================================
   Shared chart config
   ============================================================ */

const axisProps = {
  stroke: 'transparent',
  tick: { fill: 'var(--ink-muted)', fontSize: 9.5, fontFamily: 'var(--font-mono)' },
  tickLine: false,
} as const;

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-[var(--r-sm)] px-3 py-2.5 text-xs shadow-xl"
      style={{
        background: 'var(--surface-3)',
        border: '1px solid var(--border-strong)',
        color: 'var(--ink)',
      }}
    >
      <div className="mb-1.5 font-medium" style={{ color: 'var(--ink-muted)', fontSize: 10 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 num">
          <span className="w-2 h-2 rounded-[2px] inline-block flex-none" style={{ background: p.color || p.stroke || p.fill }} />
          <span style={{ color: 'var(--ink-secondary)' }}>{p.name}</span>
          <span className="ml-auto font-semibold pl-3">{formatUsd(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Main Component
   ============================================================ */

export default function CostOptimizationCenter() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('overview');

  // Shared state
  const [provider, setProvider] = useState<'AWS' | 'AZURE' | 'GCP'>('AWS');
  const [workload, setWorkload] = useState('web-medium');
  const [region, setRegion] = useState('us-east-1');

  // What-if estimator
  const [archetype, setArchetype] = useState('web');
  const [instanceCount, setInstanceCount] = useState(2);
  const [volumeSize, setVolumeSize] = useState(20);

  // Trend controls
  const [baseMonthly, setBaseMonthly] = useState(150);
  const [growthRate, setGrowthRate] = useState(8);

  // ---- Queries ----
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['costs-summary'],
    queryFn: () => api.costs.summary(),
    enabled: !!user,
    refetchInterval: 60000,
  });

  React.useEffect(() => {
    if (summaryData?.monthlyTotalUsd && summaryData.monthlyTotalUsd > 0) {
      setBaseMonthly(Math.round(summaryData.monthlyTotalUsd));
    }
  }, [summaryData?.monthlyTotalUsd]);

  const { data: optData, isLoading: optLoading } = useQuery({
    queryKey: ['costs-optimizations'],
    queryFn: () => api.costs.optimizations(),
    enabled: !!user,
    refetchInterval: 120000,
  });

  const { data: estimateData, isFetching: estimating } = useQuery({
    queryKey: ['costs-estimate', provider, region, archetype, instanceCount, volumeSize],
    queryFn: () =>
      api.costs.estimate({
        templateName: archetype,
        provider,
        region,
        configuration: { instance_count: instanceCount, volume_size: volumeSize },
      }),
    enabled: !!user,
  });

  const { data: compareData, isLoading: compareLoading } = useQuery({
    queryKey: ['costs-compare', workload],
    queryFn: () => api.costs.compare(workload),
    enabled: !!user && (tab === 'compare' || tab === 'overview'),
  });

  const { data: scalingData, isLoading: scalingLoading } = useQuery({
    queryKey: ['costs-scaling', provider, workload],
    queryFn: () => api.costs.scaling(provider, workload),
    enabled: !!user && tab === 'scaling',
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['costs-trends', provider, baseMonthly, growthRate],
    queryFn: () => api.costs.trends(provider, baseMonthly, growthRate),
    enabled: !!user && tab === 'trends',
  });

  const { data: rightsizingData, isLoading: rightsizingLoading } = useQuery({
    queryKey: ['costs-rightsizing', provider, workload],
    queryFn: () => api.costs.rightsizing(provider, workload),
    enabled: !!user && (tab === 'optimize' || tab === 'overview'),
  });

  const { data: tipsData } = useQuery({
    queryKey: ['costs-tips', provider],
    queryFn: () => api.costs.tips(provider),
    enabled: !!user,
  });

  const { data: profilesData } = useQuery({
    queryKey: ['costs-workload-profiles'],
    queryFn: () => api.costs.workloadProfiles(),
    enabled: !!user,
  });

  const projects: CostSummaryProject[] = summaryData?.projects ?? [];
  const recommendations: CostRecommendation[] = optData?.recommendations ?? [];
  const regions = useMemo(() => PROVIDER_REGIONS[provider], [provider]);

  const onProviderChange = (v: string) => {
    const p = v as 'AWS' | 'AZURE' | 'GCP';
    setProvider(p);
    setRegion(PROVIDER_REGIONS[p][0]);
  };

  if (!user) {
    return (
      <div>
        <PageHeader title="Cost Optimization Center" sub="Sign in to access cost intelligence." />
        <Panel>
          <EmptyState
            icon={<DollarSign size={22} />}
            title="Authentication required"
            body="Sign in to explore cost analytics, multi-cloud comparisons, and optimization recommendations."
          />
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Cost Optimization Center"
        sub="Real-time cost intelligence · Multi-cloud comparison · Scaling projections · Optimization advisor"
      />

      {/* Tab Navigation */}
      <div
        className="flex items-center gap-1 mb-5 px-1 py-1 rounded-[var(--r-md)] overflow-x-auto"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-faint)' }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--r-sm)] text-xs font-medium whitespace-nowrap transition-all"
            style={{
              background: tab === t.key ? 'var(--surface-3)' : 'transparent',
              color: tab === t.key ? 'var(--ink)' : 'var(--ink-muted)',
              border: tab === t.key ? '1px solid var(--border)' : '1px solid transparent',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Estimate disclaimer */}
      <div
        className="flex items-start gap-2.5 px-4 py-3 rounded-[var(--r-md)] mb-5 text-xs"
        style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--ink-secondary)' }}
      >
        <Info size={15} className="flex-none mt-0.5" style={{ color: 'var(--accent-strong)' }} />
        <p>
          All figures are offline rate-card estimates (USD/month). They exclude egress surcharges, software licenses, tax/credits and free-tier effects — not a guarantee of your actual invoice.
        </p>
      </div>

      {/* ============================================================
         TAB: Overview
         ============================================================ */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-5">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Monthly Spend"
              value={summaryData ? formatUsd(summaryData.monthlyTotalUsd) : '—'}
              sub="estimated"
              icon={<DollarSign size={16} />}
              loading={summaryLoading}
            />
            <KpiCard
              label="Potential Savings"
              value={optData ? formatUsd(optData.totalEstimatedMonthlySavingsUsd) : '—'}
              sub={optData ? `${optData.savingsPct}% reduction` : ''}
              icon={<TrendingDown size={16} />}
              loading={optLoading}
              accent="success"
            />
            <KpiCard
              label="Recommendations"
              value={String(recommendations.length)}
              sub="actionable"
              icon={<Lightbulb size={16} />}
              loading={optLoading}
            />
            <KpiCard
              label="Cheapest Cloud"
              value={compareData?.cheapestProvider ?? '—'}
              sub={compareData ? `saves ${formatUsd(compareData.maxSavingsUsd)}/mo` : ''}
              icon={<Cloud size={16} />}
              loading={compareLoading}
              accent="accent"
            />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Per-project spend */}
            <Panel className="lg:col-span-2" title="Monthly Spend by Project" subtitle={summaryData ? `computed ${new Date(summaryData.computedAt).toLocaleTimeString()}` : ''}>
              {summaryLoading ? (
                <div className="px-4 py-6"><Skeleton className="h-[200px]" /></div>
              ) : !summaryData || projects.length === 0 ? (
                <EmptyState
                  icon={<DollarSign size={22} />}
                  title="Nothing to estimate yet"
                  body="Costs appear once deployments have provisioned resources."
                  action={<a href="/deployments/wizard" className="btn-primary">Run a deployment</a>}
                />
              ) : (
                <div className="px-4 py-4">
                  <div className="flex items-end justify-between mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <p className="stat-label">Platform total</p>
                      <p className="num text-[34px] leading-none mt-1" style={{ color: 'var(--ink)' }}>
                        {formatUsd(summaryData.monthlyTotalUsd)}
                        <span className="text-sm ml-1" style={{ color: 'var(--ink-muted)' }}>/mo est.</span>
                      </p>
                    </div>
                    <span className="chip">{summaryData.source}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {projects.map((p) => {
                      const pct = summaryData.monthlyTotalUsd > 0 ? (p.monthlyTotalUsd / summaryData.monthlyTotalUsd) * 100 : 0;
                      return (
                        <div key={p.projectId}>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="font-medium" style={{ color: 'var(--ink)' }}>{p.projectName}</span>
                            <span className="num" style={{ color: 'var(--ink-muted)' }}>
                              {formatUsd(p.monthlyTotalUsd)} · {pct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(pct, 2)}%`,
                                background: 'linear-gradient(90deg, #ffffff, var(--accent))',
                                transition: 'width 500ms var(--ease-out)',
                              }}
                            />
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {p.deployments.map((d) => (
                              <a key={d.deploymentId} href={`/deployments/${d.deploymentId}`} className="chip" title={d.estimate.region ?? ''}>
                                {d.environmentName ?? 'env'} · {formatUsd(d.estimate.monthlyTotalUsd)}/mo
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Panel>

            {/* What-if estimator */}
            <Panel title="What-if Estimator" subtitle="Price a config before deploying">
              <div className="px-4 py-4 flex flex-col gap-4 text-sm">
                <div>
                  <p className="stat-label mb-1.5">Provider</p>
                  <Segmented
                    value={provider}
                    onChange={onProviderChange}
                    options={[
                      { key: 'AWS', label: 'AWS' },
                      { key: 'AZURE', label: 'Azure' },
                      { key: 'GCP', label: 'GCP' },
                    ]}
                  />
                </div>
                <div>
                  <p className="stat-label mb-1.5">Workload archetype</p>
                  <Segmented
                    value={archetype}
                    onChange={setArchetype}
                    options={[
                      { key: 'web', label: 'Web app' },
                      { key: 'database', label: 'Database' },
                      { key: 'cluster', label: 'Cluster' },
                    ]}
                  />
                </div>
                <div>
                  <p className="stat-label mb-1.5">Region</p>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full h-[34px] px-2.5 rounded-[var(--r-sm)] text-xs"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                    aria-label="Region"
                  >
                    {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="stat-label mb-1.5">Instances</p>
                    <input
                      type="number" min={1} max={20} value={instanceCount}
                      onChange={(e) => setInstanceCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                      className="w-full h-[34px] px-2.5 rounded-[var(--r-sm)] text-xs"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                      aria-label="Instance count"
                    />
                  </div>
                  <div>
                    <p className="stat-label mb-1.5">Volume (GB)</p>
                    <input
                      type="number" min={8} max={500} step={8} value={volumeSize}
                      onChange={(e) => setVolumeSize(Math.max(8, Math.min(500, Number(e.target.value) || 8)))}
                      className="w-full h-[34px] px-2.5 rounded-[var(--r-sm)] text-xs"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                      aria-label="Volume size"
                    />
                  </div>
                </div>
                <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="stat-label">Estimated monthly</p>
                  <p className="num text-[28px] leading-none mt-1" style={{ color: 'var(--accent-strong)' }}>
                    {estimating ? '…' : estimateData ? formatUsd(estimateData.estimate.monthlyTotalUsd) : '—'}
                  </p>
                  <div className="mt-2 flex flex-col gap-1">
                    {(estimateData?.estimate.lineItems ?? []).map((li) => (
                      <div key={li.resourceType} className="flex justify-between text-[11.5px]">
                        <span style={{ color: 'var(--ink-muted)' }}>{li.label} × {li.quantity}</span>
                        <span className="num" style={{ color: 'var(--ink)' }}>{formatUsd(li.monthlyUsd)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* Mini multi-cloud comparison preview */}
          {compareData && (
            <Panel title="Quick Cloud Comparison" subtitle={compareData.workloadDescription}>
              <div className="px-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {compareData.comparisons.map((c) => (
                    <div
                      key={c.provider}
                      className="p-4 rounded-[var(--r-md)] relative"
                      style={{
                        border: c.provider === compareData.cheapestProvider ? '2px solid var(--success)' : '1px solid var(--border)',
                        background: 'var(--surface)',
                      }}
                    >
                      {c.provider === compareData.cheapestProvider && (
                        <span className="absolute -top-2.5 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--success)', color: '#000' }}>
                          BEST VALUE
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-3 h-3 rounded-full" style={{ background: PROVIDER_COLORS[c.provider] }} />
                        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{c.provider}</span>
                      </div>
                      <p className="num text-[24px] font-bold" style={{ color: 'var(--ink)' }}>{formatUsd(c.total)}<span className="text-xs font-normal ml-1" style={{ color: 'var(--ink-muted)' }}>/mo</span></p>
                      <div className="mt-2 flex flex-col gap-0.5 text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                        <span>Compute: {formatUsd(c.compute)}</span>
                        <span>Database: {formatUsd(c.database)}</span>
                        <span>Storage: {formatUsd(c.storage)}</span>
                        <span>Network: {formatUsd(c.network)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setTab('compare')}
                  className="mt-3 text-xs flex items-center gap-1"
                  style={{ color: 'var(--accent-strong)' }}
                >
                  View detailed comparison <ArrowRight size={12} />
                </button>
              </div>
            </Panel>
          )}

          {/* Optimization tips carousel */}
          {tipsData && tipsData.tips.length > 0 && (
            <Panel title="Quick Optimization Tips" subtitle={`${provider}-specific and universal recommendations`}>
              <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tipsData.tips.slice(0, 6).map((tip) => (
                  <TipCard key={tip.id} tip={tip} />
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* ============================================================
         TAB: Multi-Cloud Compare
         ============================================================ */}
      {tab === 'compare' && (
        <div className="flex flex-col gap-5">
          {/* Workload selector */}
          <Panel title="Select Workload Profile" subtitle="Choose a workload to compare across AWS, Azure, and GCP">
            <div className="px-4 py-4">
              <div className="flex flex-wrap gap-2">
                {(profilesData?.profiles ?? []).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setWorkload(p.id)}
                    className="px-3.5 py-2 rounded-[var(--r-sm)] text-xs transition-all"
                    style={{
                      border: workload === p.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: workload === p.id ? 'var(--surface-3)' : 'var(--surface)',
                      color: workload === p.id ? 'var(--ink)' : 'var(--ink-secondary)',
                    }}
                  >
                    <span className="font-semibold">{p.label}</span>
                    <br />
                    <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>{p.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {compareLoading ? (
            <Skeleton className="h-[400px]" />
          ) : compareData ? (
            <>
              {/* Side-by-side cost comparison */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {compareData.comparisons.map((c) => (
                  <Panel
                    key={c.provider}
                    title={c.providerBadge}
                    subtitle={c.provider === compareData.cheapestProvider ? '★ Most cost-effective' : ''}
                  >
                    <div className="px-4 py-4">
                      <p className="num text-[32px] font-bold leading-none" style={{ color: PROVIDER_COLORS[c.provider] }}>
                        {formatUsd(c.total)}
                        <span className="text-sm font-normal ml-1" style={{ color: 'var(--ink-muted)' }}>/mo</span>
                      </p>

                      {/* Cost breakdown bar */}
                      <div className="mt-4 flex flex-col gap-2">
                        {[
                          { label: 'Compute', value: c.compute, color: '#818cf8' },
                          { label: 'Database', value: c.database, color: '#fb923c' },
                          { label: 'Storage', value: c.storage, color: '#34d399' },
                          { label: 'Network', value: c.network, color: '#f472b6' },
                          { label: 'Cluster', value: c.cluster, color: '#a78bfa' },
                        ].filter((item) => item.value > 0).map((item) => {
                          const pct = c.total > 0 ? (item.value / c.total) * 100 : 0;
                          return (
                            <div key={item.label}>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span style={{ color: 'var(--ink-secondary)' }}>{item.label}</span>
                                <span className="num" style={{ color: 'var(--ink)' }}>{formatUsd(item.value)} ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1)}%`, background: item.color, transition: 'width 500ms' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Savings plans */}
                      <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <p className="stat-label mb-2">Savings Plans</p>
                        <div className="flex flex-col gap-1.5">
                          {c.savingsPlans.filter((sp) => sp.discountPct > 0).map((sp) => (
                            <div key={sp.plan} className="flex justify-between text-[11px]">
                              <span style={{ color: 'var(--ink-secondary)' }}>{sp.plan} ({sp.discountPct}% off)</span>
                              <span className="num font-semibold" style={{ color: 'var(--success)' }}>{formatUsd(sp.projectedTotal)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                          Best: <strong style={{ color: 'var(--success)' }}>{c.cheapestPlan}</strong> at {formatUsd(c.cheapestTotal)}/mo
                        </div>
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>

              {/* Visual comparison chart */}
              <Panel title="Visual Cost Breakdown" subtitle="Side-by-side comparison across providers">
                <div className="px-4 py-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={compareData.comparisons.map((c) => ({
                        provider: c.provider,
                        Compute: c.compute,
                        Database: c.database,
                        Storage: c.storage,
                        Network: c.network,
                        Cluster: c.cluster,
                      }))}
                      margin={{ top: 8, right: 4, bottom: 0, left: -14 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-faint)" />
                      <XAxis dataKey="provider" {...axisProps} />
                      <YAxis {...axisProps} width={50} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'var(--surface-hover)' }} />
                      <Bar dataKey="Compute" stackId="1" fill="#818cf8" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Database" stackId="1" fill="#fb923c" />
                      <Bar dataKey="Storage" stackId="1" fill="#34d399" />
                      <Bar dataKey="Network" stackId="1" fill="#f472b6" />
                      <Bar dataKey="Cluster" stackId="1" fill="#a78bfa" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 justify-center mt-2 text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                    {[
                      { label: 'Compute', color: '#818cf8' },
                      { label: 'Database', color: '#fb923c' },
                      { label: 'Storage', color: '#34d399' },
                      { label: 'Network', color: '#f472b6' },
                      { label: 'Cluster', color: '#a78bfa' },
                    ].map((l) => (
                      <span key={l.label} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-[2px]" style={{ background: l.color }} /> {l.label}
                      </span>
                    ))}
                  </div>
                </div>
              </Panel>

              {/* Recommendation */}
              <div
                className="p-4 rounded-[var(--r-md)] text-sm"
                style={{ background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)', color: 'var(--ink-secondary)' }}
              >
                <div className="flex items-start gap-2">
                  <Sparkles size={16} className="flex-none mt-0.5" style={{ color: 'var(--success)' }} />
                  <p>{compareData.recommendation}</p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ============================================================
         TAB: Optimization Advisor
         ============================================================ */}
      {tab === 'optimize' && (
        <div className="flex flex-col gap-5">
          {/* Deployment-level recommendations */}
          <Panel title="Deployment Optimization Recommendations" subtitle="Based on your active infrastructure">
            {optLoading ? (
              <div className="px-4 py-6"><Skeleton className="h-[200px]" /></div>
            ) : recommendations.length === 0 ? (
              <EmptyState
                icon={<TrendingDown size={22} />}
                title="No optimizations flagged"
                body="Configurations look lean right now. Recommendations appear when volumes are oversized, non-production fleets run redundant instances, or regions are priced above equivalents."
              />
            ) : (
              <div className="px-4 py-4">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p className="stat-label">Projected spend if applied</p>
                    <p className="num text-[30px] leading-none mt-1" style={{ color: 'var(--ink)' }}>
                      {formatUsd(optData!.projectedMonthlyUsd)}
                      <span className="text-sm ml-1" style={{ color: 'var(--ink-muted)' }}>/mo est.</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge" style={{ color: 'var(--success)', background: 'var(--success-soft)' }}>
                      −{formatUsd(optData!.totalEstimatedMonthlySavingsUsd)}/mo ({optData!.savingsPct}%)
                    </span>
                    <span className="chip">from {formatUsd(optData!.currentMonthlyUsd)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {recommendations.map((rec) => (
                    <RecommendationCard key={rec.id} rec={rec} />
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {/* Rightsizing */}
          <Panel title="Resource Rightsizing Intelligence" subtitle="Tier-level analysis for your workload profile">
            <div className="px-4 py-3 flex gap-3 items-center" style={{ borderBottom: '1px solid var(--border)' }}>
              <Segmented
                value={provider}
                onChange={onProviderChange}
                options={[
                  { key: 'AWS', label: 'AWS' },
                  { key: 'AZURE', label: 'Azure' },
                  { key: 'GCP', label: 'GCP' },
                ]}
              />
              <select
                value={workload}
                onChange={(e) => setWorkload(e.target.value)}
                className="h-[32px] px-2 rounded-[var(--r-sm)] text-xs"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
              >
                {(profilesData?.profiles ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            {rightsizingLoading ? (
              <div className="px-4 py-6"><Skeleton className="h-[200px]" /></div>
            ) : rightsizingData && rightsizingData.recommendations.length > 0 ? (
              <div className="px-4 py-4">
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div>
                    <span className="stat-label">Current</span>
                    <p className="num text-lg font-bold" style={{ color: 'var(--ink)' }}>{formatUsd(rightsizingData.totalCurrentMonthly)}/mo</p>
                  </div>
                  <ArrowRight size={16} style={{ color: 'var(--ink-muted)' }} />
                  <div>
                    <span className="stat-label">After rightsizing</span>
                    <p className="num text-lg font-bold" style={{ color: 'var(--success)' }}>{formatUsd(rightsizingData.totalSuggestedMonthly)}/mo</p>
                  </div>
                  <span className="badge ml-2" style={{ color: 'var(--success)', background: 'var(--success-soft)' }}>
                    −{formatUsd(rightsizingData.totalMonthlySavings)}/mo ({rightsizingData.savingsPct}%)
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {rightsizingData.recommendations.map((r) => (
                    <RightsizingCard key={r.id} rec={r} />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Server size={22} />}
                title="Already right-sized"
                body="This workload profile is already using optimal resource tiers."
              />
            )}
          </Panel>

          {/* Tips */}
          {tipsData && (
            <Panel title="Provider Optimization Tips" subtitle={`Best practices for ${provider} and universal`}>
              <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tipsData.tips.map((tip) => (
                  <TipCard key={tip.id} tip={tip} />
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* ============================================================
         TAB: Scaling & Traffic
         ============================================================ */}
      {tab === 'scaling' && (
        <div className="flex flex-col gap-5">
          {/* Controls */}
          <Panel title="Scaling Scenario Configuration">
            <div className="px-4 py-3 flex flex-wrap gap-3 items-center">
              <Segmented
                value={provider}
                onChange={onProviderChange}
                options={[
                  { key: 'AWS', label: 'AWS' },
                  { key: 'AZURE', label: 'Azure' },
                  { key: 'GCP', label: 'GCP' },
                ]}
              />
              <select
                value={workload}
                onChange={(e) => setWorkload(e.target.value)}
                className="h-[32px] px-2 rounded-[var(--r-sm)] text-xs"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
              >
                {(profilesData?.profiles ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          </Panel>

          {scalingLoading ? (
            <Skeleton className="h-[400px]" />
          ) : scalingData ? (
            <>
              {/* Scaling chart */}
              <Panel title="Cost at Scale" subtitle={`Baseline: ${formatUsd(scalingData.baselineCost)}/mo on ${provider}`}>
                <div className="px-4 py-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={scalingData.scenarios.map((s) => ({
                        label: s.label,
                        Compute: s.computeCost,
                        Database: s.databaseCost,
                        Storage: s.storageCost,
                        Network: s.networkCost,
                      }))}
                      margin={{ top: 8, right: 4, bottom: 0, left: -8 }}
                    >
                      <defs>
                        <linearGradient id="sg-compute" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="sg-db" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fb923c" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#fb923c" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-faint)" />
                      <XAxis dataKey="label" {...axisProps} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis {...axisProps} width={55} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: 'var(--border-strong)' }} />
                      <Area type="monotone" dataKey="Compute" stackId="1" stroke="#818cf8" fill="url(#sg-compute)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="Database" stackId="1" stroke="#fb923c" fill="url(#sg-db)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="Storage" stackId="1" stroke="#34d399" fill="rgba(52,211,153,0.1)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="Network" stackId="1" stroke="#f472b6" fill="rgba(244,114,182,0.1)" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              {/* Scenario cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {scalingData.scenarios.map((s) => (
                  <div
                    key={s.label}
                    className="p-3 rounded-[var(--r-md)] text-center"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>{s.label}</p>
                    <p className="num text-lg font-bold" style={{ color: 'var(--ink)' }}>{formatUsd(s.totalCost)}</p>
                    {s.deltaPct > 0 && (
                      <p className="text-[10px] num" style={{ color: 'var(--warn)' }}>+{s.deltaPct}%</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Scaling strategy & tips */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Panel title="Recommended Scaling Strategy">
                  <div className="px-4 py-4">
                    <div className="p-3 rounded-[var(--r-md)] text-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start gap-2">
                        <Zap size={15} className="flex-none mt-0.5" style={{ color: 'var(--warn)' }} />
                        <p style={{ color: 'var(--ink-secondary)' }}>{scalingData.scalingStrategy}</p>
                      </div>
                    </div>
                  </div>
                </Panel>
                <Panel title="Auto-Scaling Best Practices">
                  <div className="px-4 py-4">
                    <ol className="flex flex-col gap-2 text-xs">
                      {scalingData.autoScalingTips.map((tip, i) => (
                        <li key={i} className="flex gap-2">
                          <span
                            className="num flex-none w-[18px] h-[18px] rounded-[5px] flex items-center justify-center text-[9px] font-bold mt-[1px]"
                            style={{ background: 'var(--surface-3)', color: 'var(--ink-secondary)' }}
                          >
                            {i + 1}
                          </span>
                          <span style={{ color: 'var(--ink-secondary)' }}>{tip}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </Panel>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ============================================================
         TAB: Trends & Forecast
         ============================================================ */}
      {tab === 'trends' && (
        <div className="flex flex-col gap-5">
          {/* Controls */}
          <Panel title="Forecast Parameters">
            <div className="px-4 py-3 flex flex-wrap gap-4 items-end">
              <div>
                <p className="stat-label mb-1">Provider</p>
                <Segmented
                  value={provider}
                  onChange={onProviderChange}
                  options={[
                    { key: 'AWS', label: 'AWS' },
                    { key: 'AZURE', label: 'Azure' },
                    { key: 'GCP', label: 'GCP' },
                  ]}
                />
              </div>
              <div>
                <p className="stat-label mb-1">Base monthly ($)</p>
                <input
                  type="number" min={1} max={100000} value={baseMonthly}
                  onChange={(e) => setBaseMonthly(Math.max(1, Number(e.target.value) || 150))}
                  className="w-[100px] h-[32px] px-2 rounded-[var(--r-sm)] text-xs"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                />
              </div>
              <div>
                <p className="stat-label mb-1">Growth rate (%/yr)</p>
                <input
                  type="number" min={0} max={100} value={growthRate}
                  onChange={(e) => setGrowthRate(Math.max(0, Math.min(100, Number(e.target.value) || 8)))}
                  className="w-[80px] h-[32px] px-2 rounded-[var(--r-sm)] text-xs"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                />
              </div>
            </div>
          </Panel>

          {trendLoading ? (
            <Skeleton className="h-[400px]" />
          ) : trendData ? (
            <>
              {/* Annual KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <KpiCard label="Annual On-Demand" value={formatUsd(trendData.annualOnDemand)} sub="12-month projection" icon={<DollarSign size={16} />} />
                <KpiCard label="Annual Reserved" value={formatUsd(trendData.annualReserved)} sub={`saves ${formatUsd(trendData.annualSavingsReserved)}`} icon={<TrendingDown size={16} />} accent="success" />
                <KpiCard label="Annual Optimized" value={formatUsd(trendData.annualOptimized)} sub={`saves ${formatUsd(trendData.annualSavingsOptimized)}`} icon={<Sparkles size={16} />} accent="success" />
              </div>

              {/* 12-month trend chart */}
              <Panel title="12-Month Cost Projection" subtitle={`${growthRate}% annual growth rate on ${provider}`}>
                <div className="px-4 py-4">
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={trendData.trend} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
                      <defs>
                        <linearGradient id="tg-od" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--ink-muted)" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="var(--ink-muted)" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="tg-res" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="tg-opt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-faint)" />
                      <XAxis dataKey="month" {...axisProps} />
                      <YAxis {...axisProps} width={55} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: 'var(--border-strong)' }} />
                      <Area type="monotone" dataKey="onDemand" name="On-Demand" stroke="var(--ink-muted)" fill="url(#tg-od)" strokeWidth={1.8} strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="reserved" name="Reserved" stroke="#818cf8" fill="url(#tg-res)" strokeWidth={1.8} />
                      <Area type="monotone" dataKey="optimized" name="Fully Optimized" stroke="#4ade80" fill="url(#tg-opt)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex gap-5 justify-center mt-3 text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                    <span className="flex items-center gap-1"><span className="w-4 h-[2px] inline-block" style={{ background: 'var(--ink-muted)', borderTop: '2px dashed var(--ink-muted)' }} /> On-Demand</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-[2px] inline-block" style={{ background: '#818cf8' }} /> Reserved</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-[2px] inline-block" style={{ background: '#4ade80' }} /> Fully Optimized</span>
                  </div>
                </div>
              </Panel>

              {/* Month-by-month table */}
              <Panel title="Monthly Breakdown">
                <div className="px-4 py-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th className="text-left py-2 px-2 font-medium" style={{ color: 'var(--ink-muted)' }}>Month</th>
                        <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--ink-muted)' }}>On-Demand</th>
                        <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--ink-muted)' }}>Reserved</th>
                        <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--ink-muted)' }}>Optimized</th>
                        <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--ink-muted)' }}>Savings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trendData.trend.map((t) => (
                        <tr key={t.month} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                          <td className="py-2 px-2" style={{ color: 'var(--ink)' }}>{t.month}</td>
                          <td className="py-2 px-2 text-right num" style={{ color: 'var(--ink-secondary)' }}>{formatUsd(t.onDemand)}</td>
                          <td className="py-2 px-2 text-right num" style={{ color: '#818cf8' }}>{formatUsd(t.reserved)}</td>
                          <td className="py-2 px-2 text-right num" style={{ color: '#4ade80' }}>{formatUsd(t.optimized)}</td>
                          <td className="py-2 px-2 text-right num font-semibold" style={{ color: 'var(--success)' }}>
                            {formatUsd(t.onDemand - t.optimized)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Sub-components
   ============================================================ */

function KpiCard({
  label,
  value,
  sub,
  icon,
  loading,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  loading?: boolean;
  accent?: 'success' | 'accent';
}) {
  const valueColor = accent === 'success' ? 'var(--success)' : accent === 'accent' ? 'var(--accent-strong)' : 'var(--ink)';
  return (
    <div
      className="p-4 rounded-[var(--r-md)]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {loading ? (
        <Skeleton className="h-[60px]" />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: 'var(--ink-muted)' }}>{icon}</span>
            <span className="stat-label">{label}</span>
          </div>
          <p className="num text-[22px] font-bold leading-none" style={{ color: valueColor }}>{value}</p>
          {sub && <p className="text-[10px] mt-1" style={{ color: 'var(--ink-muted)' }}>{sub}</p>}
        </>
      )}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: CostRecommendation }) {
  return (
    <div
      className="p-4 rounded-[var(--r-md)] flex flex-col"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2.5">
          <Lightbulb
            size={15}
            className="flex-none mt-0.5"
            style={{ color: rec.severity === 'warning' ? 'var(--warn)' : 'var(--ink)' }}
          />
          <div>
            <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--ink)' }}>{rec.title}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
              {rec.projectName ?? 'Platform'}{rec.environmentName ? ` · ${rec.environmentName}` : ''} · {rec.rule}
            </p>
          </div>
        </div>
        <span className="num text-sm font-semibold flex-none" style={{ color: 'var(--success)' }}>
          −{formatUsd(rec.estimatedMonthlySavingsUsd)}/mo
        </span>
      </div>
      <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--ink-secondary)' }}>{rec.detail}</p>
      <ol className="mt-auto flex flex-col gap-1.5 text-xs pl-1">
        {rec.steps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span
              className="num flex-none w-[16px] h-[16px] rounded-[5px] flex items-center justify-center text-[9px] font-bold mt-[1px]"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-secondary)' }}
            >
              {i + 1}
            </span>
            <span style={{ color: 'var(--ink-secondary)' }}>{step}</span>
          </li>
        ))}
      </ol>
      {rec.deploymentId && (
        <a
          href={`/deployments/${rec.deploymentId}`}
          className="text-[11px] mt-3 inline-flex items-center gap-1"
          style={{ color: 'var(--ink-muted)' }}
        >
          Open deployment →
        </a>
      )}
    </div>
  );
}

function RightsizingCard({ rec }: { rec: RightsizingRecommendation }) {
  const impactStyle = IMPACT_COLORS[rec.impact];
  return (
    <div
      className="p-4 rounded-[var(--r-md)]"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {CATEGORY_ICONS[rec.category]}
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{rec.action}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-[4px] font-medium"
            style={{ background: impactStyle.bg, color: impactStyle.text }}
          >
            {rec.impact} impact
          </span>
          <span className="num text-sm font-bold" style={{ color: 'var(--success)' }}>
            −{formatUsd(rec.monthlySavings)}/mo
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs mb-2">
        <span style={{ color: 'var(--ink-muted)' }}>{rec.currentTier}</span>
        <ArrowRight size={12} style={{ color: 'var(--ink-muted)' }} />
        <span className="font-medium" style={{ color: 'var(--success)' }}>{rec.suggestedTier}</span>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>{rec.reason}</p>
    </div>
  );
}

function TipCard({ tip }: { tip: OptimizationTip }) {
  const effortStyle = EFFORT_COLORS[tip.effort];
  return (
    <div
      className="p-3.5 rounded-[var(--r-md)] flex flex-col"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        {CATEGORY_ICONS[tip.category] ?? <Lightbulb size={14} />}
        <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{tip.title}</span>
      </div>
      <p className="text-[11px] leading-relaxed mb-3 flex-1" style={{ color: 'var(--ink-secondary)' }}>
        {tip.description}
      </p>
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-[4px] font-medium uppercase"
            style={{ background: effortStyle.bg, color: effortStyle.text }}
          >
            {tip.effort} effort
          </span>
          {tip.provider !== 'ALL' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-[4px]" style={{ background: 'var(--surface-3)', color: 'var(--ink-muted)' }}>
              {tip.provider}
            </span>
          )}
        </div>
        <span className="num text-[11px] font-bold" style={{ color: 'var(--success)' }}>
          ~{tip.estimatedSavingsPct}% savings
        </span>
      </div>
    </div>
  );
}
