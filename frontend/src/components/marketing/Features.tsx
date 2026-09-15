'use client';

import React, { useState } from 'react';
import { ArrowRight, Boxes } from 'lucide-react';
import { Reveal, Eyebrow, Section } from './Reveal';
import { ProviderIcon } from '../../lib/provider-icon';

/* ============================================================
   Multi-cloud — interactive provider switcher
   ============================================================ */

type PKey = 'AWS' | 'AZURE' | 'GCP';

const PROVIDER_DATA: Record<
  PKey,
  { region: string; account: string; modules: string[]; tiers: { tier: string; sku: string }[] }
> = {
  AWS: {
    region: 'us-east-1',
    account: 'aws-main (9413…)',
    modules: ['aws_vpc', 'aws_ec2_web', 'aws_rds_postgres', 'aws_s3_bucket'],
    tiers: [
      { tier: 'small', sku: 't3.micro' },
      { tier: 'medium', sku: 't3.medium' },
      { tier: 'large', sku: 'm5.xlarge' },
    ],
  },
  AZURE: {
    region: 'eastus',
    account: 'azure-sandbox (sp-cerebro)',
    modules: ['azure_vnet', 'azure_vm_web', 'azure_postgres_flexible', 'azure_blob_storage'],
    tiers: [
      { tier: 'small', sku: 'Standard_B1s' },
      { tier: 'medium', sku: 'Standard_B2s' },
      { tier: 'large', sku: 'Standard_D4s' },
    ],
  },
  GCP: {
    region: 'us-east1',
    account: 'gcp-lab (cerebro-lab)',
    modules: ['gcp_vpc', 'gcp_compute_web', 'gcp_cloud_sql_postgres', 'gcp_storage_bucket'],
    tiers: [
      { tier: 'small', sku: 'e2-micro' },
      { tier: 'medium', sku: 'e2-medium' },
      { tier: 'large', sku: 'n2-standard-4' },
    ],
  },
};

const ARCHETYPES = [
  { name: 'web-service-stack', nodes: ['network', 'compute', 'database'], ref: 'network → compute → db' },
  { name: 'storage-backend', nodes: ['network', 'storage'], ref: 'network → bucket' },
  { name: 'secure-network', nodes: ['network'], ref: 'vpc / vnet only' },
];

export function MultiCloud() {
  const [provider, setProvider] = useState<PKey>('AWS');
  const data = PROVIDER_DATA[provider];

  return (
    <Section id="multicloud">
      <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-14 items-center">
        <Reveal variant="left">
          <Eyebrow>Multi-cloud by design</Eyebrow>
          <h2 className="display-lg mt-5" style={{ color: 'var(--ink)' }}>
            Draw it once. Ship it on any cloud.
          </h2>
          <p className="mt-5 text-base leading-relaxed max-w-lg" style={{ color: 'var(--ink-muted)' }}>
            Your architecture is intent, not YAML. Three archetypes and abstract sizing tiers
            translate to native modules and SKUs per provider — switch with one click and watch
            the whole design re-map.
          </p>

          {/* interactive switcher */}
          <div className="mt-8 inline-flex p-1 rounded-[9px]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }} role="tablist" aria-label="Cloud provider">
            {(Object.keys(PROVIDER_DATA) as PKey[]).map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={provider === p}
                onClick={() => setProvider(p)}
                className="flex items-center gap-2 h-9 px-4 rounded-[7px] text-xs font-semibold transition-all"
                style={{
                  background: provider === p ? '#ffffff' : 'transparent',
                  color: provider === p ? '#0a0a0a' : 'var(--ink-muted)',
                }}
              >
                <ProviderIcon provider={p} size={14} />
                {p}
              </button>
            ))}
          </div>

          {/* mapped output for the selected provider */}
          <div key={provider} className="showcase-step mt-6 space-y-2.5 max-w-lg">
            <div className="flex items-center justify-between rounded-[var(--r-md)] px-4 py-3 quiet-card">
              <span className="mono text-xs" style={{ color: 'var(--ink-muted)' }}>region</span>
              <span className="mono text-xs font-semibold" style={{ color: 'var(--ink)' }}>{data.region}</span>
            </div>
            <div className="flex items-center justify-between rounded-[var(--r-md)] px-4 py-3 quiet-card">
              <span className="mono text-xs" style={{ color: 'var(--ink-muted)' }}>credential</span>
              <span className="mono text-xs" style={{ color: 'var(--ink)' }}>{data.account}</span>
            </div>
            <div className="rounded-[var(--r-md)] px-4 py-3 quiet-card">
              <div className="flex items-center justify-between mb-2">
                <span className="mono text-xs" style={{ color: 'var(--ink-muted)' }}>tier → SKU</span>
                <span className="mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>per module</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {data.tiers.map((t) => (
                  <div key={t.tier} className="rounded-md px-2.5 py-2 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-faint)' }}>
                    <div className="mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>{t.tier}</div>
                    <div className="mono text-[11px] font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>{t.sku}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {data.modules.map((m) => (
                <span key={m} className="chip">{m}</span>
              ))}
            </div>
          </div>
        </Reveal>

        {/* archetype → module mapping visual */}
        <Reveal variant="right">
          <div className="quiet-card p-6 sm:p-7">
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Portability layer</span>
              <span className="chip">{provider.toLowerCase()} mapping</span>
            </div>
            <div className="space-y-4">
              {ARCHETYPES.map((a) => (
                <div key={a.name} className="rounded-[var(--r-md)] p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-faint)' }}>
                  <div className="flex items-center gap-2.5">
                    <Boxes size={14} style={{ color: 'var(--ink)' }} />
                    <span className="mono text-xs font-semibold" style={{ color: 'var(--ink)' }}>{a.name}</span>
                    <span className="ml-auto mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{a.ref}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {a.nodes.map((n) => (
                      <React.Fragment key={n}>
                        <span
                          className="px-2.5 py-1 rounded-md text-[10px] font-mono transition-colors duration-300"
                          style={{ background: 'var(--accent-soft)', color: 'var(--ink)', border: '1px solid var(--accent-border)' }}
                        >
                          {provider.toLowerCase()}_{n.split('-')[0]}
                        </span>
                        <ArrowRight size={10} style={{ color: 'var(--ink-faint)' }} />
                      </React.Fragment>
                    ))}
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold" style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid rgba(74,222,128,0.3)' }}>
                      deployable
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
              Regions normalize across clouds (us-east-1 ↔ eastus ↔ us-east1), outputs normalize
              back into shared descriptors — compute_public_ip, database_endpoint, storage_uri.
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ============================================================
   Tech marquee — only true facts
   ============================================================ */

const STACK = [
  { name: 'Terraform', tag: 'generation engine' },
  { name: 'OpenTofu', tag: 'compatible output' },
  { name: 'AWS', tag: '12 modules' },
  { name: 'Azure', tag: '4 modules' },
  { name: 'GCP', tag: '4 modules' },
  { name: 'PostgreSQL', tag: 'state & audit' },
  { name: 'RabbitMQ', tag: 'worker queue' },
  { name: 'Next.js', tag: 'console & canvas' },
  { name: 'React Flow', tag: 'visual designer' },
  { name: 'Recharts', tag: 'analytics' },
];

export function TechMarquee() {
  const doubled = [...STACK, ...STACK];
  return (
    <section className="py-16 border-y overflow-hidden" style={{ borderColor: 'var(--border-faint)' }}>
      <div className="container-wide">
        <Reveal className="text-center">
          <p className="eyebrow">Built on open standards — your code never lives in a black box</p>
        </Reveal>
      </div>
      <div className="mt-8 marquee-mask overflow-hidden">
        <div className="animate-marquee flex gap-3 w-max">
          {doubled.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              className="flex items-center gap-3 h-12 px-5 rounded-full quiet-card shrink-0"
            >
              <span className="w-2 h-2 rounded-[3px]" style={{ background: 'var(--accent)' }} />
              <span className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--ink)' }}>{item.name}</span>
              <span className="mono text-[10px] whitespace-nowrap" style={{ color: 'var(--ink-faint)' }}>{item.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
