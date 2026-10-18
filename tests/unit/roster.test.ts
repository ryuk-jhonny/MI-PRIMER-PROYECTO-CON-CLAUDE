import { describe, expect, it } from 'vitest';
import { parseRoster } from '../../src/lib/roster';
import { DEFAULT_INSTITUTION_CONFIG } from '../../src/types/institution';

describe('Importar nómina', () => {
  const cfg = DEFAULT_INSTITUTION_CONFIG;

  it('lee filas pegadas desde Excel (tabulaciones) y salta el encabezado', () => {
    const rows = parseRoster('DNI\tApellidos y nombres\tNivel\tGrado\tSección\n12345678\tQuispe Mamani Ana\tPrimaria\t3\tB\tRosa Mamani\t987654321', cfg);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ dni: '12345678', fullName: 'Quispe Mamani Ana', gradeLevel: '3ro Primaria', section: 'B', parentPhone: '987654321', error: '' });
  });

  it('acepta punto y coma y grados escritos', () => {
    const [r] = parseRoster('87654321;Torres Ruiz Luis;Secundaria;Quinto;A', cfg);
    expect(r.gradeLevel).toBe('5to Secundaria');
    expect(r.error).toBe('');
  });

  it('marca errores sin inventar datos', () => {
    const rows = parseRoster('123;Ana Paz;Primaria;2;A\n11112222;;Primaria;2;A\n22223333;Juan Soto;Secundaria;6;A', cfg);
    expect(rows.map((r) => r.error)).toEqual(['DNI debe tener 8 dígitos', 'Falta el nombre', 'No existe 6.° de Secundaria en Configuración']);
    expect(rows[0].parentPhone).toBe('');
  });
});
