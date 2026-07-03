const router           = require('express').Router();
const { requireAuth }  = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma           = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  const data = await prisma.participante.findMany({
    where: { userId: req.user.id }, orderBy: { orden: 'asc' }
  });
  res.json(data);
});

router.post('/', requireAuth, async (req, res) => {
  const { nombre, tipo, orden } = req.body;
  const nombreNorm = nombre.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const existe = await prisma.participante.findFirst({
    where: { userId: req.user.id, tipo, nombre: { equals: nombreNorm, mode: 'insensitive' } }
  });
  if (existe) return res.status(400).json({ error: `${nombreNorm} ya existe en esta lista` });
  const p = await prisma.participante.create({
    data: { userId: req.user.id, nombre: nombreNorm, tipo, orden }
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
    const { nombre } = req.body;
    const nombreNorm = nombre.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    const p = await prisma.participante.update({
      where: { id: req.params.id },
      data:  { nombre: nombreNorm }
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
