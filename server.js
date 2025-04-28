  const express = require('express');
  const cors = require('cors');
  const dotenv = require('dotenv');
  const mongoose = require('mongoose');
  const { pool } = require('./config/db');
 

  dotenv.config(); // 🔵 Primero carga las variables de entorno .env

  // 🔵 Función para conectar Mongo
  const conectarMongo = async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Conectado a MongoDB');
    } catch (error) {
      console.error('Error conectando a MongoDB:', error);
      process.exit(1);
    }
  };

  conectarMongo(); // 🔵 Y aquí ejecutas la conexión

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Tus rutas principales
  app.use('/api', require('./routes/authRoutes'));
  app.use('/api', require('./routes/profileRoutes'));
  app.use('/api', require('./routes/usersRoutes'));

  // Tus rutas de paciente
  app.use('/api', require('./routes/pacienteRoutes'));
  app.use('/api', require('./routes/nutriologoRoutes'));



  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
