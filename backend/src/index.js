const express  = require('express');
const cors     = require('cors');
const session  = require('express-session');
const passport = require('passport');
const path     = require('path');
require('dotenv').config();
require('./middleware/passport');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(session({
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/auth',              require('./routes/auth'));
app.use('/api/bosquejos',     require('./routes/bosquejos'));
app.use('/api/participantes', require('./routes/participantes'));
app.use('/api/grupos',        require('./routes/grupos'));
app.use('/api/config', require('./routes/config'));
app.use('/api/discursos', require('./routes/discursos'));
app.use('/api/export', require('./routes/export'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/schedule',      require('./routes/schedule'));

app.use(express.static(path.join(__dirname, '../public')));
app.get('/{*path}', (req, res) => {
  const file = req.path.endsWith('.html') 
    ? path.join(__dirname, '../public', req.path)
    : path.join(__dirname, '../public/index.html');
  res.sendFile(file);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
