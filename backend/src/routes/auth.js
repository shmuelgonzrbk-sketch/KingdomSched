const router   = require('express').Router();
const passport = require('../middleware/passport');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/?error=auth' }),
  (req, res) => res.redirect(process.env.FRONTEND_URL)
);

router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'No autenticado' });
  res.json(req.user);
});

router.get('/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

module.exports = router;
