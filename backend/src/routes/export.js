const router           = require('express').Router();
const { requireAuth }  = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma           = new PrismaClient();
const {
  Document, Packer, Table, TableRow, TableCell, Paragraph,
  TextRun, WidthType, AlignmentType, ShadingType, HeightRule,
  VerticalAlign, PageOrientation, TableAnchorType
} = require('docx');

const NAVY  = '1A2744';
const BLUE  = 'AED2F2';
const PINK  = 'F8D8E6';
const TEAL  = '0099CC';
const WHITE = 'FFFFFF';
const BLACK = '000000';
const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
               'JULIO','AGOSTO','SEPTIEMB','OCTUBRE','NOVIEMBRE','DICIEMB'];

function fmtFecha(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2,'0')} ${MESES[d.getMonth()]}`;
}

// anchos exactos del Word original en DXA
const COLS = [1317, 1117, 1347, 993, 4347, 1085, 1185];
const TABLE_W = 11391;

function makeCell(content, bg, opts = {}) {
  const isHeader = bg === NAVY;
  const color    = opts.color || (isHeader ? WHITE : BLACK);
  const size     = 22; // 11pt igual que el original

  let runs = [];
  if (Array.isArray(content)) {
    content.forEach((item, i) => {
      if (i > 0 && item.break) runs.push(new TextRun({ break: 1 }));
      runs.push(new TextRun({
        text:  item.text || '',
        bold:  item.bold  !== undefined ? item.bold  : (opts.bold || false),
        color: item.color || color,
        size,
        font:  'Arial',
      }));
    });
  } else {
    runs = [new TextRun({
      text:  String(content || ''),
      bold:  opts.bold || false,
      color,
      size,
      font:  'Arial',
    })];
  }

  return new TableCell({
    shading: {
      type:  ShadingType.CLEAR,
      color: 'auto',
      fill:  bg
    },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: opts.w, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 108, right: 108 },
    children: [new Paragraph({
      alignment: opts.left ? AlignmentType.LEFT : AlignmentType.CENTER,
      children:  runs
    })]
  });
}

router.get('/word', requireAuth, async (req, res) => {
  const [schedule, bosquejos] = await Promise.all([
    prisma.schedule.findMany({ where: { userId: req.user.id }, orderBy: { orden: 'asc' } }),
    prisma.bosquejo.findMany({ where: { activo: true } })
  ]);
  const bosqMap = Object.fromEntries(bosquejos.map(b => [b.id, b.tema]));

  const headerRow = new TableRow({
    tableHeader: true,
    height: { value: 800, rule: HeightRule.AT_LEAST },
    children: [
      makeCell([{text:'FECHA',    bold:true}], NAVY, { w:COLS[0] }),
      makeCell([{text:'PRESI-',   bold:true},{text:'DENTE', bold:true, break:1}], NAVY, { w:COLS[1] }),
      makeCell([{text:'ORADOR',   bold:true, color:TEAL}], NAVY, { w:COLS[2] }),
      makeCell([{text:'Bosq.',    bold:true}], NAVY, { w:COLS[3] }),
      makeCell([{text:'TEMA',     bold:true}], NAVY, { w:COLS[4] }),
      makeCell([{text:'LECTOR',   bold:true}], NAVY, { w:COLS[5] }),
      makeCell([{text:'HOSPI-',   bold:true},{text:'TALIDAD', bold:true, break:1}], NAVY, { w:COLS[6] }),
    ]
  });

  const dataRows = schedule.map((row, idx) => {
    const bg    = idx % 2 === 0 ? BLUE : PINK;
    const isEvt = row.eventType === 'asamblea' || row.eventType === 'conmemoracion';
    const isCir = row.eventType === 'circuito';
    const g     = '----';

    const fecha = fmtFecha(row.fecha);
    const pres  = isEvt ? g : ((row.presidente || g).split(' ')[0]);

    let oraContent;
    if (isEvt) {
      oraContent = g;
    } else if (row.oradorZoom && row.orador) {
      oraContent = [
        { text: row.orador, bold:true, color:TEAL },
        { text: '(Zoom)',   bold:false, color:TEAL, break:1 }
      ];
    } else {
      oraContent = [{ text: row.orador||g, bold:true, color:TEAL }];
    }

    const bosq = (isEvt||isCir) ? g : (row.bosquejoId ? `N°${row.bosquejoId}` : g);
    const tema = isEvt
      ? (row.eventType==='asamblea' ? 'ASAMBLEA' : 'CONMEMORACION')
      : (isCir ? g : (row.bosquejoId ? (bosqMap[row.bosquejoId]||g) : (row.tema||g)));
    const lect = (isEvt||isCir) ? g : ((row.lector||g).split(' ')[0]);
    const hosp = (isEvt||isCir) ? g : (row.hospitalidad||g);

    return new TableRow({
      height: { value: 1000, rule: HeightRule.AT_LEAST },
      children: [
        makeCell([{text:fecha, bold:true}], bg, { w:COLS[0] }),
        makeCell(pres,                     bg, { w:COLS[1] }),
        makeCell(oraContent,               bg, { w:COLS[2] }),
        makeCell(bosq,                     bg, { w:COLS[3] }),
        makeCell(tema,                     bg, { w:COLS[4], left:true }),
        makeCell(lect,                     bg, { w:COLS[5] }),
        makeCell(hosp,                     bg, { w:COLS[6] }),
      ]
    });
  });

  const tabla = new Table({
    width: { size: TABLE_W, type: WidthType.DXA },
    columnWidths: COLS,
    float: {
      horizontalAnchor: TableAnchorType.MARGIN,
      verticalAnchor:   TableAnchorType.MARGIN,
      absoluteHorizontalPosition: 0,
      absoluteVerticalPosition:   0,
    },
    rows: [headerRow, ...dataRows]
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width:       15840,
            height:      12240,
            orientation: PageOrientation.LANDSCAPE
          },
          margin: { top: 720, bottom: 720, left: 1080, right: 1080 }
        }
      },
      children: [tabla]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  res.setHeader('Content-Disposition', 'attachment; filename="programa.docx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.send(buffer);
});

module.exports = router;
