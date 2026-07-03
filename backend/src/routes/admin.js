const router           = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma           = new PrismaClient();

router.get('/usuarios', requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(users);
});

router.patch('/usuarios/:id/rol', requireAdmin, async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data:  { rol: req.body.rol }
  });
  res.json(user);
});

module.exports = router;
