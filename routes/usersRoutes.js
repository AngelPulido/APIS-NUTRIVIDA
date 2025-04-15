const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const verificarToken = require('../middleware/authMiddleware');
const verificarRolPermitido = require('../middleware/verifyRole');

// GET /api/users - Solo admins pueden ver todos los usuarios
router.get('/', verificarToken, verificarRolPermitido('admin'), async (req, res) => {
  try {
    const [usuarios] = await pool.query(
      'SELECT id, nombre, correo, rol, creado_en, actualizado_en FROM usuarios'
    );

    res.status(200).json(usuarios);
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

module.exports = router;
