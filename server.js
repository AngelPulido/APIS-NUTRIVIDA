const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { pool} = require('./config/db');
dotenv.config();
const mongoose = require('mongoose');


const app = express();
app.use(cors());
app.use(express.json());

// conectarMongo();

// mongoose.connection.once('open', () => {
//     console.log('Conectado a MongoDB - Base de datos:', mongoose.connection.name);
//   });

  // pool.query('SELECT * FROM usuarios')
  // .then(([rows]) => console.log('Usuarios:', rows))
  // .catch((err) => console.error('Error al consultar MySQL:', err));



//app.use('/api/auth', require('./routes/authRoutes'));

//app.use('/api/plan-nutricional', require('./routes/planNutricionalRoutes'));

app.use('/api/auth', require('./routes/authRoutes'));

app.use('/api/profile', require('./routes/profileRoutes'));


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));