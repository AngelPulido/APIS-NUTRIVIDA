const bcrypt = require('bcrypt');

const generarHash = async () => {
    const hash = await bcrypt.hash('hashedpass1', 10);
    console.log('Hash generado:', hash);
};

generarHash();