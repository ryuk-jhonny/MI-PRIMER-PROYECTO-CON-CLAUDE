import { useEffect, useState } from 'react';
import { AlertTriangle, BookOpenCheck, CalendarCheck, CalendarClock, ClipboardList, Clock, Compass, Megaphone, NotebookPen, PhoneOff, ScanLine, TrendingDown, UserPlus, Users, UserX } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { Avatar, btn, Card, PageHeader, Stat } from './ui';
import { levelOf } from '../lib/school';
import { EducationalLevel } from '../types/institution';
import { areaInfo, competenciasOf, LEVEL_LABEL } from '../lib/cneb';
import { nextClass, nowIn, TeacherSchedule } from '../lib/schedule';
import { NextClassCard } from './ScheduleTab';

export default function HomeTab({ ctx }: { ctx: PanelCtx }) {
  const { students, todayRecords, config, me, isDirector } = ctx;
  const role = me.role;
  const [mySchedule, setMySchedule] = useState<TeacherSchedule | null | undefined>(undefined);
  useEffect(() => {
    if (role !== 'docente') return;
    ctx.store.getMySchedule().then(setMySchedule).catch(() => setMySchedule(null));
  }, [role, ctx.store]);
  const next = mySchedule ? nextClass(mySchedule.blocks || [], nowIn(config.timeZone)) : null;
  const byStudent = new Map(todayRecords.map((r) => [r.studentId, r]));
  const present = todayRecords.filter((r) => r.status === 'Puntual' || r.status === 'Tardanza').length;
  const late = todayRecords.filter((r) => r.status === 'Tardanza').length;
  const pending = students.filter((s) => !byStudent.has(s.id)).length;
  const withHistory = students.filter((s) => s.totalDays > 0);
  const avgRate = withHistory.length ? withHistory.reduce((a, s) => a + s.attendanceRate, 0) / withHistory.length : null;

  const levels = config.activeLevels.length ? config.activeLevels : (['secundaria'] as EducationalLevel[]);
  const levelRows = levels.map((lv) => {
    const list = students.filter((s) => levelOf(s) === lv);
    const here = list.filter((s) => { const r = byStudent.get(s.id); return r && (r.status === 'Puntual' || r.status === 'Tardanza'); }).length;
    return { lv, total: list.length, here, pct: list.length ? Math.round((here / list.length) * 100) : 0 };
  });

  const lateAlerts = [...students].filter((s) => s.lateDays >= 3).sort((a, b) => b.lateDays - a.lateDays).slice(0, 5);
  const lowAttendance = students.filter((s) => s.totalDays >= 5 && s.attendanceRate < 85).sort((a, b) => a.attendanceRate - b.attendanceRate).slice(0, 5);
  const noPhone = students.filter((s) => !s.parentPhone).length;

  const dateLabel = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: config.timeZone || 'America/Lima' });
  const greetName = me.fullName;

  return (
    <div className="space-y-6 stagger">
      <PageHeader
        title={`Hola, ${greetName.split(' ').slice(0, 2).join(' ') || 'bienvenido(a)'}`}
        subtitle={`${dateLabel.charAt(0).toUpperCase()}${dateLabel.slice(1)} · Ingreso puntual hasta las ${config.punctualCutoffTime}`}
        actions={
          <>
            <button type="button" onClick={() => ctx.go('asistencia')} className={btn.primary}><ScanLine className="w-5 h-5" /> Escanear ingresos</button>
            {isDirector && <button type="button" onClick={() => ctx.go('comunicados')} className={btn.secondary}><Megaphone className="w-4 h-4" /> Comunicado</button>}
          </>
        }
      />

      {role === 'docente' && next && (
        <NextClassCard next={next} actions={<>
          <button type="button" onClick={() => ctx.go('notas')} className={btn.secondary}><BookOpenCheck className="w-4 h-4" /> Notas</button>
          <button type="button" onClick={() => ctx.go('horario')} className={btn.secondary}><CalendarClock className="w-4 h-4" /> Mi horario</button>
        </>} />
      )}
      {role === 'docente' && (mySchedule === null || (mySchedule && !mySchedule.blocks?.length)) && (
        <Card className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-orange-500/15 text-orange-300 flex items-center justify-center"><CalendarClock className="w-5 h-5" /></span>
            <div>
              <p className="font-bold text-white">Arma tu horario</p>
              <p className="text-xs text-slate-400">Así verás aquí tu próxima clase y tus estudiantes sabrán qué toca cada día.</p>
            </div>
          </div>
          <button type="button" onClick={() => ctx.go('horario')} className={btn.primary}>Armar mi horario</button>
        </Card>
      )}

      {role === 'docente' && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-white">Tus áreas</h2>
              <p className="text-xs text-slate-400 mt-0.5">Tu panel está armado con las competencias del CNEB de cada área que enseñas.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => ctx.go('planificacion')} className={btn.secondary}><NotebookPen className="w-4 h-4" /> Planificar</button>
              <button type="button" onClick={() => ctx.go('actividades')} className={btn.secondary}><ClipboardList className="w-4 h-4" /> Actividades</button>
            </div>
          </div>
          {ctx.myAreas.length === 0 ? (
            <button type="button" onClick={() => ctx.go('area')} className={`${btn.primary} mt-4`}><Compass className="w-4 h-4" /> Elige tus áreas</button>
          ) : (
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ctx.myAreas.map((a) => {
                const info = areaInfo(a);
                const lv = (me.levels?.length ? me.levels : config.activeLevels) as EducationalLevel[];
                const n = new Set(lv.flatMap((l) => competenciasOf(a, l).map((c) => c.id))).size;
                return (
                  <button key={a} type="button" onClick={() => ctx.go('area')} className="text-left p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-orange-500/60 transition cursor-pointer group">
                    <span className={`block h-1.5 w-12 rounded-full bg-gradient-to-r ${info?.tone || 'from-orange-500 to-amber-400'} group-hover:w-20 transition-all`} />
                    <span className="mt-3 block font-bold text-white">{a}</span>
                    <span className="text-xs text-slate-400">{n} competencias · {lv.map((l) => LEVEL_LABEL[l]).join(' y ')}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Matrícula" value={students.length} hint="estudiantes registrados" icon={Users} tone="sky" />
        <Stat label="Presentes hoy" value={present} hint={students.length ? `${Math.round((present / students.length) * 100)}% del total` : 'Sin alumnos aún'} icon={CalendarCheck} tone="emerald" />
        <Stat label="Tardanzas hoy" value={late} hint={`después de las ${config.punctualCutoffTime}`} icon={Clock} tone="amber" />
        <Stat label="Sin registro hoy" value={pending} hint={avgRate === null ? 'Asistencia acumulada: —' : `Asistencia acumulada: ${avgRate.toFixed(1)}%`} icon={UserX} tone="rose" />
      </div>

      {students.length === 0 && isDirector && (
        <Card className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between border-orange-500/40">
          <div>
            <h2 className="text-lg font-bold text-white">Empieza registrando a tus estudiantes</h2>
            <p className="text-sm text-slate-400 mt-1">Agrégalos uno por uno o importa tu nómina de SIAGIE en Excel. Cada alumno recibe su carnet con QR al instante.</p>
          </div>
          <button type="button" onClick={() => ctx.go('estudiantes')} className={btn.primary}><UserPlus className="w-4 h-4" /> Registrar estudiantes</button>
        </Card>
      )}

      <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
        <Card className="lg:col-span-3 p-5 sm:p-6">
          <h2 className="text-base font-bold text-white">Asistencia de hoy por nivel</h2>
          <p className="text-xs text-slate-400 mt-0.5">Se actualiza sola cada vez que alguien escanea un carnet.</p>
          <div className="mt-5 space-y-4">
            {levelRows.map((r) => (
              <div key={r.lv}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold text-slate-200">{LEVEL_LABEL[r.lv]}</span>
                  <span className="text-slate-400 tabular-nums"><strong className="text-white">{r.here}</strong> / {r.total} · {r.pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Asistencia ${LEVEL_LABEL[r.lv]}`}>
                  <div className="bar-fill h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-400 transition-[width] duration-700" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          {pending > 0 && (role === 'director' || role === 'auxiliar') && (
            <button type="button" onClick={() => ctx.go('asistencia')} className={`${btn.ghost} mt-5 -ml-3`}>Ver quién falta registrar →</button>
          )}
        </Card>

        <Card className="lg:col-span-2 p-5 sm:p-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" /> Alertas de tutoría</h2>
          <div className="mt-4 space-y-3">
            {lateAlerts.length === 0 && lowAttendance.length === 0 && noPhone === 0 && (
              <p className="text-sm text-slate-400">Sin alertas por ahora. Aquí verás tardanzas repetidas y baja asistencia.</p>
            )}
            {lateAlerts.map((s) => (
              <div key={`l-${s.id}`} className="flex items-center gap-3">
                <Avatar src={s.avatarUrl} name={s.fullName} className="w-9 h-9" />
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-white truncate">{s.fullName}</p>
                  <p className="text-xs text-amber-300">{s.lateDays} tardanzas acumuladas · {s.gradeLevel} {s.section}</p>
                </div>
              </div>
            ))}
            {lowAttendance.map((s) => (
              <div key={`a-${s.id}`} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-300 flex items-center justify-center shrink-0"><TrendingDown className="w-4 h-4" /></span>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-white truncate">{s.fullName}</p>
                  <p className="text-xs text-rose-300">Asistencia {s.attendanceRate}% · {s.absentDays} faltas</p>
                </div>
              </div>
            ))}
            {noPhone > 0 && isDirector && (
              <button type="button" onClick={() => ctx.go('estudiantes')} className="w-full text-left flex items-center gap-3 cursor-pointer">
                <span className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0"><PhoneOff className="w-4 h-4" /></span>
                <span className="text-sm text-slate-300"><strong className="text-white">{noPhone}</strong> alumnos sin celular de apoderado registrado</span>
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
