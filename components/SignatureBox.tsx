'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import SignaturePad from 'signature_pad';

interface Props {
  label: string;
  onChange: (dataUrl: string) => void;
}

function rotateDataUrl(dataUrl: string, degrees: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const rad = (degrees * Math.PI) / 180;
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

export default function SignatureBox({ label, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const initPad = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (!w || !h) return;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    padRef.current?.off();
    padRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgba(0,0,0,0)',
      penColor: '#0f172a',
      minWidth: 1.5,
      maxWidth: 3,
    });
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const timer = setTimeout(initPad, 100);
    return () => clearTimeout(timer);
  }, [fullscreen, initPad]);

  const openFullscreen = () => setFullscreen(true);

  const closeFullscreen = () => {
    padRef.current?.off();
    setFullscreen(false);
  };

  const confirmSig = async () => {
    if (!padRef.current || padRef.current.isEmpty()) {
      alert('請先完成簽名');
      return;
    }
    const raw = padRef.current.toDataURL('image/png');
    const rotated = await rotateDataUrl(raw, 90);
    setPreviewUrl(raw);
    onChange(rotated);
    padRef.current.off();
    setFullscreen(false);
  };

  const clearSig = () => padRef.current?.clear();
  const clearAll = () => { setPreviewUrl(''); onChange(''); };

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
              <span className="text-sm text-slate-400">點此簽名</span>
            </div>
          )}
        </div>
      </div>

      {fullscreen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'white', display: 'flex', flexDirection: 'row',
        }}>
          {/* 左側：確認簽名（深色背景） */}
          <div
            onClick={confirmSig}
            style={{
              width: 52, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#0f172a', cursor: 'pointer',
            }}
          >
            <span style={{
              color: 'white', fontSize: 14, fontWeight: 600,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              letterSpacing: 2,
            }}>確認簽名</span>
          </div>

          {/* 中間：簽名畫布 */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                touchAction: 'none', display: 'block',
                background: 'white',
              }}
            />
            <p style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              color: '#e2e8f0', fontSize: 14,
              pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>請在此處簽名</p>
          </div>

          {/* 右側：取消 / 標題 / 清除 */}
          <div style={{
            width: 52, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'space-between',
            padding: '24px 0',
            borderLeft: '1px solid #e2e8f0',
            background: 'white',
          }}>
            <button onClick={closeFullscreen} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#64748b', fontSize: 14, fontWeight: 500,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              letterSpacing: 2,
            }}>取消</button>

            <span style={{
              fontSize: 13, fontWeight: 600, color: '#0f172a',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              letterSpacing: 2,
            }}>{label}</span>

            <button onClick={clearSig} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#ef4444', fontSize: 14, fontWeight: 500,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              letterSpacing: 2,
            }}>清除</button>
          </div>
        </div>
      )}
    </>
  );
}
