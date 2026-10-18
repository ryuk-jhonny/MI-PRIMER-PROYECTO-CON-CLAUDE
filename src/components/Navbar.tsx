import { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, Sparkles, LogIn } from 'lucide-react';
import { navigate } from '../lib/router';

const DESKTOP_LINKS = [
  { key: 'comunidad', label: 'Comunidad' },
  { key: 'areas-cneb', label: 'Áreas CNEB' },
  { key: 'modulos', label: 'Módulos' },
  { key: 'asistencia-qr', label: 'Asistencia QR', module: true },
];

interface NavbarProps {
  onOpenDemoModal: () => void;
  onScrollToSimulator: () => void;
  onNavigateToModule?: (moduleId: string) => void;
  onOpenAccessModal?: () => void;
}

export default function Navbar({ 
  onOpenDemoModal, 
  onScrollToSimulator, 
  onNavigateToModule,
  onOpenAccessModal
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('inicio');

  // Detect scroll position to highlight only the active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160;

      const sections = [
        { id: 'comunidad', key: 'comunidad' },
        { id: 'areas-cneb', key: 'areas-cneb' },
        { id: 'planes', key: 'planes' },
        { id: 'simulador', key: 'simulador' },
        { id: 'campus', key: 'campus' },
        { id: 'registro-notas', key: 'registro-notas' },
        { id: 'asistencia-qr', key: 'asistencia-qr' },
        { id: 'portafolio', key: 'portafolio' },
        { id: 'modulos', key: 'modulos' },
      ];

      let currentFound = false;
      for (const sec of sections) {
        const el = document.getElementById(sec.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sec.key);
            currentFound = true;
            break;
          }
        }
      }

      if (!currentFound && window.scrollY < 300) {
        setActiveSection('inicio');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Uniform link class generator: all links share identical neutral color, only active is highlighted in orange
  const getLinkClass = (sectionKey: string) => {
    const isActive = activeSection === sectionKey;
    return `transition-colors whitespace-nowrap shrink-0 text-sm ${
      isActive
        ? 'text-orange-600 font-bold'
        : 'text-slate-600 hover:text-orange-600 font-semibold'
    }`;
  };

  const getMobileLinkClass = (sectionKey: string) => {
    const isActive = activeSection === sectionKey;
    return `px-3 py-2 rounded-lg transition-colors text-base ${
      isActive
        ? 'text-orange-600 font-bold bg-orange-50/70'
        : 'text-slate-700 hover:bg-slate-50 hover:text-orange-600 font-semibold'
    }`;
  };

  const handleNavClick = (sectionKey: string, href?: string, moduleId?: string) => {
    setActiveSection(sectionKey);
    setMobileMenuOpen(false);

    if (moduleId && onNavigateToModule) {
      onNavigateToModule(moduleId);
      return;
    }

    if (sectionKey === 'simulador') {
      onScrollToSimulator();
      return;
    }

    if (href) {
      if (href === '#') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const el = document.querySelector(href);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 sm:gap-6 h-20">
          
          {/* Zone 1: Brand Wordmark with School Emblem */}
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('inicio', '#');
            }}
            className="flex items-center gap-2.5 sm:gap-3 whitespace-nowrap min-w-0 group"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 p-0.5 shadow-sm flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-orange-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base sm:text-xl font-bold tracking-tight truncate text-slate-900 group-hover:text-orange-600 transition-colors">
                Sistema Institucional <span className="text-orange-500 font-extrabold">Ryuk</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                Gestión escolar en la nube
              </span>
            </div>
          </a>

          {/* Zone 2: Navigation Links with UNIFORM styling */}
          <nav className="hidden xl:flex items-center gap-6">
            {DESKTOP_LINKS.map((l) => (
              <a key={l.key} href={`#${l.key}`}
                onClick={(e) => { e.preventDefault(); if (l.module) handleNavClick(l.key, undefined, l.key); else handleNavClick(l.key, `#${l.key}`); }}
                className={getLinkClass(l.key)}>
                {l.label}
              </a>
            ))}
            <button type="button" onClick={() => handleNavClick('simulador')} className={`${getLinkClass('simulador')} flex items-center gap-1.5 cursor-pointer`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulador</span>
            </button>
            <a href="#planes" onClick={(e) => { e.preventDefault(); handleNavClick('planes', '#planes'); }} className={getLinkClass('planes')}>
              Planes
            </a>
          </nav>

          {/* Zone 3: Acceder + CTA */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAccessModal?.()}
              className="px-4 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-300 hover:border-orange-500 hover:text-orange-600 rounded-full shadow-xs active:scale-95 transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4 text-orange-500" />
              <span>Acceder</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/app#crear')}
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-full shadow-md shadow-orange-500/25 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
            >
              <span>Registrar mi colegio</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="flex xl:hidden shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top-2">
          <div className="flex flex-col space-y-1.5 pt-1">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('inicio', '#');
              }}
              className={getMobileLinkClass('inicio')}
            >
              Inicio
            </a>

            <a
              href="#comunidad"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('comunidad', '#comunidad');
              }}
              className={getMobileLinkClass('comunidad')}
            >
              Comunidad educativa
            </a>

            <a
              href="#areas-cneb"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('areas-cneb', '#areas-cneb');
              }}
              className={getMobileLinkClass('areas-cneb')}
            >
              Áreas del CNEB
            </a>

            <a
              href="#modulos"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('modulos', '#modulos');
              }}
              className={getMobileLinkClass('modulos')}
            >
              Módulos de Gestión
            </a>

            <a
              href="#portafolio"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('portafolio', undefined, 'portafolio');
              }}
              className={getMobileLinkClass('portafolio')}
            >
              Planificación CNEB
            </a>

            <a
              href="#asistencia-qr"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('asistencia-qr', undefined, 'asistencia-qr');
              }}
              className={getMobileLinkClass('asistencia-qr')}
            >
              Asistencia Estudiantil con QR
            </a>

            <a
              href="#registro-notas"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('registro-notas', undefined, 'registro-notas');
              }}
              className={getMobileLinkClass('registro-notas')}
            >
              Registro de Notas en Vivo
            </a>

            <a
              href="#campus"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('campus', '#campus');
              }}
              className={getMobileLinkClass('campus')}
            >
              Campus & Infraestructura Digital
            </a>

            <button
              onClick={() => handleNavClick('simulador')}
              className={`${getMobileLinkClass('simulador')} w-full text-left flex items-center justify-between cursor-pointer`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Simulador Interactivo en Vivo</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <a
              href="#planes"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('planes', '#planes');
              }}
              className={getMobileLinkClass('planes')}
            >
              Planes Institucionales
            </a>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAccessModal?.();
              }}
              className="w-full py-2.5 px-4 text-center text-sm font-bold text-slate-800 bg-slate-100 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4 text-orange-500" />
              <span>Acceder</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/app#crear');
              }}
              className="w-full py-3 px-4 text-center text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 transition-colors cursor-pointer"
            >
              Registrar mi colegio
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
