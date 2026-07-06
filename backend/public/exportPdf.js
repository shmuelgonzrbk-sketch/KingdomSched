function fmtFechaCompletaPdf(iso) {
  const d = new Date(iso+'T00:00:00');
  const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  return `${String(d.getDate()).padStart(2,'0')}<br>${MESES[d.getMonth()]}`;
}

function generarFilasHTMLPdf() {
  return D.schedule.map((row,idx)=>{
    const bg=idx%2===0?'#AED2F2':'#F8D8E6';
    const isEvt=row.eventType==='asamblea'||row.eventType==='conmemoracion';
    const isCir=row.eventType==='circuito';
    const g='----';
    const ora=row.orador?esc(row.orador).replace(' ','<br>')+(row.oradorZoom?'<br>(Zoom)':''):g;
    const td=(c,ex='')=>`<td style="background:${bg};padding:8px 3px;text-align:center;vertical-align:middle;border-right:0.5px solid #000;border-bottom:0.5px solid #000;font-family:Arial;font-size:7.5pt;box-sizing:border-box;word-wrap:break-word;${ex}">${c}</td>`;
    const tdOra=c=>`<td style="background:${bg};padding:8px 3px;text-align:center;vertical-align:middle;border-right:0.5px solid #000;border-bottom:0.5px solid #000;font-family:Arial;font-size:7.5pt;color:#4C94D8;font-weight:bold;box-sizing:border-box;word-wrap:break-word;">${c}</td>`;
    return `<tr>
      ${td('<b>'+fmtFechaCompletaPdf(row.fecha)+'</b>')}
      ${td(isEvt?g:esc(soloNombre(row.presidente))||g)}
      ${tdOra(isEvt?g:ora)}
      ${td((isEvt||isCir)?g:(row.bosquejo?'N\u00b0'+esc(row.bosquejo):g))}
      ${td(isEvt?'<b>'+esc(row.tema)+'</b>':(isCir?g:esc(row.tema)),'text-align:left;padding-left:5px;')}
      ${td((isEvt||isCir)?g:esc(soloNombre(row.lector)))}
      ${td((isEvt||isCir)?g:esc(row.hospitalidad))}
    </tr>`;
  }).join('');
}

function exportarPDF() {
  if (!D.schedule.length) { mostrarNotif('No hay programa generada', 'error'); return; }
  const contenido=document.createElement('div');
  contenido.style.cssText = 'padding:10px;background:#fff;display:inline-block;position:fixed;top:0;left:0;z-index:-1;';
  contenido.innerHTML=`
  <table style="border-collapse:collapse;width:480px;table-layout:fixed;font-family:Arial;font-size:7.5pt;border-top:0.5px solid #000;border-left:0.5px solid #000;">
    <colgroup><col style="width:54px"><col style="width:48px"><col style="width:58px"><col style="width:36px"><col style="width:180px"><col style="width:48px"><col style="width:56px"></colgroup>
    <thead><tr>
      <th style="background:#FFFFFF;color:#000;padding:8px 3px;text-align:center;border-right:0.5px solid #000;border-bottom:0.5px solid #000;font-size:8pt;box-sizing:border-box;">FECHA</th>
      <th style="background:#FFFFFF;color:#000;padding:8px 3px;text-align:center;border-right:0.5px solid #000;border-bottom:0.5px solid #000;font-size:8pt;box-sizing:border-box;">PRESI-<br>DENTE</th>
      <th style="background:#FFFFFF;color:#4C94D8;padding:8px 3px;text-align:center;border-right:0.5px solid #000;border-bottom:0.5px solid #000;font-size:8pt;box-sizing:border-box;">ORADOR</th>
      <th style="background:#FFFFFF;color:#000;padding:8px 3px;text-align:center;border-right:0.5px solid #000;border-bottom:0.5px solid #000;font-size:8pt;box-sizing:border-box;">Bosq.</th>
      <th style="background:#FFFFFF;color:#000;padding:8px 3px;text-align:center;border-right:0.5px solid #000;border-bottom:0.5px solid #000;font-size:8pt;box-sizing:border-box;">TEMA</th>
      <th style="background:#FFFFFF;color:#000;padding:8px 3px;text-align:center;border-right:0.5px solid #000;border-bottom:0.5px solid #000;font-size:8pt;box-sizing:border-box;">LECTOR</th>
      <th style="background:#FFFFFF;color:#000;padding:8px 3px;text-align:center;border-right:0.5px solid #000;border-bottom:0.5px solid #000;font-size:8pt;box-sizing:border-box;">HOSPI-<br>TALIDAD</th>
    </tr></thead>
    <tbody>${generarFilasHTMLPdf()}</tbody>
  </table>`;
  document.body.appendChild(contenido);

  html2canvas(contenido, { scale: 2, backgroundColor: '#ffffff' }).then(canvas => {
    document.body.removeChild(contenido);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    pdf.save('programa.pdf');
    mostrarNotif('PDF descargado', 'ok');
  }).catch(e => {
    if (document.body.contains(contenido)) document.body.removeChild(contenido);
    console.error(e);
    mostrarNotif('Error al generar el PDF', 'error');
  });
}

document.getElementById('btnPdf').addEventListener('click', exportarPDF);
