// Planificación con IA: pedir una unidad o sesión, editar el documento completo,
// verlo con el formato del docente y generar las sesiones de una unidad.
import { FormEvent, ReactNode, useState } from 'react';
import { FileDown, Loader2, Plus, ShieldCheck, Sparkles, Trash2, Wand2 } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { competenciasOf, cicloOf, gradeNumber, Level, LEVEL_LABEL } from '../lib/cneb';
import { AiRequest, generateWithAi, withDetalle } from '../lib/planAi';
import { longDate, minutesOf, normalizeSesion, normalizeUnidad, PlanDoc, PropositoFila, RubricaFila, SesionDoc, UnidadDoc } from '../lib/planDoc';
import type { Plan } from '../lib/store';
import type { WordInfo } from '../lib/planWord';
import { btn, input, label, Modal, textarea } from './ui';

type MakePlan = (kind: Plan['kind']) => Plan;

// ---------------------------------------------------------------------
// Pedir a la IA

export function AiModal({ ctx, makePlan, onClose, onDone }: { ctx: PanelCtx; makePlan: MakePlan; onClose: () => void; onDone: (p: Plan) => void }) {
  const first = makePlan('unidad');
  const [kind, setKind] = useState<Plan['kind']>('unidad');
  const [area, setArea] = useState(first.area);
  const [level, setLevel] = useState<Level>(first.level);
  const [grade, setGrade] = useState(first.grade);
  const [section, setSection] = useState('');
  const [numero, setNumero] = useState(1);
  const [tema, setTema] = useState('');
  const [duracion, setDuracion] = useState('4 semanas');
  const [sesiones, setSesiones] = useState(6);
  const [notas, setNotas] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const levels = ((ctx.me.levels?.length ? ctx.me.levels : ctx.config.activeLevels) as Level[]).filter((l) => competenciasOf(area, l).length);
  const grades = ctx.config.gradeConfigs.filter((g) => g.enabled && g.level === level);
  const sections = grades.find((g) => g.gradeName === grade)?.sections || [];

  const changeArea = (a: string) => {
    setArea(a);
    if (!competenciasOf(a, level).length) {
      const lv = ((ctx.me.levels?.length ? ctx.me.levels : ctx.config.activeLevels) as Level[]).find((l) => competenciasOf(a, l).length);
      if (lv) { setLevel(lv); setGrade(ctx.config.gradeConfigs.find((g) => g.enabled && g.level === lv)?.gradeName || ''); setSection(''); }
    }
  };
  const changeKind = (k: Plan['kind']) => { setKind(k); setDuracion(k === 'unidad' ? '4 semanas' : '90 minutos'); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const req: AiRequest = { kind, area, level, grade, tema: tema.trim(), duracion: duracion.trim(), numero, notas: notas.trim(), ...(kind === 'unidad' ? { sesiones } : {}) };
      const res = await generateWithAi(req);
      const base = makePlan(kind);
      onDone(withDetalle({ ...base, area, level, grade, section, duration: duracion.trim(), title: res.titulo }, res.doc));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La IA no respondió esta vez.');
      setBusy(false);
    }
  };

  return (
    <Modal title="Planificar con IA" onClose={busy ? () => undefined : onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2" role="radiogroup" aria-label="Qué quieres generar">
          {(['unidad', 'sesion'] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => changeKind(k)} className={`h-10 px-4 rounded-xl text-sm font-semibold cursor-pointer ${kind === k ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              {k === 'unidad' ? 'Unidad de aprendizaje' : 'Sesión suelta'}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="ai-area">Área</label>
            <select id="ai-area" value={area} onChange={(e) => changeArea(e.target.value)} className={input}>{ctx.myAreas.map((a) => <option key={a}>{a}</option>)}</select>
          </div>
          <div>
            <label className={label} htmlFor="ai-level">Nivel</label>
            <select id="ai-level" value={level} onChange={(e) => { const lv = e.target.value as Level; setLevel(lv); setGrade(ctx.config.gradeConfigs.find((g) => g.enabled && g.level === lv)?.gradeName || ''); setSection(''); }} className={input}>
              {levels.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="ai-grade">Grado <span className="font-normal text-slate-500">(ciclo {cicloOf(gradeNumber(grade), level)})</span></label>
            <select id="ai-grade" value={grade} onChange={(e) => { setGrade(e.target.value); setSection(''); }} className={input}>{grades.map((g) => <option key={g.gradeId}>{g.gradeName}</option>)}</select>
          </div>
          <div>
            <label className={label} htmlFor="ai-section">Sección</label>
            <select id="ai-section" value={section} onChange={(e) => setSection(e.target.value)} className={input}><option value="">Todas</option>{sections.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="ai-tema">Tema</label>
            <input id="ai-tema" required maxLength={300} value={tema} onChange={(e) => setTema(e.target.value)} className={input} placeholder="Ej.: Gimnasia: control corporal, equilibrio y expresión" />
          </div>
          <div>
            <label className={label} htmlFor="ai-num">{kind === 'unidad' ? 'Unidad N.°' : 'Sesión N.°'}</label>
            <input id="ai-num" type="number" min={1} max={20} value={numero} onChange={(e) => setNumero(Number(e.target.value) || 1)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="ai-dur">Duración</label>
            <input id="ai-dur" required maxLength={40} value={duracion} onChange={(e) => setDuracion(e.target.value)} className={input} />
          </div>
          {kind === 'unidad' && (
            <div>
              <label className={label} htmlFor="ai-ses">Número de sesiones</label>
              <input id="ai-ses" type="number" min={2} max={12} value={sesiones} onChange={(e) => setSesiones(Number(e.target.value) || 6)} className={input} />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className={label} htmlFor="ai-notas">Notas sobre tu grupo <span className="font-normal text-slate-500">(opcional)</span></label>
            <textarea id="ai-notas" rows={3} maxLength={1500} value={notas} onChange={(e) => setNotas(e.target.value)} className={textarea} placeholder="Ej.: Ya trabajamos habilidades motrices básicas; les cuesta el equilibrio; tenemos 6 colchonetas." />
          </div>
        </div>
        <p className="flex gap-2 text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl p-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          A la IA solo se envían el área, el grado, el tema, la duración y tus notas. No escribas nombres ni datos de tus estudiantes.
        </p>
        {error && <p role="alert" className="text-sm text-rose-200 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={btn.ghost}>Cancelar</button>
          <button type="submit" disabled={busy || !tema.trim()} className={btn.primary}>
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando… puede tardar un minuto</> : <><Sparkles className="w-4 h-4" /> Generar con IA</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Sesiones de una unidad

export function UnitSessions({ ctx, unit, plans, makePlan, onClose, onOpen }: {
  ctx: PanelCtx; unit: Plan; plans: Plan[]; makePlan: MakePlan; onClose: () => void; onOpen: (p: Plan) => void;
}) {
  const d = unit.detalle as UnidadDoc;
  const [duracion, setDuracion] = useState('90 minutos');
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState('');
  const existing = (n: number) => plans.find((p) => p.unidadId === unit.id && p.detalle?.tipo === 'sesion' && p.detalle.numero === n);

  const generate = async (n: number) => {
    const s = d.sesiones[n - 1];
    setBusy(n);
    setError('');
    try {
      const res = await generateWithAi({
        kind: 'sesion', area: unit.area, level: unit.level, grade: unit.grade, tema: s.titulo, duracion: duracion.trim() || '90 minutos', numero: n,
        unidad: { titulo: unit.title, situacion: d.situacion, reto: d.reto, numero: d.numero, proposito: d.proposito, sesion: s, sesionNumero: n },
      });
      const base = makePlan('sesion');
      onOpen(withDetalle({ ...base, area: unit.area, level: unit.level, grade: unit.grade, section: unit.section, period: unit.period, duration: duracion.trim(), title: res.titulo, unidadId: unit.id }, res.doc));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La IA no respondió esta vez.');
    } finally {
      setBusy(0);
    }
  };

  return (
    <Modal title={`Sesiones de la unidad ${d.numero}`} onClose={onClose} wide>
      <p className="text-sm text-slate-300">“{unit.title}”. Cada sesión sale de esta unidad: usa sus competencias, desempeños y criterios.</p>
      <div className="max-w-xs">
        <label className={label} htmlFor="us-dur">Duración de cada sesión</label>
        <input id="us-dur" value={duracion} onChange={(e) => setDuracion(e.target.value)} className={input} />
      </div>
      {error && <p role="alert" className="text-sm text-rose-200 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">{error}</p>}
      <ol className="space-y-2">
        {d.sesiones.map((s, i) => {
          const n = i + 1;
          const done = existing(n);
          return (
            <li key={n} className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{n}. {s.titulo}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.proposito}</p>
              </div>
              {done ? (
                <button type="button" onClick={() => onOpen(done)} className={btn.secondary}>Abrir sesión {n}</button>
              ) : (
                <button type="button" disabled={busy > 0} onClick={() => generate(n)} className={btn.primary}>
                  {busy === n ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando…</> : <><Wand2 className="w-4 h-4" /> Generar sesión {n}</>}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-slate-500">{ctx.myAreas.length ? 'La sesión se abre para que la revises y la guardes.' : ''}</p>
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Editor del documento completo

const linesOf = (v: string[]) => v.join('\n');
const toLines = (s: string) => s.split('\n');

function Txt({ id, title, value, onChange, rows = 2 }: { id: string; title: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className={label} htmlFor={id}>{title}</label>
      <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={textarea} />
    </div>
  );
}

function Rows<T>({ title, items, onChange, blank, children }: { title: string; items: T[]; onChange: (v: T[]) => void; blank: T; children: (item: T, set: (patch: Partial<T>) => void, i: number) => ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-bold text-white mb-1">{title}</legend>
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-orange-300">{i + 1}</span>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-300 hover:bg-slate-800 cursor-pointer" aria-label={`Quitar fila ${i + 1} de ${title}`}><Trash2 className="w-4 h-4" /></button>
          </div>
          {children(it, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))), i)}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, structuredClone(blank)])} className={btn.ghost}><Plus className="w-4 h-4" /> Agregar fila</button>
    </fieldset>
  );
}

function PropositoRows({ items, onChange, withEstandar, prefix }: { items: PropositoFila[]; onChange: (v: PropositoFila[]) => void; withEstandar: boolean; prefix: string }) {
  return (
    <Rows title="Propósito de aprendizaje" items={items} onChange={onChange} blank={{ competencia: '', capacidades: [], desempenos: [], estandar: '', criterios: [] }}>
      {(p, set, i) => (
        <>
          <Txt id={`${prefix}-c${i}`} title="Competencia" value={p.competencia} onChange={(v) => set({ competencia: v })} rows={1} />
          <div className="grid sm:grid-cols-2 gap-2">
            <Txt id={`${prefix}-cap${i}`} title="Capacidades (una por línea)" value={linesOf(p.capacidades)} onChange={(v) => set({ capacidades: toLines(v) })} rows={3} />
            <Txt id={`${prefix}-des${i}`} title="Desempeños (uno por línea)" value={linesOf(p.desempenos)} onChange={(v) => set({ desempenos: toLines(v) })} rows={3} />
            {withEstandar && <Txt id={`${prefix}-est${i}`} title="Estándar" value={p.estandar} onChange={(v) => set({ estandar: v })} rows={3} />}
            <Txt id={`${prefix}-cri${i}`} title="Criterios de evaluación (uno por línea)" value={linesOf(p.criterios)} onChange={(v) => set({ criterios: toLines(v) })} rows={3} />
          </div>
        </>
      )}
    </Rows>
  );
}

export function DetalleEditor({ value, onChange }: { value: PlanDoc; onChange: (d: PlanDoc) => void }) {
  if (value.tipo === 'unidad') {
    const d = value;
    const set = (patch: Partial<UnidadDoc>) => onChange({ ...d, ...patch });
    return (
      <div className="space-y-5">
        <Txt id="du-sit" title="Situación significativa" value={d.situacion} onChange={(v) => set({ situacion: v })} rows={7} />
        <Txt id="du-reto" title="Reto pedagógico" value={d.reto} onChange={(v) => set({ reto: v })} rows={2} />
        <PropositoRows items={d.proposito} onChange={(v) => set({ proposito: v })} withEstandar prefix="du" />
        <Rows title="Competencias transversales" items={d.transversales} onChange={(v) => set({ transversales: v })} blank={{ competencia: '', capacidad: '', descripcion: '' }}>
          {(t, s, i) => (
            <div className="grid sm:grid-cols-2 gap-2">
              <Txt id={`du-tc${i}`} title="Competencia" value={t.competencia} onChange={(v) => s({ competencia: v })} rows={1} />
              <Txt id={`du-tcap${i}`} title="Capacidad" value={t.capacidad} onChange={(v) => s({ capacidad: v })} rows={1} />
              <div className="sm:col-span-2"><Txt id={`du-td${i}`} title="Cómo se trabaja" value={t.descripcion} onChange={(v) => s({ descripcion: v })} /></div>
            </div>
          )}
        </Rows>
        <Rows title="Enfoques transversales" items={d.enfoques} onChange={(v) => set({ enfoques: v })} blank={{ enfoque: '', valor: '', actitudes: '' }}>
          {(e, s, i) => (
            <div className="grid sm:grid-cols-2 gap-2">
              <Txt id={`du-ee${i}`} title="Enfoque" value={e.enfoque} onChange={(v) => s({ enfoque: v })} rows={1} />
              <Txt id={`du-ev${i}`} title="Valor" value={e.valor} onChange={(v) => s({ valor: v })} rows={1} />
              <div className="sm:col-span-2"><Txt id={`du-ea${i}`} title="Actitudes observables" value={e.actitudes} onChange={(v) => s({ actitudes: v })} /></div>
            </div>
          )}
        </Rows>
        <Rows title="Secuencia de sesiones" items={d.sesiones} onChange={(v) => set({ sesiones: v })} blank={{ titulo: '', competencias: [], desempenos: [], proposito: '', instrumentos: [] }}>
          {(x, s, i) => (
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2"><Txt id={`du-st${i}`} title="Título de la sesión" value={x.titulo} onChange={(v) => s({ titulo: v })} rows={1} /></div>
              <Txt id={`du-sc${i}`} title="Competencia priorizada" value={linesOf(x.competencias)} onChange={(v) => s({ competencias: toLines(v) })} />
              <Txt id={`du-sd${i}`} title="Desempeño" value={linesOf(x.desempenos)} onChange={(v) => s({ desempenos: toLines(v) })} />
              <Txt id={`du-sp${i}`} title="Propósito de la sesión" value={x.proposito} onChange={(v) => s({ proposito: v })} />
              <Txt id={`du-si${i}`} title="Instrumentos (uno por línea)" value={linesOf(x.instrumentos)} onChange={(v) => s({ instrumentos: toLines(v) })} />
            </div>
          )}
        </Rows>
        <Rows title="Evaluación" items={d.evaluacion} onChange={(v) => set({ evaluacion: v })} blank={{ competencia: '', tecnica: '', instrumentos: [], desempenos: [], sesiones: '' }}>
          {(x, s, i) => (
            <div className="grid sm:grid-cols-2 gap-2">
              <Txt id={`du-vc${i}`} title="Competencia" value={x.competencia} onChange={(v) => s({ competencia: v })} rows={1} />
              <Txt id={`du-vt${i}`} title="Técnica" value={x.tecnica} onChange={(v) => s({ tecnica: v })} rows={1} />
              <Txt id={`du-vi${i}`} title="Instrumentos (uno por línea)" value={linesOf(x.instrumentos)} onChange={(v) => s({ instrumentos: toLines(v) })} />
              <Txt id={`du-vd${i}`} title="Desempeños (uno por línea)" value={linesOf(x.desempenos)} onChange={(v) => s({ desempenos: toLines(v) })} />
              <Txt id={`du-vs${i}`} title="Sesiones" value={x.sesiones} onChange={(v) => s({ sesiones: v })} rows={1} />
            </div>
          )}
        </Rows>
        <Txt id="du-bib" title="Materiales bibliográficos (uno por línea)" value={linesOf(d.bibliografia)} onChange={(v) => set({ bibliografia: toLines(v) })} rows={4} />
      </div>
    );
  }
  const d = value;
  const set = (patch: Partial<SesionDoc>) => onChange({ ...d, ...patch });
  const momento = (k: 'inicio' | 'desarrollo' | 'cierre', title: string, rows: number) => (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
      <div className="flex items-end gap-3">
        <p className="text-sm font-bold text-white flex-1">{title}</p>
        <label className="text-xs text-slate-400 flex items-center gap-2" htmlFor={`ds-${k}-min`}>Minutos
          <input id={`ds-${k}-min`} type="number" min={1} max={600} value={d[k].minutos} onChange={(e) => set({ [k]: { ...d[k], minutos: Number(e.target.value) || 1 } })} className="h-9 w-20 px-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white" />
        </label>
      </div>
      <Txt id={`ds-${k}`} title="Actividades" value={d[k].actividades} onChange={(v) => set({ [k]: { ...d[k], actividades: v } })} rows={rows} />
      <Txt id={`ds-${k}-mat`} title="Materiales (uno por línea)" value={linesOf(d[k].materiales)} onChange={(v) => set({ [k]: { ...d[k], materiales: toLines(v) } })} />
    </div>
  );
  return (
    <div className="space-y-5">
      <PropositoRows items={d.proposito} onChange={(v) => set({ proposito: v })} withEstandar={false} prefix="ds" />
      <div className="grid sm:grid-cols-2 gap-3">
        <Txt id="ds-prop" title="Propósito de la sesión" value={d.propositoTexto} onChange={(v) => set({ propositoTexto: v })} />
        <Txt id="ds-evid" title="Evidencia" value={d.evidencia} onChange={(v) => set({ evidencia: v })} />
        <Txt id="ds-tc" title="Competencia transversal" value={d.transversal.competencia} onChange={(v) => set({ transversal: { ...d.transversal, competencia: v } })} rows={1} />
        <Txt id="ds-tcap" title="Sus capacidades (una por línea)" value={linesOf(d.transversal.capacidades)} onChange={(v) => set({ transversal: { ...d.transversal, capacidades: toLines(v) } })} />
      </div>
      <Rows title="Enfoques transversales" items={d.enfoques} onChange={(v) => set({ enfoques: v })} blank={{ enfoque: '', accion: '' }}>
        {(e, s, i) => (
          <div className="grid sm:grid-cols-2 gap-2">
            <Txt id={`ds-ee${i}`} title="Enfoque" value={e.enfoque} onChange={(v) => s({ enfoque: v })} rows={1} />
            <Txt id={`ds-ea${i}`} title="Qué se observa" value={e.accion} onChange={(v) => s({ accion: v })} />
          </div>
        )}
      </Rows>
      <div className="space-y-3">
        <p className="text-sm font-bold text-white">Secuencia de la sesión <span className="font-normal text-slate-400">({d.inicio.minutos + d.desarrollo.minutos + d.cierre.minutos} min)</span></p>
        {momento('inicio', 'Inicio', 5)}
        {momento('desarrollo', 'Desarrollo', 10)}
        {momento('cierre', 'Cierre', 5)}
      </div>
      <RubricaEditor items={d.rubrica} onChange={(v) => set({ rubrica: v })} competencias={d.proposito.map((x) => x.competencia).filter(Boolean)} />
    </div>
  );
}

/** Rúbrica de una sesión: un criterio por fila y sus cuatro niveles de logro. */
export function RubricaEditor({ items, onChange, competencias = [] }: { items: RubricaFila[]; onChange: (v: RubricaFila[]) => void; competencias?: string[] }) {
  return (
    <Rows title="Rúbrica de evaluación" items={items} onChange={onChange} blank={{ criterio: '', destacado: '', esperado: '', proceso: '', inicio: '' }}>
      {(r, s, i) => (
        <div className="grid sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2"><Txt id={`ds-rc${i}`} title="Criterio" value={r.criterio} onChange={(v) => s({ criterio: v })} /></div>
          {competencias.length > 0 && (
            <div className="sm:col-span-2">
              <label className={label} htmlFor={`ds-rcomp${i}`}>Competencia que evalúa</label>
              <select id={`ds-rcomp${i}`} value={r.competencia || ''} onChange={(e) => s({ competencia: e.target.value || undefined })} className={input}>
                <option value="">Elige la competencia</option>
                {competencias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <Txt id={`ds-r4${i}`} title="Logro destacado (4)" value={r.destacado} onChange={(v) => s({ destacado: v })} />
          <Txt id={`ds-r3${i}`} title="Logro esperado (3)" value={r.esperado} onChange={(v) => s({ esperado: v })} />
          <Txt id={`ds-r2${i}`} title="En proceso (2)" value={r.proceso} onChange={(v) => s({ proceso: v })} />
          <Txt id={`ds-r1${i}`} title="En inicio (1)" value={r.inicio} onChange={(v) => s({ inicio: v })} />
        </div>
      )}
    </Rows>
  );
}

/** Limpia filas y líneas vacías antes de guardar. */
export function cleanDetalle(d: PlanDoc, duration: string): PlanDoc {
  return d.tipo === 'unidad' ? normalizeUnidad(d, d.numero) : normalizeSesion(d, d.numero, d.unidad, minutesOf(duration));
}

// ---------------------------------------------------------------------
// Vista con el formato del docente

export function wordInfo(ctx: PanelCtx, p: Plan): WordInfo {
  return {
    titulo: p.title, institucion: ctx.config.institutionName, ugel: ctx.config.ugel, area: p.area, nivel: LEVEL_LABEL[p.level],
    grado: `${p.grade}${p.section ? ` ${p.section}` : ''}`, docente: p.ownerName, duracion: p.duration, fecha: longDate(p.date), lugarFecha: longDate(p.date),
  };
}

export async function downloadPlanWord(ctx: PanelCtx, p: Plan) {
  if (!p.detalle) return;
  const { downloadWord } = await import('../lib/planWord');
  await downloadWord(p.detalle, wordInfo(ctx, p));
}

export function WordButton({ ctx, plan, className = btn.secondary }: { ctx: PanelCtx; plan: Plan; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} className={className} onClick={async () => {
      setBusy(true);
      try { await downloadPlanWord(ctx, plan); } catch { ctx.toast('No se pudo armar el Word. Vuelve a intentar.', 'error'); } finally { setBusy(false); }
    }}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Word
    </button>
  );
}

const th = 'p-1.5 border border-slate-400 bg-slate-200 font-bold text-left align-top';
const td = 'p-1.5 border border-slate-400 align-top whitespace-pre-line';
const H = ({ children }: { children: ReactNode }) => <h2 className="font-bold mt-5 mb-1.5">{children}</h2>;
const Ul = ({ items, mark = '•' }: { items: string[]; mark?: string }) => <>{items.map((x, i) => <p key={i}>{mark} {x}</p>)}</>;
const pad = (n: number) => String(n).padStart(2, '0');

/** En celular el documento se desliza de lado para no apretar las tablas. */
export function DetalleView(props: { plan: Plan; info: WordInfo }) {
  return <div className="overflow-x-auto -mx-1 px-1">{DetalleBody(props)}</div>;
}

function DetalleBody({ plan: p, info }: { plan: Plan; info: WordInfo }) {
  const d = p.detalle!;
  const title = (
    <header className="text-center">
      <p className="font-bold text-lg">{d.tipo === 'unidad' ? `UNIDAD DE APRENDIZAJE N° ${pad(d.numero)}` : `SESIÓN DE APRENDIZAJE ${pad(d.numero)} UNIDAD ${d.unidad}`}</p>
      <p className="font-bold mt-1">"{p.title.toUpperCase()}"</p>
    </header>
  );
  if (d.tipo === 'unidad') {
    return (
      <div className="text-[12.5px] min-w-[34rem]">
        {title}
        <H>1.- DATOS INFORMATIVOS:</H>
        <dl className="grid grid-cols-[2.2rem_12rem_1fr] gap-y-0.5 pl-4">
          {[['1.1', 'INSTITUCIÓN EDUCATIVA', info.institucion], ['1.2', 'ÁREA CURRICULAR', info.area], ['1.3', 'GRADO', `${info.grado} · ${info.nivel}`], ['1.4', 'DOCENTE', info.docente], ['1.5', 'DURACIÓN', [info.duracion, info.fecha].filter(Boolean).join(' · ')]].map(([n, k, v]) => (
            <div key={n} className="contents"><dt>{n}</dt><dt>{k}</dt><dd>: {v}</dd></div>
          ))}
        </dl>
        <H>2.- SITUACIÓN SIGNIFICATIVA:</H>
        {d.situacion.split('\n').filter((l) => l.trim()).map((l, i) => <p key={i} className="text-justify mb-1.5">{l}</p>)}
        <p className="font-bold mt-2">Reto pedagógico:</p>
        <p>{d.reto}</p>
        <H>3.- PROPÓSITO DE APRENDIZAJE:</H>
        <table className="w-full border-collapse text-[11.5px]">
          <thead><tr>{['COMPETENCIAS/CAPACIDADES', 'DESEMPEÑOS', 'ESTÁNDARES', 'CRITERIOS DE EVALUACIÓN'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{d.proposito.map((r, i) => (
            <tr key={i}><td className={td}><p className="font-bold">{r.competencia.toUpperCase()}</p><Ul items={r.capacidades} mark="-" /></td><td className={td}>{r.desempenos.join('\n')}</td><td className={td}>{r.estandar}</td><td className={td}><Ul items={r.criterios} /></td></tr>
          ))}</tbody>
        </table>
        <H>4.- COMPETENCIAS TRANSVERSALES:</H>
        <table className="w-full border-collapse text-[11.5px]"><tbody>{d.transversales.map((t, i) => (
          <FragmentRows key={i} head={t.competencia.toUpperCase()} cols={2}><td className={td}>{t.capacidad}</td><td className={td}>{t.descripcion}</td></FragmentRows>
        ))}</tbody></table>
        <H>5.- MATRIZ DE ENFOQUES TRANSVERSALES:</H>
        <table className="w-full border-collapse text-[11.5px]"><tbody>{d.enfoques.map((e, i) => (
          <FragmentRows key={i} head={e.enfoque.toUpperCase()} cols={2}><td className={td}>{e.valor}</td><td className={td}>{e.actitudes}</td></FragmentRows>
        ))}</tbody></table>
        <H>6.- SECUENCIA DE SESIONES:</H>
        <table className="w-full border-collapse text-[11.5px]">
          <thead><tr>{['SESIÓN', 'COMPETENCIA PRIORIZADA', 'DESEMPEÑO', 'PROPÓSITO DE LA SESIÓN', 'INSTRUMENTO DE EVALUACIÓN'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{d.sesiones.map((s, i) => (
            <tr key={i}><td className={td}>{i + 1}. "{s.titulo}"</td><td className={td}>{s.competencias.join('\n')}</td><td className={td}>{s.desempenos.join('\n')}</td><td className={td}>{s.proposito}</td><td className={td}><Ul items={s.instrumentos} /></td></tr>
          ))}</tbody>
        </table>
        <H>7.- EVALUACIÓN.</H>
        <table className="w-full border-collapse text-[11.5px]">
          <thead><tr>{['COMPETENCIA', 'TÉCNICA', 'INSTRUMENTO', 'DESEMPEÑOS', 'SESIÓN'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{d.evaluacion.map((e, i) => (
            <tr key={i}><td className={td}>{e.competencia}</td><td className={td}>{e.tecnica}</td><td className={td}><Ul items={e.instrumentos} /></td><td className={td}><Ul items={e.desempenos} /></td><td className={td}>{e.sesiones}</td></tr>
          ))}</tbody>
        </table>
        <H>8.- MATERIALES BIBLIOGRÁFICOS.</H>
        <Ul items={d.bibliografia} />
        <p className="text-right mt-6">{info.lugarFecha}</p>
      </div>
    );
  }
  const wide = (k: string, v: ReactNode) => <tr><td className={`${td} font-bold`}>{k}</td><td className={td} colSpan={3}>{v}</td></tr>;
  const momento = (name: string, m: SesionDoc['inicio']) => (
    <>
      <tr><th className={th}>{name} ({m.minutos} min)</th><th className={`${th} w-1/4`}>MATERIALES</th></tr>
      <tr><td className={td}>{m.actividades}</td><td className={td}><Ul items={m.materiales} /></td></tr>
    </>
  );
  return (
    <div className="text-[12.5px] min-w-[34rem]">
      {title}
      <H>1.- DATOS GENERALES:</H>
      <table className="w-full border-collapse text-[11.5px]"><tbody>
        {[['1.1 UGEL', info.ugel, '1.5 NIVEL', info.nivel], ['1.2 I.E.', info.institucion, '1.6 ÁREA', info.area], ['1.3 DOCENTE', info.docente, '1.7 GRADO', info.grado], ['1.4 FECHA', info.fecha, '1.8 DURACIÓN', info.duracion]].map((r) => (
          <tr key={r[0]}><th className={th}>{r[0]}</th><td className={td}>{r[1]}</td><th className={th}>{r[2]}</th><td className={td}>{r[3]}</td></tr>
        ))}
      </tbody></table>
      <H>2.- PROPÓSITO DE APRENDIZAJE</H>
      <table className="w-full border-collapse text-[11.5px]">
        <thead><tr>{['COMPETENCIAS', 'CAPACIDADES', 'DESEMPEÑOS', 'CRITERIOS DE EVALUACIÓN'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {d.proposito.map((r, i) => (
            <tr key={i}><td className={`${td} font-bold`}>{r.competencia.toUpperCase()}</td><td className={td}><Ul items={r.capacidades} mark="-" /></td><td className={td}>{r.desempenos.join('\n')}</td><td className={td}><Ul items={r.criterios} /></td></tr>
          ))}
          {wide('PROPÓSITO', d.propositoTexto)}
          {wide('EVIDENCIA', d.evidencia)}
          {wide(d.transversal.competencia, <Ul items={d.transversal.capacidades} mark="-" />)}
          <tr><th className={th} colSpan={4}>ENFOQUES TRANSVERSALES</th></tr>
          {d.enfoques.map((e, i) => <tr key={i}><td className={`${td} font-bold`}>{e.enfoque}</td><td className={td} colSpan={3}>{e.accion}</td></tr>)}
        </tbody>
      </table>
      <H>3.- SECUENCIA DE LA SESIÓN</H>
      <table className="w-full border-collapse text-[11.5px]"><tbody>
        {momento('INICIO', d.inicio)}
        {momento('DESARROLLO', d.desarrollo)}
        {momento('CIERRE', d.cierre)}
      </tbody></table>
      <p className="text-right mt-6">{info.lugarFecha}</p>
      <p className="font-bold text-center mt-6 mb-2">RÚBRICA DE EVALUACIÓN</p>
      <table className="w-full border-collapse text-[11px]">
        <thead><tr>{['CRITERIO', 'LOGRO DESTACADO (4)', 'LOGRO ESPERADO (3)', 'EN PROCESO (2)', 'EN INICIO (1)'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>{d.rubrica.map((r, i) => <tr key={i}><td className={td}>{r.criterio}</td><td className={td}>{r.destacado}</td><td className={td}>{r.esperado}</td><td className={td}>{r.proceso}</td><td className={td}>{r.inicio}</td></tr>)}</tbody>
      </table>
      <p className="font-bold mt-5">OBSERVACIONES:</p>
      <p className="border-b border-dotted border-slate-500 h-6" />
      <p className="border-b border-dotted border-slate-500 h-6" />
    </div>
  );
}

function FragmentRows({ head, cols, children }: { head: string; cols: number; children: ReactNode }) {
  return (
    <>
      <tr><th className={th} colSpan={cols}>{head}</th></tr>
      <tr>{children}</tr>
    </>
  );
}
