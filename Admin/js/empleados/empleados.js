// Importar Firebase y Firestore
import { db, auth } from '../service/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import {
    createUserWithEmailAndPassword,
    updatePassword,
    deleteUser
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// Importar auth guard para verificar permisos
import { requireModuleAccess } from '../auth/auth-guard.js';

// Importar servicio de Cloudinary
import { uploadImageToCloudinary, previewImage, linkUploadToEntity } from '../service/cloudinary.js';

// Referencias a elementos del DOM
const empleadosTableBody = document.getElementById('empleadosTableBody');
const empleadoForm = document.getElementById('empleadoForm');
const empleadoModal = document.getElementById('empleadoModal');
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const alertContainer = document.getElementById('alertContainer');

// Variable para almacenar el ID del empleado a eliminar
let empleadoIdToDelete = null;

// Variable para almacenar datos de imagen subida
let uploadedImageData = {
    url: '',
    uploadId: null
};

// DataTable instance
let dataTable = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar que el usuario tenga acceso al módulo de empleados
    await requireModuleAccess('empleados');
    
    loadEmpleados();
    setupFormSubmit();
    setupDeleteConfirmation();
    setupImageUpload();
});

/**
 * Mostrar alertas
 */
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;
    alertContainer.appendChild(alertDiv);

    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

/**
 * Cargar empleados desde Firestore
 */
function loadEmpleados() {
    const empleadosRef = collection(db, 'empleados');
    const q = query(empleadosRef, orderBy('apellido'));

    // Escuchar cambios en tiempo real
    onSnapshot(q, (snapshot) => {
        console.log('Snapshot recibido, actualizando tabla...');
        
        // Destruir DataTable antes de modificar el DOM
        if (dataTable) {
            dataTable.destroy();
            dataTable = null;
        }
        
        // Limpiar tabla
        empleadosTableBody.innerHTML = '';

        if (snapshot.empty) {
            empleadosTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        <i class="fas fa-inbox fa-3x mb-3 d-block"></i>
                        No hay empleados registrados
                    </td>
                </tr>
            `;
            return;
        }

        // Agregar filas a la tabla
        snapshot.forEach((docSnap) => {
            const empleado = docSnap.data();
            const row = createEmpleadoRow(docSnap.id, empleado);
            empleadosTableBody.appendChild(row);
        });

        // Reinicializar DataTable después de actualizar el DOM
        initDataTable();
    }, (error) => {
        console.error('Error al cargar empleados:', error);
        showAlert('Error al cargar los datos. Por favor, recarga la página.', 'danger');
    });
}

/**
 * Crear fila de tabla para un empleado
 */
function createEmpleadoRow(id, empleado) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${empleado.nombre || ''}</td>
        <td>${empleado.apellido || ''}</td>
        <td>${empleado.mail || empleado.email || ''}</td>
        <td>${empleado.cargo || ''}</td>
        <td>
            <span class="badge badge-${getRolBadgeClass(empleado.rol)}">${empleado.rol || ''}</span>
        </td>
        <td>
            <button class="btn btn-info btn-sm" onclick="viewEmpleado('${id}')" title="Ver">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-warning btn-sm" onclick="editEmpleado('${id}')" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="confirmDelete('${id}')" title="Eliminar">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    return row;
}

/**
 * Obtener clase de badge según el rol
 */
function getRolBadgeClass(rol) {
    const rolClasses = {
        'administrador': 'primary',
        'supervisor': 'warning',
        'empleado': 'secondary'
    };
    return rolClasses[rol?.toLowerCase()] || 'secondary';
}

/**
 * Inicializar DataTable
 */
function initDataTable() {
    // Usar requestAnimationFrame para asegurar que el DOM está completamente actualizado
    requestAnimationFrame(() => {
        try {
            dataTable = $('#dataTable').DataTable({
                language: {
                    url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
                },
                order: [[1, 'asc']], // Ordenar por apellido
                pageLength: 10,
                responsive: true,
                retrieve: true, // Reutilizar instancia existente si la hay
                destroy: true // Permitir reinicialización
            });
            console.log('DataTable inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar DataTable:', error);
        }
    });
}

/**
 * Configurar envío del formulario
 */
function setupFormSubmit() {
    empleadoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const empleadoId = document.getElementById('empleadoId').value;
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            // Usar la URL de Cloudinary si fue subida, sino dejar vacío o usar default
            const imagenUrl = document.getElementById('imagenUrl').value.trim();
            
            const empleadoData = {
                nombre: document.getElementById('nombre').value.trim(),
                apellido: document.getElementById('apellido').value.trim(),
                mail: email,
                cargo: document.getElementById('cargo').value.trim(),
                rol: document.getElementById('rol').value,
                descripcion: document.getElementById('descripcion').value.trim(),
                imagen: imagenUrl || '../img/ale.jpg', // Default si no hay imagen
                imageUploadId: uploadedImageData.uploadId || null // Vincular con uploads
            };

            if (empleadoId) {
                // Actualizar empleado existente
                const empleadoRef = doc(db, 'empleados', empleadoId);
                await updateDoc(empleadoRef, empleadoData);
                
                // Si hay una imagen nueva, actualizar la vinculación en uploads
                if (uploadedImageData.uploadId && uploadedImageData.url) {
                    const nombre = `${empleadoData.nombre} ${empleadoData.apellido}`;
                    await linkUploadToEntity(uploadedImageData.uploadId, empleadoId, nombre, 'empleados');
                }
                
                showAlert('Empleado actualizado exitosamente', 'success');
            } else {
                // Crear nuevo empleado con Firebase Authentication
                try {
                    // Crear usuario en Firebase Auth
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const userId = userCredential.user.uid;
                    
                    // Guardar datos adicionales en Firestore con el mismo UID
                    empleadoData.uid = userId;
                    empleadoData.fechaCreacion = new Date().toISOString();
                    
                    const docRef = await addDoc(collection(db, 'empleados'), empleadoData);
                    
                    // Vincular imagen con el nuevo empleado
                    if (uploadedImageData.uploadId && uploadedImageData.url) {
                        const nombre = `${empleadoData.nombre} ${empleadoData.apellido}`;
                        await linkUploadToEntity(uploadedImageData.uploadId, docRef.id, nombre, 'empleados');
                    }
                    
                    showAlert('Empleado agregado exitosamente con acceso al sistema', 'success');
                } catch (authError) {
                    console.error('Error al crear usuario:', authError);
                    if (authError.code === 'auth/email-already-in-use') {
                        showAlert('El email ya está registrado en el sistema', 'warning');
                    } else {
                        throw authError;
                    }
                }
            }

            // Cerrar modal y resetear formulario
            $('#empleadoModal').modal('hide');
            resetForm();

        } catch (error) {
            console.error('Error al guardar empleado:', error);
            showAlert('Error al guardar el empleado. Intenta de nuevo.', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar';
        }
    });
}

/**
 * Ver detalles de un empleado
 */
async function viewEmpleado(id) {
    try {
        const empleadoRef = doc(db, 'empleados', id);
        const empleadoSnap = await getDoc(empleadoRef);

        if (empleadoSnap.exists()) {
            const empleado = empleadoSnap.data();
            
            // Crear modal personalizado para ver detalles
            const modalHTML = `
                <div class="modal fade" id="viewModal" tabindex="-1" role="dialog">
                    <div class="modal-dialog modal-lg" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Detalles del Empleado</h5>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-4 text-center">
                                        <img src="${empleado.imagen || '../img/ale.jpg'}" 
                                             class="img-fluid rounded-circle mb-3" 
                                             style="max-width: 200px; height: 200px; object-fit: cover;"
                                             alt="${empleado.nombre}">
                                    </div>
                                    <div class="col-md-8">
                                        <h4>${empleado.nombre} ${empleado.apellido}</h4>
                                        <hr>
                                        <p><strong>Email:</strong> ${empleado.mail || empleado.email || 'N/A'}</p>
                                        <p><strong>Cargo:</strong> ${empleado.cargo || 'N/A'}</p>
                                        <p><strong>Rol:</strong> 
                                            <span class="badge badge-${getRolBadgeClass(empleado.rol)}">${empleado.rol || 'N/A'}</span>
                                        </p>
                                        <p><strong>Descripción:</strong><br>${empleado.descripcion || 'Sin descripción'}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-warning" onclick="editEmpleado('${id}')" data-dismiss="modal">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remover modal anterior si existe
            $('#viewModal').remove();
            
            // Agregar y mostrar nuevo modal
            $('body').append(modalHTML);
            $('#viewModal').modal('show');
            
            // Limpiar modal al cerrar
            $('#viewModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        }
    } catch (error) {
        console.error('Error al ver empleado:', error);
        showAlert('Error al cargar los detalles del empleado', 'danger');
    }
}

/**
 * Editar un empleado
 */
async function editEmpleado(id) {
    try {
        const empleadoRef = doc(db, 'empleados', id);
        const empleadoSnap = await getDoc(empleadoRef);

        if (empleadoSnap.exists()) {
            const empleado = empleadoSnap.data();

            // Llenar el formulario con los datos del empleado
            document.getElementById('empleadoId').value = id;
            document.getElementById('nombre').value = empleado.nombre || '';
            document.getElementById('apellido').value = empleado.apellido || '';
            document.getElementById('email').value = empleado.mail || empleado.email || '';
            document.getElementById('cargo').value = empleado.cargo || '';
            document.getElementById('rol').value = empleado.rol || '';
            document.getElementById('descripcion').value = empleado.descripcion || '';
            
            // Cargar imagen existente si hay
            if (empleado.imagen && empleado.imagen !== '../img/ale.jpg') {
                uploadedImageData.url = empleado.imagen;
                uploadedImageData.uploadId = empleado.imageUploadId || null;
                document.getElementById('imagenUrl').value = empleado.imagen;
                document.getElementById('imagenPreviewImg').src = empleado.imagen;
                document.getElementById('imagenPreview').style.display = 'block';
                document.getElementById('clearImageBtn').style.display = 'inline-block';
                document.getElementById('uploadImageBtn').innerHTML = '<i class="fas fa-check"></i> ¡Imagen subida!';
                document.getElementById('uploadImageBtn').classList.remove('btn-primary');
                document.getElementById('uploadImageBtn').classList.add('btn-success');
            }
            
            // Hacer el campo de contraseña opcional en modo edición
            const passwordField = document.getElementById('password');
            passwordField.value = '';
            passwordField.required = false;
            passwordField.placeholder = 'Dejar vacío para no cambiar';

            // Cambiar título del modal
            document.getElementById('empleadoModalLabel').textContent = 'Editar Empleado';

            // Mostrar modal
            $('#empleadoModal').modal('show');
        }
    } catch (error) {
        console.error('Error al cargar empleado para editar:', error);
        showAlert('Error al cargar los datos del empleado', 'danger');
    }
}

/**
 * Confirmar eliminación de empleado
 */
function confirmDelete(id) {
    empleadoIdToDelete = id;
    $('#deleteModal').modal('show');
};

/**
 * Configurar confirmación de eliminación
 */
function setupDeleteConfirmation() {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!empleadoIdToDelete) return;

        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

        try {
            await deleteDoc(doc(db, 'empleados', empleadoIdToDelete));
            showAlert('Empleado eliminado exitosamente', 'success');
            $('#deleteModal').modal('hide');
        } catch (error) {
            console.error('Error al eliminar empleado:', error);
            showAlert('Error al eliminar el empleado. Intenta de nuevo.', 'danger');
        } finally {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
            empleadoIdToDelete = null;
        }
    });
}

/**
 * Resetear formulario
 */
function resetForm() {
    empleadoForm.reset();
    document.getElementById('empleadoId').value = '';
    document.getElementById('empleadoModalLabel').textContent = 'Agregar Empleado';
    
    // Restablecer el campo de contraseña como requerido
    const passwordField = document.getElementById('password');
    passwordField.required = true;
    passwordField.placeholder = '';
    
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

    // Actualizar label al seleccionar archivo
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileLabel.textContent = file.name;
            uploadBtn.disabled = false;
            uploadBtn.classList.remove('btn-success');
            uploadBtn.classList.add('btn-primary');
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Subir a Cloudinary';
            
            // Mostrar preview
            previewImage(file, previewImg);
            previewContainer.style.display = 'block';
        }
    });

    // Subir imagen a Cloudinary
    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            alert('Selecciona una imagen primero');
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';

        try {
            // Obtener nombre del empleado del formulario (si está disponible)
            const nombre = document.getElementById('nombre').value.trim();
            const apellido = document.getElementById('apellido').value.trim();
            const entityName = nombre && apellido ? `${nombre} ${apellido}` : 'Nuevo empleado';
            
            // Si estamos editando, obtener el ID
            const empleadoId = document.getElementById('empleadoId').value;
            
            // Subir con metadatos
            const result = await uploadImageToCloudinary(file, 'empleados', {
                entityId: empleadoId || null,
                entityName: entityName
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

    // Limpiar imagen
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

window.viewEmpleado = viewEmpleado;
window.editEmpleado = editEmpleado;
window.confirmDelete = confirmDelete;
window.resetForm = resetForm;
