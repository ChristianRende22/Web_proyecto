// Importar Firebase y Firestore
import { db } from '../service/firebase.js';
import {
    collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, setDoc
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// Importar servicio de Cloudinary
import { uploadImageToCloudinary, previewImage } from '../service/cloudinary.js';

// Referencias DOM
const categoriasTableBody = document.getElementById('categoriasTableBody');
const categoriaForm = document.getElementById('categoriaForm');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const alertContainer = document.getElementById('alertContainer');

let categoriaIdToDelete = null;
let dataTable = null;
let currentCategoriaId = null;
let uploadedImageData = {
    url: '',
    uploadId: null
};

document.addEventListener('DOMContentLoaded', () => {
    loadCategorias();
    setupFormSubmit();
    setupDeleteConfirmation();
    setupImageUpload();
});

function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `${message}<button type="button" class="close" data-dismiss="alert"><span>&times;</span></button>`;
    alertContainer.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

function loadCategorias() {
    const categoriasRef = collection(db, 'tarifas');
    const q = query(categoriasRef, orderBy('nombre'));

    onSnapshot(q, async (snapshot) => {
        if (dataTable) { dataTable.destroy(); dataTable = null; }
        categoriasTableBody.innerHTML = '';

        if (snapshot.empty) {
            categoriasTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted"><i class="fas fa-tags fa-3x mb-3 d-block"></i>No hay categorías registradas</td></tr>';
            return;
        }

        // Cargar categorías con conteo de lugares
        const promises = snapshot.docs.map(async (docSnap) => {
            const categoria = docSnap.data();
            const lugaresSnap = await getDocs(collection(db, 'tarifas', docSnap.id, 'lugares'));
            return { id: docSnap.id, data: categoria, lugaresCount: lugaresSnap.size };
        });

        const categorias = await Promise.all(promises);
        categorias.forEach(({ id, data, lugaresCount }) => {
            const row = createCategoriaRow(id, data, lugaresCount);
            categoriasTableBody.appendChild(row);
        });

        initDataTable();
    }, (error) => {
        console.error('Error:', error);
        showAlert('Error al cargar datos', 'danger');
    });
}

function createCategoriaRow(id, categoria, lugaresCount) {
    const row = document.createElement('tr');
    const imagenHTML = categoria.imagen 
        ? `<img src="${categoria.imagen}" alt="${categoria.nombre}" style="width:60px;height:60px;object-fit:cover;" class="rounded">`
        : '<i class="fas fa-image fa-3x text-muted"></i>';
    
    row.innerHTML = `
        <td><strong>${categoria.nombre || ''}</strong></td>
        <td class="text-center">${imagenHTML}</td>
        <td class="text-center"><span class="badge badge-primary badge-pill">${lugaresCount} ${lugaresCount === 1 ? 'lugar' : 'lugares'}</span></td>
        <td>
            <button class="btn btn-info btn-sm" onclick="viewCategoria('${id}')" title="Ver lugares"><i class="fas fa-eye"></i></button>
            <button class="btn btn-warning btn-sm" onclick="editCategoria('${id}')" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="confirmDelete('${id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
        </td>
    `;
    return row;
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

function setupFormSubmit() {
    categoriaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const categoriaId = document.getElementById('categoriaId').value;
            
            // Usar la URL de Cloudinary si fue subida
            const imagenUrl = document.getElementById('imagenUrl').value.trim();
            
            
            const categoriaData = {
                nombre: document.getElementById('nombre').value.trim(),
                imagen: imagenUrl || '../img/default.jpg'
            };
            

            if (categoriaId) {
                await updateDoc(doc(db, 'tarifas', categoriaId), categoriaData);
                showAlert('Categoría actualizada', 'success');
            } else {
                await addDoc(collection(db, 'tarifas'), categoriaData);
                showAlert('Categoría agregada', 'success');
            }

            $('#categoriaModal').modal('hide');
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

async function viewCategoria(id) {
    try {
        const categoriaSnap = await getDoc(doc(db, 'tarifas', id));
        if (!categoriaSnap.exists()) return;
        
        const categoria = categoriaSnap.data();
        
        // Cargar lugares de la subcolección
        const lugaresSnap = await getDocs(collection(db, 'tarifas', id, 'lugares'));
        const lugares = [];
        lugaresSnap.forEach(doc => lugares.push({ id: doc.id, ...doc.data() }));
        
        const lugaresHTML = lugares.length > 0
            ? lugares.map(lugar => `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h6 class="mb-1"><i class="fas fa-map-marker-alt text-danger mr-2"></i>${lugar.nombre}</h6>
                                <p class="mb-1 text-muted small">${lugar.descripcion || ''}</p>
                                <p class="mb-1"><i class="fas fa-map-pin text-primary mr-2"></i>${lugar.ubicacion || 'N/A'}</p>
                                <span class="badge badge-success"><i class="fas fa-dollar-sign mr-1"></i>${lugar.costo || 'N/A'}</span>
                            </div>
                            <div class="btn-group-vertical">
                                <button class="btn btn-sm btn-warning mb-1" onclick="editLugar('${id}', '${lugar.id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteLugar('${id}', '${lugar.id}')" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')
            : '<p class="text-muted text-center"><i class="fas fa-info-circle mr-2"></i>No hay lugares registrados en esta categoría</p>';
        
        const modalHTML = `
            <div class="modal fade" id="viewModal" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="fas fa-tag mr-2"></i>${categoria.nombre}</h5>
                            <button class="close" type="button" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <img src="${categoria.imagen || '../img/default.jpg'}" class="img-fluid rounded" style="width:100%;height:200px;object-fit:cover;" alt="${categoria.nombre}">
                                </div>
                                <div class="col-md-8">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6 class="mb-0"><i class="fas fa-map-marked-alt text-danger mr-2"></i>Lugares en ${categoria.nombre}</h6>
                                        <button class="btn btn-sm btn-success" onclick="addLugar('${id}')">
                                            <i class="fas fa-plus mr-1"></i>Agregar Lugar
                                        </button>
                                    </div>
                                    <div style="max-height:400px;overflow-y:auto;">
                                        ${lugaresHTML}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" type="button" data-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        $('#viewModal').remove();
        $('body').append(modalHTML);
        $('#viewModal').modal('show');
        $('#viewModal').on('hidden.bs.modal', function() { $(this).remove(); });
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar detalles', 'danger');
    }
}

async function addLugar(categoriaId) {
    currentCategoriaId = categoriaId;
    showLugarModal(categoriaId, null);
}

async function editLugar(categoriaId, lugarId) {
    currentCategoriaId = categoriaId;
    try {
        const lugarSnap = await getDoc(doc(db, 'tarifas', categoriaId, 'lugares', lugarId));
        if (!lugarSnap.exists()) return;
        showLugarModal(categoriaId, { id: lugarId, ...lugarSnap.data() });
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar lugar', 'danger');
    }
}

function showLugarModal(categoriaId, lugar = null) {
    const isEdit = lugar !== null;
    const modalHTML = `
        <div class="modal fade" id="lugarModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5>${isEdit ? 'Editar' : 'Agregar'} Lugar</h5>
                        <button class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <form id="lugarForm">
                        <div class="modal-body">
                            <input type="hidden" id="lugarId" value="${lugar?.id || ''}">
                            <div class="form-group">
                                <label>Nombre del Lugar <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="lugarNombre" required value="${lugar?.nombre || ''}" placeholder="Ej: Malecón de Puerto de La Libertad">
                            </div>
                            <div class="form-group">
                                <label>Ubicación <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="lugarUbicacion" required value="${lugar?.ubicacion || ''}" placeholder="Ej: La Libertad">
                            </div>
                            <div class="form-group">
                                <label>Descripción <span class="text-danger">*</span></label>
                                <textarea class="form-control" id="lugarDescripcion" rows="3" required placeholder="Descripción del lugar">${lugar?.descripcion || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Costo <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="lugarCosto" required value="${lugar?.costo || ''}" placeholder="Ej: Gratuito, $5.00">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" type="button" data-dismiss="modal">Cancelar</button>
                            <button class="btn btn-primary" type="submit" id="submitLugarBtn"><i class="fas fa-save"></i> Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
    
    $('#lugarModal').remove();
    $('body').append(modalHTML);
    $('#lugarModal').modal('show');
    
    $('#lugarForm').on('submit', async function(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('submitLugarBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        
        try {
            const lugarData = {
                nombre: document.getElementById('lugarNombre').value.trim(),
                ubicacion: document.getElementById('lugarUbicacion').value.trim(),
                descripcion: document.getElementById('lugarDescripcion').value.trim(),
                costo: document.getElementById('lugarCosto').value.trim()
            };
            
            const lugarId = document.getElementById('lugarId').value;
            if (lugarId) {
                await updateDoc(doc(db, 'tarifas', categoriaId, 'lugares', lugarId), lugarData);
                showAlert('Lugar actualizado', 'success');
            } else {
                await addDoc(collection(db, 'tarifas', categoriaId, 'lugares'), lugarData);
                showAlert('Lugar agregado', 'success');
            }
            
            $('#lugarModal').modal('hide');
            $('#viewModal').modal('hide');
            setTimeout(() => viewCategoria(categoriaId), 500);
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error al guardar lugar', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar';
        }
    });
}

async function deleteLugar(categoriaId, lugarId) {
    if (!confirm('¿Eliminar este lugar?')) return;
    
    try {
        await deleteDoc(doc(db, 'tarifas', categoriaId, 'lugares', lugarId));
        showAlert('Lugar eliminado', 'success');
        $('#viewModal').modal('hide');
        setTimeout(() => viewCategoria(categoriaId), 500);
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar lugar', 'danger');
    }
}

async function editCategoria(id) {
    try {
        const categoriaSnap = await getDoc(doc(db, 'tarifas', id));
        if (!categoriaSnap.exists()) return;
        
        const categoria = categoriaSnap.data();
        document.getElementById('categoriaId').value = id;
        document.getElementById('nombre').value = categoria.nombre || '';
        
        // Cargar imagen existente si hay
        if (categoria.imagen && categoria.imagen !== '../img/default.jpg') {
            uploadedImageData.url = categoria.imagen;
            uploadedImageData.uploadId = categoria.imageUploadId || null;
            document.getElementById('imagenUrl').value = categoria.imagen;
            document.getElementById('imagenPreviewImg').src = categoria.imagen;
            document.getElementById('imagenPreview').style.display = 'block';
            document.getElementById('clearImageBtn').style.display = 'inline-block';
            document.getElementById('uploadImageBtn').innerHTML = '<i class="fas fa-check"></i> ¡Imagen subida!';
            document.getElementById('uploadImageBtn').classList.remove('btn-primary');
            document.getElementById('uploadImageBtn').classList.add('btn-success');
        }
        
        document.getElementById('categoriaModalLabel').textContent = 'Editar Categoría';
        $('#categoriaModal').modal('show');
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar categoría', 'danger');
    }
}

function confirmDelete(id) {
    categoriaIdToDelete = id;
    $('#deleteModal').modal('show');
}

function setupDeleteConfirmation() {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!categoriaIdToDelete) return;
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

        try {
            await deleteDoc(doc(db, 'tarifas', categoriaIdToDelete));
            showAlert('Categoría eliminada', 'success');
            $('#deleteModal').modal('hide');
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error al eliminar', 'danger');
        } finally {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
            categoriaIdToDelete = null;
        }
    });
}

function resetForm() {
    categoriaForm.reset();
    document.getElementById('categoriaId').value = '';
    document.getElementById('categoriaModalLabel').textContent = 'Agregar Categoría';
    
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
            // Obtener nombre de la categoría del formulario
            const nombre = document.getElementById('nombre').value.trim() || 'Nueva categoría';
            const categoriaId = document.getElementById('categoriaId').value;
            
            // Subir con metadatos
            const result = await uploadImageToCloudinary(file, 'tarifas', {
                entityId: categoriaId || null,
                entityName: nombre
            });
            
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

window.viewCategoria = viewCategoria;
window.editCategoria = editCategoria;
window.confirmDelete = confirmDelete;
window.resetForm = resetForm;
window.addLugar = addLugar;
window.editLugar = editLugar;
window.deleteLugar = deleteLugar;

