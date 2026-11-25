import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { PhotoItem } from '../types/photo';

interface PhotoLightboxProps {
  photos: PhotoItem[];
  activePhoto: PhotoItem | null;
  onClose: () => void;
  onSelectPhoto: (photo: PhotoItem) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photos,
  activePhoto,
  onClose,
  onSelectPhoto,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null
  );
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const currentIndex = activePhoto
    ? photos.findIndex((item) => item.id === activePhoto.id)
    : -1;

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetZoom();
  }, [activePhoto?.id, resetZoom]);

  const handleStep = useCallback(
    (direction: -1 | 1) => {
      if (!photos.length || currentIndex === -1) return;
      const nextIndex = (currentIndex + direction + photos.length) % photos.length;
      onSelectPhoto(photos[nextIndex]);
    },
    [currentIndex, onSelectPhoto, photos]
  );

  const updateZoom = useCallback((nextZoom: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(nextZoom.toFixed(2))));
    setZoom(clamped);
    if (clamped === 1) {
      setPan({ x: 0, y: 0 });
    }
  }, []);

  useEffect(() => {
    if (!activePhoto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleStep(1);
      } else if (e.key === 'ArrowLeft') {
        handleStep(-1);
      } else if (e.key === '+' || e.key === '=') {
        updateZoom(zoom + 0.5);
      } else if (e.key === '-') {
        updateZoom(zoom - 0.5);
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePhoto, handleStep, onClose, resetZoom, updateZoom, zoom]);

  if (!activePhoto) return null;

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.35 : -0.35;
    updateZoom(zoom + delta);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || zoom <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const limit = (zoom - 1) * 320;
    setPan({
      x: Math.max(-limit, Math.min(limit, dragStartRef.current.panX + dx)),
      y: Math.max(-limit, Math.min(limit, dragStartRef.current.panY + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  const handleDoubleClick = () => {
    if (zoom > 1.1) {
      resetZoom();
    } else {
      updateZoom(2.5);
    }
  };

  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Visor de detalle: ${activePhoto.title}`}
      className="fixed inset-0 z-50 flex flex-col bg-[#050505]/96 text-zinc-100 backdrop-blur-md"
    >
      {/* Barra superior de control del visor */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800/90 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 className="font-editorial truncate text-xl font-medium tracking-tight text-white sm:text-2xl">
            {activePhoto.title}
          </h2>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
            <span className="truncate">{activePhoto.photographer}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{activePhoto.location}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {currentIndex + 1}/{photos.length}
            </span>
          </p>
        </div>

        {/* Controles interactivos de Zoom */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/90 p-1">
            <button
              type="button"
              onClick={() => updateZoom(zoom - 0.5)}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Alejar zoom"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-35 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <ZoomOut className="h-4 w-4" aria-hidden="true" />
            </button>

            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.1}
              value={zoom}
              onChange={(e) => updateZoom(parseFloat(e.target.value))}
              aria-label="Nivel de zoom"
              className="mx-1.5 h-1 w-24 accent-[#E11D48] cursor-pointer"
            />

            <button
              type="button"
              onClick={() => updateZoom(zoom + 0.5)}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Acercar zoom"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-35 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <ZoomIn className="h-4 w-4" aria-hidden="true" />
            </button>

            <span className="font-mono-tabular w-12 text-center text-xs text-zinc-300">
              {zoomPercentage}%
            </span>

            {zoom > 1 && (
              <button
                type="button"
                onClick={resetZoom}
                aria-label="Restablecer zoom"
                className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>1×</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowInfo((prev) => !prev)}
            aria-pressed={showInfo}
            aria-label="Mostrar u ocultar ficha técnica"
            className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showInfo
                ? 'border-zinc-600 bg-zinc-800 text-white'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white'
            }`}
          >
            <Info className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">Ficha EXIF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar visor"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Área principal de imagen + panel lateral técnico */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Lienzo de inspección con zoom y paneo */}
        <div
          ref={viewportRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          className={`relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-10 select-none ${
            zoom > 1
              ? isDragging
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : 'cursor-zoom-in'
          }`}
        >
          <img
            src={activePhoto.src}
            alt={`${activePhoto.title} — ${activePhoto.photographer}`}
            referrerPolicy="no-referrer"
            draggable={false}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-150 ease-out will-change-transform"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            }}
          />

          {/* Botones de navegación anterior / siguiente */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStep(-1);
                }}
                aria-label="Fotografía anterior"
                className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700/80 bg-black/65 text-white backdrop-blur-sm hover:border-zinc-500 hover:bg-black/90 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStep(1);
                }}
                aria-label="Siguiente fotografía"
                className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700/80 bg-black/65 text-white backdrop-blur-sm hover:border-zinc-500 hover:bg-black/90 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}

          {/* Barra rápida móvil / guía de interacción */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-lg border border-zinc-800/80 bg-black/75 px-3.5 py-1.5 text-xs text-zinc-300 backdrop-blur-sm">
            <span className="sm:hidden font-mono-tabular">{zoomPercentage}%</span>
            <span className="hidden sm:inline">
              Rueda del ratón o doble clic para zoom · Arrastra para explorar
            </span>
            <span className="sm:hidden">Doble toque para ampliar</span>
          </div>
        </div>

        {/* Panel lateral técnico EXIF */}
        {showInfo && (
          <aside className="hidden lg:flex w-80 shrink-0 flex-col justify-between border-l border-zinc-800/90 bg-zinc-950/90 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium text-zinc-400">
                  {activePhoto.category} · {activePhoto.year}
                </p>
                <h3 className="font-editorial mt-1.5 text-2xl font-medium text-white">
                  {activePhoto.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  {activePhoto.description}
                </p>
              </div>

              <div className="border-t border-zinc-800 pt-5">
                <h4 className="text-xs font-semibold tracking-wide text-zinc-400">
                  Parámetros ópticos
                </h4>
                <dl className="mt-3 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-500">Cámara</dt>
                    <dd className="text-right font-medium text-zinc-200">
                      {activePhoto.exif.camera}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-500">Objetivo</dt>
                    <dd className="text-right text-zinc-200">{activePhoto.exif.lens}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-500">Apertura</dt>
                    <dd className="font-mono-tabular text-zinc-200">
                      {activePhoto.exif.aperture}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-500">Obturación</dt>
                    <dd className="font-mono-tabular text-zinc-200">
                      {activePhoto.exif.shutter}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-500">Sensibilidad</dt>
                    <dd className="font-mono-tabular text-zinc-200">
                      ISO {activePhoto.exif.iso}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-500">Resolución</dt>
                    <dd className="font-mono-tabular text-zinc-200">
                      {activePhoto.width || '—'} × {activePhoto.height || '—'}
                    </dd>
                  </div>
                  {activePhoto.fileSizeLabel && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-zinc-500">Peso</dt>
                      <dd className="font-mono-tabular text-zinc-200">
                        {activePhoto.fileSizeLabel}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-5">
              <p className="text-xs text-zinc-500 mb-2.5">Escala rápida de inspección</p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3.5].map((preset) => {
                  const active = Math.abs(zoom - preset) < 0.15;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateZoom(preset)}
                      className={`rounded-lg border py-2 text-xs font-mono-tabular transition-colors cursor-pointer ${
                        active
                          ? 'border-[#E11D48] bg-[#E11D48]/15 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {preset}×
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
