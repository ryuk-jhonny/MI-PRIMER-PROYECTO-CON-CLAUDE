import { describe, expect, it } from 'vitest';
import { bumpCounters, normalizeCode, randomCode, statusForTime, tokenFromQr, withCounters } from '../../src/lib/store';
import { Student } from '../../src/types/education';

describe('Asistencia', () => {
  it('es puntual hasta el último segundo del minuto límite', () => {
    expect(statusForTime('07:45:59', '07:45')).toBe('Puntual');
    expect(statusForTime('07:46:00', '07:45')).toBe('Tardanza');
    expect(statusForTime('06:59:00', '07:45')).toBe('Puntual');
  });

  it('cuenta las justificadas como asistencia', () => {
    const s = withCounters({} as Student, { present: 7, late: 1, absent: 1, justified: 1 });
    expect(s.totalDays).toBe(10);
    expect(s.attendanceRate).toBe(90);
  });

  it('mueve contadores al cambiar un estado', () => {
    let s = withCounters({} as Student, { present: 0, late: 0, absent: 1, justified: 0 });
    s = bumpCounters(bumpCounters(s, 'Inasistencia', -1), 'Justificada', 1);
    expect([s.absentDays, s.justifiedDays, s.totalDays, s.attendanceRate]).toEqual([0, 1, 1, 100]);
  });
});

describe('Códigos', () => {
  it('lee el token del QR del carnet', () => {
    const t = 'a'.repeat(32);
    expect(tokenFromQr(`https://ryuk.vercel.app/c/${t}`)).toBe(t);
    expect(tokenFromQr(t.toUpperCase())).toBe(t);
    expect(tokenFromQr('RYUK://STU/2026/001')).toBeNull();
  });

  it('genera códigos legibles sin letras ambiguas', () => {
    for (let i = 0; i < 50; i++) expect(randomCode(10)).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
    expect(normalizeCode(' k7mq-2pxa ')).toBe('K7MQ2PXA');
  });
});
