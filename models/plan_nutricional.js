    const mongoose = require('mongoose');

    const alimentoSchema = new mongoose.Schema({
    nombre: String,
    cantidad: String
    });

    const comidaSchema = new mongoose.Schema({
    momento: String,
    calorias: Number,
    observaciones: String,
    completado: Boolean,
    alimentos: [alimentoSchema]
    });

    const diaSchema = new mongoose.Schema({
    dia: String,
    comidas: [comidaSchema]
    });

    const planNutricionalSchema = new mongoose.Schema({
    id_paciente: Number,
    id_nutriologo: Number,
    titulo: String,
    descripcion: String,
    creado_en: Date,
    dias: [diaSchema]
    });

    // Exportamos el modelo
    module.exports = mongoose.model('plan_nutricional', planNutricionalSchema, 'plannutricionals');
