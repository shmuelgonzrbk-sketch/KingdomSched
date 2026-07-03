const router           = require('express').Router();
const { requireAuth }  = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma           = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  const config = await prisma.config.findUnique({ where: { userId: req.user.id } });
  res.json(config || null);
});

router.post('/', requireAuth, async (req, res) => {
  const { meetingDay } = req.body;
  const config = await prisma.config.upsert({
    where:  { userId: req.user.id },
    update: { meetingDay },
    create: { userId: req.user.id, meetingDay }
  });
  res.json(config);
});

module.exports = router;
