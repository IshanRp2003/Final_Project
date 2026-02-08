const API_BASE = 'http://localhost:8080';
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = '/login.html';
        return;
    }

    currentUser = JSON.parse(userStr);

    if (currentUser.agentId) {
        fetch(`${API_BASE}/api/agents/${currentUser.agentId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to load agent profile')))
            .then(updateProfileUI)
            .catch(err => console.error('Could not load agent profile:', err));
    }

    initPerformanceChart();
    initPropertyModal();
    initDashboardStats();
    initPropertiesView();

    window.showView = showView;
    window.openAddPropertyModal = openAddPropertyModal;
    window.closeAddPropertyModal = closeAddPropertyModal;
    window.previewAgentPropertyImage = previewAgentPropertyImage;
});

function updateProfileUI(agentData) {
    const profileNameEl = document.getElementById('sidebar-name');
    const headerNameEl = document.getElementById('header-name');
    const sidebarAvatar = document.getElementById('sidebar-avatar');

    if (profileNameEl && agentData?.name) profileNameEl.textContent = agentData.name;
    if (headerNameEl && agentData?.name) headerNameEl.textContent = agentData.name.split(' ')[0];

    if (sidebarAvatar && agentData?.profileImageUrl) {
        sidebarAvatar.innerHTML = `<img src="${agentData.profileImageUrl}" class="w-full h-full object-cover rounded-full" />`;
    }
}

function getAuthHeaders(withJson = false) {
    const headers = {};
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
    if (withJson) headers['Content-Type'] = 'application/json';
    return headers;
}

function showView(view) {
    const overviewView = document.getElementById('overviewView');
    const propertiesView = document.getElementById('propertiesView');
    const navOverview = document.getElementById('navOverview');
    const navProperties = document.getElementById('navProperties');

    overviewView.classList.add('hidden');
    propertiesView.classList.add('hidden');

    [navOverview, navProperties].forEach(nav => {
        nav.classList.remove('bg-primary/20', 'text-primary', 'border-l-4', 'border-primary');
        nav.classList.add('text-gray-400', 'hover:bg-white/5', 'hover:text-white');
    });

    if (view === 'overview') {
        overviewView.classList.remove('hidden');
        navOverview.classList.add('bg-primary/20', 'text-primary', 'border-l-4', 'border-primary');
        navOverview.classList.remove('text-gray-400', 'hover:bg-white/5', 'hover:text-white');
    } else if (view === 'properties') {
        propertiesView.classList.remove('hidden');
        navProperties.classList.add('bg-primary/20', 'text-primary', 'border-l-4', 'border-primary');
        navProperties.classList.remove('text-gray-400', 'hover:bg-white/5', 'hover:text-white');
        loadMyProperties();
    }
}

async function loadMyProperties() {
    const tableBody = document.getElementById('propertiesTableBody');
    const countEl = document.getElementById('propertiesCount');
    const loadingRow = document.getElementById('propertiesLoading');

    try {
        const res = await fetch(`${API_BASE}/api/properties/my-listings`, {
            headers: getAuthHeaders()
        });

        if (!res.ok) throw new Error('Failed to fetch properties');
        const properties = await res.json();

        if (loadingRow) loadingRow.remove();
        if (countEl) countEl.textContent = `${properties.length} properties`;

        if (!properties.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-12 text-center text-gray-400">
                        <span class="material-symbols-outlined text-4xl mb-2 block">inventory_2</span>
                        No properties found. Add your first listing!
                    </td>
                </tr>`;
            return;
        }

        tableBody.innerHTML = properties.map(p => {
            const thumb = p.imageUrl || (Array.isArray(p.imageUrls) && p.imageUrls.length ? p.imageUrls[0] : null);
            const statusClass = p.status === 'PENDING'
                ? 'bg-yellow-500/10 text-yellow-500'
                : p.status === 'SOLD'
                    ? 'bg-red-500/10 text-red-500'
                    : p.status === 'RENTED'
                        ? 'bg-purple-500/10 text-purple-500'
                        : 'bg-primary/10 text-primary';

            return `
                <tr class="hover:bg-white/5 transition-colors">
                    <td class="px-4 py-3 flex items-center gap-3">
                        <div class="w-12 h-12 rounded-lg bg-[#222] overflow-hidden shrink-0">
                            ${thumb
                    ? `<img src="${thumb}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\"w-full h-full flex items-center justify-center text-gray-500\\"><span class=\\"material-symbols-outlined\\">image</span></div>'" />`
                    : `<div class="w-full h-full flex items-center justify-center text-gray-500"><span class="material-symbols-outlined">image</span></div>`}
                        </div>
                        <span class="text-white font-medium">${p.title || 'Untitled'}</span>
                    </td>
                    <td class="px-4 py-3">Rs. ${Number(p.price || 0).toLocaleString()}</td>
                    <td class="px-4 py-3">${p.type || 'N/A'}</td>
                    <td class="px-4 py-3">${p.address || 'N/A'}</td>
                    <td class="px-4 py-3">
                        <span class="px-2 py-1 rounded text-xs font-bold ${statusClass}">${p.status || 'AVAILABLE'}</span>
                    </td>
                    <td class="px-4 py-3">
                        <a href="/view-property.html?id=${p.id}" class="text-primary hover:text-white transition-colors mr-3">View</a>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading properties:', err);
        if (loadingRow) loadingRow.remove();
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-12 text-center text-red-400">
                    Failed to load properties. Please try again.
                </td>
            </tr>`;
    }
}

function initPropertiesView() {
    const btnAddProperty = document.getElementById('btn-add-property');
    const btnNewListing = document.getElementById('btn-new-listing');

    if (btnAddProperty) {
        btnAddProperty.addEventListener('click', openAddPropertyModal);
    }
    if (btnNewListing) {
        btnNewListing.addEventListener('click', openAddPropertyModal);
    }
}

async function initDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(`${API_BASE}/api/properties/my-listings`, {
            headers: getAuthHeaders()
        });

        if (res.ok) {
            const listings = await res.json();
            const statsCards = document.querySelectorAll('.bg-card-dark h3');
            if (statsCards[1]) {
                statsCards[1].innerText = listings.length;
            }
        }
    } catch (err) {
        console.error('Failed to fetch stats:', err);
    }
}

function initPerformanceChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(17, 214, 97, 0.5)');
    gradient.addColorStop(1, 'rgba(17, 214, 97, 0.0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Inquiries',
                data: [12, 19, 15, 25, 22, 30, 28],
                borderColor: '#11d661',
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#11d661',
                pointBorderColor: '#fff',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)', borderColor: 'transparent' }, ticks: { color: '#6b7280' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)', borderColor: 'transparent' }, ticks: { color: '#6b7280' }, beginAtZero: true }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

function initPropertyModal() {
    const form = document.getElementById('addPropertyForm');
    if (!form) return;

    const descTextarea = form.querySelector('textarea[name="description"]');
    if (descTextarea) {
        descTextarea.addEventListener('input', () => {
            document.getElementById('agentDescCharCount').textContent = String(descTextarea.value.length);
        });
    }

    form.addEventListener('submit', submitAgentPropertyForm);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAddPropertyModal();
    });
}

function openAddPropertyModal() {
    const modal = document.getElementById('addPropertyModal');
    const form = document.getElementById('addPropertyForm');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('agentDescCharCount').textContent = '0';
    document.getElementById('agentImagePreviewContainer').classList.add('hidden');

    loadAgentsForAgentDropdown();

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
        const firstInput = form.querySelector('input[name="title"]');
        if (firstInput) firstInput.focus();
    }, 0);
}

function closeAddPropertyModal() {
    const modal = document.getElementById('addPropertyModal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function previewAgentPropertyImage(url) {
    const container = document.getElementById('agentImagePreviewContainer');
    const img = document.getElementById('agentImagePreview');
    if (!container || !img) return;

    if (url && url.trim()) {
        img.src = url;
        container.classList.remove('hidden');
        img.onerror = () => container.classList.add('hidden');
    } else {
        container.classList.add('hidden');
    }
}

async function loadAgentsForAgentDropdown(selectedAgentId = null) {
    const select = document.getElementById('agentAssignedAgentId');
    if (!select) return;

    try {
        let response = await fetch(`${API_BASE}/api/agents`, { headers: getAuthHeaders() });
        if (!response.ok) {
            response = await fetch(`${API_BASE}/api/agents/public`);
        }
        if (!response.ok) {
            throw new Error('Failed to load agents');
        }

        const agents = await response.json();
        select.innerHTML = '';

        if (!Array.isArray(agents) || agents.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No agents available';
            option.disabled = true;
            option.selected = true;
            select.appendChild(option);
            return;
        }

        const preferredId = selectedAgentId
            || (currentUser?.agentId ? String(currentUser.agentId) : null)
            || null;
        const preferredName = currentUser?.name ? currentUser.name.trim().toLowerCase() : '';

        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = String(agent.id);
            option.textContent = agent.name;
            if ((preferredId && String(agent.id) === String(preferredId))
                || (!preferredId && preferredName && agent.name?.trim().toLowerCase() === preferredName)) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        if (!select.value && select.options.length > 0) {
            select.selectedIndex = 0;
        }
    } catch (error) {
        console.error('Error loading agents for dropdown:', error);
    }
}

async function submitAgentPropertyForm(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitBtn = document.getElementById('agentSubmitPropertyBtn');
    const originalBtnHtml = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Creating...
        `;

        const formData = new FormData(form);
        const facilities = Array.from(
            form.querySelectorAll('input[name="facilities[]"]:checked'),
            cb => cb.value
        );
        const additionalImages = (formData.get('additionalImages') || '')
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);

        const assignedAgentId = formData.get('assignedAgentId');
        if (!assignedAgentId) {
            throw new Error('Please select an agent name before submitting.');
        }

        const propertyData = {
            title: formData.get('title'),
            address: formData.get('address'),
            price: parseFloat(formData.get('price')),
            type: formData.get('type'),
            status: formData.get('status'),
            description: formData.get('description') || null,
            bedrooms: formData.get('bedrooms') ? parseInt(formData.get('bedrooms'), 10) : null,
            bathrooms: formData.get('bathrooms') ? parseInt(formData.get('bathrooms'), 10) : null,
            areaSqFt: formData.get('areaSqFt') ? parseFloat(formData.get('areaSqFt')) : null,
            imageUrl: formData.get('imageUrl') || null,
            imageUrls: additionalImages,
            facilities,
            houseRules: formData.get('houseRules') || null,
            assignedAgent: { id: parseInt(assignedAgentId, 10) }
        };

        const response = await fetch(`${API_BASE}/api/properties`, {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify(propertyData)
        });

        if (!response.ok) {
            let message = 'Failed to create property.';
            try {
                const body = await response.json();
                if (body?.message) message = body.message;
            } catch (_) {
                const text = await response.text();
                if (text) message = text;
            }
            throw new Error(message);
        }

        closeAddPropertyModal();
        form.reset();
        document.getElementById('agentDescCharCount').textContent = '0';
        document.getElementById('agentImagePreviewContainer').classList.add('hidden');

        await Promise.all([loadMyProperties(), initDashboardStats()]);
        alert('Property created successfully.');
    } catch (error) {
        console.error('Error creating property:', error);
        alert(error.message || 'Failed to create property.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
    }
}
