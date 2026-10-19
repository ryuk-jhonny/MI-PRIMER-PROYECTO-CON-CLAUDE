import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Save } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { friendlyError } from '../lib/firebase';
import { competenciasOf } from '../lib/cneb';
import { activePeriodIndex, aulaOf, LITERAL_STYLE, Literal, periodCount, periodNames, setCompGrade } from '../lib/school';
import { Plan, RubricScores, rubricScoresId } from '../lib/store';
import { Badge, btn, input, label, Modal } from './ui';
import { competencyFromRubrics } from '../lib/rubric';
import { rubricaOf } from '../lib/planDoc';

const plain = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Competencia que evalúa cada criterio: la elegida en la rúbrica, la del propósito donde está ese criterio, o la primera de la sesión. */
export function defaultLinks(p: Plan): Record<string, string> {
  const comps = competenciasOf(p.area, p.level);
  const byName = (name?: string) => (name ? comps.find((c) => plain(c.name) === plain(name) || plain(name).includes(plain(c.name)) || plain(c.name).includes(plain(name))) : undefined);
  const fallback = comps.find((c) => p.competencias.includes(c.id)) || comps[0];
  const prop = p.detalle?.tipo === 'sesion' ? p.detalle.proposito : [];
  return Object.fromEntries(rubricaOf(p).map((r, i) => {
    const fromProp = prop.find((x) => x.criterios.some((c) => plain(c) === plain(r.criterio)));
    const c = byName(r.competencia) || byName(fromProp?.competencia) || fallback;
    return [String(i), c?.id || ''];
  }));
}

export default function RubricGrade({ ctx, plan: p, plans, onClose }: { ctx: PanelCtx; plan: Plan; plans: Plan[]; onClose: () => void }) {
  const { store, config } = ctx;
  const rows = rubricaOf(p);
  const comps = competenciasOf(p.area, p.level);
  const aulas = [...new Set(ctx.students.filter((s) => s.gradeLevel === p.grade && (!p.section || s.section === p.section)).map(aulaOf))].sort();
  const [aula, setAula] = useState(aulas[0] || '');
  const [all, setAll] = useState<RubricScores[] | null>(null);
  const [links, setLinks] = useState<Record<string, string>>(() => defaultLinks(p));
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [busy, setBusy] = useState(false);
  const roster = useMemo(() => ctx.students.filter((s) => aulaOf(s) === aula).sort((a, b) => a.fullName.localeCompare(b.fullName)), [ctx.students, aula]);
  const names = periodNames(config);
  const period = names.includes(p.period) ? names.indexOf(p.period) : activePeriodIndex(config);

  useEffect(() => {
    store.listRubricScores().then(setAll).catch((err) => { ctx.toast(friendlyError(err), 'error'); setAll([]); });
  }, [store]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const found = all?.find((d) => d.id === rubricScoresId(p.id, aula));
    setScores(found?.scores || {});
    if (found?.links && Object.keys(found.links).length) setLinks((l) => ({ ...l, ...found.links }));
  }, [all, aula, p.id]);

  const linked = [...new Set(Object.values(links).filter(Boolean))].map((id) => comps.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c);
  const resultOf = (sid: string) => competencyFromRubrics([{ id: '', ownerUid: '', planId: p.id, aula, links, scores: { [sid]: scores[sid] || {} }, updatedAt: '' }])[sid] || {};

  const saveScores = async () => {
    const rec = await store.saveRubricScores({ planId: p.id, aula, links, scores });
    setAll((l) => [...(l || []).filter((d) => d.id !== rec.id), rec]);
    return rec;
  };

  const save = async () => {
    setBusy(true);
    try { await saveScores(); ctx.toast('Calificación guardada.'); } catch (err) { ctx.toast(friendlyError(err), 'error'); }
    setBusy(false);
  };

  // Junta todas las sesiones calificadas de esta área y periodo en el aula, y pone la nota de cada competencia.
  const toGrades = async () => {
    setBusy(true);
    try {
      const rec = await saveScores();
      const samePeriod = new Set(plans.filter((x) => x.kind === 'sesion' && x.area === p.area && x.period === p.period).map((x) => x.id));
      const docs = [...(all || []).filter((d) => d.id !== rec.id && d.aula === aula && samePeriod.has(d.planId)), rec];
      const result = competencyFromRubrics(docs);
      const n = periodCount(config);
      const changed = roster.filter((s) => result[s.id]).map((s) => Object.entries(result[s.id]).reduce((acc, [comp, lit]) => setCompGrade(acc, p.area, comp, period, lit, n, ctx.me.fullName), s));
      if (!changed.length) { ctx.toast('Primero califica a algún estudiante.', 'error'); setBusy(false); return; }
      await ctx.saveStudents(changed, `Notas de ${names[period] || 'el periodo'} actualizadas con ${docs.length === 1 ? 'esta rúbrica' : `${docs.length} rúbricas`} (${changed.length} estudiantes).`);
    } catch (err) { ctx.toast(friendlyError(err), 'error'); }
    setBusy(false);
  };

  return (
    <Modal title="Calificar con la rúbrica" onClose={onClose} xl>
      <p className="text-sm text-slate-300"><strong className="text-white">{p.title}</strong> · {p.area} · {p.period}</p>
      {rows.length === 0 ? <p className="text-sm text-slate-400">Esta sesión aún no tiene criterios ni rúbrica.</p> : (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="rg-aula">Aula</label>
              <select id="rg-aula" value={aula} onChange={(e) => setAula(e.target.value)} className={input}>
                {aulas.length ? aulas.map((a) => <option key={a}>{a}</option>) : <option value="">Sin estudiantes en {p.grade}</option>}
              </select>
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-white mb-1">Qué competencia evalúa cada criterio</legend>
            {rows.map((r, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr_18rem] gap-2 items-center">
                <span className="text-sm text-slate-300"><strong className="text-orange-300">C{i + 1}.</strong> {r.criterio}</span>
                <select value={links[String(i)] || ''} onChange={(e) => setLinks((l) => ({ ...l, [String(i)]: e.target.value }))} className={`${input} h-10`} aria-label={`Competencia del criterio ${i + 1}`}>
                  <option value="">Sin competencia</option>
                  {comps.map((c) => <option key={c.id} value={c.id}>C{c.n}. {c.name}</option>)}
                </select>
              </div>
            ))}
          </fieldset>
          {all === null ? <p className="text-sm text-slate-400">Cargando…</p> : roster.length === 0 ? <p className="text-sm text-slate-400">No hay estudiantes en esta aula.</p> : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-sm" style={{ minWidth: `${280 + rows.length * 72 + linked.length * 72}px` }}>
                <thead className="bg-slate-950 text-xs text-slate-400">
                  <tr>
                    <th scope="col" className="text-left px-3 py-2">Estudiante</th>
                    {rows.map((r, i) => <th key={i} scope="col" className="px-1 py-2 w-16" title={r.criterio}>C{i + 1}</th>)}
                    {linked.map((c) => <th key={c.id} scope="col" className="px-1 py-2 w-16 text-orange-300" title={c.name}>Comp. {c.n}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {roster.map((s) => {
                    const res = resultOf(s.id);
                    return (
                      <tr key={s.id}>
                        <td className="px-3 py-2 text-white">{s.fullName}</td>
                        {rows.map((_, i) => (
                          <td key={i} className="px-1 py-2 text-center">
                            <select value={scores[s.id]?.[String(i)] || ''} aria-label={`${s.fullName}, criterio ${i + 1}`}
                              onChange={(e) => setScores((x) => {
                                const row = { ...(x[s.id] || {}) };
                                if (e.target.value) row[String(i)] = Number(e.target.value); else delete row[String(i)];
                                return { ...x, [s.id]: row };
                              })}
                              className="h-10 w-14 rounded-lg border border-slate-700 bg-slate-950 text-center font-bold text-white cursor-pointer">
                              <option value="">—</option>{[4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </td>
                        ))}
                        {linked.map((c) => <td key={c.id} className="px-1 py-2 text-center"><Badge className={LITERAL_STYLE[res[c.id] || '']}>{res[c.id] || '—'}</Badge></td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-slate-500">4 logro destacado · 3 logro esperado · 2 en proceso · 1 en inicio. La nota de cada competencia es el promedio de sus criterios en todas las sesiones calificadas de {p.period} (3,5 o más = AD; 2,5 = A; 1,5 = B; menos = C).</p>
          <div className="flex justify-end gap-2 flex-wrap">
            <button type="button" onClick={save} disabled={busy || !aula} className={btn.secondary}><Save className="w-4 h-4" /> Guardar calificación</button>
            <button type="button" onClick={toGrades} disabled={busy || !aula} className={btn.primary}><ArrowRightLeft className="w-4 h-4" /> Pasar a notas de {names[period] || p.period}</button>
          </div>
        </>
      )}
    </Modal>
  );
}
