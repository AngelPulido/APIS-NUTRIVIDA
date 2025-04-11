const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const verificarToken = require('../middleware/authMiddleware');

// GET /api/profile
router.get('/', verificarToken, async (req, res) => {
  try {
    // 1. Obtener usuario
    const [usuarioResult] = await pool.query(
      'SELECT id, nombre, correo, rol, creado_en, actualizado_en FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );

    if (usuarioResult.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const usuario = usuarioResult[0];

    // 2. Obtener perfil si existe
    const [perfilResult] = await pool.query(
      'SELECT * FROM perfiles WHERE usuario_id = ?',
      [req.usuario.id]
    );

    // 3. Combinar los datos
    res.status(200).json({
      ...usuario,
      perfil: perfilResult[0] || null // puede ser null si aún no tiene perfil creado
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

module.exports = router;
