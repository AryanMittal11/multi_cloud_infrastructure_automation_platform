'use client';

import React, { useState } from 'react';
import { KeyRound, Moon, Plug, Sun } from 'lucide-react';
import { PageHeader } from '../../../components/cerebro/app-shell';
import { ConfirmDialog, Panel, Tabs, useToast } from '../../../components/cerebro/ui-kit';

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      className={`switch ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      aria-label={label}
      type="button"
    />
  );
}

function SetRow({ k, d, children }: { k: string; d: string; children: React.ReactNode }) {
  return (
    <div className="set-row flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{k}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>{d}</p>
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { push } = useToast();
  const [tab, setTab] = useState('general');

  const [wsName, setWsName] = useState('cloudweave platform');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [autoApproveStaging, setAutoApproveStaging] = useState(true);
  const [autoRollback, setAutoRollback] = useState(true);
  const [slackNotifs, setSlackNotifs] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [pageOnSev1, setPageOnSev1] = useState(true);
  const [driftScan, setDriftScan] = useState(true);
  const [compactTables, setCompactTables] = useState(false);
  const [monoBadges, setMonoBadges] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('8h');
  const [theme, setTheme] = useState<'dark' | 'light'>(
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
  );

  const [wipeOpen, setWipeOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const setDocTheme = (t: 'dark' | 'light') => {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    window.localStorage.setItem('cerebro-theme', t);
  };

  return (
    <div>
      <PageHeader title="Settings" sub="Workspace-wide configuration. Changes apply immediately in the demo." />

      <div className="mb-4">
        <Tabs
          tabs={[
            { key: 'general', label: 'General' },
            { key: 'workspace', label: 'Workspace' },
            { key: 'notifications', label: 'Notifications' },
            { key: 'integrations', label: 'Integrations' },
            { key: 'security', label: 'Security' },
            { key: 'appearance', label: 'Appearance' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'general' && (
        <div className="stack-gap">
          <Panel title="General" subtitle="identity and base behavior of this workspace">
            <div className="p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="eyebrow block mb-1.5">Workspace name</span>
                  <input className="input" value={wsName} onChange={(e) => setWsName(e.target.value)} />
                </label>
                <label className="block">
                  <span className="eyebrow block mb-1.5">Default branch</span>
                  <input className="input mono" value={defaultBranch} onChange={(e) => setDefaultBranch(e.target.value)} />
                </label>
              </div>
              <div className="mt-2">
                <SetRow k="Auto-approve staging deploys" d="Skip the manual approval gate for non-production promotions.">
                  <Switch on={autoApproveStaging} onChange={setAutoApproveStaging} label="Auto-approve staging" />
                </SetRow>
                <SetRow k="Automatic rollback on SLO burn" d="Armed rollback reverts a release when multi-window burn alerts fire.">
                  <Switch on={autoRollback} onChange={setAutoRollback} label="Auto rollback" />
                </SetRow>
              </div>
              <div className="modal-foot -mx-4 -mb-4 mt-2" style={{ borderRadius: 0 }}>
                <button className="btn btn-sm" onClick={() => push({ title: 'Reverted', tone: 'info' })}>Cancel</button>
                <button className="btn btn-sm btn-primary" onClick={() => push({ title: 'Settings saved', sub: wsName, tone: 'success' })}>
                  Save changes
                </button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'workspace' && (
        <div className="stack-gap">
          <Panel title="Workspace" subtitle="members, projects, and defaults">
            <div className="p-4">
              <div className="fact-row">
                <span className="fact-k">Members</span>
                <span className="fact-v text-sm num">7 · 2 admins, 4 developers, 1 viewer</span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Projects</span>
                <span className="fact-v text-sm num">6 pipelines across 3 repos</span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Cloud accounts</span>
                <span className="fact-v text-sm">AWS · Azure · GCP (sandbox)</span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Region</span>
                <span className="fact-v mono text-xs">us-east-1 (primary)</span>
              </div>
            </div>
          </Panel>
          <Panel title="Danger zone" subtitle="irreversible workspace operations" >
            <div className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--fail)' }}>Reset demo dataset</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>Restores the pristine demo data. Type RESET to confirm.</p>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => setWipeOpen(true)}>Reset workspace…</button>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'notifications' && (
        <Panel title="Notifications" subtitle="routing and escalation preferences">
          <div className="p-4">
            <SetRow k="Slack notifications" d="Deliver ticket-severity events to #cloudweave-alerts.">
              <Switch on={slackNotifs} onChange={setSlackNotifs} label="Slack notifications" />
            </SetRow>
            <SetRow k="Daily email digest" d="Summary of runs, deploys, and detector activity at 09:00 local.">
              <Switch on={emailDigest} onChange={setEmailDigest} label="Email digest" />
            </SetRow>
            <SetRow k="Page on SEV-1" d="Bypass quiet hours for page-severity alerts routed to the on-call rotation.">
              <Switch on={pageOnSev1} onChange={setPageOnSev1} label="Page on SEV-1" />
            </SetRow>
            <SetRow k="Drift scan notices" d="Notify when scheduled Terraform drift scans find out-of-band changes.">
              <Switch on={driftScan} onChange={setDriftScan} label="Drift notices" />
            </SetRow>
          </div>
        </Panel>
      )}

      {tab === 'integrations' && (
        <div className="stack-gap">
          <Panel title="Integrations" subtitle="connected services for CI, paging, and repositories">
            <div className="p-4 grid gap-3 md:grid-cols-2">
              {[
                { name: 'GitHub', detail: 'cloudweave org · 6 repos · webhooks active', icon: <Plug size={14} /> },
                { name: 'Slack', detail: '#cloudweave-alerts · ticket+ severity', icon: <Plug size={14} /> },
                { name: 'PagerDuty', detail: 'on-call primary rotation', icon: <Plug size={14} /> },
                { name: 'Opsgenie', detail: 'SLO burn routing', icon: <Plug size={14} /> },
                { name: 'Infracost', detail: 'plan cost checks on PRs', icon: <Plug size={14} /> },
                { name: 'Checkov', detail: 'policy scan in scan stage', icon: <Plug size={14} /> },
              ].map((i) => (
                <div key={i.name} className="flex items-center gap-3 p-3 rounded-[var(--r-md)]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-faint)' }}>
                  <span className="icon-btn" style={{ pointerEvents: 'none' }}>{i.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{i.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--ink-muted)' }}>{i.detail}</p>
                  </div>
                  <span className="badge badge-success ml-auto">connected</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === 'security' && (
        <div className="stack-gap">
          <Panel title="Security" subtitle="authentication and secrets handling">
            <div className="p-4">
              <SetRow k="Require MFA" d="All members must enroll a second factor. Enforced at next sign-in.">
                <Switch on={mfaRequired} onChange={setMfaRequired} label="Require MFA" />
              </SetRow>
              <SetRow k="Session timeout" d="Idle sessions are revoked after this period.">
                <select className="select" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} aria-label="Session timeout">
                  <option value="1h">1 hour</option>
                  <option value="8h">8 hours</option>
                  <option value="24h">24 hours</option>
                  <option value="1w">1 week</option>
                </select>
              </SetRow>
              <SetRow k="Secrets at rest" d="Credentials are sealed with AES-256-GCM and injected only into the ephemeral worker.">
                <span className="badge badge-success">enforced</span>
              </SetRow>
            </div>
          </Panel>
          <Panel title="API credentials">
            <div className="p-4">
              <div className="fact-row">
                <span className="fact-k">Demo key</span>
                <span className="fact-v mono text-xs">cerebro_sk_…demo</span>
              </div>
              <div className="flex justify-end mt-3">
                <button className="btn btn-sm btn-danger" onClick={() => setRevokeOpen(true)}>
                  <KeyRound size={12} /> Revoke key…
                </button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'appearance' && (
        <Panel title="Appearance" subtitle="theme and density">
          <div className="p-4">
            <SetRow k="Theme" d="Matches your system by default; stored locally.">
              <div className="seg">
                <button className={theme === 'dark' ? 'on' : ''} onClick={() => setDocTheme('dark')}>
                  <span className="inline-flex items-center gap-1.5"><Moon size={12} /> Dark</span>
                </button>
                <button className={theme === 'light' ? 'on' : ''} onClick={() => setDocTheme('light')}>
                  <span className="inline-flex items-center gap-1.5"><Sun size={12} /> Light</span>
                </button>
              </div>
            </SetRow>
            <SetRow k="Compact tables" d="Reduce row padding for denser history views.">
              <Switch on={compactTables} onChange={setCompactTables} label="Compact tables" />
            </SetRow>
            <SetRow k="Monospace status badges" d="Render status badges in JetBrains Mono for a technical look.">
              <Switch on={monoBadges} onChange={setMonoBadges} label="Mono badges" />
            </SetRow>
          </div>
        </Panel>
      )}

      <ConfirmDialog
        open={wipeOpen}
        onClose={() => setWipeOpen(false)}
        onConfirm={() => window.location.reload()}
        title="Reset demo dataset?"
        body="This clears local state and reloads the pristine demo dataset. In a production workspace this would trigger an irreversible data wipe."
        confirmLabel="Reset workspace"
        danger
        requireText="RESET"
      />
      <ConfirmDialog
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        onConfirm={() => push({ title: 'API key revoked', sub: 'a new key was issued to your email', tone: 'warn' })}
        title="Revoke demo API key?"
        body="Automation using this key will stop working immediately. A replacement key can be issued at any time."
        confirmLabel="Revoke key"
        danger
      />
    </div>
  );
}
