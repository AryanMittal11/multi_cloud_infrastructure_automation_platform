const http = require('http');

function req(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(
      { host: 'localhost', port: 4000, path, method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          let parsed = null;
          try { parsed = JSON.parse(d); } catch {}
          resolve({ code: res.statusCode, body: parsed });
        });
      }
    );
    r.on('error', reject);
    if (body) r.end(JSON.stringify(body));
    else r.end();
  });
}

(async () => {
  const login = await req('POST', '/api/auth/login', null, { email: 'admin@multicloud.local', password: 'AdminPassword123!' });
  const t = login.body.accessToken;

  const deps = await req('GET', '/api/deployments?status=SUCCEEDED', t);
  const target = deps.body.deployments.find((d) => d.operationType !== 'DESTROY');
  console.log('SUCCEEDED non-destroy run:', target ? target.id : 'none');

  if (target) {
    console.log('  costEstimate:', target.costEstimate ? `present · $${target.costEstimate.monthlyTotalUsd}/mo (${target.costEstimate.lineItems.length} line items)` : 'MISSING');
    console.log('  policyEvaluation:', target.policyEvaluation ? `present · ${target.policyEvaluation.evaluator} · passed=${target.policyEvaluation.passed}` : 'MISSING');
  }

  const topo = await req('GET', '/api/topology', t);
  console.log('topology:', topo.code, `nodes=${topo.body.graph.nodes.length} edges=${topo.body.graph.edges.length} unlinked=${topo.body.graph.unlinkedCount}`);

  const costs = await req('GET', '/api/costs/summary', t);
  console.log('costs summary:', costs.code, `total=$${costs.body.monthlyTotalUsd}/mo across ${costs.body.projects.length} project(s)`);

  const est = await req('POST', '/api/costs/estimate', t, { templateName: 'aws_rds_postgres', provider: 'AWS', configuration: { instance_count: 1, volume_size: 50 }, region: 'eu-west-1' });
  console.log('costs estimate (db, eu-west-1):', est.code, `$${est.body.estimate.monthlyTotalUsd}/mo · [${est.body.estimate.lineItems.map((i) => i.resourceType).join(', ')}]`);

  const badEst = await req('POST', '/api/costs/estimate', t, { templateName: 'x', provider: 'MARS' });
  console.log('costs estimate validation (bad provider):', badEst.code, badEst.body.error);

  const viewer = await req('POST', '/api/auth/login', null, { email: 'viewer@multicloud.local', password: 'ViewerPassword123!' });
  const vt = viewer.body.accessToken;
  const vEst = await req('POST', '/api/costs/estimate', vt, { templateName: 'web', provider: 'AWS' });
  console.log('VIEWER can read estimates:', vEst.code === 200);
})();
