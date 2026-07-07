const router           = require('express').Router();
const { enviarWhatsApp } = require('../utils/whatsapp');
const { requireAuth }  = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma           = new PrismaClient();
const crypto            = require('crypto');

function generarCodigo() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// crear congregacion nueva
router.post('/crear', requireAuth, async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre requerido' });

    const codigo = generarCodigo();
    const cong = await prisma.congregacion.create({
      data: { nombre: nombre.trim(), codigo, creadorId: req.user.id }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { congregacionId: cong.id }
    });

    res.json(cong);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// unirse a congregacion existente
router.post('/unirse', requireAuth, async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ error: 'Código requerido' });

    const cong = await prisma.congregacion.findUnique({
      where: { codigo: codigo.trim().toUpperCase() }
    });
    if (!cong) return res.status(404).json({ error: 'Código incorrecto' });
    await prisma.user.update({
      where: { id: req.user.id },
      data: { congregacionId: cong.id }
    });

    res.json(cong);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ver mi congregacion actual
router.get('/mi-congregacion', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { congregacion: true }
    });
    res.json(user.congregacion || null);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// regenerar codigo (solo si perteneces a esa congregacion)
router.post('/regenerar-codigo', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.congregacionId) return res.status(400).json({ error: 'No perteneces a ninguna congregación' });

    const cong = await prisma.congregacion.findUnique({ where: { id: user.congregacionId } });
    if (cong.creadorId !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede regenerar el código' });

    const nuevoCodigo = generarCodigo();
    const congActualizada = await prisma.congregacion.update({
      where: { id: user.congregacionId },
      data: { codigo: nuevoCodigo }
    });

    res.json(congActualizada);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
// salir de la congregacion (volver a modo individual)
router.post('/salir', requireAuth, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { congregacionId: null }
    });
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// listar miembros de mi congregacion
router.get('/miembros', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.congregacionId) return res.json([]);

    const miembros = await prisma.user.findMany({
      where: { congregacionId: user.congregacionId },
      select: { id: true, nombre: true, email: true, foto: true, createdAt: true }
    });
    res.json(miembros);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// generar link de invitacion temporal
router.post('/generar-invitacion', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.congregacionId) return res.status(400).json({ error: 'No perteneces a ninguna congregación' });

    const cong = await prisma.congregacion.findUnique({ where: { id: user.congregacionId } });
    if (cong.creadorId !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede generar invitaciones' });
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas

    await prisma.invitacionCongregacion.create({
      data: { token, congregacionId: user.congregacionId, expiresAt }
    });

    res.json({ token, expiresAt });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// usar invitacion (unirse via link)
router.post('/usar-invitacion', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token requerido' });

    const inv = await prisma.invitacionCongregacion.findUnique({
      where: { token },
      include: { congregacion: true }
    });

    if (!inv) return res.status(404).json({ error: 'Invitación no válida' });
    if (inv.usado) return res.status(400).json({ error: 'Esta invitación ya fue usada' });
    if (new Date() > inv.expiresAt) return res.status(400).json({ error: 'Esta invitación expiró' });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { congregacionId: inv.congregacionId }
    });

    await prisma.invitacionCongregacion.update({
      where: { token },
      data: { usado: true }
    });

    res.json(inv.congregacion);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// guardar config de WhatsApp (solo el creador)
router.post('/config', requireAuth, async (req, res) => {
  try {
    const { metaAccessToken, metaPhoneNumberId } = req.body;
    if (!metaAccessToken || !metaPhoneNumberId) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.congregacionId) return res.status(400).json({ error: 'No perteneces a ninguna congregación' });

    const cong = await prisma.congregacion.findUnique({ where: { id: user.congregacionId } });
    if (cong.creadorId !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede configurar WhatsApp' });

    const congActualizada = await prisma.congregacion.update({
      where: { id: user.congregacionId },
      data: { metaAccessToken, metaPhoneNumberId }
    });

    res.json({
      metaPhoneNumberId: congActualizada.metaPhoneNumberId,
      whatsappActivo: congActualizada.whatsappActivo,
      conectado: true
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ver config actual de WhatsApp
router.get('/config', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.congregacionId) return res.json({ conectado: false });

    const cong = await prisma.congregacion.findUnique({ where: { id: user.congregacionId } });
    res.json({
      conectado: !!(cong.metaAccessToken && cong.metaPhoneNumberId),
      whatsappActivo: cong.whatsappActivo,
      esCreador: cong.creadorId === req.user.id
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// enviar mensaje de prueba
router.post('/probar-whatsapp', requireAuth, async (req, res) => {
  try {
    const { telefono } = req.body;
    if (!telefono) return res.status(400).json({ error: 'Número de teléfono requerido' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.congregacionId) return res.status(400).json({ error: 'No perteneces a ninguna congregación' });

    const cong = await prisma.congregacion.findUnique({ where: { id: user.congregacionId } });
    if (cong.creadorId !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede probar la conexión' });
    if (!cong.metaAccessToken || !cong.metaPhoneNumberId) {
      return res.status(400).json({ error: 'Configura primero el Access Token y Phone Number ID' });
    }

    const resultado = await enviarWhatsApp(telefono, 'Este es un mensaje de prueba desde AsignaTech. Si lo recibiste, tu conexión de WhatsApp está funcionando correctamente.', {
      metaAccessToken: cong.metaAccessToken,
      metaPhoneNumberId: cong.metaPhoneNumberId
    });

    if (resultado.error) {
      return res.status(400).json({ error: resultado.error.message || resultado.error });
    }

    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

