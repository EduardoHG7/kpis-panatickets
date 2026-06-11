// build_data.js — Genera los datos estaticos del dashboard desde un Excel.
// Uso:  node build_data.js "ruta\al\REPORTE MENSUAL PT.xlsx"
// Reutiliza la logica de updater.js (la misma del boton "Actualizar datos")
// y escribe los resultados en index.html y all_eventos.js.

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const xlsxPath = process.argv[2];
if (!xlsxPath || !fs.existsSync(xlsxPath)) {
  console.error('Uso: node build_data.js "ruta\\al\\reporte.xlsx"');
  process.exit(1);
}

// ── Globals que updater.js espera (los del navegador) ─────────────────────────
globalThis.MONTHLY = {};
globalThis.ALL_EVENTOS = {};
globalThis.TOP_EVENTOS = {};
globalThis.VS_DATA = {};
globalThis.CANCEL_DATA = {};
globalThis.TASA_DATA = {};
globalThis.KPI_DRILLDOWN = {};
globalThis.BY_DIA = {};
globalThis.BY_HORA = {};
globalThis.PAGO_LABELS = [];
globalThis.PAGO_DATA = [];
globalThis.PAGO_POR_MES = { labels: [], datasets: [] };
globalThis.MES_NAMES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
globalThis.XLSX = XLSX;
globalThis.buildAnualCharts = () => {};
globalThis.renderAnual = () => {};
globalThis.document = { querySelector: () => null, getElementById: () => null };
globalThis.prompt = () => '';
globalThis.alert = () => {};

// Cargar updater.js (define processExcel)
eval(fs.readFileSync(path.join(__dirname, 'updater.js'), 'utf8'));

// ── Leer el Excel (todas las hojas con columnas de transacciones) ─────────────
const wb = XLSX.readFile(xlsxPath);
let rows = [];
wb.SheetNames.forEach(name => {
  const r = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: 0 });
  const cols = r.length ? Object.keys(r[0]) : [];
  if (cols.includes('TransactionDate') || cols.includes('Mes')) rows = rows.concat(r);
});
console.log('Filas leidas:', rows.length);

const info = processExcel(rows);
console.log('Meses detectados:', info.months.map(m => MES_NAMES[m]).join(', '));
info.months.forEach(m => {
  const d = MONTHLY[m];
  console.log('  ' + MES_NAMES[m] + ': total=$' + Math.round(d.total).toLocaleString('en-US') +
    ' · tickets=' + d.tvend.toLocaleString('en-US') + ' · cancelados=' + d.tcan.toLocaleString('en-US') +
    ' · eventos=' + d.eventos);
});

// ── Redondear montos para no incrustar floats largos ──────────────────────────
const round2 = v => (typeof v === 'number' && !Number.isInteger(v)) ? Math.round(v * 100) / 100 : v;
const deepRound = o => {
  if (Array.isArray(o)) return o.map(deepRound);
  if (o && typeof o === 'object') { const r = {}; for (const k in o) r[k] = deepRound(o[k]); return r; }
  return round2(o);
};
const js = o => JSON.stringify(deepRound(o));

// Top 10 metodos de pago (la grafica usa 10 colores)
const pagoLabels = PAGO_LABELS.slice(0, 10);
const pagoData = PAGO_DATA.slice(0, 10);
const PAGO_COLORS = ['#3d8ef8', '#5ba3ff', '#14c8b4', '#9b6dff', '#22c47a', '#f5a623', '#f0484a', '#e0869a', '#a78bfa', '#34d399'];

// ── Escribir all_eventos.js ────────────────────────────────────────────────────
const allEvPath = path.join(__dirname, 'all_eventos.js');
fs.writeFileSync(allEvPath,
  '// Generado por build_data.js desde: ' + path.basename(xlsxPath) + '\n' +
  '// Fecha: ' + new Date().toISOString().substring(0, 10) + '\n' +
  'var ALL_EVENTOS = ' + js(ALL_EVENTOS) + ';\n');
console.log('Escrito:', allEvPath);

// ── Escribir el bloque de datos en index.html ─────────────────────────────────
const htmlPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const start = html.indexOf('const MONTHLY={');
const end = html.indexOf('const CONCLUSIONES=');
if (start === -1 || end === -1 || end < start) {
  console.error('ERROR: no se encontraron los marcadores const MONTHLY= / const CONCLUSIONES= en index.html');
  process.exit(1);
}
const block =
  'const MONTHLY=' + js(MONTHLY) + ';\n' +
  'const TOP_EVENTOS=' + js(TOP_EVENTOS) + ';\n' +
  'const VS_DATA=' + js(VS_DATA) + ';\n' +
  'const CANCEL_DATA=' + js(CANCEL_DATA) + ';\n' +
  'const TASA_DATA=' + js(TASA_DATA) + ';\n' +
  'const BY_DIA=' + js(BY_DIA) + ';\n' +
  'const BY_HORA=' + js(BY_HORA) + ';\n' +
  'const PAGO_LABELS=' + js(pagoLabels) + ';\n' +
  'const PAGO_DATA=' + js(pagoData) + ';\n' +
  'const PAGO_COLORS=' + js(PAGO_COLORS) + ';\n' +
  'const PAGO_POR_MES=' + js(PAGO_POR_MES) + ';\n' +
  'const KPI_DRILLDOWN=' + js(KPI_DRILLDOWN) + ';\n';
html = html.substring(0, start) + block + html.substring(end);

// Pie de la barra lateral: rango de meses y numero de registros
const maxMes = Math.max(...info.months);
html = html.replace(/Ene&ndash;\w+ 2026 &middot; [\d,]+ reg\./,
  'Ene&ndash;' + MES_NAMES[maxMes].substring(0, 3) + ' 2026 &middot; ' + rows.length.toLocaleString('en-US') + ' reg.');

fs.writeFileSync(htmlPath, html);
console.log('Escrito:', htmlPath);
console.log('\nListo. Abre index.html y veras todos los meses sin necesidad de cargar el Excel.');
