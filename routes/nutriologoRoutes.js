const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const Plan = require('../models/plan_nutricional');
const verificarToken = require('../middleware/authMiddleware');
const verificarRolPermitido = require('../middleware/verifyRole');

// 🔵 Middleware: Solo nutriólogos pueden acceder
router.use(verificarToken);
router.use(verificarRolPermitido('nutriologo'));

// 🔵 1. Crear un nuevo plan nutricional
router.post('/nutrition-plans', async (req, res) => {
  const { id_paciente, id_nutriologo, titulo, descripcion, creado_en, dias } = req.body;

  if (!id_paciente || !id_nutriologo || !titulo || !descripcion || !creado_en || !dias) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
  }

  try {
    const nuevoPlan = new Plan({
      id_paciente,
      id_nutriologo,
      titulo,
      descripcion,
      creado_en,
      dias
    });

    await nuevoPlan.save();

    res.status(201).json({ mensaje: 'Plan nutricional creado exitosamente', plan: nuevoPlan });
  } catch (error) {
    console.error('Error al crear el plan nutricional:', error);
    res.status(500).json({ mensaje: 'Error al crear el plan nutricional' });
  }
});

// 🔵 2. Actualizar un plan nutricional
router.put('/nutrition-plans/:id', async (req, res) => {
  const { id } = req.params;
  const { id_paciente, id_nutriologo, titulo, descripcion, creado_en, dias } = req.body;

  if (!id_paciente || !id_nutriologo || !titulo || !descripcion || !creado_en || !dias) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
  }

  try {
    const planActualizado = await Plan.findByIdAndUpdate(
      id,
      { id_paciente, id_nutriologo, titulo, descripcion, creado_en, dias },
      { new: true }
    );

    if (!planActualizado) {
      return res.status(404).json({ mensaje: 'Plan nutricional no encontrado' });
    }

    res.status(200).json({ mensaje: 'Plan nutricional actualizado correctamente', plan: planActualizado });
  } catch (error) {
    console.error('Error al actualizar el plan nutricional:', error);
    res.status(500).json({ mensaje: 'Error al actualizar el plan nutricional' });
  }
});

// 🔵 3. Obtener detalles de un plan nutricional
router.get('/nutrition-plans/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const plan = await Plan.findById(id);

    if (!plan) {
      return res.status(404).json({ mensaje: 'Plan nutricional no encontrado' });
    }

    res.status(200).json(plan);
  } catch (error) {
    console.error('Error al obtener el plan nutricional:', error);
    res.status(500).json({ mensaje: 'Error al obtener el plan nutricional' });
  }
});

// 🔵 4. Actualizar estado de una cita
router.put('/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado) {
    return res.status(400).json({ mensaje: 'El estado es obligatorio' });
  }

  try {
    const [resultado] = await pool.query(
      'UPDATE citas SET estado = ? WHERE id = ?',
      [estado, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Cita no encontrada' });
    }

    res.json({ mensaje: 'Estado de la cita actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar estado de cita:', error);
    res.status(500).json({ mensaje: 'Error al actualizar estado de cita' });
  }
});

// 🔵 5. Listar mis citas (solo del nutriólogo logueado)
router.get('/appointments', async (req, res) => {
  const nutriologoId = req.usuario.id;

  try {
    const [citas] = await pool.query(`
      SELECT c.id, c.fecha, c.estado, p.nombre AS paciente
      FROM citas c
      INNER JOIN usuarios p ON c.paciente_id = p.id
      WHERE c.nutriologo_id = ?
      ORDER BY c.fecha ASC
    `, [nutriologoId]);

    res.status(200).json(citas);
  } catch (error) {
    console.error('Error al listar citas:', error);
    res.status(500).json({ mensaje: 'Error al listar citas' });
  }
});

// 🔵 6. Listar mis pacientes asignados
router.get('/patients', async (req, res) => {
  const nutriologoId = req.usuario.id;

  try {
    const [pacientes] = await pool.query(`
      SELECT DISTINCT 
        p.id AS paciente_id,
        p.nombre AS paciente_nombre,
        p.correo AS paciente_correo,
        pr.teléfono,
        pr.edad,
        pr.género,
        pr.altura_cm,
        pr.peso_kg,
        pr.dirección
      FROM citas c
      INNER JOIN usuarios p ON c.paciente_id = p.id
      LEFT JOIN perfiles pr ON p.id = pr.usuario_id
      WHERE c.nutriologo_id = ?
    `, [nutriologoId]);

    res.status(200).json(pacientes);
  } catch (error) {
    console.error('Error al listar pacientes asignados:', error);
    res.status(500).json({ mensaje: 'Error al listar pacientes asignados' });
  }
});

module.exports = router;
