'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Info, Lightbulb, TrendingDown } from 'lucide-react';
import { api, CostSummaryProject, CostRecommendation } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { formatUsd } from '../../lib/format';
import { PageHeader } from '../../components/cerebro/app-shell';
import { Panel, EmptyState, Skeleton, Segmented } from '../../components/cerebro/ui-kit';

const PROVIDER_REGIONS: Record<'AWS' | 'AZURE' | 'GCP', string[]> = {
  AWS: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
  AZURE: ['eastus', 'westeurope', 'southeastasia'],
  GCP: ['us-central1', 'us-east1', 'europe-west1', 'asia-southeast1'],
};

export default function CostsPage() {
  const { user } = useAuth();

  // what-if estimator state
  const [provider, setProvider] = useState<'AWS' | 'AZURE' | 'GCP'>('AWS');
  const [region, setRegion] = useState('us-east-1');
  const [archetype, setArchetype] = useState('web');
  const [instanceCount, setInstanceCount] = useState(2);
  const [volumeSize, setVolumeSize] = useState(20);

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['costs-summary'],
    queryFn: () => api.costs.summary(),
    enabled: !!user,
    refetchInterval: 60000,
  });

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
        <PageHeader title="Costs" sub="Sign in to view the estimated monthly spend." />
        <Panel>
          <EmptyState
            icon={<DollarSign size={22} />}
            title="Authentication required"
            body="Connect an operator persona from the Projects page to open cost overview."
          />
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Costs"
        sub="Estimated monthly spend across active deployments — labelled estimates, never bills"
      />

      {/* estimate disclaimer strip */}
      <div
        className="flex items-start gap-2.5 px-4 py-3 rounded-[var(--r-md)] mb-5 text-xs"
        style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--ink-secondary)' }}
      >
        <Info size={15} className="flex-none mt-0.5" style={{ color: 'var(--accent-strong)' }} />
        <p>
          {summaryData?.label ??
            'All figures are offline rate-card estimates (USD/month). They exclude egress, licenses, tax/credits and free-tier effects — not a guarantee of your actual invoice.'}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Rollup by project */}
          <Panel className="lg:col-span-2" title="Estimated monthly spend" subtitle={`By project · computed ${summaryData ? new Date(summaryData.computedAt).toLocaleTimeString() : ''}`}>
            {!summaryData || projects.length === 0 ? (
              <EmptyState
                icon={<DollarSign size={22} />}
                title="Nothing to estimate yet"
                body="Costs appear once deployments have provisioned resources — the platform prices actual recorded infrastructure, not intentions."
                action={<a href="/deployments/wizard" className="btn-primary">Run a deployment</a>}
              />
            ) : (
              <div className="px-4 py-4">
                {/* total */}
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

                {/* per-project bars */}
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
          <Panel title="What-if estimator" subtitle="Price a configuration before deploying">
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
                    type="number"
                    min={1}
                    max={20}
                    value={instanceCount}
                    onChange={(e) => setInstanceCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                    className="w-full h-[34px] px-2.5 rounded-[var(--r-sm)] text-xs"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                    aria-label="Instance count"
                  />
                </div>
                <div>
                  <p className="stat-label mb-1.5">Volume (GB)</p>
                  <input
                    type="number"
                    min={8}
                    max={500}
                    step={8}
                    value={volumeSize}
                    onChange={(e) => setVolumeSize(Math.max(8, Math.min(500, Number(e.target.value) || 8)))}
                    className="w-full h-[34px] px-2.5 rounded-[var(--r-sm)] text-xs"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                    aria-label="Volume size"
                  />
                </div>
              </div>

              {/* live estimate */}
              <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="stat-label">Estimated monthly</p>
                <p className="num text-[28px] leading-none mt-1" style={{ color: 'var(--accent-strong)' }}>
                  {estimating ? '…' : estimateData ? formatUsd(estimateData.estimate.monthlyTotalUsd) : '—'}
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  {(estimateData?.estimate.lineItems ?? []).map((li) => (
                    <div key={li.resourceType} className="flex justify-between text-[11.5px]">
                      <span style={{ color: 'var(--ink-muted)' }}>
                        {li.label} × {li.quantity}
                      </span>
                      <span className="num" style={{ color: 'var(--ink)' }}>{formatUsd(li.monthlyUsd)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <details className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                <summary className="cursor-pointer">Assumptions</summary>
                <ul className="mt-1.5 flex flex-col gap-1 pl-4 list-disc">
                  {(estimateData?.estimate.assumptions ?? []).map((a) => (
                    <li key={a.label}>
                      <span style={{ color: 'var(--ink-secondary)' }}>{a.label}:</span> {a.value}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
