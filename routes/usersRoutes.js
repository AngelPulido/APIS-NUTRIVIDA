const express = require('express');
const bcrypt = require('bcryptjs');
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

// POST /api/users - Crear nuevo usuario (solo admin)
router.post('/', verificarToken, verificarRolPermitido('admin'), async (req, res) => {
    const { nombre, correo, contraseña, rol } = req.body;
  
    try {
      if (!nombre || !correo || !contraseña || !rol) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
      }
  
      const rolesPermitidos = ['admin', 'nutriologo', 'paciente'];
      if (!rolesPermitidos.includes(rol)) {
        return res.status(400).json({ mensaje: 'Rol no válido' });
      }
  
      const [existente] = await pool.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
      if (existente.length > 0) {
        return res.status(409).json({ mensaje: 'Ya existe un usuario con ese correo' });
      }
  
      const hashed = await bcrypt.hash(contraseña, 10);
  
      const [resultado] = await pool.query(
        'INSERT INTO usuarios (nombre, correo, contraseña, rol, creado_en, actualizado_en) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [nombre, correo, hashed, rol]
      );
  
      const nuevoUsuarioId = resultado.insertId;
  
      await pool.query('INSERT INTO perfiles (usuario_id) VALUES (?)', [nuevoUsuarioId]);
  
      res.status(201).json({ mensaje: 'Usuario y perfil creados correctamente' });
  
    } catch (error) {
      console.error('Error al crear usuario:', error);
      res.status(500).json({ mensaje: 'Error del servidor' });
    }
  });

  // GET /api/users/:id - Ver detalles de un usuario (solo admin)
router.get('/:id', verificarToken, verificarRolPermitido('admin'), async (req, res) => {
    const usuarioId = req.params.id;
  
    try {
      // Buscar usuario
      const [usuarios] = await pool.query(
        'SELECT id, nombre, correo, rol, creado_en, actualizado_en FROM usuarios WHERE id = ?',
        [usuarioId]
      );
  
      if (usuarios.length === 0) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }
  
      const usuario = usuarios[0];
  
      // Buscar perfil (puede que no exista aún)
      const [perfil] = await pool.query('SELECT * FROM perfiles WHERE usuario_id = ?', [usuarioId]);
  
      res.status(200).json({
        ...usuario,
        perfil: perfil[0] || null
      });
  
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      res.status(500).json({ mensaje: 'Error del servidor' });
    }
  });
  
  
module.exports = router;
