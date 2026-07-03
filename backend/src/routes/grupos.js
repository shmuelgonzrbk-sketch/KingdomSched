const router           = require('express').Router();
const { requireAuth }  = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma           = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  const data = await prisma.grupo.findMany({
    where: { userId: req.user.id }, orderBy: { orden: 'asc' }
  });
  res.json(data);
});

router.post('/', requireAuth, async (req, res) => {
  const { nombre, orden } = req.body;
  const g = await prisma.grupo.create({
    data: { userId: req.user.id, nombre, orden }
  });
  res.json(g);
});

router.patch('/:id', requireAuth, async (req, res) => {
  const g = await prisma.grupo.update({
    where: { id: req.params.id }, data: { nombre: req.body.nombre }
  });
  res.json(g);
});

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.grupo.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
