// Importar funciones de Firebase
import { db } from '../service/firebase.js';
import { collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

// Referencias a las colecciones
const empleadosRef = collection(db, 'empleados');
const atraccionesRef = collection(db, 'atracciones');
const tarifasRef = collection(db, 'tarifas');
const contactosRef = collection(db, 'contactos');

// Función para actualizar el contador en tiempo real
function actualizarContador(collectionRef, elementId) {
    onSnapshot(collectionRef, (snapshot) => {
        const count = snapshot.size;
        const elemento = document.getElementById(elementId);
        if (elemento) {
            elemento.textContent = count;
        }
    }, (error) => {
        console.error(`Error al obtener datos de ${elementId}:`, error);
    });
}

// Inicializar los contadores cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Actualizar contadores en tiempo real
    actualizarContador(empleadosRef, 'totalEmpleados');
    actualizarContador(atraccionesRef, 'totalAtracciones');
    actualizarContador(tarifasRef, 'totalTarifas');
    actualizarContador(contactosRef, 'totalContactos');
});
