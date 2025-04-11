const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { pool } = require('../config/db');
const validator = require('validator'); 

router.post('/register', async (req, res) => {
  const { nombre, correo, contraseña, rol } = req.body;

  try {
    if (!nombre || !correo || !contraseña || !rol) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
    }

    if (!validator.isEmail(correo)) {
      return res.status(400).json({ mensaje: 'El correo no es válido' });
    }

    if (contraseña.length < 8) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const rolesPermitidos = ['paciente', 'nutriologo', 'admin'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({ mensaje: 'Rol no permitido' });
    }

    const [usuarioExistente] = await pool.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    if (usuarioExistente.length > 0) {
      return res.status(409).json({ mensaje: 'Ya existe un usuario con ese correo' });
    }

    const hashedPassword = await bcrypt.hash(contraseña, 10);

    await pool.query(
      'INSERT INTO usuarios (nombre, correo, contraseña, rol, creado_en, actualizado_en) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [nombre, correo, hashedPassword, rol]
    );

    res.status(201).json({ mensaje: 'Usuario registrado exitosamente' });

  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});


// POST /login - Iniciar sesión y obtener token
router.post('/login', async (req, res) => {
  const { correo, contraseña } = req.body;

  try {
    if (!correo || !contraseña) {
      return res.status(400).json({ mensaje: 'Correo y contraseña obligatorios' });
    }

    const [usuarios] = await pool.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);

    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];
    const esValida = await bcrypt.compare(contraseña, usuario.contraseña);
    if (!esValida) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Enviar respuesta diferente según el rol
    switch (usuario.rol) {
      case 'admin':
        return res.status(200).json({ mensaje: 'Bienvenido administrador', token, rol: 'admin' });

      case 'nutriologo':
        return res.status(200).json({ mensaje: 'Bienvenido nutriólogo', token, rol: 'nutriologo' });

      case 'paciente':
        return res.status(200).json({ mensaje: 'Bienvenido paciente', token, rol: 'paciente' });

      default:
        return res.status(403).json({ mensaje: 'Rol no permitido' });
    }

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

module.exports = router;
