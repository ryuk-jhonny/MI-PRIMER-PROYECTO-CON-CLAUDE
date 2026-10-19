import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CalendarCheck, ListChecks, TriangleAlert } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { friendlyError } from '../lib/firebase';
import { CNEB_AREAS, activePeriodIndex, aulaOf, compUnitsOf, findGrade, levelOf, Literal, periodCount, periodLabel } from '../lib/school';
import { competenciasOf, LEVEL_LABEL, LEVELS } from '../lib/cneb';
import { AttendanceRecord, ClassAttendance } from '../lib/store';
import { Card, Empty, input, label, PageHeader, Stat } from './ui';
import { aulaOptions } from './ScheduleTab';

const LIT: { k: Exclude<Literal, ''>; name: string; bar: string }[] = [
  { k: 'AD', name: 'AD · destacado', bar: 'bg-emerald-500' },
  { k: 'A', name: 'A · esperado', bar: 'bg-sky-500' },
  { k: 'B', name: 'B · en proceso', bar: 'bg-amber-500' },
  { k: 'C', name: 'C · en inicio', bar: 'bg-rose-500' },
];

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);
const monthStart = (day: string) => `${day.slice(0, 8)}01`;

/** Barra apilada con su leyenda y el detalle al pasar el cursor (o al tocar). */
export function LiteralBar({ counts, label: name }: { counts: Record<string, number>; label: string }) {
  const total = LIT.reduce((a, l) => a + (counts[l.k] || 0), 0);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-slate-200 font-semibold">{name}</span>
        <span className="text-slate-400 tabular-nums">{total ? LIT.map((l) => `${l.k} ${counts[l.k] || 0}`).join(' · ') : 'Sin notas'}</span>
      </div>
      <div className="mt-1.5 h-3 rounded-full bg-slate-800 flex gap-[2px] overflow-hidden" role="img" aria-label={`${name}: ${LIT.map((l) => `${l.k} ${counts[l.k] || 0}`).join(', ')}`}>
        {total > 0 && LIT.filter((l) => counts[l.k]).map((l) => (
          <span key={l.k} title={`${l.name}: ${counts[l.k]} (${pct(counts[l.k], total)}%)`} className={`${l.bar} h-full first:rounded-l-full last:rounded-r-full`} style={{ width: `${(counts[l.k] / total) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

export function LiteralLegend() {
  return (
    <ul className="flex flex-wrap gap-3 text-xs text-slate-300">
      {LIT.map((l) => <li key={l.k} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded-sm ${l.bar}`} />{l.name}</li>)}
    </ul>
  );
}

export default function DashboardTab({ ctx }: { ctx: PanelCtx }) {
  const { store, students, config, isDirector, myAreas, today } = ctx;
  const n = periodCount(config);
  const [from, setFrom] = useState(monthStart(today));
  const [to, setTo] = useState(today);
  const [level, setLevel] = useState('');
  const [aula, setAula] = useState('');
  const [area, setArea] = useState('');
  const [period, setPeriod] = useState(() => Math.min(activePeriodIndex(config), n - 1));
  const [gate, setGate] = useState<AttendanceRecord[] | null>(null);
  const [classes, setClasses] = useState<ClassAttendance[] | null>(null);

  useEffect(() => {
    setGate(null);
    store.listAttendanceRange(from, to).then(setGate).catch((err) => { ctx.toast(friendlyError(err), 'error'); setGate([]); });
  }, [store, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    store.listClassAttendance().then(setClasses).catch((err) => { ctx.toast(friendlyError(err), 'error'); setClasses([]); });
  }, [store]); // eslint-disable-line react-hooks/exhaustive-deps

  const allAulas = aulaOptions(ctx).filter((a) => !level || a.toLowerCase().includes(level));
  const inScope = useMemo(() => students.filter((s) => (!level || levelOf(s) === level) && (!aula || aulaOf(s) === aula) && (isDirector || allAulas.includes(aulaOf(s)))), [students, level, aula, isDirector, allAulas]);
  const ids = new Set(inScope.map((s) => s.id));
  const areas = (isDirector ? [...new Set(LEVELS.flatMap((l) => CNEB_AREAS[l]))] : myAreas).filter((a) => !level || CNEB_AREAS[level as 'primaria'].includes(a));
  const shownAreas = area ? [area] : areas;

  // ----- Puerta -----
  const gateRows = (gate || []).filter((r) => ids.has(r.studentId));
  const g = { P: 0, T: 0, F: 0, J: 0 };
  gateRows.forEach((r) => { g[r.status === 'Puntual' ? 'P' : r.status === 'Tardanza' ? 'T' : r.status === 'Justificada' ? 'J' : 'F']++; });

  // ----- Clases -----
  const classRows = (classes || []).filter((r) => r.day >= from && r.day <= to && (!aula || r.aula === aula) && (!area || r.area === area) && (isDirector || r.ownerUid === ctx.me.uid));
  const c = { P: 0, T: 0, F: 0, J: 0 };
  const faltas = new Map<string, number>();
  classRows.forEach((r) => Object.entries(r.marks).forEach(([sid, m]) => {
    if (!ids.has(sid)) return;
    c[m]++;
    if (m === 'F') faltas.set(sid, (faltas.get(sid) || 0) + 1);
  }));
  const classTotal = c.P + c.T + c.F + c.J;
  const byAula = [...new Set(classRows.map((r) => r.aula))].sort().map((a) => {
    const x = { P: 0, T: 0, F: 0, J: 0 };
    classRows.filter((r) => r.aula === a).forEach((r) => Object.entries(r.marks).forEach(([sid, m]) => { if (ids.has(sid)) x[m]++; }));
    return { a, ...x, total: x.P + x.T + x.F + x.J, clases: classRows.filter((r) => r.aula === a).length };
  });
  const topFaltas = [...faltas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([sid, k]) => ({ s: students.find((x) => x.id === sid), k }));

  // ----- Notas -----
  const compRows = shownAreas.flatMap((a) => LEVELS.filter((lv) => !level || lv === level).flatMap((lv) => {
    const list = inScope.filter((s) => levelOf(s) === lv);
    if (!list.length) return [];
    return competenciasOf(a, lv).map((comp) => {
      const counts: Record<string, number> = {};
      list.forEach((s) => { const v = compUnitsOf(findGrade(s, a), comp.id, n)[period]; if (v) counts[v] = (counts[v] || 0) + 1; });
      return { key: `${a}-${lv}-${comp.id}`, area: a, lv, comp, counts };
    });
  }));
  const enInicio = inScope.flatMap((s) => shownAreas.flatMap((a) => competenciasOf(a, levelOf(s)).filter((comp) => compUnitsOf(findGrade(s, a), comp.id, n)[period] === 'C').map((comp) => ({ s, a, comp })))).slice(0, 12);

  return (
    <div className="space-y-6 stagger">
      <PageHeader title="Resumen de asistencia y notas" subtitle={isDirector ? 'Todo el colegio. Filtra por nivel, aula, área, fechas y periodo.' : 'Tus aulas y tus áreas. Filtra por aula, área, fechas y periodo.'} />

      <Card className="p-4 grid grid-cols-2 lg:grid-cols-6 gap-3">
        {isDirector && (
          <div>
            <label className={label} htmlFor="db-level">Nivel</label>
            <select id="db-level" value={level} onChange={(e) => { setLevel(e.target.value); setAula(''); setArea(''); }} className={input}>
              <option value="">Todos</option>{LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={label} htmlFor="db-aula">Aula</label>
          <select id="db-aula" value={aula} onChange={(e) => setAula(e.target.value)} className={input}>
            <option value="">Todas</option>{allAulas.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="db-area">Área</label>
          <select id="db-area" value={area} onChange={(e) => setArea(e.target.value)} className={input}>
            <option value="">Todas</option>{areas.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div><label className={label} htmlFor="db-from">Desde</label><input id="db-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value || from)} className={input} /></div>
        <div><label className={label} htmlFor="db-to">Hasta</label><input id="db-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value || to)} className={input} /></div>
        <div>
          <label className={label} htmlFor="db-period">Periodo de notas</label>
          <select id="db-period" value={period} onChange={(e) => setPeriod(Number(e.target.value))} className={input}>
            {Array.from({ length: n }, (_, i) => <option key={i} value={i}>{periodLabel(config, i)}</option>)}
          </select>
        </div>
      </Card>

      {inScope.length === 0 ? <Empty icon={CalendarCheck} title="No hay estudiantes con estos filtros">Cambia el nivel o el aula.</Empty> : (<>
        <section aria-label="Asistencia de la puerta" className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-orange-400" /> Asistencia de la puerta</h2>
          {gate === null ? <p className="text-sm text-slate-400">Cargando…</p> : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Asistencia" value={pct(g.P + g.T + g.J, gateRows.length) === null ? '—' : `${pct(g.P + g.T + g.J, gateRows.length)}%`} hint={gateRows.length === 1 ? '1 registro' : `${gateRows.length} registros`} icon={CalendarCheck} tone="emerald" />
              <Stat label="Puntuales" value={g.P} icon={CalendarCheck} tone="sky" />
              <Stat label="Tardanzas" value={g.T} icon={CalendarCheck} tone="amber" />
              <Stat label="Faltas" value={g.F} hint={`${g.J} justificadas`} icon={CalendarCheck} tone="rose" />
            </div>
          )}
        </section>

        <section aria-label="Asistencia de clase" className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><ListChecks className="w-5 h-5 text-orange-400" /> Asistencia de clase</h2>
          {classes === null ? <p className="text-sm text-slate-400">Cargando…</p> : classTotal === 0 ? <p className="text-sm text-slate-400">No hay asistencia de clase en estas fechas.</p> : (<>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Asistencia" value={`${pct(c.P + c.T + c.J, classTotal)}%`} hint={classRows.length === 1 ? '1 clase' : `${classRows.length} clases`} icon={ListChecks} tone="emerald" />
              <Stat label="Presentes" value={c.P} icon={ListChecks} tone="sky" />
              <Stat label="Tardes" value={c.T} icon={ListChecks} tone="amber" />
              <Stat label="Faltas" value={c.F} hint={`${c.J} justificadas`} icon={ListChecks} tone="rose" />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="p-4 overflow-x-auto">
                <h3 className="text-sm font-bold text-white mb-2">Por aula</h3>
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-slate-400 text-left"><th className="py-1.5">Aula</th><th className="text-center">Clases</th><th className="text-center">P</th><th className="text-center">T</th><th className="text-center">F</th><th className="text-center">J</th><th className="text-center">%</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">{byAula.map((x) => (
                    <tr key={x.a}><td className="py-2 text-white">{x.a}</td><td className="text-center tabular-nums text-slate-300">{x.clases}</td><td className="text-center tabular-nums text-slate-300">{x.P}</td><td className="text-center tabular-nums text-slate-300">{x.T}</td><td className="text-center tabular-nums text-slate-300">{x.F}</td><td className="text-center tabular-nums text-slate-300">{x.J}</td><td className="text-center tabular-nums font-semibold text-white">{pct(x.P + x.T + x.J, x.total)}%</td></tr>
                  ))}</tbody>
                </table>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-bold text-white mb-2">Más faltas en clase</h3>
                {topFaltas.length === 0 ? <p className="text-sm text-slate-400">Nadie faltó en estas fechas.</p> : (
                  <ul className="divide-y divide-slate-800">{topFaltas.map(({ s, k }) => s && <li key={s.id} className="py-2 flex justify-between gap-2 text-sm"><span className="text-white">{s.fullName}<span className="block text-xs text-slate-400">{aulaOf(s)}</span></span><span className="tabular-nums text-rose-300 font-semibold">{k} {k === 1 ? 'falta' : 'faltas'}</span></li>)}</ul>
                )}
              </Card>
            </div>
          </>)}
        </section>

        <section aria-label="Notas por competencia" className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><BookOpenCheck className="w-5 h-5 text-orange-400" /> Notas por competencia · {periodLabel(config, period)}</h2>
          <LiteralLegend />
          <div className="grid lg:grid-cols-2 gap-4">
            {shownAreas.map((a) => {
              const rows = compRows.filter((r) => r.area === a);
              if (!rows.length) return null;
              return (
                <Card key={a} className="p-4 space-y-3">
                  <h3 className="text-sm font-bold text-white">{a}</h3>
                  {rows.map((r) => <LiteralBar key={r.key} counts={r.counts} label={`${level || LEVELS.length === 1 ? '' : `${LEVEL_LABEL[r.lv]} · `}C${r.comp.n}. ${r.comp.name}`} />)}
                </Card>
              );
            })}
          </div>
          {enInicio.length > 0 && (
            <Card className="p-4 border-rose-500/30">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><TriangleAlert className="w-4 h-4 text-rose-400" /> En inicio (C) en {periodLabel(config, period)}</h3>
              <ul className="mt-2 divide-y divide-slate-800">{enInicio.map(({ s, a, comp }) => <li key={`${s.id}${a}${comp.id}`} className="py-2 text-sm"><span className="text-white">{s.fullName}</span> <span className="text-slate-400">· {aulaOf(s)} · {a}, C{comp.n}</span></li>)}</ul>
            </Card>
          )}
        </section>
      </>)}
    </div>
  );
}
