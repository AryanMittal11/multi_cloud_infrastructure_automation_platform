'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SeriesPoint } from '../../lib/cerebro/types';

/* ============================================================
   Shared chart styling
   ============================================================ */

const axisProps = {
  stroke: 'transparent',
  tick: { fill: 'var(--ink-muted)', fontSize: 9.5, fontFamily: 'var(--font-mono)' },
  tickLine: false,
} as const;

function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-[var(--r-sm)] px-2.5 py-2 text-xs shadow-xl"
      style={{
        background: 'var(--surface-3)',
        border: '1px solid var(--border-strong)',
        color: 'var(--ink)',
      }}
    >
      <div className="mono mb-1" style={{ color: 'var(--ink-muted)', fontSize: 10 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 num">
          <span className="w-2 h-2 rounded-[2px] inline-block" style={{ background: p.color || p.stroke || p.fill }} />
          <span style={{ color: 'var(--ink-secondary)' }}>{p.name}</span>
          <span className="ml-auto font-semibold pl-3">
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Sparkline — tiny line for stat tiles
   ============================================================ */

export function Sparkline({ data, color }: { data: number[]; color?: string }) {
  const points = data.map((v, i) => ({ i, v }));
  // fixed size — the stat-spark slot is 72x28 and display:none on small screens,
  // where a ResponsiveContainer would measure 0x0 and spam console warnings
  return (
    <LineChart width={72} height={28} data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
      <Line type="monotone" dataKey="v" stroke={color ?? 'var(--accent)'} strokeWidth={1.5} dot={false} isAnimationActive={false} />
    </LineChart>
  );
}

/* ============================================================
   Stacked throughput — ok vs failed runs
   ============================================================ */

export function ThroughputChart({ data, height = 200 }: { data: SeriesPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="g-ok" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--success)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="g-fail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--fail)" stopOpacity={0.38} />
            <stop offset="100%" stopColor="var(--fail)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" {...axisProps} interval={5} />
        <YAxis {...axisProps} width={34} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
        <Area type="monotone" dataKey="ok" name="successful" stackId="1" stroke="var(--success)" strokeWidth={1.6} fill="url(#g-ok)" />
        <Area type="monotone" dataKey="fail" name="failed" stackId="1" stroke="var(--fail)" strokeWidth={1.6} fill="url(#g-fail)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ============================================================
   Bars — deployment frequency
   ============================================================ */

export function BarsChart({ data, height = 200, color = 'var(--accent)', unit = '' }: { data: SeriesPoint[]; height?: number; color?: string; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barCategoryGap="28%">
        <XAxis dataKey="t" {...axisProps} />
        <YAxis {...axisProps} width={34} allowDecimals={false} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'var(--surface-hover)' }} />
        <Bar dataKey="v" name="value" radius={[3, 3, 0, 0]} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ============================================================
   Donut — status distribution
   ============================================================ */

export function DonutChart({
  data,
  height = 200,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltip />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="86%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-semibold num" style={{ color: 'var(--ink)' }}>{centerValue}</span>
          {centerLabel && (
            <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Expected vs observed — anomaly detail
   ============================================================ */

export function ObservedVsExpectedChart({ data, height = 220 }: { data: { t: string; observed: number; expected: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -14 }}>
        <XAxis dataKey="t" {...axisProps} interval={7} />
        <YAxis {...axisProps} width={40} domain={['auto', 'auto']} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
        <Line type="monotone" dataKey="expected" name="expected" stroke="var(--ink-muted)" strokeWidth={1.4} strokeDasharray="4 4" dot={false} />
        <Line type="monotone" dataKey="observed" name="observed" stroke="var(--fail)" strokeWidth={1.8} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ============================================================
   Single-metric line — latency etc.
   ============================================================ */

export function MetricLineChart({ data, height = 200, color = 'var(--accent)', name = 'value', unit = '' }: { data: SeriesPoint[]; height?: number; color?: string; name?: string; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id="g-metric" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" {...axisProps} interval={9} />
        <YAxis {...axisProps} width={40} domain={['auto', 'auto']} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: 'var(--border-strong)' }} />
        <Area type="monotone" dataKey="v" name={name} stroke={color} strokeWidth={1.7} fill="url(#g-metric)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
