import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Download, FileText, Info, Save, Users } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { Student } from '../types/education';
import { Avatar, Badge, btn, Card, Empty, input, PageHeader } from './ui';
import {
  aulaOf, CNEB_AREAS, compUnitsOf, downloadCsv, findGrade, levelOf, LITERAL_STYLE, LITERALS, Literal, periodCount, periodLabel,
  setCompGrade, setFeedback, unitsOf, activePeriodIndex,
} from '../lib/school';
import { competenciasOf } from '../lib/cneb';
import ReportCard from './ReportCard';

export default function GradesTab({ ctx }: { ctx: PanelCtx }) {
  const { students, config, me, myAreas } = ctx;
  const allAulas = useMemo(() => [...new Set(students.map(aulaOf))].sort(), [students]);
  const aulas = me.role === 'docente' && me.aulas?.length ? allAulas.filter((a) => me.aulas!.includes(a)) : allAulas;
  const [aula, setAula] = useState(aulas[0] || '');
  const inAula = useMemo(() => students.filter((s) => aulaOf(s) === aula).sort((a, b) => a.fullName.localeCompare(b.fullName)), [students, aula]);
  const level = inAula[0] ? levelOf(inAula[0]) : 'primaria';
  const areas = CNEB_AREAS[level].filter((a) => myAreas.includes(a));
  const [area, setArea] = useState(areas[0] || '');
  const n = periodCount(config);
  const [period, setPeriod] = useState(() => Math.min(activePeriodIndex(config), n - 1));
  const [draft, setDraft] = useState<Record<string, Student>>({});
  const [report, setReport] = useState<Student | null>(null);
  const comps = competenciasOf(area, level);
  const dirty = Object.keys(draft).length;

  useEffect(() => { if (!aulas.includes(aula)) setAula(aulas[0] || ''); }, [aulas, aula]);
  useEffect(() => { if (!areas.includes(area)) setArea(areas[0] || ''); }, [areas, area]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const current = (s: Student) => draft[s.id] || s;
  const teacherName = me.role === 'docente' ? me.fullName : '';

  const change = (s: Student, compId: string, value: Literal) =>
    setDraft((d) => ({ ...d, [s.id]: setCompGrade(current(s), area, compId, period, value, n, teacherName) }));
  const changeFeedback = (s: Student, text: string) => {
    let base = current(s);
    if (!findGrade(base, area) && comps[0]) base = setCompGrade(base, area, comps[0].id, period, '', n, teacherName);
    setDraft((d) => ({ ...d, [s.id]: setFeedback(base, area, text) }));
  };

  const save = async () => {
    const list = Object.values(draft);
    setDraft({});
    await ctx.saveStudents(list, `Notas guardadas (${list.length} estudiantes).`);
  };

  const exportAula = () => {
    downloadCsv(`notas-${aula.replace(/[^\w]+/g, '-')}-${area.replace(/[^\w]+/g, '-')}.csv`, [
      ['Estudiante', 'DNI', ...comps.map((c) => `C${c.n} ${periodLabel(config, period)}`), `${area} ${periodLabel(config, period)}`, `${area} final`],
      ...inAula.map((s) => {
        const g = findGrade(current(s), area);
        return [s.fullName, s.dni || '', ...comps.map((c) => compUnitsOf(g, c.id, n)[period] || ''), unitsOf(g, n)[period] || '', g?.average || ''];
      }),
    ]);
  };

  if (!students.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notas y libretas" />
        <Empty icon={Users} title="Primero registra estudiantes" action={ctx.isDirector ? <button type="button" onClick={() => ctx.go('estudiantes')} className={btn.primary}>Ir a Estudiantes</button> : undefined}>
          Las notas se registran por aula, por área y por competencia del CNEB.
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger">
      <PageHeader
        title="Notas por competencia"
        subtitle={`Escala CNEB (AD, A, B, C) · ${config.periodType === 'trimestral' ? '3 trimestres' : '4 bimestres'} · Periodo actual: ${config.activePeriod}`}
        actions={
          <>
            <button type="button" onClick={exportAula} disabled={!area} className={btn.secondary}><Download className="w-4 h-4" /> Exportar</button>
            <button type="button" onClick={save} disabled={!dirty} className={btn.primary}><Save className="w-4 h-4" /> Guardar{dirty ? ` (${dirty})` : ''}</button>
          </>
        }
      />

      <Card className="p-4 grid sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="g-aula" className="block text-xs font-semibold text-slate-400 mb-1.5">Aula</label>
          <select id="g-aula" value={aula} onChange={(e) => { setAula(e.target.value); setDraft({}); }} disabled={dirty > 0} className={input}>
            {aulas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="g-area" className="block text-xs font-semibold text-slate-400 mb-1.5">Área curricular</label>
          <select id="g-area" value={area} onChange={(e) => setArea(e.target.value)} className={input} disabled={!areas.length}>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="g-period" className="block text-xs font-semibold text-slate-400 mb-1.5">Periodo</label>
          <select id="g-period" value={period} onChange={(e) => setPeriod(Number(e.target.value))} className={input}>
            {Array.from({ length: n }, (_, i) => <option key={i} value={i}>{periodLabel(config, i)}</option>)}
          </select>
        </div>
      </Card>

      {!areas.length ? (
        <Empty icon={BookOpenCheck} title="No enseñas áreas en esta aula" action={<button type="button" onClick={() => ctx.go('area')} className={btn.secondary}>Revisar mis áreas</button>}>
          {aula} es de {level}. Tus áreas: {myAreas.join(', ') || 'ninguna todavía'}.
        </Empty>
      ) : (
        <>
          {dirty > 0 && (
            <div className="sticky top-16 lg:top-4 z-20 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-100 text-sm px-4 py-3 flex items-center justify-between gap-3">
              <span>Tienes cambios sin guardar en {dirty} estudiante(s).</span>
              <button type="button" onClick={save} className="h-9 px-3 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer">Guardar ahora</button>
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: `${420 + comps.length * 84}px` }}>
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Estudiante</th>
                    {comps.map((c) => <th key={c.id} title={c.name} className="font-semibold px-2 py-3 w-20">C{c.n}</th>)}
                    <th className="font-semibold px-2 py-3 w-20" title="Promedio del área en el periodo">Área</th>
                    <th className="font-semibold px-2 py-3 w-20">Final</th>
                    <th className="text-left font-semibold px-3 py-3">Conclusión descriptiva</th>
                    <th className="px-3 py-3"><span className="sr-only">Libreta</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {inAula.map((s) => {
                    const g = findGrade(current(s), area);
                    const periodLit = unitsOf(g, n)[period];
                    return (
                      <tr key={s.id} className={draft[s.id] ? 'bg-amber-500/5' : ''}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar src={s.avatarUrl} name={s.fullName} className="w-8 h-8" />
                            <span className="font-semibold text-white truncate max-w-[180px]">{s.fullName}</span>
                          </div>
                        </td>
                        {comps.map((c) => {
                          const v = compUnitsOf(g, c.id, n)[period];
                          return (
                            <td key={c.id} className="px-2 py-2.5 text-center">
                              <select value={v} onChange={(e) => change(s, c.id, e.target.value as Literal)} aria-label={`${s.fullName}, competencia ${c.n}, ${periodLabel(config, period)}`}
                                className={`h-10 w-16 rounded-lg border text-center font-bold cursor-pointer bg-slate-950 ${LITERAL_STYLE[v]}`}>
                                <option value="">—</option>
                                {LITERALS.map((l) => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </td>
                          );
                        })}
                        <td className="px-2 py-2.5 text-center"><Badge className={LITERAL_STYLE[periodLit || '']}>{periodLit || '—'}</Badge></td>
                        <td className="px-2 py-2.5 text-center"><Badge className={LITERAL_STYLE[g?.average || '']}>{g?.average || '—'}</Badge></td>
                        <td className="px-3 py-2.5">
                          <input value={g?.recentFeedback || ''} onChange={(e) => changeFeedback(s, e.target.value)} placeholder="Opcional" aria-label={`Conclusión de ${s.fullName}`} maxLength={400}
                            className="h-10 w-full min-w-[180px] px-3 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500" />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button type="button" onClick={() => setReport(current(s))} className="h-10 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                            <FileText className="w-4 h-4" /> Libreta
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-800 space-y-2">
              {comps.map((c) => (
                <p key={c.id} className="text-xs text-slate-400"><strong className="text-slate-200">C{c.n}</strong> · {c.name}</p>
              ))}
              <p className="text-xs text-slate-500 flex items-start gap-2 pt-2"><Info className="w-4 h-4 text-orange-400 shrink-0" /> El literal del área en el periodo es el promedio de sus competencias, y el final es el promedio de los periodos (AD=4, A=3, B=2, C=1). Estudiantes y familias lo ven al guardar.</p>
            </div>
          </Card>
        </>
      )}

      {report && <ReportCard student={report} config={config} profile={ctx.profile} onClose={() => setReport(null)} />}
    </div>
  );
}
