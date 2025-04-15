function verificarRolPermitido(...rolesPermitidos) {
    return (req, res, next) => {
      const rol = req.usuario.rol;
  
      if (!rolesPermitidos.includes(rol)) {
        return res.status(403).json({ mensaje: 'Acceso denegado: no tienes permisos suficientes' });
      }
  
      next();
    };
  }
  
  module.exports = verificarRolPermitido;