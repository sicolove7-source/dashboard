import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTenantRegistrationDate, formatRegistrationDateTime } from '../../utils/helpers';
import { DEFAULT_COMPANY_SETTINGS, loadCompanySettings, saveCompanySettings } from '../../utils/branding';

const storage = {};
global.localStorage = {
  getItem: vi.fn((key) => storage[key] || null),
  setItem: vi.fn((key, value) => { storage[key] = String(value); }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); }),
};

describe('Company Registration Timestamp Feature', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
    vi.restoreAllMocks();
  });

  it('correctly extracts date from explicit registeredAt or createdAt ISO string', () => {
    const tenant = {
      id: 'comp_custom',
      registeredAt: '2026-05-15T14:30:00.000Z',
    };
    const dateObj = getTenantRegistrationDate(tenant);
    expect(dateObj).not.toBeNull();
    expect(dateObj.toISOString()).toBe('2026-05-15T14:30:00.000Z');
  });

  it('accurately derives registration timestamp from base36 id slug when explicit field is missing', () => {
    const tenant = {
      id: 'comp_c_mtyw7mqk', // parseInt('mtyw7mqk', 36) = 1789248251612 -> 2026-09-12T21:24:11.612Z
    };
    const dateObj = getTenantRegistrationDate(tenant);
    expect(dateObj).not.toBeNull();
    expect(dateObj.getTime()).toBe(1789248251612);
  });

  it('formats registration date and time into Arabic format with 12h clock and period', () => {
    const d = new Date(2026, 8, 12, 15, 30); // 12 سبتمبر 2026، 03:30 م
    const formatted = formatRegistrationDateTime(d);
    expect(formatted.date).toBe('2026-09-12');
    expect(formatted.arabicDate).toContain('12 سبتمبر 2026');
    expect(formatted.time).toBe('03:30 م');
    expect(formatted.full).toBe('12 سبتمبر 2026 • 03:30 م');
  });

  it('DEFAULT_COMPANY_SETTINGS contains createdAt and registeredAt fields', () => {
    expect(DEFAULT_COMPANY_SETTINGS).toHaveProperty('createdAt');
    expect(DEFAULT_COMPANY_SETTINGS).toHaveProperty('registeredAt');
  });

  it('loadCompanySettings preserves createdAt and registeredAt', () => {
    storage['tenant_comp_test_settings'] = JSON.stringify({
      companyName: 'شركة الاختبار',
      createdAt: '2026-07-01T10:00:00.000Z',
      registeredAt: '2026-07-01T10:00:00.000Z',
    });

    const loaded = loadCompanySettings('comp_test');
    expect(loaded.companyName).toBe('شركة الاختبار');
    expect(loaded.createdAt).toBe('2026-07-01T10:00:00.000Z');
    expect(loaded.registeredAt).toBe('2026-07-01T10:00:00.000Z');
  });
});
