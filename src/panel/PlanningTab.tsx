import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CheckCircle2, ClipboardCheck, Copy, FilePlus2, Grid3x3, ListOrdered, MessageSquareWarning, NotebookPen, Pencil, Plus, Printer, Send, Sparkles, Trash2, X } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { Plan, PlanStatus } from '../lib/store';
import { friendlyError } from '../lib/firebase';
import { areaInfo, cicloOf, competenciasOf, ENFOQUES_TRANSVERSALES, gradeNumber, INSTRUMENTOS, Level, LEVEL_LABEL } from '../lib/cneb';
import { aulaOf, periodNames } from '../lib/school';
import { Badge, btn, Card, Empty, input, label, Modal, PageHeader, textarea } from './ui';
import { withDetalle } from '../lib/planAi';
import { AiModal, cleanDetalle, DetalleEditor, DetalleView, RubricaEditor, UnitSessions, WordButton, wordInfo } from './PlanAi';
import { rubricaDesde, rubricaOf } from '../lib/planDoc';
import RubricGrade from './RubricGrade';

const STATUS_STYLE: Record<PlanStatus, string> = {
  Borrador: 'bg-slate-800 text-slate-300 border-slate-700',
  Enviado: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Observado: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Visado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export default function PlanningTab({ ctx }: { ctx: PanelCtx }) {
  const { store, isDirector, me } = ctx;
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [viewing, setViewing] = useState<Plan | null>(null);
  const [checklist, setChecklist] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const [asking, setAsking] = useState(false);
  const [sessionsOf, setSessionsOf] = useState<Plan | null>(null);
  const [rubricOf, setRubricOf] = useState<Plan | null>(null);
  const [grading, setGrading] = useState<Plan | null>(null);
  const [period, setPeriod] = useState('');
  const [owner, setOwner] = useState('');

  const load = async () => {
    try { setPlans(await store.listPlans()); } catch (err) { ctx.toast(friendlyError(err), 'error'); setPlans([]); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (p: Plan, msg: string) => {
    try {
      const saved = await store.savePlan(p);
      // Las sesiones de una unidad van en el mismo bimestre que ella.
      const moved = saved.kind === 'unidad' ? (plans || []).filter((x) => x.unidadId === saved.id && x.period !== saved.period) : [];
      const fixed = await Promise.all(moved.map((x) => store.savePlan({ ...x, period: saved.period })));
      const changed = new Map([saved, ...fixed].map((x) => [x.id, x]));
      setPlans((l) => [saved, ...(l || []).filter((x) => x.id !== saved.id).map((x) => changed.get(x.id) || x)]);
      ctx.toast(msg);
      return saved;
    } catch (err) { ctx.toast(friendlyError(err), 'error'); return null; }
  };

  const remove = async (p: Plan) => {
    setDeleting(null);
    try { await store.deletePlan(p.id); setPlans((l) => (l || []).filter((x) => x.id !== p.id)); ctx.toast('Documento eliminado.'); }
    catch (err) { ctx.toast(friendlyError(err), 'error'); }
  };

  const owners = useMemo(() => [...new Map((plans || []).map((p) => [p.ownerUid, p.ownerName])).entries()], [plans]);
  const list = (plans || []).filter((p) => !owner || p.ownerUid === owner);
  const canWrite = isDirector || me.role === 'docente';
  const allPeriods = [...new Set([...periodNames(ctx.config), ...list.map((p) => p.period)])].filter(Boolean);
  const unitIds = new Set(list.filter((p) => p.kind === 'unidad').map((p) => p.id));
  const byOrder = (a: Plan, b: Plan) => (a.detalle?.numero || 0) - (b.detalle?.numero || 0) || a.date.localeCompare(b.date) || a.title.localeCompare(b.title);
  const sessionsOfUnit = (u: Plan) => list.filter((x) => x.kind === 'sesion' && x.unidadId === u.id).sort(byOrder);
  const groups = allPeriods.filter((per) => !period || per === period).map((per) => ({
    per,
    units: list.filter((x) => x.kind === 'unidad' && x.period === per).sort(byOrder),
    loose: list.filter((x) => x.kind === 'sesion' && x.period === per && !(x.unidadId && unitIds.has(x.unidadId))).sort(byOrder),
  })).filter((g) => g.units.length || g.loose.length);
  const sessionIn = (u: Plan): Plan => ({ ...newPlan(ctx, 'sesion'), area: u.area, level: u.level, grade: u.grade, section: u.section, period: u.period, unidadId: u.id });

  // Tarjeta de una unidad o sesión (una función, no un componente, para no volver a montarla en cada cambio).
  const planCard = (p: Plan, nested = false, children?: ReactNode) => {
    const mine = p.ownerUid === me.uid;
    return (
      <Card key={p.id} className={`${nested ? 'p-3.5 bg-slate-950/60' : 'p-5'} flex flex-col gap-3`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-orange-300 font-semibold">{p.kind === 'unidad' ? 'Unidad de aprendizaje' : 'Sesión de aprendizaje'} · {p.area}</p>
            <h3 className="font-bold text-white leading-snug mt-1">{p.title || 'Sin título'}</h3>
            <p className="text-xs text-slate-400 mt-1">{p.grade}{p.section ? ` ${p.section}` : ''} · {p.period}{isDirector ? ` · ${p.ownerName}` : ''}</p>
          </div>
          <Badge className={STATUS_STYLE[p.status]}>{p.status}</Badge>
        </div>
        {p.observacion && p.status === 'Observado' && <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">Observación: {p.observacion}</p>}
        <div className="flex flex-wrap gap-1.5">{p.competencias.map((id) => <span key={id} className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-300">{id.replace('c', 'C')}</span>)}</div>
        <div className="flex flex-wrap gap-2 mt-auto pt-2">
          <button type="button" onClick={() => setViewing(p)} className={btn.secondary}><Printer className="w-4 h-4" /> Ver</button>
          {p.detalle && <WordButton ctx={ctx} plan={p} />}
          {p.kind === 'unidad' && p.detalle?.tipo === 'unidad' && mine && <button type="button" onClick={() => setSessionsOf(p)} className={btn.secondary}><ListOrdered className="w-4 h-4" /> Generar sesiones</button>}
          {p.kind === 'sesion' && <button type="button" onClick={() => setRubricOf(p)} className={btn.secondary}><Grid3x3 className="w-4 h-4" /> Rúbrica</button>}
          {p.kind === 'sesion' && mine && <button type="button" onClick={() => setGrading(p)} className={btn.secondary}><BookOpenCheck className="w-4 h-4" /> Calificar</button>}
          {p.kind === 'sesion' && p.instrumento === 'Lista de cotejo' && <button type="button" onClick={() => setChecklist(p)} className={btn.secondary}><ClipboardCheck className="w-4 h-4" /> Lista de cotejo</button>}
          {mine && <button type="button" onClick={() => setEditing(p)} className={btn.ghost} aria-label="Editar"><Pencil className="w-4 h-4" /></button>}
          {mine && <button type="button" onClick={() => setEditing({ ...p, id: '', title: `${p.title} (copia)`, status: 'Borrador', observacion: '' })} className={btn.ghost} aria-label="Duplicar"><Copy className="w-4 h-4" /></button>}
          {mine && (p.status === 'Borrador' || p.status === 'Observado') && !isDirector && (
            <button type="button" onClick={() => save({ ...p, status: 'Enviado' }, 'Enviado a la dirección para su revisión.')} className={btn.ghost}><Send className="w-4 h-4" /> Enviar</button>
          )}
          {isDirector && !mine && p.status !== 'Visado' && (
            <button type="button" onClick={() => save({ ...p, status: 'Visado', observacion: '' }, `Visaste "${p.title}".`)} className={btn.ghost}><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Visar</button>
          )}
          {isDirector && !mine && <ObserveButton onObserve={(text) => save({ ...p, status: 'Observado', observacion: text }, 'Observación enviada al docente.')} />}
          {(mine || isDirector) && <button type="button" onClick={() => setDeleting(p)} className={btn.ghost} aria-label="Eliminar"><Trash2 className="w-4 h-4 text-rose-400" /></button>}
        </div>
        {children}
      </Card>
    );
  };

  return (
    <div className="space-y-6 stagger">
      <PageHeader
        title={isDirector ? 'Planificación docente' : 'Mi planificación'}
        subtitle={isDirector ? 'Revisa y visa las unidades y sesiones de tu plana docente.' : 'Unidades y sesiones de aprendizaje con las competencias del CNEB de tus áreas.'}
        actions={canWrite && ctx.myAreas.length ? (
          <>
            <button type="button" onClick={() => setAsking(true)} className={btn.primary}><Sparkles className="w-4 h-4" /> Generar con IA</button>
            <button type="button" onClick={() => setEditing(newPlan(ctx, 'sesion'))} className={btn.secondary}><FilePlus2 className="w-4 h-4" /> Nueva sesión</button>
            <button type="button" onClick={() => setEditing(newPlan(ctx, 'unidad'))} className={btn.secondary}><FilePlus2 className="w-4 h-4" /> Nueva unidad</button>
          </>
        ) : undefined}
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className={`${input} sm:w-64`} aria-label="Bimestre">
          <option value="">{ctx.config.periodType === 'trimestral' ? 'Todos los trimestres' : 'Todos los bimestres'}</option>
          {allPeriods.map((x) => <option key={x}>{x}</option>)}
        </select>
        {isDirector && owners.length > 0 && (
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className={`${input} sm:w-64 sm:ml-auto`} aria-label="Filtrar por docente">
            <option value="">Todos los docentes</option>
            {owners.map(([uid, name]) => <option key={uid} value={uid}>{name}</option>)}
          </select>
        )}
      </div>

      {plans === null ? <p className="text-sm text-slate-400">Cargando…</p> : list.length === 0 ? (
        <Empty icon={NotebookPen} title={isDirector ? 'Aún no hay documentos enviados' : 'Crea tu primera sesión'}>
          {isDirector ? 'Cuando tus docentes planifiquen, verás aquí sus unidades y sesiones para revisarlas.' : 'Elige competencias y capacidades de tu área, escribe los criterios y Ryuk arma el documento listo para imprimir y la lista de cotejo.'}
        </Empty>
      ) : (
        <div className="space-y-8">
          {groups.length === 0 && <p className="text-sm text-slate-400">No hay unidades ni sesiones en {period}.</p>}
          {groups.map((g) => (
            <section key={g.per} aria-label={g.per} className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">{g.per} <span className="text-xs font-semibold text-slate-400">{g.units.length === 1 ? '1 unidad' : `${g.units.length} unidades`}</span></h2>
              <div className="grid lg:grid-cols-2 gap-4">
                {g.units.map((u) => {
                  const ses = sessionsOfUnit(u);
                  return planCard(u, false, (
                    <div className="mt-1 space-y-2 border-l-2 border-orange-500/30 pl-3">
                      <p className="text-xs font-semibold text-slate-400">{ses.length === 0 ? 'Aún no tiene sesiones' : ses.length === 1 ? '1 sesión' : `${ses.length} sesiones`}</p>
                      {ses.map((x) => planCard(x, true))}
                      {u.ownerUid === me.uid && <button type="button" onClick={() => setEditing(sessionIn(u))} className={btn.ghost}><Plus className="w-4 h-4" /> Nueva sesión en esta unidad</button>}
                    </div>
                  ));
                })}
              </div>
              {g.loose.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-300">Sesiones sin unidad</h3>
                  <div className="grid md:grid-cols-2 gap-4">{g.loose.map((x) => planCard(x))}</div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {editing && <PlanEditor ctx={ctx} plan={editing} units={(plans || []).filter((x) => x.kind === 'unidad' && x.ownerUid === (editing.ownerUid || me.uid))} onClose={() => setEditing(null)} onSave={async (p) => { const ok = await save(p, 'Documento guardado.'); if (ok) setEditing(null); }} />}
      {viewing && <PlanDocument ctx={ctx} plan={viewing} onClose={() => setViewing(null)} />}
      {checklist && <Checklist ctx={ctx} plan={checklist} onClose={() => setChecklist(null)} />}
      {grading && <RubricGrade ctx={ctx} plan={grading} plans={plans || []} onClose={() => setGrading(null)} />}
      {rubricOf && <RubricaSheet ctx={ctx} plan={rubricOf} unit={(plans || []).find((x) => x.id === rubricOf.unidadId)} onClose={() => setRubricOf(null)} />}
      {asking && <AiModal ctx={ctx} makePlan={(k) => newPlan(ctx, k)} onClose={() => setAsking(false)} onDone={(p) => { setAsking(false); setEditing(p); }} />}
      {sessionsOf && <UnitSessions ctx={ctx} unit={sessionsOf} plans={plans || []} makePlan={(k) => newPlan(ctx, k)} onClose={() => setSessionsOf(null)} onOpen={(p) => { setSessionsOf(null); setEditing(p); }} />}
      {deleting && (
        <Modal title="¿Eliminar este documento?" onClose={() => setDeleting(null)}>
          <p className="text-sm text-slate-300">“{deleting.title}” se borra para siempre.{deleting.kind === 'unidad' && (plans || []).some((x) => x.unidadId === deleting.id) ? ' Sus sesiones se conservan como sesiones sin unidad.' : ''}</p>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setDeleting(null)} className={btn.ghost}>Cancelar</button><button type="button" onClick={() => remove(deleting)} className={btn.danger}>Eliminar</button></div>
        </Modal>
      )}
    </div>
  );
}

function ObserveButton({ onObserve }: { onObserve: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btn.ghost}><MessageSquareWarning className="w-4 h-4 text-amber-400" /> Observar</button>
      {open && (
        <Modal title="Observación para el docente" onClose={() => setOpen(false)}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className={textarea} placeholder="Ej.: Precisa los criterios de evaluación para el desempeño 2." aria-label="Observación" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={btn.ghost}>Cancelar</button>
            <button type="button" disabled={!text.trim()} onClick={() => { onObserve(text.trim()); setOpen(false); }} className={btn.primary}>Enviar observación</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function newPlan(ctx: PanelCtx, kind: Plan['kind']): Plan {
  const level = ((ctx.me.levels?.length ? ctx.me.levels : ctx.config.activeLevels)[0] || 'primaria') as Level;
  const area = ctx.myAreas.find((a) => competenciasOf(a, level).length) || ctx.myAreas[0] || '';
  const grade = ctx.config.gradeConfigs.find((g) => g.enabled && g.level === level)?.gradeName || '';
  const info = areaInfo(area);
  return {
    id: '', kind, ownerUid: ctx.me.uid, ownerName: ctx.me.fullName, area, level, grade, section: '', title: '', period: ctx.config.activePeriod,
    date: ctx.today, duration: kind === 'sesion' ? '90 minutos' : '4 semanas', situacion: '', proposito: '', competencias: [], capacidades: [],
    desempenos: '', criterios: '', evidencia: '', instrumento: info?.instrumentos[0] || 'Lista de cotejo', enfoques: [], inicio: '', desarrollo: '', cierre: '',
    materiales: '', status: 'Borrador', observacion: '', updatedAt: '',
  };
}

function PlanEditor({ ctx, plan, units, onClose, onSave }: { ctx: PanelCtx; plan: Plan; units: Plan[]; onClose: () => void; onSave: (p: Plan) => void }) {
  const { config, myAreas } = ctx;
  const [p, setP] = useState<Plan>(plan);
  const set = <K extends keyof Plan>(k: K, v: Plan[K]) => setP((x) => ({ ...x, [k]: v }));
  const levels = ((ctx.me.levels?.length ? ctx.me.levels : config.activeLevels) as Level[]).filter((l) => competenciasOf(p.area, l).length);
  const grades = config.gradeConfigs.filter((g) => g.enabled && g.level === p.level);
  const sections = grades.find((g) => g.gradeName === p.grade)?.sections || [];
  const comps = competenciasOf(p.area, p.level);
  const ciclo = cicloOf(gradeNumber(p.grade), p.level);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const changeArea = (area: string) => {
    const lv = competenciasOf(area, p.level).length ? p.level : (((ctx.me.levels?.length ? ctx.me.levels : config.activeLevels) as Level[]).find((l) => competenciasOf(area, l).length) || p.level);
    setP((x) => ({ ...x, area, level: lv, competencias: [], capacidades: [], instrumento: areaInfo(area)?.instrumentos[0] || x.instrumento }));
  };

  const unit = units.find((u) => u.id === p.unidadId);
  // Una sesión dentro de una unidad toma su bimestre, área, grado y sección.
  const pickUnit = (id: string) => {
    const u = units.find((x) => x.id === id);
    setP((x) => (u ? { ...x, unidadId: u.id, period: u.period, area: u.area, level: u.level, grade: u.grade, section: u.section } : { ...x, unidadId: undefined }));
  };
  const criteriosList = p.criterios.split('\n').map((c) => c.trim()).filter(Boolean);
  const fromCriterios = () => {
    const have = new Set((p.rubrica || []).map((r) => r.criterio.trim().toLowerCase()));
    set('rubrica', [...(p.rubrica || []), ...criteriosList.filter((c) => !have.has(c.replace(/\.$/, '').toLowerCase())).map(rubricaDesde)]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (p.detalle) { onSave(withDetalle({ ...p, title: p.title.trim() }, cleanDetalle(p.detalle, p.duration))); return; }
    const rubrica = (p.rubrica || []).filter((r) => r.criterio.trim());
    onSave({ ...p, title: p.title.trim(), competencias: p.competencias.filter((c) => comps.some((x) => x.id === c)), rubrica: p.kind === 'sesion' ? rubrica : undefined });
  };

  const txt = (k: keyof Plan, title: string, rows = 3, placeholder = '') => (
    <div>
      <label className={label} htmlFor={`pl-${k}`}>{title}</label>
      <textarea id={`pl-${k}`} rows={rows} value={p[k] as string} onChange={(e) => set(k, e.target.value as never)} className={textarea} placeholder={placeholder} />
    </div>
  );

  return (
    <Modal title={p.kind === 'unidad' ? 'Unidad de aprendizaje' : 'Sesión de aprendizaje'} onClose={onClose} wide={!p.detalle} xl={!!p.detalle}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="pl-title">Título</label>
            <input id="pl-title" required value={p.title} onChange={(e) => set('title', e.target.value)} className={input} placeholder={p.kind === 'unidad' ? 'Ej.: Cuidamos nuestra salud y la de nuestra comunidad' : 'Ej.: Resolvemos problemas de fracciones en el mercado'} />
          </div>
          {p.kind === 'sesion' && (
            <div className="sm:col-span-2">
              <label className={label} htmlFor="pl-unit">Unidad</label>
              <select id="pl-unit" value={p.unidadId || ''} onChange={(e) => pickUnit(e.target.value)} className={input}>
                <option value="">Sin unidad</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.period} · {u.title || 'Unidad sin título'}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={label} htmlFor="pl-area">Área</label>
            <select id="pl-area" value={p.area} onChange={(e) => changeArea(e.target.value)} className={input}>{myAreas.map((a) => <option key={a}>{a}</option>)}</select>
          </div>
          <div>
            <label className={label} htmlFor="pl-level">Nivel</label>
            <select id="pl-level" value={p.level} onChange={(e) => { const lv = e.target.value as Level; setP((x) => ({ ...x, level: lv, grade: config.gradeConfigs.find((g) => g.enabled && g.level === lv)?.gradeName || '', section: '', competencias: [], capacidades: [] })); }} className={input}>
              {levels.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="pl-grade">Grado <span className="font-normal text-slate-500">(ciclo {ciclo})</span></label>
            <select id="pl-grade" value={p.grade} onChange={(e) => setP((x) => ({ ...x, grade: e.target.value, section: '' }))} className={input}>{grades.map((g) => <option key={g.gradeId}>{g.gradeName}</option>)}</select>
          </div>
          <div>
            <label className={label} htmlFor="pl-section">Sección</label>
            <select id="pl-section" value={p.section} onChange={(e) => set('section', e.target.value)} className={input}>
              <option value="">Todas</option>{sections.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="pl-period">Periodo</label>
            <select id="pl-period" value={p.period} disabled={!!unit} title={unit ? 'Va en el mismo periodo que su unidad' : undefined} onChange={(e) => set('period', e.target.value)} className={input}>
              {!periodNames(config).includes(p.period) && <option>{p.period}</option>}
              {periodNames(config).map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="pl-date">{p.kind === 'unidad' ? 'Inicio' : 'Fecha'}</label>
              <input id="pl-date" type="date" value={p.date} onChange={(e) => set('date', e.target.value)} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="pl-dur">Duración</label>
              <input id="pl-dur" value={p.duration} onChange={(e) => set('duration', e.target.value)} className={input} />
            </div>
          </div>
        </div>

        {p.detalle ? (
          <>
            <p className="flex gap-2 text-xs text-orange-200 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3"><Sparkles className="w-4 h-4 shrink-0" /> Revisa y corrige lo que armó la IA antes de guardar. Todo se puede editar.</p>
            <DetalleEditor value={p.detalle} onChange={(d) => set('detalle', d)} />
          </>
        ) : (<>
        {p.kind === 'unidad'
          ? txt('situacion', 'Situación significativa', 4, 'Describe el reto o problema del contexto que movilizará las competencias.')
          : txt('proposito', 'Propósito de la sesión', 2, 'Hoy aprenderemos a…')}

        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-white">Competencias y capacidades</legend>
          {comps.map((c) => {
            const on = p.competencias.includes(c.id);
            return (
              <div key={c.id} className={`rounded-xl border p-3 ${on ? 'border-orange-500/60 bg-orange-500/5' : 'border-slate-800 bg-slate-950'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={on} onChange={() => set('competencias', toggle(p.competencias, c.id))} className="mt-1 w-4 h-4 accent-orange-600" />
                  <span className="text-sm font-semibold text-white">C{c.n} · {c.name}</span>
                </label>
                {on && (
                  <div className="mt-2 pl-7 space-y-1.5">
                    {c.capacidades.map((cap) => (
                      <label key={cap} className="flex items-start gap-2.5 text-sm text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={p.capacidades.includes(cap)} onChange={() => set('capacidades', toggle(p.capacidades, cap))} className="mt-0.5 w-4 h-4 accent-orange-600" />
                        {cap}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </fieldset>

        {txt('desempenos', 'Desempeños (precisados)', 3)}
        {txt('criterios', 'Criterios de evaluación (uno por línea)', 4, 'Identifica…\nExplica…\nPropone…')}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="pl-evid">Evidencia de aprendizaje</label>
            <input id="pl-evid" list="pl-evid-list" value={p.evidencia} onChange={(e) => set('evidencia', e.target.value)} className={input} />
            <datalist id="pl-evid-list">{areaInfo(p.area)?.evidencias.map((e) => <option key={e} value={e} />)}</datalist>
          </div>
          <div>
            <label className={label} htmlFor="pl-inst">Instrumento de evaluación</label>
            <select id="pl-inst" value={p.instrumento} onChange={(e) => set('instrumento', e.target.value)} className={input}>{INSTRUMENTOS.map((i) => <option key={i}>{i}</option>)}</select>
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-bold text-white mb-2">Enfoques transversales</legend>
          <div className="flex flex-wrap gap-2">
            {ENFOQUES_TRANSVERSALES.map((e) => {
              const on = p.enfoques.includes(e);
              return <button key={e} type="button" aria-pressed={on} onClick={() => set('enfoques', toggle(p.enfoques, e))} className={`h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer border ${on ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`}>{e.replace('Enfoque ', '')}</button>;
            })}
          </div>
        </fieldset>

        {p.kind === 'sesion' && (
          <div className="space-y-2">
            <RubricaEditor items={p.rubrica || []} onChange={(v) => set('rubrica', v)} competencias={comps.filter((c) => p.competencias.includes(c.id)).map((c) => c.name)} />
            {criteriosList.length > 0 && <button type="button" onClick={fromCriterios} className={btn.secondary}><Grid3x3 className="w-4 h-4" /> Armar la rúbrica con mis criterios</button>}
          </div>
        )}

        {p.kind === 'sesion' && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-white">Secuencia didáctica</p>
            {txt('inicio', 'Inicio', 3, 'Motivación, saberes previos, conflicto cognitivo y propósito.')}
            {txt('desarrollo', 'Desarrollo', 5, 'Actividades para movilizar las capacidades.')}
            {txt('cierre', 'Cierre', 3, 'Metacognición y evaluación.')}
          </div>
        )}
        {txt('materiales', 'Materiales y recursos', 2)}
        </>)}

        <div className="flex justify-end gap-2 pt-1 sticky bottom-0 bg-slate-900 py-3 -mb-3">
          <button type="button" onClick={onClose} className={btn.ghost}>Cancelar</button>
          <button type="submit" className={btn.primary}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

function PrintFrame({ title, onClose, children, actions }: { title: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 print:bg-white" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-w-3xl mx-auto p-3 sm:p-6">
        <div className="flex justify-end gap-2 mb-3 print:hidden">
          {actions}
          <button type="button" onClick={() => window.print()} className={btn.primary}><Printer className="w-4 h-4" /> Imprimir o guardar PDF</button>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-11 h-11 rounded-xl bg-slate-800 text-white flex items-center justify-center cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <article className="print-area bg-white text-slate-900 rounded-2xl p-5 sm:p-10 text-[13px] leading-relaxed">{children}</article>
      </div>
    </div>
  );
}

function PlanDocument({ ctx, plan: p, onClose }: { ctx: PanelCtx; plan: Plan; onClose: () => void }) {
  const comps = competenciasOf(p.area, p.level).filter((c) => p.competencias.includes(c.id));
  if (p.detalle) {
    return (
      <PrintFrame title={p.title} onClose={onClose} actions={<WordButton ctx={ctx} plan={p} />}>
        <DetalleView plan={p} info={wordInfo(ctx, p)} />
      </PrintFrame>
    );
  }
  const row = (k: string, v: string) => v ? <div className="grid grid-cols-[150px_1fr] gap-3 py-1.5 border-b border-slate-200"><span className="font-semibold text-slate-600">{k}</span><span className="whitespace-pre-line">{v}</span></div> : null;
  return (
    <PrintFrame title={p.title} onClose={onClose}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">{p.kind === 'unidad' ? 'Unidad de aprendizaje' : 'Sesión de aprendizaje'} · {ctx.config.academicYear}</p>
      <h1 className="text-xl font-bold mt-1">{p.title}</h1>
      <p className="text-xs text-slate-600 mt-0.5">{ctx.config.institutionName}</p>
      <section className="mt-4">
        {row('Docente', p.ownerName)}
        {row('Área', p.area)}
        {row('Grado y sección', `${p.grade}${p.section ? ` ${p.section}` : ''} · ${LEVEL_LABEL[p.level]} · Ciclo ${cicloOf(gradeNumber(p.grade), p.level)}`)}
        {row('Periodo', p.period)}
        {row(p.kind === 'unidad' ? 'Inicio' : 'Fecha', p.date)}
        {row('Duración', p.duration)}
        {row('Situación significativa', p.situacion)}
        {row('Propósito', p.proposito)}
      </section>
      <table className="w-full mt-5 border-collapse text-xs">
        <thead><tr className="bg-slate-100"><th className="text-left p-2 border border-slate-300">Competencia</th><th className="text-left p-2 border border-slate-300">Capacidades</th></tr></thead>
        <tbody>
          {comps.map((c) => (
            <tr key={c.id}>
              <td className="p-2 border border-slate-300 align-top font-semibold">C{c.n}. {c.name}</td>
              <td className="p-2 border border-slate-300"><ul className="list-disc pl-4">{c.capacidades.filter((cap) => p.capacidades.includes(cap)).map((cap) => <li key={cap}>{cap}</li>)}</ul></td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="mt-4">
        {row('Desempeños', p.desempenos)}
        {row('Criterios', p.criterios)}
        {row('Evidencia', p.evidencia)}
        {row('Instrumento', p.instrumento)}
        {row('Enfoques', p.enfoques.join(' · '))}
        {row('Inicio', p.inicio)}
        {row('Desarrollo', p.desarrollo)}
        {row('Cierre', p.cierre)}
        {row('Materiales', p.materiales)}
      </section>
      {p.kind === 'sesion' && rubricaOf(p).length > 0 && (
        <table className="w-full mt-5 border-collapse text-xs">
          <thead><tr className="bg-slate-100">{['Criterio', 'Destacado (4)', 'Esperado (3)', 'En proceso (2)', 'En inicio (1)'].map((h) => <th key={h} className="text-left p-2 border border-slate-300">{h}</th>)}</tr></thead>
          <tbody>{rubricaOf(p).map((r, i) => <tr key={i}>{[r.criterio, r.destacado, r.esperado, r.proceso, r.inicio].map((v, j) => <td key={j} className="p-2 border border-slate-300 align-top">{v}</td>)}</tr>)}</tbody>
        </table>
      )}
      <footer className="mt-14 grid grid-cols-2 gap-10 text-center text-xs">
        <div className="border-t border-slate-500 pt-1.5">{p.ownerName}<span className="block text-slate-500">Docente</span></div>
        <div className="border-t border-slate-500 pt-1.5">{p.status === 'Visado' ? 'Visado por la dirección' : 'V.° B.° Dirección'}</div>
      </footer>
    </PrintFrame>
  );
}

function Checklist({ ctx, plan: p, onClose }: { ctx: PanelCtx; plan: Plan; onClose: () => void }) {
  const aulas = [...new Set(ctx.students.filter((s) => s.gradeLevel === p.grade && (!p.section || s.section === p.section)).map(aulaOf))].sort();
  const [aula, setAula] = useState(aulas[0] || '');
  const list = ctx.students.filter((s) => aulaOf(s) === aula).sort((a, b) => a.fullName.localeCompare(b.fullName));
  const criterios = p.criterios.split('\n').map((c) => c.trim()).filter(Boolean);
  return (
    <PrintFrame title="Lista de cotejo" onClose={onClose}>
      <div className="print:hidden mb-4">
        <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ck-aula">Aula</label>
        <select id="ck-aula" value={aula} onChange={(e) => setAula(e.target.value)} className="h-10 px-3 rounded-lg border border-slate-300">
          {aulas.length ? aulas.map((a) => <option key={a}>{a}</option>) : <option value="">Sin estudiantes en {p.grade}</option>}
        </select>
      </div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">{p.instrumento} · {p.area}</p>
      <h1 className="text-lg font-bold mt-1">{p.title}</h1>
      <p className="text-xs text-slate-600">{aula} · {p.ownerName} · {p.date}</p>
      {criterios.length === 0 ? <p className="mt-4 text-sm text-slate-500">Escribe los criterios de evaluación en la sesión para generar la lista.</p> : (
        <table className="w-full mt-4 border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-1.5 border border-slate-300 w-6">N.°</th>
              <th className="text-left p-1.5 border border-slate-300">Estudiante</th>
              {criterios.map((c, i) => <th key={i} className="p-1.5 border border-slate-300 font-semibold align-bottom" title={c}>{i + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map((s, i) => (
              <tr key={s.id}>
                <td className="p-1.5 border border-slate-300 text-center">{i + 1}</td>
                <td className="p-1.5 border border-slate-300">{s.fullName}</td>
                {criterios.map((_, j) => <td key={j} className="p-1.5 border border-slate-300 w-10 text-center">Sí / No</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {criterios.length > 0 && <ol className="mt-4 list-decimal pl-5 text-xs space-y-0.5">{criterios.map((c, i) => <li key={i}>{c}</li>)}</ol>}
    </PrintFrame>
  );
}

function RubricaSheet({ ctx, plan: p, unit, onClose }: { ctx: PanelCtx; plan: Plan; unit?: Plan; onClose: () => void }) {
  const aulas = [...new Set(ctx.students.filter((s) => s.gradeLevel === p.grade && (!p.section || s.section === p.section)).map(aulaOf))].sort();
  const [aula, setAula] = useState(aulas[0] || '');
  const list = ctx.students.filter((s) => aulaOf(s) === aula).sort((a, b) => a.fullName.localeCompare(b.fullName));
  const rows = rubricaOf(p);
  const th = 'p-1.5 border border-slate-300 font-semibold text-left align-bottom';
  const td = 'p-1.5 border border-slate-300 align-top';
  return (
    <PrintFrame title="Rúbrica de evaluación" onClose={onClose}>
      <div className="print:hidden mb-4">
        <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rb-aula">Aula</label>
        <select id="rb-aula" value={aula} onChange={(e) => setAula(e.target.value)} className="h-10 px-3 rounded-lg border border-slate-300">
          {aulas.length ? aulas.map((a) => <option key={a}>{a}</option>) : <option value="">Sin estudiantes en {p.grade}</option>}
        </select>
      </div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Rúbrica de evaluación · {p.area} · {p.period}</p>
      <h1 className="text-lg font-bold mt-1">{p.title}</h1>
      <p className="text-xs text-slate-600">{unit ? `${unit.title} · ` : ''}{aula} · {p.ownerName} · {p.date}</p>
      {rows.length === 0 ? <p className="mt-4 text-sm text-slate-500">Escribe los criterios o la rúbrica en la sesión para generarla.</p> : (
        <>
          <table className="w-full mt-4 border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                <th className={th}>Criterio</th><th className={th}>Logro destacado (4)</th><th className={th}>Logro esperado (3)</th><th className={th}>En proceso (2)</th><th className={th}>En inicio (1)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}><td className={`${td} font-semibold`}>{i + 1}. {r.criterio}</td><td className={td}>{r.destacado}</td><td className={td}>{r.esperado}</td><td className={td}>{r.proceso}</td><td className={td}>{r.inicio}</td></tr>
              ))}
            </tbody>
          </table>
          <h2 className="mt-6 text-sm font-bold">Registro de {aula || 'la sección'}</h2>
          <table className="w-full mt-2 border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-1.5 border border-slate-300 w-6">N.°</th>
                <th className={th}>Estudiante</th>
                {rows.map((r, i) => <th key={i} className="p-1.5 border border-slate-300 font-semibold w-12 text-center" title={r.criterio}>C{i + 1}</th>)}
                <th className="p-1.5 border border-slate-300 font-semibold w-16 text-center">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s, i) => (
                <tr key={s.id}>
                  <td className="p-1.5 border border-slate-300 text-center">{i + 1}</td>
                  <td className="p-1.5 border border-slate-300">{s.fullName}</td>
                  {rows.map((_, j) => <td key={j} className="p-1.5 border border-slate-300" />)}
                  <td className="p-1.5 border border-slate-300" />
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-slate-500">Escribe en cada criterio 4, 3, 2 o 1 según la rúbrica. Nivel: AD (destacado), A (esperado), B (en proceso), C (en inicio).</p>
        </>
      )}
    </PrintFrame>
  );
}
