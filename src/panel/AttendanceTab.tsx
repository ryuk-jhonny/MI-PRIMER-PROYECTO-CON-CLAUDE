import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, Lock, MessageCircle, ScanLine, Search, TriangleAlert, UserCheck, XCircle } from 'lucide-react';
import type { PanelCtx } from './Panel';
import QrScanner, { feedback } from './QrScanner';
import { Avatar, Badge, btn, Card, input, PageHeader, STATUS_STYLE } from './ui';
import { AttendanceStatus, ScanResult } from '../lib/store';
import { aulaOf, downloadCsv, waLink } from '../lib/school';

type Filter = 'todos' | 'presentes' | 'tardanzas' | 'pendientes';

export default function AttendanceTab({ ctx }: { ctx: PanelCtx }) {
  const { students, todayRecords, config, me, today } = ctx;
  const [last, setLast] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>('todos');
  const [q, setQ] = useState('');
  const [aula, setAula] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const lastTimer = useRef<number>(0);
  const canEdit = me.role === 'director' || me.role === 'auxiliar';

  const recordOf = useMemo(() => new Map(todayRecords.map((r) => [r.studentId, r])), [todayRecords]);
  const aulas = useMemo(() => [...new Set(students.map(aulaOf))].sort(), [students]);

  const onCode = async (text: string) => {
    if (busy) return;
    setBusy(true);
    const res = await ctx.scan(text);
    setBusy(false);
    feedback(res.ok && !res.duplicate);
    setLast(res);
    window.clearTimeout(lastTimer.current);
    lastTimer.current = window.setTimeout(() => setLast(null), 9000);
  };

  const rows = students
    .filter((s) => (aula ? aulaOf(s) === aula : true))
    .filter((s) => (q ? `${s.fullName} ${s.dni || ''} ${s.enrollmentCode}`.toLowerCase().includes(q.toLowerCase()) : true))
    .filter((s) => {
      const r = recordOf.get(s.id);
      if (filter === 'presentes') return r && (r.status === 'Puntual' || r.status === 'Tardanza');
      if (filter === 'tardanzas') return r?.status === 'Tardanza';
      if (filter === 'pendientes') return !r;
      return true;
    })
    .sort((a, b) => {
      const ra = recordOf.get(a.id)?.time || '';
      const rb = recordOf.get(b.id)?.time || '';
      return rb.localeCompare(ra) || a.fullName.localeCompare(b.fullName);
    });

  const counts = {
    todos: students.length,
    presentes: todayRecords.filter((r) => r.status === 'Puntual' || r.status === 'Tardanza').length,
    tardanzas: todayRecords.filter((r) => r.status === 'Tardanza').length,
    pendientes: students.filter((s) => !recordOf.has(s.id)).length,
  };

  const exportDay = () => {
    downloadCsv(`asistencia-${today}.csv`, [
      ['Fecha', 'Estudiante', 'DNI', 'Grado', 'Sección', 'Estado', 'Hora', 'Registrado por'],
      ...students.map((s) => {
        const r = recordOf.get(s.id);
        return [today, s.fullName, s.dni || '', s.gradeLevel, s.section, r?.status || 'Sin registro', r?.time?.slice(0, 5) || '', r?.recordedBy || ''];
      }),
    ]);
  };

  const notifyText = (name: string, status: string, time?: string) =>
    status === 'Inasistencia'
      ? `Hola, le saludamos de ${config.shortName || config.institutionName}. Le informamos que ${name} no registró ingreso hoy. Por favor comuníquese con la institución.`
      : `Hola, le saludamos de ${config.shortName || config.institutionName}. ${name} registró su ingreso hoy a las ${time?.slice(0, 5)} (${status}).`;

  const lastStudent = last?.student;
  const lastLink = lastStudent && last?.status ? waLink(lastStudent.parentPhone, notifyText(lastStudent.fullName, last.status, last.time)) : null;

  return (
    <div className="space-y-6 stagger">
      <PageHeader
        title="Asistencia con QR"
        subtitle={`Hoy · puntual hasta las ${config.punctualCutoffTime}. Después se registra como tardanza.`}
        actions={
          <>
            <button type="button" onClick={exportDay} className={btn.secondary}><Download className="w-4 h-4" /> Exportar día</button>
            {canEdit && <button type="button" onClick={() => setConfirmClose(true)} className={btn.secondary}><Lock className="w-4 h-4" /> Cerrar día</button>}
          </>
        }
      />

      <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
        <Card className="lg:col-span-3 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <ScanLine className="w-5 h-5 text-orange-400" />
            <h2 className="font-bold text-white">Escanear carnets</h2>
          </div>
          <QrScanner onCode={onCode} paused={busy} />
        </Card>

        <Card className="lg:col-span-2 p-4 sm:p-5 flex flex-col">
          <h2 className="font-bold text-white mb-3">Última lectura</h2>
          {!last ? (
            <div className="flex-1 min-h-40 rounded-2xl border border-dashed border-slate-700 flex items-center justify-center text-center p-6 text-sm text-slate-400">
              Acerca un carnet a la cámara. Aquí verás a quién se registró y si llegó puntual.
            </div>
          ) : !last.ok ? (
            <div className="flex-1 rounded-2xl bg-rose-500/10 border border-rose-500/40 p-5 flex flex-col items-center justify-center text-center gap-2">
              <XCircle className="w-12 h-12 text-rose-400" />
              <p className="font-bold text-rose-200">No registrado</p>
              <p className="text-sm text-rose-200/80">{last.error}</p>
            </div>
          ) : (
            <div className={`flex-1 rounded-2xl p-5 border flex flex-col items-center justify-center text-center gap-3 ${last.duplicate ? 'bg-slate-800/60 border-slate-700' : last.status === 'Puntual' ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-amber-500/10 border-amber-500/40'}`}>
              {last.duplicate ? <TriangleAlert className="w-10 h-10 text-slate-300" /> : <CheckCircle2 className={`w-12 h-12 ${last.status === 'Puntual' ? 'text-emerald-400' : 'text-amber-400'}`} />}
              <Avatar src={lastStudent?.avatarUrl} name={lastStudent?.fullName || ''} className="w-16 h-16" />
              <div>
                <p className="text-lg font-bold text-white">{lastStudent?.fullName}</p>
                <p className="text-sm text-slate-400">{lastStudent?.gradeLevel} · {lastStudent?.section}</p>
              </div>
              <Badge className={STATUS_STYLE[last.status || 'Puntual']}>{last.duplicate ? `Ya registrado: ${last.status}` : last.status} · {last.time?.slice(0, 5)}</Badge>
              {lastLink && !last.duplicate && (
                <a href={lastLink} target="_blank" rel="noopener noreferrer" className={`${btn.secondary} mt-1`}><MessageCircle className="w-4 h-4 text-emerald-400" /> Avisar al apoderado</a>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 space-y-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {(['todos', 'presentes', 'tardanzas', 'pendientes'] as Filter[]).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
                className={`h-10 px-4 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer transition ${filter === f ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}`}>
                {{ todos: 'Todos', presentes: 'Presentes', tardanzas: 'Tardanzas', pendientes: 'Sin registro' }[f]} <span className="opacity-80 tabular-nums">({counts[f]})</span>
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o DNI" className={`${input} pl-9`} aria-label="Buscar estudiante" />
            </div>
            <select value={aula} onChange={(e) => setAula(e.target.value)} className={input} aria-label="Filtrar por aula">
              <option value="">Todas las aulas</option>
              {aulas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No hay estudiantes en este filtro.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {rows.slice(0, 300).map((s) => {
              const r = recordOf.get(s.id);
              const link = waLink(s.parentPhone, notifyText(s.fullName, r?.status || 'Inasistencia', r?.time || undefined));
              return (
                <li key={s.id} className="p-3 sm:px-5 flex items-center gap-3">
                  <Avatar src={s.avatarUrl} name={s.fullName} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{s.fullName}</p>
                    <p className="text-xs text-slate-400 truncate">{aulaOf(s)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r ? (
                      <>
                        <span className="hidden sm:block text-xs text-slate-400 tabular-nums">{r.time?.slice(0, 5) || '—'}</span>
                        {canEdit ? (
                          <select value={r.status} onChange={(e) => ctx.setStatus(r, e.target.value as AttendanceStatus)} aria-label={`Estado de ${s.fullName}`}
                            className={`h-9 rounded-lg border text-xs font-bold px-2 cursor-pointer bg-slate-950 ${STATUS_STYLE[r.status]}`}>
                            {(['Puntual', 'Tardanza', 'Justificada', 'Inasistencia'] as AttendanceStatus[]).map((st) => <option key={st} value={st}>{st}</option>)}
                          </select>
                        ) : (
                          <Badge className={STATUS_STYLE[r.status]}>{r.status}</Badge>
                        )}
                      </>
                    ) : (
                      <button type="button" onClick={() => ctx.registerStudent(s)} aria-label={`Registrar ingreso de ${s.fullName}`} className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 inline-flex items-center gap-1.5 cursor-pointer">
                        <UserCheck className="w-4 h-4" /> <span className="hidden sm:inline">Registrar</span>
                      </button>
                    )}
                    {link && (
                      <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp al apoderado de ${s.fullName}`} title="Escribir al apoderado por WhatsApp"
                        className="w-9 h-9 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {rows.length > 300 && <p className="p-3 text-center text-xs text-slate-500">Mostrando 300 de {rows.length}. Usa el buscador o el filtro de aula.</p>}
      </Card>

      {confirmClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80" role="dialog" aria-modal="true" aria-labelledby="close-day-title">
          <Card className="w-full max-w-md p-6 space-y-4">
            <h2 id="close-day-title" className="text-lg font-bold text-white">¿Cerrar la asistencia de hoy?</h2>
            <p className="text-sm text-slate-300">Los <strong>{counts.pendientes}</strong> estudiantes sin registro quedarán como <strong>inasistencia</strong>. Luego puedes cambiar cualquiera a “Justificada”.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmClose(false)} className={btn.ghost}>Cancelar</button>
              <button type="button" onClick={async () => { setConfirmClose(false); await ctx.closeDay(); }} className={btn.primary}>Sí, cerrar el día</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
