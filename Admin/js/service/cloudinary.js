// Cloudinary Service - Subida de imágenes
import { db } from './firebase.js';
import { collection, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dvzl9im2s/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "public_uploads";


export async function uploadImageToCloudinary(file, module = 'general', metadata = {}) {
    if (!file) {
        throw new Error("No se ha seleccionado ningún archivo");
    }

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
        throw new Error("El archivo debe ser una imagen (JPG, PNG, GIF, etc.)");
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB en bytes
    if (file.size > maxSize) {
        throw new Error("La imagen no debe superar los 10MB");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
        // Subir a Cloudinary
        const response = await fetch(CLOUDINARY_URL, {
            method: "POST",
            body: formData
        });

        // Obtener el cuerpo de la respuesta para ver el error detallado
        const data = await response.json();

        if (!response.ok) {
            console.error("Error de Cloudinary:", data);
            const errorMsg = data.error?.message || response.statusText;
            throw new Error(`Error al subir imagen: ${errorMsg}`);
        }
        
        if (!data.secure_url) {
            throw new Error("No se recibió URL de la imagen");
        }

        // Guardar registro en Firestore con vinculación
        let uploadId = null;
        try {
            const uploadData = {
                url: data.secure_url,
                publicId: data.public_id,
                format: data.format,
                width: data.width,
                height: data.height,
                bytes: data.bytes,
                originalFilename: file.name,
                module: module,
                // Vinculación con la entidad
                entityId: metadata.entityId || null,
                entityName: metadata.entityName || 'Sin nombre',
                usedIn: metadata.entityId ? `${module}/${metadata.entityId}` : null,
                // Metadatos
                createdAt: new Date().toISOString(),
                cloudinaryData: {
                    asset_id: data.asset_id,
                    version: data.version,
                    resource_type: data.resource_type
                }
            };

            const docRef = await addDoc(collection(db, 'uploads'), uploadData);
            uploadId = docRef.id;
            console.log("Imagen subida a Cloudinary y guardada en Firestore:", data.secure_url);
            console.log("Vinculada con:", metadata.entityName, `(${module}/${metadata.entityId || 'pendiente'})`);
        } catch (firestoreError) {
            console.warn("Imagen subida a Cloudinary pero no se guardó en Firestore:", firestoreError);
        }

        // Retornar URL y ID del upload
        return {
            url: data.secure_url,
            uploadId: uploadId
        };

    } catch (error) {
        console.error("❌ Error en Cloudinary:", error);
        throw new Error("Error al subir la imagen: " + error.message);
    }
}


export async function linkUploadToEntity(uploadId, entityId, entityName, module) {
    if (!uploadId) return;
    
    try {
        const uploadRef = doc(db, 'uploads', uploadId);
        await updateDoc(uploadRef, {
            entityId: entityId,
            entityName: entityName,
            usedIn: `${module}/${entityId}`,
            linkedAt: new Date().toISOString()
        });
        console.log("Upload vinculado exitosamente:", uploadId, "→", entityName);
    } catch (error) {
        console.warn("No se pudo vincular el upload:", error);
    }
}


export function previewImage(file, imgElement) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imgElement.src = e.target.result;
            imgElement.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}
