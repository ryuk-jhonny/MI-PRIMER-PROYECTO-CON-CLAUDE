import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Download, FileText, Save, Users } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { Student } from '../types/education';
import { Avatar, Badge, btn, Card, Empty, input, PageHeader } from './ui';
import { aulaOf, CNEB_AREAS, downloadCsv, findGrade, levelOf, LITERAL_STYLE, LITERALS, Literal, periodCount, periodLabel, setFeedback, setGrade, unitsOf } from '../lib/school';
import ReportCard from './ReportCard';

export default function GradesTab({ ctx }: { ctx: PanelCtx }) {
  const { students, config, store } = ctx;
  const aulas = useMemo(() => [...new Set(students.map(aulaOf))].sort(), [students]);
  const [aula, setAula] = useState(aulas[0] || '');
  const inAula = useMemo(() => students.filter((s) => aulaOf(s) === aula).sort((a, b) => a.fullName.localeCompare(b.fullName)), [students, aula]);
  const level = inAula[0] ? levelOf(inAula[0]) : 'secundaria';
  const areas = CNEB_AREAS[level];
  const [area, setArea] = useState(areas[0]);
  const [draft, setDraft] = useState<Record<string, Student>>({});
  const [report, setReport] = useState<Student | null>(null);
  const n = periodCount(config);
  const dirty = Object.keys(draft).length;

  useEffect(() => { if (!aulas.includes(aula)) setAula(aulas[0] || ''); }, [aulas, aula]);
  useEffect(() => { if (!areas.includes(area)) setArea(areas[0]); }, [areas, area]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const current = (s: Student) => draft[s.id] || s;
  const teacherName = store.role === 'docente' ? store.userName : '';

  const change = (s: Student, unit: number, value: Literal) => setDraft((d) => ({ ...d, [s.id]: setGrade(current(s), area, unit, value, n, teacherName) }));
  const changeFeedback = (s: Student, text: string) => {
    const base = findGrade(current(s), area) ? current(s) : setGrade(current(s), area, 0, unitsOf(findGrade(current(s), area), n)[0], n, teacherName);
    setDraft((d) => ({ ...d, [s.id]: setFeedback(base, area, text) }));
  };

  const save = () => {
    ctx.updateStudents(students.map((s) => draft[s.id] || s), `Notas guardadas (${dirty} estudiantes).`);
    setDraft({});
  };

  const exportAula = () => {
    downloadCsv(`notas-${aula.replace(/[^\w]+/g, '-')}.csv`, [
      ['Estudiante', 'DNI', ...areas],
      ...inAula.map((s) => [s.fullName, s.dni || '', ...areas.map((a) => findGrade(current(s), a)?.average || '')]),
    ]);
  };

  if (!students.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notas y libretas" />
        <Empty icon={Users} title="Primero registra estudiantes" action={store.role === 'director' ? <button type="button" onClick={() => ctx.go('estudiantes')} className={btn.primary}>Ir a Estudiantes</button> : undefined}>
          Las notas se registran por aula y por área curricular del CNEB.
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notas y libretas"
        subtitle={`Escala CNEB (AD, A, B, C) · ${config.periodType === 'trimestral' ? '3 trimestres' : '4 bimestres'} · Periodo actual: ${config.activePeriod}`}
        actions={
          <>
            <button type="button" onClick={exportAula} className={btn.secondary}><Download className="w-4 h-4" /> Exportar aula</button>
            <button type="button" onClick={save} disabled={!dirty} className={btn.primary}><Save className="w-4 h-4" /> Guardar{dirty ? ` (${dirty})` : ''}</button>
          </>
        }
      />

      <Card className="p-4 grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="g-aula" className="block text-xs font-semibold text-slate-400 mb-1.5">Aula</label>
          <select id="g-aula" value={aula} onChange={(e) => setAula(e.target.value)} className={input}>
            {aulas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="g-area" className="block text-xs font-semibold text-slate-400 mb-1.5">Área curricular</label>
          <select id="g-area" value={area} onChange={(e) => setArea(e.target.value)} className={input}>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </Card>

      {dirty > 0 && (
        <div className="sticky top-16 lg:top-4 z-20 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-100 text-sm px-4 py-3 flex items-center justify-between gap-3">
          <span>Tienes cambios sin guardar en {dirty} estudiante(s).</span>
          <button type="button" onClick={save} className="h-9 px-3 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer">Guardar ahora</button>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Estudiante</th>
                {Array.from({ length: n }, (_, i) => <th key={i} className="font-semibold px-2 py-3 w-20">{periodLabel(config, i)}</th>)}
                <th className="font-semibold px-2 py-3 w-20">Final</th>
                <th className="text-left font-semibold px-3 py-3">Conclusión descriptiva</th>
                <th className="px-3 py-3"><span className="sr-only">Libreta</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {inAula.map((s) => {
                const g = findGrade(current(s), area);
                const units = unitsOf(g, n);
                return (
                  <tr key={s.id} className={draft[s.id] ? 'bg-amber-500/5' : ''}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar src={s.avatarUrl} name={s.fullName} className="w-8 h-8" />
                        <span className="font-semibold text-white truncate max-w-[180px]">{s.fullName}</span>
                      </div>
                    </td>
                    {units.map((v, i) => (
                      <td key={i} className="px-2 py-2.5 text-center">
                        <select value={v} onChange={(e) => change(s, i, e.target.value as Literal)} aria-label={`${s.fullName}, ${area}, ${periodLabel(config, i)}`}
                          className={`h-10 w-16 rounded-lg border text-center font-bold cursor-pointer bg-slate-950 ${LITERAL_STYLE[v]}`}>
                          <option value="">—</option>
                          {LITERALS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </td>
                    ))}
                    <td className="px-2 py-2.5 text-center"><Badge className={LITERAL_STYLE[g?.average || '']}>{g?.average || '—'}</Badge></td>
                    <td className="px-3 py-2.5">
                      <input value={g?.recentFeedback || ''} onChange={(e) => changeFeedback(s, e.target.value)} placeholder="Opcional" aria-label={`Conclusión de ${s.fullName}`}
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
        <div className="p-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
          <BookOpenCheck className="w-4 h-4 text-orange-400" /> El promedio final se calcula solo (AD=4, A=3, B=2, C=1). Las familias lo ven en su portal al guardar.
        </div>
      </Card>

      {report && <ReportCard student={report} config={config} profile={ctx.profile} onClose={() => setReport(null)} />}
    </div>
  );
}
