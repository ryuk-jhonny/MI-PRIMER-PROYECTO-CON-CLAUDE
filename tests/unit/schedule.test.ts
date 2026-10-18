import { describe, expect, it } from 'vitest';
import { blockError, ClassBlock, conflicts, nextClass, nowIn, OwnedBlock } from '../../src/lib/schedule';

const b = (id: string, day: number, start: string, end: string, aula = '3ro Primaria · A', area = 'Matemática'): ClassBlock =>
  ({ id, day: day as ClassBlock['day'], start, end, aula, area });
const o = (owner: string, x: ClassBlock): OwnedBlock => ({ ...x, ownerUid: owner, ownerName: owner });

describe('horario', () => {
  it('no deja guardar horas al revés ni clases que se cruzan', () => {
    expect(blockError(b('1', 1, '09:00', '08:00'), [])).toMatch(/después/);
    expect(blockError(b('2', 1, '08:30', '09:15'), [b('1', 1, '08:00', '08:45')])).toMatch(/Se cruza/);
    expect(blockError(b('2', 1, '08:45', '09:30'), [b('1', 1, '08:00', '08:45')])).toBe('');
    expect(blockError(b('2', 2, '08:00', '08:45'), [b('1', 1, '08:00', '08:45')])).toBe('');
  });

  it('avisa cuando dos docentes tienen la misma aula a la misma hora', () => {
    const list = [
      o('ana', b('1', 1, '08:00', '08:45')),
      o('luis', b('2', 1, '08:30', '09:15', '3ro Primaria · A', 'Ciencia y Tecnología')),
      o('luis', b('3', 1, '08:00', '08:45', '4to Primaria · A')),
    ];
    const c = conflicts(list);
    expect(c).toHaveLength(1);
    expect(c[0].map((x) => x.ownerUid).sort()).toEqual(['ana', 'luis']);
  });

  it('da la clase en curso o la próxima, aunque sea otro día', () => {
    const week = [b('1', 1, '08:00', '08:45'), b('2', 1, '10:00', '10:45'), b('3', 3, '08:00', '08:45')];
    expect(nextClass(week, { day: 1, time: '08:10' })).toMatchObject({ current: true, block: { id: '1' } });
    expect(nextClass(week, { day: 1, time: '09:00' })).toMatchObject({ current: false, today: true, block: { id: '2' } });
    expect(nextClass(week, { day: 1, time: '11:00' })).toMatchObject({ today: false, block: { id: '3' } });
    expect(nextClass(week, { day: 6, time: '11:00' })).toMatchObject({ block: { id: '1' } });
    expect(nextClass([], { day: 1, time: '08:00' })).toBeNull();
  });

  it('usa la hora del colegio', () => {
    // 2026-10-19 13:30 UTC es lunes 08:30 en Lima.
    expect(nowIn('America/Lima', new Date('2026-10-19T13:30:00Z'))).toEqual({ day: 1, time: '08:30' });
  });
});
