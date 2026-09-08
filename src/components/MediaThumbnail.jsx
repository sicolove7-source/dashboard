import React, { useState, useEffect } from 'react';
import { resolveMediaDisplayUrl } from '../utils/mediaStorage';
import { Video } from 'lucide-react';

export default function MediaThumbnail({ item, onClick, style = {}, className = '' }) {
  const [resolvedSrc, setResolvedSrc] = useState(item?.thumbnail || '');
  const isVideo = item?.type === 'video' || (typeof item?.src === 'string' && (item.src.includes('.mp4') || item.src.includes('.webm') || item.src.startsWith('data:video')));

  useEffect(() => {
    let active = true;
    if (!item) return;

    // إذا كان الرابط سحابي مباشر HTTPS نستخدمه فوراً
    if (typeof item.src === 'string' && (item.src.startsWith('https://') || item.src.startsWith('http://'))) {
      setResolvedSrc(item.src);
      return;
    }

    // استرجاع الملف من IndexedDB أو استخدام المصغرة
    resolveMediaDisplayUrl(item).then((url) => {
      if (active && url) {
        setResolvedSrc(url);
      }
    });

    return () => {
      active = false;
    };
  }, [item]);

  const displaySrc = resolvedSrc || item?.thumbnail || (typeof item?.src === 'string' && !item.src.startsWith('idb://') ? item.src : '');

  return (
    <div
      className={className}
      onClick={() => onClick && onClick({ ...item, src: displaySrc || item.src })}
      style={{
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
        background: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        ...style,
      }}
    >
      {isVideo ? (
        displaySrc && !displaySrc.startsWith('idb://') ? (
          <video
            src={displaySrc}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
            playsInline
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#fff' }}>
            <Video size={20} color="#818CF8" />
            <span style={{ fontSize: 10, fontWeight: 700 }}>فيديو 🎥</span>
          </div>
        )
      ) : (
        <img
          src={displaySrc || '/favicon.svg'}
          alt={item?.caption || item?.name || 'معاينة'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />
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
