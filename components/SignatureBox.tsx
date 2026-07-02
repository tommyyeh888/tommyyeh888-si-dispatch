'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import SignaturePad from 'signature_pad';

interface Props {
  label: string;
  onChange: (dataUrl: string) => void;
}

// 將簽名圖片旋轉 90 度（順時針），輸出給 PDF 用
function rotateDataUrl(dataUrl: string, degrees: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const rad = (degrees * Math.PI) / 180;
      // 旋轉後寬高對調
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
    // 旋轉 90 度給 PDF 用，預覽維持原方向
    const rotated = await rotateDataUrl(raw, 90);
    setPreviewUrl(raw); // 預覽給工程師看（直式）
    onChange(rotated);  // 傳給 PDF 的是旋轉後版本
    padRef.current.off();
    setFullscreen(false);
  };

  const clearSig = () => padRef.current?.clear();

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

      {/* 全螢幕簽名（直式，不旋轉） */}
      {fullscreen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'white', display: 'flex', flexDirection: 'column',
        }}>
          {/* 工具列 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
          }}>
            <button onClick={closeFullscreen} style={{
              fontSize: 15, color: '#64748b', padding: '4px 8px',
              background: 'none', border: 'none', cursor: 'pointer',
            }}>取消</button>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{label}</span>
            <button onClick={clearSig} style={{
              fontSize: 15, color: '#ef4444', padding: '4px 8px',
              background: 'none', border: 'none', cursor: 'pointer',
            }}>清除</button>
          </div>

          {/* 簽名畫布（直式全螢幕） */}
          <div style={{ flex: 1, position: 'relative' }}>
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

          {/* 確認按鈕 */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
            <button onClick={confirmSig} style={{
              width: '100%', background: '#0f172a', color: 'white',
              border: 'none', borderRadius: 8, padding: '14px 0',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>確認簽名</button>
          </div>
        </div>
      )}
    </>
  );
}
