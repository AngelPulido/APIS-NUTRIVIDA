const mysql = require('mysql2');
const mongoose = require('mongoose');
require('dotenv').config();

// Configuración de conexión MySQL
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT
}).promise();

// Conexión a MongoDB
// const conectarMongo = async () => {
//     try {
//         await mongoose.connect(process.env.MONGO_URL, {
//             useNewUrlParser: true,
//             useUnifiedTopology: true
//         });
//         console.log('Conectado a MongoDB');
//     } catch (error) {
//         console.error('Error al conectar a MongoDB:', error);
//     }
// }

 module.exports = { pool };
