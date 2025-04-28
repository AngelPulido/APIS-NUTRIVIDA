const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const verificarToken = require('../middleware/authMiddleware');
const verificarRolPermitido = require('../middleware/verifyRole');

// Todas las rutas de mensajes requieren autenticación
router.use(verificarToken);

// Obtener mensajes del usuario autenticado
router.get('/messages', async (req, res) => {
  const userId = req.usuario.id;

  try {
    const [mensajes] = await pool.query(
      'SELECT * FROM mensajes WHERE remitente_id = ? OR destinatario_id = ? ORDER BY creado_en DESC',
      [userId, userId]
    );
    res.json(mensajes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener mensajes' });
  }
});

// Enviar mensaje (cualquier usuario autenticado puede)
router.post('/messages/', async (req, res) => {
  const { contenido, destinatario_id } = req.body;
  const remitente_id = req.usuario.id;

  try {
    await pool.query(
      'INSERT INTO mensajes (remitente_id, destinatario_id, contenido, leido, creado_en, actualizado_en) VALUES (?, ?, ?, 0, NOW(), NOW())',
      [remitente_id, destinatario_id, contenido]
    );
    res.status(201).json({ mensaje: 'Mensaje enviado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al enviar mensaje' });
  }
});

// Editar mensaje propio
router.put('/messages/:id', async (req, res) => {
  const { contenido } = req.body;
  const { id } = req.params;
  const remitente_id = req.usuario.id;

  try {
    const [resultado] = await pool.query(
      'UPDATE mensajes SET contenido = ?, actualizado_en = NOW() WHERE id = ? AND remitente_id = ?',
      [contenido, id, remitente_id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(403).json({ mensaje: 'No puedes editar este mensaje' });
    }

    res.json({ mensaje: 'Mensaje editado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al editar mensaje' });
  }
});

// Eliminar mensaje propio
router.delete('/messages/:id', async (req, res) => {
  const { id } = req.params;
  const remitente_id = req.usuario.id;

  try {
    const [resultado] = await pool.query(
      'DELETE FROM mensajes WHERE id = ? AND remitente_id = ?',
      [id, remitente_id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(403).json({ mensaje: 'No puedes eliminar este mensaje' });
    }

    res.json({ mensaje: 'Mensaje eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al eliminar mensaje' });
  }
});

module.exports = router;
