import { Check, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { INSTITUTION_PLANS } from '../data/mockData';

interface PricingProps {
  onSelectPlan: (planName: string) => void;
}

export default function PricingSection({ onSelectPlan }: PricingProps) {
  return (
    <section id="planes" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-3">
          <span className="text-xs font-extrabold tracking-[0.2em] text-orange-600 uppercase">
            PLANES E INVERSIÓN INSTITUCIONAL
          </span>
          <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight leading-tight [text-wrap:balance]">
            Planes Escalables para Cada Tamaño de Colegio
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Sin servidores ni instalaciones en tu colegio: Ryuk funciona en el navegador. Elige el plan según el tamaño de tu institución.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {INSTITUTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-7 flex flex-col justify-between transition-all relative ${
                plan.isPopular
                  ? 'bg-white border-2 border-orange-500 shadow-xl'
                  : 'bg-white border border-slate-200 shadow-xs hover:shadow-md'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-extrabold tracking-wider uppercase rounded-full shadow-sm">
                  Recomendado
                </div>
              )}

              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[36px]">{plan.description}</p>
                </div>

                <div className="py-4 border-y border-slate-100 my-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tabular-nums">
                      {plan.pricePerStudentPerMonth}
                    </span>
                    {plan.pricePerStudentPerMonth !== 'A medida' && (
                      <span className="text-xs text-slate-500">/ alumno al mes</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-orange-600 block mt-1">
                    {plan.studentRange}
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-700 mb-6">
                  <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider text-slate-400">
                    Incluye en la plataforma:
                  </span>
                  {plan.features.map((feat, index) => (
                    <div key={index} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <button
                  onClick={() => onSelectPlan(plan.name)}
                  className={`w-full py-3.5 px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    plan.isPopular
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 active:scale-[0.98]'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>Solicitar Propuesta para mi Colegio</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Guarantee Banner */}
        <div className="mt-12 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Te ayudamos a empezar
              </h4>
              <p className="text-xs text-slate-500">
                Importamos tu nómina de SIAGIE y capacitamos a tu equipo. [PLAZO Y CONDICIONES DE LA CAPACITACIÓN]
              </p>
            </div>
          </div>
          <a
            href="#faq"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <HelpCircle className="w-4 h-4" />
            Consultar dudas frecuentes
          </a>
        </div>
      </div>
    </section>
  );
}
