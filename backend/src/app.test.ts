import request from 'supertest';
import { app } from './app';

describe('Health Check Endpoint', () => {
  it('should return 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('service', 'multi-cloud-backend-control-plane');
  });
});
