import { useEffect, useRef, useState } from "react";

interface CameraScannerProps { onDetected: (code: string) => void; active: boolean; onClose: () => void; }

export function CameraScanner({ onDetected, active, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let rafId = 0;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) { setSupported(false); return; }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
        scanLoop();
      } catch (e: any) { setError(e?.message || "Camera access failed"); }
    }
    async function scanLoop() {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const tick = () => {
        if (cancelled || !videoRef.current || !streamRef.current) return;
        try {
          const img = videoRef.current;
          const canvas = document.createElement("canvas");
          canvas.width = img.videoWidth || 640;
          canvas.height = img.videoHeight || 480;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          try {
            const result = reader.decodeFromCanvas(canvas);
            if (result?.getText()) onDetected(result.getText());
          } catch { /* no code this frame */ }
        } catch { /* ignore */ }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }
    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };
  }, [active, onDetected]);

  if (!active) return null;
  if (!supported) return (
    <div className="rounded-lg border border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
      Camera scanning is not supported on this device.
      <button onClick={onClose} className="ml-2 text-blue-600 underline">Close</button>
    </div>
  );
  return (
    <div className="relative">
      <video ref={videoRef} className="w-full rounded-lg bg-black" playsInline muted />
      <div className="absolute inset-0 pointer-events-none border-2 border-blue-400/60 rounded-lg" />
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
          <button onClick={onClose} className="ml-2 underline">Close</button>
        </div>
      )}
      <button onClick={onClose} className="absolute top-2 right-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white">Stop</button>
    </div>
  );
}
