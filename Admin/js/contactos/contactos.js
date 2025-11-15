// Importar Firebase y Firestore
import { db } from '../service/firebase.js';
import {
    collection, getDocs, getDoc, doc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// Referencias DOM
const contactosTableBody = document.getElementById('contactosTableBody');
const alertContainer = document.getElementById('alertContainer');
const totalContactosSpan = document.getElementById('totalContactos');
const filterDestino = document.getElementById('filterDestino');
const filterNewsletter = document.getElementById('filterNewsletter');
const filterFecha = document.getElementById('filterFecha');

let dataTable = null;
let allContactos = [];
let destinosSet = new Set();

document.addEventListener('DOMContentLoaded', () => {
    loadContactos();
    setupFilters();
});

function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `${message}<button type="button" class="close" data-dismiss="alert"><span>&times;</span></button>`;
    alertContainer.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

function loadContactos() {
    const contactosRef = collection(db, 'contactos');
    const q = query(contactosRef, orderBy('createdAt', 'desc'));

    onSnapshot(q, (snapshot) => {
        if (dataTable) { dataTable.destroy(); dataTable = null; }
        contactosTableBody.innerHTML = '';
        allContactos = [];
        destinosSet.clear();

        if (snapshot.empty) {
            contactosTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted"><i class="fas fa-inbox fa-3x mb-3 d-block"></i>No hay mensajes de contacto</td></tr>';
            totalContactosSpan.textContent = '0 mensajes';
            return;
        }

        snapshot.forEach((docSnap) => {
            const contacto = { id: docSnap.id, ...docSnap.data() };
            allContactos.push(contacto);
            if (contacto.destino) destinosSet.add(contacto.destino);
            const row = createContactoRow(contacto);
            contactosTableBody.appendChild(row);
        });

        totalContactosSpan.textContent = `${allContactos.length} ${allContactos.length === 1 ? 'mensaje' : 'mensajes'}`;
        populateDestinosFilter();
        initDataTable();
    }, (error) => {
        console.error('Error:', error);
        showAlert('Error al cargar contactos', 'danger');
    });
}

function createContactoRow(contacto) {
    const row = document.createElement('tr');
    
    // Formatear fecha
    let fechaStr = 'N/A';
    if (contacto.createdAt) {
        try {
            const fecha = contacto.createdAt.toDate ? contacto.createdAt.toDate() : new Date(contacto.createdAt);
            fechaStr = fecha.toLocaleDateString('es-SV', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            fechaStr = contacto.fechaViaje || 'N/A';
        }
    } else if (contacto.fechaViaje) {
        fechaStr = contacto.fechaViaje;
    }
    
    const newsletterBadge = contacto.newsletter 
        ? '<span class="badge badge-success" style="padding: 5px 10px;"><i class="fas fa-check-circle mr-1"></i>Sí</span>'
        : '<span class="badge badge-secondary" style="padding: 5px 10px;"><i class="fas fa-times-circle mr-1"></i>No</span>';
    
    const destinoBadge = contacto.destino 
        ? `<span class="badge badge-primary" style="padding: 5px 12px; font-size: 0.85rem;">${contacto.destino}</span>`
        : '<span class="text-muted">N/A</span>';
    
    row.innerHTML = `
        <td><small class="text-muted"><i class="far fa-calendar-alt mr-1"></i>${fechaStr}</small></td>
        <td><strong class="text-dark">${contacto.nombre || 'N/A'}</strong></td>
        <td><a href="mailto:${contacto.email || ''}" class="text-primary text-decoration-none"><i class="fas fa-envelope mr-1"></i>${contacto.email || 'N/A'}</a></td>
        <td><a href="tel:${contacto.telefono || ''}" class="text-success text-decoration-none"><i class="fas fa-phone-alt mr-1"></i>${contacto.telefono || 'N/A'}</a></td>
        <td class="text-center">${destinoBadge}</td>
        <td class="text-center"><span class="badge badge-info badge-pill" style="font-size: 0.9rem; padding: 6px 12px;"><i class="fas fa-users mr-1"></i>${contacto.personas || '0'}</span></td>
        <td class="text-center">${newsletterBadge}</td>
        <td class="text-center">
            <button class="btn btn-info btn-sm shadow-sm" onclick="viewDetalle('${contacto.id}')" title="Ver detalle completo">
                <i class="fas fa-eye mr-1"></i>Ver
            </button>
        </td>
    `;
    return row;
}

function populateDestinosFilter() {
    filterDestino.innerHTML = '<option value="">Todos los destinos</option>';
    Array.from(destinosSet).sort().forEach(destino => {
        const option = document.createElement('option');
        option.value = destino;
        option.textContent = destino;
        filterDestino.appendChild(option);
    });
}

function initDataTable() {
    requestAnimationFrame(() => {
        try {
            dataTable = $('#dataTable').DataTable({
                language: { url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json' },
                order: [[0, 'desc']], 
                pageLength: 25, 
                responsive: true, 
                retrieve: true, 
                destroy: true,
                dom: 'Bfrtip',
                buttons: []
            });
        } catch (error) { console.error('Error DataTable:', error); }
    });
}

function setupFilters() {
    filterDestino.addEventListener('change', applyFilters);
    filterNewsletter.addEventListener('change', applyFilters);
    filterFecha.addEventListener('change', applyFilters);
}

function applyFilters() {
    const destinoValue = filterDestino.value.toLowerCase();
    const newsletterValue = filterNewsletter.value;
    const fechaValue = filterFecha.value;
    
    if (dataTable) {
        dataTable.rows().every(function() {
            const row = this.node();
            let show = true;
            
            // Filtro destino
            if (destinoValue) {
                const destinoCell = row.cells[4].textContent.toLowerCase();
                if (!destinoCell.includes(destinoValue)) show = false;
            }
            
            // Filtro newsletter
            if (newsletterValue) {
                const newsletterCell = row.cells[6];
                const hasSuscrito = newsletterCell.querySelector('.badge-success') !== null;
                if (newsletterValue === 'true' && !hasSuscrito) show = false;
                if (newsletterValue === 'false' && hasSuscrito) show = false;
            }
            
            // Filtro fecha
            if (fechaValue) {
                const fechaCell = row.cells[0].textContent;
                if (!fechaCell.includes(fechaValue)) show = false;
            }
            
            row.style.display = show ? '' : 'none';
        });
    }
}

function clearFilters() {
    filterDestino.value = '';
    filterNewsletter.value = '';
    filterFecha.value = '';
    applyFilters();
}

async function viewDetalle(id) {
    try {
        const contacto = allContactos.find(c => c.id === id);
        if (!contacto) return;
        
        let fechaCompleta = 'N/A';
        if (contacto.createdAt) {
            try {
                const fecha = contacto.createdAt.toDate ? contacto.createdAt.toDate() : new Date(contacto.createdAt);
                fechaCompleta = fecha.toLocaleString('es-SV', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                fechaCompleta = contacto.fechaViaje || 'N/A';
            }
        }
        
        const content = `
            <div class="row">
                <!-- Columna Izquierda -->
                <div class="col-lg-5">
                    <!-- Información Personal -->
                    <div class="card shadow-sm mb-3 border-left-primary">
                        <div class="card-header bg-primary text-white py-2">
                            <h6 class="m-0"><i class="fas fa-user-circle mr-2"></i>Información Personal</h6>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <small class="text-muted text-uppercase d-block mb-1">Nombre Completo</small>
                                <h5 class="mb-0 text-dark">${contacto.nombre || 'N/A'}</h5>
                            </div>
                            <div class="mb-3">
                                <small class="text-muted text-uppercase d-block mb-1">Correo Electrónico</small>
                                <a href="mailto:${contacto.email}" class="btn btn-outline-primary btn-sm btn-block">
                                    <i class="fas fa-envelope mr-2"></i>${contacto.email || 'N/A'}
                                </a>
                            </div>
                            <div class="mb-0">
                                <small class="text-muted text-uppercase d-block mb-1">Teléfono</small>
                                <a href="tel:${contacto.telefono}" class="btn btn-outline-success btn-sm btn-block">
                                    <i class="fas fa-phone-alt mr-2"></i>${contacto.telefono || 'N/A'}
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Información del Viaje -->
                    <div class="card shadow-sm mb-3 border-left-success">
                        <div class="card-header bg-success text-white py-2">
                            <h6 class="m-0"><i class="fas fa-suitcase-rolling mr-2"></i>Detalles del Viaje</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-6 mb-3">
                                    <small class="text-muted text-uppercase d-block mb-1">Destino</small>
                                    <span class="badge badge-primary badge-pill px-3 py-2" style="font-size: 0.95rem;">${contacto.destino || 'N/A'}</span>
                                </div>
                                <div class="col-6 mb-3">
                                    <small class="text-muted text-uppercase d-block mb-1">Fecha de Viaje</small>
                                    <p class="mb-0"><i class="far fa-calendar-alt text-info mr-1"></i>${contacto.fechaViaje || 'N/A'}</p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted text-uppercase d-block mb-1">Personas</small>
                                    <h5 class="mb-0 text-info"><i class="fas fa-users mr-2"></i>${contacto.personas || '0'}</h5>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted text-uppercase d-block mb-1">Presupuesto</small>
                                    <h5 class="mb-0 text-success"><i class="fas fa-dollar-sign mr-1"></i>${contacto.presupuesto || '0'}</h5>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Info Adicional -->
                    <div class="card shadow-sm border-left-info">
                        <div class="card-body py-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <small class="text-muted d-block">Newsletter</small>
                                    ${contacto.newsletter ? '<span class="badge badge-success"><i class="fas fa-check-circle mr-1"></i>Suscrito</span>' : '<span class="badge badge-secondary"><i class="fas fa-times-circle mr-1"></i>No suscrito</span>'}
                                </div>
                                <div class="text-right">
                                    <small class="text-muted d-block">Fecha de Registro</small>
                                    <small class="text-dark"><i class="far fa-clock mr-1"></i>${fechaCompleta}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Columna Derecha - Mensaje -->
                <div class="col-lg-7">
                    <div class="card shadow-sm border-left-warning h-100">
                        <div class="card-header bg-warning text-white py-2">
                            <h6 class="m-0"><i class="fas fa-comment-dots mr-2"></i>Mensaje del Cliente</h6>
                        </div>
                        <div class="card-body" style="max-height: 400px; overflow-y: auto;">
                            <div class="p-3 bg-light rounded" style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6;">
                                ${contacto.mensaje || '<em class="text-muted">El cliente no dejó ningún mensaje adicional.</em>'}
                            </div>
                        </div>
                        <div class="card-footer bg-white">
                            <div class="alert alert-info mb-0 py-2">
                                <small><i class="fas fa-info-circle mr-2"></i><strong>Tip:</strong> Haz clic en los botones de email o teléfono para contactar directamente al cliente.</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('detalleContent').innerHTML = content;
        $('#detalleModal').modal('show');
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar detalle', 'danger');
    }
}

function exportToCSV() {
    if (allContactos.length === 0) {
        showAlert('No hay datos para exportar', 'warning');
        return;
    }
    
    const headers = ['Fecha', 'Nombre', 'Email', 'Teléfono', 'Destino', 'Fecha Viaje', 'Personas', 'Presupuesto', 'Newsletter', 'Mensaje'];
    const rows = allContactos.map(c => {
        let fecha = '';
        if (c.createdAt) {
            try {
                const d = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
                fecha = d.toLocaleDateString('es-SV');
            } catch (e) {
                fecha = 'N/A';
            }
        }
        
        return [
            fecha,
            c.nombre || '',
            c.email || '',
            c.telefono || '',
            c.destino || '',
            c.fechaViaje || '',
            c.personas || '0',
            c.presupuesto || '0',
            c.newsletter ? 'Sí' : 'No',
            (c.mensaje || '').replace(/"/g, '""') // Escapar comillas
        ];
    });
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(field => `"${field}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contactos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('CSV exportado exitosamente', 'success');
}

window.viewDetalle = viewDetalle;
window.clearFilters = clearFilters;
window.exportToCSV = exportToCSV;
