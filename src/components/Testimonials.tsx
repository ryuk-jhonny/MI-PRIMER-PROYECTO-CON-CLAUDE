import { Quote } from 'lucide-react';

/**
 * Testimonios: se publican solo con permiso escrito de la persona.
 * Reemplaza el marcador por citas reales (nombre, cargo y colegio).
 */
export default function Testimonials() {
  return (
    <section className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-extrabold tracking-[0.2em] text-orange-600 uppercase">Opiniones de la comunidad</span>
          <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight leading-tight">Lo que dicen los colegios</h2>
          <p className="text-sm text-slate-500 pt-2 leading-relaxed">Directivos, docentes y familias que ya usan Ryuk.</p>
        </div>
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[0, 1].map((i) => (
            <figure key={i} className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300">
              <Quote className="w-6 h-6 text-orange-500" />
              <blockquote className="mt-3 text-sm text-slate-700 leading-relaxed">
                <mark className="bg-yellow-200 px-1 rounded">[TESTIMONIO REAL DE CLIENTE]</mark>
              </blockquote>
              <figcaption className="mt-4 text-xs text-slate-500">
                <mark className="bg-yellow-200 px-1 rounded">[NOMBRE · CARGO · COLEGIO]</mark>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}