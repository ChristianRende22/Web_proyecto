import { db } from "./firebase.js";
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

        return { success: true, data: atracciones }

    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Función para obtener el array de una subcolección (un solo documento)
async function getSubcoleccion(atraccionId, subcoleccionName) {
    try {
        const subcoleccionRef = collection(db, COLECCTION_NAME, atraccionId, subcoleccionName)
        const result = await getDocs(subcoleccionRef)

        // Como solo hay un documento, obtenemos el primero
        if (!result.empty) {
            const doc = result.docs[0]
            return { success: true, data: doc.data() }
        }

        return { success: false, data: null }
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
                <button class="ver-detalles" data-bs-toggle="modal" data-bs-target="#atraccionModal" data-id="${atrac.id}">
                    Cómo llegar
                </button>
            </div>
        </div>
        `
    })

    atraccionContainer.innerHTML = html

    // Agregar eventos a los botones
    document.querySelectorAll('.ver-detalles').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id
            const atraccion = data.find(a => a.id === id)
            await mostrarModal(atraccion)
        })
    })
}

// Función para mostrar el modal con las 3 subcolecciones
async function mostrarModal(atrac) {
    const modalContainer = document.querySelector('#atraccionModal')
    
    // Obtener las 3 subcolecciones
    const [lugarRes, transporteParticularRes, transportePublicoRes] = await Promise.all([
        getSubcoleccion(atrac.id, 'atraccionesLugar'),
        getSubcoleccion(atrac.id, 'trasporteParticular'),
        getSubcoleccion(atrac.id, 'trasportePublico')
    ])

    // Obtener el array del documento
    const atraccionesLugar = lugarRes.success && lugarRes.data?.atraccionesLugar ? lugarRes.data.atraccionesLugar : []
    const transporteParticular = transporteParticularRes.success && transporteParticularRes.data?.trasporteParticular ? transporteParticularRes.data.trasporteParticular : []
    const transportePublico = transportePublicoRes.success && transportePublicoRes.data?.trasportePublico ? transportePublicoRes.data.trasportePublico : []

    modalContainer.innerHTML = `
        <div class="modal-content">
            <div class="modal-header cardDet-header ">
                <h2 class="modal-title">${atrac.lugar}</h2>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="info-general mt-5">
                <h3>📌 Desde San Salvador</h3>
                <ul class="p-0">
                    <li>Distancia: ${atrac.distancia}</li>
                    <li>Tiempo: ${atrac.tiempo}</li>
                </ul>
            </div>
            <div class="modal-body">
                <div class=""> 
                    <div class="cardDet-body">
                        <!-- Atracciones en el lugar -->
                        ${Array.isArray(atraccionesLugar) && atraccionesLugar.length > 0 ? `
                            <div class="transporte-card">
                                <h3>🚵 Atracciones en el lugar</h3>
                                <ul>
                                    ${atraccionesLugar.map(item => `<li>- ${item}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}

                        <div class="opciones-transporte">
                            <!-- Transporte Particular -->
                            ${Array.isArray(transporteParticular) && transporteParticular.length > 0 ? `
                                <div class="transporte-card">
                                    <h3>🚗 Transporte particular</h3>
                                    <ul>
                                        ${transporteParticular.map(item => `<li>- ${item}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}

                            <!-- Transporte Público -->
                            ${Array.isArray(transportePublico) && transportePublico.length > 0 ? `
                                <div class="transporte-card">
                                    <h3>🚌 Transporte público</h3>
                                    <ul>
                                        ${transportePublico.map(item => `<li>- ${item}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>

                        <div class="mapa-section">
                            <h3>📍 Ubicación en el mapa</h3>
                            <div class="mapa-placeholder">
                                ${atrac.mapa}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
}

// Ejecuta el render al cargar la página
document.addEventListener("DOMContentLoaded", cardAtracciones);

