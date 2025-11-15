document.addEventListener('DOMContentLoaded', () => {
  const filtros = document.querySelector('.filtros');
  if (!filtros) return;
  console.log('filter.js: inicializando');

  // Lista simple y ordenada de categorías 
  const categories = [
    { key: 'all', label: 'Todas' },
    { key: 'naturaleza', label: 'Naturaleza' },
    { key: 'playas', label: 'Playas' },
    { key: 'cultura', label: 'Cultura' },
    { key: 'arqueologia', label: 'Arqueología' },
    { key: 'aventura', label: 'Aventura' },
    { key: 'gastronomia', label: 'Gastronomía' }
  ];

  // Si ya hay botones en el HTML, añadimos listeners y NO creamos botones dinámicos
  const existingButtons = Array.from(filtros.querySelectorAll('.filter-btn'));
  console.log('filter.js: botones existentes =', existingButtons.length);
  if (existingButtons.length > 0) {
    existingButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filtros.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFilter(btn.dataset.category);
      });
    });
    const first = filtros.querySelector('[data-category="all"]');
    if (first) {
      first.classList.add('active');
      applyFilter('all');
    }
  } else {
    // No hay botones en el HTML: los creamos dinámicamente
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-btn';
      btn.dataset.category = cat.key;
      btn.textContent = cat.label;
      btn.addEventListener('click', () => {
        filtros.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFilter(cat.key);
      });
      filtros.appendChild(btn);
    });
    const first = filtros.querySelector('[data-category="all"]');
    if (first) first.classList.add('active');
    applyFilter('all');
  }


  // Filtrar según clase existente en span.categoria

  function applyFilter(category) {
    const tarjetas = Array.from(document.querySelectorAll('.lugar'));
    tarjetas.forEach(t => {
      if (category === 'all') {
        t.style.display = '';
        t.classList.remove('hidden');
        return;
      }
      const span = t.querySelector('span.categoria');
      const has = span && span.classList.contains(category);
      if (has) {
        t.style.display = '';
        t.classList.remove('hidden');
      } else {
        t.style.display = 'none';
        t.classList.add('hidden');
      }
    });
  }
  const first = filtros.querySelector('[data-category="all"]');
  if (first) first.classList.add('active');
  applyFilter('all');
});