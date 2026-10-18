import { Loader2 } from 'lucide-react';

export default function FullLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300 gap-3" role="status">
      <Loader2 className="w-5 h-5 animate-spin text-orange-500" /> <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
