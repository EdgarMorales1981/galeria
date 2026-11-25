import { AspectRatioPreset, PhotoCategory, PhotoItem } from '../types/photo';

const DB_NAME = 'lumen_archivo_db';
const DB_VERSION = 1;
const STORE_NAME = 'user_photos';

const IMAGE_EXTENSION_RE = /\.(jpe?g|png|webp|gif|avif|svg|bmp|tiff?|ico|heic|heif)$/i;

export function isSupportedImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  return IMAGE_EXTENSION_RE.test(file.name);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadSavedUserPhotos(): Promise<PhotoItem[]> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as PhotoItem[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveUserPhoto(photo: PhotoItem): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(photo);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback silencioso si el almacenamiento local está lleno o restringido
  }
}

export async function deleteUserPhoto(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback silencioso
  }
}

export function inferAspectRatioPreset(width: number, height: number): AspectRatioPreset {
  if (!width || !height) return '4:3';
  const ratio = width / height;
  if (ratio >= 1.55) return '16:9';
  if (ratio >= 1.15) return '4:3';
  if (ratio >= 0.88) return '1:1';
  return '3:4';
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo leer el archivo'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer la imagen'));
    reader.readAsDataURL(file);
  });
}

export function probeImageDimensions(
  src: string,
  timeoutMs = 10000
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    const timer = window.setTimeout(() => {
      reject(new Error('Tiempo de espera agotado al cargar la imagen'));
    }, timeoutMs);

    img.onload = () => {
      window.clearTimeout(timer);
      resolve({
        width: img.naturalWidth || 1600,
        height: img.naturalHeight || 1200,
      });
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('No fue posible cargar la imagen desde esa fuente'));
    };
    img.src = src;
  });
}

export async function buildPhotoFromLocalFile(
  file: File,
  options?: {
    category?: PhotoCategory;
    photographer?: string;
    camera?: string;
    location?: string;
  }
): Promise<PhotoItem> {
  let src: string;
  try {
    src = await readFileAsDataUrl(file);
  } catch {
    src = URL.createObjectURL(file);
  }

  let dims = { width: 1600, height: 1200 };
  try {
    dims = await probeImageDimensions(src, 6000);
  } catch {
    // Si el navegador no pudo sondear dimensiones previas, usar proporción estándar 4:3
  }

  const aspect = inferAspectRatioPreset(dims.width, dims.height);
  const cleanTitle =
    file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim() ||
    'Fotografía sin título';

  return {
    id: `user-local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: cleanTitle,
    photographer: options?.photographer?.trim() || 'Colección Personal',
    category: options?.category || 'Personal',
    year: String(new Date().getFullYear()),
    location: options?.location || 'Archivo local',
    src,
    aspectRatio: aspect,
    bentoSpan: aspect === '16:9' ? 'wide' : aspect === '3:4' ? 'tall' : 'standard',
    width: dims.width,
    height: dims.height,
    fileSizeLabel: formatBytes(file.size),
    source: 'local',
    exif: {
      camera: options?.camera?.trim() || 'Archivo Digital',
      lens: 'Óptica estándar',
      aperture: 'f/4.0',
      shutter: '1/250 s',
      iso: 100,
      focalLength: '35 mm',
    },
    description: `Imagen cargada dinámicamente desde archivo local (${dims.width} × ${dims.height} px).`,
  };
}
