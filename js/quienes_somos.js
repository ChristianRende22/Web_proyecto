import { db } from "../service/firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

async function cargarEquipo() {
    // 1. Contenedor donde se generarán las tarjetas
    const contenedor = document.querySelector(".grid");
    contenedor.innerHTML = ""; // limpiar contenido estático

    // 2. Traer todos los empleados desde Firestore
    const empleadosRef = collection(db, "empleados");
    const empleadosSnap = await getDocs(empleadosRef);

    const administradores = [];
    const empleados = [];

    // 3. Separar administradores y empleados nuevos
    empleadosSnap.forEach(doc => {
        const persona = doc.data();

        if (persona.rol && persona.rol.toLowerCase() === "administrador") {
            administradores.push(persona);
        } else {
            empleados.push(persona);
        }
    });

    // 4. Función para crear una tarjeta HTML para administradores
    function crearTarjetaAdmin(persona) {
        const card = document.createElement("article");
        card.classList.add("cartas");

        card.innerHTML = `
            <h3>${persona.nombre} ${persona.apellido}</h3>
            <div class="foto">
                <img src="${persona.imagen}" alt="${persona.nombre}">
            </div>
            <p>${persona.descripcion}</p>
            <p class="rol">${persona.cargo}</p>
            <a href="mailto:${persona.mail}" class="boton-correo">📧 Contactar</a> `;
        return card;
    }

    // 5. Función para crear una tarjeta HTML para empleados
    function crearTarjetaEmpleado(persona) {
        const card = document.createElement("article");
        card.classList.add("cartas", "cartas-empleado");

        card.innerHTML = `
            <h3>${persona.nombre} ${persona.apellido}</h3>
            <p>${persona.descripcion}</p>
            <p class="rol">${persona.cargo}</p>
            <a href="mailto:${persona.mail}" class="boton-correo">📧 Contactar</a> `;
        return card;
    }
    // 6. Primero agregar administradores (los 5 fijos)
    administradores.forEach(admin => {
        contenedor.appendChild(crearTarjetaAdmin(admin));
    });

    // 7. Luego agregar empleados nuevos
    empleados.forEach(empleado => {
        contenedor.appendChild(crearTarjetaEmpleado(empleado));
    });
}
// Ejecutar carga
cargarEquipo();

