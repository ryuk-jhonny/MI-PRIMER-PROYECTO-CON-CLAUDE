import { useMemo, useState } from 'react';
import { Activity, BookOpenCheck, ChevronDown, ClipboardList, Compass, Layers, NotebookPen, Save, Sparkles } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { AREAS, areaInfo, CICLO_INFO, Ciclo, COMPETENCIAS, competenciasOf, ENFOQUES_TRANSVERSALES, Level, LEVEL_LABEL, LEVELS, TRANSVERSALES } from '../lib/cneb';
import { activePeriodIndex, aulaOf, findGrade, levelOf, periodCount, unitsOf } from '../lib/school';
import type { UserProfile } from '../lib/store';
import { btn, Card, Empty, PageHeader } from './ui';

export default function AreaTab({ ctx }: { ctx: PanelCtx }) {
  const { me, myAreas, students, config } = ctx;
  const [editing, setEditing] = useState(myAreas.length === 0);
  const myLevels = (me.levels?.length ? me.levels : config.activeLevels) as Level[];
  const [areaPick, setArea] = useState(myAreas[0] || '');
  const area = myAreas.includes(areaPick) ? areaPick : myAreas[0] || '';
  const levelsForArea = myLevels.filter((l) => competenciasOf(area, l).length);
  const [levelPick, setLevel] = useState<Level>(levelsForArea[0] || 'primaria');
  const level = levelsForArea.includes(levelPick) ? levelPick : levelsForArea[0] || 'primaria';
  const info = areaInfo(area);
  const comps = competenciasOf(area, level);
  const [open, setOpen] = useState<string | null>(null);

  const n = periodCount(config);
  const p = Math.min(activePeriodIndex(config), n - 1);
  const progress = useMemo(() => {
    const aulas = [...new Set(students.filter((s) => levelOf(s) === level).map(aulaOf))].sort()
      .filter((a) => !me.aulas?.length || me.aulas.includes(a));
    return aulas.map((a) => {
      const list = students.filter((s) => aulaOf(s) === a);
      const graded = list.filter((s) => unitsOf(findGrade(s, area), n)[p]).length;
      return { aula: a, total: list.length, graded, pct: list.length ? Math.round((graded / list.length) * 100) : 0 };
    });
  }, [students, level, area, n, p, me.aulas]);

  if (editing) return <LoadEditor ctx={ctx} onDone={() => setEditing(false)} />;
  if (!myAreas.length) {
    return <Empty icon={Compass} title="Elige tus áreas" action={<button type="button" onClick={() => setEditing(true)} className={btn.primary}>Elegir áreas</button>}>Tu panel se arma con las competencias de las áreas que enseñas.</Empty>;
  }

  return (
    <div className="space-y-6 stagger">
      <PageHeader
        title="Mi área CNEB"
        subtitle={`Competencias, capacidades y herramientas de ${myAreas.length === 1 ? myAreas[0] : 'tus áreas'} según el Currículo Nacional.`}
        actions={<button type="button" onClick={() => setEditing(true)} className={btn.secondary}><Layers className="w-4 h-4" /> Mi carga docente</button>}
      />

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1" role="tablist" aria-label="Mis áreas">
        {myAreas.map((a) => (
          <button key={a} type="button" role="tab" aria-selected={a === area} onClick={() => { setArea(a); setOpen(null); }}
            className={`h-11 px-4 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer transition ${a === area ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}`}>
            {a}
          </button>
        ))}
      </div>

      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className={`absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br ${info?.tone || 'from-orange-500 to-amber-400'} opacity-20 blur-2xl`} aria-hidden="true" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-orange-300 font-bold">{info?.short} · {LEVEL_LABEL[level]}</p>
            <h2 className="text-2xl font-bold text-white mt-1">{area}</h2>
            <p className="text-sm text-slate-400 mt-1">{comps.length} competencias · {comps.reduce((a, c) => a + c.capacidades.length, 0)} capacidades</p>
          </div>
          {levelsForArea.length > 1 && (
            <div className="flex gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
              {levelsForArea.map((l) => (
                <button key={l} type="button" aria-pressed={l === level} onClick={() => setLevel(l)} className={`h-10 px-4 rounded-lg text-sm font-semibold cursor-pointer ${l === level ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>{LEVEL_LABEL[l]}</button>
              ))}
            </div>
          )}
        </div>
        <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button type="button" onClick={() => ctx.go('notas')} className={btn.secondary}><BookOpenCheck className="w-4 h-4" /> Calificar</button>
          <button type="button" onClick={() => ctx.go('planificacion')} className={btn.secondary}><NotebookPen className="w-4 h-4" /> Planificar</button>
          <button type="button" onClick={() => ctx.go('actividades')} className={btn.secondary}><ClipboardList className="w-4 h-4" /> Actividades</button>
          {info?.tool === 'fisica' && <button type="button" onClick={() => ctx.go('fisica')} className={btn.secondary}><Activity className="w-4 h-4" /> Evaluación física</button>}
        </div>
      </Card>

      <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="lg:col-span-3 space-y-3">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Competencias y capacidades</h3>
          {comps.map((c) => {
            const isOpen = open === c.id;
            return (
              <Card key={c.id} className="overflow-hidden">
                <button type="button" onClick={() => setOpen(isOpen ? null : c.id)} aria-expanded={isOpen} className="w-full p-4 sm:p-5 flex items-start gap-3 text-left cursor-pointer">
                  <span className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-300 font-bold text-sm flex items-center justify-center shrink-0">C{c.n}</span>
                  <span className="flex-1 font-semibold text-white leading-snug">{c.name}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <ul className="px-5 pb-5 pl-[4.25rem] space-y-2">
                      {c.capacidades.map((cap) => <li key={cap} className="text-sm text-slate-300 list-disc">{cap}</li>)}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
          <Card className="p-4 sm:p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Competencias transversales</p>
            <ul className="mt-2 space-y-1.5">{TRANSVERSALES.map((t) => <li key={t} className="text-sm text-slate-300"><strong className="text-white">C{t}</strong> · {COMPETENCIAS[t].name}</li>)}</ul>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-white">Avance de calificación · {config.activePeriod}</h3>
            {progress.length === 0 ? <p className="mt-2 text-sm text-slate-400">No hay aulas de {LEVEL_LABEL[level].toLowerCase()} con estudiantes.</p> : (
              <div className="mt-4 space-y-3">
                {progress.map((r) => (
                  <div key={r.aula}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-300 font-semibold">{r.aula}</span><span className="text-slate-400 tabular-nums">{r.graded}/{r.total}</span></div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="bar-fill h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-400 transition-[width] duration-700" style={{ width: `${r.pct}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-orange-400" /> Evidencias sugeridas</h3>
            <ul className="mt-2 space-y-1.5">{info?.evidencias.map((e) => <li key={e} className="text-sm text-slate-300">• {e}</li>)}</ul>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-wide">Instrumentos</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{info?.instrumentos.map((i) => <span key={i} className="px-2.5 py-1 rounded-full bg-slate-800 text-xs text-slate-200">{i}</span>)}</div>
          </Card>
          <Card className="p-5">
            <h3 className="font-bold text-white">Ciclos de {LEVEL_LABEL[level].toLowerCase()}</h3>
            <ul className="mt-2 space-y-1">
              {(Object.keys(CICLO_INFO) as Ciclo[]).filter((k) => CICLO_INFO[k].level === level).map((k) => <li key={k} className="text-sm text-slate-300"><strong className="text-white">Ciclo {k}</strong> · {CICLO_INFO[k].grados}</li>)}
            </ul>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-wide">Enfoques transversales</p>
            <ul className="mt-2 space-y-1">{ENFOQUES_TRANSVERSALES.map((e) => <li key={e} className="text-xs text-slate-400">{e}</li>)}</ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LoadEditor({ ctx, onDone }: { ctx: PanelCtx; onDone: () => void }) {
  const { me } = ctx;
  return (
    <div className="space-y-6">
      <PageHeader title="Mi carga docente" subtitle="Con esto se arma tu panel: competencias, notas, planificación y herramientas de tus áreas. Puedes elegir más de un área." />
      <Card className="p-5 sm:p-6">
        <LoadForm ctx={ctx} initial={me} onCancel={me.areas?.length ? onDone : undefined}
          onSave={async (patch) => { await ctx.updateMe(patch); onDone(); }} />
      </Card>
    </div>
  );
}

/** Niveles, áreas (una o varias) y aulas de un docente. Lo usa el docente y también la dirección. */
export function LoadForm({ ctx, initial, onSave, onCancel, who = 'yo' }: {
  ctx: PanelCtx;
  initial: Pick<UserProfile, 'levels' | 'areas' | 'aulas'>;
  onSave: (patch: { levels: Level[]; areas: string[]; aulas: string[] }) => Promise<void>;
  onCancel?: () => void;
  who?: 'yo' | 'docente';
}) {
  const { students, config } = ctx;
  const [levels, setLevels] = useState<Level[]>(initial.levels?.length ? initial.levels : (config.activeLevels as Level[]));
  const [areas, setAreas] = useState<string[]>(initial.areas || []);
  const [aulas, setAulas] = useState<string[]>(initial.aulas || []);
  const [busy, setBusy] = useState(false);
  const allAulas = [...new Set(students.filter((s) => levels.includes(levelOf(s))).map(aulaOf))].sort();
  const options = AREAS.filter((a) => levels.some((l) => a.competencias[l]?.length));
  const chip = (on: boolean) => `h-10 px-3.5 rounded-xl text-sm font-semibold cursor-pointer transition border ${on ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`;
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = async () => {
    setBusy(true);
    const keep = areas.filter((a) => options.some((o) => o.name === a));
    await onSave({ levels, areas: keep, aulas: aulas.filter((a) => allAulas.includes(a)) });
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-sm font-bold text-white mb-2">Niveles</legend>
        <div className="flex gap-2 flex-wrap">{LEVELS.map((l) => <button key={l} type="button" aria-pressed={levels.includes(l)} onClick={() => setLevels(toggle(levels, l))} className={chip(levels.includes(l))}>{LEVEL_LABEL[l]}</button>)}</div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-bold text-white mb-1">{who === 'yo' ? 'Áreas que enseño' : 'Áreas que enseña'}</legend>
        <p className="text-xs text-slate-400 mb-2">Marca todas las que correspondan.</p>
        <div className="flex gap-2 flex-wrap">{options.map((a) => <button key={a.name} type="button" aria-pressed={areas.includes(a.name)} onClick={() => setAreas(toggle(areas, a.name))} className={chip(areas.includes(a.name))}>{a.name}</button>)}</div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-bold text-white mb-1">{who === 'yo' ? 'Aulas a mi cargo' : 'Aulas a su cargo'} <span className="font-normal text-slate-400">(opcional)</span></legend>
        <p className="text-xs text-slate-400 mb-2">Sin aulas elegidas se ven todas las aulas de los niveles marcados.</p>
        {allAulas.length === 0 ? <p className="text-sm text-slate-500">Aún no hay aulas con estudiantes.</p> : (
          <div className="flex gap-2 flex-wrap">{allAulas.map((a) => <button key={a} type="button" aria-pressed={aulas.includes(a)} onClick={() => setAulas(toggle(aulas, a))} className={chip(aulas.includes(a))}>{a}</button>)}</div>
        )}
      </fieldset>
      <div className="flex justify-end gap-2">
        {onCancel && <button type="button" onClick={onCancel} className={btn.ghost}>Cancelar</button>}
        <button type="button" onClick={save} disabled={busy || !areas.length || !levels.length} className={btn.primary}><Save className="w-4 h-4" /> Guardar</button>
      </div>
    </div>
  );
}
