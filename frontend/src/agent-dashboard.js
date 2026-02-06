
document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Check
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = '/login.html';
        return;
    }
    const user = JSON.parse(userStr);

    // 2. Update Profile UI
    // NEW LOGIC: Fetch the unique agent profile using their ID
    if (user.agentId) {
        fetch(`http://localhost:8080/api/agents/${user.agentId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(agentData => {
                // Update the UI with the agent's real name from the database
                const profileNameEl = document.getElementById('sidebar-name');
                const headerNameEl = document.getElementById('header-name');
                const sidebarAvatar = document.getElementById('sidebar-avatar');

                if (profileNameEl) profileNameEl.textContent = agentData.name;
                if (headerNameEl) headerNameEl.textContent = agentData.name.split(' ')[0];

                // Update the profile picture
                // If the agent has a photo URL in the database, show it
                if (sidebarAvatar && agentData.profileImageUrl) {
                    sidebarAvatar.innerHTML = `<img src="${agentData.profileImageUrl}" class="w-full h-full object-cover rounded-full" />`;
                }
            })
            .catch(err => console.error("Could not load agent profile:", err));
    }
    // 3. Initialize Features
    initPerformanceChart();
    initModalLogic(user);
    initImageUpload();
    initDashboardStats();
    initPropertiesView();

    // Make showView global for sidebar onclick
    window.showView = showView;
});

// ==================== VIEW SWITCHING ====================
function showView(view) {
    const overviewView = document.getElementById('overviewView');
    const propertiesView = document.getElementById('propertiesView');
    const navOverview = document.getElementById('navOverview');
    const navProperties = document.getElementById('navProperties');

    // Hide all views
    overviewView.classList.add('hidden');
    propertiesView.classList.add('hidden');

    // Reset nav styles
    [navOverview, navProperties].forEach(nav => {
        nav.classList.remove('bg-primary/20', 'text-primary', 'border-l-4', 'border-primary');
        nav.classList.add('text-gray-400', 'hover:bg-white/5', 'hover:text-white');
    });

    // Show selected view
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

// ==================== PROPERTIES VIEW ====================
async function loadMyProperties() {
    const tableBody = document.getElementById('propertiesTableBody');
    const countEl = document.getElementById('propertiesCount');
    const loadingRow = document.getElementById('propertiesLoading');

    try {
        const token = localStorage.getItem('token');
        const API_BASE = 'http://localhost:8080';

        const res = await fetch(`${API_BASE}/api/properties/my-listings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch properties');
        const properties = await res.json();

        if (loadingRow) loadingRow.remove();
        if (countEl) countEl.textContent = `${properties.length} properties`;

        if (properties.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-12 text-center text-gray-400">
                        <span class="material-symbols-outlined text-4xl mb-2 block">inventory_2</span>
                        No properties found. Add your first listing!
                    </td>
                </tr>`;
            return;
        }

        tableBody.innerHTML = properties.map(p => `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="px-4 py-3 flex items-center gap-3">
                    <div class="w-12 h-12 rounded-lg bg-[#222] overflow-hidden shrink-0">
                        ${p.images && p.images.length > 0
                ? `<img src="data:image/jpeg;base64,${p.images[0].imageData}" class="w-full h-full object-cover" />`
                : `<div class="w-full h-full flex items-center justify-center text-gray-500"><span class="material-symbols-outlined">image</span></div>`}
                    </div>
                    <span class="text-white font-medium">${p.title || 'Untitled'}</span>
                </td>
                <td class="px-4 py-3">Rs. ${Number(p.price || 0).toLocaleString()}</td>
                <td class="px-4 py-3">${p.type || 'N/A'}</td>
                <td class="px-4 py-3">${p.address || 'N/A'}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded text-xs font-bold ${p.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-primary/10 text-primary'}">${p.status || 'Active'}</span>
                </td>
                <td class="px-4 py-3">
                    <a href="/view-property.html?id=${p.id}" class="text-primary hover:text-white transition-colors mr-3">View</a>
                </td>
            </tr>
        `).join('');

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
    const modal = document.getElementById('listing-modal');

    if (btnAddProperty && modal) {
        btnAddProperty.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });
    }
}

async function initDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const API_BASE = 'http://localhost:8080';

        // Fetch My Listings
        const res = await fetch(`${API_BASE}/api/properties/my-listings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const listings = await res.json();
            // Update Active Listings Count
            // Assuming the 2nd card is Active Listings (index 1)
            // Or better, add an ID to the element in HTML. 
            // Since I didn't add IDs to stats cards, I'll select by text content or structure.
            // Let's rely on structure for now: 2nd .bg-card-dark h3
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

    // Chart.js Configuration
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
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)', borderColor: 'transparent' }, ticks: { color: '#6b7280' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)', borderColor: 'transparent' }, ticks: { color: '#6b7280' }, beginAtZero: true }
            },
            interaction: { intersect: false, mode: 'index' },
        }
    });
}

function initModalLogic(user) {
    const modal = document.getElementById('listing-modal');
    const btnNewListing = document.getElementById('btn-new-listing');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const form = document.getElementById('dashboardListingForm');

    // Auto-fill agent select
    const agentSelect = document.getElementById('dashboardAgentSelect');
    if (agentSelect) {
        agentSelect.innerHTML = `<option value="${user.name}">${user.name}</option>`;
        agentSelect.value = user.name;
    }

    if (btnNewListing) {
        btnNewListing.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });
    }

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    }

    // Form Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Submitting...';

            try {
                const formData = new FormData();
                // Collect basic fields
                ['dashboardPropertyTitle', 'dashboardPropertyDescription', 'dashboardPropertyAddress',
                    'dashboardPropertyPrice', 'dashboardPropertyType', 'dashboardBedrooms',
                    'dashboardBathrooms', 'dashboardAreaSqFt', 'dashboardContactName',
                    'dashboardContactPhone', 'dashboardContactEmail'].forEach(id => {
                        const key = id.replace('dashboardProperty', '').replace('dashboard', '').replace('Contact', 'owner').toLowerCase(); // naive mapping
                        // Better explicit mapping:
                    });

                // Explicit Mapping to match Backend DTO
                formData.append('title', document.getElementById('dashboardPropertyTitle').value);
                formData.append('description', document.getElementById('dashboardPropertyDescription').value);
                formData.append('address', document.getElementById('dashboardPropertyAddress').value);
                formData.append('price', document.getElementById('dashboardPropertyPrice').value);
                formData.append('type', document.getElementById('dashboardPropertyType').value);
                formData.append('bedrooms', document.getElementById('dashboardBedrooms').value || 0);
                formData.append('bathrooms', document.getElementById('dashboardBathrooms').value || 0);
                formData.append('areaSqFt', document.getElementById('dashboardAreaSqFt').value || 0);
                formData.append('agent', user.name);

                formData.append('ownerName', document.getElementById('dashboardContactName').value);
                formData.append('ownerPhone', document.getElementById('dashboardContactPhone').value);
                formData.append('ownerEmail', document.getElementById('dashboardContactEmail').value);

                // Amenities
                const amenities = Array.from(document.querySelectorAll('#dashboardListingForm input[name="amenities"]:checked')).map(cb => cb.value);
                amenities.forEach(a => formData.append('amenities', a));

                // Images
                if (window.selectedFiles) {
                    window.selectedFiles.forEach(f => formData.append('images', f));
                }

                const token = localStorage.getItem('token');
                const API_BASE = 'http://localhost:8080';

                const res = await fetch(`${API_BASE}/api/properties/submit`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }, // Helper not needed here as we use fetch directly
                    body: formData
                });

                if (res.ok) {
                    alert('Listing submitted successfully!');
                    modal.classList.add('hidden');
                    form.reset();
                    // Clear images
                    window.selectedFiles = [];
                    const container = document.getElementById('dashboardImagePreviewContainer');
                    if (container) container.innerHTML = '';
                    // Ideally refresh "Active Listings" count here
                } else {
                    const err = await res.json();
                    alert('Failed: ' + (err.message || 'Unknown error'));
                }

            } catch (err) {
                console.error(err);
                alert('Error submitting listing: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }
}

function initImageUpload() {
    const fileInput = document.getElementById('dashboardPropertyImages');
    const dropZone = document.getElementById('dashboardDropZone');
    const previewContainer = document.getElementById('dashboardImagePreviewContainer');
    window.selectedFiles = []; // Global to store for submission

    if (!dropZone || !fileInput) return;

    const handleFiles = (files) => {
        window.selectedFiles = [...window.selectedFiles, ...Array.from(files)];
        updatePreviews();
    };

    const updatePreviews = () => {
        previewContainer.innerHTML = '';
        window.selectedFiles.forEach((file, index) => {
            const div = document.createElement('div');
            div.className = 'relative aspect-square rounded-lg overflow-hidden border border-white/20 group';

            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'w-full h-full object-cover';

            const btn = document.createElement('button');
            btn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity';
            btn.innerHTML = '<span class="material-symbols-outlined text-[14px]">close</span>';
            btn.type = 'button';
            btn.onclick = (e) => {
                e.stopPropagation();
                window.selectedFiles.splice(index, 1);
                updatePreviews();
            };

            div.appendChild(img);
            div.appendChild(btn);
            previewContainer.appendChild(div);
        });
    };

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('border-primary');
    }

    function unhighlight(e) {
        dropZone.classList.remove('border-primary');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
}
