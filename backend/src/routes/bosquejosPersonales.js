const router           = require('express').Router();
const { requireAuth }  = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma           = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  const data = await prisma.bosquejoPersonal.findMany({
    where: { userId: req.user.id, activo: true },
    orderBy: { createdAt: 'asc' }
  });
  res.json(data);
});

router.post('/', requireAuth, async (req, res) => {
  const { tema } = req.body;
  if (!tema) return res.status(400).json({ error: 'Tema requerido' });
  const b = await prisma.bosquejoPersonal.create({
    data: { userId: req.user.id, tema }
  });
  res.json(b);
});

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.bosquejoPersonal.update({
    where: { id: req.params.id },
    data:  { activo: false }
  });
  res.json({ ok: true });
});

module.exports = router;
