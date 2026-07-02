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
  const [isPortrait, setIsPortrait] = useState(false);

  // 偵測目前方向
  const checkOrientation = useCallback(() => {
    setIsPortrait(window.innerHeight > window.innerWidth);
  }, []);

  useEffect(() => {
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [checkOrientation]);

  const initFullPad = useCallback(() => {
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (w === 0 || h === 0) return;
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
      backgroundColor: 'rgba(0,0,0,0)',
      penColor: 'rgb(15,23,42)',
      minWidth: 1.5,
      maxWidth: 3,
    });
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const timer = setTimeout(initFullPad, 150);
    return () => clearTimeout(timer);
  }, [fullscreen, isPortrait, initFullPad]);

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

  // 直式時的尺寸：旋轉 90 度，寬高對調
  const modalStyle: React.CSSProperties = isPortrait ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vh',
    height: '100vw',
    zIndex: 9999,
    background: 'white',
    display: 'flex',
    flexDirection: 'column',
    transform: 'rotate(90deg) translateX(0)',
    transformOrigin: 'bottom left',
    marginTop: `-100vw`,
  } : {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    background: 'white',
    display: 'flex',
    flexDirection: 'column',
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

      {fullscreen && (
        <div style={modalStyle}>
          {/* 頂部工具列 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
          }}>
            <button onClick={closeFullscreen} style={{ fontSize: 15, color: '#64748b', padding: '4px 8px' }}>取消</button>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{label}</span>
            <button onClick={clearFullscreen} style={{ fontSize: 15, color: '#ef4444', padding: '4px 8px' }}>清除</button>
          </div>

          {/* 簽名畫布 */}
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
            <p style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              color: '#cbd5e1', fontSize: 14,
              pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>
              請在此處簽名
            </p>
          </div>

          {/* 確認按鈕 */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
            <button
              onClick={confirmFullscreen}
              style={{
                width: '100%', background: '#0f172a', color: 'white',
                border: 'none', borderRadius: 8, padding: '14px 0',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              確認簽名
            </button>
          </div>
        </div>
      )}
    </>
  );
}
