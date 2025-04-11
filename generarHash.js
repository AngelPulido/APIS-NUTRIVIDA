const bcrypt = require('bcrypt');

const generarHash = async () => {
    const hash = await bcrypt.hash('paciente123', 10);
    console.log('Hash generado:', hash);
};

generarHash();