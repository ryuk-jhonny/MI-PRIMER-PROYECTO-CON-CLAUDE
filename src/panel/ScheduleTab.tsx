import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { friendlyError } from '../lib/firebase';
import {
  blockError, ClassBlock, conflicts, Day, DAYS, dayName, MAX_BLOCKS, nextClass, nowIn, OwnedBlock, overlaps, sortBlocks, TeacherSchedule,
} from '../lib/schedule';
import { Badge, btn, Card, Empty, input, label, Modal, PageHeader } from './ui';

/** Aulas del colegio ("3ro Primaria · A"); para un docente con aulas asignadas, solo esas. */
export function aulaOptions(ctx: PanelCtx): string[] {
  const all = ctx.config.gradeConfigs.filter((g) => g.enabled).flatMap((g) => g.sections.map((s) => `${g.gradeName} · ${s}`));
  const mine = ctx.me.aulas || [];
  return mine.length && !ctx.isDirector ? all.filter((a) => mine.includes(a)) : all;
}

export default function ScheduleTab({ ctx }: { ctx: PanelCtx }) {
  const { store, me, isDirector } = ctx;
  const [all, setAll] = useState<TeacherSchedule[] | null>(null);
  const [editing, setEditing] = useState<ClassBlock | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    store.listSchedules().then(setAll).catch((err) => { ctx.toast(friendlyError(err), 'error'); setAll([]); });
  }, [store]); // eslint-disable-line react-hooks/exhaustive-deps

  const owned: OwnedBlock[] = useMemo(
    () => (all || []).flatMap((t) => (t.blocks || []).map((b) => ({ ...b, ownerUid: t.ownerUid, ownerName: t.ownerName }))),
    [all],
  );
  const mine = useMemo(() => owned.filter((b) => b.ownerUid === me.uid), [owned, me.uid]);
  const clashes = useMemo(() => conflicts(owned), [owned]);
  const clashIds = new Set(clashes.flat().map((b) => `${b.ownerUid}/${b.id}`));

  const saveMine = async (blocks: ClassBlock[], msg: string) => {
    try {
      const saved = await store.saveMySchedule(sortBlocks(blocks).map(({ id, day, start, end, aula, area }) => ({ id, day, start, end, aula, area })));
      setAll((l) => [saved, ...(l || []).filter((t) => t.ownerUid !== me.uid)]);
      ctx.toast(msg);
      return true;
    } catch (err) { ctx.toast(friendlyError(err), 'error'); return false; }
  };

  const remove = (b: ClassBlock) => saveMine(mine.filter((x) => x.id !== b.id), 'Clase quitada de tu horario.');

  if (all === null) return <p className="text-sm text-slate-400">Cargando horarios…</p>;

  // ----- Dirección: horario de todo el colegio -----
  if (isDirector) {
    const teachers = (all || []).filter((t) => t.blocks?.length).map((t) => [t.ownerUid, t.ownerName] as const);
    const aulas = [...new Set(owned.map((b) => b.aula))].sort();
    const shown = filter.startsWith('aula:') ? owned.filter((b) => b.aula === filter.slice(5))
      : filter.startsWith('doc:') ? owned.filter((b) => b.ownerUid === filter.slice(4)) : owned;
    return (
      <div className="space-y-6 stagger">
        <PageHeader title="Horarios" subtitle="El horario de clases de cada docente. Si dos docentes tienen la misma aula a la misma hora, aparece una alerta." />
        {clashes.length > 0 && (
          <Card className="p-5 border-amber-500/40">
            <h2 className="flex items-center gap-2 font-bold text-amber-200"><AlertTriangle className="w-5 h-5" /> {clashes.length === 1 ? 'Un cruce de horario' : `${clashes.length} cruces de horario`}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {clashes.map(([a, b]) => (
                <li key={`${a.ownerUid}${a.id}${b.ownerUid}${b.id}`}>
                  <strong className="text-white">{a.aula}</strong>, {dayName(a.day)}: {a.ownerName} ({a.area}, {a.start}–{a.end}) y {b.ownerName} ({b.area}, {b.start}–{b.end}).
                </li>
              ))}
            </ul>
          </Card>
        )}
        {owned.length === 0 ? (
          <Empty icon={CalendarClock} title="Aún no hay horarios">Cuando tus docentes armen su horario en «Mi horario», lo verás aquí por docente y por aula.</Empty>
        ) : (
          <>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${input} sm:w-80`} aria-label="Ver horario de">
              <option value="">Todo el colegio</option>
              <optgroup label="Por aula">{aulas.map((a) => <option key={a} value={`aula:${a}`}>{a}</option>)}</optgroup>
              <optgroup label="Por docente">{teachers.map(([uid, name]) => <option key={uid} value={`doc:${uid}`}>{name}</option>)}</optgroup>
            </select>
            <Week blocks={shown} showOwner clashIds={clashIds} />
          </>
        )}
      </div>
    );
  }

  // ----- Docente: su propio horario -----
  const now = nowIn(ctx.config.timeZone);
  const next = nextClass(mine, now);
  const newBlock = (): ClassBlock => {
    const sorted = sortBlocks(mine);
    const last = sorted[sorted.length - 1];
    return {
      id: `b_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      day: (last?.day || 1) as Day, start: last?.end || '08:00', end: '', aula: last?.aula || aulaOptions(ctx)[0] || '', area: last?.area || ctx.myAreas[0] || '',
    };
  };

  return (
    <div className="space-y-6 stagger">
      <PageHeader
        title="Mi horario"
        subtitle="Agrega tus clases de la semana. Tu próxima clase aparece en tu inicio y tus estudiantes ven el horario de su sección."
        actions={ctx.myAreas.length ? <button type="button" disabled={mine.length >= MAX_BLOCKS} onClick={() => setEditing(newBlock())} className={btn.primary}><Plus className="w-4 h-4" /> Agregar clase</button> : undefined}
      />
      {ctx.myAreas.length === 0 ? (
        <Empty icon={CalendarClock} title="Primero elige tus áreas" action={<button type="button" onClick={() => ctx.go('area')} className={btn.primary}>Elegir mis áreas</button>}>Tu horario se arma con las áreas que enseñas.</Empty>
      ) : mine.length === 0 ? (
        <Empty icon={CalendarClock} title="Tu horario está vacío" action={<button type="button" onClick={() => setEditing(newBlock())} className={btn.primary}><Plus className="w-4 h-4" /> Agregar mi primera clase</button>}>
          Escribe el día, la hora, el aula y el área de cada clase.
        </Empty>
      ) : (
        <>
          {next && <NextClassCard next={next} />}
          <Week blocks={mine} clashIds={clashIds} onEdit={setEditing} onDelete={remove} />
        </>
      )}
      {editing && (
        <BlockEditor
          ctx={ctx}
          block={editing}
          mine={mine}
          others={owned.filter((b) => b.ownerUid !== me.uid)}
          onClose={() => setEditing(null)}
          onSave={async (b) => {
            const exists = mine.some((x) => x.id === b.id);
            const ok = await saveMine(exists ? mine.map((x) => (x.id === b.id ? b : x)) : [...mine, b], exists ? 'Clase actualizada.' : 'Clase agregada a tu horario.');
            if (ok) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

export function NextClassCard({ next, actions }: { next: NonNullable<ReturnType<typeof nextClass>>; actions?: ReactNode }) {
  const b = next.block;
  const when = next.current ? 'Ahora en clase' : next.today ? 'Tu próxima clase hoy' : `Tu próxima clase · ${dayName(b.day)}`;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 min-w-0">
          <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${next.current ? 'bg-emerald-500/15 text-emerald-300 ring-pulse' : 'bg-orange-500/15 text-orange-300'}`}><Clock className="w-6 h-6" /></span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{when}</p>
            <p className="text-lg font-bold text-white mt-0.5">{b.area} · {b.aula}</p>
            <p className="text-sm text-slate-400">{b.start} a {b.end}</p>
          </div>
        </div>
        {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
      </div>
    </Card>
  );
}

/** Semana en columnas (lunes a viernes, y sábado si hay clases). En celular, un día debajo del otro. */
export function Week({ blocks, showOwner, clashIds, onEdit, onDelete, light }: {
  blocks: (ClassBlock & { ownerUid?: string; ownerName?: string })[];
  showOwner?: boolean;
  clashIds?: Set<string>;
  onEdit?: (b: ClassBlock) => void;
  onDelete?: (b: ClassBlock) => void;
  light?: boolean;
}) {
  const days = DAYS.map((name, i) => ({ name, day: (i + 1) as Day })).filter((d) => d.day <= 5 || blocks.some((b) => b.day === d.day));
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${days.length === 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
      {days.map(({ name, day }) => {
        const list = sortBlocks(blocks.filter((b) => b.day === day));
        return (
          <section key={day} aria-label={name} className={`rounded-2xl border p-3 ${light ? 'bg-white border-slate-200' : 'bg-slate-900/70 border-slate-800'}`}>
            <h3 className={`text-sm font-bold mb-2 ${light ? 'text-slate-900' : 'text-white'}`}>{name}</h3>
            {list.length === 0 ? <p className={`text-xs ${light ? 'text-slate-400' : 'text-slate-500'}`}>Sin clases</p> : (
              <ul className="space-y-2">
                {list.map((b) => {
                  const clash = clashIds?.has(`${b.ownerUid}/${b.id}`);
                  return (
                    <li key={`${b.ownerUid || ''}${b.id}`} className={`rounded-xl p-2.5 border ${clash ? 'border-amber-500/60 bg-amber-500/10' : light ? 'border-orange-200 bg-orange-50' : 'border-slate-700/80 bg-slate-950/60'}`}>
                      <p className={`text-[11px] font-mono ${light ? 'text-orange-700' : 'text-orange-300'}`}>{b.start}–{b.end}</p>
                      <p className={`text-sm font-semibold leading-snug ${light ? 'text-slate-900' : 'text-white'}`}>{b.area}</p>
                      <p className={`text-xs ${light ? 'text-slate-600' : 'text-slate-400'}`}>{showOwner ? `${b.aula} · ${b.ownerName}` : b.aula}</p>
                      {clash && <Badge className="mt-1 bg-amber-500/15 text-amber-200 border-amber-500/40">Cruce con otro docente</Badge>}
                      {(onEdit || onDelete) && (
                        <div className="flex gap-1 mt-1.5">
                          {onEdit && <button type="button" onClick={() => onEdit(b)} aria-label={`Editar ${b.area} del ${name} ${b.start}`} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 cursor-pointer"><Pencil className="w-4 h-4" /></button>}
                          {onDelete && <button type="button" onClick={() => onDelete(b)} aria-label={`Quitar ${b.area} del ${name} ${b.start}`} className="w-9 h-9 rounded-lg flex items-center justify-center text-rose-300 hover:bg-rose-500/10 cursor-pointer"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function BlockEditor({ ctx, block, mine, others, onClose, onSave }: {
  ctx: PanelCtx; block: ClassBlock; mine: ClassBlock[]; others: OwnedBlock[]; onClose: () => void; onSave: (b: ClassBlock) => void;
}) {
  const [b, setB] = useState<ClassBlock>(block);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof ClassBlock>(k: K, v: ClassBlock[K]) => setB((x) => ({ ...x, [k]: v }));
  const error = blockError(b, mine);
  const clash = !error ? others.find((o) => o.aula === b.aula && overlaps(o, b)) : undefined;
  const aulas = aulaOptions(ctx);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!error) onSave(b);
  };

  return (
    <Modal title={mine.some((x) => x.id === block.id) ? 'Editar clase' : 'Agregar clase'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={label} htmlFor="hb-day">Día</label>
            <select id="hb-day" value={b.day} onChange={(e) => set('day', Number(e.target.value) as Day)} className={input}>
              {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="hb-start">Hora de inicio</label>
            <input id="hb-start" type="time" value={b.start} onChange={(e) => set('start', e.target.value)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="hb-end">Hora de fin</label>
            <input id="hb-end" type="time" value={b.end} onChange={(e) => set('end', e.target.value)} className={input} />
          </div>
          <div className="col-span-2">
            <label className={label} htmlFor="hb-aula">Aula</label>
            <select id="hb-aula" value={b.aula} onChange={(e) => set('aula', e.target.value)} className={input}>
              {!aulas.includes(b.aula) && <option value={b.aula}>{b.aula || 'Elige el aula'}</option>}
              {aulas.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={label} htmlFor="hb-area">Área</label>
            <select id="hb-area" value={b.area} onChange={(e) => set('area', e.target.value)} className={input}>
              {ctx.myAreas.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        {tried && error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        {clash && <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">{clash.ownerName} ya tiene {clash.area} en {clash.aula} a esa hora ({clash.start}–{clash.end}). Puedes guardarlo igual; la dirección verá el cruce.</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btn.ghost}>Cancelar</button>
          <button type="submit" className={btn.primary}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}
