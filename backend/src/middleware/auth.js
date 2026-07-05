function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'No autorizado' });
}
function requireAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.rol === 'admin') return next();
  res.status(403).json({ error: 'Se requiere rol admin' });
}
const SUPER_ADMIN = 'shmuelgonzrbk@gmail.com';
function requireSuperAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.email === SUPER_ADMIN) return next();
  res.status(403).json({ error: 'Se requiere super admin' });
}
module.exports = { requireAuth, requireAdmin, requireSuperAdmin };
