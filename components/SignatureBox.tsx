'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import SignaturePad from 'signature_pad';

interface Props {
  label: string;
  onChange: (dataUrl: string) => void;
}

export default function SignatureBox({ label, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [empty, setEmpty] = useState(true);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);
    padRef.current?.clear();
    setEmpty(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    padRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255,255,255)',
      penColor: 'rgb(15,23,42)',
    });
    resize();
    padRef.current.addEventListener('endStroke', () => {
      setEmpty(false);
      const url = padRef.current?.toDataURL('image/png') || '';
      onChange(url);
    });
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      padRef.current?.off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clear = () => {
    padRef.current?.clear();
    setEmpty(true);
    onChange('');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <button
          type="button"
          onClick={clear}
          className="text-xs text-slate-500 underline underline-offset-2"
        >
          清除重簽
        </button>
      </div>
      <div className="relative h-40 w-full overflow-hidden rounded-lg border border-slate-300 bg-white touch-none">
        <canvas ref={canvasRef} className="h-full w-full touch-none" />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-300">
            請在此簽名
          </span>
        )}
      </div>
    </div>
  );
}
