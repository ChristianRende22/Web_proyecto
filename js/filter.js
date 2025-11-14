document.addEventListener('DOMContentLoaded', () => {
  const filtros = document.querySelector('.filtros');
  const tarjetas = Array.from(document.querySelectorAll('.lugar'));
  if (!filtros || tarjetas.length === 0) return;

  // Lista simple y ordenada de categorías 
  const categories = [
    { key: 'all', label: 'Todas' },
    { key: 'naturaleza', label: 'Naturaleza' },
    { key: 'playas', label: 'Playas' },
    { key: 'cultura', label: 'Cultura' },
    { key: 'aventura', label: 'Aventura' },
    { key: 'gastronomia', label: 'Gastronomía' }
  ];

  // If there are already buttons in the HTML, attach listeners instead of creating duplicates
  const existingButtons = Array.from(filtros.querySelectorAll('.filter-btn'));
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
    return;
  }

  // Crear botones simples (si no existen en el HTML)
  // Filtrar según clase existente en span.categoria
  function applyFilter(category) {
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

  // Inicial (create buttons dynamically if none were present)
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
});