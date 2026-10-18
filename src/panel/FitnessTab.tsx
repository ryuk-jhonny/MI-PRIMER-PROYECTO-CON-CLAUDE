import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Activity, Download, Plus, Trash2 } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { FitnessRecord } from '../lib/store';
import { friendlyError } from '../lib/firebase';
import { aulaOf, downloadCsv, imcOf } from '../lib/school';
import { Student } from '../types/education';
import { btn, Card, Empty, input, label, Modal, PageHeader } from './ui';

/** Evaluación de la condición física (área de Educación Física, competencia C3 "Asume una vida saludable"). */
export default function FitnessTab({ ctx }: { ctx: PanelCtx }) {
  const { store, students, me } = ctx;
  const aulas = useMemo(() => [...new Set(students.map(aulaOf))].sort().filter((a) => !me.aulas?.length || me.aulas.includes(a)), [students, me.aulas]);
  const [aula, setAula] = useState(aulas[0] || '');
  const [records, setRecords] = useState<FitnessRecord[] | null>(null);
  const [adding, setAdding] = useState<Student | null>(null);
  const [history, setHistory] = useState<Student | null>(null);

  const load = async () => {
    try { setRecords(await store.listFitness()); } catch (err) { ctx.toast(friendlyError(err), 'error'); setRecords([]); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const roster = students.filter((s) => aulaOf(s) === aula).sort((a, b) => a.fullName.localeCompare(b.fullName));
  const latest = (sid: string) => (records || []).find((r) => r.studentId === sid);

  const exportAula = () => downloadCsv(`evaluacion-fisica-${aula.replace(/[^\w]+/g, '-')}.csv`, [
    ['Estudiante', 'Fecha', 'Peso (kg)', 'Talla (cm)', 'IMC', 'Flexibilidad (cm)', 'Abdominales (1 min)', 'Test de Cooper (m)', 'Observaciones'],
    ...(records || []).filter((r) => r.aula === aula).map((r) => [r.studentName, r.date, r.weightKg, r.heightCm, r.imc, r.flexCm ?? '', r.abdominales ?? '', r.cooperM ?? '', r.notes]),
  ]);

  return (
    <div className="space-y-6 stagger">
      <PageHeader
        title="Evaluación física"
        subtitle="Peso, talla, IMC y pruebas de condición física. Sirve de evidencia para la competencia “Asume una vida saludable”."
        actions={aula ? <button type="button" onClick={exportAula} className={btn.secondary}><Download className="w-4 h-4" /> Exportar aula</button> : undefined}
      />
      {!aulas.length ? <Empty icon={Activity} title="Sin aulas todavía">Cuando la dirección matricule estudiantes podrás registrar sus evaluaciones.</Empty> : (
        <>
          <Card className="p-4">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5" htmlFor="fx-aula">Aula</label>
            <select id="fx-aula" value={aula} onChange={(e) => setAula(e.target.value)} className={input}>{aulas.map((a) => <option key={a}>{a}</option>)}</select>
          </Card>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Estudiante</th>
                    <th className="font-semibold px-2 py-3">Última</th>
                    <th className="font-semibold px-2 py-3">Peso</th>
                    <th className="font-semibold px-2 py-3">Talla</th>
                    <th className="font-semibold px-2 py-3">IMC</th>
                    <th className="font-semibold px-2 py-3">Flex.</th>
                    <th className="font-semibold px-2 py-3">Abd.</th>
                    <th className="font-semibold px-2 py-3">Cooper</th>
                    <th className="px-3 py-3"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {roster.map((s) => {
                    const r = latest(s.id);
                    return (
                      <tr key={s.id}>
                        <td className="px-4 py-2.5 font-semibold text-white">{s.fullName}</td>
                        <td className="px-2 py-2.5 text-center text-slate-400 tabular-nums">{r?.date || '—'}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums">{r ? `${r.weightKg} kg` : '—'}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums">{r ? `${r.heightCm} cm` : '—'}</td>
                        <td className="px-2 py-2.5 text-center font-bold text-orange-300 tabular-nums">{r?.imc || '—'}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums">{r?.flexCm ?? '—'}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums">{r?.abdominales ?? '—'}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums">{r?.cooperM ?? '—'}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <button type="button" onClick={() => setAdding(s)} className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 inline-flex items-center gap-1.5 cursor-pointer" aria-label={`Registrar evaluación de ${s.fullName}`}><Plus className="w-4 h-4" /> Registrar</button>
                          {r && <button type="button" onClick={() => setHistory(s)} className="ml-1 h-9 px-3 rounded-lg text-xs font-bold text-slate-300 hover:text-white cursor-pointer">Historial</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="p-4 border-t border-slate-800 text-xs text-slate-500">El IMC en escolares se interpreta con las tablas de IMC para la edad (OMS/MINSA); aquí se muestra el valor calculado como referencia.</p>
          </Card>
        </>
      )}

      {adding && (
        <FitnessForm student={adding} today={ctx.today} onClose={() => setAdding(null)} onSave={async (r) => {
          try { await store.saveFitness(r); setAdding(null); ctx.toast('Evaluación registrada.'); load(); } catch (err) { ctx.toast(friendlyError(err), 'error'); }
        }} />
      )}
      {history && (
        <Modal title={`Historial de ${history.fullName}`} onClose={() => setHistory(null)} wide>
          <ul className="divide-y divide-slate-800">
            {(records || []).filter((r) => r.studentId === history.id).map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-300">{r.date} · {r.weightKg} kg · {r.heightCm} cm · IMC <strong className="text-orange-300">{r.imc}</strong>{r.notes ? ` · ${r.notes}` : ''}</span>
                <button type="button" onClick={async () => { try { await store.deleteFitness(r.id); load(); } catch (err) { ctx.toast(friendlyError(err), 'error'); } }} className={btn.ghost} aria-label="Eliminar registro"><Trash2 className="w-4 h-4 text-rose-400" /></button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
}

function FitnessForm({ student, today, onClose, onSave }: { student: Student; today: string; onClose: () => void; onSave: (r: Omit<FitnessRecord, 'id' | 'ownerUid' | 'createdAt'>) => void }) {
  const [v, setV] = useState({ date: today, weightKg: '', heightCm: '', flexCm: '', abdominales: '', cooperM: '', notes: '' });
  const num = (x: string) => (x.trim() === '' ? null : Number(x.replace(',', '.')));
  const imc = imcOf(num(v.weightKg) || 0, num(v.heightCm) || 0);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      studentId: student.id, studentName: student.fullName, aula: aulaOf(student), date: v.date,
      weightKg: num(v.weightKg) || 0, heightCm: num(v.heightCm) || 0, imc, flexCm: num(v.flexCm), abdominales: num(v.abdominales), cooperM: num(v.cooperM), notes: v.notes.trim(),
    });
  };
  const field = (k: keyof typeof v, title: string, extra: Record<string, unknown> = {}) => (
    <div><label className={label} htmlFor={`fx-${k}`}>{title}</label><input id={`fx-${k}`} value={v[k]} onChange={set(k)} className={input} inputMode="decimal" {...extra} /></div>
  );

  return (
    <Modal title={`Evaluación de ${student.fullName}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {field('date', 'Fecha', { type: 'date', required: true, inputMode: undefined })}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-center"><p className="text-[11px] text-slate-400">IMC</p><p className="text-2xl font-bold text-orange-300 tabular-nums">{imc || '—'}</p></div>
          {field('weightKg', 'Peso (kg)', { required: true, pattern: '[0-9]+([.,][0-9]+)?' })}
          {field('heightCm', 'Talla (cm)', { required: true, pattern: '[0-9]+([.,][0-9]+)?' })}
          {field('flexCm', 'Flexibilidad (cm)')}
          {field('abdominales', 'Abdominales en 1 min')}
          {field('cooperM', 'Test de Cooper (m)')}
        </div>
        {field('notes', 'Observaciones', { inputMode: undefined, maxLength: 300 })}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btn.ghost}>Cancelar</button>
          <button type="submit" disabled={!imc} className={btn.primary}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}
