import { useCallback, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });
}

async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image  = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width  = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, 1200, 675);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Canvas empty'))), 'image/jpeg', 0.92),
  );
}

interface Props {
  value:      string;
  onChange:   (url: string) => void;
  adminToken: string;
  baseUrl?:   string;
}

export function ImageCropUploader({ value, onChange, adminToken, baseUrl = '' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [src,     setSrc]     = useState('');
  const [open,    setOpen]    = useState(false);
  const [crop,    setCrop]    = useState({ x: 0, y: 0 });
  const [zoom,    setZoom]    = useState(1);
  const [cropped, setCropped] = useState<Area | null>(null);
  const [busy,    setBusy]    = useState(false);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = () => {
      setSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: Area, px: Area) => setCropped(px), []);

  const apply = async () => {
    if (!cropped || !src) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(src, cropped);
      const fd   = new FormData();
      fd.append('image', blob, 'upload.jpg');
      const res  = await fetch(`${baseUrl}/api/admin/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      onChange(url);
      setOpen(false);
    } catch (e: any) {
      alert(e.message ?? 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="img-uploader">
      {value && (
        <div className="img-uploader-preview-wrap">
          <img src={value} alt="preview" className="img-uploader-preview" />
        </div>
      )}
      <button type="button" className="btn-upload" onClick={() => fileRef.current?.click()}>
        {value ? 'Change image' : 'Upload image'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />

      {open && (
        <div className="crop-overlay" onClick={() => setOpen(false)}>
          <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
            <p className="crop-modal-title">Adjust image</p>
            <div className="crop-canvas">
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="crop-controls">
              <label className="crop-zoom-label">Zoom</label>
              <input
                className="crop-zoom-slider"
                type="range"
                min={1} max={3} step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              <div className="crop-actions">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="button" className="btn-primary" onClick={apply} disabled={busy}>
                  {busy ? 'Uploading…' : 'Use this image'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
