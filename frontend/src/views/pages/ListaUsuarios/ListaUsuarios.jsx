import React, { useEffect, useState } from 'react';
import { Shield, ShieldOff, AlertCircle, Search, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingUsers, setProcessingUsers] = useState(new Set());
  const loggedInUserId = localStorage.getItem('userId');
  const loggedInUserRole = localStorage.getItem('userRole');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');

    if (!token) {
      Swal.fire({
        title: 'Error',
        text: 'No se ha encontrado el token. Por favor, inicia sesión nuevamente.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('http://localhost:4000/api/usuarios/Todos-los-usuarios', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = Array.isArray(response.data[0]) ? response.data[0] : response.data;
      setUsers(userData);

      if (userData.length > 0) {
        Swal.fire({
          title: 'Éxito',
          text: 'Usuarios cargados correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar',
        });
      } else {
        Swal.fire({
          title: 'Aviso',
          text: 'No se encontraron usuarios',
          icon: 'warning',
          confirmButtonText: 'Aceptar',
        });
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.mensaje || 'Error al cargar usuarios',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
      setErrorMessage(error.response?.data?.mensaje || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    // Prevent the current user from modifying their own status
    if (parseInt(loggedInUserId) === userId) {
      Swal.fire({
        title: 'Error',
        text: 'No puedes cambiar tu propio estado de privilegios.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    // Prevent administrators from modifying the status of other administrators
    if (loggedInUserRole === '2' && newStatus !== '2' && users.find(user => user.cod_usuario === userId)?.Cod_rol === '2') {
      Swal.fire({
        title: 'Error',
        text: 'No puedes cambiar el estado de otros administradores.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    // Prevent managers from modifying the status of other managers
    if (loggedInUserRole === '4' && newStatus !== '2' && users.find(user => user.cod_usuario === userId)?.Cod_rol === '4') {
      Swal.fire({
        title: 'Error',
        text: 'No puedes cambiar el estado de otros managers.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    if (processingUsers.has(userId)) {
      return;
    }

    const statusTexts = {
      1: 'activar',
      2: 'desactivar',
      3: 'suspender',
    };

    const { value: confirm } = await Swal.fire({
      title: `¿Estás seguro de que deseas ${statusTexts[newStatus]} este usuario?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, estoy seguro',
      cancelButtonText: 'Cancelar',
    });

    if (!confirm) {
      return;
    }

    const token = localStorage.getItem('token');

    if (!token) {
      Swal.fire({
        title: 'Error',
        text: 'No se encontró el token de autenticación',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    try {
      setProcessingUsers(prev => new Set(prev).add(userId));

      const response = await axios.put(
        'http://localhost:4000/api/usuarios/cambiar-estado',
        {
          userId: userId,
          Cod_estado_usuario: newStatus,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.status === 200) {
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.cod_usuario === userId
              ? { ...user, Cod_estado_usuario: newStatus }
              : user
          )
        );
        Swal.fire({
          title: 'Éxito',
          text: 'Estado actualizado correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar',
        });
      }
    } catch (error) {
      console.error('Error detallado:', error.response?.data);
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.mensaje || 'Error al cambiar el estado del usuario',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 1:
        return <Shield className="status-icon active" size={18} />;
      case 2:
        return <ShieldOff className="status-icon inactive" size={18} />;
      case 3:
        return <AlertCircle className="status-icon suspended" size={18} />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 1:
        return 'Activo';
      case 2:
        return 'Inactivo';
      case 3:
        return 'Suspendido';
      default:
        return 'Desconocido';
    }
  };

  const getRoleText = (Cod_rol) => {
    switch (Cod_rol) {
      case 1:
        return 'Padre';
      case 2:
        return 'Administrador';
      case 3:
        return 'Docente';
      case 4:
        return 'Manager';
      default:
        return 'Desconocido';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      (user.nombre_usuario?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (user.correo_electronico?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    const matchesStatus = statusFilter === 'all' || user.Cod_estado_usuario === parseInt(statusFilter);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="user-management">
      <div className="header">
        <h1>Gestión de Usuarios</h1>
        {errorMessage && <div className="error-message">{errorMessage}</div>}

        <div className="controls">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-box">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="1">Activos</option>
              <option value="2">Inactivos</option>
              <option value="3">Suspendidos</option>
            </select>
            <ChevronDown size={20} className="select-icon" />
          </div>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-message">Cargando usuarios...</div>
        ) : (
          <>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.cod_usuario}>
                    <td className="user-cell">
                      <div className="user-info">
                        <span className="user-name">{user.nombre_usuario}</span>
                        <span className="user-email">{user.correo_electronico}</span>
                      </div>
                    </td>
                    <td>{getRoleText(user.Cod_rol)}</td>
                    <td>
                      <span className={`status-badge status-${user.Cod_estado_usuario}`}>
                        {getStatusIcon(user.Cod_estado_usuario)}
                        {getStatusText(user.Cod_estado_usuario)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className={`btn btn-activate ${(user.Cod_estado_usuario === 1 || processingUsers.has(user.cod_usuario) || user.Cod_rol === '2' || user.Cod_rol === '4') ? 'disabled' : ''}`}
                          onClick={() => handleStatusChange(user.cod_usuario, 1)}
                          disabled={user.Cod_estado_usuario === 1 || processingUsers.has(user.cod_usuario) || user.Cod_rol === '2' || user.Cod_rol === '4'}
                        >
                          Activar
                        </button>
                        <button
                          className={`btn btn-deactivate ${(user.Cod_estado_usuario === 2 || processingUsers.has(user.cod_usuario) || user.Cod_rol === '2' || user.Cod_rol === '4') ? 'disabled' : ''}`}
                          onClick={() => handleStatusChange(user.cod_usuario, 2)}
                          disabled={user.Cod_estado_usuario === 2 || processingUsers.has(user.cod_usuario) || user.Cod_rol === '2' || user.Cod_rol === '4'}
                        >
                          Desactivar
                        </button>
                        <button
                          className={`btn btn-suspend ${(user.Cod_estado_usuario === 3 || processingUsers.has(user.cod_usuario) || user.Cod_rol === '2' || user.Cod_rol === '4') ? 'disabled' : ''}`}
                          onClick={() => handleStatusChange(user.cod_usuario, 3)}
                          disabled={user.Cod_estado_usuario === 3 || processingUsers.has(user.cod_usuario) || user.Cod_rol === '2' || user.Cod_rol === '4'}
                        >
                          Suspender
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="no-results-message">
                No se encontraron usuarios que coincidan con tu búsqueda.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagement;