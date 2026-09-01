import React, { useRef, useState, useEffect } from 'react';
import { Check, X, RotateCcw } from 'lucide-react';

export default function ImageAnnotator({ imageSrc, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState(null);
  const [imageObj, setImageObj] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageObj(img);
      // Calculate responsive dimensions
      const maxWidth = window.innerWidth - 40;
      const maxHeight = window.innerHeight - 200; // Leave space for buttons
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }

      setDimensions({ width, height });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (imageObj && canvasRef.current && dimensions.width > 0) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      
      // Draw initial image
      context.drawImage(imageObj, 0, 0, dimensions.width, dimensions.height);
      
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = '#EF4444'; // Red color for snag markup
      context.lineWidth = 4;
      
      setCtx(context);
    }
  }, [imageObj, dimensions]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e) => {
    e.preventDefault();
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || !ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (ctx) {
      ctx.closePath();
    }
    setIsDrawing(false);
  };

  const handleClear = () => {
    if (ctx && imageObj) {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      ctx.drawImage(imageObj, 0, 0, dimensions.width, dimensions.height);
    }
  };

  const handleSave = () => {
    if (canvasRef.current) {
      const annotatedImage = canvasRef.current.toDataURL('image/jpeg', 0.8);
      onSave(annotatedImage);
    }
  };

  if (!imageObj) {
    return <div style={{ padding: 40, textAlign: "center", color: "white", position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>جاري تحميل الصورة...</div>;
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.9)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ color: "white", marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
        ارسم بإصبعك لتحديد المشكلة (لون أحمر)
      </div>
      
      <div ref={containerRef} style={{ background: "#222", border: "2px solid #333", borderRadius: 8, overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ touchAction: "none", cursor: "crosshair" }}
        />
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
        <button className="btn btn-ghost" onClick={handleClear} style={{ color: "white", borderColor: "rgba(255,255,255,0.2)" }}>
          <RotateCcw size={18} /> تراجع
        </button>
        <button className="btn btn-ghost" onClick={onCancel} style={{ color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.2)" }}>
          <X size={18} /> إلغاء
        </button>
        <button className="btn btn-primary" onClick={handleSave} style={{ background: "var(--teal)", borderColor: "var(--teal)" }}>
          <Check size={18} /> اعتماد الصورة
        </button>
      </div>
    </div>
  );
}
