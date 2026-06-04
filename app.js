const charts={};
let filtEvt=[];
let curMes={resumen:1,eventos:1,estatus:1,tiempo:1,conclusiones:1};
let cmpMeses=new Set();

function destroyChart(id){if(charts[id]){charts[id].destroy();delete charts[id];}}

function kpiCard(cls,label,val,sub){
  return '<div class="kpi-card '+cls+'"><div class="kpi-label">'+label+'</div><div class="kpi-value">'+val+'</div>'+(sub?'<div class="kpi-sub">'+sub+'</div>':'')+'</div>';
}

function nav(id,btn){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  $(id).classList.add('active');btn.classList.add('active');
  if(id==='resumen')renderResumen();
  if(id==='eventos')renderEventos();
  if(id==='estatus')renderEstatus();
  if(id==='tiempo')renderTiempo();
  if(id==='conclusiones')renderConclusiones();
}

function selMes(sec,mes,btn){
  const map={tiempo:'tMonthSel',eventos:'eMonthSel',estatus:'stMonthSel',conclusiones:'cMonthSel',resumen:'rMonthSel'};
  $(map[sec]).querySelectorAll('.ms-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');curMes[sec]=mes;
  if(sec==='resumen')renderResumen();
  if(sec==='eventos')renderEventos();
  if(sec==='estatus')renderEstatus();
  if(sec==='tiempo')renderTiempo();
  if(sec==='conclusiones')renderConclusiones();
}

function toggleCmp(mes){
  if(mes===0){cmpMeses.clear();document.querySelectorAll('[id^=cmp]').forEach(b=>b.classList.remove('active'));$('cmp0').classList.add('active');}
  else{
    $('cmp0').classList.remove('active');
    if(cmpMeses.has(mes)){cmpMeses.delete(mes);$('cmp'+mes).classList.remove('active');}
    else{cmpMeses.add(mes);$('cmp'+mes).classList.add('active');}
    if(cmpMeses.size===0)$('cmp0').classList.add('active');
  }
  renderResumen();
}

function openKpiPanel(key,title,colLabel,isMoney){
  const m=curMes.resumen;
  const data=KPI_DRILLDOWN[m]&&KPI_DRILLDOWN[m][key]?KPI_DRILLDOWN[m][key]:[];
  if(!data||data.length===0)return;
  const total=data.reduce((s,r)=>s+r.v,0);
  $('kpiPanelTitle').textContent=title;
  $('kpiPanelSub').textContent=colLabel+' · Top 10 eventos · '+(m===0?'General Ene–May':MES_NAMES[m]+' 2026');
  $('kpiPanelColHdr').textContent=colLabel;
  $('kpiPanelBody').innerHTML=data.map((r,i)=>'<tr><td><span class="rn">'+(i+1)+'</span></td><td>'+r.e+'</td><td class="rt" style="font-weight:500">'+(isMoney?fmt(r.v):fmtn(r.v))+'</td><td class="rt" style="color:var(--muted)">'+(total>0?((r.v/total)*100).toFixed(1)+'%':'&mdash;')+'</td></tr>').join('');
  $('kpiPanel').style.transform='translateY(0)';
  $('kpiPanelBg').style.display='block';
}

function closeKpiPanel(){$('kpiPanel').style.transform='translateY(100%)';$('kpiPanelBg').style.display='none';}

function renderResumen(){
  const m=curMes.resumen;const d=MONTHLY[m];const mnm=MES_NAMES[m];
  $('rMeta').textContent=mnm+' 2026';
  const tcrit=d.tcan+d.tvend;const taxaCan=tcrit>0?((d.tcan/tcrit)*100).toFixed(1):'0.0';
  const ck=(cls,lbl,val,sub,key,isMoney,tip)=>{
    const hasData=KPI_DRILLDOWN[m]&&KPI_DRILLDOWN[m][key]&&KPI_DRILLDOWN[m][key].length>0;
    const badge=hasData?'<span style="position:absolute;top:10px;right:10px;background:rgba(61,142,248,0.15);color:var(--accent2);font-size:9px;padding:2px 6px;border-radius:10px;font-weight:500">TOP 10 ▸</span>':'';
    const oc=hasData?' onclick="openKpiPanel(\''+key+'\',\''+lbl+'\',\''+(tip||lbl)+'\','+isMoney+')"':'';
    return '<div class="kpi-card '+cls+'" style="'+(hasData?'cursor:pointer;':'')+'position:relative"'+oc+'>'+badge+'<div class="kpi-label">'+lbl+'</div><div class="kpi-value">'+val+'</div>'+(sub?'<div class="kpi-sub">'+sub+'</div>':'')+'</div>';
  };
  $('rKpis').innerHTML=
    '<div class="kpi-grid">'+
      ck('kc-a','Total General',fmtK(d.total),'Precio+CxS+SPAC+ITBMS','total',true,'Total neto ($)')+
      ck('kc-g','Precio base neto',fmtK(d.precio),(((d.precio/d.total)*100).toFixed(1))+'% del total','precio',true,'Precio base ($)')+
      kpiCard('kc-t','CxS neto',fmtK(d.cxs),'TFee')+
      kpiCard('kc-am','SPAC neto',fmtK(d.spac),'extFee2')+
      kpiCard('kc-p','ITBMS neto',fmtK(d.itbms),'extFee3')+
    '</div><div class="kpi-grid">'+
      kpiCard('kc-a','Eventos activos',d.eventos,'')+
      ck('kc-g','Tickets vendidos',fmtn(d.tvend),fmt(d.vcVend),'tvend',false,'Tickets vendidos')+
      ck('kc-r','Tickets cancelados',fmtn(d.tcan),fmt(d.vcCan)+' · '+taxaCan+'%','tcan',false,'Tickets cancelados')+
      (d.cortJuegos>0?ck('kc-t','Cortesias IV Juegos',fmtn(d.cortJuegos),'','cort_j',false,'Tickets IV Juegos'):kpiCard('kc-t','Tasa cancelacion',taxaCan+'%',''))+
      ck('kc-am','Cortesias comerciales',fmtn(d.cortCom),'Precio $0','cort',false,'Tickets cortesia')+
    '</div><div class="kpi-grid">'+
      kpiCard('kc-a','Ticket promedio','$'+d.tprom.toFixed(2),'Total neto / tickets pagados')+
      kpiCard('kc-t','Boletos por orden',d.bprom.toFixed(2)+' btos','Promedio por compra')+
      kpiCard('kc-g','Venta efectiva total',fmt(d.vcVend),'Sin cancelaciones')+
      kpiCard('kc-r','Valor reembolsado',fmt(d.vcCan),fmtn(d.tcan)+' tickets')+
      kpiCard('kc-am','% Reembolsado',((d.vcCan/(d.total||1))*100).toFixed(1)+'%','Del total facturado')+
    '</div>';
  destroyChart('rDonut');
  charts.rDonut=new Chart($('cRDonut'),{
    type:'doughnut',
    data:{labels:['Precio','CxS','SPAC','ITBMS'],datasets:[{data:[d.precio,d.cxs,d.spac,d.itbms],backgroundColor:['#3d8ef8','#14c8b4','#f5a623','#9b6dff'],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+c.label+': '+fmt(c.raw)+' ('+((c.raw/(d.total||1))*100).toFixed(1)+'%)'}}}}
  });
  $('rInsight1').innerHTML='<div class="it">Composicion</div>El precio base representa el <strong>'+((d.precio/(d.total||1))*100).toFixed(1)+'%</strong> del total en '+mnm+'.';
  const pcVend=tcrit>0?((d.tvend/tcrit)*100).toFixed(1):100;
  $('rVsPanel').innerHTML=
    '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px"><span style="color:var(--green)">Vendidos — '+fmtn(d.tvend)+'</span><span style="color:var(--muted)">'+pcVend+'%</span></div><div class="sbt"><div class="sbf" style="width:'+pcVend+'%;background:var(--green)"></div></div></div>'+
    '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px"><span style="color:var(--red)">Cancelados — '+fmtn(d.tcan)+'</span><span style="color:var(--muted)">'+taxaCan+'%</span></div><div class="sbt"><div class="sbf" style="width:'+taxaCan+'%;background:var(--red)"></div></div></div>'+
    '<div style="border-top:1px solid var(--border);padding-top:10px;display:flex;flex-direction:column;gap:6px">'+
      '<div style="display:flex;justify-content:space-between;font-size:12px"><span>Venta efectiva</span><span style="color:var(--green);font-weight:500">'+fmt(d.vcVend)+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;font-size:12px"><span>Valor cancelado</span><span style="color:var(--red);font-weight:500">'+fmt(d.vcCan)+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;font-size:12px"><span>Impacto</span><span style="color:var(--amber);font-weight:500">'+((d.vcCan/(d.precio||1))*100).toFixed(1)+'% del bruto</span></div>'+
    '</div>';
  $('rInsight2').innerHTML='<div class="it">Cancelaciones</div>Impacto de <strong>'+fmt(d.vcCan)+' ('+((d.vcCan/(d.precio||1))*100).toFixed(1)+'% del bruto)</strong>. '+(parseFloat(taxaCan)>8?'Tasa elevada.':'Dentro del rango normal.');
  destroyChart('rCmp');
  const allM=[m,...[...cmpMeses].filter(c=>c!==m&&c>=1&&c<=5)].sort();const hasCmp=allM.length>1;
  $('rCmpTitle').textContent=hasCmp?'Comparativo: '+allM.map(x=>MES_NAMES[x]).join(' vs '):'Evolucion mensual';
  charts.rCmp=new Chart($('cRCmp'),{
    type:'bar',
    data:{
      labels:hasCmp?allM.map(x=>MES_NAMES[x]):MES_NAMES.slice(1),
      datasets:[
        {label:'Total',data:hasCmp?allM.map(x=>MONTHLY[x].total):[1,2,3,4,5].map(x=>MONTHLY[x].total),backgroundColor:hasCmp?allM.map((_,i)=>i===0?'rgba(61,142,248,0.8)':'rgba(155,109,255,0.6)'):MES_COLORS.map(c=>c+'cc'),borderRadius:5},
        {label:'Venta efectiva',data:hasCmp?allM.map(x=>MONTHLY[x].vcVend):[1,2,3,4,5].map(x=>MONTHLY[x].vcVend),backgroundColor:'rgba(34,196,122,0.5)',borderRadius:5}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fmt(c.raw)}}},scales:{x:{ticks:TICK,grid:{display:false},border:{display:false}},y:{ticks:{...TICK,callback:v=>fmtK(v)},grid:{color:GRID},border:{display:false}}}}
  });
}

function renderEventos(){
  const m=curMes.eventos;const isGen=m===0;const mnm=isGen?'General Ene–May':MES_NAMES[m]+' 2026';
  filtEvt=[...ALL_EVENTOS[m]];
  $('eChartSub').textContent=isGen?'Enero–Mayo 2026 · Acumulado anual':mnm+' · Eventos comerciales';
  $('eTblTitle').textContent='Tabla completa — '+filtEvt.length+' eventos · '+mnm;
  const top10=TOP_EVENTOS[m].filter(e=>e.cat==='com').slice(0,10);
  destroyChart('eTop');
  charts.eTop=new Chart($('cETop'),{
    type:'bar',
    data:{labels:top10.map(e=>e.e),datasets:[{label:'Total',data:top10.map(e=>e.tot),backgroundColor:top10.map((_,i)=>`hsla(${215+i*10},78%,${62-i*3}%,0.88)`),borderRadius:5,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{bottom:30}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmt(c.raw)}}},
      scales:{x:{ticks:{...TICK,font:{family:'DM Sans',size:10},maxRotation:40,callback:function(val){const l=this.getLabelForValue(val);return l.length>16?l.substring(0,14)+'…':l;}},grid:{display:false},border:{display:false}},y:{ticks:{...TICK,callback:v=>fmtK(v)},grid:{color:GRID},border:{display:false}}}}
  });
  const topEvt=top10[0];const baseTotal=isGen?2864629:MONTHLY[m].total;
  const pctTop=topEvt?((topEvt.tot/baseTotal)*100).toFixed(1):0;
  $('eInsight').innerHTML='<div class="it">Concentracion</div><strong>'+(topEvt?topEvt.e:'—')+' concentra el '+pctTop+'%</strong> del total '+(isGen?'anual':'del mes')+' ('+(topEvt?fmtK(topEvt.tot):'—')+' de '+fmtK(baseTotal)+'). '+(pctTop>40?'Alta concentracion.':pctTop>25?'Concentracion moderada.':'Distribucion saludable.');
  renderEvtTable(filtEvt);
}

function renderEvtTable(data){
  const maxTot=Math.max(...data.filter(e=>e.cat==='com').map(e=>e.tot),1);
  $('eBody').innerHTML=data.map((e,i)=>`<tr>
    <td><span class="rn">${i+1}</span></td>
    <td>${e.e}${e.cat==='com'?'<span class="bi" style="width:'+Math.max(4,(e.tot/maxTot)*70)+'px"></span>':''}</td>
    <td><span class="tag ${e.cat==='juegos'?'tag-j':'tag-c'}">${e.cat==='juegos'?'IV Juegos':'Comercial'}</span></td>
    <td class="rt">${fmtn(e.t)}</td><td class="rt">${fmt(e.p)}</td><td class="rt">${fmt(e.c)}</td>
    <td class="rt">${fmt(e.s)}</td><td class="rt">${fmt(e.i)}</td>
    <td class="rt" style="font-weight:500;color:${e.tot>100000?'#3d8ef8':e.tot>0?'var(--text)':'var(--muted)'}">${fmt(e.tot)}</td>
  </tr>`).join('');
}

function filterEvt(){const q=$('eSrch').value.toLowerCase();filtEvt=TOP_EVENTOS[curMes.eventos].filter(e=>e.e.toLowerCase().includes(q));renderEvtTable(filtEvt);}

function closeModal(){$('evModal').classList.remove('open');}

function renderEstatus(){
  const m=curMes.estatus;const mnm=MES_NAMES[m];
  $('stCancelSub').textContent=mnm+' 2026';
  $('stVsSub').textContent=mnm+' 2026 · Valor en dólares';
  const cdata=CANCEL_DATA[m]||[];const vsdata=VS_DATA[m]||[];const tdata=TASA_DATA[m]||[];
  destroyChart('stCancel');
  if(cdata.length>0){
    charts.stCancel=new Chart($('cStCancel'),{
      type:'bar',
      data:{labels:cdata.map(e=>e.e),datasets:[{label:'Cancelado',data:cdata.map(e=>e.vcan),backgroundColor:'rgba(240,72,74,0.75)',borderRadius:4,borderSkipped:false}]},
      options:{responsive:true,maintainAspectRatio:false,layout:{padding:{bottom:28}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmt(c.raw)}}},
        scales:{x:{ticks:{...TICK,font:{family:'DM Sans',size:9},maxRotation:40,callback:function(val){const l=this.getLabelForValue(val);return l.length>14?l.substring(0,12)+'…':l;}},grid:{display:false},border:{display:false}},y:{ticks:{...TICK,callback:v=>fmtK(v)},grid:{color:GRID},border:{display:false}}}}
    });
  }
  $('stInsight1').innerHTML='<div class="it">Hallazgo</div>'+(cdata[0]?'<strong>'+cdata[0].e+'</strong> lidera con '+fmt(cdata[0].vcan)+' cancelado':'Sin datos de cancelación')+' en '+mnm+'.';
  $('stTasaList').innerHTML=tdata.length>0?tdata.map(t=>'<div><div class="ph"><span class="pn">'+t.e+'</span><span class="pv">'+t.rate+'%</span></div><div class="pt"><div class="pf" style="width:'+Math.min(t.rate,100)+'%;background:'+t.color+'"></div></div></div>').join(''):'<div style="color:var(--muted);font-size:12px">Sin datos.</div>';
  const highRate=tdata.filter(t=>t.rate>20);
  $('stInsight2').innerHTML='<div class="it">Tasas anómalas</div>'+(highRate.length>0?'<strong>'+highRate.map(t=>t.e+' ('+t.rate+'%)').join(', ')+'</strong> por encima del promedio.':'Tasas dentro de rangos normales.');
  destroyChart('stVs');
  if(vsdata.length>0){
    charts.stVs=new Chart($('cStVs'),{
      type:'bar',
      data:{labels:vsdata.map(e=>e.e),datasets:[
        {label:'Vendidos',data:vsdata.map(e=>e.vend),backgroundColor:'rgba(34,196,122,0.75)',borderRadius:4,borderSkipped:false},
        {label:'Cancelados',data:vsdata.map(e=>e.vcan),backgroundColor:'rgba(240,72,74,0.75)',borderRadius:4,borderSkipped:false}
      ]},
      options:{responsive:true,maintainAspectRatio:false,layout:{padding:{bottom:28}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fmt(c.raw)}}},
        scales:{x:{ticks:{...TICK,font:{family:'DM Sans',size:9},maxRotation:40,callback:function(val){const l=this.getLabelForValue(val);return l.length>14?l.substring(0,12)+'…':l;}},grid:{display:false},border:{display:false}},y:{ticks:{...TICK,callback:v=>fmtK(v)},grid:{color:GRID},border:{display:false}}}}
    });
  }
}

function renderTiempo(){
  const m=curMes.tiempo;const isGen=m===0;
  const mnm=isGen?'General (Ene–May)':MES_NAMES[m]+' 2026';
  $('tDiaSub').textContent=mnm;
  let diasData;
  if(isGen){
    const all=[];
    [1,2,3,4,5].forEach(mes=>{if(BY_DIA[mes])BY_DIA[mes].forEach(r=>all.push({label:MES_NAMES[mes].substring(0,3)+' '+String(r.d).padStart(2,'0'),tot:r.tot,can:r.can,vend:r.vend}));});
    diasData=all;
  } else {
    diasData=(BY_DIA[m]||[]).map(r=>({label:String(r.d).padStart(2,'0'),tot:r.tot,can:r.can,vend:r.vend}));
  }
  const horaData=BY_HORA[m]||BY_HORA[1]||[];
  destroyChart('tDia');destroyChart('tDia2');destroyChart('tHora');
  charts.tDia=new Chart($('cTDia'),{
    type:'line',
    data:{labels:diasData.map(d=>d.label),datasets:[{label:'Total',data:diasData.map(d=>d.tot),borderColor:'#3d8ef8',backgroundColor:'rgba(61,142,248,0.06)',fill:true,tension:0.35,pointRadius:isGen?1:3,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmt(c.raw)}}},
      scales:{x:{ticks:{...TICK,font:{family:'DM Sans',size:isGen?8:10},maxRotation:45,autoSkip:isGen},grid:{color:GRID},border:{display:false}},y:{ticks:{...TICK,callback:v=>fmtK(v)},grid:{color:GRID},border:{display:false}}}}
  });
  const maxDay=diasData.length>0?diasData.reduce((a,b)=>b.tot>a.tot?b:a,diasData[0]):{label:'—',tot:0};
  $('tInsight1').innerHTML='<div class="it">Patrón diario</div>Día de mayor venta: <strong>'+maxDay.label+' con '+fmt(maxDay.tot)+'</strong>.';
  charts.tDia2=new Chart($('cTDia2'),{
    type:'bar',
    data:{labels:diasData.map(d=>d.label),datasets:[
      {label:'Vendidos',data:diasData.map(d=>d.vend),backgroundColor:'rgba(61,142,248,0.7)',borderRadius:2},
      {label:'Cancelados',data:diasData.map(d=>d.can),backgroundColor:'rgba(240,72,74,0.8)',borderRadius:2}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fmtn(c.raw)}}},
      scales:{x:{ticks:{...TICK,font:{family:'DM Sans',size:isGen?8:10},maxRotation:45,autoSkip:isGen},grid:{display:false},border:{display:false}},y:{ticks:TICK,grid:{color:GRID},border:{display:false}}}}
  });
  if(horaData.length>0){
    const maxH=horaData.reduce((a,b)=>b.t>a.t?b:a,horaData[0]);
    charts.tHora=new Chart($('cTHora'),{
      type:'bar',
      data:{labels:horaData.map(h=>h.h+'h'),datasets:[{label:'Tickets',data:horaData.map(h=>h.t),backgroundColor:horaData.map(h=>`rgba(61,142,248,${0.25+(h.t/maxH.t)*0.75})`),borderRadius:3}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmtn(c.raw)+' tkts'}}},
        scales:{x:{ticks:{...TICK,font:{family:'DM Sans',size:10}},grid:{display:false},border:{display:false}},y:{ticks:TICK,grid:{color:GRID},border:{display:false}}}}
    });
    $('tInsight2').innerHTML='<div class="it">Franja pico</div><strong>'+maxH.h+':00h — '+fmtn(maxH.t)+' tickets</strong>. La franja 9h–17h concentra la mayoría de transacciones.';
    $('tHeatLabels').innerHTML='';$('tHeatGrid').innerHTML='';
    const maxT=Math.max(...horaData.map(h=>h.t));
    horaData.forEach(h=>{
      const l=document.createElement('div');l.className='hll';l.textContent=h.h+'h';$('tHeatLabels').appendChild(l);
      const c=document.createElement('div');c.className='hc';
      c.style.background=`rgba(61,142,248,${0.05+(h.t/maxT)*0.93})`;
      c.setAttribute('data-tip',h.h+'h — '+fmtn(h.t)+' tkts · '+fmt(h.tot));
      $('tHeatGrid').appendChild(c);
    });
  }
}

function renderConclusiones(){
  const m=curMes.conclusiones;const d=CONCLUSIONES[m];
  const kpis=m===0?
    kpiCard('kc-a','Total neto 5 meses','$2.86M','Ene–May 2026')+kpiCard('kc-g','Precio base neto','$2.32M','')+kpiCard('kc-r','Valor cancelado','$703K','10,513 tickets')+kpiCard('kc-t','Tickets pagados','87,936',''):
    m===1?kpiCard('kc-a','Total neto Enero','$488K','')+kpiCard('kc-g','Precio base','$404K','')+kpiCard('kc-r','Cancelado','$12K','785 tickets')+kpiCard('kc-am','Eventos','46',''):
    m===2?kpiCard('kc-a','Total neto Febrero','$461K','')+kpiCard('kc-g','Precio base','$381K','')+kpiCard('kc-r','Cancelado','$31K','660 tickets')+kpiCard('kc-am','Eventos','57',''):
    m===3?kpiCard('kc-a','Total neto Marzo','$1.25M','')+kpiCard('kc-g','Precio base','$991K','')+kpiCard('kc-r','Cancelado','$151K','2,772 tickets')+kpiCard('kc-am','Eventos','110',''):
    m===4?kpiCard('kc-a','Total neto Abril','$416K','')+kpiCard('kc-g','Precio base','$341K','')+kpiCard('kc-r','Cancelado','$431K','5,376 tickets')+kpiCard('kc-am','Eventos','94',''):
    kpiCard('kc-a','Total neto Mayo','$245K','')+kpiCard('kc-g','Precio base','$208K','')+kpiCard('kc-r','Cancelado','$78K','920 tickets')+kpiCard('kc-am','Eventos','54','');
  $('concContent').innerHTML=
    '<div class="kpi-grid kpi-grid-4" style="margin-bottom:18px">'+kpis+'</div>'+
    '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:22px">'+
      '<div style="font-family:\'DM Serif Display\',serif;font-size:20px;margin-bottom:16px">'+(d?d.title:'')+'</div>'+
      '<div class="conc-grid">'+(d?d.items.map(i=>'<div class="ci"><span class="ctag '+i.tag+'">'+i.tagTxt+'</span><div class="cn">'+i.num+'</div><div class="ctitle">'+i.title+'</div><div class="cbody">'+i.body+'</div></div>').join(''):'')+'</div>'+
    '</div>';
}

// ── Initialize annual charts ──────────────────────────────────────────────
const pagoColors=['#3d8ef8','#5ba3ff','#14c8b4','#9b6dff','#22c47a'];

charts.anualLine=new Chart($('cAnualLine'),{
  type:'line',
  data:{labels:['Enero','Febrero','Marzo','Abril','Mayo'],datasets:[
    {label:'Total neto',data:[488416,460930,1253995,416447,244841],borderColor:'#3d8ef8',backgroundColor:'rgba(61,142,248,0.08)',fill:true,tension:0.35,pointRadius:5,borderWidth:2},
    {label:'Precio base',data:[403794,380825,991075,340738,208463],borderColor:'#22c47a',backgroundColor:'rgba(34,196,122,0.06)',fill:true,tension:0.35,pointRadius:5,borderWidth:2}
  ]},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fmt(c.raw)}}},
    scales:{x:{ticks:TICK,grid:{color:GRID},border:{display:false}},y:{ticks:{...TICK,callback:v=>fmtK(v)},grid:{color:GRID},border:{display:false}}}}
});

charts.anualBar=new Chart($('cAnualBar'),{
  type:'bar',
  data:{labels:['Enero','Febrero','Marzo','Abril','Mayo'],datasets:[
    {label:'Vendidos',data:[19764,19440,24224,18262,6246],backgroundColor:MES_COLORS.map(c=>c+'cc'),borderRadius:4},
    {label:'Cancelados',data:[785,660,2772,5376,920],backgroundColor:'rgba(240,72,74,0.75)',borderRadius:4}
  ]},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fmtn(c.raw)}}},
    scales:{x:{ticks:TICK,grid:{display:false},border:{display:false}},y:{ticks:{...TICK,callback:v=>fmtn(v)},grid:{color:GRID},border:{display:false}}}}
});

charts.anualPago=new Chart($('cAnualPago'),{
  type:'bar',
  data:{labels:PAGO_LABELS,datasets:[{label:'Total neto',data:PAGO_DATA,backgroundColor:PAGO_COLORS,borderRadius:4,borderSkipped:false}]},
  options:{responsive:true,maintainAspectRatio:false,layout:{padding:{bottom:28}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmt(c.raw)}}},
    scales:{x:{ticks:{...TICK,font:{family:'DM Sans',size:9},maxRotation:35,callback:function(val){const l=this.getLabelForValue(val);return l.length>10?l.substring(0,9)+'…':l;}},grid:{display:false},border:{display:false}},y:{ticks:{...TICK,callback:v=>fmtK(v)},grid:{color:GRID},border:{display:false}}}}
});

$('pagoLegend').innerHTML=PAGO_POR_MES.datasets.map((d,i)=>'<div class="li"><span class="ld" style="background:'+pagoColors[i]+'"></span>'+d.label+'</div>').join('');

charts.anualPagoLine=new Chart($('cAnualPagoLine'),{
  type:'line',
  data:{labels:PAGO_POR_MES.labels,datasets:PAGO_POR_MES.datasets.map((d,i)=>Object.assign({},d,{borderColor:pagoColors[i],backgroundColor:'transparent',tension:0.35,pointRadius:4,borderWidth:2}))},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fmt(c.raw)}}},
    scales:{x:{ticks:TICK,grid:{color:GRID},border:{display:false}},y:{ticks:{...TICK,callback:v=>fmtK(v)},grid:{color:GRID},border:{display:false}}}}
});

// Initial render
renderResumen();
renderEventos();
renderEstatus();
renderTiempo();
renderConclusiones();
