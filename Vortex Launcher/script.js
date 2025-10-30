const SUPABASE_URL = 'https://eeelavvrulfeawhwtehm.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZWxhdnZydWxmZWF3aHd0ZWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjQ1MjMsImV4cCI6MjA3NzQwMDUyM30.pZ60IbBQMif9BF4SWElXeUREqA-jjRDnx58qSA9k0Co';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let apps = [];
    let currentCategory = 'All';
    let searchQuery = '';
    let editingAppId = null;
    let deletingAppId = null;
    let draggedIndex = null;

    const categories = ['All', 'Social', 'Productivity', 'Entertainment', 'Shopping', 'Development', 'Game', 'Other'];

    async function init() {
      await fetchApps();
      subscribeToApps();
      renderCategories();
      setupEventListeners();
      loadTheme();
    }

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

    async function fetchApps() {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching apps:', error);
      } else {
        apps = data || [];
        renderApps();
        renderCategories();
      }
    }

    function subscribeToApps() {
      supabase
        .channel('apps-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'apps' }, () => {
          fetchApps();
        })
        .subscribe();
    }

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
          <div class="app-card" draggable="true"
               ondragstart="handleDragStart(event, ${index})"
               ondragend="handleDragEnd(event)"
               ondragover="handleDragOver(event)"
               ondrop="handleDrop(event, ${index})">
            <div class="app-card-inner" onclick="openApp('${app.url}')">
              <img src="${app.icon}" alt="${app.name}" class="app-icon" onerror="this.src='https://via.placeholder.com/64?text=App'" />
              <h3 class="app-name">${app.name}</h3>
              <p class="app-description">${app.description}</p>
              <div class="app-actions">
                <button class="action-btn edit" onclick="event.stopPropagation(); openEditModal('${app.id}')">
                  ✏️ Edit
                </button>
                <button class="action-btn delete" onclick="event.stopPropagation(); openDeleteModal('${app.id}')">
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    function handleDragStart(e, index) {
      draggedIndex = index;
      e.currentTarget.classList.add('dragging');
    }

    function handleDragEnd(e) {
      e.currentTarget.classList.remove('dragging');
    }

    function handleDragOver(e) {
      e.preventDefault();
    }

    async function handleDrop(e, dropIndex) {
      e.preventDefault();
      if (draggedIndex !== null && draggedIndex !== dropIndex) {
        const filteredApps = getFilteredApps();
        const draggedApp = filteredApps[draggedIndex];
        const targetApp = filteredApps[dropIndex];

        await supabase
          .from('apps')
          .update({ sort_order: targetApp.sort_order })
          .eq('id', draggedApp.id);

        await supabase
          .from('apps')
          .update({ sort_order: draggedApp.sort_order })
          .eq('id', targetApp.id);

        draggedIndex = null;
      }
    }

    function getFilteredApps() {
      return apps.filter(app => {
        const matchesCategory = currentCategory === 'All' || app.category === currentCategory;
        const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      });
    }

    function openAddModal() {
      editingAppId = null;
      document.getElementById('modalTitle').textContent = 'Add New App';
      document.getElementById('modalDescription').textContent = 'Fill in the details below to add a new app.';
      document.getElementById('submitBtn').textContent = 'Add App';
      document.getElementById('appForm').reset();
      document.getElementById('iconPreview').innerHTML = '';
      document.getElementById('appModal').classList.add('active');
    }

    function openEditModal(appId) {
      editingAppId = appId;
      const app = apps.find(a => a.id === appId);
      if (!app) return;

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

    function openDeleteModal(appId) {
      deletingAppId = appId;
      const app = apps.find(a => a.id === appId);
      if (!app) return;

      document.getElementById('deleteAppName').textContent = app.name;
      document.getElementById('deleteModal').classList.add('active');
    }

    function closeDeleteModal() {
      document.getElementById('deleteModal').classList.remove('active');
      deletingAppId = null;
    }

    async function confirmDelete() {
      if (!deletingAppId) return;

      const { error } = await supabase
        .from('apps')
        .delete()
        .eq('id', deletingAppId);

      if (error) {
        console.error('Error deleting app:', error);
      } else {
        closeDeleteModal();
      }
    }

    async function handleSubmit(e) {
      e.preventDefault();

      const appData = {
        name: document.getElementById('appName').value,
        url: document.getElementById('appUrl').value,
        icon: document.getElementById('appIcon').value,
        description: document.getElementById('appDescription').value,
        category: document.getElementById('appCategory').value
      };

      if (editingAppId) {
        const { error } = await supabase
          .from('apps')
          .update({
            ...appData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAppId);

        if (error) {
          console.error('Error updating app:', error);
        } else {
          closeModal();
        }
      } else {
        const maxSortOrder = apps.length > 0 ? Math.max(...apps.map(a => a.sort_order)) : -1;

        const { error } = await supabase
          .from('apps')
          .insert([{
            ...appData,
            sort_order: maxSortOrder + 1
          }]);

        if (error) {
          console.error('Error adding app:', error);
        } else {
          closeModal();
        }
      }
    }

    function openApp(url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    init();
