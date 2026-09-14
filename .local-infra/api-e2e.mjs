/* End-to-end API matrix test — exercises every endpoint the frontend calls.
   Run: node .local-infra/api-e2e.mjs */
const BASE = 'http://localhost:4000/api';
let pass = 0, fail = 0;
const results = [];

function check(name, cond, detail = '') {
  if (cond) { pass++; results.push(`  ✓ ${name}`); }
  else { fail++; results.push(`  ✗ ${name} ${detail}`); }
}

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* text */ }
  return { status: res.status, data };
}

/* ---------- 1. Health ---------- */
{
  const { status, data } = await req('GET', '/health');
  check('GET /health → 200 healthy', status === 200 && data.status === 'healthy');
}

/* ---------- 2. Auth ---------- */
const stamp = Date.now();
let devToken, adminToken, viewerToken;
{
  const reg = await req('POST', '/auth/register', {
    body: { name: 'E2E Dev', email: `e2e-dev-${stamp}@test.local`, password: 'E2ePass123!', role: 'DEVELOPER' },
  });
  devToken = reg.data?.accessToken;
  check('POST /auth/register (DEVELOPER) → token', !!devToken, `got ${reg.status}`);

  const regA = await req('POST', '/auth/register', {
    body: { name: 'E2E Admin', email: `e2e-admin-${stamp}@test.local`, password: 'E2ePass123!', role: 'ADMIN' },
  });
  adminToken = regA.data?.accessToken;
  check('POST /auth/register (ADMIN) → token', !!adminToken);

  const regV = await req('POST', '/auth/register', {
    body: { name: 'E2E Viewer', email: `e2e-viewer-${stamp}@test.local`, password: 'E2ePass123!', role: 'VIEWER' },
  });
  viewerToken = regV.data?.accessToken;
  check('POST /auth/register (VIEWER) → token', !!viewerToken);

  const me = await req('GET', '/auth/me', { token: devToken });
  check('GET /auth/me → returns user', me.status === 200 && me.data?.user?.email === `e2e-dev-${stamp}@test.local`);

  const login = await req('POST', '/auth/login', { body: { email: `e2e-dev-${stamp}@test.local`, password: 'E2ePass123!' } });
  check('POST /auth/login → 200 + token', login.status === 200 && !!login.data?.accessToken);

  const bad = await req('POST', '/auth/login', { body: { email: `e2e-dev-${stamp}@test.local`, password: 'wrong' } });
  check('POST /auth/login (bad password) → rejected', bad.status === 401 || bad.status === 403);

  const noAuth = await req('GET', '/projects');
  check('GET /projects without token → 401', noAuth.status === 401);
}

/* ---------- 3. Projects ---------- */
let projectId, devEnvId, prodEnvId;
{
  const list = await req('GET', '/projects', { token: devToken });
  check('GET /projects → array', list.status === 200 && Array.isArray(list.data?.projects));
  check('seeded project visible', list.data?.projects?.some((p) => p.name === 'Default Cloud Infrastructure'));

  const created = await req('POST', '/projects', {
    token: devToken,
    body: { name: `E2E Project ${stamp}`, description: 'created by api e2e', createDefaultEnvironments: true },
  });
  check('POST /projects → created with dev+staging+prod', (created.status === 201 || created.status === 200) && created.data?.project?.environments?.length === 3, JSON.stringify(created.data).slice(0, 120));
  projectId = created.data?.project?.id;
  const envs = created.data?.project?.environments ?? [];
  devEnvId = envs.find((e) => e.name === 'development')?.id;
  prodEnvId = envs.find((e) => e.name === 'production')?.id;

  const got = await req('GET', `/projects/${projectId}`, { token: devToken });
  check('GET /projects/:id → 200', got.status === 200 && got.data?.project?.id === projectId);

  const vCreate = await req('POST', '/projects', { token: viewerToken, body: { name: 'should fail' } });
  check('VIEWER cannot create projects (403)', vCreate.status === 403, `got ${vCreate.status}`);
}

/* ---------- 4. Cloud accounts (ADMIN-gated) ---------- */
let accountId;
{
  const list = await req('GET', '/cloud-accounts', { token: devToken });
  check('GET /cloud-accounts (DEVELOPER) → 200', list.status === 200 && Array.isArray(list.data?.cloudAccounts));

  // ADMIN + mock credentials → sandbox onboarding path
  const created = await req('POST', '/cloud-accounts', {
    token: adminToken,
    body: {
      name: `e2e-aws-${stamp}`,
      provider: 'AWS',
      accountReference: '123456789012',
      skipValidation: true,
      projectId,
      credentials: { accessKeyId: 'AKIA_MOCK_E2EEXAMPLE', secretAccessKey: 'mock-secret-e2e-16chr', region: 'us-east-1' },
    },
  });
  check('POST /cloud-accounts (ADMIN, mock creds) → created', (created.status === 201 || created.status === 200) && !!created.data?.cloudAccount?.id, `got ${created.status} ${JSON.stringify(created.data).slice(0, 130)}`);
  accountId = created.data?.cloudAccount?.id;

  // credentials must never come back
  const noLeak = JSON.stringify(created.data).includes('mock-secret-e2e-16chr');
  check('credentials NOT echoed in response', !noLeak);

  // live validation rejects fake creds (no skipValidation)
  const bad = await req('POST', '/cloud-accounts', {
    token: adminToken,
    body: {
      name: 'bad aws live',
      provider: 'AWS',
      accountReference: '123456789012',
      credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', region: 'us-east-1' },
    },
  });
  check('POST /cloud-accounts (fake creds, live) → rejected', [400, 401, 403, 422, 502].includes(bad.status), `got ${bad.status}`);

  // DEVELOPER cannot create cloud accounts
  const dCreate = await req('POST', '/cloud-accounts', { token: devToken, body: { name: 'x', provider: 'AWS', credentials: {} } });
  check('DEVELOPER cannot create cloud accounts (403)', dCreate.status === 403, `got ${dCreate.status}`);

  // bind the account to the dev environment
  const bind = await req('PATCH', `/projects/${projectId}/environments/${devEnvId}/account`, {
    token: devToken,
    body: { cloudAccountId: accountId },
  });
  check('PATCH environments/:envId/account → bound', bind.status === 200 || bind.status === 201, `got ${bind.status} ${JSON.stringify(bind.data).slice(0, 100)}`);
}

/* ---------- 5. Templates ---------- */
let templateId;
{
  const list = await req('GET', '/templates', { token: devToken });
  check('GET /templates → seeded catalog (>=12)', list.status === 200 && (list.data?.templates?.length ?? 0) >= 12, `got ${list.data?.templates?.length}`);

  const vpc = list.data?.templates?.find((t) => t.templateReference === 'templates/aws/aws_vpc');
  templateId = vpc?.id ?? list.data?.templates?.[0]?.id;
  check('aws_vpc template present with inputSchema', !!vpc && typeof vpc.inputSchema === 'object' && !!vpc.inputSchema.properties);

  const byProvider = await req('GET', '/templates?provider=AZURE', { token: devToken });
  check('GET /templates?provider=AZURE → filters', byProvider.status === 200 && (byProvider.data?.templates?.length ?? 0) >= 4 && byProvider.data.templates.every((t) => t.provider === 'AZURE'));

  const got = await req('GET', `/templates/${templateId}`, { token: devToken });
  check('GET /templates/:id → 200', got.status === 200 && got.data?.template?.id === templateId);

  const valid = await req('POST', `/templates/${templateId}/validate`, {
    token: devToken,
    body: { configuration: { environment_name: 'e2e-env', vpc_cidr: '10.0.0.0/16' } },
  });
  check('POST /templates/:id/validate (valid) → valid:true', valid.status === 200 && valid.data?.valid === true, JSON.stringify(valid.data).slice(0, 150));

  const invalid = await req('POST', `/templates/${templateId}/validate`, {
    token: devToken,
    body: { configuration: { vpc_cidr: 'not-a-cidr' } },
  });
  check('POST /templates/:id/validate (missing env_name) → 400 valid:false', invalid.status === 400 && invalid.data?.valid === false, JSON.stringify(invalid.data).slice(0, 150));
}

/* ---------- 6. Designs CRUD ---------- */
let designId;
{
  const created = await req('POST', '/designs', {
    token: devToken,
    body: {
      name: `E2E Design ${stamp}`,
      description: 'api e2e',
      cloudProvider: 'AWS',
      nodes: [{ id: 'n1', kind: 'network', position: { x: 100, y: 80 }, data: { kind: 'network', label: 'vpc', provider: 'AWS', templateRef: 'templates/aws/aws_vpc', config: {} } }],
      edges: [],
    },
  });
  check('POST /designs (DEVELOPER) → created', (created.status === 201 || created.status === 200) && !!created.data?.design?.id, `got ${created.status} ${JSON.stringify(created.data).slice(0, 110)}`);
  designId = created.data?.design?.id;

  const list = await req('GET', '/designs', { token: devToken });
  check('GET /designs → includes created', list.status === 200 && list.data?.designs?.some((d) => d.id === designId));

  const updated = await req('PUT', `/designs/${designId}`, {
    token: devToken,
    body: {
      name: `E2E Design Updated ${stamp}`,
      nodes: [
        { id: 'n1', kind: 'network', position: { x: 100, y: 80 }, data: { kind: 'network', label: 'vpc', provider: 'AWS', templateRef: 'templates/aws/aws_vpc', config: {} } },
        { id: 'n2', kind: 'compute', position: { x: 300, y: 80 }, data: { kind: 'compute', label: 'web', provider: 'AWS', templateRef: 'templates/aws/aws_ec2_web', config: {} } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    },
  });
  check('PUT /designs/:id → updated, 2 nodes', updated.status === 200 && updated.data?.design?.nodes?.length === 2);

  const got = await req('GET', `/designs/${designId}`, { token: devToken });
  check('GET /designs/:id → edges persisted', got.status === 200 && got.data?.design?.edges?.length === 1);

  const vCreate = await req('POST', '/designs', { token: viewerToken, body: { name: 'nope' } });
  check('VIEWER cannot create designs (403)', vCreate.status === 403, `got ${vCreate.status}`);

  const dDelete = await req('DELETE', `/designs/${designId}`, { token: devToken });
  check('DELETE /designs/:id (owner DEVELOPER) → removed', dDelete.status === 200 || dDelete.status === 204, `got ${dDelete.status} ${JSON.stringify(dDelete.data).slice(0, 100)}`);
}

/* ---------- 7. Deployments: full gated pipeline ---------- */
let deploymentId;
{
  const plan = await req('POST', '/deployments/plan', {
    token: devToken,
    body: {
      projectId,
      environmentId: devEnvId,
      templateId,
      configuration: { environment_name: 'e2e-env', vpc_cidr: '10.0.0.0/16' },
    },
  });
  check('POST /deployments/plan → accepted', [200, 201, 202].includes(plan.status), `got ${plan.status} ${JSON.stringify(plan.data).slice(0, 200)}`);
  deploymentId = plan.data?.deployment?.id;

  if (deploymentId) {
    // Worker executes terraform asynchronously — poll until it leaves PLANNING
    let dep = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const got = await req('GET', `/deployments/${deploymentId}`, { token: devToken });
      dep = got.data?.deployment;
      if (dep && dep.status !== 'PLANNING') break;
    }
    check('GET /deployments/:id → 200', !!dep);
    check('plan output recorded (worker ran terraform)', !!dep?.planOutput, `status=${dep?.status}, planOutput=${(dep?.planOutput || '').slice(0, 60)}`);
    check('status is PLANNED (awaiting approval)', dep?.status === 'PLANNED', `status=${dep?.status}`);
    check('policy evaluation attached', dep?.policyEvaluation !== undefined && dep?.policyEvaluation !== null, `policy=${JSON.stringify(dep?.policyEvaluation).slice(0, 80)}`);

    const vApprove = await req('POST', `/deployments/${deploymentId}/approve`, { token: viewerToken });
    check('VIEWER cannot approve (403)', vApprove.status === 403, `got ${vApprove.status}`);

    const approve = await req('POST', `/deployments/${deploymentId}/approve`, { token: adminToken });
    check('POST /deployments/:id/approve (ADMIN) → accepted', [200, 201, 202].includes(approve.status), `got ${approve.status} ${JSON.stringify(approve.data).slice(0, 130)}`);

    await new Promise((r) => setTimeout(r, 2500));
    const after = await req('GET', `/deployments/${deploymentId}`, { token: devToken });
    const dep2 = after.data?.deployment;
    check('apply progressed (QUEUED/RUNNING/SUCCEEDED/FAILED by terraform availability)', ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'APPLYING'].includes(dep2?.status), `status=${dep2?.status} apply=${(dep2?.applyOutput || '').slice(0, 60)}`);
  }

  const list = await req('GET', '/deployments', { token: devToken });
  check('GET /deployments → 200 list includes created', list.status === 200 && list.data?.deployments?.some((d) => d.id === deploymentId));

  // destroy flow gate
  if (deploymentId) {
    const dp = await req('POST', `/deployments/${deploymentId}/destroy-plan`, { token: devToken });
    check('POST /deployments/:id/destroy-plan → gated plan', [200, 201, 202, 409].includes(dp.status), `got ${dp.status} ${JSON.stringify(dp.data).slice(0, 110)}`);

    const badConfirm = await req('POST', `/deployments/${deploymentId}/confirm-destroy`, {
      token: devToken,
      body: { confirmationKeyword: 'WRONG' },
    });
    check('confirm-destroy with wrong keyword → rejected', [400, 409, 422].includes(badConfirm.status), `got ${badConfirm.status}`);
  }
}

/* ---------- 8. Resources & Audit ---------- */
{
  const list = await req('GET', '/resources', { token: devToken });
  check('GET /resources → 200', list.status === 200 && Array.isArray(list.data?.resources));

  const logs = await req('GET', '/audit-logs?limit=30', { token: adminToken });
  check('GET /audit-logs → 200 with entries', logs.status === 200 && (logs.data?.auditLogs?.length ?? 0) > 0);
  const actions = (logs.data?.auditLogs ?? []).map((l) => l.action);
  check('cloud-account + design actions in audit trail', actions.some((a) => /design/i.test(a)) && actions.some((a) => /CLOUD_ACCOUNT/i.test(a)), actions.slice(0, 6).join(','));
}

console.log('════════════════════════════════════');
console.log(results.join('\n'));
console.log('════════════════════════════════════');
console.log(`RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
