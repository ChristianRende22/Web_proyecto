// Importar Firebase y Firestore
import { db } from '../service/firebase.js';
import {
    collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, setDoc
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// Importar servicio de Cloudinary
import { uploadImageToCloudinary, previewImage } from '../service/cloudinary.js';

// Referencias DOM
const atraccionesTableBody = document.getElementById('atraccionesTableBody');
const atraccionForm = document.getElementById('atraccionForm');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const alertContainer = document.getElementById('alertContainer');
const actividadesContainer = document.getElementById('actividadesContainer');
const btnAgregarActividad = document.getElementById('btnAgregarActividad');

let atraccionIdToDelete = null;
let dataTable = null;
let currentAtraccionId = null;
let uploadedImageData = {
    url: '',
    uploadId: null
};

document.addEventListener('DOMContentLoaded', () => {
    loadAtracciones();
    setupFormSubmit();
    setupDeleteConfirmation();
    setupActividadesHandlers();
    setupImageUpload();
    setupMapPreview();
});

function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `${message}<button type="button" class="close" data-dismiss="alert"><span>&times;</span></button>`;
    alertContainer.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

function loadAtracciones() {
    const atraccionesRef = collection(db, 'atracciones');
    const q = query(atraccionesRef, orderBy('lugar'));

    onSnapshot(q, (snapshot) => {
        if (dataTable) { dataTable.destroy(); dataTable = null; }
        atraccionesTableBody.innerHTML = '';

        if (snapshot.empty) {
            atraccionesTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted"><i class="fas fa-map-marked-alt fa-3x mb-3 d-block"></i>No hay atracciones</td></tr>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const atraccion = docSnap.data();
            const row = createAtraccionRow(docSnap.id, atraccion);
            atraccionesTableBody.appendChild(row);
        });

        initDataTable();
    }, (error) => {
        console.error('Error:', error);
        showAlert('Error al cargar datos', 'danger');
    });
}

function createAtraccionRow(id, atraccion) {
    const row = document.createElement('tr');
    const actividadesHTML = atraccion.actividades && atraccion.actividades.length > 0
        ? atraccion.actividades.slice(0, 3).map(act => `<span class="badge badge-success mr-1">${act}</span>`).join('')
        : '<span class="text-muted">Sin actividades</span>';
    
    const descripcionCorta = atraccion.descripcion && atraccion.descripcion.length > 80
        ? atraccion.descripcion.substring(0, 80) + '...'
        : atraccion.descripcion || '';
    
    row.innerHTML = `
        <td>${atraccion.lugar || ''}</td>
        <td><span class="badge badge-${getCategoríaBadgeClass(atraccion.categoria)}">${atraccion.categoria || ''}</span></td>
        <td>${descripcionCorta}</td>
        <td>${actividadesHTML}</td>
        <td>
            <button class="btn btn-info btn-sm" onclick="viewAtraccion('${id}')" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="btn btn-warning btn-sm" onclick="editAtraccion('${id}')" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="confirmDelete('${id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
        </td>
    `;
    return row;
}

function getCategoríaBadgeClass(categoria) {
    const clases = { 
        naturaleza: 'success',      // Verde #8A9C7B
        cultura: 'warning',          // Naranja #F36B3A  
        aventura: 'warning',         // Naranja #F36B3A
        playas: 'info',              // Azul claro (se puede mantener)
        arqueologia: 'secondary',    // Gris
        gastronomia: 'danger'        // Rojo
    };
    return clases[categoria?.toLowerCase()] || 'secondary';
}

function initDataTable() {
    requestAnimationFrame(() => {
        try {
            dataTable = $('#dataTable').DataTable({
                language: { url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json' },
                order: [[0, 'asc']], pageLength: 10, responsive: true, retrieve: true, destroy: true
            });
        } catch (error) { console.error('Error DataTable:', error); }
    });
}

function setupActividadesHandlers() {
    btnAgregarActividad.addEventListener('click', () => {
        const newInput = document.createElement('div');
        newInput.className = 'input-group mb-2';
        newInput.innerHTML = `
            <input type="text" class="form-control actividad-input" placeholder="Ej: Fotografía">
            <div class="input-group-append">
                <button class="btn btn-outline-danger btn-remove-act" type="button"><i class="fas fa-times"></i></button>
            </div>`;
        actividadesContainer.appendChild(newInput);
        newInput.querySelector('.btn-remove-act').addEventListener('click', () => {
            if (actividadesContainer.querySelectorAll('.input-group').length > 1) {
                newInput.remove();
            }
        });
    });
    
    // Event delegation para los botones de eliminar existentes
    actividadesContainer.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-act')) {
            const inputGroup = e.target.closest('.input-group');
            if (actividadesContainer.querySelectorAll('.input-group').length > 1) {
                inputGroup.remove();
            }
        }
    });
}

function getActividadesFromForm() {
    return Array.from(document.querySelectorAll('.actividad-input')).map(input => input.value.trim()).filter(val => val);
}

function processMapInput(input) {
    if (!input) return '';
    
    input = input.trim();
    
    if (input.includes('<iframe') && input.includes('</iframe>')) {
        return input;
    }
    
    const srcMatch = input.match(/https:\/\/www\.google\.com\/maps\/embed\?pb=[^\s"']*/);
    if (srcMatch) {
        const srcUrl = srcMatch[0];
        return `<iframe src="${srcUrl}" width="100%" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    }
    
    if (input.startsWith('https://www.google.com/maps/embed')) {
        const cleanUrl = input.split(/[\s"']/)[0];
        return `<iframe src="${cleanUrl}" width="100%" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    }
    
    if (input.includes('google.com/maps')) {
        console.warn('URL de Google Maps normal detectada. Por favor, usa la opción "Compartir > Insertar un mapa"');
        return '';
    }
    
    return '';
}

function setupFormSubmit() {
    atraccionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const atraccionId = document.getElementById('atraccionId').value;
            
            // Usar la URL de Cloudinary si fue subida
            const imagenUrl = document.getElementById('imagenUrl').value.trim();
            
            // Procesar el mapa para generar iframe válido
            const mapaInput = document.getElementById('mapa').value.trim();
            const mapaProcessed = processMapInput(mapaInput);
            
            const atraccionData = {
                lugar: document.getElementById('lugar').value.trim(),
                categoria: document.getElementById('categoria').value,
                descripcion: document.getElementById('descripcion').value.trim(),
                imagen: imagenUrl || '../img/default.jpg',
                actividades: getActividadesFromForm(),
                distancia: document.getElementById('distancia').value.trim(),
                tiempo: document.getElementById('tiempo').value.trim(),
                mapa: mapaProcessed
            };

            if (atraccionId) {
                await updateDoc(doc(db, 'atracciones', atraccionId), atraccionData);
                showAlert('Atracción actualizada', 'success');
            } else {
                const docRef = await addDoc(collection(db, 'atracciones'), atraccionData);
                // Crear subcolecciones vacías
                await setDoc(doc(db, 'atracciones', docRef.id, 'atraccionesLugar', 'init'), { atraccionesLugar: [] });
                await setDoc(doc(db, 'atracciones', docRef.id, 'trasporteParticular', 'init'), { trasporteParticular: [] });
                await setDoc(doc(db, 'atracciones', docRef.id, 'trasportePublico', 'init'), { trasportePublico: [] });
                showAlert('Atracción agregada', 'success');
            }

            $('#atraccionModal').modal('hide');
            resetForm();
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error al guardar', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar';
        }
    });
}

async function viewAtraccion(id) {
    try {
        const atraccionSnap = await getDoc(doc(db, 'atracciones', id));
        if (!atraccionSnap.exists()) return;
        
        const atraccion = atraccionSnap.data();
        
        // Cargar subcolecciones
        const lugarSnap = await getDocs(collection(db, 'atracciones', id, 'atraccionesLugar'));
        const particularSnap = await getDocs(collection(db, 'atracciones', id, 'trasporteParticular'));
        const publicoSnap = await getDocs(collection(db, 'atracciones', id, 'trasportePublico'));
        
        let lugarItems = [];
        let particularItems = [];
        let publicoItems = [];
        
        lugarSnap.forEach(doc => {
            const data = doc.data().atraccionesLugar;
            if (Array.isArray(data)) lugarItems = lugarItems.concat(data);
        });
        particularSnap.forEach(doc => {
            const data = doc.data().trasporteParticular;
            if (Array.isArray(data)) particularItems = particularItems.concat(data);
        });
        publicoSnap.forEach(doc => {
            const data = doc.data().trasportePublico;
            if (Array.isArray(data)) publicoItems = publicoItems.concat(data);
        });
        
        const actividadesHTML = atraccion.actividades?.length > 0
            ? '<ul class="list-unstyled">' + atraccion.actividades.map(act => `<li class="mb-2"><i class="fas fa-check-circle text-success mr-2"></i>${act}</li>`).join('') + '</ul>'
            : '<p class="text-muted"><i class="fas fa-info-circle mr-1"></i>Sin actividades</p>';
            
        const lugarHTML = lugarItems.length > 0
            ? '<ul class="list-unstyled">' + lugarItems.map(item => `<li class="mb-2"><i class="fas fa-map-marker-alt mr-2" style="color: #F36B3A;"></i>${item}</li>`).join('') + '</ul>'
            : '<p class="text-muted"><i class="fas fa-info-circle mr-1"></i>Sin información</p>';
            
        const particularHTML = particularItems.length > 0
            ? '<ul class="list-unstyled">' + particularItems.map(item => `<li class="mb-2"><i class="fas fa-car text-success mr-2"></i>${item}</li>`).join('') + '</ul>'
            : '<p class="text-muted"><i class="fas fa-info-circle mr-1"></i>Sin información</p>';
            
        const publicoHTML = publicoItems.length > 0
            ? '<ul class="list-unstyled">' + publicoItems.map(item => `<li class="mb-2"><i class="fas fa-bus text-warning mr-2"></i>${item}</li>`).join('') + '</ul>'
            : '<p class="text-muted"><i class="fas fa-info-circle mr-1"></i>Sin información</p>';
        
        const modalHTML = `
            <div class="modal fade" id="viewModal" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-xl" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="fas fa-map-marker-alt mr-2"></i>${atraccion.lugar}</h5>
                            <button class="close" type="button" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <img src="${atraccion.imagen || '../img/default.jpg'}" class="img-fluid rounded mb-3" style="width:100%;height:250px;object-fit:cover;">
                                    <p><strong>Categoría:</strong> <span class="badge badge-${getCategoríaBadgeClass(atraccion.categoria)}">${atraccion.categoria}</span></p>
                                    ${atraccion.distancia ? `<p><strong><i class="fas fa-road mr-2"></i>Distancia:</strong> ${atraccion.distancia}</p>` : ''}
                                    ${atraccion.tiempo ? `<p><strong><i class="fas fa-clock mr-2"></i>Tiempo:</strong> ${atraccion.tiempo}</p>` : ''}
                                </div>
                                <div class="col-md-8">
                                    <div class="mb-3">
                                        <h6 style="color: #F36B3A;"><i class="fas fa-info-circle mr-2"></i>Descripción</h6>
                                        <p class="text-justify">${atraccion.descripcion}</p>
                                    </div>
                                    
                                    ${atraccion.mapa ? `
                                    <div class="mb-3">
                                        <h6 style="color: #F36B3A;"><i class="fas fa-map-marked-alt mr-2"></i>Ubicación en el Mapa</h6>
                                        <div class="embed-responsive embed-responsive-16by9" id="mapaContainer"></div>
                                    </div>
                                    ` : ''}
                                    
                                    <div class="mb-3">
                                        <h6 class="text-success"><i class="fas fa-hiking mr-2"></i>Actividades</h6>
                                        ${actividadesHTML}
                                    </div>
                                    
                                    <div class="mb-3">
                                        <h6 style="color: #F36B3A;">
                                            <i class="fas fa-map-marked-alt mr-2"></i>Atracciones del Lugar 
                                            <button class="btn btn-sm btn-warning ml-2" onclick="manageSubcollection('${id}', 'atraccionesLugar')" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        </h6>
                                        ${lugarHTML}
                                    </div>
                                    
                                    <div class="mb-3">
                                        <h6 class="text-success">
                                            <i class="fas fa-car mr-2"></i>Transporte Particular
                                            <button class="btn btn-sm btn-success ml-2" onclick="manageSubcollection('${id}', 'trasporteParticular')" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        </h6>
                                        ${particularHTML}
                                    </div>
                                    
                                    <div class="mb-3">
                                        <h6 class="text-warning">
                                            <i class="fas fa-bus mr-2"></i>Transporte Público
                                            <button class="btn btn-sm btn-warning ml-2" onclick="manageSubcollection('${id}', 'trasportePublico')" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        </h6>
                                        ${publicoHTML}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-warning" type="button" onclick="editAtraccion('${id}')" data-dismiss="modal">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-secondary" type="button" data-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        $('#viewModal').remove();
        $('body').append(modalHTML);
        
        // Insertar el iframe del mapa después de crear el modal
        if (atraccion.mapa) {
            const mapaContainer = document.getElementById('mapaContainer');
            if (mapaContainer) {
                // Procesar el mapa por si no está en formato correcto
                const mapaProcessed = processMapInput(atraccion.mapa);
                mapaContainer.innerHTML = mapaProcessed || '<p class="text-muted"><i class="fas fa-exclamation-triangle mr-2"></i>Formato de mapa no válido</p>';
            }
        }
        
        $('#viewModal').modal('show');
        $('#viewModal').on('hidden.bs.modal', function() { 
            $(this).remove(); 
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css('padding-right', '');
        });
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar detalles', 'danger');
    }
}

async function manageSubcollection(atraccionId, subcollectionName) {
    currentAtraccionId = atraccionId;
    const snap = await getDocs(collection(db, 'atracciones', atraccionId, subcollectionName));
    let items = [];
    let docId = null;
    
    snap.forEach(doc => {
        docId = doc.id;
        const data = doc.data()[subcollectionName];
        if (Array.isArray(data)) items = data;
    });
    
    const titles = {
        atraccionesLugar: 'Atracciones del Lugar',
        trasporteParticular: 'Transporte Particular',
        trasportePublico: 'Transporte Público'
    };
    
    const modalHTML = `
        <div class="modal fade" id="subcollectionModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5>${titles[subcollectionName]}</h5>
                        <button class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="itemsContainer">
                            ${items.length > 0 ? items.map((item, i) => `
                                <div class="input-group mb-2">
                                    <input type="text" class="form-control subcol-input" value="${item}">
                                    <div class="input-group-append">
                                        <button class="btn btn-danger btn-remove-subcol" type="button"><i class="fas fa-times"></i></button>
                                    </div>
                                </div>
                            `).join('') : '<div class="input-group mb-2"><input type="text" class="form-control subcol-input" placeholder="Agregar información"><div class="input-group-append"><button class="btn btn-danger btn-remove-subcol" type="button" disabled><i class="fas fa-times"></i></button></div></div>'}
                        </div>
                        <button class="btn btn-sm btn-secondary" id="btnAddSubcolItem"><i class="fas fa-plus"></i> Agregar</button>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                        <button class="btn btn-primary" id="saveSubcolBtn"><i class="fas fa-save"></i> Guardar</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    $('#subcollectionModal').remove();
    $('body').append(modalHTML);
    $('#subcollectionModal').modal('show');
    
    // Limpiar al cerrar
    $('#subcollectionModal').on('hidden.bs.modal', function() {
        $(this).remove();
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open').css('padding-right', '');
    });
    
    $('#btnAddSubcolItem').on('click', function() {
        const newInput = `
            <div class="input-group mb-2">
                <input type="text" class="form-control subcol-input" placeholder="Agregar información">
                <div class="input-group-append">
                    <button class="btn btn-danger btn-remove-subcol" type="button"><i class="fas fa-times"></i></button>
                </div>
            </div>`;
        $('#itemsContainer').append(newInput);
    });
    
    $('#itemsContainer').on('click', '.btn-remove-subcol', function() {
        if ($('#itemsContainer .input-group').length > 1) {
            $(this).closest('.input-group').remove();
        }
    });
    
    $('#saveSubcolBtn').on('click', async function() {
        const values = Array.from(document.querySelectorAll('.subcol-input')).map(inp => inp.value.trim()).filter(v => v);
        try {
            const docRef = doc(db, 'atracciones', atraccionId, subcollectionName, docId || 'init');
            await setDoc(docRef, { [subcollectionName]: values });
            showAlert('Información guardada', 'success');
            $('#subcollectionModal').modal('hide');
            $('#viewModal').modal('hide');
            setTimeout(() => viewAtraccion(atraccionId), 500);
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error al guardar', 'danger');
        }
    });
}

async function editAtraccion(id) {
    try {
        // Cerrar cualquier modal abierto primero
        $('.modal').modal('hide');
        
        // Pequeña espera para que se cierre completamente
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Limpiar backdrops residuales
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open').css('padding-right', '');
        
        const atraccionSnap = await getDoc(doc(db, 'atracciones', id));
        if (!atraccionSnap.exists()) return;
        
        const atraccion = atraccionSnap.data();
        document.getElementById('atraccionId').value = id;
        document.getElementById('lugar').value = atraccion.lugar || '';
        document.getElementById('categoria').value = atraccion.categoria || '';
        document.getElementById('descripcion').value = atraccion.descripcion || '';
        document.getElementById('distancia').value = atraccion.distancia || '';
        document.getElementById('tiempo').value = atraccion.tiempo || '';
        document.getElementById('mapa').value = atraccion.mapa || '';
        
        // Cargar imagen existente si hay
        if (atraccion.imagen && atraccion.imagen !== '../img/default.jpg') {
            uploadedImageData.url = atraccion.imagen;
            uploadedImageData.uploadId = atraccion.imageUploadId || null;
            document.getElementById('imagenUrl').value = atraccion.imagen;
            document.getElementById('imagenPreviewImg').src = atraccion.imagen;
            document.getElementById('imagenPreview').style.display = 'block';
            document.getElementById('clearImageBtn').style.display = 'inline-block';
            document.getElementById('uploadImageBtn').innerHTML = '<i class="fas fa-check"></i> ¡Imagen subida!';
            document.getElementById('uploadImageBtn').classList.remove('btn-primary');
            document.getElementById('uploadImageBtn').classList.add('btn-success');
        }
        
        actividadesContainer.innerHTML = '';
        if (atraccion.actividades?.length > 0) {
            atraccion.actividades.forEach((act, i) => {
                const div = document.createElement('div');
                div.className = 'input-group mb-2';
                div.innerHTML = `
                    <input type="text" class="form-control actividad-input" value="${act}">
                    <div class="input-group-append">
                        <button class="btn btn-outline-danger btn-remove-act" type="button"><i class="fas fa-times"></i></button>
                    </div>`;
                actividadesContainer.appendChild(div);
            });
        } else {
            actividadesContainer.innerHTML = '<div class="input-group mb-2"><input type="text" class="form-control actividad-input" placeholder="Ej: Senderismo"><div class="input-group-append"><button class="btn btn-outline-danger btn-remove-act" type="button"><i class="fas fa-times"></i></button></div></div>';
        }
        
        document.getElementById('atraccionModalLabel').textContent = 'Editar Atracción';
        $('#atraccionModal').modal('show');
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar atracción', 'danger');
    }
}

function confirmDelete(id) {
    atraccionIdToDelete = id;
    $('#deleteModal').modal('show');
}

function setupDeleteConfirmation() {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!atraccionIdToDelete) return;
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

        try {
            await deleteDoc(doc(db, 'atracciones', atraccionIdToDelete));
            showAlert('Atracción eliminada', 'success');
            $('#deleteModal').modal('hide');
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error al eliminar', 'danger');
        } finally {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
            atraccionIdToDelete = null;
        }
    });
}

function resetForm() {
    atraccionForm.reset();
    document.getElementById('atraccionId').value = '';
    document.getElementById('atraccionModalLabel').textContent = 'Agregar Atracción';
    
    // Limpiar campos nuevos
    document.getElementById('distancia').value = '';
    document.getElementById('tiempo').value = '';
    document.getElementById('mapa').value = '';
    
    actividadesContainer.innerHTML = '<div class="input-group mb-2"><input type="text" class="form-control actividad-input" placeholder="Ej: Senderismo"><div class="input-group-append"><button class="btn btn-outline-danger btn-remove-act" type="button"><i class="fas fa-times"></i></button></div></div>';
    
    // Limpiar imagen
    uploadedImageData.url = '';
    uploadedImageData.uploadId = null;
    document.getElementById('imagenUrl').value = '';
    document.getElementById('imagenFile').value = '';
    document.querySelector('.custom-file-label').textContent = 'Seleccionar imagen...';
    document.getElementById('uploadImageBtn').disabled = true;
    document.getElementById('uploadImageBtn').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Subir a Cloudinary';
    document.getElementById('uploadImageBtn').classList.remove('btn-success');
    document.getElementById('uploadImageBtn').classList.add('btn-primary');
    document.getElementById('clearImageBtn').style.display = 'none';
    document.getElementById('imagenPreview').style.display = 'none';
}

/**
 * Configurar subida de imágenes a Cloudinary
 */
function setupImageUpload() {
    const fileInput = document.getElementById('imagenFile');
    const uploadBtn = document.getElementById('uploadImageBtn');
    const clearBtn = document.getElementById('clearImageBtn');
    const previewContainer = document.getElementById('imagenPreview');
    const previewImg = document.getElementById('imagenPreviewImg');
    const fileLabel = document.querySelector('.custom-file-label');
    const hiddenInput = document.getElementById('imagenUrl');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileLabel.textContent = file.name;
            uploadBtn.disabled = false;
            uploadBtn.classList.remove('btn-success');
            uploadBtn.classList.add('btn-primary');
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Subir a Cloudinary';
            previewImage(file, previewImg);
            previewContainer.style.display = 'block';
        }
    });

    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            alert('Selecciona una imagen primero');
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';

        try {
            // Obtener nombre del lugar del formulario
            const lugar = document.getElementById('lugar').value.trim() || 'Nueva atracción';
            const atraccionId = document.getElementById('atraccionId').value;
            
            // Subir con metadatos
            const result = await uploadImageToCloudinary(file, 'atracciones', {
                entityId: atraccionId || null,
                entityName: lugar
            });
            
            // El resultado ahora es un objeto { url, uploadId }
            uploadedImageData.url = result.url;
            uploadedImageData.uploadId = result.uploadId;
            hiddenInput.value = result.url;
            
            uploadBtn.innerHTML = '<i class="fas fa-check"></i> ¡Imagen subida!';
            uploadBtn.classList.remove('btn-primary');
            uploadBtn.classList.add('btn-success');
            clearBtn.style.display = 'inline-block';
            
            showAlert('Imagen subida exitosamente a Cloudinary', 'success');
        } catch (error) {
            alert(error.message);
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Subir a Cloudinary';
            uploadBtn.classList.remove('btn-success');
            uploadBtn.classList.add('btn-primary');
        }
    });

    clearBtn.addEventListener('click', () => {
        uploadedImageData.url = '';
        uploadedImageData.uploadId = null;
        hiddenInput.value = '';
        fileInput.value = '';
        fileLabel.textContent = 'Seleccionar imagen...';
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Subir a Cloudinary';
        uploadBtn.classList.remove('btn-success');
        uploadBtn.classList.add('btn-primary');
        clearBtn.style.display = 'none';
        previewContainer.style.display = 'none';
        previewImg.src = '';
    });
}

//Vista previa del mapa
function setupMapPreview() {
    const mapaInput = document.getElementById('mapa');
    
    if (!mapaInput) return;
    
    // Crear contenedor de vista previa si no existe
    let previewContainer = document.getElementById('mapaPreviewContainer');
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'mapaPreviewContainer';
        previewContainer.className = 'mt-3';
        previewContainer.style.display = 'none';
        previewContainer.innerHTML = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <i class="fas fa-eye mr-2"></i>Vista Previa del Mapa
                </div>
                <div class="card-body p-0">
                    <div id="mapaPreviewContent" class="embed-responsive embed-responsive-16by9"></div>
                </div>
            </div>
        `;
        mapaInput.parentElement.appendChild(previewContainer);
    }
    
    const previewContent = document.getElementById('mapaPreviewContent');
    
    // Listener para actualizar vista previa en tiempo real
    mapaInput.addEventListener('input', (e) => {
        const inputValue = e.target.value.trim();
        
        if (!inputValue) {
            previewContainer.style.display = 'none';
            previewContent.innerHTML = '';
            return;
        }
        
        const processedIframe = processMapInput(inputValue);
        
        if (processedIframe) {
            previewContainer.style.display = 'block';
            previewContent.innerHTML = processedIframe;
            
            // Mostrar feedback positivo
            mapaInput.classList.remove('is-invalid');
            mapaInput.classList.add('is-valid');
        } else {
            previewContainer.style.display = 'none';
            previewContent.innerHTML = '';
            
            // Mostrar feedback negativo
            mapaInput.classList.remove('is-valid');
            mapaInput.classList.add('is-invalid');
        }
    });
    
    // Limpiar clases de validación al hacer blur
    mapaInput.addEventListener('blur', () => {
        setTimeout(() => {
            mapaInput.classList.remove('is-valid', 'is-invalid');
        }, 2000);
    });
}

window.viewAtraccion = viewAtraccion;
window.editAtraccion = editAtraccion;
window.confirmDelete = confirmDelete;
window.resetForm = resetForm;
window.manageSubcollection = manageSubcollection;
