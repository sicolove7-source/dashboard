import React, { useRef, useState, useEffect } from 'react';
import { Check, X, MapPin } from 'lucide-react';

export default function FloorPlanAnnotator({ imageSrc, initialPins, onSave, onCancel }) {
  const containerRef = useRef(null);
  const [pins, setPins] = useState(initialPins || []);
  
  // Create a pin where the user clicks
  const handleImageClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate percentages so pins stay in place when image resizes
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    
    // We only allow placing one pin at a time in the "add" mode, 
    // or if we want multiple, we add it to the array.
    // For this context, placing one pin per snag makes sense, but we are annotating the floorplan
    // Wait, the floorplan holds all pins for the project. 
    // Let's just pass back the clicked coordinate.
    
    onSave({ x: xPct, y: yPct });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.95)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{ color: "white", marginBottom: 16, fontSize: 18, fontWeight: 600 }}>
        اضغط على مكان الملاحظة في المخطط 📍
      </div>
      
      <div 
        ref={containerRef} 
        onClick={handleImageClick}
        style={{ 
          position: "relative",
          maxWidth: "100%", maxHeight: "70vh",
          background: "#222", border: "2px solid #333", borderRadius: 8, overflow: "hidden",
          cursor: "crosshair"
        }}
      >
        <img src={imageSrc} alt="Floor Plan" style={{ display: "block", maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }} />
        
        {/* Render existing pins for context */}
        {pins.map((p, i) => (
          <div key={i} style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            transform: "translate(-50%, -100%)", // tip of the pin at the exact click
            color: "var(--danger)", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
          }}>
            <MapPin size={32} fill="currentColor" color="white" strokeWidth={1.5} />
            <div style={{
              position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
              color: "white", fontSize: 12, fontWeight: "bold"
            }}>{p.number}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <button className="btn btn-ghost" onClick={onCancel} style={{ color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.2)", padding: "12px 32px" }}>
          <X size={18} /> إلغاء
        </button>
      </div>
    </div>
  );
}
