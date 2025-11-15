// Importar Firebase Authentication
import { auth, db } from '../service/firebase.js';
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// Referencias DOM
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const alertContainer = document.getElementById('alertContainer');
const rememberMeCheckbox = document.getElementById('rememberMe');

/**
 * Mostrar alertas
 */
function showAlert(message, type = 'danger') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);

    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

/**
 * Verificar si el usuario ya está autenticado al cargar la página
 */
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuario ya está autenticado, redirigir al dashboard
        console.log('Usuario ya autenticado:', user.email);
        window.location.href = 'index.html';
    }
});

/**
 * Manejar el envío del formulario de login
 */
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = rememberMeCheckbox.checked;

    // Deshabilitar botón mientras procesa
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';

    try {
        // Configurar persistencia según "Recordarme"
        const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);

        // Intentar iniciar sesión
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log('Login exitoso:', user.email);

        // Verificar que el usuario existe en la colección empleados
        const empleadosRef = collection(db, 'empleados');
        const q = query(empleadosRef, where('mail', '==', email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const empleadoData = querySnapshot.docs[0].data();
            
            // Guardar datos del empleado en sessionStorage
            sessionStorage.setItem('empleado', JSON.stringify({
                uid: user.uid,
                email: user.email,
                nombre: empleadoData.nombre,
                apellido: empleadoData.apellido,
                rol: empleadoData.rol,
                imagen: empleadoData.imagen
            }));

            showAlert('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
            
            // Redirigir al dashboard después de 1 segundo
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            // Usuario autenticado pero no está en la colección empleados
            await auth.signOut();
            showAlert('No tienes permisos para acceder al panel de administración.', 'warning');
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        }

    } catch (error) {
        console.error('Error en login:', error);
        
        let errorMessage = 'Error al iniciar sesión. Intenta de nuevo.';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'El formato del email no es válido.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No existe una cuenta con este email.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Contraseña incorrecta.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Esta cuenta ha sido deshabilitada.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Demasiados intentos fallidos. Intenta más tarde.';
                break;
            case 'auth/invalid-credential':
                errorMessage = 'Email o contraseña incorrectos.';
                break;
        }
        
        showAlert(errorMessage, 'danger');
        
        // Rehabilitar botón
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
    }
});

// Prevenir acceso directo a páginas protegidas
window.addEventListener('load', () => {
    console.log('Login page cargada');
});
