const router           = require('express').Router();
const { requireAuth }  = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { enviarWhatsApp } = require('../utils/whatsapp');  // ← el import va aquí arriba
const prisma           = new PrismaClient();

// ...tus rutas existentes...

router.post('/bulk', requireAuth, async (req, res) => {
  // ...tu código que ya guarda las filas del schedule...

  // el bloque de envío de WhatsApp va DESPUÉS de guardar, aquí dentro de la ruta
  for (const row of req.body.rows) {
    const orador = await prisma.participante.findFirst({ where: { nombre: row.orador, userId: req.user.id } });
    if (orador?.telefono) {
      await enviarWhatsApp(orador.telefono, `Hola ${orador.nombre}, te recuerdo que el ${row.fecha} tienes el discurso: "${row.tema}"`);
    }
    const lector = await prisma.participante.findFirst({ where: { nombre: row.lector, userId: req.user.id } });
    if (lector?.telefono) {
      await enviarWhatsApp(lector.telefono, `Hola ${lector.nombre}, te recuerdo que el ${row.fecha} te toca la lectura de la Biblia`);
    }
  }

  res.json({ ok: true });
});

router.get('/', requireAuth, async (req, res) => {
  const data = await prisma.participante.findMany({
    where: { userId: req.user.id }, orderBy: { orden: 'asc' }
  });
  res.json(data);
});

router.post('/', requireAuth, async (req, res) => {
  const { nombre, tipo, orden, telefono } = req.body;
  const nombreNorm = nombre.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const existe = await prisma.participante.findFirst({
    where: { userId: req.user.id, tipo, nombre: { equals: nombreNorm, mode: 'insensitive' } }
  });
  if (existe) return res.status(400).json({ error: `${nombreNorm} ya existe en esta lista` });
  const p = await prisma.participante.create({
    data: { userId: req.user.id, nombre: nombreNorm, tipo, orden, telefono: telefono || null }
  });
  res.json(p);
});

// REORDER debe ir ANTES de /:id
router.patch('/reorder', requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    await Promise.all(items.map(item =>
      prisma.participante.update({ where: { id: item.id }, data: { orden: item.orden } })
    ));
    res.json({ ok: true });
  } catch(e) {
    console.error('reorder error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { nombre, telefono } = req.body;
    const nombreNorm = nombre.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    const p = await prisma.participante.update({
      where: { id: req.params.id },
      data:  { nombre: nombreNorm, telefono: telefono !== undefined ? (telefono || null) : undefined }
    });
    res.json(p);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.participante.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
