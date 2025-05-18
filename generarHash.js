const bcrypt = require('bcrypt');

const generarHash = async () => {
    const hash = await bcrypt.hash('12345678', 10);
    console.log('Hash generado:', hash);
};

generarHash();