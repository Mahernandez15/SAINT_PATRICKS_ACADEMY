import React, { useState } from 'react'
import './login.css'
import axios from 'axios'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faRedo } from '@fortawesome/free-solid-svg-icons';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useEffect } from 'react'
import Modal from 'react-modal';


// Login.jsx
import useAuth from '/hooks/useAuth';


const LoginRegister = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isTwoFA, setIsTwoFA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [isTwoFAOpen, setIsTwoFAOpen] = useState(false);

  const [passwordStrength, setPasswordStrength] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({

    identificador: '',
    contraseña_usuario: '',
    confirmPassword: '',
    dni: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    nacionalidad: '',
    direccion: '',
    fechaNacimiento: '',
  })
  const [errors, setErrors] = useState({
    email: '',
    contraseña: '',
  })

  const navigate = useNavigate()

 // Verificar si hay un token en el localStorage al cargar el componente
useEffect(() => {
  const token = localStorage.getItem('token');
  if (token) {
    // Si hay un token, redirigir al dashboard
    navigate('/active-session');
    window.location.reload(); // Recargar la página
  }
}, [navigate]);

  const toggleForm = () => {
    setIsLogin((prev) => !prev)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }))

    if (name === 'contraseña_usuario') {
      checkPasswordStrength(value)
    }
  }

  const checkPasswordStrength = (password) => {
    const strongRegex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})')
    const mediumRegex = new RegExp(
      '^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})',
    )

    if (strongRegex.test(password)) {
      setPasswordStrength('fuerte')
    } else if (mediumRegex.test(password)) {
      setPasswordStrength('media')
    } else {
      setPasswordStrength('débil')
    }
  }
  const generatePassword = () => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    

     // Evaluar la fortaleza de la contraseña generada
  checkPasswordStrength(password);

    // Actualizar el estado del formulario con la nueva contraseña
    // Actualizar el estado del formulario con la nueva contraseña
  setFormData((prevState) => ({
    ...prevState,
    contraseña_usuario: password,
    confirmPassword: password, // Asegúrate de que ambos campos coincidan
  }));

}

    // Mostrar la contraseña generada al usuario
    toast.info(`Contraseña generada}`, {
      position: 'top-center',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    })
  }
  // Función para realizar la solicitud al backend
  const resetPassword = async (correo_usuario) => {
    try {
      const response = await fetch('http://localhost:4000/api/usuarios/olvide-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo_usuario }), // Asegúrate de pasar el email correcto
      })

      if (!response.ok) {
        const errorResponse = await response.json()
        throw new Error(errorResponse.mensaje || 'Error al enviar el correo de restablecimiento')
      }

      return await response.json() // Aquí puedes retornar la respuesta si la necesitas
    } catch (error) {
      console.error(error)
      throw error // Lanzar el error para manejarlo en el catch
    }
  }

  // Manejador para restablecer contraseña
  const handleResetPassword = () => {
    Swal.fire({
      title: 'Restablecer Contraseña',
      input: 'email',
      inputPlaceholder: 'Ingresa tu correo electrónico',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return '¡Necesitas ingresar un correo electrónico!'
        }
        // Validar formato de correo
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailPattern.test(value)) {
          return 'Por favor ingresa un correo válido'
        }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.showLoading() // Muestra un indicador de carga
        resetPassword(result.value)
          .then((response) => {
            // Si el servidor responde con éxito, muestra un mensaje de éxito
            Swal.fire(
              '¡Éxito!',
              'Se ha enviado un correo para restablecer tu contraseña.',
              'success',
            )
          })
          .catch((error) => {
            // Maneja errores según el mensaje del backend
            const errorMessage = error.message
            if (errorMessage.includes('usuario no confirmado')) {
              Swal.fire(
                'Error',
                'No puedes restablecer la contraseña porque tu cuenta no está confirmada.',
                'error',
              )
            } else if (errorMessage.includes('usuario no existe')) {
              Swal.fire('Error', 'El usuario no existe.', 'error')
            } else {
              Swal.fire(
                'Error',
                'No se pudo restablecer la contraseña. Intenta de nuevo más tarde.',
                'error',
              )
            }
          })
      }
    })
  }

  // Manejador para el Login
// Manejador para el Login
const handleLoginSubmit = async (e) => {
  e.preventDefault();
  const newErrors = {};

  // Validación del login
  if (!formData.identificador) {
    newErrors.identificador = 'Identificador es requerido';
  }
  if (!formData.contraseña_usuario) {
    newErrors.contraseña_usuario = 'Contraseña es requerida';
  } else if (formData.contraseña_usuario.length < 6) {
    newErrors.contraseña_usuario = 'La contraseña debe tener al menos 6 caracteres';
  }

  setErrors(newErrors);

  if (Object.keys(newErrors).length === 0) {
    try {
      const response = await axios.post('http://localhost:4000/api/usuarios/login', {
        identificador: formData.identificador,
        contraseña_usuario: formData.contraseña_usuario,
      });

      console.log('Login exitoso:', response.data);

      // Guardar datos necesarios en localStorage
      localStorage.setItem('token', response.data.token);
      
      // Verificar si 2FA está habilitado y redirigir según corresponda
      if (response.data.is_two_factor_enabled === 1) {
        localStorage.setItem('temp_identificador', formData.identificador);
        navigate('/Auth2FA');
      } else {
        navigate('/dashboard');
        window.location.reload();
      }

    } catch (error) {
      console.error('Error en el login:', error);
      if (error.response) {
        toast.error(error.response.data.mensaje || 'Error en el inicio de sesión.', {
          position: 'top-center',
          autoClose: 5000,
        });
      }
    }
  }
};


// Manejador para verificar el código 2FA
const handleTwoFA = async (twoFACode) => {
  try {
      const response = await axios.post('http://localhost:4000/api/usuarios/verificar-2fa', {
          identificador: formData.identificador,
          twoFACode, // Código ingresado por el usuario
      });

      console.log('Verificación 2FA exitosa:', response.data);
      localStorage.setItem('token', response.data.token);
      navigate('/dashboard');
      window.location.reload();
  } catch (error) {
      console.error('Error en la verificación 2FA:', error);
      toast.error('Código de 2FA inválido. Intenta de nuevo.', {
          position: 'top-center',
          autoClose: 5000,
      });
  }
};

// Modal de 2FA
const TwoFAModal = ({ isOpen, onClose }) => {
  const [twoFACode, setTwoFACode] = useState('');

  const handleSubmit = (e) => {
      e.preventDefault();
      handleTwoFA(twoFACode); // Llamar a la función para manejar el envío del código
      setTwoFACode(''); // Limpiar el código después del envío
  };

  if (!isOpen) return null;

  return (
      <div className="modal">
          <div className="modal-content">
              <span className="close" onClick={onClose}>&times;</span>
              <h2>Ingrese el código de 2FA</h2>
              <form onSubmit={handleSubmit}>
                  <input
                      type="text"
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value)}
                      placeholder="Código 2FA"
                      required
                  />
                  <button type="submit">Enviar</button>
              </form>
          </div>
      </div>
  );
};
  // Manejador para el Pre-Registro
  const handleRegisterSubmit = async (e) => {

    e.preventDefault()
    const newErrors = {}

    // Validación del pre-registro
    if (!formData.primerNombre) newErrors.primerNombre = 'Primer nombre es requerido'
    if (!formData.primerApellido) newErrors.primerApellido = 'Primer apellido es requerido'
    if (!formData.identificador) newErrors.identificador = 'Correo es requerido'
    if (!formData.contraseña_usuario) newErrors.contraseña_usuario = 'Contraseña es requerida'
    else if (formData.contraseña_usuario.length < 6)
      newErrors.contraseña_usuario = 'La contraseña debe tener al menos 6 caracteres'
    if (formData.contraseña_usuario !== formData.confirmPassword)
      newErrors.confirmPassword = 'Las contraseñas no coinciden'

    setErrors(newErrors)

    // Si hay errores, no continuar
    if (Object.keys(newErrors).length > 0) return

    try {
      // Si no hay errores, enviar los datos al servidor
      const response = await axios.post('http://localhost:4000/api/usuarios/pre-registrar-padre', {
        primer_nombre: formData.primerNombre,
        primer_apellido: formData.primerApellido,
        correo_usuario: formData.identificador, // Cambiar el nombre a correo_usuario
        contraseña_usuario: formData.contraseña_usuario,
        confirmar_contraseña: formData.confirmPassword, // Agregar el campo de confirmación
        Primer_ingreso: true, // Marcamos que es el primer ingreso
      })

      // Manejo de la respuesta del servidor
      toast.success('Registro exitoso. Por favor, revisa tu correo electrónico para confirmar.', {
        position: 'top-right',
        autoClose: 5000,
        style: {
          backgroundColor: '#4caf50',
          color: '#ffffff',
          fontWeight: 'bold',
        },
      })

      // Redirigir al usuario a la página de confirmación de correo electrónico
      navigate(`/confirmacion-email/${formData.identificador}`) // Cambiar a la ruta correcta
      window.location.reload()
    } catch (error) {
      // Manejo de errores de la solicitud
      if (error.response) {
        // El servidor respondió con un código de estado que no está en el rango de 2xx
        toast.error(error.response.data.mensaje || 'Error al registrar el usuario.', {
          position: 'top-right',
          autoClose: 5000,
          style: {
            backgroundColor: '#f44336',
            color: '#ffffff',
            fontWeight: 'bold',
          },
        })
      } else {
        // Error al hacer la solicitud
        toast.error('Error de conexión. Por favor, intenta más tarde.', {
          position: 'top-right',
          autoClose: 5000,
          style: {
            backgroundColor: '#f44336',
            color: '#ffffff',
            fontWeight: 'bold',
          },
        })
      }
    }
  }
  return (
    <div className={`container ${!isLogin ? 'right-panel-active' : ''}`}>
      {/* Formulario de Login */}
      <div className="form-container login-container">
        <form onSubmit={handleLoginSubmit}>
          <h2 className="title">Iniciar Sesión</h2>
          <div className="form-control">
            <input
              type="text"
              name="identificador"
              placeholder="Correo o Nombre de Usuario"
              onChange={handleChange}
              required
            />
            <span></span>
            {errors.identificador && <small>{errors.identificador}</small>}
          </div>
          <div className="form-control">
            <input
              type="password"
              name="contraseña_usuario"
              placeholder="Contraseña"
              onChange={handleChange}
              required
            />

            
            <span></span>
            {errors.contraseña_usuario && <small>{errors.contraseña_usuario}</small>}
          </div>
          <button type="submit">Iniciar Sesión</button>
          <span>
            ¿Olvidaste tu contraseña?{' '}
            <button
              type="button"
              onClick={handleResetPassword}
              style={{
                background: '#318f49', // Color de fondo
                border: 'none', // Sin borde
                color: '#fff', // Color del texto
                cursor: 'pointer', // Cursor de mano al pasar
                padding: '10px 20px', // Espaciado interno
                borderRadius: '12px', // Bordes redondeados
                fontSize: '9px', // Tamaño de la fuente
                fontWeight: 'bold', // Negrita
                transition: 'background 0.3s, transform 0.3s', // Transiciones suaves
              }}
            >
              Recupera tu contraseña aquí
            </button>
          </span>
        </form>
      </div>

   {/* Formulario de Pre-Registro */}
<div className="form-container register-container">
  <form onSubmit={handleRegisterSubmit}>
    <h2 className="title">Pre-Registro</h2>

    {/* Campo para Primer Nombre */}
    <div className="form-control2">
      <input
        type="text"
        name="primerNombre"
        placeholder="Primer Nombre (Requerido)"
        onChange={handleChange}
        required
      />
      <span></span>
      {errors.primerNombre && <small className="error-message">{errors.primerNombre}</small>}
    </div>

    {/* Campo para Primer Apellido */}
    <div className="form-control2">
      <input
        type="text"
        name="primerApellido"
        placeholder="Primer Apellido (Requerido)"
        onChange={handleChange}
        required
      />
      <span></span>
      {errors.primerApellido && (
        <small className="error-message">{errors.primerApellido}</small>
      )}
    </div>

    {/* Campo para Correo Electrónico */}
    <div className="form-control2">
      <input
        type="email"
        name="identificador"
        placeholder="Correo Electrónico (Requerido)"
        onChange={handleChange}
        required
      />
      <span></span>
      {errors.identificador && (
        <small className="error-message">{errors.identificador}</small>
      )}
    </div>

   {/* Campo para Contraseña */}
<div className="form-control2" style={{ position: 'relative', marginBottom: '20px' }}>
  <input
    type={showPassword ? 'text' : 'password'}
    name="contraseña_usuario"
    placeholder="Contraseña"
    value={formData.contraseña_usuario}
    onChange={handleChange}
    required
    style={{
      width: '100%',
      padding: '10px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '16px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    }}
  />
  


  {errors.contraseña && <small className="error-message">{errors.contraseña}</small>}
  {passwordStrength && (
    <div
      style={{
        marginTop: '5px',
        width: '100%',
        backgroundColor: '#e0e0e0',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '10px',
          width:
            passwordStrength === 'fuerte'
              ? '100%'
              : passwordStrength === 'media'
              ? '66%'
              : '33%',
          backgroundColor:
            passwordStrength === 'fuerte'
              ? '#4CAF50'
              : passwordStrength === 'media'
              ? '#FFA500'
              : '#FF0000',
          transition: 'width 0.3s ease-in-out',
        }}
      />
    </div>
  )}
</div>


    {/* Campo para Confirmar Contraseña */}
    <div className="form-control2" style={{ position: 'relative', marginBottom: '20px' }}>
      <input
        type={showPassword ? 'text' : 'password'}
        name="confirmPassword"
        placeholder="Confirma Contraseña (Requerido)"
        value={formData.confirmPassword}
        onChange={handleChange}
        required
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '16px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        }}
      />
      {errors.confirmPassword && <small className="error-message">{errors.confirmPassword}</small>}
    </div>

{/* Contenedor de Botones */}
<div style={{ 
  display: 'flex', 
  gap: '0px',
  marginTop: '8px',
  paddingBottom: '8px'
}}>
  {/* Botón para Mostrar/Ocultar Contraseña */}
  <button
    type="button"
    onClick={() => setShowPassword(prev => !prev)}
    style={{
      padding: '6px 10px',
      backgroundColor: '#2E7D32',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '9px', // Texto más pequeño
      height: '28px',
      transition: 'all 0.2s ease',
      width: '80px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    }}
  >
    {showPassword ? 
      <Eye size={12} style={{ marginRight: '3px' }} /> : // Icono más pequeño
      <EyeOff size={12} style={{ marginRight: '3px' }} />
    }
    <span>{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
  </button>

  {/* Botón para Generar Contraseña */}
  <button
    type="button"
    onClick={generatePassword}
    style={{
      padding: '6px 10px',
      backgroundColor: '#1B5E20',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '9px', // Texto más pequeño
      height: '28px',
      transition: 'all 0.2s ease',
      width: '90px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    }}
  >
    <RefreshCw size={12} style={{ marginRight: '3px' }} /> {/* Icono más pequeño */}
    <span>Generar contraseña</span>
  </button>

  {/* Botón de Pre-Registro */}
  <button 
    type="submit" 
    className="submit-button"
    style={{
      padding: '6px 10px',
      backgroundColor: '#43A047',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px', // Texto más pequeño
      fontWeight: '500',
      textAlign: 'center',
      height: '28px',
      width: '80px',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    }}
  >
    Continuar
  </button>
</div>



  </form>
</div>

      {/* Panel de Overlay */}
      <div className="overlay-container">
        <div className="overlay">
          <div className="overlay-panel overlay-left">
            <h1>¡Bienvenido de nuevo!</h1>
            <p>Para mantenerte conectado con nosotros, inicia sesión con tus datos asignados</p>
            <button className="ghost" id="signIn" onClick={toggleForm}>
              Iniciar Sesión
            </button>
          </div>
          <div className="overlay-panel overlay-right">
            <h2>Saint Patrick´s Academy</h2>
            <p>Ingresa tus datos personales y comienza tu viaje con nosotros</p>

            <button className="ghost" id="signUp" onClick={toggleForm}>
              Pre-Regístrate
            </button>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}

export default LoginRegister