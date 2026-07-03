const router               = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { PrismaClient }     = require('@prisma/client');
const prisma               = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  const bosquejos = await prisma.bosquejo.findMany({ where: { activo: true }, orderBy: { id: 'asc' } });
  res.json(bosquejos);
});

router.post('/', requireAdmin, async (req, res) => {
  const { id, tema } = req.body;
  const b = await prisma.bosquejo.upsert({
    where: { id: Number(id) },
    update: { tema },
    create: { id: Number(id), tema }
  });
  res.json(b);
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const b = await prisma.bosquejo.update({
    where: { id: Number(req.params.id) },
    data:  { tema: req.body.tema }
  });
  res.json(b);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.bosquejo.update({
    where: { id: Number(req.params.id) },
    data:  { activo: false }
  });
  res.json({ ok: true });
});

module.exports = router;
