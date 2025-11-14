import { db } from '../service/frebase.js';
import { getFirestore, collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

// Mapeo de iconos por categoría
const iconosPorCategoria = {
    'naturaleza': 'fa-mountain',
    'playas': 'fa-umbrella-beach',
    'cultura': 'fa-landmark',
    'aventura': 'fa-route',
    'gastronomía': 'fa-utensils',
    'gastronomiía': 'fa-utensils', // variante con acento
    'deportes': 'fa-futbol',
    'museos': 'fa-museum',
    'parques': 'fa-tree',
    'hoteles': 'fa-hotel',
    'transporte': 'fa-bus'
};

// Función para obtener el icono apropiado
function obtenerIcono(nombreCategoria) {
    const nombreLower = nombreCategoria.toLowerCase().trim();
    return iconosPorCategoria[nombreLower] || 'fa-map-marker-alt'; // icono por defecto
}

async function cargarTarifas() {
    const container = document.getElementById('tarifas-container');
    const tarifasRef = collection(db, "tarifas");
    const tarifasSnap = await getDocs(tarifasRef);

    container.innerHTML = "";

    for (const categoriaDoc of tarifasSnap.docs) {
        const categoria = categoriaDoc.data(); 
        const categoriaId = categoriaDoc.id;

        // Crear la tarjeta de categoría
        const card = document.createElement('article');
        card.classList.add('categoria-card');

  
        const icono = obtenerIcono(categoria.nombre);
        card.innerHTML = `
            <div class="card-header">
                <div class="icono-categoria"><i class="fas ${icono}"></i></div>
                <h3>${categoria.nombre}</h3>
            </div>
            <div class="card-main">
                <div class="card-media">
                    <img src="${categoria.imagen || ''}" alt="${categoria.nombre}">
                </div>
                <div class="card-body">
                    <ul class="item-list"></ul>
                </div>
            </div>
        `;

        // Cargar lugares de la categoría seleccionada
        const lugaresRef = collection(db, `tarifas/${categoriaId}/lugares`);
        const lugaresSnap = await getDocs(lugaresRef);

        const lista = card.querySelector(".item-list");

        lugaresSnap.forEach(lugarDoc => {
            const lugar = lugarDoc.data();

            const li = document.createElement("li");
            li.classList.add("item");

            li.innerHTML = `
                <div>
                    <div class="item-name">${lugar.nombre}</div>
                    <small class="item-note">${lugar.descripcion}</small>
                </div>
                <div class="item-right">
                    <span class="${lugar.costo.toLowerCase().includes('gratis') ? 'item-badge-small' : 'item-price'}">
                        ${lugar.costo}
                    </span>
                </div>
            `;

            lista.appendChild(li);
        });

        container.appendChild(card);
    }
}

cargarTarifas(); 