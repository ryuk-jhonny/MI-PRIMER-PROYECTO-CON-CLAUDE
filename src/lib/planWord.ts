// Descarga una unidad o sesión en Word con el formato del docente
// (títulos centrados, secciones numeradas y tablas, letra Century).
import {
  AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TabStopType, TextRun, WidthType,
} from 'docx';
import type { PlanDoc, SesionDoc, UnidadDoc } from './planDoc';

export interface WordInfo {
  titulo: string;
  institucion: string;
  ugel: string;
  area: string;
  nivel: string;
  grado: string;
  docente: string;
  duracion: string;
  fecha: string;
  /** "12 de octubre del 2026", al pie. */
  lugarFecha: string;
}

const FONT = 'Century';
const SIZE = 22; // 11 pt
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

const run = (text: string, opts: { bold?: boolean; size?: number } = {}) => new TextRun({ text, font: FONT, size: opts.size || SIZE, bold: opts.bold });
const para = (text: string, opts: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; before?: number } = {}) =>
  new Paragraph({ children: [run(text, opts)], alignment: opts.align, spacing: { after: opts.after ?? 60, before: opts.before ?? 0 } });
const heading = (text: string) => para(text, { bold: true, before: 200, after: 100 });
const lines = (text: string, bold = false) => (text || ' ').split('\n').map((l) => para(l, { bold, after: 40 }));
const bullets = (items: string[], mark = '•') => (items.length ? items.map((i) => para(`${mark} ${i}`, { after: 40 })) : [para('')]);

function cell(children: Paragraph[] | string, opts: { span?: number; header?: boolean; width?: number } = {}) {
  const content = typeof children === 'string' ? lines(children, opts.header) : children;
  return new TableCell({
    children: content,
    columnSpan: opts.span,
    borders: BORDERS,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.header ? { type: ShadingType.CLEAR, color: 'auto', fill: 'D9D9D9' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}
const row = (cells: TableCell[]) => new TableRow({ children: cells });
const table = (rows: TableRow[]) => new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
const headerRow = (titles: string[]) => row(titles.map((t) => cell(t, { header: true })));

const dataLine = (n: string, label: string, value: string) => new Paragraph({
  children: [run(`${n}\t${label}\t: ${value}`)],
  tabStops: [{ type: TabStopType.LEFT, position: 720 }, { type: TabStopType.LEFT, position: 3800 }],
  spacing: { after: 40 },
  indent: { left: 360 },
});

const pad = (n: number) => String(n).padStart(2, '0');

function unidadBody(d: UnidadDoc, info: WordInfo) {
  return [
    para(`UNIDAD DE APRENDIZAJE N° ${pad(d.numero)}`, { bold: true, size: 32, align: AlignmentType.CENTER, after: 80 }),
    para(`"${info.titulo.toUpperCase()}"`, { bold: true, size: 26, align: AlignmentType.CENTER, after: 200 }),
    heading('1.- DATOS INFORMATIVOS:'),
    dataLine('1.1', 'INSTITUCIÓN EDUCATIVA', info.institucion),
    dataLine('1.2', 'ÁREA CURRICULAR', info.area),
    dataLine('1.3', 'GRADO', `${info.grado} · ${info.nivel}`),
    dataLine('1.4', 'DOCENTE', info.docente),
    dataLine('1.5', 'DURACIÓN', [info.duracion, info.fecha].filter(Boolean).join(' · ')),
    heading('2.- SITUACIÓN SIGNIFICATIVA:'),
    ...d.situacion.split('\n').filter((l) => l.trim()).map((l) => para(l, { align: AlignmentType.JUSTIFIED, after: 100 })),
    para('Reto pedagógico:', { bold: true, before: 80 }),
    para(d.reto, { align: AlignmentType.JUSTIFIED }),
    heading('3.- PROPÓSITO DE APRENDIZAJE:'),
    table([
      headerRow(['COMPETENCIAS/CAPACIDADES', 'DESEMPEÑOS', 'ESTÁNDARES', 'CRITERIOS DE EVALUACIÓN']),
      ...d.proposito.map((p) => row([
        cell([para(p.competencia.toUpperCase(), { bold: true }), ...bullets(p.capacidades, '-')], { width: 25 }),
        cell(p.desempenos.map((x) => para(x, { after: 40 })), { width: 25 }),
        cell(p.estandar, { width: 25 }),
        cell(bullets(p.criterios), { width: 25 }),
      ])),
    ]),
    heading('4.- COMPETENCIAS TRANSVERSALES:'),
    table(d.transversales.flatMap((t) => [
      row([cell(t.competencia.toUpperCase(), { span: 2, header: true })]),
      row([cell(t.capacidad, { width: 35 }), cell(t.descripcion, { width: 65 })]),
    ])),
    heading('5.- MATRIZ DE ENFOQUES TRANSVERSALES:'),
    table(d.enfoques.flatMap((e) => [
      row([cell(e.enfoque.toUpperCase(), { span: 2, header: true })]),
      row([cell(e.valor, { width: 35 }), cell(bullets(e.actitudes.split('\n').map((l) => l.replace(/^[•\-*]\s*/, '')).filter(Boolean)), { width: 65 })]),
    ])),
    heading('6.- SECUENCIA DE SESIONES:'),
    table([
      headerRow(['SESIÓN', 'COMPETENCIA PRIORIZADA', 'DESEMPEÑO', 'PROPÓSITO DE LA SESIÓN', 'INSTRUMENTO DE EVALUACIÓN']),
      ...d.sesiones.map((s, i) => row([
        cell(`${i + 1}. "${s.titulo}"`),
        cell(s.competencias.join('\n')),
        cell(s.desempenos.join('\n')),
        cell(s.proposito),
        cell(bullets(s.instrumentos)),
      ])),
    ]),
    heading('7.- EVALUACIÓN.'),
    table([
      headerRow(['COMPETENCIA', 'TÉCNICA', 'INSTRUMENTO', 'DESEMPEÑOS', 'SESIÓN']),
      ...d.evaluacion.map((e) => row([cell(e.competencia), cell(e.tecnica), cell(bullets(e.instrumentos)), cell(bullets(e.desempenos)), cell(e.sesiones)])),
    ]),
    heading('8.- MATERIALES BIBLIOGRÁFICOS.'),
    ...bullets(d.bibliografia),
    para(info.lugarFecha, { align: AlignmentType.RIGHT, before: 300 }),
  ];
}

function sesionBody(d: SesionDoc, info: WordInfo) {
  const wide = (label: string, value: Paragraph[] | string, header = false) => row([cell(label, { header: true, width: 25 }), cell(value, { span: 3, header })]);
  const momento = (name: string, m: SesionDoc['inicio']) => [
    row([cell(`${name} (${m.minutos} min)`, { header: true, width: 72 }), cell('MATERIALES', { header: true, width: 28 })]),
    row([cell(m.actividades), cell(bullets(m.materiales))]),
  ];
  return [
    para(`SESIÓN DE APRENDIZAJE ${pad(d.numero)} UNIDAD ${d.unidad}`, { bold: true, size: 32, align: AlignmentType.CENTER, after: 80 }),
    para(`"${info.titulo.toUpperCase()}"`, { bold: true, size: 26, align: AlignmentType.CENTER, after: 200 }),
    heading('1.- DATOS GENERALES:'),
    table([
      row([cell('1.1 UGEL', { header: true }), cell(info.ugel), cell('1.5 NIVEL', { header: true }), cell(info.nivel)]),
      row([cell('1.2 I.E.', { header: true }), cell(info.institucion), cell('1.6 ÁREA', { header: true }), cell(info.area)]),
      row([cell('1.3 DOCENTE', { header: true }), cell(info.docente), cell('1.7 GRADO', { header: true }), cell(info.grado)]),
      row([cell('1.4 FECHA', { header: true }), cell(info.fecha), cell('1.8 DURACIÓN', { header: true }), cell(info.duracion)]),
    ]),
    heading('2.- PROPÓSITO DE APRENDIZAJE'),
    table([
      headerRow(['COMPETENCIAS', 'CAPACIDADES', 'DESEMPEÑOS', 'CRITERIOS DE EVALUACIÓN']),
      ...d.proposito.map((p) => row([
        cell([para(p.competencia.toUpperCase(), { bold: true })], { width: 25 }),
        cell(bullets(p.capacidades, '-'), { width: 25 }),
        cell(p.desempenos.map((x) => para(x, { after: 40 })), { width: 25 }),
        cell(bullets(p.criterios), { width: 25 }),
      ])),
      wide('PROPÓSITO', d.propositoTexto),
      wide('EVIDENCIA', d.evidencia),
      wide(d.transversal.competencia || 'Competencia transversal', bullets(d.transversal.capacidades, '-')),
      row([cell('ENFOQUES TRANSVERSALES', { span: 4, header: true })]),
      ...d.enfoques.map((e) => wide(e.enfoque, e.accion)),
    ]),
    heading('3.- SECUENCIA DE LA SESIÓN'),
    table([...momento('INICIO', d.inicio), ...momento('DESARROLLO', d.desarrollo), ...momento('CIERRE', d.cierre)]),
    para(info.lugarFecha, { align: AlignmentType.RIGHT, before: 300 }),
    para('RÚBRICA DE EVALUACIÓN', { bold: true, align: AlignmentType.CENTER, before: 300, after: 120 }),
    table([
      headerRow(['CRITERIO', 'LOGRO DESTACADO (4)', 'LOGRO ESPERADO (3)', 'EN PROCESO (2)', 'EN INICIO (1)']),
      ...d.rubrica.map((r) => row([cell(r.criterio), cell(r.destacado), cell(r.esperado), cell(r.proceso), cell(r.inicio)])),
    ]),
    para('OBSERVACIONES:', { bold: true, before: 240 }),
    para('…'.repeat(90)),
    para('…'.repeat(90)),
  ];
}

export function buildWord(d: PlanDoc, info: WordInfo): Document {
  return new Document({
    creator: info.docente || 'Ryuk',
    title: info.titulo,
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [{
      properties: { page: { margin: { top: 1440, bottom: 1080, left: 1080, right: 1080 } } },
      children: d.tipo === 'unidad' ? unidadBody(d, info) : sesionBody(d, info),
    }],
  });
}

export async function downloadWord(d: PlanDoc, info: WordInfo) {
  const blob = await Packer.toBlob(buildWord(d, info));
  const slug = info.titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50).toLowerCase();
  const name = d.tipo === 'unidad' ? `unidad_${d.numero}_${slug}.docx` : `sesion_${d.numero}_unidad_${d.unidad}_${slug}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
