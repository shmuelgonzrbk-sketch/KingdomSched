const router           = require('express').Router();
const { requireAuth }  = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma           = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  const data = await prisma.schedule.findMany({
    where: { userId: req.user.id }, orderBy: { orden: 'asc' }
  });
  res.json(data);
});

router.post('/bulk', requireAuth, async (req, res) => {
  const { rows } = req.body;
  await prisma.schedule.deleteMany({ where: { userId: req.user.id } });
  await prisma.schedule.createMany({
    data: rows.map(r => ({ ...r, userId: req.user.id }))
  });
  res.json({ ok: true });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const row = await prisma.schedule.update({
    where: { id: req.params.id }, data: req.body
  });
  res.json(row);
});

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.schedule.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
