const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const PlanNutricional = require('../models/plan_nutricional'); // Asegúrate de que la ruta sea correcta
const verificarToken = require('../middleware/authMiddleware');

// Todas las rutas del paciente requieren token
router.use(verificarToken);

// 1. Obtener planes nutricionales del paciente
router.get('/my-plans', async (req, res) => {
  try {
    const idPaciente = Number(req.usuario.id); // ID que viene del JWT

    const planes = await PlanNutricional.find({ id_paciente: idPaciente });
    res.json(planes);
  } catch (error) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({ mensaje: 'Error al obtener los planes nutricionales' });
  }
});

// 2. Solicitar una cita
router.post('/appointments', async (req, res) => {
  const { nutriologo_id, fecha } = req.body;
  const paciente_id = req.usuario.id; // El paciente es el que hace la solicitud

  if (!paciente_id || !nutriologo_id || !fecha) {
    return res.status(400).json({ mensaje: "Faltan campos obligatorios" });
  }

  try {
    await pool.query(
      'INSERT INTO citas (paciente_id, nutriologo_id, fecha) VALUES (?, ?, ?)',
      [paciente_id, nutriologo_id, fecha]
    );

    res.status(201).json({ mensaje: "Cita solicitada exitosamente" });
  } catch (error) {
    console.error('Error al solicitar cita:', error);
    res.status(500).json({ mensaje: 'Error al solicitar cita' });
  }
});

// 3. Ver citas programadas del paciente
router.get('/my-appointments', async (req, res) => {
  const paciente_id = req.usuario.id;

  try {
    const [citas] = await pool.query(`
      SELECT c.id, c.fecha, c.estado, u.nombre AS nutriologo
      FROM citas c
      JOIN usuarios u ON c.nutriologo_id = u.id
      WHERE c.paciente_id = ?
    `, [paciente_id]);

    res.json(citas);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas' });
  }
});

// 4. Registrar progreso físico
router.post('/progress', async (req, res) => {
  const { peso_kg, grasa_corporal_pct, masa_muscular_pct, foto_progreso, fecha_registro } = req.body;
  const usuario_id = req.usuario.id;

  if (!peso_kg || !fecha_registro) {
    return res.status(400).json({ mensaje: "Peso y fecha de registro son obligatorios" });
  }

  try {
    // 🔵 Primero: Verificar si ya hay un progreso esta semana
    const [progresos] = await pool.query(
      `
      SELECT id FROM progresos_fisicos 
      WHERE usuario_id = ? 
        AND YEARWEEK(fecha_registro, 1) = YEARWEEK(?, 1)
      `,
      [usuario_id, fecha_registro]
    );

    if (progresos.length > 0) {
      return res.status(400).json({ mensaje: "Ya registraste un progreso esta semana." });
    }

    // 🔵 Si no hay, insertar nuevo progreso
    await pool.query(
      `
      INSERT INTO progresos_fisicos 
      (usuario_id, peso_kg, grasa_corporal_pct, masa_muscular_pct, foto_progreso, fecha_registro) 
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [usuario_id, peso_kg, grasa_corporal_pct, masa_muscular_pct, foto_progreso, fecha_registro]
    );

    res.status(201).json({ mensaje: "Progreso registrado correctamente" });
  } catch (error) {
    console.error('Error al registrar progreso:', error);
    res.status(500).json({ mensaje: 'Error al registrar progreso físico' });
  }
});


module.exports = router;
