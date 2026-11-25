export type PhotoCategory =
  | 'Arquitectura'
  | 'Paisaje'
  | 'Retrato'
  | 'Urbano'
  | 'Naturaleza Muerta'
  | 'Personal';

export type AspectRatioPreset = '16:9' | '4:3' | '3:4' | '1:1';

export type GalleryLayoutMode = 'bento' | 'grid';

export type PhotoSource = 'curated' | 'local' | 'url';

export interface PhotoExif {
  camera: string;
  lens: string;
  aperture: string;
  shutter: string;
  iso: number;
  focalLength: string;
}

export interface PhotoItem {
  id: string;
  title: string;
  photographer: string;
  category: PhotoCategory;
  year: string;
  location: string;
  src: string;
  aspectRatio: AspectRatioPreset;
  bentoSpan?: 'wide' | 'tall' | 'standard';
  width?: number;
  height?: number;
  fileSizeLabel?: string;
  source: PhotoSource;
  exif: PhotoExif;
  description: string;
}
