import { ChevronLeft, Folder } from 'lucide-react';
import { btn } from './ui';

export interface FolderItem { name: string; count: number; hint?: string }

/** Aulas como carpetas, agrupadas por nivel ("3ro Primaria · A" va en Primaria). */
export function AulaFolders({ items, onOpen, unit = 'estudiantes' }: { items: FolderItem[]; onOpen: (name: string) => void; unit?: string }) {
  const groups = ['Primaria', 'Secundaria', 'Otras'].map((lv) => ({
    lv,
    list: items.filter((x) => (lv === 'Otras' ? !/Primaria|Secundaria/.test(x.name) : x.name.includes(lv))),
  })).filter((g) => g.list.length);
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.lv} aria-label={g.lv} className="space-y-2">
          {groups.length > 1 && <h2 className="text-sm font-bold text-slate-300">{g.lv}</h2>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {g.list.map((x) => (
              <button key={x.name} type="button" onClick={() => onOpen(x.name)} aria-label={`Abrir ${x.name}`}
                className="lift text-left rounded-2xl p-4 bg-slate-900/85 border border-slate-800 hover:border-orange-500/50 cursor-pointer transition group">
                <Folder className="w-8 h-8 text-orange-400 group-hover:scale-110 transition-transform" />
                <p className="mt-2 text-sm font-bold text-white leading-snug">{x.name}</p>
                <p className="text-xs text-slate-400">{x.count === 1 ? `1 ${unit.replace(/s$/, '')}` : `${x.count} ${unit}`}{x.hint ? ` · ${x.hint}` : ''}</p>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function FolderBack({ name, onBack, label = 'Todas las aulas' }: { name: string; onBack: () => void; label?: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button type="button" onClick={onBack} className={btn.ghost}><ChevronLeft className="w-4 h-4" /> {label}</button>
      <span className="text-slate-500">/</span>
      <span className="text-sm font-bold text-white">{name}</span>
    </div>
  );
}
