import { describe, it, expect, vi } from 'vitest';
import handler from '../../../api/reset-password.js';

describe('Vercel Serverless reset-password API', () => {
  it('rejects non-POST requests with 405', async () => {
    let statusCode = null;
    let jsonBody = null;
    const req = { method: 'GET', headers: {} };
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { jsonBody = data; },
          end: () => {}
        };
      }
    };

    await handler(req, res);
    expect(statusCode).toBe(405);
    expect(jsonBody?.error).toContain('Method not allowed');
  });

  it('rejects requests without Bearer token with 401', async () => {
    let statusCode = null;
    let jsonBody = null;
    const req = { method: 'POST', headers: {} };
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { jsonBody = data; },
          end: () => {}
        };
      }
    };

    await handler(req, res);
    expect(statusCode).toBe(401);
    expect(jsonBody?.error).toContain('غير مصرح');
  });

  it('handles CORS OPTIONS requests gracefully with 200', async () => {
    let statusCode = null;
    let ended = false;
    const req = { method: 'OPTIONS', headers: {} };
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          end: () => { ended = true; }
        };
      }
    };

    await handler(req, res);
    expect(statusCode).toBe(200);
    expect(ended).toBe(true);
  });
});
