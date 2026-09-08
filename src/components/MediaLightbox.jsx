import React, { useState, useEffect } from 'react';
import { X, Download, Play, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import { resolveMediaDisplayUrl } from '../utils/mediaStorage';

export default function MediaLightbox({ item, onClose }) {
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [loading, setLoading] = useState(true);

  const isVideo = item?.type === 'video' ||
    (typeof item?.src === 'string' && (item.src.includes('.mp4') || item.src.includes('.webm') || item.src.startsWith('data:video')));

  useEffect(() => {
    let active = true;
    if (!item) return;

    setLoading(true);
    const rawSrc = item.src || item.rawSrc || '';

    if (rawSrc.startsWith('http://') || rawSrc.startsWith('https://') || rawSrc.startsWith('blob:') || rawSrc.startsWith('data:')) {
      setResolvedUrl(rawSrc);
      setLoading(false);
      return;
    }

    resolveMediaDisplayUrl(item).then((url) => {
      if (active) {
        setResolvedUrl(url || item.thumbnail || rawSrc);
        setLoading(false);
      }
    }).catch(() => {
      if (active) {
        setResolvedUrl(item.thumbnail || rawSrc);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [item]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose && onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(6px)',
        zIndex: 10010,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      {/* Top action bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 900,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          color: '#fff',
          direction: 'rtl',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          {isVideo ? <Video size={20} color="#818CF8" /> : <ImageIcon size={20} color="#34D399" />}
          <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {item.caption || item.name || (isVideo ? 'فيديو توثيق الموقع' : 'صورة توثيق الموقع')}
          </span>
          {item.date && (
            <span style={{ fontSize: 11, color: '#94A3B8', marginRight: 4 }}>
              ({item.date})
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {resolvedUrl && (
            <a
              href={resolvedUrl}
              download={item.name || (isVideo ? 'site_video.mp4' : 'site_photo.jpg')}
              target="_blank"
              rel="noopener noreferrer"
              title="تنزيل الملف بدقته الكاملة"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <Download size={14} />
              <span>تحميل</span>
            </a>
          )}

          <button
            onClick={onClose}
            style={{
              background: 'rgba(239,68,68,0.2)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#F87171',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
            }}
          >
            <X size={16} />
            <span>إغلاق</span>
          </button>
        </div>
      </div>

      {/* Main viewer */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '95vw',
          maxHeight: '82vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <div style={{ padding: 40, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Loader2 size={28} className="spin" color="#6366F1" />
            <span style={{ fontSize: 14 }}>جاري تحميل الملف...</span>
          </div>
        ) : isVideo ? (
          <video
            src={resolvedUrl}
            controls
            autoPlay
            playsInline
            style={{
              maxWidth: '95vw',
              maxHeight: '80vh',
              borderRadius: 12,
              border: '2px solid rgba(99,102,241,0.6)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              background: '#000',
            }}
          />
        ) : (
          <img
            src={resolvedUrl}
            alt={item.caption || 'معاينة'}
            style={{
              maxWidth: '95vw',
              maxHeight: '80vh',
              borderRadius: 12,
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              objectFit: 'contain',
              background: '#000',
            }}
          />
        )}
      </div>
    </div>
  );
}
