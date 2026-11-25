import React from 'react';
import { Plus } from 'lucide-react';

interface HeaderProps {
  onOpenUpload: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenUpload }) => {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/90 dark:border-zinc-800/90 bg-[#FAFAFA]/92 dark:bg-[#050505]/92 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-8 px-6 lg:px-10">
        {/* Zona 1: Marca tipográfica única */}
        <a
          href="#inicio"
          className="font-editorial text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E11D48]"
        >
          Lumen Archivo
        </a>

        {/* Zona 2: 4 enlaces de navegación de una línea */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600 dark:text-zinc-400"
        >
          <a
            href="#inicio"
            className="hover:text-zinc-950 dark:hover:text-zinc-50 hover:underline underline-offset-8 decoration-zinc-400 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E11D48]"
          >
            Exposición
          </a>
          <a
            href="#galeria"
            className="hover:text-zinc-950 dark:hover:text-zinc-50 hover:underline underline-offset-8 decoration-zinc-400 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E11D48]"
          >
            Colección
          </a>
          <a
            href="#carga-dinamica"
            className="hover:text-zinc-950 dark:hover:text-zinc-50 hover:underline underline-offset-8 decoration-zinc-400 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E11D48]"
          >
            Carga dinámica
          </a>
          <a
            href="#archivo"
            className="hover:text-zinc-950 dark:hover:text-zinc-50 hover:underline underline-offset-8 decoration-zinc-400 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E11D48]"
          >
            Archivo
          </a>
        </nav>

        {/* Zona 3: Acción primaria única */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 dark:bg-zinc-100 px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-950 hover:bg-[#E11D48] dark:hover:bg-[#E11D48] dark:hover:text-white transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48]"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Subir fotos</span>
          </button>
        </div>
      </div>
    </header>
  );
};
