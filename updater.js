// updater.js — Panatickets Dashboard · Actualizador de datos desde Excel

function handleFileSelect(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const btn = document.getElementById('uploadBtn');
  btn.textContent = '⏳ Procesando…';
  btn.disabled = true;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      // Leer TODAS las hojas que tengan columnas de transacciones
      // (antes solo se leia la primera hoja y se perdian datos en otras)
      let rows = [];
      const sheetInfo = [];
      wb.SheetNames.forEach(name => {
        const r = XLSX.utils.sheet_to_json(wb.Sheets[name], {defval:0});
        const cols = r.length ? Object.keys(r[0]) : [];
        const ok = cols.includes('TransactionDate') || cols.includes('Mes');
        sheetInfo.push(name + (ok ? ' ✓' : ' ✗') + ' (' + r.length + ' filas)');
        if (ok) rows = rows.concat(r);
      });
      console.log('[Updater] Hojas: ' + sheetInfo.join(' | '));
      if (rows.length === 0) {
        throw new Error('Ninguna hoja del Excel tiene columnas "Mes" o "TransactionDate". Hojas: ' + sheetInfo.join(', '));
      }
      const info = processExcel(rows);
      const mesesTxt = info.months.map(m => (MES_NAMES[m] || m).toString().substring(0, 3)).join(', ');
      btn.innerHTML = '✅ ' + info.sales.toLocaleString('es-PA') + ' filas · ' + mesesTxt;
      btn.setAttribute('style', '--upload-ok:1');
      btn.classList.add('upload-ok');
      setTimeout(() => {
        btn.textContent = '📂 Actualizar datos';
        btn.classList.remove('upload-ok');
        btn.disabled = false;
      }, 6000);
    } catch(err) {
      btn.textContent = '❌ Error al procesar';
      btn.disabled = false;
      console.error('[Updater] Error:', err);
      alert('Error al procesar el Excel:\n\n' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
  evt.target.value = '';
}

// ── Helpers ────────────────────────────────────────────────────────────────────
// Acepta fechas como numero serial de Excel, objeto Date o texto
const _toDate = v => {
  if (v === null || v === undefined || v === '' || v === 0) return null;
  if (typeof v === 'number') return new Date((v - 25569) * 86400000);
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const _toMonth  = v => { const d = _toDate(v); return d ? d.getMonth() + 1 : 0; };
const _toDay    = v => { const d = _toDate(v); return d ? d.getDate() : 0; };
const _toHour   = v => {
  if (typeof v === 'number') return Math.floor((v % 1) * 24);
  const d = _toDate(v);
  return d ? d.getHours() : 0;
};
const _sumF     = (arr, f) => arr.reduce((t, r) => t + (r[f] || 0), 0);
const _isJuegos = n => n && /IV JUEGOS|JUEGOS SURAMERICANOS/i.test(n);

function processExcel(rows) {
  const MES_TXT = {enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
  // Una fecha solo es usable si trae anio real; el export crudo del sistema
  // a veces guarda solo la hora en TransactionDate (fraccion < 1)
  const _plausible = v => { const d = _toDate(v); return (d && d.getFullYear() >= 2020 && d.getFullYear() <= 2100) ? d : null; };
  // Clasificar venta vs cancelacion: TransactionType (Sale/Refund) es lo mas
  // confiable; si no existe, usar los campos C* como en el formato original
  const _esCancel = r => r.TransactionType ? /refund|cancel/i.test(r.TransactionType) : ((r.CQty > 0 || Math.abs(r.CTotal || 0) > 0) && !(r.STotal > 0));
  rows.forEach(r => {
    let m = r['Mes'];
    if (typeof m === 'string') {
      const t = m.trim().toLowerCase();
      m = MES_TXT[t] !== undefined ? MES_TXT[t] : parseInt(t, 10);
      r['Mes'] = isNaN(m) ? 0 : m;
    }
    if (!(r['Mes'] >= 1)) {
      const d = _plausible(r.TransactionDate);
      if (d) r['Mes'] = d.getMonth() + 1;
    }
    r._cancel = _esCancel(r);
  });

  // Si hay ventas sin mes identificable (export crudo sin columna "Mes" y sin
  // fecha valida), preguntar al usuario a que mes corresponde el archivo
  const sinMes = rows.filter(r => !r._cancel && !(r['Mes'] >= 1) && ((r.STotal > 0) || (r.SQty > 0)));
  if (sinMes.length > 0) {
    const resp = prompt(
      'El Excel tiene ' + sinMes.length.toLocaleString('es-PA') + ' filas de venta sin columna "Mes" ni fecha valida.\n\n' +
      'Si TODO el archivo corresponde a un solo mes, escribe el numero del mes (1=Enero ... 12=Diciembre).\n' +
      'Deja vacio o cancela para omitir esas filas.', '');
    const mFix = parseInt(resp, 10);
    if (mFix >= 1 && mFix <= 12) {
      rows.forEach(r => { if (!(r['Mes'] >= 1)) r['Mes'] = mFix; });
    }
  }

  const sales  = rows.filter(r => !r._cancel && r['Mes'] >= 1);
  const cxRows = rows.filter(r => r._cancel);
  // Meses detectados automaticamente en el Excel (soporta junio y siguientes)
  const MONTHS = [...new Set(sales.map(r => Number(r['Mes'])).filter(m => m >= 1 && m <= 12))].sort((a, b) => a - b);
  console.log('[Updater] Filas de venta: ' + sales.length + ' · cancelaciones: ' + cxRows.length + ' · meses detectados: ' + MONTHS.join(','));
  if (MONTHS.length === 0) {
    throw new Error('No se pudo determinar el mes de ninguna fila: el Excel no tiene columna "Mes" y TransactionDate no trae fecha valida. Agrega una columna "Mes" al archivo o indica el mes cuando se te pregunte al cargarlo.');
  }

  // Agrupar cancelaciones por mes (columna Mes, fecha valida o mes indicado)
  const cancelByMes = {};
  MONTHS.forEach(m => cancelByMes[m] = []);
  cxRows.forEach(r => {
    let m = r['Mes'] >= 1 ? Number(r['Mes']) : 0;
    if (!m) { const d = _plausible(r.TransactionDate); if (d) m = d.getMonth() + 1; }
    if (cancelByMes[m]) cancelByMes[m].push(r);
  });

  // ── MONTHLY ──────────────────────────────────────────────────────────────────
  MONTHS.forEach(m => {
    const ms      = sales.filter(r => r['Mes'] === m);
    const cx      = cancelByMes[m];
    const paid    = ms.filter(r => r.STotal > 0);
    const cortCom = ms.filter(r => r.STotal === 0 && !_isJuegos(r.EventName));
    const cortJ   = ms.filter(r => r.STotal === 0 &&  _isJuegos(r.EventName));
    const vcVend  = _sumF(paid, 'STotal');
    const vcCan   = Math.abs(_sumF(cx, 'CTotal'));
    const tvend   = _sumF(paid, 'SQty');
    const orderIds = new Set(paid.map(r => r.OrderID)).size;

    MONTHLY[m] = {
      total:      vcVend - vcCan,
      precio:     _sumF(paid,'STickets') + _sumF(cx,'CTickets'),
      cxs:        _sumF(paid,'TFee')     + _sumF(cx,'CTFee'),
      spac:       _sumF(paid,'extFee2')  + _sumF(cx,'CextFee2'),
      itbms:      _sumF(paid,'extFee3')  + _sumF(cx,'CextFee3'),
      tvend,
      tcan:       _sumF(cx,'CQty'),
      cortCom:    _sumF(cortCom,'SQty'),
      cortJuegos: _sumF(cortJ,'SQty'),
      vcVend, vcCan,
      eventos:    new Set(paid.map(r => r.EventName)).size,
      tprom:      tvend > 0 ? parseFloat((vcVend / tvend).toFixed(2)) : 0,
      bprom:      orderIds > 0 ? parseFloat((tvend / orderIds).toFixed(2)) : 0
    };
  });

  // ── ALL_EVENTOS & TOP_EVENTOS ─────────────────────────────────────────────────
  const _buildList = (filteredSales) => {
    const byEvt = {};
    filteredSales.filter(r => r.STotal > 0).forEach(r => {
      if (!byEvt[r.EventName]) byEvt[r.EventName] = {
        e:r.EventName, t:0, p:0, c:0, s:0, i:0, tot:0,
        cat: _isJuegos(r.EventName) ? 'juegos' : 'com'
      };
      const ev = byEvt[r.EventName];
      ev.t += r.SQty||0; ev.p += r.STickets||0; ev.c += r.TFee||0;
      ev.s += r.extFee2||0; ev.i += r.extFee3||0; ev.tot += r.STotal||0;
    });
    // Entrada especial para cortesías IV Juegos
    const jQty = filteredSales
      .filter(r => r.STotal === 0 && _isJuegos(r.EventName))
      .reduce((s,r) => s + (r.SQty||0), 0);
    if (jQty > 0) {
      byEvt['IV JUEGOS SURAMERICANOS'] = {
        e:'IV JUEGOS SURAMERICANOS', t:jQty, p:0, c:0, s:0, i:0, tot:0, cat:'juegos'
      };
    }
    return Object.values(byEvt).sort((a,b) => b.tot - a.tot);
  };

  ALL_EVENTOS[0] = _buildList(sales);
  TOP_EVENTOS[0] = ALL_EVENTOS[0];
  MONTHS.forEach(m => {
    const list = _buildList(sales.filter(r => r['Mes'] === m));
    ALL_EVENTOS[m] = list;
    TOP_EVENTOS[m] = list;
  });

  // ── VS_DATA / CANCEL_DATA / TASA_DATA ─────────────────────────────────────────
  MONTHS.forEach(m => {
    const paid = sales.filter(r => r['Mes']===m && r.STotal>0);
    const cx   = cancelByMes[m];
    const soldV={}, soldQ={}, canV={}, canQ={};

    paid.forEach(r => {
      soldV[r.EventName] = (soldV[r.EventName]||0) + r.STotal;
      soldQ[r.EventName] = (soldQ[r.EventName]||0) + r.SQty;
    });
    cx.forEach(r => {
      canV[r.EventName] = (canV[r.EventName]||0) + Math.abs(r.CTotal||0);
      canQ[r.EventName] = (canQ[r.EventName]||0) + (r.CQty||0);
    });

    const evtsCon = Object.keys(canV).filter(e => canV[e] > 0);
    VS_DATA[m]     = evtsCon.map(e=>({e, vend:soldV[e]||0, vcan:canV[e]})).sort((a,b)=>b.vcan-a.vcan).slice(0,10);
    CANCEL_DATA[m] = evtsCon.map(e=>({e, tcan:canQ[e]||0, vcan:canV[e]})).sort((a,b)=>b.vcan-a.vcan).slice(0,10);

    const todosEvts = [...new Set([...Object.keys(soldQ), ...Object.keys(canQ)])];
    TASA_DATA[m] = todosEvts
      .filter(e => canQ[e] > 0)
      .map(e => {
        const s = soldQ[e]||0, c = canQ[e]||0;
        const rate = parseFloat(((c / (s + c)) * 100).toFixed(1));
        return {e, rate, color: rate>50?'#f0484a':rate>20?'#e74c3c':rate>8?'#f5a623':'#22c47a'};
      })
      .sort((a,b) => b.rate - a.rate)
      .slice(0,10);
  });

  // ── KPI_DRILLDOWN ──────────────────────────────────────────────────────────────
  MONTHS.forEach(m => {
    const paid  = sales.filter(r=>r['Mes']===m && r.STotal>0);
    const cx    = cancelByMes[m];
    const cortC = sales.filter(r=>r['Mes']===m && r.STotal===0 && !_isJuegos(r.EventName));
    const cortJ = sales.filter(r=>r['Mes']===m && r.STotal===0 &&  _isJuegos(r.EventName));

    const _agg = (rows, flds) => {
      const o = {};
      rows.forEach(r => {
        if (!o[r.EventName]) o[r.EventName] = {};
        flds.forEach(f => o[r.EventName][f] = (o[r.EventName][f]||0) + (r[f]||0));
      });
      return o;
    };
    const pa = _agg(paid,  ['STotal','STickets','SQty']);
    const ca = _agg(cx,    ['CQty']);
    const cc = _agg(cortC, ['SQty']);
    const cj = _agg(cortJ, ['SQty']);
    const top10 = (o,k) => Object.entries(o).map(([e,d])=>({e,v:d[k]||0})).sort((a,b)=>b.v-a.v).slice(0,10);

    KPI_DRILLDOWN[m] = {
      total:  top10(pa,'STotal'), precio: top10(pa,'STickets'),
      tvend:  top10(pa,'SQty'),   tcan:   top10(ca,'CQty'),
      cort:   top10(cc,'SQty'),   cort_j: top10(cj,'SQty')
    };
  });

  // KPI_DRILLDOWN[0] general
  const paidAll  = sales.filter(r=>r.STotal>0);
  const cxAll    = cxRows;
  const cortCAll = sales.filter(r=>r.STotal===0 && !_isJuegos(r.EventName));
  const cortJAll = sales.filter(r=>r.STotal===0 &&  _isJuegos(r.EventName));
  const _aggAll  = (rows, flds) => {
    const o={};rows.forEach(r=>{if(!o[r.EventName])o[r.EventName]={};flds.forEach(f=>o[r.EventName][f]=(o[r.EventName][f]||0)+(r[f]||0));});return o;
  };
  const paA=_aggAll(paidAll,['STotal','STickets','SQty']);
  const caA=_aggAll(cxAll,['CQty']);
  const ccA=_aggAll(cortCAll,['SQty']);
  const cjA=_aggAll(cortJAll,['SQty']);
  const top10A=(o,k)=>Object.entries(o).map(([e,d])=>({e,v:d[k]||0})).sort((a,b)=>b.v-a.v).slice(0,10);
  KPI_DRILLDOWN[0] = {
    total:  top10A(paA,'STotal'), precio: top10A(paA,'STickets'),
    tvend:  top10A(paA,'SQty'),   tcan:   top10A(caA,'CQty'),
    cort:   top10A(ccA,'SQty'),   cort_j: top10A(cjA,'SQty')
  };

  // ── BY_DIA ────────────────────────────────────────────────────────────────────
  MONTHS.forEach(m => {
    const ms = sales.filter(r => r['Mes'] === m);
    const cx = cancelByMes[m];
    const byDay = {};
    const _dia = r => { if (r['Día'] >= 1) return r['Día']; const d = _toDate(r.TransactionDate); return (d && d.getFullYear() >= 2020) ? d.getDate() : 0; };
    ms.forEach(r => {
      const d = _dia(r);
      if (!d) return; // sin fecha valida no se puede ubicar el dia
      if (!byDay[d]) byDay[d] = {d, tot:0, vend:0, can:0};
      byDay[d].tot  += r.STotal||0;
      byDay[d].vend += r.SQty||0;
    });
    cx.forEach(r => {
      const d = _dia(r);
      if (!d) return;
      if (!byDay[d]) byDay[d] = {d, tot:0, vend:0, can:0};
      byDay[d].can += r.CQty||0;
    });
    BY_DIA[m] = Object.values(byDay).sort((a,b) => a.d - b.d);
  });

  // ── BY_HORA ───────────────────────────────────────────────────────────────────
  MONTHS.forEach(m => {
    const ms = sales.filter(r => r['Mes']===m && r.STotal>0);
    const byH = {};
    let conHora = 0;
    for (let h = 0; h < 24; h++) byH[h] = {h, t:0, tot:0};
    ms.forEach(r => {
      if (!_plausible(r.TransactionDate)) return; // sin fecha-hora valida
      const h = _toHour(r.TransactionDate);
      byH[h].t   += r.SQty||0;
      byH[h].tot += r.STotal||0;
      conHora++;
    });
    // solo sobreescribir si hubo datos con hora; si no, conservar lo previo
    if (conHora > 0) BY_HORA[m] = Object.values(byH);
  });

  // ── PAGO data ─────────────────────────────────────────────────────────────────
  const pagoAgg = {};
  sales.filter(r => r.STotal > 0).forEach(r => {
    const pm = (r.PMDetail && r.PMDetail.toString().trim()) ? r.PMDetail.toString().trim() : (r.PaymentMethod || 'Otros');
    pagoAgg[pm] = (pagoAgg[pm]||0) + r.STotal;
  });
  const sortedPago = Object.entries(pagoAgg).sort((a,b) => b[1] - a[1]);
  PAGO_LABELS.splice(0, PAGO_LABELS.length, ...sortedPago.map(p => p[0]));
  PAGO_DATA.splice(0, PAGO_DATA.length,     ...sortedPago.map(p => p[1]));

  const top5Pm = sortedPago.slice(0,5).map(p => p[0]);
  const pagoC  = ['#3d8ef8','#5ba3ff','#14c8b4','#9b6dff','#22c47a'];
  PAGO_POR_MES.labels   = MONTHS.map(m => MES_NAMES[m] || ('Mes ' + m));
  PAGO_POR_MES.datasets = top5Pm.map((pm, i) => ({
    label: pm,
    data: MONTHS.map(m =>
      sales.filter(r => r['Mes']===m && r.STotal>0 &&
        (r.PMDetail===pm || r.PaymentMethod===pm))
        .reduce((s,r) => s + r.STotal, 0)
    ),
    borderColor: pagoC[i]
  }));

  // ── Re-render ─────────────────────────────────────────────────────────────────
  const sbf = document.querySelector('.sidebar-footer');
  if (sbf && MONTHS.length > 0) {
    const maxM = Math.max(...MONTHS);
    sbf.innerHTML = '<span class="dot"></span>Ene&ndash;' + (MES_NAMES[maxM] || ('Mes ' + maxM)).substring(0, 3) + ' 2026 &middot; ' + rows.length.toLocaleString('es-PA') + ' reg.';
  }
  _refreshAnualCharts();
  const sec = document.querySelector('.section.active');
  if (sec) {
    const id = sec.id;
    if      (id === 'resumen')     renderResumen();
    else if (id === 'eventos')     renderEventos();
    else if (id === 'estatus')     renderEstatus();
    else if (id === 'tiempo')      renderTiempo();
    else if (id === 'conclusiones') renderConclusiones();
  }

  return { months: MONTHS, sales: sales.length, cancels: cxRows.length };
}

function _refreshAnualCharts() {
  // Las graficas anuales y la tabla comparativa se reconstruyen desde MONTHLY
  // con los meses que existan (definidas en app.js)
  buildAnualCharts();
  renderAnual();
}
