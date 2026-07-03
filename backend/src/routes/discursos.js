const router           = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma           = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  const data = await prisma.discursoEspecial.findMany({ where: { activo: true }, orderBy: { createdAt: 'asc' } });
  res.json(data);
});

router.post('/', requireAdmin, async (req, res) => {
  const d = await prisma.discursoEspecial.create({ data: { tema: req.body.tema } });
  res.json(d);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.discursoEspecial.update({ where: { id: req.params.id }, data: { activo: false } });
  res.json({ ok: true });
});

module.exports = router;
