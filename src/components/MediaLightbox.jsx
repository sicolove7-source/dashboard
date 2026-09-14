import React, { useState, useEffect, useRef } from 'react';
import {
  X, Download, Video, Image as ImageIcon, Loader2,
  RotateCw, ZoomIn, ZoomOut, Maximize2, Minimize2,
  ChevronRight, ChevronLeft, MessageCircle, RefreshCw
} from 'lucide-react';
import { resolveMediaDisplayUrl } from '../utils/mediaStorage';

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

  // Resolve Image URL
  useEffect(() => {
    let active = true;
    if (!activeItem) return;

    setLoading(true);
    const rawSrc = activeItem.src || activeItem.rawSrc || '';

    if (rawSrc.startsWith('http://') || rawSrc.startsWith('https://') || rawSrc.startsWith('data:')) {
      setResolvedUrl(rawSrc);
      setLoading(false);
      return;
    }

    resolveMediaDisplayUrl(activeItem).then((url) => {
      if (active) {
        const safeUrl = (url && !url.startsWith('idb://'))
          ? url
          : (activeItem.thumbnail && !activeItem.thumbnail.startsWith('idb://'))
            ? activeItem.thumbnail
            : (rawSrc && (rawSrc.startsWith('http') || rawSrc.startsWith('data:') || rawSrc.startsWith('blob:')))
              ? rawSrc
              : '';
        setResolvedUrl(safeUrl);
        setLoading(false);
      }
    }).catch(() => {
      if (active) {
        setResolvedUrl(activeItem.thumbnail || '');
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

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 10, 20, 0.96)',
        backdropFilter: 'blur(16px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        animation: 'fadeIn 0.2s ease-out',
        userSelect: 'none',
        overflow: 'hidden',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ─── Ambient Glow Background (المحيط الجمالي الملون) ─── */}
      {resolvedUrl && !isVideo && (
        <div
          style={{
            position: 'absolute',
            inset: -40,
            backgroundImage: `url(${resolvedUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(60px) saturate(1.4) brightness(0.18)',
            opacity: 0.85,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ─── Top Luxury Control Bar ─── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 1100,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          background: 'rgba(30, 41, 59, 0.75)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: 16,
          color: '#F8FAFC',
          direction: 'rtl',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        }}
      >
        {/* Title & Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {isVideo ? (
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(129, 140, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video size={18} color="#818CF8" />
            </div>
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={18} color="#34D399" />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {activeItem.caption || activeItem.name || (isVideo ? 'فيديو توثيق الموقع' : 'صورة الموقع الميدانية')}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', display: 'flex', gap: 8 }}>
              {activeItem.date && <span>{activeItem.date}</span>}
              {currentList.length > 1 && (
                <span style={{ color: '#38BDF8', fontWeight: 700 }}>
                  ({currentIndex + 1} من {currentList.length})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Rotate Button (تدوير 90 درجة لحل مشكلة الصور الطولية) */}
          {!isVideo && (
            <button
              onClick={handleRotate}
              title="تدوير الصورة 90° (حل مشكلة الصور الطولية والعرضية)"
              style={{
                background: rotation !== 0 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${rotation !== 0 ? '#38BDF8' : 'rgba(255, 255, 255, 0.15)'}`,
                color: rotation !== 0 ? '#38BDF8' : '#F8FAFC',
                padding: '7px 10px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s',
              }}
            >
              <RotateCw size={15} />
              <span className="hide-mobile">{rotation !== 0 ? `${rotation}°` : 'تدوير'}</span>
            </button>
          )}

          {/* Zoom In & Out */}
          {!isVideo && (
            <>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                title="تكبير الصورة"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#F8FAFC',
                  padding: '7px 9px',
                  borderRadius: 10,
                  cursor: zoom >= 3 ? 'not-allowed' : 'pointer',
                  opacity: zoom >= 3 ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ZoomIn size={15} />
              </button>

              <button
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                title="تصغير الصورة"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#F8FAFC',
                  padding: '7px 9px',
                  borderRadius: 10,
                  cursor: zoom <= 1 ? 'not-allowed' : 'pointer',
                  opacity: zoom <= 1 ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ZoomOut size={15} />
              </button>

              {zoom > 1 && (
                <button
                  onClick={handleResetZoom}
                  title="إعادة ضبط الحجم"
                  style={{
                    background: '#38BDF8',
                    border: 'none',
                    color: '#0F172A',
                    padding: '5px 8px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  100%
                </button>
              )}

              {/* Fit Mode Toggle (ملاءمة / ملء الشاشة) */}
              <button
                onClick={() => setFitMode(m => m === 'contain' ? 'cover' : 'contain')}
                title={fitMode === 'contain' ? 'ملء الشاشة' : 'ملاءمة أبعاد الصورة كاملة'}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#F8FAFC',
                  padding: '7px 9px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {fitMode === 'contain' ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
            </>
          )}

          {/* Download Original */}
          {resolvedUrl && (
            <a
              href={resolvedUrl}
              download={activeItem.name || (isVideo ? 'site_video.mp4' : 'site_photo.jpg')}
              target="_blank"
              rel="noopener noreferrer"
              title="تنزيل الملف بدقته الكاملة"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                padding: '7px 10px',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                textDecoration: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <Download size={15} />
              <span className="hide-mobile">تحميل</span>
            </a>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            title="إغلاق المعاينة"
            style={{
              background: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              color: '#FCA5A5',
              padding: '7px 12px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              marginLeft: 4,
            }}
          >
            <X size={16} />
            <span>إغلاق</span>
          </button>
        </div>
      </div>

      {/* ─── Center Viewport Stage (مسرح العرض الذكي المتجاوب) ─── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 5,
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px',
          overflow: 'hidden',
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Previous Navigation Button (RTL: Right Arrow) */}
        {currentList.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goToPrev(); }}
            title="الصورة السابقة"
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s',
            }}
          >
            <ChevronRight size={26} />
          </button>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader2 size={36} className="spin" color="#38BDF8" />
            <span style={{ fontSize: 14, fontWeight: 700 }}>جاري عرض الصورة بأعلى دقة...</span>
          </div>
        ) : isVideo ? (
          <video
            src={resolvedUrl}
            controls
            autoPlay
            playsInline
            style={{
              maxWidth: '96vw',
              maxHeight: 'calc(100vh - 150px)',
              borderRadius: 16,
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              background: '#0F172A',
            }}
          />
        ) : (
          /* Smart Responsive Image Frame (تتكيف ذاتياً مع الصور الطولية والعرضية) */
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              maxHeight: 'calc(100vh - 130px)',
              transform: `translate(${pan.x}px, ${pan.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <img
              src={resolvedUrl}
              alt={activeItem.caption || 'معاينة الموقع'}
              style={{
                maxWidth: (rotation === 90 || rotation === 270) ? 'calc(100vh - 140px)' : '96vw',
                maxHeight: (rotation === 90 || rotation === 270) ? '90vw' : 'calc(100vh - 140px)',
                width: fitMode === 'cover' ? '100%' : 'auto',
                height: fitMode === 'cover' ? '100%' : 'auto',
                objectFit: fitMode,
                borderRadius: 16,
                boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                transform: `rotate(${rotation}deg) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                transformOrigin: 'center center',
                display: 'block',
              }}
              draggable={false}
            />
          </div>
        )}

        {/* Next Navigation Button (RTL: Left Arrow) */}
        {currentList.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            title="الصورة التالية"
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s',
            }}
          >
            <ChevronLeft size={26} />
          </button>
        )}
      </div>

      {/* ─── Bottom Information & Quick Share Strip ─── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 900,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '8px 18px',
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(12px)',
          borderRadius: 14,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#CBD5E1',
          fontSize: 12,
          direction: 'rtl',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {activeItem.source && (
            <span>📌 <strong>المصدر:</strong> {activeItem.source}</span>
          )}
          {activeItem.author && (
            <span>👷 <strong>المسجل:</strong> {activeItem.author}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#94A3B8' }} className="hide-mobile">
            💡 يمكنك استخدام أسهم لوحة المفاتيح للتنقل وحرف R للتدوير
          </span>
          {resolvedUrl && (
            <button
              onClick={() => {
                const text = encodeURIComponent(`صورة توثيق موقع المشروع:\n${resolvedUrl}`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
              }}
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34D399',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <MessageCircle size={13} /> مشاركة واتساب
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
