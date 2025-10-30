// Default apps
const defaultApps = [];

// State
let apps = JSON.parse(localStorage.getItem('apps')) || defaultApps;
let currentCategory = 'All';
let searchQuery = '';
let editingAppId = null;
let deletingAppId = null;
let draggedElement = null;

// Categories
const categories = ['All', 'Social', 'Productivity', 'Entertainment', 'Shopping', 'Development', 'Game', 'Other'];

// Initialize
function init() {
  renderCategories();
  renderApps();
  setupEventListeners();
  loadTheme();
}

// Theme
function loadTheme() {
  const theme = localStorage.getItem('theme') || 'dark';
  document.body.classList.toggle('light-theme', theme === 'light');
  document.getElementById('themeToggle').textContent = theme === 'light' ? '🌞 Light' : '🌙 Dark';
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  document.getElementById('themeToggle').textContent = isLight ? '🌞 Light' : '🌙 Dark';
}

// Event Listeners
function setupEventListeners() {
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('addAppBtn').addEventListener('click', openAddModal);
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('clearSearch').addEventListener('click', clearSearch);
  document.getElementById('appForm').addEventListener('submit', handleSubmit);
  document.getElementById('appIcon').addEventListener('input', updateIconPreview);
}

function handleSearch(e) {
  searchQuery = e.target.value;
  const clearBtn = document.getElementById('clearSearch');
  clearBtn.classList.toggle('visible', searchQuery.length > 0);
  renderApps();
}

function clearSearch() {
  searchQuery = '';
  document.getElementById('searchInput').value = '';
  document.getElementById('clearSearch').classList.remove('visible');
  renderApps();
}

function updateIconPreview() {
  const iconUrl = document.getElementById('appIcon').value;
  const preview = document.getElementById('iconPreview');
  if (iconUrl) {
    preview.innerHTML = `<img src="${iconUrl}" onerror="this.style.display='none'" />`;
  } else {
    preview.innerHTML = '';
  }
}

// Render Functions
function renderCategories() {
  const container = document.getElementById('categoryFilter');
  const counts = getCategoryCounts();

  container.innerHTML = categories.map(cat => {
    const count = cat === 'All' ? apps.length : (counts[cat] || 0);
    return `
          <div class="category-badge ${currentCategory === cat ? 'active' : ''}" 
               onclick="filterByCategory('${cat}')">
            ${cat} <span style="opacity: 0.75">(${count})</span>
          </div>
        `;
  }).join('');
}

function getCategoryCounts() {
  return apps.reduce((acc, app) => {
    acc[app.category] = (acc[app.category] || 0) + 1;
    return acc;
  }, {});
}

function filterByCategory(category) {
  currentCategory = category;
  renderCategories();
  renderApps();
}

function renderApps() {
  const container = document.getElementById('appGrid');
  const emptyState = document.getElementById('emptyState');

  const filteredApps = apps.filter(app => {
    const matchesCategory = currentCategory === 'All' || app.category === currentCategory;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (filteredApps.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    document.getElementById('emptyDescription').textContent = searchQuery
      ? 'Try adjusting your search query'
      : 'Get started by adding your first app';
  } else {
    container.style.display = 'grid';
    emptyState.style.display = 'none';

    container.innerHTML = filteredApps.map((app, index) => `
          <div class="app-card" draggable="true" data-id="${index}" 
               ondragstart="handleDragStart(event, ${index})"
               ondragend="handleDragEnd(event)"
               ondragover="handleDragOver(event)"
               ondrop="handleDrop(event, ${index})">
            <div class="app-card-inner" onclick="openApp('${app.url}')">
              <img src="${app.icon}" alt="${app.name}" class="app-icon" />
              <h3 class="app-name">${app.name}</h3>
              <p class="app-description">${app.description}</p>
              <div class="app-actions">
                <button class="action-btn edit" onclick="event.stopPropagation(); openEditModal(${index})">
                  ✏️ Edit
                </button>
                <button class="action-btn delete" onclick="event.stopPropagation(); openDeleteModal(${index})">
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        `).join('');
  }
}

// Drag and Drop
function handleDragStart(e, index) {
  draggedElement = index;
  e.currentTarget.classList.add('dragging');
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e, dropIndex) {
  e.preventDefault();
  if (draggedElement !== null && draggedElement !== dropIndex) {
    const draggedApp = apps[draggedElement];
    apps.splice(draggedElement, 1);
    apps.splice(dropIndex, 0, draggedApp);
    saveApps();
    renderApps();
  }
}

// Modal Functions
function openAddModal() {
  editingAppId = null;
  document.getElementById('modalTitle').textContent = 'Add New App';
  document.getElementById('modalDescription').textContent = 'Fill in the details below to add a new app.';
  document.getElementById('submitBtn').textContent = 'Add App';
  document.getElementById('appForm').reset();
  document.getElementById('iconPreview').innerHTML = '';
  document.getElementById('appModal').classList.add('active');
}

function openEditModal(index) {
  editingAppId = index;
  const app = apps[index];
  document.getElementById('modalTitle').textContent = 'Edit App';
  document.getElementById('modalDescription').textContent = "Update your app's information below.";
  document.getElementById('submitBtn').textContent = 'Update App';
  document.getElementById('appName').value = app.name;
  document.getElementById('appUrl').value = app.url;
  document.getElementById('appIcon').value = app.icon;
  document.getElementById('appDescription').value = app.description;
  document.getElementById('appCategory').value = app.category;
  updateIconPreview();
  document.getElementById('appModal').classList.add('active');
}

function closeModal() {
  document.getElementById('appModal').classList.remove('active');
}

function openDeleteModal(index) {
  deletingAppId = index;
  document.getElementById('deleteAppName').textContent = apps[index].name;
  document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('active');
  deletingAppId = null;
}

function confirmDelete() {
  if (deletingAppId !== null) {
    apps.splice(deletingAppId, 1);
    saveApps();
    renderApps();
    renderCategories();
    closeDeleteModal();
  }
}

function handleSubmit(e) {
  e.preventDefault();

  const appData = {
    name: document.getElementById('appName').value,
    url: document.getElementById('appUrl').value,
    icon: document.getElementById('appIcon').value,
    description: document.getElementById('appDescription').value,
    category: document.getElementById('appCategory').value
  };

  if (editingAppId !== null) {
    apps[editingAppId] = appData;
  } else {
    apps.push(appData);
  }

  saveApps();
  renderApps();
  renderCategories();
  closeModal();
}

function openApp(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function saveApps() {
  localStorage.setItem('apps', JSON.stringify(apps));
}

// Initialize app
init();