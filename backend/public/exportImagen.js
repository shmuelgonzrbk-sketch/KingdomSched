function exportarImagen() {
  if (!D.schedule.length) { mostrarNotif('No hay programa generada', 'error'); return; }
  const contenido=document.createElement('div');
  contenido.style.cssText = 'padding:14px;background:#fff;display:inline-block;';
  contenido.innerHTML=`
  <table style="border-collapse:collapse;table-layout:fixed;font-family:Arial;font-size:9pt;border-top:1px solid #000;border-left:1px solid #000;">
    <colgroup><col style="width:64px"><col style="width:58px"><col style="width:70px"><col style="width:44px"><col style="width:210px"><col style="width:56px"><col style="width:64px"></colgroup>
    <thead><tr>
      <th style="background:#FFFFFF;color:#000;padding:8px 4px;text-align:center;border-right:1px solid #000;border-bottom:1px solid #000;font-size:9pt;font-weight:700;box-sizing:border-box;">FECHA</th>
      <th style="background:#FFFFFF;color:#000;padding:8px 4px;text-align:center;border-right:1px solid #000;border-bottom:1px solid #000;font-size:9pt;font-weight:700;box-sizing:border-box;">PRESI-<br>DENTE</th>
      <th style="background:#FFFFFF;color:#4C94D8;padding:8px 4px;text-align:center;border-right:1px solid #000;border-bottom:1px solid #000;font-size:9pt;font-weight:700;box-sizing:border-box;">ORADOR</th>
      <th style="background:#FFFFFF;color:#000;padding:8px 4px;text-align:center;border-right:1px solid #000;border-bottom:1px solid #000;font-size:9pt;font-weight:700;box-sizing:border-box;">Bosq.</th>
      <th style="background:#FFFFFF;color:#000;padding:8px 4px;text-align:center;border-right:1px solid #000;border-bottom:1px solid #000;font-size:9pt;font-weight:700;box-sizing:border-box;">TEMA</th>
      <th style="background:#FFFFFF;color:#000;padding:8px 4px;text-align:center;border-right:1px solid #000;border-bottom:1px solid #000;font-size:9pt;font-weight:700;box-sizing:border-box;">LECTOR</th>
      <th style="background:#FFFFFF;color:#000;padding:8px 4px;text-align:center;border-right:1px solid #000;border-bottom:1px solid #000;font-size:9pt;font-weight:700;box-sizing:border-box;">HOSPI-<br>TALIDAD</th>
    </tr></thead>
    <tbody>${generarFilasHTMLImagen()}</tbody>
  </table>`;
  document.body.appendChild(contenido);

  html2canvas(contenido, { scale: 2.5, backgroundColor: '#ffffff' }).then(canvas => {
    document.body.removeChild(contenido);
    const link = document.createElement('a');
    link.download = 'programa.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    mostrarNotif('Imagen descargada', 'ok');
  }).catch(e => {
    document.body.removeChild(contenido);
    mostrarNotif('Error al generar la imagen', 'error');
  });
}

function fmtFechaCompletaImagen(iso) {
  const d = new Date(iso+'T00:00:00');
  const M = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  return `${String(d.getDate()).padStart(2,'0')}<br>${M[d.getMonth()]}`;
}

function generarFilasHTMLImagen() {
  return D.schedule.map((row,idx)=>{
    const bg=idx%2===0?'#AED2F2':'#F8D8E6';
    const isEvt=row.eventType==='asamblea'||row.eventType==='conmemoracion';
    const isCir=row.eventType==='circuito';
    const g='----';
    const ora=row.orador?row.orador+(row.oradorZoom?' (Zoom)':''):g;
    const td=(c,ex='')=>`<td style="background:${bg};padding:8px 4px;text-align:center;vertical-align:middle;border-right:1px solid #000;border-bottom:1px solid #000;font-family:Arial;font-size:9pt;box-sizing:border-box;word-wrap:break-word;${ex}">${c}</td>`;
    const tdOra=c=>`<td style="background:${bg};padding:8px 4px;text-align:center;vertical-align:middle;border-right:1px solid #000;border-bottom:1px solid #000;font-family:Arial;font-size:9pt;color:#4C94D8;font-weight:700;box-sizing:border-box;word-wrap:break-word;">${c}</td>`;
    return `<tr>
      ${td('<b>'+fmtFechaCompletaImagen(row.fecha)+'</b>')}
      ${td(isEvt?g:esc(soloNombre(row.presidente))||g)}
      ${tdOra(isEvt?g:esc(ora))}
      ${td((isEvt||isCir)?g:(row.bosquejo?'N\u00b0'+esc(row.bosquejo):g))}
      ${td(isEvt?'<b>'+esc(row.tema)+'</b>':(isCir?g:esc(row.tema)),'text-align:left;padding-left:6px;')}
      ${td((isEvt||isCir)?g:esc(soloNombre(row.lector)))}
      ${td((isEvt||isCir)?g:esc(row.hospitalidad))}
    </tr>`;
  }).join('');
}

document.getElementById('btnImagen').addEventListener('click', exportarImagen);
