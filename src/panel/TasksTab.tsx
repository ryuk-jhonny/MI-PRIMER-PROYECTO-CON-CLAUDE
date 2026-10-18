import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, Eye, Plus, Trash2 } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { Task, TaskResponse } from '../lib/store';
import { friendlyError } from '../lib/firebase';
import { competenciasOf } from '../lib/cneb';
import { aulaOf, levelOf, LITERAL_STYLE, LITERALS } from '../lib/school';
import { Badge, btn, Card, Empty, input, label, Modal, PageHeader, textarea } from './ui';

export default function TasksTab({ ctx }: { ctx: PanelCtx }) {
  const { store, students, myAreas, me } = ctx;
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const load = async () => {
    try { setTasks(await store.listTasks()); } catch (err) { ctx.toast(friendlyError(err), 'error'); setTasks([]); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const aulaSize = useMemo(() => {
    const m = new Map<string, number>();
    students.forEach((s) => m.set(aulaOf(s), (m.get(aulaOf(s)) || 0) + 1));
    return m;
  }, [students]);

  const remove = async (t: Task) => {
    setDeleting(null);
    try { await store.deleteTask(t.id); setTasks((l) => (l || []).filter((x) => x.id !== t.id)); ctx.toast('Actividad eliminada.'); }
    catch (err) { ctx.toast(friendlyError(err), 'error'); }
  };

  return (
    <div className="space-y-6 stagger">
      <PageHeader
        title="Actividades"
        subtitle="Publica retos y tareas para un aula. Estudiantes y familias los ven en su cuenta y responden desde el celular."
        actions={myAreas.length && students.length ? <button type="button" onClick={() => setCreating(true)} className={btn.primary}><Plus className="w-4 h-4" /> Nueva actividad</button> : undefined}
      />

      {tasks === null ? <p className="text-sm text-slate-400">Cargando…</p> : tasks.length === 0 ? (
        <Empty icon={ClipboardList} title="Sin actividades todavía">{students.length ? 'Crea la primera: elige el aula, la competencia que trabajarás y la fecha de entrega.' : 'Primero la dirección debe matricular estudiantes.'}</Empty>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {tasks.map((t) => (
            <Card key={t.id} className="p-5 flex flex-col gap-3">
              <div>
                <p className="text-xs text-orange-300 font-semibold">{t.area} · {t.aula}</p>
                <h3 className="font-bold text-white mt-1">{t.title}</h3>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2 whitespace-pre-line">{t.instructions}</p>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> Entrega: {t.dueDate || 'sin fecha'} · {aulaSize.get(t.aula) || 0} estudiantes{t.ownerUid !== me.uid ? ` · ${t.ownerName}` : ''}</p>
              <div className="flex gap-2 mt-auto">
                <button type="button" onClick={() => setOpen(t)} className={btn.secondary}><Eye className="w-4 h-4" /> Ver respuestas</button>
                <button type="button" onClick={() => setDeleting(t)} className={btn.ghost} aria-label={`Eliminar ${t.title}`}><Trash2 className="w-4 h-4 text-rose-400" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {creating && <TaskForm ctx={ctx} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {open && <Responses ctx={ctx} task={open} onClose={() => setOpen(null)} />}
      {deleting && (
        <Modal title="¿Eliminar esta actividad?" onClose={() => setDeleting(null)}>
          <p className="text-sm text-slate-300">Se borran también las respuestas de los estudiantes.</p>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setDeleting(null)} className={btn.ghost}>Cancelar</button><button type="button" onClick={() => remove(deleting)} className={btn.danger}>Eliminar</button></div>
        </Modal>
      )}
    </div>
  );
}

function TaskForm({ ctx, onClose, onSaved }: { ctx: PanelCtx; onClose: () => void; onSaved: () => void }) {
  const { students, myAreas, me } = ctx;
  const aulas = [...new Set(students.map(aulaOf))].sort().filter((a) => !me.aulas?.length || me.aulas.includes(a));
  const [aula, setAula] = useState(aulas[0] || '');
  const level = levelOf(students.find((s) => aulaOf(s) === aula) || { gradeLevel: '' });
  const areas = myAreas.filter((a) => competenciasOf(a, level).length);
  const [area, setArea] = useState(areas[0] || '');
  const areaOk = areas.includes(area) ? area : areas[0] || '';
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await ctx.store.saveTask({ area: areaOk, aula, title: title.trim(), instructions: instructions.trim(), dueDate, competencia });
      ctx.toast('Actividad publicada. El aula ya la ve.');
      onSaved();
    } catch (err) { ctx.toast(friendlyError(err), 'error'); }
    setBusy(false);
  };

  return (
    <Modal title="Nueva actividad" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="tk-aula">Aula</label>
            <select id="tk-aula" value={aula} onChange={(e) => setAula(e.target.value)} className={input}>{aulas.map((a) => <option key={a}>{a}</option>)}</select>
          </div>
          <div>
            <label className={label} htmlFor="tk-area">Área</label>
            <select id="tk-area" value={areaOk} onChange={(e) => { setArea(e.target.value); setCompetencia(''); }} className={input} required>
              {areas.length ? areas.map((a) => <option key={a}>{a}</option>) : <option value="">No enseñas áreas de este nivel</option>}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="tk-comp">Competencia que trabaja</label>
            <select id="tk-comp" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className={input}>
              <option value="">— Opcional —</option>
              {competenciasOf(areaOk, level).map((c) => <option key={c.id} value={c.id}>C{c.n} · {c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="tk-title">Título</label>
            <input id="tk-title" required value={title} onChange={(e) => setTitle(e.target.value)} className={input} maxLength={140} />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="tk-ins">Indicaciones</label>
            <textarea id="tk-ins" required rows={5} value={instructions} onChange={(e) => setInstructions(e.target.value)} className={textarea} maxLength={3000} placeholder="Qué deben hacer, cómo presentarlo y con qué criterios lo evaluarás." />
          </div>
          <div>
            <label className={label} htmlFor="tk-due">Fecha de entrega</label>
            <input id="tk-due" type="date" value={dueDate} min={ctx.today} onChange={(e) => setDueDate(e.target.value)} className={input} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btn.ghost}>Cancelar</button>
          <button type="submit" disabled={busy || !areaOk || !aula} className={btn.primary}>Publicar</button>
        </div>
      </form>
    </Modal>
  );
}

function Responses({ ctx, task, onClose }: { ctx: PanelCtx; task: Task; onClose: () => void }) {
  const [list, setList] = useState<TaskResponse[] | null>(null);
  const [draft, setDraft] = useState<Record<string, { feedback: string; literal: string }>>({});
  const roster = ctx.students.filter((s) => aulaOf(s) === task.aula).sort((a, b) => a.fullName.localeCompare(b.fullName));

  useEffect(() => {
    ctx.store.listResponses(task.id).then(setList).catch((err) => { ctx.toast(friendlyError(err), 'error'); setList([]); });
  }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = new Map((list || []).map((r) => [r.studentId, r]));
  const review = async (sid: string) => {
    const d = draft[sid];
    if (!d) return;
    try {
      await ctx.store.reviewResponse(task.id, sid, d.feedback, d.literal);
      setList((l) => (l || []).map((r) => (r.studentId === sid ? { ...r, ...d, reviewedAt: new Date().toISOString() } : r)));
      setDraft((x) => { const n = { ...x }; delete n[sid]; return n; });
      ctx.toast('Retroalimentación enviada.');
    } catch (err) { ctx.toast(friendlyError(err), 'error'); }
  };

  return (
    <Modal title={task.title} onClose={onClose} wide>
      <p className="text-sm text-slate-400">{task.aula} · {list ? `${list.length} de ${roster.length} respondieron` : 'Cargando…'}</p>
      <ul className="space-y-3">
        {roster.map((s) => {
          const r = byId.get(s.id);
          const d = draft[s.id] || { feedback: r?.feedback || '', literal: r?.literal || '' };
          return (
            <li key={s.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{s.fullName}</p>
                {r ? <Badge className={r.reviewedAt ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-sky-500/15 text-sky-300 border-sky-500/30'}>{r.reviewedAt ? 'Revisado' : 'Entregado'}</Badge> : <Badge className="bg-slate-800 text-slate-400 border-slate-700">Pendiente</Badge>}
              </div>
              {r && (
                <>
                  <p className="mt-2 text-sm text-slate-200 whitespace-pre-line">{r.text}</p>
                  <div className="mt-3 grid sm:grid-cols-[90px_1fr_auto] gap-2">
                    <select value={d.literal} onChange={(e) => setDraft((x) => ({ ...x, [s.id]: { ...d, literal: e.target.value } }))} className={`h-11 rounded-xl border text-center font-bold bg-slate-950 ${LITERAL_STYLE[d.literal]}`} aria-label={`Nivel de logro de ${s.fullName}`}>
                      <option value="">—</option>{LITERALS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                    <input value={d.feedback} onChange={(e) => setDraft((x) => ({ ...x, [s.id]: { ...d, feedback: e.target.value } }))} placeholder="Retroalimentación" className={input} aria-label={`Retroalimentación para ${s.fullName}`} maxLength={600} />
                    <button type="button" disabled={!draft[s.id]} onClick={() => review(s.id)} className={btn.primary}>Enviar</button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
