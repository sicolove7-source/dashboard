import React, { useRef, useState, useEffect } from "react";
import { Eraser, Check, PenTool } from "lucide-react";

export default function SignaturePad({ onSave, onClear, initialSignature = null }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(!!initialSignature);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Support high DPI
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 2.5;

    if (initialSignature) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = initialSignature;
    }
  }, [initialSignature]);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDrawing(e) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing(e) {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    if (onSave && canvasRef.current) {
      onSave(canvasRef.current.toDataURL("image/png"));
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    if (onClear) onClear();
    if (onSave) onSave(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          border: "2px dashed var(--border, #CBD5E1)",
          borderRadius: 14,
          background: "#FFFFFF",
          position: "relative",
          overflow: "hidden",
          touchAction: "none",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.04)",
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            width: "100%",
            height: 140,
            display: "block",
            cursor: "crosshair",
          }}
        />
        {!hasDrawn && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "#94A3B8",
              fontSize: 13,
              fontWeight: 600,
              pointerEvents: "none",
            }}
          >
            <PenTool size={16} />
            <span>وقّع هنا بإصبعك أو الماوس</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={clearCanvas}
          className="btn"
          style={{
            padding: "6px 12px",
            fontSize: 12,
            gap: 6,
            background: "transparent",
            color: "var(--muted)",
          }}
        >
          <Eraser size={14} /> مسح التوقيع
        </button>

        {hasDrawn && (
          <span style={{ fontSize: 12, color: "#10B981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <Check size={14} /> تم التقاط التوقيع
          </span>
        )}
      </div>
    </div>
  );
}
