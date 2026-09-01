import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

export default function VoiceInput({ onResult }) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'ar-SA'; // Arabic

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        setIsListening(false);
      };

      rec.onerror = (event) => {
        console.error("Speech error", event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    } else {
      setSupported(false);
    }
  }, [onResult]);

  const toggleListen = () => {
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      if (recognition) {
        recognition.start();
        setIsListening(true);
      }
    }
  };

  if (!supported) return null;

  return (
    <button 
      type="button" 
      onClick={toggleListen}
      title="تحدث لتسجيل الملاحظة"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 42, height: 42, borderRadius: "50%", border: "none",
        background: isListening ? "var(--danger)" : "rgba(59, 130, 246, 0.1)",
        color: isListening ? "#fff" : "#3B82F6",
        cursor: "pointer",
        transition: "all 0.2s ease",
        animation: isListening ? "pulse 1.5s infinite" : "none"
      }}
    >
      {isListening ? <MicOff size={20} /> : <Mic size={20} />}
      
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </button>
  );
}
