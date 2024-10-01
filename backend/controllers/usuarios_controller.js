import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import conectarDB from '../config/db.js';
import Generar_Id from '../helpers/generar_Id.js';
const pool = await conectarDB();
const confirmacion_email ='0' ;


export const crearUsuario = async (req, res) => {
    const { 
        dni_persona, 
        Nombre, 
        Segundo_nombre, 
        primer_apellido, 
        segundo_apellido, 
        tipo_persona, 
        direccion_persona, 
        fecha_nacimiento,
        departamento, 
        Estado_Persona, 
        Genero_Persona, 
        nombre_usuario, 
        correo_usuario, 
        contraseña_usuario, 
        rol_usuario 
    } = req.body;

    const connection = await pool.getConnection();

    try {
        // Verificar si el DNI, correo o nombre ya existen
        const [existingUser] = await connection.query(
            'SELECT * FROM tbl_personas INNER JOIN tbl_usuarios ON tbl_personas.cod_persona = tbl_usuarios.cod_persona WHERE dni_persona = ? OR correo_usuario = ? OR nombre_usuario = ?',
            [dni_persona, correo_usuario, nombre_usuario]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ mensaje: 'El DNI, correo o nombre de usuario ya existen en el sistema' });
        }

        // Si no existen, procedemos a crear la nueva persona
        const [personaResult] = await connection.query(
            'CALL crearPersona(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @cod_persona)', 
            [
                dni_persona,            
                Nombre,                  
                Segundo_nombre,         
                primer_apellido,         
                segundo_apellido,      
                tipo_persona,           
                direccion_persona,       
                fecha_nacimiento,       
                departamento,           
                Estado_Persona,         
                Genero_Persona           
            ]
        );
        
        // Obtener el cod_persona
        const [[result]] = await connection.query('SELECT @cod_persona AS cod_persona');
        const cod_persona = result.cod_persona; // Obtener el ID de la persona recién insertada

        // Generar token
        const token_usuario = Generar_Id(); // Definir token_usuario aquí

        // Hashear la contraseña antes de insertarla
        const saltRounds = 10; 
        const hashedPassword = await bcrypt.hash(contraseña_usuario, saltRounds);

        // Crear el usuario con el cod_persona y la contraseña hasheada
        const [nuevoUsuario] = await connection.query(
            'CALL crearUsuario(?, ?, ?, ?, ?, ?, ?)', 
            [nombre_usuario, correo_usuario, hashedPassword, rol_usuario, 0, token_usuario, cod_persona]  // Pasar 0 como confirmacion_email
        );

        res.status(201).json(nuevoUsuario);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al crear el usuario' });
    } finally {
        connection.release();
    }
};

// Obtener todos los usuarios
export const obtenerUsuarios = async (req, res) => {
    try {
        const [usuarios] = await pool.query('CALL ObtenerUsuarios()');
        res.status(200).json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener los usuarios' });
    }
};

// Confirmar la cuenta del usuario
export const confirmarCuenta = async (req, res) => {
    const { token_usuario } = req.params;

    const connection = await pool.getConnection();
    try {
        // Buscar el usuario con el token
        const [usuario] = await connection.query('SELECT * FROM tbl_usuarios WHERE token_usuario = ?', [token_usuario]);

        if (usuario.length === 0) {
            return res.status(404).json({ mensaje: 'Token no válido o cuenta ya confirmada' });
        }

        // Marcar la cuenta como confirmada
        await connection.query('UPDATE tbl_usuarios SET confirmacion_email = 1, token_usuario = NULL WHERE token_usuario = ?', [token_usuario]); // Agregada la coma

        res.status(200).json({ mensaje: 'Cuenta confirmada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al confirmar la cuenta' });
    } finally {
        connection.release();
    }
};

// Obtener un usuario por su cod_usuario
export const obtenerUsuarioPorId = async (req, res) => {
    try {
        const [usuario] = await pool.query('CALL ObtenerUsuarioPorID(?)', [req.params.cod_usuario]);

        // Verifica que el resultado tenga longitud y que contenga resultados
        if (!usuario || usuario.length === 0 || usuario[0].length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        // Devuelve el primer usuario encontrado
        res.status(200).json(usuario[0][0]); // Asegúrate de acceder al primer usuario
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener el usuario' });
    }
};

// Actualizar un usuario
export const actualizarUsuario = async (req, res) => {
    const { nombre_usuario, correo_usuario, contraseña_usuario, rol_usuario, confirmacion_email, token_usuario } = req.body;

    const connection = await pool.getConnection();
    try {
        let queryParams = [req.params.cod_usuario, nombre_usuario, correo_usuario, rol_usuario, confirmacion_email, token_usuario];
        if (contraseña_usuario) {
            const hashedPassword = await bcrypt.hash(contraseña_usuario, 10);
            queryParams.splice(2, 0, hashedPassword);
        }

        const [result] = await connection.query('CALL sp_actualizar_usuario(?, ?, ?, ?, ?, ?, ?)', queryParams);
        if (result.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        res.status(200).json({ mensaje: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al actualizar el usuario' });
    } finally {
        connection.release();
    }
};

// Eliminar un usuario y su persona asociada
export const eliminarUsuario = async (req, res) => {
    const cod_usuario = req.params.cod_usuario; // Asegúrate de que esto contenga solo el ID del usuario a eliminar.

    const connection = await pool.getConnection();
    try {
        // Primero, obtenemos el cod_persona asociado al usuario
        const [usuario] = await connection.query('SELECT cod_persona FROM tbl_usuarios WHERE cod_usuario = ?', [cod_usuario]);

        if (usuario.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        const cod_persona = usuario[0].cod_persona;

        // Eliminar el usuario
        await connection.query('DELETE FROM tbl_usuarios WHERE cod_usuario = ?', [cod_usuario]);

        // Luego eliminar la persona asociada
        const result = await connection.query('DELETE FROM tbl_personas WHERE cod_persona = ?', [cod_persona]);

        // No es necesario verificar aquí si se eliminó la persona, ya que se elimina el usuario primero
        // Pero podemos dejarlo para asegurar que no haya un error.
        if (result.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Persona no encontrada o ya eliminada' });
        }

        // Respuesta exitosa al eliminar el usuario y la persona
        res.status(200).json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al eliminar el usuario y la persona' });
    } finally {
        connection.release();
    }
};


export const autenticarUsuario = async (req, res) => {
    const { nombre_usuario, contraseña_usuario } = req.body;

    try {
        const [user] = await pool.query('SELECT * FROM tbl_usuarios WHERE nombre_usuario = ?', [nombre_usuario]);

        // Verificar si el usuario existe
        if (user.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        const usuario = user[0];

        // Verificar la contraseña
        const contraseñaValida = await bcrypt.compare(contraseña_usuario, usuario.contraseña_usuario);
        if (!contraseñaValida) {
            return res.status(401).json({ mensaje: 'Contraseña o nombre de usuario incorrecto' });
        }

        // Verificar si el usuario ha confirmado su cuenta
        if (usuario.confirmacion_email !== 1) { // Cambia a 1 para verificar la confirmación
            return res.status(403).json({ mensaje: 'Cuenta no confirmada. Por favor, verifica tu correo electrónico.' });
        }

        // Generar el token JWT
        const token = jwt.sign(
            { cod_usuario: usuario.cod_usuario, nombre_usuario: usuario.nombre_usuario, rol_usuario: usuario.rol_usuario },
            process.env.JWT_SECRET,  // Clave secreta del JWT
            { expiresIn: '1h' }      // Duración del token (1 hora en este ejemplo)
        );

        // Responder con el token
        res.status(200).json({
            mensaje: 'Autenticación exitosa',
            token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al autenticar usuario' });
    }
};
