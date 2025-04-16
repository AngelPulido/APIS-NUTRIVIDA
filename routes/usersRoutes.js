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

   // GET /api/statistics - Ver estadísticas del sistema (solo admin)
   router.get('/statistics', verificarToken, verificarRolPermitido('admin'), async (req, res) => {
    console.log('Usuario:', req.usuario); 
    try {
      const [
        [totalUsuarios],
        [admins],
        [nutriologos],
        [pacientes],
        [totalPerfiles],
        [totalCitas],
        [totalMensajes],
        [totalProgresos],
        [citasMes],
        [progresosMes]
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) AS total FROM usuarios'),
        pool.query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'admin'"),
        pool.query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'nutriologo'"),
        pool.query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'paciente'"),
        pool.query('SELECT COUNT(*) AS total FROM perfiles'),
        pool.query('SELECT COUNT(*) AS total FROM citas'),
        pool.query('SELECT COUNT(*) AS total FROM mensajes'),
        pool.query('SELECT COUNT(*) AS total FROM progresos_fisicos'),
  
        // ESTADÍSTICAS DE ESTE MES
        pool.query(`
          SELECT COUNT(*) AS total FROM citas 
          WHERE MONTH(fecha) = MONTH(CURRENT_DATE()) 
            AND YEAR(fecha) = YEAR(CURRENT_DATE())
        `),
        pool.query(`
          SELECT COUNT(*) AS total FROM progresos_fisicos 
          WHERE MONTH(fecha_registro) = MONTH(CURRENT_DATE()) 
            AND YEAR(fecha_registro) = YEAR(CURRENT_DATE())
        `)
      ]);
  
      res.status(200).json({
        usuarios: {
          total: totalUsuarios[0].total,
          admin: admins[0].total,
          nutriologo: nutriologos[0].total,
          paciente: pacientes[0].total
        },
        perfiles: totalPerfiles[0].total,
        citas: {
          total: totalCitas[0].total,
          este_mes: citasMes[0].total
        },
        mensajes: totalMensajes[0].total,
        progresos_fisicos: {
          total: totalProgresos[0].total,
          este_mes: progresosMes[0].total
        }
      });
  
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
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

// PUT /api/users/:id - Editar usuario y perfil (solo admin)
router.put('/:id', verificarToken, verificarRolPermitido('admin'), async (req, res) => {
  const usuarioId = req.params.id;
  const {
    nombre,
    correo,
    rol,
    contraseña,
    teléfono,
    edad,
    género,
    dirección,
    altura_cm,
    peso_kg,
    especialidad
  } = req.body;

  try {
    const [usuarios] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [usuarioId]);
    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    if (correo) {
      const [existeCorreo] = await pool.query(
        'SELECT id FROM usuarios WHERE correo = ? AND id != ?',
        [correo, usuarioId]
      );
      if (existeCorreo.length > 0) {
        return res.status(409).json({ mensaje: 'Este correo ya está en uso por otro usuario' });
      }
    }

    // Si incluye contraseña, se hashea
    let hashedPassword = null;
    if (contraseña) {
      if (contraseña.length < 8) {
        return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres' });
      }
      hashedPassword = await bcrypt.hash(contraseña, 10);
    }

    // Actualizar datos básicos del usuario
    await pool.query(
      `UPDATE usuarios SET 
        nombre = COALESCE(?, nombre),
        correo = COALESCE(?, correo),
        rol = COALESCE(?, rol),
        ${hashedPassword ? 'contraseña = ?, ' : ''}
        actualizado_en = NOW()
      WHERE id = ?`,
      hashedPassword
        ? [nombre, correo, rol, hashedPassword, usuarioId]
        : [nombre, correo, rol, usuarioId]
    );

    // Actualizar o insertar perfil
    const [perfil] = await pool.query('SELECT * FROM perfiles WHERE usuario_id = ?', [usuarioId]);

    if (perfil.length === 0) {
      await pool.query(
        `INSERT INTO perfiles (usuario_id, teléfono, edad, género, dirección, altura_cm, peso_kg, especialidad)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [usuarioId, teléfono, edad, género, dirección, altura_cm, peso_kg, especialidad]
      );
    } else {
      await pool.query(
        `UPDATE perfiles SET 
          teléfono = COALESCE(?, teléfono),
          edad = COALESCE(?, edad),
          género = COALESCE(?, género),
          dirección = COALESCE(?, dirección),
          altura_cm = COALESCE(?, altura_cm),
          peso_kg = COALESCE(?, peso_kg),
          especialidad = COALESCE(?, especialidad),
          actualizado_en = NOW()
         WHERE usuario_id = ?`,
        [teléfono, edad, género, dirección, altura_cm, peso_kg, especialidad, usuarioId]
      );
    }

    res.status(200).json({ mensaje: 'Usuario y perfil actualizados correctamente' });

  } catch (error) {
    console.error('Error al editar usuario:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// DELETE /api/users/:id - Eliminar usuario y sus datos relacionados (solo admin)
router.delete('/:id', verificarToken, verificarRolPermitido('admin'), async (req, res) => {
    const usuarioId = req.params.id;
  
    try {
      const [usuarios] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [usuarioId]);
      if (usuarios.length === 0) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }
  
      await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
  
      res.status(200).json({ mensaje: 'Usuario y sus datos han sido eliminados correctamente' });
  
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ mensaje: 'Error del servidor' });
    }
  });
  console.log('Entró a la ruta /statistics');
 
  
module.exports = router;
