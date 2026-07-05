const router           = require('express').Router();
const { requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma           = new PrismaClient();

router.get('/usuarios', requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(users);
});

router.patch('/usuarios/:id/rol', requireSuperAdmin, async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (target?.email === 'shmuelgonzrbk@gmail.com') {
    return res.status(403).json({ error: 'No se puede modificar al super admin' });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data:  { rol: req.body.rol }
  });
  res.json(user);
});

module.exports = router;
