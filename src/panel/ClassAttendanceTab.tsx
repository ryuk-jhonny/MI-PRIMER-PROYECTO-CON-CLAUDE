import { useEffect, useMemo, useState } from 'react';
import { Download, ListChecks, Save, UserCheck } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { friendlyError } from '../lib/firebase';
import { aulaOf, downloadCsv } from '../lib/school';
import { nextClass, nowIn } from '../lib/schedule';
import { CLASS_MARK_LABEL, ClassAttendance, ClassMark } from '../lib/store';
import { aulaOptions } from './ScheduleTab';
import { btn, Card, Empty, input, label, PageHeader } from './ui';

const MARKS: ClassMark[] = ['P', 'T', 'F', 'J'];
const MARK_STYLE: Record<ClassMark, string> = {
  P: 'bg-emerald-600 border-emerald-500 text-white',
  T: 'bg-amber-500 border-amber-400 text-slate-950',
  F: 'bg-rose-600 border-rose-500 text-white',
  J: 'bg-sky-600 border-sky-500 text-white',
};

const fileSlug = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');

/** Conteo de marcas de un estudiante en una lista de clases. */
function tally(list: ClassAttendance[], sid: string) {
  const c = { P: 0, T: 0, F: 0, J: 0, total: 0 };
  list.forEach((r) => { const m = r.marks[sid]; if (m) { c[m]++; c.total++; } });
  const pct = c.total ? Math.round(((c.P + c.T + c.J) / c.total) * 100) : null;
  return { ...c, pct };
}

export default function ClassAttendanceTab({ ctx }: { ctx: PanelCtx }) {
  const { store, me, isDirector, students, today } = ctx;
  const aulas = aulaOptions(ctx);
  const [records, setRecords] = useState<ClassAttendance[] | null>(null);
  const [area, setArea] = useState(ctx.myAreas[0] || '');
  const [aula, setAula] = useState(aulas[0] || '');
  const [day, setDay] = useState(today);
  const [owner, setOwner] = useState(isDirector ? '' : me.uid);
  const [marks, setMarks] = useState<Record<string, ClassMark>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    store.listClassAttendance().then(setRecords).catch((err) => { ctx.toast(friendlyError(err), 'error'); setRecords([]); });
    // Si está en clase ahora (según su horario), se elige esa área y esa aula.
    if (!isDirector) {
      store.getMySchedule().then((sch) => {
        const next = sch ? nextClass(sch.blocks || [], nowIn(ctx.config.timeZone)) : null;
        if (next?.current) { setArea(next.block.area); setAula(next.block.aula); }
      }).catch(() => undefined);
    }
  }, [store]); // eslint-disable-line react-hooks/exhaustive-deps

  const roster = useMemo(() => students.filter((s) => aulaOf(s) === aula).sort((a, b) => a.fullName.localeCompare(b.fullName)), [students, aula]);
  const mine = (records || []).filter((r) => r.ownerUid === me.uid);
  const saved = mine.find((r) => r.day === day && r.area === area && r.aula === aula);

  // Al cambiar de clase o de fecha se cargan las marcas guardadas.
  useEffect(() => { setMarks(saved?.marks || {}); }, [saved?.id, saved?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const owners = [...new Map((records || []).map((r) => [r.ownerUid, r.ownerName])).entries()];
  const history = (records || []).filter((r) => r.area === area && r.aula === aula && (!owner || r.ownerUid === owner));
  const days = [...new Set(history.map((r) => r.day))].sort();
  const dirty = JSON.stringify(marks) !== JSON.stringify(saved?.marks || {});
  const marked = roster.filter((s) => marks[s.id]).length;

  const save = async () => {
    setSaving(true);
    try {
      const keep = Object.fromEntries(roster.filter((s) => marks[s.id]).map((s) => [s.id, marks[s.id]]));
      const rec = await store.saveClassAttendance({ area, aula, day, marks: keep });
      setRecords((l) => [...(l || []).filter((r) => r.id !== rec.id), rec].sort((a, b) => a.day.localeCompare(b.day)));
      ctx.toast('Asistencia de clase guardada.');
    } catch (err) { ctx.toast(friendlyError(err), 'error'); }
    setSaving(false);
  };

  const markOf = (r: ClassAttendance | undefined, sid: string) => (r?.marks[sid] ? CLASS_MARK_LABEL[r.marks[sid]] : '');
  const byDay = (d: string) => history.filter((r) => r.day === d);

  const exportAula = () => {
    const head = ['Estudiante', ...days, 'Presente', 'Tarde', 'Falta', 'Justificada', '% asistencia'];
    const rows = roster.map((s) => {
      const t = tally(history, s.id);
      return [s.fullName, ...days.map((d) => byDay(d).map((r) => markOf(r, s.id)).filter(Boolean).join(' / ')), t.P, t.T, t.F, t.J, t.pct === null ? '' : `${t.pct}%`];
    });
    downloadCsv(`asistencia_${fileSlug(area)}_${fileSlug(aula)}.csv`, [[`${area} · ${aula}`], head, ...rows]);
  };

  const exportStudent = (sid: string, name: string) => {
    const t = tally(history, sid);
    downloadCsv(`asistencia_${fileSlug(area)}_${fileSlug(name)}.csv`, [
      [`${name} · ${area} · ${aula}`],
      ['Fecha', 'Asistencia', ...(isDirector ? ['Docente'] : [])],
      ...history.filter((r) => r.marks[sid]).map((r) => [r.day, markOf(r, sid), ...(isDirector ? [r.ownerName] : [])]),
      [],
      ['Presente', t.P], ['Tarde', t.T], ['Falta', t.F], ['Justificada', t.J], ['% asistencia', t.pct === null ? '' : `${t.pct}%`],
    ]);
  };

  if (records === null) return <p className="text-sm text-slate-400">Cargando asistencia…</p>;

  return (
    <div className="space-y-6 stagger">
      <PageHeader
        title="Asistencia de clase"
        subtitle={isDirector ? 'La asistencia que toma cada docente en su área. La de la puerta está en «Asistencia QR».' : 'Tu asistencia por área y aula. Solo la ven tú y la dirección.'}
      />

      <Card className="p-5 grid sm:grid-cols-3 gap-3">
        <div>
          <label className={label} htmlFor="ca-area">Área</label>
          <select id="ca-area" value={area} onChange={(e) => setArea(e.target.value)} className={input}>
            {ctx.myAreas.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="ca-aula">Aula</label>
          <select id="ca-aula" value={aula} onChange={(e) => setAula(e.target.value)} className={input}>
            {aulas.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="ca-day">Fecha</label>
          <input id="ca-day" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value || today)} className={input} />
        </div>
      </Card>

      {ctx.myAreas.length === 0 ? (
        <Empty icon={ListChecks} title="Primero elige tus áreas" action={<button type="button" onClick={() => ctx.go('area')} className={btn.primary}>Elegir mis áreas</button>}>La asistencia de clase se toma por área.</Empty>
      ) : roster.length === 0 ? (
        <Empty icon={ListChecks} title="No hay estudiantes en esta aula">Cuando la dirección matricule estudiantes en {aula || 'el aula'}, aparecerán aquí.</Empty>
      ) : (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-bold text-white">Tomar asistencia</h2>
              <p className="text-xs text-slate-400">{marked} de {roster.length} marcados{saved ? ' · ya guardada, puedes corregirla' : ''}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => setMarks(Object.fromEntries(roster.map((s) => [s.id, marks[s.id] || 'P'])))} className={btn.secondary}><UserCheck className="w-4 h-4" /> Todos presentes</button>
              <button type="button" onClick={save} disabled={saving || !dirty || marked === 0} className={btn.primary}><Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar asistencia'}</button>
            </div>
          </div>
          <ul className="divide-y divide-slate-800">
            {roster.map((s) => (
              <li key={s.id} className="py-2.5 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm font-semibold text-white min-w-0">{s.fullName}</span>
                <div role="group" aria-label={`Asistencia de ${s.fullName}`} className="flex gap-1.5">
                  {MARKS.map((m) => (
                    <button key={m} type="button" aria-pressed={marks[s.id] === m} aria-label={`${s.fullName}: ${CLASS_MARK_LABEL[m]}`} title={CLASS_MARK_LABEL[m]}
                      onClick={() => setMarks((x) => ({ ...x, [s.id]: m }))}
                      className={`w-11 h-11 rounded-xl border text-sm font-bold cursor-pointer transition ${marks[s.id] === m ? MARK_STYLE[m] : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>{m}</button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">P presente · T tarde · F falta · J justificada</p>
        </Card>
      )}

      {roster.length > 0 && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-bold text-white">Resumen de {area} · {aula}</h2>
              <p className="text-xs text-slate-400">{days.length === 1 ? '1 clase registrada' : `${days.length} clases registradas`}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {isDirector && (
                <select value={owner} onChange={(e) => setOwner(e.target.value)} className={`${input} sm:w-56`} aria-label="Docente">
                  <option value="">Todos los docentes</option>
                  {owners.map(([uid, name]) => <option key={uid} value={uid}>{name}</option>)}
                </select>
              )}
              <button type="button" onClick={exportAula} disabled={!days.length} className={btn.secondary}><Download className="w-4 h-4" /> Exportar aula (Excel)</button>
            </div>
          </div>
          {days.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th scope="col" className="py-2 pr-2">Estudiante</th>
                    {MARKS.map((m) => <th key={m} scope="col" className="py-2 px-2 text-center" title={CLASS_MARK_LABEL[m]}>{m}</th>)}
                    <th scope="col" className="py-2 px-2 text-center">%</th>
                    <th scope="col" className="py-2 pl-2"><span className="sr-only">Exportar</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {roster.map((s) => {
                    const t = tally(history, s.id);
                    return (
                      <tr key={s.id}>
                        <td className="py-2 pr-2 text-white">{s.fullName}</td>
                        {MARKS.map((m) => <td key={m} className="py-2 px-2 text-center tabular-nums text-slate-300">{t[m]}</td>)}
                        <td className="py-2 px-2 text-center tabular-nums font-semibold text-white">{t.pct === null ? '—' : `${t.pct}%`}</td>
                        <td className="py-2 pl-2 text-right">
                          <button type="button" onClick={() => exportStudent(s.id, s.fullName)} disabled={!t.total} aria-label={`Exportar asistencia de ${s.fullName}`} className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-slate-300 hover:bg-slate-800 cursor-pointer disabled:opacity-40"><Download className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
