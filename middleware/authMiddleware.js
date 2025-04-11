const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ mensaje: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // Aquí queda disponible: req.usuario.id, req.usuario.rol, etc.
    next();
  } catch (err) {
    return res.status(403).json({ mensaje: 'Token inválido o expirado' });
  }
}

module.exports = verificarToken;
