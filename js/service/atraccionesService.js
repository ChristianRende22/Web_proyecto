import { db } from "./frebase.js";
import { collection, query, getDocs, getDoc, doc } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

const COLECCTION_NAME = "atracciones"

export async function getAllAtracciones() {
    try {
        const q = query(collection(db, COLECCTION_NAME))
        const result = await getDocs(q)

        const atracciones = []

        result.forEach(doc => {
            atracciones.push({
                id: doc.id,
                ...doc.data()
            })
        });

        console.log(atracciones);

        return { success: true, data: atracciones }

    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Renderiza las cards en el contenedor
export async function cardAtracciones() {
    const atraccionContainer = document.querySelector("#atraccion")
    const { success, data } = await getAllAtracciones()
    if (!success) return

    let html = ""
    data.forEach(atrac => {
        html += `
        <div class="lugar">
            <img src="${atrac.imagen}" alt="${atrac.lugar}">
            <div class="info">
                <h3>${atrac.lugar}</h3>
                <p>${atrac.descripcion}</p>
                <div class="actividades">
                    ${(atrac.actividades || []).map(act => `<span class="actividad">${act}</span>`).join('')}
                </div>
                <span class="categoria ${atrac.categoria}">${atrac.categoria.toUpperCase()}</span>
                <label for="card1" class="ver-detalles">Cómo llegar</label>
            </div>
        </div>
        `
    })

    atraccionContainer.innerHTML = html
}

// Ejecuta el render al cargar la página
document.addEventListener("DOMContentLoaded", cardAtracciones);

