import React, { useEffect, useRef, useState } from 'react';
import { ImageOff, Maximize2, RotateCw, Trash2, ZoomIn } from 'lucide-react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { AspectRatioPreset, GalleryLayoutMode, PhotoItem } from '../types/photo';

interface PhotoCardProps {
  photo: PhotoItem;
  layoutMode: GalleryLayoutMode;
  loupeEnabled: boolean;
  onSelect: (photo: PhotoItem) => void;
  onRemove?: (id: string) => void;
}

const ASPECT_CLASS_MAP: Record<AspectRatioPreset, string> = {
  '16:9': 'aspect-[16/9]',
  '4:3': 'aspect-[4/3]',
  '3:4': 'aspect-[3/4]',
  '1:1': 'aspect-square',
};

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  layoutMode,
  loupeEnabled,
  onSelect,
  onRemove,
}) => {
  const cardRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const isInView = useIntersectionObserver(cardRef, {
    rootMargin: '80px 0px',
    threshold: 0.05,
    triggerOnce: true,
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retrySeed, setRetrySeed] = useState(0);

  // Estado para lupa óptica en hover
  const [loupePos, setLoupePos] = useState<{
    active: boolean;
    xPct: number;
    yPct: number;
    pxX: number;
    pxY: number;
  }>({
    active: false,
    xPct: 50,
    yPct: 50,
    pxX: 0,
    pxY: 0,
  });

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [photo.src, retrySeed]);

  useEffect(() => {
    if (!isInView) return;
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [isInView, photo.src, retrySeed]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!loupeEnabled || !isLoaded || hasError) return;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const pxX = e.clientX - rect.left;
    const pxY = e.clientY - rect.top;
    const xPct = Math.max(0, Math.min(100, (pxX / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, (pxY / rect.height) * 100));

    setLoupePos({
      active: true,
      xPct,
      yPct,
      pxX,
      pxY,
    });
  };

  const handleMouseLeave = () => {
    if (loupePos.active) {
      setLoupePos((prev) => ({ ...prev, active: false }));
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);
    setIsLoaded(false);
    setRetrySeed((prev) => prev + 1);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(photo.id);
  };

  // Span para modo Bento en escritorio
  const bentoSpanClass =
    layoutMode === 'bento'
      ? photo.bentoSpan === 'wide'
        ? 'md:col-span-2'
        : photo.bentoSpan === 'tall'
          ? 'md:row-span-2'
          : ''
      : '';

  const frameAspectClass =
    layoutMode === 'grid'
      ? 'aspect-[4/3]'
      : photo.bentoSpan === 'tall'
        ? 'aspect-[3/4] md:h-full md:aspect-auto'
        : photo.bentoSpan === 'wide'
          ? 'aspect-[16/9]'
          : ASPECT_CLASS_MAP[photo.aspectRatio];

  const sourceLabel =
    photo.source === 'local'
      ? 'Carga local'
      : photo.source === 'url'
        ? 'URL dinámica'
        : 'Archivo curado';

  return (
    <article
      ref={cardRef}
      className={`group flex flex-col ${bentoSpanClass}`}
    >
      <div
        ref={frameRef}
        onClick={() => !hasError && onSelect(photo)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={0}
        aria-label={`Inspeccionar fotografía: ${photo.title} por ${photo.photographer}`}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !hasError) {
            e.preventDefault();
            onSelect(photo);
          }
        }}
        className={`relative w-full overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-zinc-100 dark:bg-zinc-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48] ${frameAspectClass}`}
      >
        {/* Esqueleto arquitectónico mientras decodifica */}
        {!isLoaded && !hasError && (
          <div
            aria-hidden="true"
            className="skeleton-shimmer absolute inset-0 bg-zinc-200/70 dark:bg-zinc-800/70"
          />
        )}

        {/* Fallback resiliente si la carga falla */}
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-zinc-100 dark:bg-zinc-900">
            <ImageOff className="h-7 w-7 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {photo.title}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No se pudo cargar la imagen dinámica
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-100 hover:border-zinc-950 dark:hover:border-zinc-400 transition-colors cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reintentar</span>
            </button>
          </div>
        ) : (
          isInView && (
            <img
              ref={imgRef}
              key={`${photo.id}-${retrySeed}`}
              src={photo.src}
              alt={`${photo.title} — ${photo.photographer}`}
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => setIsLoaded(true)}
              onError={() => {
                setIsLoaded(true);
                setHasError(true);
              }}
              className={`h-full w-full object-cover transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              } ${loupeEnabled ? 'group-hover:scale-[1.01]' : 'group-hover:scale-[1.06]'}`}
            />
          )
        )}

        {/* Lupa óptica interactiva en hover */}
        {loupeEnabled && loupePos.active && isLoaded && !hasError && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-20 h-36 w-36 rounded-full border border-white/80 shadow-2xl ring-1 ring-black/25 overflow-hidden"
            style={{
              transform: `translate3d(${loupePos.pxX - 72}px, ${loupePos.pxY - 72}px, 0)`,
              backgroundImage: `url("${photo.src}")`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: '240%',
              backgroundPosition: `${loupePos.xPct}% ${loupePos.yPct}%`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full border border-white/50 bg-transparent" />
            </div>
          </div>
        )}

        {/* Acciones superiores en hover */}
        {!hasError && (
          <div className="pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            {onRemove && photo.source !== 'curated' && (
              <button
                type="button"
                onClick={handleDelete}
                aria-label={`Eliminar ${photo.title}`}
                className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-lg bg-black/70 text-white backdrop-blur-sm hover:bg-[#E11D48] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <span className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-black/70 px-3 text-xs font-medium text-white backdrop-blur-sm">
              {loupeEnabled ? (
                <>
                  <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>2.4×</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Ampliar</span>
                </>
              )}
            </span>
          </div>
        )}

        {/* Scrim medido de contraste en hover */}
        {!hasError && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 pt-16 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <p className="font-editorial text-xl font-medium leading-tight text-white">
              {photo.title}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-200">
              <span>{photo.photographer}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {photo.exif.focalLength} · {photo.exif.aperture} · ISO {photo.exif.iso}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pie editorial sin cápsulas ni píldoras */}
      <div className="mt-3 flex items-baseline justify-between gap-4 px-0.5">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {photo.title}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{photo.category}</span>
            <span aria-hidden="true">·</span>
            <span>{photo.photographer}</span>
            <span aria-hidden="true">·</span>
            <span>{sourceLabel}</span>
          </p>
        </div>
        <span className="font-mono-tabular text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap shrink-0">
          {photo.year}
        </span>
      </div>
    </article>
  );
};
