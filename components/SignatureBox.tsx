'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import SignaturePad from 'signature_pad';

interface Props {
  label: string;
  onChange: (dataUrl: string) => void;
}

export default function SignatureBox({ label, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const fullPadRef = useRef<SignaturePad | null>(null);
  const [empty, setEmpty] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);
    padRef.current?.clear();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    padRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255,255,255)',
      penColor: 'rgb(15,23,42)',
    });
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      padRef.current?.off();
    };
  }, [resize]);

  // 初始化全螢幕簽名板
  useEffect(() => {
    if (!fullscreen) return;
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);
    fullPadRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255,255,255)',
      penColor: 'rgb(15,23,42)',
    });
    return () => { fullPadRef.current?.off(); };
  }, [fullscreen]);

  // 開啟全螢幕時強制橫式
  const openFullscreen = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (screen.orientation as any)?.lock?.('landscape').catch(() => {});
    } catch { /* 不支援的裝置略過 */ }
    setFullscreen(true);
  };

  // 關閉全螢幕時恢復直式
  const closeFullscreen = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (screen.orientation as any)?.unlock?.();
    } catch { /* 略過 */ }
    setFullscreen(false);
  };

  const confirmFullscreen = () => {
    if (!fullPadRef.current || fullPadRef.current.isEmpty()) {
      alert('請先簽名');
      return;
    }
    const url = fullPadRef.current.toDataURL('image/png');
    setPreviewUrl(url);
    setEmpty(false);
    onChange(url);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (screen.orientation as any)?.unlock?.();
    } catch { /* 略過 */ }
    setFullscreen(false);
  };

  const clearFullscreen = () => {
    fullPadRef.current?.clear();
  };

  const clearAll = () => {
    padRef.current?.clear();
    setEmpty(true);
    setPreviewUrl('');
    onChange('');
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {!empty && (
            <button type="button" onClick={clearAll} className="text-xs text-slate-500 underline">
              清除重簽
            </button>
          )}
        </div>

        {/* 預覽區 / 點擊開啟全螢幕 */}
        <div
          onClick={openFullscreen}
          className="relative h-32 w-full overflow-hidden rounded-lg border border-slate-300 bg-white cursor-pointer touch-none"
        >
          {previewUrl ? (
            <img src={previewUrl} alt="簽名預覽" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1">
              <span className="text-2xl">✍️</span>
              <span className="text-sm text-slate-400">點此簽名</span>
            </div>
          )}
        </div>
      </div>

      {/* 全螢幕簽名 Modal */}
      {fullscreen && (
        <div className="sig-fullscreen fixed z-50 bg-white flex flex-col">
          {/* 頂部工具列 */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
            <button onClick={closeFullscreen} className="text-sm text-slate-500">取消</button>
            <span className="text-sm font-semibold text-slate-900">{label}</span>
            <button onClick={clearFullscreen} className="text-sm text-red-500">清除</button>
          </div>

          {/* 簽名畫布 */}
          <div className="flex-1 relative">
            <canvas
              ref={fullCanvasRef}
              className="absolute inset-0 w-full h-full touch-none"
              style={{ width: '100%', height: '100%' }}
            />
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-200">
              請在此處簽名
            </p>
          </div>

          {/* 確認按鈕 */}
          <div className="shrink-0 px-4 py-4 border-t border-slate-200">
            <button
              onClick={confirmFullscreen}
              className="w-full rounded-lg bg-slate-900 py-3 text-sm font-medium text-white"
            >
              確認簽名
            </button>
          </div>

          <style jsx global>{`
            /* 直式時旋轉整個簽名 Modal 為橫式 */
            @media (orientation: portrait) {
              .sig-fullscreen {
                top: 0; left: 0;
                width: 100vh;
                height: 100vw;
                transform: rotate(90deg) translateX(0);
                transform-origin: top left;
                margin-top: 100vw;
              }
            }
            /* 橫式時直接全螢幕 */
            @media (orientation: landscape) {
              .sig-fullscreen {
                inset: 0;
                width: 100vw;
                height: 100vh;
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
