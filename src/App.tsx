/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Grid,
  LayoutGrid,
  Maximize2,
  Moon,
  Plus,
  Search,
  Sun,
  Upload,
} from 'lucide-react';
import { DynamicUploadModal } from './components/DynamicUploadModal';
import { Header } from './components/Header';
import { PhotoCard } from './components/PhotoCard';
import { PhotoLightbox } from './components/PhotoLightbox';
import { HERO_PHOTO, INITIAL_GALLERY_PHOTOS } from './data/initialPhotos';
import { GalleryLayoutMode, PhotoCategory, PhotoItem } from './types/photo';
import {
  buildPhotoFromLocalFile,
  deleteUserPhoto,
  isSupportedImageFile,
  loadSavedUserPhotos,
  saveUserPhoto,
} from './utils/imageStorage';

type FilterCategory = 'Todas' | PhotoCategory;

const FILTER_OPTIONS: FilterCategory[] = [
  'Todas',
  'Arquitectura',
  'Paisaje',
  'Retrato',
  'Urbano',
  'Naturaleza Muerta',
  'Personal',
];

export default function App() {
  const [photos, setPhotos] = useState<PhotoItem[]>(INITIAL_GALLERY_PHOTOS);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('Todas');
  const [layoutMode, setLayoutMode] = useState<GalleryLayoutMode>('bento');
  const [loupeEnabled, setLoupeEnabled] = useState(false);
  const [isDarkroom, setIsDarkroom] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDraggingPage, setIsDraggingPage] = useState(false);
  const [inlineStatus, setInlineStatus] = useState<string | null>(null);

  const dragCounterRef = useRef(0);
  const gallerySectionRef = useRef<HTMLElement | null>(null);

  // Cargar fotografías guardadas dinámicamente por el usuario en IndexedDB
  useEffect(() => {
    let mounted = true;
    loadSavedUserPhotos().then((saved) => {
      if (mounted && saved.length > 0) {
        setPhotos((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueSaved = saved.filter((item) => !existingIds.has(item.id));
          return [...uniqueSaved, ...prev];
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Sincronizar modo Cuarto Oscuro con la clase .dark en <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkroom) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkroom]);

  const filteredPhotos = useMemo(() => {
    if (activeCategory === 'Todas') return photos;
    return photos.filter((photo) => photo.category === activeCategory);
  }, [activeCategory, photos]);

  const handleAddPhotos = async (newItems: PhotoItem[]) => {
    if (newItems.length === 0) return;

    setPhotos((prev) => [...newItems, ...prev]);

    // Asegurar que la categoría activa muestre las imágenes recién agregadas
    if (
      activeCategory !== 'Todas' &&
      !newItems.some((item) => item.category === activeCategory)
    ) {
      setActiveCategory('Todas');
    }

    for (const item of newItems) {
      await saveUserPhoto(item);
    }

    setInlineStatus(
      newItems.length === 1
        ? `Se añadió «${newItems[0].title}» a la galería.`
        : `Se añadieron ${newItems.length} fotografías a la galería.`
    );
    window.setTimeout(() => setInlineStatus(null), 5000);

    // Desplazar suavemente hacia la galería para mostrar la nueva fotografía
    window.requestAnimationFrame(() => {
      gallerySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleRemovePhoto = async (id: string) => {
    setPhotos((prev) => prev.filter((item) => item.id !== id));
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null);
    }
    await deleteUserPhoto(id);
  };

  const handleQuickDropFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(isSupportedImageFile);
    if (imageFiles.length === 0) {
      setInlineStatus('No se detectaron archivos de imagen compatibles (JPG, PNG, WebP, AVIF).');
      window.setTimeout(() => setInlineStatus(null), 4500);
      return;
    }

    const added: PhotoItem[] = [];
    for (const file of imageFiles) {
      try {
        const item = await buildPhotoFromLocalFile(file, {
          category: activeCategory !== 'Todas' ? activeCategory : 'Personal',
          photographer: 'Colección Personal',
          location: 'Carga directa',
        });
        added.push(item);
      } catch {
        // Ignorar archivo corrupto sin bloquear el lote
      }
    }

    if (added.length > 0) {
      await handleAddPhotos(added);
    } else {
      setInlineStatus('No fue posible procesar los archivos seleccionados.');
      window.setTimeout(() => setInlineStatus(null), 4500);
    }
  };

  return (
    <div
      onDragEnter={(e) => {
        if (isUploadOpen) return;
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          dragCounterRef.current += 1;
          setIsDraggingPage(true);
        }
      }}
      onDragOver={(e) => {
        if (isUploadOpen) return;
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
        }
      }}
      onDragLeave={(e) => {
        if (isUploadOpen) return;
        if (e.dataTransfer.types.includes('Files')) {
          dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
          if (dragCounterRef.current === 0) {
            setIsDraggingPage(false);
          }
        }
      }}
      onDrop={(e) => {
        dragCounterRef.current = 0;
        setIsDraggingPage(false);
        if (isUploadOpen) return;
        if (e.dataTransfer.files?.length) {
          e.preventDefault();
          handleQuickDropFiles(e.dataTransfer.files);
        }
      }}
      className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] text-zinc-950 dark:text-zinc-100 transition-colors duration-200"
    >
      <Header onOpenUpload={() => setIsUploadOpen(true)} />

      {/* Indicador global al arrastrar archivos sobre la página */}
      {isDraggingPage && (
        <div
          aria-live="polite"
          className="fixed inset-4 z-40 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E11D48] bg-white/92 dark:bg-zinc-950/92 backdrop-blur-sm pointer-events-none"
        >
          <Upload className="h-10 w-10 text-[#E11D48]" aria-hidden="true" />
          <p className="font-editorial mt-3 text-3xl font-medium text-zinc-950 dark:text-zinc-50">
            Suelta tus imágenes para incorporarlas
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Se añadirán instantáneamente como componentes individuales en la galería
          </p>
        </div>
      )}

      <main>
        {/* Hero Split-Screen Editorial */}
        <section
          id="inicio"
          className="mx-auto max-w-[1440px] px-6 pt-10 pb-12 lg:px-10 lg:pt-14 lg:pb-16"
        >
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Columna izquierda: Jerarquía tipográfica */}
            <div className="flex flex-col justify-between lg:col-span-5 py-2">
              <div>
                <p className="text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
                  Exposición Permanente · Volumen IV · 2026
                </p>
                <h1
                  className="font-editorial mt-4 text-5xl font-medium leading-[1.03] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-6xl"
                  style={{ textWrap: 'balance' }}
                >
                  Luz, geometría y memoria visual.
                </h1>
                <p className="mt-6 max-w-md text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Una galería fotográfica diseñada alrededor de cada obra individual. Explora
                  encuadres en alta resolución con efectos de acercamiento al pasar el cursor,
                  lupa óptica de detalle y carga dinámica desde tu dispositivo o URL.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4 pt-4">
                <a
                  href="#galeria"
                  className="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-zinc-100 px-5 py-3 text-sm font-medium text-white dark:text-zinc-950 hover:bg-[#E11D48] dark:hover:bg-[#E11D48] dark:hover:text-white transition-colors duration-200 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48]"
                >
                  Explorar colección
                </a>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:border-zinc-950 dark:hover:border-zinc-400 transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Cargar imagen propia</span>
                </button>
              </div>
            </div>

            {/* Columna derecha: Fotografía protagonista a altura equivalente */}
            <div className="lg:col-span-7">
              <div
                onClick={() => setSelectedPhoto(HERO_PHOTO)}
                role="button"
                tabIndex={0}
                aria-label={`Inspeccionar obra destacada: ${HERO_PHOTO.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedPhoto(HERO_PHOTO);
                  }
                }}
                className="group relative h-72 sm:h-96 lg:h-full lg:min-h-[460px] w-full overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-zinc-200 dark:bg-zinc-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48]"
              >
                <img
                  src={HERO_PHOTO.src}
                  alt={`${HERO_PHOTO.title} — ${HERO_PHOTO.photographer}`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] will-change-transform"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent opacity-90 transition-opacity duration-200" />
                <div className="pointer-events-none absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-lg bg-black/65 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Inspeccionar 4×</span>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <p className="text-xs font-medium text-zinc-300">
                    Obra destacada · {HERO_PHOTO.location}
                  </p>
                  <p className="font-editorial mt-1 text-2xl font-medium text-white sm:text-3xl">
                    {HERO_PHOTO.title}
                  </p>
                  <p className="mt-1 font-mono-tabular text-xs text-zinc-300">
                    {HERO_PHOTO.exif.camera} · {HERO_PHOTO.exif.lens} · {HERO_PHOTO.exif.aperture}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Franja horizontal de métricas de ancho completo bajo el Hero Split */}
          <div className="mt-10 grid grid-cols-2 gap-6 border-y border-zinc-200 dark:border-zinc-800/90 py-6 sm:grid-cols-4">
            <div>
              <p className="font-mono-tabular text-2xl font-medium text-zinc-950 dark:text-zinc-50">
                {String(photos.length).padStart(2, '0')}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Fotografías en exposición
              </p>
            </div>
            <div>
              <p className="font-mono-tabular text-2xl font-medium text-zinc-950 dark:text-zinc-50">
                06
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Series temáticas activas
              </p>
            </div>
            <div>
              <p className="font-mono-tabular text-2xl font-medium text-zinc-950 dark:text-zinc-50">
                4.0×
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Ampliación óptica en visor
              </p>
            </div>
            <div>
              <p className="font-mono-tabular text-2xl font-medium text-zinc-950 dark:text-zinc-50">
                Local + URL
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Carga dinámica persistente
              </p>
            </div>
          </div>
        </section>

        {/* Cinta divisoria editorial */}
        <div
          aria-hidden="true"
          className="overflow-hidden border-y border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 py-3"
        >
          <div className="animate-marquee text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex items-center gap-6 pr-6 whitespace-nowrap">
                <span>Componentes individuales de fotografía</span>
                <span>·</span>
                <span>Zoom interactivo en hover y visor 400%</span>
                <span>·</span>
                <span>Carga dinámica desde archivo o URL</span>
                <span>·</span>
                <span>Lectura progresiva y metadatos ópticos</span>
                <span>·</span>
                <span>Mosaico bento y cuadrícula uniforme</span>
                <span>·</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sección principal de Galería y Barra de Herramientas */}
        <section
          ref={gallerySectionRef}
          id="galeria"
          className="mx-auto max-w-[1440px] px-6 py-14 lg:px-10 lg:py-20"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-editorial text-4xl font-medium tracking-tight text-zinc-950 dark:text-zinc-50">
                Colección curada
              </h2>
              <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                Cada tarjeta opera de forma independiente con carga diferida, transición de
                escala al pasar el cursor y acceso directo al visor de inspección detallada.
              </p>
            </div>

            {/* Controles de vista, lupa y tema */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Toggle Lupa en Hover */}
              <button
                type="button"
                onClick={() => setLoupeEnabled((prev) => !prev)}
                aria-pressed={loupeEnabled}
                className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  loupeEnabled
                    ? 'border-[#E11D48] bg-[#E11D48] text-white'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{loupeEnabled ? 'Lupa hover activa' : 'Activar lupa hover'}</span>
              </button>

              {/* Selector de diseño Bento / Cuadrícula */}
              <div
                role="group"
                aria-label="Modo de disposición"
                className="flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 p-1"
              >
                <button
                  type="button"
                  onClick={() => setLayoutMode('bento')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    layoutMode === 'bento'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Bento</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('grid')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    layoutMode === 'grid'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                  }`}
                >
                  <Grid className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Uniforme</span>
                </button>
              </div>

              {/* Cambio entre galería clara y cuarto oscuro */}
              <button
                type="button"
                onClick={() => setIsDarkroom((prev) => !prev)}
                aria-pressed={isDarkroom}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isDarkroom ? (
                  <>
                    <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Luz de galería</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Cuarto oscuro</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Barra de filtros por categoría */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div
              role="tablist"
              aria-label="Filtrar fotografías por categoría"
              className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 p-1"
            >
              {FILTER_OPTIONS.map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <p className="font-mono-tabular text-xs text-zinc-500 dark:text-zinc-400">
              Mostrando {filteredPhotos.length} de {photos.length} obras
            </p>
          </div>

          {inlineStatus && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200"
            >
              {inlineStatus}
            </div>
          )}

          {/* Grilla de componentes individuales de fotos */}
          {filteredPhotos.length === 0 ? (
            <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 py-16 px-6 text-center">
              <p className="font-editorial text-2xl font-medium text-zinc-900 dark:text-zinc-100">
                Aún no hay obras en «{activeCategory}»
              </p>
              <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                Puedes subir tus propias imágenes en esta categoría o volver a visualizar toda la
                exposición.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveCategory('Todas')}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:border-zinc-950 dark:hover:border-zinc-400 transition-colors cursor-pointer"
                >
                  Ver todas
                </button>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="rounded-lg bg-zinc-950 dark:bg-zinc-100 px-4 py-2 text-xs font-medium text-white dark:text-zinc-950 hover:bg-[#E11D48] dark:hover:bg-[#E11D48] dark:hover:text-white transition-colors cursor-pointer"
                >
                  Subir fotografía
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`mt-10 grid gap-6 lg:gap-8 ${
                layoutMode === 'bento'
                  ? 'grid-cols-1 md:grid-cols-3 md:auto-rows-[minmax(280px,auto)] grid-flow-dense'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {filteredPhotos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  layoutMode={layoutMode}
                  loupeEnabled={loupeEnabled}
                  onSelect={(item) => setSelectedPhoto(item)}
                  onRemove={handleRemovePhoto}
                />
              ))}
            </div>
          )}
        </section>

        {/* Módulo integrado de Carga Dinámica */}
        <section
          id="carga-dinamica"
          className="mx-auto max-w-[1440px] px-6 pb-16 lg:px-10 lg:pb-24"
        >
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 sm:p-10 lg:p-12">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Carga dinámica en tiempo real
                </p>
                <h2 className="font-editorial mt-2 text-3xl font-medium tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                  Incorpora nuevas imágenes al instante
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Arrastra archivos directamente sobre la ventana o importa enlaces externos. Cada
                  imagen detecta su relación de aspecto, genera su tarjeta individual con zoom al
                  pasar el cursor y queda lista para inspección ampliada en el visor.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:col-span-5 lg:justify-end">
                <label
                  htmlFor="inline-photo-upload"
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 dark:bg-zinc-100 px-5 py-3 text-sm font-medium text-white dark:text-zinc-950 hover:bg-[#E11D48] dark:hover:bg-[#E11D48] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#E11D48]"
                >
                  <input
                    id="inline-photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleQuickDropFiles(files);
                      }
                      e.target.value = '';
                    }}
                  />
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span>Seleccionar archivos</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:border-zinc-950 dark:hover:border-zinc-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Importar por URL</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Pie de página limpio */}
      <footer
        id="archivo"
        className="border-t border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#050505]"
      >
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-4 px-6 py-8 text-xs text-zinc-500 dark:text-zinc-400 sm:flex-row sm:items-center lg:px-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-editorial text-base font-semibold text-zinc-950 dark:text-zinc-100">
              Lumen Archivo
            </span>
            <span aria-hidden="true">·</span>
            <span>Galería fotográfica editorial · © 2026</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="#inicio"
              className="hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors"
            >
              Inicio
            </a>
            <a
              href="#galeria"
              className="hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors"
            >
              Colección
            </a>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Subir fotografía
            </button>
          </div>
        </div>
      </footer>

      {/* Visor fullscreen con zoom y panel EXIF */}
      <PhotoLightbox
        photos={filteredPhotos.length > 0 ? filteredPhotos : photos}
        activePhoto={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onSelectPhoto={(photo) => setSelectedPhoto(photo)}
      />

      {/* Modal de carga dinámica de imágenes */}
      <DynamicUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAddPhotos={handleAddPhotos}
      />
    </div>
  );
}
