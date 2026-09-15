import React, { useState, useEffect } from 'react';
import { resolveMediaDisplayUrl, syncResolveMediaUrl } from '../utils/mediaStorage';
import { Video, Camera } from 'lucide-react';

export default function MediaThumbnail({ item, onClick, style = {}, className = '' }) {
  const [resolvedSrc, setResolvedSrc] = useState(() => syncResolveMediaUrl(item));
  const isVideo = item?.type === 'video' || (typeof item?.src === 'string' && (item.src.includes('.mp4') || item.src.includes('.webm') || item.src.startsWith('data:video')));

  useEffect(() => {
    let active = true;
    if (!item) return;

    // فحص تزامني فوري
    const syncUrl = syncResolveMediaUrl(item);
    if (syncUrl) {
      setResolvedSrc(syncUrl);
      return;
    }

    // استرجاع الملف من IndexedDB أو استخدام المصغرة
    resolveMediaDisplayUrl(item).then((url) => {
      if (active && url && !url.startsWith('idb://')) {
        setResolvedSrc(url);
      }
    });

    return () => {
      active = false;
    };
  }, [item?.id, item?.src, item?.thumbnail]);

  const rawSrc = typeof item === 'string' ? item : item?.src;
  const rawThumb = typeof item === 'object' ? item?.thumbnail : '';
  const displaySrc = (resolvedSrc && !resolvedSrc.startsWith('idb://')) 
    ? resolvedSrc 
    : (rawThumb && rawThumb.startsWith('data:')) 
      ? rawThumb 
      : (typeof rawSrc === 'string' && (rawSrc.startsWith('http') || rawSrc.startsWith('data:') || rawSrc.startsWith('blob:'))) 
        ? rawSrc 
        : '';

  return (
    <div
      className={className}
      onClick={() => onClick && onClick({ ...item, src: displaySrc || rawSrc })}
      style={{
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
        background: '#1E293B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        ...style,
      }}
    >
      {isVideo ? (
        displaySrc ? (
          <video
            src={displaySrc}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
            playsInline
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#fff', background: '#0F172A' }}>
            <Video size={20} color="#818CF8" />
            <span style={{ fontSize: 10, fontWeight: 700 }}>فيديو 🎥</span>
          </div>
        )
      ) : displaySrc ? (
        <>
          {/* Ambient blurred backdrop so portrait photos fill gracefully */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${displaySrc})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(12px) brightness(0.6)',
              transform: 'scale(1.2)',
              zIndex: 0,
            }}
          />
          <img
            src={displaySrc}
            alt={item?.caption || item?.name || 'معاينة'}
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.25s ease'
            }}
            loading="lazy"
            onError={(e) => {
              if (rawThumb && rawThumb.startsWith('data:') && e.target.src !== rawThumb) {
                e.target.src = rawThumb;
              }
            }}
          />
        </>
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#94A3B8', background: 'rgba(30, 41, 59, 0.5)' }}>
          <Camera size={22} color="#94A3B8" />
          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#94A3B8' }}>صورة موثقة</span>
        </div>
      )}

      {isVideo && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'rgba(99,102,241,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Video size={14} color="#fff" />
          </div>
        </div>
      )}
    </div>
  );
}
