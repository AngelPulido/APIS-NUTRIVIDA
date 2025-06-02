const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const verificarToken = require('../middleware/authMiddleware');

// GET /api/profile
router.get('/profile', verificarToken, async (req, res) => {
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
      perfil: perfilResult[0] || null 
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// PUT /api/profile
router.put('/profile', verificarToken, async (req, res) => {
    console.log('>>> BODY /api/profile:', req.body);
    const { nombre, telefono, edad, genero, direccion, altura_cm, peso_kg, especialidad } = req.body;
  
    try {
      if (nombre) {
        await pool.query('UPDATE usuarios SET nombre = ?, actualizado_en = NOW() WHERE id = ?', [nombre, req.usuario.id]);
      }
  
      const [perfilExistente] = await pool.query('SELECT * FROM perfiles WHERE usuario_id = ?', [req.usuario.id]);
  
      if (perfilExistente.length === 0) {
        await pool.query(
          `INSERT INTO perfiles (usuario_id, telefono, edad, genero, direccion, altura_cm, peso_kg, especialidad) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.usuario.id, telefono, edad, genero, direccion, altura_cm, peso_kg, especialidad]
        );
      } else {
        // Actualizar perfil existente
        await pool.query(
          `UPDATE perfiles 
           SET telefono = ?, edad = ?, genero = ?, direccion = ?, 
               altura_cm = ?, peso_kg = ?, especialidad = ?, actualizado_en = NOW()
           WHERE usuario_id = ?`,
          [telefono, edad, genero, direccion, altura_cm, peso_kg, especialidad, req.usuario.id]
        );
      }
  
      res.status(200).json({ mensaje: 'Perfil actualizado exitosamente' });
  
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});
  
module.exports = router;
