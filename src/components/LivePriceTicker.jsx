import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight, Sparkles } from 'lucide-react';
import { getMaterialPrices } from '../data/materialPricesData';

export default function LivePriceTicker({ onNavigateToPriceIndex, country = 'EG' }) {
  const data = React.useMemo(() => getMaterialPrices(country), [country]);

  // أهم الأصناف للشريط السريع
  const tickerItems = React.useMemo(() => {
    return data.items.filter(i =>
      i.id.includes('steel_ezz') ||
      i.id.includes('steel_sabic') ||
      i.id.includes('cement_sewedy') ||
      i.id.includes('cement_yamama') ||
      i.id.includes('elec_sewedy_2_5') ||
      i.id.includes('elec_fanar_4') ||
      i.id.includes('brick_red') ||
      i.id.includes('tile_cleo')
    );
  }, [data]);

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '10px 16px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
      overflow: 'hidden'
    }} dir="rtl">
      
      {/* Title & Live Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 8px',
          borderRadius: 8,
          background: 'rgba(16, 185, 129, 0.12)',
          color: '#059669',
          fontSize: 11.5,
          fontWeight: 800
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'pulse 1.5s infinite' }} />
          بورصة الخامات
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', display: 'none', md: 'inline' }}>
          {data.flag} {data.countryName}
        </span>
      </div>

      {/* Horizontal Ticker Items */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        flex: 1,
        padding: '2px 0'
      }}>
        {tickerItems.map(item => {
          const isUp = item.change > 0;
          const isDown = item.change < 0;

          return (
            <div
              key={item.id}
              onClick={() => onNavigateToPriceIndex?.()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                padding: '4px 8px',
                borderRadius: 8,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                transition: 'transform 0.15s ease'
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{item.brand || item.name}:</span>
              <span style={{ fontWeight: 800, color: 'var(--ink)' }}>
                {item.avgPrice.toLocaleString()} {data.currency}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                color: isUp ? '#DC2626' : isDown ? '#059669' : '#64748B'
              }}>
                {isUp ? '▲' : isDown ? '▼' : '—'}
                {item.change !== 0 ? `${Math.abs(item.change)}%` : ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* View Full Index Link */}
      <button
        type="button"
        onClick={() => onNavigateToPriceIndex?.()}
        style={{
          border: 'none',
          background: 'none',
          color: '#1877F2',
          fontSize: 12,
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexShrink: 0,
          whiteSpace: 'nowrap'
        }}
      >
        <span>كامل الأسعار</span>
        <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
      </button>

    </div>
  );
}
