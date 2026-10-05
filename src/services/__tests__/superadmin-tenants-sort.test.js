import { describe, it, expect } from 'vitest';

function getTenantPhone(t) {
  if (!t) return '';
  const candidate = t.phone || t.mobile || t.adminPhone || t.contactPhone || t.userPhone;
  if (candidate && String(candidate).trim()) return String(candidate).trim();
  if (Array.isArray(t.users) && t.users.length > 0) {
    const u = t.users.find(u => u && (u.phone || u.mobile));
    if (u && (u.phone || u.mobile)) return String(u.phone || u.mobile).trim();
  }
  return '';
}

function getTenantTimestamp(t) {
  if (!t) return 0;
  if (typeof t.createdTimestamp === 'number') return t.createdTimestamp;
  if (typeof t.timestamp === 'number') return t.timestamp;
  if (t.createdAt) {
    if (typeof t.createdAt.toMillis === 'function') return t.createdAt.toMillis();
    if (typeof t.createdAt.seconds === 'number') return t.createdAt.seconds * 1000;
    if (typeof t.createdAt === 'string') {
      const p = Date.parse(t.createdAt);
      if (!isNaN(p) && p > 0) return p;
    }
  }
  if (t.startDate && typeof t.startDate === 'string') {
    const p = Date.parse(t.startDate);
    if (!isNaN(p) && p > 0) return p;
  }
  if (t.updatedAt && typeof t.updatedAt === 'string') {
    const p = Date.parse(t.updatedAt);
    if (!isNaN(p) && p > 0) return p;
  }
  if (typeof t.id === 'string') {
    const clean = t.id.replace(/^comp_/, '');
    if (/^\d{10,13}$/.test(clean)) {
      const num = parseInt(clean, 10);
      return clean.length === 10 ? num * 1000 : num;
    }
  }
  return 0;
}

describe('SuperAdmin Tenants: Numbering, Mobile Phone & Sorting', () => {
  const sampleTenants = [
    {
      id: 'comp_1',
      name: 'شركة الأمل للمقاولات',
      adminName: 'م. أحمد',
      adminEmail: 'ahmed@amal.ae',
      phone: '0501234567',
      createdAt: '2026-08-01T10:00:00.000Z',
      projectsCount: 5,
    },
    {
      id: 'comp_2',
      name: 'مؤسسة البناء الحديث',
      adminName: 'م. طارق',
      adminEmail: 'tarek@modern.ae',
      mobile: '+971559876543',
      createdAt: '2026-09-15T10:00:00.000Z',
      projectsCount: 12,
    },
    {
      id: 'comp_3',
      name: 'شركة الرواد للتشطيبات',
      adminName: 'م. سارة',
      adminEmail: 'sara@rowwad.ae',
      users: [{ email: 'sara@rowwad.ae', phone: '01099887766' }],
      createdAt: '2026-10-05T20:00:00.000Z',
      projectsCount: 2,
    },
  ];

  it('1. extracts registered mobile phone number across various schema fields', () => {
    expect(getTenantPhone(sampleTenants[0])).toBe('0501234567');
    expect(getTenantPhone(sampleTenants[1])).toBe('+971559876543');
    expect(getTenantPhone(sampleTenants[2])).toBe('01099887766');
    expect(getTenantPhone({ id: 'comp_4' })).toBe('');
  });

  it('2. sorts by newest registration first (آخر حد سجّل)', () => {
    const sorted = [...sampleTenants].sort((a, b) => getTenantTimestamp(b) - getTenantTimestamp(a));
    // Newest is comp_3 (registered 2026-10-05)
    expect(sorted[0].id).toBe('comp_3');
    expect(sorted[1].id).toBe('comp_2');
    expect(sorted[2].id).toBe('comp_1');
  });

  it('3. sorts by oldest registration first (الأقدم تسجيلاً)', () => {
    const sorted = [...sampleTenants].sort((a, b) => getTenantTimestamp(a) - getTenantTimestamp(b));
    expect(sorted[0].id).toBe('comp_1');
    expect(sorted[2].id).toBe('comp_3');
  });

  it('4. numbers tenants sequentially (ترقيم #1, #2, #3)', () => {
    const sorted = [...sampleTenants].sort((a, b) => getTenantTimestamp(b) - getTenantTimestamp(a));
    const numbered = sorted.map((t, idx) => ({ ...t, seqNumber: idx + 1 }));
    expect(numbered[0].seqNumber).toBe(1);
    expect(numbered[0].id).toBe('comp_3');
    expect(numbered[1].seqNumber).toBe(2);
    expect(numbered[2].seqNumber).toBe(3);
  });

  it('5. isolates latest registered tenant only (عرض آخر حد فقط)', () => {
    const sorted = [...sampleTenants].sort((a, b) => getTenantTimestamp(b) - getTenantTimestamp(a));
    const onlyLatest = sorted.slice(0, 1);
    expect(onlyLatest.length).toBe(1);
    expect(onlyLatest[0].id).toBe('comp_3');
    expect(onlyLatest[0].adminName).toBe('م. سارة');
  });
});
