import { Phone, Mail, Clock } from 'lucide-react';
import { navigate } from '../lib/router';

interface FooterProps {
  onOpenDemoModal: () => void;
  onScrollToSimulator: () => void;
  onNavigateToModule?: (moduleId: string) => void;
}

export default function Footer({ onOpenDemoModal, onScrollToSimulator, onNavigateToModule }: FooterProps) {
  return (
    <footer className="bg-white text-slate-600 text-xs border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          
          {/* Brand Info (Span 3) */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-orange-500"
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
              <div>
                <span className="text-base font-bold text-slate-900 block leading-none">
                  Sistema Ryuk
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                  Gestión escolar en la nube
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Asistencia con código QR, notas CNEB, libretas y comunicados para colegios de inicial, primaria y secundaria.
            </p>

            {/* [ENLACES A REDES SOCIALES]: agrégalos aquí cuando existan las cuentas */}
          </div>

          {/* Column 2: Quick Links (Span 2) */}
          <div className="lg:col-span-2 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Enlaces Rápidos
            </h4>
            <ul className="space-y-1.5 text-slate-500">
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-orange-600 transition-colors">
                  Inicio
                </a>
              </li>
              <li>
                <a href="#modulos" className="hover:text-orange-600 transition-colors">
                  Módulos
                </a>
              </li>
              <li>
                <button 
                  onClick={() => onNavigateToModule ? onNavigateToModule('portafolio') : onScrollToSimulator()} 
                  className="hover:text-orange-600 transition-colors cursor-pointer text-left"
                >
                  Portafolio Docente
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigateToModule ? onNavigateToModule('asistencia-qr') : onScrollToSimulator()} 
                  className="hover:text-orange-600 transition-colors cursor-pointer text-left"
                >
                  Asistencia QR
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigateToModule ? onNavigateToModule('registro-notas') : onScrollToSimulator()} 
                  className="hover:text-orange-600 transition-colors cursor-pointer text-left font-semibold text-orange-600"
                >
                  Notas en Tiempo Real
                </button>
              </li>
              <li>
                <a href="#planes" className="hover:text-orange-600 transition-colors">
                  Planes y Precios
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Módulos Académicos (Span 2) */}
          <div className="lg:col-span-2 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Niveles y Módulos
            </h4>
            <ul className="space-y-1.5 text-slate-500">
              <li><a href="#modulos" className="hover:text-orange-600 transition-colors">Educación Inicial</a></li>
              <li><a href="#modulos" className="hover:text-orange-600 transition-colors">Educación Primaria</a></li>
              <li><a href="#modulos" className="hover:text-orange-600 transition-colors">Educación Secundaria</a></li>
              <li><a href="#modulos" className="hover:text-orange-600 transition-colors">Escuelas y Colegios Integrados</a></li>
              <li><a href="#modulos" className="hover:text-orange-600 transition-colors">Redes Escolares</a></li>
            </ul>
          </div>

          {/* Column 4: Recursos (Span 2) */}
          <div className="lg:col-span-2 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recursos
            </h4>
            <ul className="space-y-1.5 text-slate-500">
              <li>
                <button onClick={onScrollToSimulator} className="hover:text-orange-600 transition-colors cursor-pointer text-left font-semibold text-blue-600">
                  Portal Móvil QR
                </button>
              </li>
              <li><a href="#faq" className="hover:text-orange-600 transition-colors">Calendario Escolar</a></li>
              <li><a href="#faq" className="hover:text-orange-600 transition-colors">Normativa Ministerial</a></li>
              <li><a href="#faq" className="hover:text-orange-600 transition-colors">Seguridad de Datos</a></li>
              <li><a href="#faq" className="hover:text-orange-600 transition-colors">Preguntas Frecuentes</a></li>
            </ul>
          </div>

          {/* Column 5: Contacto + Doodle Badge (Span 3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Contacto con el Soporte
            </h4>
            
            <div className="space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <a href="tel:957736411" className="font-mono text-slate-700 font-bold hover:text-orange-600 transition-colors">
                  957736411
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <a
                  href="mailto:romario156jraz2@gmail.com"
                  className="font-medium text-slate-700 hover:text-orange-600 transition-colors break-all"
                >
                  romario156jraz2@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Lun - Sáb: 7:30 AM – 6:00 PM</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright & legal bar */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
          <p>© {new Date().getFullYear()} Sistema Institucional Ryuk. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <a href="/privacidad" onClick={(e) => { e.preventDefault(); navigate('/privacidad'); }} className="hover:text-slate-600 py-2">Política de privacidad</a>
            <span>·</span>
            <a href="/terminos" onClick={(e) => { e.preventDefault(); navigate('/terminos'); }} className="hover:text-slate-600 py-2">Términos del servicio</a>
            <span>·</span>
            <a href="/demo" onClick={(e) => { e.preventDefault(); navigate('/demo'); }} className="hover:text-slate-600 py-2">Probar demo</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
