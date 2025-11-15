// Script para manejar el formulario de contacto y guardarlo en Firestore
import { db } from '../service/firebase.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

const form = document.getElementById('formularioContacto');
const submitBtn = document.querySelector('.boton-enviar');

function setButtonLoading(loading) {
  if (!submitBtn) return;
  submitBtn.disabled = loading;
  submitBtn.style.opacity = loading ? '0.7' : '1';
  submitBtn.innerHTML = loading ? '<i class="fas fa-spinner fa-spin"></i> Enviando...' : '<i class="fas fa-paper-plane"></i> Enviar mensaje';
}

function showMessage(text, type = 'success') {
  let existing = document.querySelector('.form-status');
  if (!existing) {
    existing = document.createElement('div');
    existing.className = 'form-status';
    existing.style.marginTop = '12px';
    existing.style.fontWeight = '600';
    form.appendChild(existing);
  }
  existing.textContent = text;
  existing.style.color = type === 'success' ? '#2b7a2b' : '#b33a3a';
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      nombre: form.nombre.value.trim(),
      email: form.email.value.trim(),
      telefono: form.telefono.value.trim(),
      destino: form.destino.value,
      fechaViaje: form.fechaViaje.value || null,
      personas: form.personas.value,
      presupuesto: form.presupuesto.value,
      mensaje: form.mensaje.value.trim(),
      newsletter: form.newsletter.checked,
      createdAt: serverTimestamp()
    };

    if (!data.nombre || !data.email) {
      showMessage('Por favor completa tu nombre y correo electrónico.', 'error');
      return;
    }

    try {
      setButtonLoading(true);
      // save to Firestore collection 'contactos'
      await addDoc(collection(db, 'contactos'), data);
      showMessage('Gracias — tu mensaje fue enviado correctamente. Te contactaremos pronto.', 'success');
      form.reset();
    } catch (err) {
      console.error('Error saving contact:', err);
      showMessage('Ocurrió un error al enviar. Intenta de nuevo más tarde.', 'error');
    } finally {
      setButtonLoading(false);
    }
  });
}

export { };
