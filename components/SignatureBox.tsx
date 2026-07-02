'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import SignaturePad from 'signature_pad';

interface Props {
  label: string;
  onChange: (dataUrl: string) => void;
}

export default function SignatureBox({ label, onChange }: Props) {
  const fullCanvasRef = useRef<HTMLCanvasElement>(null);
  const fullPadRef = useRef<SignaturePad | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // 全螢幕開啟後，等 canvas 渲染完再初始化
  const initFullPad = useCallback(() => {
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, w, h);
    }
    if (fullPadRef.current) fullPadRef.current.off();
    fullPadRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgba(255,255,255,0)',
      penColor: 'rgb(15,23,42)',
      minWidth: 1.5,
      maxWidth: 3,
    });
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    // 等 DOM 渲染完再初始化
    const timer = setTimeout(initFullPad, 100);
    return () => clearTimeout(timer);
  }, [fullscreen, initFullPad]);

  const openFullscreen = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (screen.orientation as any)?.lock?.('landscape').catch(() => {});
    } catch { /* 略過 */ }
    setFullscreen(true);
  };

  const closeFullscreen = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (screen.orientation as any)?.unlock?.();
    } catch { /* 略過 */ }
    fullPadRef.current?.off();
    setFullscreen(false);
  };

  const confirmFullscreen = () => {
    if (!fullPadRef.current || fullPadRef.current.isEmpty()) {
      alert('請先完成簽名');
      return;
    }
    const url = fullPadRef.current.toDataURL('image/png');
    setPreviewUrl(url);
    onChange(url);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (screen.orientation as any)?.unlock?.();
    } catch { /* 略過 */ }
    fullPadRef.current.off();
    setFullscreen(false);
  };

  const clearFullscreen = () => fullPadRef.current?.clear();

  const clearAll = () => {
    setPreviewUrl('');
    onChange('');
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {previewUrl && (
            <button type="button" onClick={clearAll} className="text-xs text-slate-500 underline">
              清除重簽
            </button>
          )}
        </div>

        {/* 預覽區 */}
        <div
          onClick={openFullscreen}
          className="relative h-32 w-full overflow-hidden rounded-lg border border-slate-300 bg-white cursor-pointer select-none"
        >
          {previewUrl ? (
            <img src={previewUrl} alt="簽名預覽" className="h-full w-full object-contain p-2" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
              <span className="text-3xl">✍️</span>
              <span className="text-sm text-slate-400">點此開啟簽名</span>
            </div>
          )}
        </div>
      </div>

      {/* 全螢幕簽名 Modal */}
      {fullscreen && (
        <div
          className="sig-modal"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 頂部工具列 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
            <button onClick={closeFullscreen} style={{ fontSize: 14, color: '#64748b' }}>取消</button>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{label}</span>
            <button onClick={clearFullscreen} style={{ fontSize: 14, color: '#ef4444' }}>清除</button>
          </div>

          {/* 簽名畫布區 */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <canvas
              ref={fullCanvasRef}
              style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%',
                height: '100%',
                touchAction: 'none',
                display: 'block',
                background: 'white',
              }}
            />
            {!previewUrl && (
              <p style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#e2e8f0', fontSize: 14, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                請在此處簽名
              </p>
            )}
          </div>

          {/* 確認按鈕 */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
            <button
              onClick={confirmFullscreen}
              style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', borderRadius: 8, padding: '14px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              確認簽名
            </button>
          </div>

          <style jsx global>{`
            @media (orientation: portrait) {
              .sig-modal {
                width: 100vh !important;
                height: 100vw !important;
                top: 0 !important;
                left: 0 !important;
                right: auto !important;
                bottom: auto !important;
                transform: rotate(90deg) translateY(-100%);
                transform-origin: top left;
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
