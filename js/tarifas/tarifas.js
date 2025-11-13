import { db } from '../service/frebase.js';
import { getFirestore, collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

const cards = document.querySelectorAll(".categoria-card");

async function cargarTarifas() {
    const tarifasRef = collection(db, "tarifas");
    const tarifasSnap = await getDocs(tarifasRef);

    tarifasSnap.forEach(async (categoriaDoc) => {
        const categoria = categoriaDoc.data(); 
        const categoriaId = categoriaDoc.id;

        // tarjeta <h3> 
        const card = Array.from(cards).find(c =>
            c.querySelector("h3").textContent.trim().toLowerCase() === categoria.nombre.toLowerCase()
        );

        if (!card) return; // si no existe, saltar

        // imagen
        const img = card.querySelector(".card-media img");
        if (img) img.src = categoria.imagen;

        // lugares
        const lugaresRef = collection(db, `tarifas/${categoriaId}/lugares`);
        const lugaresSnap = await getDocs(lugaresRef);

        const lista = card.querySelector(".item-list");
        lista.innerHTML = ""; 

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
    });
}

cargarTarifas();