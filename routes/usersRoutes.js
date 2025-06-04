  const express = require('express');
  const bcrypt = require('bcryptjs');
  const router = express.Router();
  const { pool } = require('../config/db');
  const verificarToken = require('../middleware/authMiddleware');
  const verificarRolPermitido = require('../middleware/verifyRole');

  // GET /api/users - Solo admins pueden ver todos los usuarios
  router.get('/users', verificarToken, verificarRolPermitido('admin'), async (req, res) => {
    console.log('>>> BODY /api/users:', req.body);
    try {
      const [usuarios] = await pool.query(`
        SELECT 
          u.id, 
          u.nombre, 
          u.correo, 
          u.rol, 
          u.creado_en, 
          u.actualizado_en, 
          p.avatar,
          p.telefono, 
          p.edad,
          p.genero,
          p.direccion,
          p.altura_cm,
          p.peso_kg,
          p.especialidad
        FROM usuarios u
        LEFT JOIN perfiles p ON u.id = p.usuario_id
      `);

      res.status(200).json(usuarios);
    } catch (error) {
      console.error('Error al listar usuarios:', error);
      res.status(500).json({ mensaje: 'Error del servidor' });
    }
  });

 // POST /api/users - Crear nuevo usuario (solo admin)
router.post('/users', verificarToken, verificarRolPermitido('admin'), async (req, res) => {
    const { 
        nombre, 
        correo, 
        contraseña, 
        rol,
        // Campos del perfil
        telefono,
        edad,
        genero,
        direccion,
        altura_cm,
        peso_kg,
        especialidad,
        avatar
    } = req.body;

    try {
        // Validación de campos obligatorios
        if (!nombre || !correo || !contraseña || !rol) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
        }

        const rolesPermitidos = ['admin', 'nutriologo', 'paciente'];
        if (!rolesPermitidos.includes(rol)) {
            return res.status(400).json({ mensaje: 'Rol no válido' });
        }

        // Validar campos específicos según rol
        if (rol === 'nutriologo' && !especialidad) {
            return res.status(400).json({ mensaje: 'La especialidad es obligatoria para nutriólogos' });
        }

        if (rol === 'paciente' && (!altura_cm || !peso_kg)) {
            return res.status(400).json({ mensaje: 'Altura y peso son obligatorios para pacientes' });
        }

        // Verificar si el correo ya existe
        const [existente] = await pool.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        if (existente.length > 0) {
            return res.status(409).json({ mensaje: 'Ya existe un usuario con ese correo' });
        }

        // Hashear la contraseña
        const hashed = await bcrypt.hash(contraseña, 10);

        // Iniciar transacción para asegurar la integridad de los datos
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Insertar usuario
            const [resultado] = await connection.query(
                'INSERT INTO usuarios (nombre, correo, contraseña, rol, creado_en, actualizado_en) VALUES (?, ?, ?, ?, NOW(), NOW())',
                [nombre, correo, hashed, rol]
            );

            const nuevoUsuarioId = resultado.insertId;

            // Insertar perfil con los datos adicionales
            await connection.query(
                `INSERT INTO perfiles 
                (usuario_id, telefono, edad, genero, direccion, altura_cm, peso_kg, especialidad, avatar) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    nuevoUsuarioId,
                    telefono || null,
                    edad || null,
                    genero || null,
                    direccion || null,
                    altura_cm || null,
                    peso_kg || null,
                    especialidad || null,
                    avatar || null
                ]
            );

            // Confirmar transacción
            await connection.commit();
            connection.release();

            res.status(201).json({ mensaje: 'Usuario y perfil creados correctamente' });

        } catch (error) {
            // Revertir transacción en caso de error
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

    router.get('/statistics', verificarToken, verificarRolPermitido('admin'), async (req, res) => {
      console.log('>>> BODY /api/statistics', req.body);
    try {
      // 1) Ejecutamos todas las consultas en paralelo, 
      //    desestructurando [rows, fields] para quedarnos solo con rows:
      const [
        [ totalUsuariosRows ],     // totalUsuariosRows será [{ total: X }]
        [ adminsRows ],            // adminsRows será [{ total: Y }]
        [ nutriologosRows ],
        [ pacientesRows ],
        [ totalPerfilesRows ],
        [ totalCitasRows ],
        [ totalMensajesRows ],
        [ totalProgresosRows ],
        [ citasMesRows ],
        [ progresosMesRows ],
        [ citasPorMesRows ],       // citasPorMesRows será un array de objetos { mes: 'Enero', total: N }, etc.
        [ usuariosPorMesRows ],
        [ progresosPorMesRows ]
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) AS total FROM usuarios'),
        pool.query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'admin'"),
        pool.query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'nutriologo'"),
        pool.query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'paciente'"),
        pool.query('SELECT COUNT(*) AS total FROM perfiles'),
        pool.query('SELECT COUNT(*) AS total FROM citas'),
        pool.query('SELECT COUNT(*) AS total FROM mensajes'),
        pool.query('SELECT COUNT(*) AS total FROM progresos_fisicos'),
        pool.query(`
          SELECT COUNT(*) AS total 
          FROM citas 
          WHERE MONTH(fecha) = MONTH(CURRENT_DATE()) 
            AND YEAR(fecha) = YEAR(CURRENT_DATE())
        `),
        pool.query(`
          SELECT COUNT(*) AS total 
          FROM progresos_fisicos 
          WHERE MONTH(fecha_registro) = MONTH(CURRENT_DATE()) 
            AND YEAR(fecha_registro) = YEAR(CURRENT_DATE())
        `),
        pool.query(`
          SELECT 
            MONTHNAME(fecha) AS mes, 
            COUNT(*) AS total 
          FROM citas
          WHERE fecha >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
          GROUP BY MONTH(fecha), MONTHNAME(fecha)
          ORDER BY MONTH(fecha)
        `),
        pool.query(`
          SELECT 
            MONTHNAME(creado_en) AS mes, 
            COUNT(*) AS total 
          FROM usuarios
          WHERE creado_en >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
          GROUP BY MONTH(creado_en), MONTHNAME(creado_en)
          ORDER BY MONTH(creado_en)
        `),
        pool.query(`
          SELECT 
            MONTHNAME(fecha_registro) AS mes, 
            COUNT(*) AS total 
          FROM progresos_fisicos
          WHERE fecha_registro >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
          GROUP BY MONTH(fecha_registro), MONTHNAME(fecha_registro)
          ORDER BY MONTH(fecha_registro)
        `)
      ]);

      // 2) Extraemos los valores de total de cada array de filas
      const totalUsuarios    = totalUsuariosRows[0]?.total    ?? 0;
      const totalAdmins      = adminsRows[0]?.total           ?? 0;
      const totalNutriologos = nutriologosRows[0]?.total      ?? 0;
      const totalPacientes   = pacientesRows[0]?.total        ?? 0;
      const totalPerfiles    = totalPerfilesRows[0]?.total    ?? 0;
      const totalCitas       = totalCitasRows[0]?.total       ?? 0;
      const totalMensajes    = totalMensajesRows[0]?.total    ?? 0;
      const totalProgresos   = totalProgresosRows[0]?.total   ?? 0;

      // 3) Este mes
      const citasEsteMes     = citasMesRows[0]?.total         ?? 0;
      const progresosEsteMes = progresosMesRows[0]?.total     ?? 0;

      // 4) “Por mes” (array de filas o vacío)
      const citasPorMes     = Array.isArray(citasPorMesRows)    ? citasPorMesRows    : [];
      const usuariosPorMes  = Array.isArray(usuariosPorMesRows) ? usuariosPorMesRows : [];
      const progresosPorMes = Array.isArray(progresosPorMesRows)? progresosPorMesRows: [];

      // 5) Creamos el arreglo de “meses” filtrando null/undefined
      const meses = citasPorMes
        .map(row => row.mes)
        .filter(m => m !== null && m !== undefined);

      // 6) Devolvemos el JSON con los datos correctos
      res.status(200).json({
        usuarios: {
          total: totalUsuarios,
          admin: totalAdmins,
          nutriologo: totalNutriologos,
          paciente: totalPacientes
        },
        perfiles: totalPerfiles,
        citas: {
          total: totalCitas,
          este_mes: citasEsteMes,
          por_mes: citasPorMes
        },
        mensajes: totalMensajes,
        progresos_fisicos: {
          total: totalProgresos,
          este_mes: progresosEsteMes,
          por_mes: progresosPorMes
        },
        usuarios_por_mes: usuariosPorMes,
        meses: meses
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ mensaje: 'Error del servidor' });
    }
  });



    // GET /api/users/:id - Ver detalles de un usuario (solo admin)
  router.get('/users/:id', verificarToken, verificarRolPermitido('admin'), async (req, res) => {
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
router.put('/users/:id', verificarToken, verificarRolPermitido('admin'), async (req, res) => {
  console.log('>>> BODY /api/users:id', req.body);
  const usuarioId = req.params.id;
  const {
      nombre,
      correo,
      rol,
      contraseña,
      telefono = null,
      edad = null,
      genero = null,
      direccion = null,
      altura_cm = null,
      peso_kg = null,
      especialidad = null
  } = req.body;

  try {
      // Validaciones básicas
      if (!nombre || !correo || !rol) {
          return res.status(400).json({ 
              success: false,
              mensaje: 'Nombre, correo y rol son obligatorios' 
          });
      }

      const rolesPermitidos = ['admin', 'nutriologo', 'paciente'];
      if (!rolesPermitidos.includes(rol)) {
          return res.status(400).json({ 
              success: false,
              mensaje: 'Rol no válido' 
          });
      }

      // Verificar si el usuario existe
      const [usuarios] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [usuarioId]);
      if (usuarios.length === 0) {
          return res.status(404).json({ 
              success: false,
              mensaje: 'Usuario no encontrado' 
          });
      }

      // Verificar si el correo ya está en uso por otro usuario
      const [existeCorreo] = await pool.query(
          'SELECT id FROM usuarios WHERE correo = ? AND id != ?',
          [correo, usuarioId]
      );
      if (existeCorreo.length > 0) {
          return res.status(409).json({ 
              success: false,
              mensaje: 'Este correo ya está en uso por otro usuario' 
          });
      }

      // Hashear contraseña si se proporciona
      let hashedPassword = null;
      if (contraseña) {
          if (contraseña.length < 8) {
              return res.status(400).json({ 
                  success: false,
                  mensaje: 'La contraseña debe tener al menos 8 caracteres' 
              });
          }
          hashedPassword = await bcrypt.hash(contraseña, 10);
      }

      // Iniciar transacción
      await pool.query('START TRANSACTION');

      try {
          // Actualizar datos básicos del usuario
          await pool.query(
              `UPDATE usuarios SET 
                  nombre = ?,
                  correo = ?,
                  rol = ?,
                  ${hashedPassword ? 'contraseña = ?, ' : ''}
                  actualizado_en = NOW()
              WHERE id = ?`,
              hashedPassword
                  ? [nombre, correo, rol, hashedPassword, usuarioId]
                  : [nombre, correo, rol, usuarioId]
          );

          // Verificar si existe perfil
          const [perfil] = await pool.query('SELECT * FROM perfiles WHERE usuario_id = ?', [usuarioId]);

          if (perfil.length === 0) {
              // Crear nuevo perfil
              await pool.query(
                  `INSERT INTO perfiles 
                  (usuario_id, telefono, edad, genero, direccion, altura_cm, peso_kg, especialidad)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [usuarioId, telefono, edad, genero, direccion, altura_cm, peso_kg, especialidad]
              );
          } else {
              // Actualizar perfil existente
              await pool.query(
                  `UPDATE perfiles SET 
                      telefono = ?,
                      edad = ?,
                      genero = ?,
                      direccion = ?,
                      altura_cm = ?,
                      peso_kg = ?,
                      especialidad = ?,
                      actualizado_en = NOW()
                  WHERE usuario_id = ?`,
                  [telefono, edad, genero, direccion, altura_cm, peso_kg, especialidad, usuarioId]
              );
          }

          // Confirmar transacción
          await pool.query('COMMIT');

          res.status(200).json({ 
              success: true,
              mensaje: 'Usuario y perfil actualizados correctamente',
              usuario: {
                  id: usuarioId,
                  nombre,
                  correo,
                  rol
              }
          });

      } catch (error) {
          // Revertir transacción en caso de error
          await pool.query('ROLLBACK');
          throw error;
      }

  } catch (error) {
      console.error('Error al editar usuario:', error);
      res.status(500).json({ 
          success: false,
          mensaje: 'Error del servidor al actualizar el usuario',
          error: error.message 
      });
  }
});

  // DELETE /api/users/:id - Eliminar usuario y sus datos relacionados (solo admin)
  router.delete('/users/:id', verificarToken, verificarRolPermitido('admin'), async (req, res) => {
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
