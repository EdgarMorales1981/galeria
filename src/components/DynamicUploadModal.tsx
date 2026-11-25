import React, { useState } from 'react';
import { Link2, Loader2, Upload, X } from 'lucide-react';
import { PhotoCategory, PhotoItem } from '../types/photo';
import {
  buildPhotoFromLocalFile,
  inferAspectRatioPreset,
  isSupportedImageFile,
  probeImageDimensions,
} from '../utils/imageStorage';

interface DynamicUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPhotos: (newPhotos: PhotoItem[]) => Promise<void> | void;
}

const CATEGORIES: PhotoCategory[] = [
  'Personal',
  'Arquitectura',
  'Paisaje',
  'Retrato',
  'Urbano',
  'Naturaleza Muerta',
];

export const DynamicUploadModal: React.FC<DynamicUploadModalProps> = ({
  isOpen,
  onClose,
  onAddPhotos,
}) => {
  const [activeTab, setActiveTab] = useState<'local' | 'url'>('local');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Campos para carga por URL y metadatos compartidos
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [photographerInput, setPhotographerInput] = useState('Colección Personal');
  const [categoryInput, setCategoryInput] = useState<PhotoCategory>('Personal');
  const [cameraInput, setCameraInput] = useState('Archivo Digital');

  if (!isOpen) return null;

  const processLocalFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(isSupportedImageFile);

    if (imageFiles.length === 0) {
      setErrorMsg('Selecciona uno o más archivos de imagen válidos (JPG, PNG, WebP, AVIF).');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const created: PhotoItem[] = [];

      for (const file of imageFiles) {
        const photo = await buildPhotoFromLocalFile(file, {
          category: categoryInput,
          photographer: photographerInput,
          camera: cameraInput,
          location: 'Archivo local',
        });
        created.push(photo);
      }

      await onAddPhotos(created);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Ocurrió un error al procesar las imágenes.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      setErrorMsg('Ingresa una dirección URL válida de imagen.');
      return;
    }

    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setErrorMsg('La URL debe comenzar con http:// o https://');
        return;
      }
    } catch {
      setErrorMsg('El formato de la URL no es válido.');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const dims = await probeImageDimensions(trimmedUrl, 12000);
      const aspect = inferAspectRatioPreset(dims.width, dims.height);

      const newPhoto: PhotoItem = {
        id: `user-url-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: titleInput.trim() || 'Obra externa importada',
        photographer: photographerInput.trim() || 'Colección Personal',
        category: categoryInput,
        year: String(new Date().getFullYear()),
        location: 'Recurso remoto',
        src: trimmedUrl,
        aspectRatio: aspect,
        bentoSpan: aspect === '16:9' ? 'wide' : aspect === '3:4' ? 'tall' : 'standard',
        width: dims.width,
        height: dims.height,
        source: 'url',
        exif: {
          camera: cameraInput.trim() || 'Archivo Digital',
          lens: 'Óptica estándar',
          aperture: 'f/5.6',
          shutter: '1/200 s',
          iso: 100,
          focalLength: '50 mm',
        },
        description: `Fotografía vinculada dinámicamente mediante URL (${dims.width} × ${dims.height} px).`,
      };

      await onAddPhotos([newPhoto]);
      setUrlInput('');
      setTitleInput('');
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No fue posible verificar la imagen en la URL indicada.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Carga dinámica de imágenes"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-editorial text-3xl font-medium tracking-tight text-zinc-950 dark:text-zinc-50">
              Añadir fotografías
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Carga imágenes locales en lote o enlaza recursos externos de forma dinámica.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Selector de método de carga */}
        <div className="mt-6 flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('local');
              setErrorMsg(null);
            }}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'local'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
            }`}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Desde dispositivo</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('url');
              setErrorMsg(null);
            }}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
            }`}
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Desde enlace URL</span>
          </button>
        </div>

        {/* Metadatos compartidos */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor="upload-category"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5"
            >
              Categoría
            </label>
            <select
              id="upload-category"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value as PhotoCategory)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#E11D48] focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="upload-author"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5"
            >
              Autoría
            </label>
            <input
              id="upload-author"
              type="text"
              value={photographerInput}
              onChange={(e) => setPhotographerInput(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#E11D48] focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="upload-camera"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5"
            >
              Cámara / Formato
            </label>
            <input
              id="upload-camera"
              type="text"
              value={cameraInput}
              onChange={(e) => setCameraInput(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#E11D48] focus:outline-none"
            />
          </div>
        </div>

        {activeTab === 'local' ? (
          <div className="mt-5">
            <label
              htmlFor="modal-file-input"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (e.dataTransfer.files?.length) {
                  processLocalFiles(e.dataTransfer.files);
                }
              }}
              className={`relative flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-[#E11D48] bg-[#E11D48]/5'
                  : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/50 hover:border-zinc-500 dark:hover:border-zinc-500'
              }`}
            >
              <input
                id="modal-file-input"
                type="file"
                accept="image/*"
                multiple
                disabled={isProcessing}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    processLocalFiles(files);
                  }
                  e.target.value = '';
                }}
                className="sr-only"
              />

              {isProcessing ? (
                <>
                  <Loader2
                    className="h-8 w-8 animate-spin text-[#E11D48]"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Procesando dimensiones y optimizando vista…
                  </p>
                </>
              ) : (
                <>
                  <Upload
                    className="h-8 w-8 text-zinc-400 dark:text-zinc-500"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Arrastra tus fotografías aquí o haz clic para seleccionar
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Soporta carga múltiple · JPG, PNG, WebP o AVIF · Guardado local en tu navegador
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-950 dark:bg-zinc-100 px-4 py-2 text-xs font-medium text-white dark:text-zinc-950">
                    Elegir archivos
                  </span>
                </>
              )}
            </label>
          </div>
        ) : (
          <form onSubmit={handleUrlSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="url-title"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5"
              >
                Título de la obra
              </label>
              <input
                id="url-title"
                type="text"
                placeholder="Ej. Estudio de luz sobre piedra"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#E11D48] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="url-source"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5"
              >
                URL directa de la imagen
              </label>
              <input
                id="url-source"
                type="url"
                required
                placeholder="https://ejemplo.com/fotografia.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#E11D48] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 dark:bg-zinc-100 px-5 py-2 text-sm font-medium text-white dark:text-zinc-950 hover:bg-[#E11D48] dark:hover:bg-[#E11D48] dark:hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                <span>Importar imagen</span>
              </button>
            </div>
          </form>
        )}

        {errorMsg && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300"
          >
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
};
