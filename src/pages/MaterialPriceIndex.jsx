import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Search, Calculator, Share2,
  Printer, RefreshCw, Layers, Shield, Building2, Zap, Droplets,
  Grid, Square, Paintbrush, FileSpreadsheet, Check, Sparkles,
  AlertCircle, ChevronDown, ArrowUpRight, ArrowDownRight, Edit3,
  X, Info, PhoneCall
} from 'lucide-react';
import {
  MATERIAL_CATEGORIES,
  getMaterialPrices,
  saveMaterialPriceOverride,
  resetMaterialPricesToDefault,
  generateMarketBriefWhatsAppText
} from '../data/materialPricesData';

const ICON_MAP = {
  Layers,
  Shield,
  Building2,
  Zap,
  Droplets,
  Grid,
  Square,
  Paintbrush,
  FileSpreadsheet
};

export default function MaterialPriceIndex({ currentUser, companySettings }) {
  // البلد المختار: افتراضياً مصر، أو السعودية إذا كانت الشركة في السعودية
  const initialCountry = (companySettings?.country || 'EG').toUpperCase() === 'SA' ? 'SA' : 'EG';
  const [selectedCountry, setSelectedCountry] = useState(initialCountry);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // حالة النوافذ المنبثقة (Calculator / Edit Price)
  const [calcItem, setCalcItem] = useState(null);
  const [calcQty, setCalcQty] = useState('1');
  const [editItem, setEditItem] = useState(null);
  const [editPriceVal, setEditPriceVal] = useState('');
  const [copiedBrief, setCopiedBrief] = useState(false);

  // جلب البيانات مع التحديث اللحظي
  const marketData = useMemo(() => {
    return getMaterialPrices(selectedCountry);
  }, [selectedCountry, refreshKey]);

  // فلترة المواد حسب البحث والتصنيف
  const filteredItems = useMemo(() => {
    return marketData.items.filter(item => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        item.name.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        (item.specs && item.specs.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [marketData, activeCategory, searchQuery]);

  // حساب المؤشرات الأربعة الرئيسية للكروت العلوية
  const kpiStats = useMemo(() => {
    const steelItems = marketData.items.filter(i => i.category === 'steel');
    const cementItems = marketData.items.filter(i => i.category === 'cement' && i.unit.includes('طن'));
    const elecItems = marketData.items.filter(i => i.category === 'electrical');
    const tileItems = marketData.items.filter(i => i.category === 'tiles');

    const avgSteel = steelItems.length ? Math.round(steelItems.reduce((acc, i) => acc + i.avgPrice, 0) / steelItems.length) : 0;
    const avgCement = cementItems.length ? Math.round(cementItems.reduce((acc, i) => acc + i.avgPrice, 0) / cementItems.length) : 0;
    const avgElec = elecItems.length ? Math.round(elecItems.reduce((acc, i) => acc + i.avgPrice, 0) / elecItems.length) : 0;
    const avgTiles = tileItems.length ? Math.round(tileItems.reduce((acc, i) => acc + i.avgPrice, 0) / tileItems.length) : 0;

    return {
      steel: { avg: avgSteel, change: 0.0, trend: 'stable' },
      cement: { avg: avgCement, change: +1.2, trend: 'up' },
      elec: { avg: avgElec, change: +1.8, trend: 'up' },
      tiles: { avg: avgTiles, change: -0.5, trend: 'down' }
    };
  }, [marketData]);

  // مشاركة عبر واتساب
  const handleShareWhatsApp = () => {
    const text = generateMarketBriefWhatsAppText(selectedCountry);
    navigator.clipboard?.writeText(text);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 3000);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // حفظ تعديل السعر المحلي
  const handleSavePriceOverride = (e) => {
    e.preventDefault();
    if (!editItem || !editPriceVal || isNaN(Number(editPriceVal))) return;
    const num = Number(editPriceVal);
    saveMaterialPriceOverride(selectedCountry, editItem.id, {
      avgPrice: num,
      minPrice: Math.round(num * 0.97),
      maxPrice: Math.round(num * 1.03),
      change: 0.0,
      trend: 'stable'
    });
    setEditItem(null);
    setRefreshKey(k => k + 1);
  };

  // إعادة التعيين للأسعار الرسمية
  const handleResetDefaults = () => {
    if (window.confirm('هل ترغب في استعادة الأسعار الرسمية الاسترشادية الافتراضية للسوق؟')) {
      resetMaterialPricesToDefault(selectedCountry);
      setRefreshKey(k => k + 1);
    }
  };

  return (
    <div className="material-price-index" style={{ padding: '4px 0 40px 0', animation: 'fadeIn 0.3s ease' }} dir="rtl">
      
      {/* ─── Header & Actions ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 18,
        borderBottom: '1px solid var(--border)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--ink)' }}>
                بورصة ومؤشر أسعار الخامات اليومية 📈
              </h1>
              <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'pulse 1.5s infinite' }} />
                مؤشرات استرشادية حية لأسعار السوق • آخر تحديث: {marketData.lastUpdated}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions: Country Switcher & WhatsApp Share */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          
          {/* Country Switcher */}
          <div style={{
            display: 'flex',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 3,
            gap: 4
          }}>
            <button
              type="button"
              onClick={() => setSelectedCountry('EG')}
              style={{
                border: 'none',
                background: selectedCountry === 'EG' ? '#0F172A' : 'transparent',
                color: selectedCountry === 'EG' ? '#fff' : 'var(--muted)',
                padding: '7px 14px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s'
              }}
            >
              <span>🇪🇬</span> مصر (ج.م)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCountry('SA')}
              style={{
                border: 'none',
                background: selectedCountry === 'SA' ? '#0F172A' : 'transparent',
                color: selectedCountry === 'SA' ? '#fff' : 'var(--muted)',
                padding: '7px 14px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s'
              }}
            >
              <span>🇸🇦</span> السعودية (ر.س)
            </button>
          </div>

          {/* Quick Share to WhatsApp */}
          <button
            type="button"
            className="btn"
            onClick={handleShareWhatsApp}
            style={{
              background: '#25D366',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
              cursor: 'pointer'
            }}
            title="مشاركة ملخص أسعار اليوم عبر واتساب"
          >
            {copiedBrief ? <Check size={16} /> : <Share2 size={16} />}
            <span>{copiedBrief ? 'تم النسخ والفتح!' : 'نشرة واتساب'}</span>
          </button>

          {/* Print Brief */}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => window.print()}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            title="طباعة النشرة اليومية"
          >
            <Printer size={16} />
            <span>طباعة</span>
          </button>

          {/* Reset to defaults */}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleResetDefaults}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '9px 12px',
              color: 'var(--muted)'
            }}
            title="استعادة الأسعار الافتراضية"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ─── Market Status Banner ─── */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: 14,
        padding: '12px 18px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} color="#10B981" />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
            <strong>حالة السوق اليوم:</strong> {marketData.marketStatus}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
          📊 الأسعار استرشادية شاملة ضريبة القيمة المضافة وتخضع لمصاريف النولون وتعتيق الموقع
        </div>
      </div>

      {/* ─── Top 4 KPI Highlight Cards ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
        marginBottom: 28
      }}>
        
        {/* Steel KPI */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '18px 20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>متوسط حديد التسليح</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)', marginTop: 4 }}>
                {kpiStats.steel.avg.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>{marketData.currency} / طن</span>
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(59, 130, 246, 0.12)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10B981', fontWeight: 700 }}>
            <Minus size={15} color="#64748B" />
            <span style={{ color: '#64748B' }}>مستقر اليوم (عز وبشاي وسابك)</span>
          </div>
        </div>

        {/* Cement KPI */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '18px 20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>متوسط إسمنت الخرسانة</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)', marginTop: 4 }}>
                {kpiStats.cement.avg.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>{marketData.currency} {selectedCountry === 'EG' ? '/ طن' : '/ كيس'}</span>
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(16, 185, 129, 0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#D97706', fontWeight: 700 }}>
            <ArrowUpRight size={15} />
            <span>صعود طفيف (+1.2%) لارتفاع النقل</span>
          </div>
        </div>

        {/* Electrical KPI */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '18px 20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>متوسط كابلات التأسيس</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)', marginTop: 4 }}>
                {kpiStats.elec.avg.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>{marketData.currency} / لفة</span>
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245, 158, 11, 0.12)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#DC2626', fontWeight: 700 }}>
            <ArrowUpRight size={15} />
            <span>تأثر بالنحاس (+1.8%) أمن طلبيتك</span>
          </div>
        </div>

        {/* Finishing & Tiles KPI */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '18px 20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>متوسط السيراميك والبورسلين</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)', marginTop: 4 }}>
                {kpiStats.tiles.avg.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>{marketData.currency} / م²</span>
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(139, 92, 246, 0.12)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Square size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10B981', fontWeight: 700 }}>
            <ArrowDownRight size={15} />
            <span>عروض وتخفيضات موسمية (-0.5%)</span>
          </div>
        </div>

      </div>

      {/* ─── Filter Categories & Search Bar ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 18
      }}>
        
        {/* Categories Pills */}
        <div style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 4,
          maxWidth: '100%'
        }}>
          {MATERIAL_CATEGORIES.map(cat => {
            const IconComp = ICON_MAP[cat.icon] || Layers;
            const active = activeCategory === cat.id;
            const count = cat.id === 'all'
              ? marketData.items.length
              : marketData.items.filter(i => i.category === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  border: active ? '1.5px solid #0F172A' : '1px solid var(--border)',
                  background: active ? '#0F172A' : 'var(--card)',
                  color: active ? '#fff' : 'var(--ink)',
                  padding: '8px 14px',
                  borderRadius: 12,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s'
                }}
              >
                <IconComp size={14} color={active ? '#fff' : 'var(--muted)'} />
                <span>{cat.name}</span>
                <span style={{
                  fontSize: 10.5,
                  background: active ? 'rgba(255,255,255,0.2)' : 'var(--border)',
                  color: active ? '#fff' : 'var(--muted)',
                  padding: '1px 6px',
                  borderRadius: 8,
                  fontWeight: 800
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
          <Search size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            className="filter-input"
            style={{ width: '100%', paddingRight: 36, fontSize: 13 }}
            placeholder="بحث عن مادة، مصنع، أو مواصفة..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

      </div>

      {/* ─── Main Materials Price Table ─── */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: 12.5, color: 'var(--muted)' }}>
                <th style={{ padding: '14px 18px' }}>المادة والمصنع</th>
                <th>الوحدة</th>
                <th>متوسط السعر اليوم</th>
                <th>نطاق السوق (أدنى - أعلى)</th>
                <th>التغير اليومي</th>
                <th>توصية وملاحظة السوق</th>
                <th style={{ textAlign: 'center' }}>إجراء سريع</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                    <AlertCircle size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                    <div>لا توجد مواد مطابقة للبحث أو التصنيف المحدد</div>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isUp = item.change > 0;
                  const isDown = item.change < 0;

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                      {/* Name & Brand */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--ink)' }}>
                          {item.name}
                          {item.isCustomized && (
                            <span style={{
                              marginRight: 6, fontSize: 10, padding: '1px 6px',
                              borderRadius: 6, background: '#D9770618', color: '#D97706',
                              fontWeight: 800, border: '1px solid #D9770630'
                            }}>
                              سعر مخصص للشركة
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                          العلامة: <strong>{item.brand}</strong> • {item.specs}
                        </div>
                      </td>

                      {/* Unit */}
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 8,
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--ink)'
                        }}>
                          {item.unit}
                        </span>
                      </td>

                      {/* Average Price */}
                      <td>
                        <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--ink)' }}>
                          {item.avgPrice.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 700 }}>{marketData.currency}</span>
                        </div>
                      </td>

                      {/* Range (Min - Max) */}
                      <td>
                        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                          {item.minPrice.toLocaleString()} — {item.maxPrice.toLocaleString()} {marketData.currency}
                        </div>
                      </td>

                      {/* Daily Change */}
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: 800,
                          background: isUp ? 'rgba(239, 68, 68, 0.1)' : isDown ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.08)',
                          color: isUp ? '#DC2626' : isDown ? '#059669' : '#64748B',
                          border: `1px solid ${isUp ? 'rgba(239, 68, 68, 0.25)' : isDown ? 'rgba(16, 185, 129, 0.25)' : 'rgba(100, 116, 139, 0.2)'}`
                        }}>
                          {isUp ? <TrendingUp size={12} /> : isDown ? <TrendingDown size={12} /> : <Minus size={12} />}
                          {item.change !== 0 ? `${Math.abs(item.change)}%` : 'مستقر'}
                        </span>
                      </td>

                      {/* Advice */}
                      <td style={{ maxWidth: 260 }}>
                        <div style={{ fontSize: 11.5, color: 'var(--ink)', lineHeight: 1.5 }}>
                          💡 {item.advice}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {/* Calculate button */}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => { setCalcItem(item); setCalcQty('1'); }}
                            style={{ padding: '6px 10px', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}
                            title="حاسبة تكلفة كمية معينة"
                          >
                            <Calculator size={13} color="#2563EB" />
                            <span>حساب تكلفة</span>
                          </button>

                          {/* Edit Custom Price */}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => { setEditItem(item); setEditPriceVal(item.avgPrice.toString()); }}
                            style={{ padding: '6px 8px', color: 'var(--muted)' }}
                            title="تعديل السعر الخاص بشركتك"
                          >
                            <Edit3 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Instant Quantity Calculator Modal ─── */}
      {calcItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16
        }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 24, width: '100%', maxWidth: 440,
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
          }} dir="rtl">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#2563EB18', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calculator size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>حاسبة تكلفة المواد السريعة</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{calcItem.name}</div>
                </div>
              </div>
              <button onClick={() => setCalcItem(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                الكمية المطلوبة ({calcItem.unit})
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                className="filter-input"
                style={{ width: '100%', fontSize: 16, fontWeight: 800 }}
                value={calcQty}
                onChange={e => setCalcQty(e.target.value)}
                autoFocus
              />
            </div>

            {/* Calculations Breakdown */}
            {Number(calcQty) > 0 && (
              <div style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '16px',
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>سعر الوحدة المتوسط:</span>
                  <span style={{ fontWeight: 800 }}>{calcItem.avgPrice.toLocaleString()} {marketData.currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>الكمية الإجمالية:</span>
                  <span style={{ fontWeight: 800 }}>{calcQty} {calcItem.unit}</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>التكلفة التقديرية الإجمالية:</span>
                  <span style={{ fontWeight: 900, fontSize: 18, color: '#10B981' }}>
                    {Math.round(calcItem.avgPrice * Number(calcQty)).toLocaleString()} {marketData.currency}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
                  نطاق التكلفة في السوق: بين {Math.round(calcItem.minPrice * Number(calcQty)).toLocaleString()} و {Math.round(calcItem.maxPrice * Number(calcQty)).toLocaleString()} {marketData.currency}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setCalcItem(null)}
              >
                إغلاق
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2, background: '#0F172A', color: '#fff' }}
                onClick={() => {
                  const text = `حساب تكلفة توريد:\nالمادة: ${calcItem.name}\nالكمية: ${calcQty} ${calcItem.unit}\nالتكلفة التقديرية: ${Math.round(calcItem.avgPrice * Number(calcQty)).toLocaleString()} ${marketData.currency}`;
                  navigator.clipboard?.writeText(text);
                  alert('✅ تم نسخ الحسبة بنجاح لإرسالها للعميل أو المهندس!');
                  setCalcItem(null);
                }}
              >
                نسخ الحسبة للمحادثة 📋
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Custom Price Modal ─── */}
      {editItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16
        }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 24, width: '100%', maxWidth: 420,
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
          }} dir="rtl">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#D9770618', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>تخصيص سعر للمادة بشركتك</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{editItem.name}</div>
                </div>
              </div>
              <button onClick={() => setEditItem(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePriceOverride}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                  سعر التوريد الخاص بشركتك ({marketData.currency} / {editItem.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  className="filter-input"
                  style={{ width: '100%', fontSize: 15, fontWeight: 800 }}
                  value={editPriceVal}
                  onChange={e => setEditPriceVal(e.target.value)}
                  autoFocus
                />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                  💡 يفيدك هذا التعديل إذا كان لديك سعر تفضيلي خاص من موردك لحساب التكاليف والمقايسات.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditItem(null)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#0F172A', color: '#fff' }}
                >
                  حفظ السعر المخصص
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
