import { ArrowLeft, Flame } from 'lucide-react';
import { navigate } from '../lib/router';
import Logo from './Logo';

/** Se muestra en /app mientras la web no tenga los datos de Firebase. */
export default function SetupNeeded() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col">
      <header className="px-4 sm:px-8 h-16 flex items-center justify-between">
        <Logo className="h-8" light />
        <button type="button" onClick={() => navigate('/')} className="text-sm text-slate-300 hover:text-white inline-flex items-center gap-1.5 min-h-11 cursor-pointer"><ArrowLeft className="w-4 h-4" /> Volver al sitio</button>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 animate-fade-up">
          <span className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center"><Flame className="w-6 h-6" /></span>
          <h1 className="text-2xl font-bold">Falta conectar la base de datos</h1>
          <p className="text-sm text-slate-600">Esta web todavía no tiene los datos de su proyecto de Firebase, así que nadie puede crear cuentas ni guardar información.</p>
          <p className="text-sm text-slate-600">Sigue la guía <strong>FIREBASE.md</strong> del repositorio: creas el proyecto, copias seis valores en las variables de entorno <code className="text-xs bg-slate-100 px-1 rounded">VITE_FIREBASE_…</code> y vuelves a publicar.</p>
        </div>
      </main>
    </div>
  );
}
