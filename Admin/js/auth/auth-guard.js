// Auth Guard - Protección de rutas
import { auth, db } from '../service/firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

/**
 * Verificar autenticación del usuario y cargar datos si es necesario
 */
function checkAuth() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Usuario autenticado
                console.log('Usuario Firebase autenticado:', user.email);
                
                // Verificar si los datos ya están en sessionStorage
                const existingData = sessionStorage.getItem('empleado');
                if (!existingData) {
                    console.log('Datos no encontrados en sessionStorage, cargando desde Firestore...');
                    try {
                        // Cargar datos del empleado desde Firestore
                        const empleadosRef = collection(db, 'empleados');
                        const q = query(empleadosRef, where('mail', '==', user.email));
                        const querySnapshot = await getDocs(q);
                        
                        if (!querySnapshot.empty) {
                            const empleadoData = querySnapshot.docs[0].data();
                            
                            // Guardar en sessionStorage
                            sessionStorage.setItem('empleado', JSON.stringify({
                                uid: user.uid,
                                email: user.email,
                                nombre: empleadoData.nombre,
                                apellido: empleadoData.apellido,
                                rol: empleadoData.rol,
                                imagen: empleadoData.imagen
                            }));
                            
                            console.log('Datos del empleado cargados:', empleadoData);
                        }
                    } catch (error) {
                        console.error('Error al cargar datos del empleado:', error);
                    }
                }
                
                resolve(user);
            } else {
                // Usuario no autenticado, redirigir a login
                console.log('Usuario no autenticado, redirigiendo a login...');
                window.location.href = 'login.html';
                reject('No autenticado');
            }
        });
    });
}

/**
 * Cerrar sesión
 */
async function logout() {
    try {
        await signOut(auth);
        sessionStorage.clear();
        localStorage.removeItem('empleado');
        // Ruta relativa: todas las páginas están en Admin/
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Error al cerrar sesión');
    }
}

/**
 * Obtener datos del usuario actual desde sessionStorage
 */
function getCurrentUser() {
    const empleadoData = sessionStorage.getItem('empleado');
    if (empleadoData) {
        return JSON.parse(empleadoData);
    }
    return null;
}


function checkModuleAccess(moduleName) {
    const userData = getCurrentUser();
    if (!userData) {
        console.log('No se encontraron datos de usuario en sessionStorage');
        return false;
    }

    console.log('Datos de usuario:', userData);
    console.log('Rol del usuario:', userData.rol);
    console.log('Módulo solicitado:', moduleName);

    // Definir reglas de acceso por rol
    const accessRules = {
        'administrador': ['empleados', 'atracciones', 'tarifas', 'contactos'], // Administrador tiene acceso a todo
        'admin': ['empleados', 'atracciones', 'tarifas', 'contactos'], // Admin también tiene acceso a todo (alias)
        'empleado': ['atracciones', 'tarifas', 'contactos'] // Empleado NO tiene acceso a empleados
    };

    const userRole = userData.rol || 'empleado';
    const allowedModules = accessRules[userRole] || [];

    console.log('Módulos permitidos para el rol:', allowedModules);
    console.log('¿Tiene acceso?:', allowedModules.includes(moduleName));

    return allowedModules.includes(moduleName);
}


async function requireModuleAccess(moduleName) {
    await checkAuth();
    
    if (!checkModuleAccess(moduleName)) {
        console.log('Acceso denegado al módulo:', moduleName);
        alert('No tienes permisos para acceder a este módulo.');
        window.location.href = 'index.html';
    } else {
        console.log('Acceso permitido al módulo:', moduleName);
    }
}


function updateUserUI() {
    const userData = getCurrentUser();
    if (userData) {
        const userNameElements = document.querySelectorAll('.text-gray-600.small');
        userNameElements.forEach(element => {
            element.textContent = `${userData.nombre} ${userData.apellido}`;
        });

        const profileImages = document.querySelectorAll('.img-profile');
        profileImages.forEach(img => {
            if (userData.imagen) {
                img.src = userData.imagen;
            }
        });

        // Ocultar módulos según el rol
        hideRestrictedModules(userData.rol);
    }
}


function hideRestrictedModules(userRole) {
    // Si el usuario NO es administrador ni admin, ocultar el módulo de empleados
    if (userRole !== 'administrador' && userRole !== 'admin') {
        // Buscar el enlace al módulo de empleados en el menú
        const empleadosLinks = document.querySelectorAll('a[href="empleados.html"]');
        empleadosLinks.forEach(link => {
            const listItem = link.closest('li.nav-item');
            if (listItem) {
                listItem.style.display = 'none';
            }
        });
    }
}

checkAuth().then((user) => {
    console.log('Usuario autenticado:', user.email);
    updateUserUI();
}).catch((error) => {
    console.error('Error de autenticación:', error);
});

// Configurar eventos de cierre de sesión
document.addEventListener('DOMContentLoaded', () => {
    const logoutLinks = document.querySelectorAll('a[data-target="#logoutModal"]');
    
    if (logoutLinks.length > 0) {
        const logoutModal = document.getElementById('logoutModal');
        if (logoutModal) {
            const confirmLogoutBtn = logoutModal.querySelector('.btn-primary');
            if (confirmLogoutBtn) {
                confirmLogoutBtn.addEventListener('click', logout);
            }
        }
    }

    const directLogoutLinks = document.querySelectorAll('a[href*="logout"]');
    directLogoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                logout();
            }
        });
    });
});

// Exportar funciones para uso externo
export { checkAuth, logout, getCurrentUser, updateUserUI, checkModuleAccess, requireModuleAccess };
