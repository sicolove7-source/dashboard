import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Download, Video, Image as ImageIcon, Loader2,
  RotateCw, ZoomIn, ZoomOut, Maximize2, Minimize2,
  ChevronRight, ChevronLeft, MessageCircle, RefreshCw
} from 'lucide-react';
import { resolveMediaDisplayUrl, getMediaBlob } from '../utils/mediaStorage';

export default function MediaLightbox({ item, items = [], onClose }) {
  // Current active item (support single item or gallery list)
  const [activeItem, setActiveItem] = useState(item);
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [loading, setLoading] = useState(true);

  // Viewer Transformations
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [zoom, setZoom] = useState(1); // 1 to 3
  const [fitMode, setFitMode] = useState('contain'); // 'contain' | 'cover'

  // Pan / Drag State when zoomed
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Touch Swipe for mobile gallery navigation
  const touchStart = useRef({ x: 0, y: 0 });

  // Update active item when prop changes
  useEffect(() => {
    setActiveItem(item);
    setRotation(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [item]);

  // Gallery Navigation indices
  const currentList = Array.isArray(items) && items.length > 0 ? items : (item ? [item] : []);
  const currentIndex = currentList.findIndex(x => (x.id && activeItem?.id && x.id === activeItem.id) || x.src === activeItem?.src);

  function goToNext() {
    if (currentList.length <= 1) return;
    const nextIdx = (currentIndex + 1) % currentList.length;
    setActiveItem(currentList[nextIdx]);
    setRotation(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function goToPrev() {
    if (currentList.length <= 1) return;
    const prevIdx = (currentIndex - 1 + currentList.length) % currentList.length;
    setActiveItem(currentList[prevIdx]);
    setRotation(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  const isVideo = activeItem?.type === 'video' ||
    (typeof activeItem?.src === 'string' && (activeItem.src.includes('.mp4') || activeItem.src.includes('.webm') || activeItem.src.startsWith('data:video')));

  // Resolve Image URL with Priority for High-Res IndexedDB locally and Guaranteed Thumbnail fallback for cross-browser
  useEffect(() => {
    let active = true;
    if (!activeItem) return;

    setLoading(true);

    const directSrc = (typeof activeItem?.src === 'string' && !activeItem.src.startsWith('idb://')) ? activeItem.src : '';
    const directThumb = (typeof activeItem?.thumbnail === 'string' && !activeItem.thumbnail.startsWith('idb://')) ? activeItem.thumbnail : '';
    const rawSrc = (typeof activeItem?.rawSrc === 'string' && !activeItem.rawSrc.startsWith('idb://')) ? activeItem.rawSrc : '';
    
    // أي رابط صورة فوري سحابي أو DataURL
    const immediateSafeUrl = (directSrc && (directSrc.startsWith('http') || directSrc.startsWith('data:image/')))
      ? directSrc
      : (directThumb && (directThumb.startsWith('http') || directThumb.startsWith('data:image/')))
        ? directThumb
        : (rawSrc && (rawSrc.startsWith('http') || rawSrc.startsWith('data:image/')))
          ? rawSrc
          : (directSrc && directSrc.startsWith('blob:'))
            ? directSrc
            : '';

    const id = activeItem.id || 
      (typeof activeItem.rawSrc === 'string' && activeItem.rawSrc.startsWith('idb://') ? activeItem.rawSrc.replace('idb://', '') : null) ||
      (typeof activeItem.src === 'string' && activeItem.src.startsWith('idb://') ? activeItem.src.replace('idb://', '') : null);

    // إذا كان هناك معرف IndexedDB، نفحص إن كان هذا المتصفح يملك النسخة الأصلية الكاملة عالية الدقة
    if (id) {
      getMediaBlob(id).then((blob) => {
        if (!active) return;
        if (blob) {
          const highResUrl = URL.createObjectURL(blob);
          setResolvedUrl(highResUrl);
          setLoading(false);
          return;
        }
        // إذا لم توجد في IndexedDB (متصفح آخر أو عميل)، نعرض المصغرة فوراً ونحاول جلب النسخة عالية الدقة من Cloud Vault في الخلفية
        if (immediateSafeUrl) {
          setResolvedUrl(immediateSafeUrl);
        }
        resolveMediaDisplayUrl(activeItem).then((url) => {
          if (active && url && !url.startsWith('idb://')) {
            setResolvedUrl(url);
            setLoading(false);
          } else {
            setLoading(false);
          }
        }).catch(() => {
          if (active) setLoading(false);
        });
      }).catch(() => {
        if (active) {
          setResolvedUrl(immediateSafeUrl || '');
          setLoading(false);
        }
      });
      return;
    }

    // إذا لم يكن هناك ID في IndexedDB، نعتمد على الرابط الصالح فوراً
    if (immediateSafeUrl) {
      setResolvedUrl(immediateSafeUrl);
      setLoading(false);
      return;
    }

    resolveMediaDisplayUrl(activeItem).then((url) => {
      if (active) {
        setResolvedUrl(url || '');
        setLoading(false);
      }
    }).catch(() => {
      if (active) {
        setResolvedUrl('');
        setLoading(false);
      }
    });

    return () => { active = false; };
  }, [activeItem]);

  // Keyboard Navigation (Escape, Left, Right)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose && onClose();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'r' || e.key === 'R') handleRotate();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentIndex, currentList]);

  // Prevent background scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  function handleRotate() {
    setRotation(prev => (prev + 90) % 360);
  }

  function handleZoomIn() {
    setZoom(prev => Math.min(prev + 0.5, 3));
  }

  function handleZoomOut() {
    setZoom(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }

  function handleResetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  }

  // Pan Dragging handlers
  function handleMouseDown(e) {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }

  function handleMouseMove(e) {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  // Touch handlers for mobile swipe
  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function handleTouchEnd(e) {
    if (zoom > 1) return; // Don't swipe when zoomed
    if (currentList.length <= 1) return; // Don't swipe when only 1 item
    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;
    // Horizontal swipe threshold
    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 60) {
      if (deltaX > 0) {
        goToPrev(); // Swipe right in RTL
      } else {
        goToNext(); // Swipe left in RTL
      }
    }
  }

  if (!activeItem) return null;

  const modalContent = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        height: '100dvh',
        background: 'rgba(10, 15, 30, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        boxSizing: 'border-box',
        animation: 'fadeInBackdrop 0.18s ease-out',
        userSelect: 'none',
        overflow: 'hidden',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ─── Centered Popup Modal Card (نافذة البوب اب الفخمة في منتصف الشاشة) ─── */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="lightbox-popup-card"
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 700,
          maxHeight: 'min(92dvh, 820px)',
          background: '#1E293B',
          border: '1.5px solid rgba(255, 255, 255, 0.16)',
          borderRadius: 20,
          boxShadow: '0 25px 65px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'popIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          direction: 'rtl',
        }}
      >
        {/* 1. ─── Popup Header ─── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            background: 'rgba(30, 41, 59, 0.96)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            gap: 10,
            flexShrink: 0,
          }}
        >
          {/* Right: Icon + Caption + Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: isVideo ? 'rgba(129, 140, 248, 0.2)' : 'rgba(52, 211, 153, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isVideo ? <Video size={18} color="#818CF8" /> : <ImageIcon size={18} color="#34D399" />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: '#F8FAFC',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {activeItem.caption || activeItem.name || (isVideo ? 'فيديو توثيق الموقع' : 'صورة توثيق الموقع')}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', display: 'flex', gap: 8 }}>
                {activeItem.date && <span>📅 {activeItem.date}</span>}
                {currentList.length > 1 && (
                  <span style={{ color: '#38BDF8', fontWeight: 700 }}>
                    ({currentIndex + 1} من {currentList.length})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Left: Quick Actions & Prominent Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {!isVideo && (
              <button
                onClick={handleRotate}
                title="تدوير الصورة 90°"
                style={{
                  background: rotation !== 0 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${rotation !== 0 ? '#38BDF8' : 'rgba(255, 255, 255, 0.15)'}`,
                  color: rotation !== 0 ? '#38BDF8' : '#F8FAFC',
                  padding: '6px 9px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <RotateCw size={14} />
                <span className="hide-mobile">{rotation !== 0 ? `${rotation}°` : 'تدوير'}</span>
              </button>
            )}

            {resolvedUrl && !resolvedUrl.startsWith('idb://') && (
              <a
                href={resolvedUrl}
                download={activeItem.name || (isVideo ? 'site_video.mp4' : 'site_photo.jpg')}
                target="_blank"
                rel="noopener noreferrer"
                title="تحميل بجودة كاملة"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#F8FAFC',
                  padding: '6px 9px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  textDecoration: 'none',
                }}
              >
                <Download size={14} />
              </a>
            )}

            <button
              onClick={onClose}
              title="إغلاق البوب اب"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                color: '#FCA5A5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. ─── Popup Center Image Stage ─── */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 220,
            maxHeight: 'calc(85dvh - 125px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0B1120',
            padding: '10px',
            overflow: 'hidden',
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Ambient Glow Backdrop inside the popup card */}
          {resolvedUrl && !isVideo && (
            <div
              style={{
                position: 'absolute',
                inset: -20,
                backgroundImage: `url(${resolvedUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(45px) saturate(1.4) brightness(0.28)',
                opacity: 0.85,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Loading Spinner */}
          {loading ? (
            <div style={{ color: '#38BDF8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, zIndex: 2 }}>
              <Loader2 size={34} className="spin" />
              <span style={{ fontSize: 13, color: '#CBD5E1', fontWeight: 700 }}>جاري استرداد الصورة بأعلى دقة أصلية...</span>
            </div>
          ) : isVideo ? (
            <video
              src={resolvedUrl}
              controls
              autoPlay
              playsInline
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(80dvh - 140px)',
                borderRadius: 12,
                zIndex: 2,
                boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
              }}
            />
          ) : (resolvedUrl && !resolvedUrl.startsWith('idb://')) ? (
            /* Perfectly Centered, Non-Stretched High-Res Photo */
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                transform: `translate(${pan.x}px, ${pan.y}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              <img
                src={resolvedUrl}
                alt={activeItem.caption || 'معاينة الموقع'}
                style={{
                  maxWidth: (rotation === 90 || rotation === 270) ? '60vh' : '100%',
                  maxHeight: (rotation === 90 || rotation === 270) ? '80vw' : 'calc(80dvh - 140px)',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  borderRadius: 12,
                  boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  transformOrigin: 'center center',
                  display: 'block',
                }}
                onError={() => setResolvedUrl('')}
                draggable={false}
              />
            </div>
          ) : (
            <div style={{ color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, zIndex: 2, textAlign: 'center', padding: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon size={32} color="#38BDF8" style={{ opacity: 0.8 }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#F8FAFC' }}>الصورة الأصلية محفوظة محلياً في جهاز المهندس</div>
              <div style={{ fontSize: 12.5, color: '#94A3B8', maxWidth: 360, lineHeight: 1.7 }}>
                تم تسجيل وتوثيق هذه اليومية في الموقع. سيتم إتاحة المعاينة السحابية للعميل بمجرد فتح المهندس للوحة التحكم للرفع السحابي.
              </div>
            </div>
          )}

          {/* Previous Button (RTL: Right Arrow) */}
          {currentList.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              title="الصورة السابقة"
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(15, 23, 42, 0.88)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              }}
            >
              <ChevronRight size={20} />
            </button>
          )}

          {/* Next Button (RTL: Left Arrow) */}
          {currentList.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              title="الصورة التالية"
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(15, 23, 42, 0.88)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
        </div>

        {/* 3. ─── Popup Footer ─── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 14px',
            background: 'rgba(15, 23, 42, 0.96)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            gap: 10,
            flexShrink: 0,
            fontSize: 12,
          }}
        >
          {/* Author / Source */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94A3B8' }}>
            {activeItem.author && (
              <span>👷 <strong>المسجل:</strong> {activeItem.author}</span>
            )}
            {activeItem.source && (
              <span className="hide-mobile">📌 {activeItem.source}</span>
            )}
          </div>

          {/* WhatsApp & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {resolvedUrl && !resolvedUrl.startsWith('idb://') && (
              <button
                onClick={() => {
                  const text = encodeURIComponent(`صورة توثيق موقع المشروع:\n${resolvedUrl}`);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34D399',
                  padding: '5px 11px',
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <MessageCircle size={13} />
                <span>واتساب</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#E2E8F0',
                padding: '5px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(8px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .hide-mobile { display: none !important; }
          .lightbox-popup-card {
            max-width: 96vw !important;
            border-radius: 16px !important;
          }
        }
      `}</style>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
