"use client";

import { useRef, useState } from "react";
import { uploadImage } from "@/app/admin/(app)/tienda/actions";

const MAX_SIDE = 1600;

/** Reduce la foto en el navegador (máx. 1600 px, WebP/JPEG ~85 %) para que suba rápido. */
async function compress(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const toBlob = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.85));
  let blob = await toBlob("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob) throw new Error("No pudimos procesar la foto.");
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `foto.${ext}`, { type: blob.type });
}

export function ImageUpload({
  value,
  onChange,
  label,
  compact = false,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  compact?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Ese archivo no es una imagen.");
    setBusy(true);
    try {
      const small = await compress(file);
      const fd = new FormData();
      fd.set("file", small);
      const r = await uploadImage(fd);
      if (r.ok) onChange(r.url);
      else setError(r.error);
    } catch {
      setError("No pudimos leer la foto. Prueba con un JPG o PNG.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handle(e.dataTransfer.files[0]);
        }}
        className={`relative flex items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
          over ? "border-vino bg-rosa/30" : value ? "border-tinta/25 bg-white" : "border-tinta/30 bg-crema/50"
        } ${compact ? "aspect-square" : "min-h-[200px]"}`}
      >
        {value ? (
          // <img> simple: vista previa inmediata de la URL recién subida.
          <img src={value} alt={label} className={`${compact ? "size-full" : "max-h-[260px]"} object-cover`} />
        ) : (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="flex flex-col items-center gap-2 px-4 py-6 text-center"
            disabled={busy}
          >
            <span aria-hidden="true" className={`grid place-items-center rounded-full border-2 border-tinta bg-mostaza font-bold ${compact ? "size-9 text-lg" : "size-12 text-2xl"}`}>
              ＋
            </span>
            <span className={`font-semibold ${compact ? "text-[12.5px]" : "text-[14.5px]"}`}>{compact ? "Agregar" : "Sube una foto"}</span>
            {!compact && <span className="text-[12.5px] text-tinta/55">Arrástrala aquí o haz clic. JPG, PNG o WebP.</span>}
          </button>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-white/80 text-[13.5px] font-semibold text-vino" role="status">
            Subiendo foto…
          </div>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        aria-label={label}
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {value && !busy && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => ref.current?.click()} className="rounded-lg border-2 border-tinta/20 px-2.5 py-1 text-[12.5px] font-semibold hover:border-tinta">
            Cambiar
          </button>
          <button type="button" onClick={() => onChange("")} className="rounded-lg px-2.5 py-1 text-[12.5px] font-semibold text-vino hover:bg-rosa/40">
            Quitar
          </button>
        </div>
      )}
      {error && <p role="alert" className="m-0 mt-2 text-[12.5px] font-medium text-[#B42318]">{error}</p>}
    </div>
  );
}
