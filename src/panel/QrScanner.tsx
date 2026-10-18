import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, Keyboard, SwitchCamera } from 'lucide-react';

interface Props {
  onCode: (text: string) => void;
  paused?: boolean;
}

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/**
 * Lector QR continuo con la cámara (celular, tablet o laptop).
 * También acepta lectores USB/Bluetooth que "escriben" el código y pulsan Enter.
 */
export default function QrScanner({ onCode, paused = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const pausedRef = useRef(paused);
  const onCodeRef = useRef(onCode);
  const [state, setState] = useState<'idle' | 'starting' | 'on' | 'denied' | 'unavailable'>('idle');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [manual, setManual] = useState('');

  pausedRef.current = paused;
  onCodeRef.current = onCode;

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = async (mode = facing) => {
    if (!navigator.mediaDevices?.getUserMedia) { setState('unavailable'); return; }
    setState('starting');
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      setState('on');
    } catch (err) {
      const name = (err as DOMException)?.name;
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
    }
  };

  useEffect(() => {
    if (state !== 'on') return;
    let raf = 0;
    let busy = false;
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const detector: Detector | null = BD ? new BD({ formats: ['qr_code'] }) : null;

    const emit = (text: string) => {
      const now = Date.now();
      if (text === lastRef.current.text && now - lastRef.current.at < 4000) return;
      lastRef.current = { text, at: now };
      onCodeRef.current(text);
    };

    const tick = async () => {
      raf = requestAnimationFrame(tick);
      const v = videoRef.current;
      const c = canvasRef.current;
      if (busy || pausedRef.current || !v || !c || v.readyState < 2) return;
      busy = true;
      try {
        if (detector) {
          const found = await detector.detect(v);
          if (found[0]?.rawValue) emit(found[0].rawValue);
        } else {
          const scale = Math.min(1, 640 / (v.videoWidth || 640));
          c.width = Math.round(v.videoWidth * scale);
          c.height = Math.round(v.videoHeight * scale);
          const ctx = c.getContext('2d', { willReadFrequently: true })!;
          ctx.drawImage(v, 0, 0, c.width, c.height);
          const img = ctx.getImageData(0, 0, c.width, c.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (code?.data) emit(code.data);
        }
      } catch {
        /* cuadro ilegible: se intenta con el siguiente */
      } finally {
        busy = false;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  useEffect(() => () => stop(), []);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] sm:aspect-video w-full overflow-hidden rounded-2xl bg-black border border-slate-800">
        <video ref={videoRef} playsInline muted className={`absolute inset-0 w-full h-full object-cover ${state === 'on' ? '' : 'opacity-0'} ${facing === 'user' ? '-scale-x-100' : ''}`} />
        <canvas ref={canvasRef} className="hidden" />
        {state === 'on' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[62%] max-w-[300px] aspect-square rounded-3xl border-4 border-orange-400/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" />
            {paused && <span className="absolute bottom-4 px-3 py-1 rounded-full bg-slate-950/80 text-xs font-bold text-white">Procesando…</span>}
          </div>
        )}
        {state !== 'on' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            {state === 'denied' ? (
              <>
                <CameraOff className="w-10 h-10 text-rose-400" />
                <p className="text-sm text-slate-200 max-w-xs">El navegador bloqueó la cámara. Toca el candado de la barra de direcciones, permite la cámara y vuelve a intentar.</p>
              </>
            ) : state === 'unavailable' ? (
              <>
                <CameraOff className="w-10 h-10 text-slate-400" />
                <p className="text-sm text-slate-300 max-w-xs">No encontramos una cámara disponible. Puedes usar un lector QR USB o escribir el código abajo.</p>
              </>
            ) : (
              <Camera className="w-10 h-10 text-orange-400" />
            )}
            <button type="button" onClick={() => start()} disabled={state === 'starting'}
              className="h-12 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-60">
              <Camera className="w-5 h-5" /> {state === 'starting' ? 'Abriendo cámara…' : 'Activar cámara'}
            </button>
          </div>
        )}
        {state === 'on' && (
          <button type="button" aria-label="Cambiar de cámara" onClick={() => { const m = facing === 'environment' ? 'user' : 'environment'; setFacing(m); start(m); }}
            className="absolute top-3 right-3 w-11 h-11 rounded-full bg-slate-950/70 text-white flex items-center justify-center cursor-pointer">
            <SwitchCamera className="w-5 h-5" />
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { onCodeRef.current(manual.trim()); setManual(''); } }}
        className="flex gap-2"
      >
        <label className="sr-only" htmlFor="qr-manual">Código del carnet</label>
        <div className="relative flex-1">
          <Keyboard className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input id="qr-manual" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Lector USB o código del carnet"
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
        </div>
        <button type="submit" className="h-11 px-4 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white cursor-pointer">Registrar</button>
      </form>
    </div>
  );
}

/** Pitido corto y vibración para confirmar la lectura. */
export function feedback(ok: boolean) {
  try {
    navigator.vibrate?.(ok ? 80 : [60, 60, 60]);
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 880 : 220;
    g.gain.value = 0.08;
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + (ok ? 0.12 : 0.3));
    o.onended = () => ctx.close();
  } catch { /* sin sonido */ }
}
