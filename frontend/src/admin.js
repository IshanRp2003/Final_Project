import './style.css';

// Check for Admin Role immediately
const userStr = localStorage.getItem('user');
if (!userStr) {
    window.location.href = '/login.html';
} else {
    const user = JSON.parse(userStr);
    if (user.role !== 'ADMIN') {
        alert('Access Denied: Admins Only');
        window.location.href = '/user-dashboard.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));

    // Populate Admin Details
    const sidebarName = document.getElementById('sidebarAdminName');
    const sidebarEmail = document.getElementById('sidebarAdminEmail');
    const topbarName = document.getElementById('topbarAdminName');

    if (sidebarName) sidebarName.textContent = user.name || 'Admin';
    if (sidebarEmail) sidebarEmail.textContent = user.email || 'admin@example.com';
    if (topbarName) topbarName.textContent = user.name || 'Admin';

    // Logout Logic
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        });
    }

    // ============================================================
    // PENDING LISTINGS LOGIC
    // ============================================================

    const API_BASE = 'http://localhost:8080';
    const token = localStorage.getItem('token');

    // 1. Function to Fetch Pending Listings
    async function loadPendingListings() {
        try {
            console.log("Fetching pending listings...");
            // Ensure this URL matches your Backend Controller mapping
            // Based on your latest controller, it is likely /api/admin/pending or /api/admin/listings/pending
            const response = await fetch(`${API_BASE}/api/admin/listings/pending`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to load pending listings');

            const properties = await response.json();
            const container = document.getElementById('pending-listings-container');

            if (!container) return;

            container.innerHTML = '';

            if (properties.length === 0) {
                container.innerHTML = '<p class="text-gray-500 p-4">No pending approvals.</p>';
                return;
            }

            // 2. Create HTML for each property
            properties.forEach(property => {
                const card = document.createElement('div');
                card.className = 'bg-white p-4 rounded-lg shadow-md border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4';

                // Safe Image Check
                const imgUrl =
                    property.imageUrl ||
                    (property.imageUrls && property.imageUrls.length > 0 ? property.imageUrls[0] : null) ||
                    (property.images && property.images.length > 0 ? `http://localhost:8080${property.images[0].filePath}` : null) ||
                    'https://via.placeholder.com/150';

                card.innerHTML = `
                    <div class="flex items-center gap-4 w-full">
                        <img src="${imgUrl}" class="w-24 h-24 object-cover rounded-md border border-gray-100">
                        <div>
                            <h3 class="font-bold text-lg text-gray-800">${property.title}</h3>
                            <p class="text-gray-600 text-sm">${property.address}</p>
                            <p class="text-emerald-600 font-semibold mt-1">Rs. ${property.price.toLocaleString()}</p>
                            <p class="text-xs text-gray-400 mt-1">Owner: ${property.ownerEmail || 'Agent'}</p>
                            ${property.driveLink
                        ? `<a href="${property.driveLink}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-600 hover:underline mt-1 inline-block">Open Drive</a>`
                        : '<p class="text-xs text-gray-400 mt-1">Resource: N/A</p>'}
                        </div>
                    </div>
                    <div class="flex gap-2 min-w-fit">
                        <button onclick="approveListing(${property.id})" class="bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600 transition">Approve</button>
                        <button onclick="rejectListing(${property.id})" class="bg-white border border-red-500 text-red-500 px-4 py-2 rounded hover:bg-red-50 transition">Reject</button>
                    </div>
                `;
                container.appendChild(card);
            });

        } catch (error) {
            console.error('Error:', error);
        }
    }

    // ============================================================
    // THE GLOBAL BRIDGE (Make functions accessible to HTML)
    // ============================================================

    // 1. Expose the loader (Fixes the "Refresh" button)
    window.loadPendingListings = loadPendingListings;

    // 2. Expose the Approve Function
    window.approveListing = async (id) => {
        if (!confirm('Approve this listing?')) return;
        const message = prompt('Approval message to user:', 'Your listing has been approved.');
        if (!message || !message.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/api/admin/listings/${id}/approve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message.trim() })
            });
            if (res.ok) {
                alert('Listing Approved!');
                loadPendingListings();
            } else {
                const data = await res.json();
                alert('Failed: ' + (data.message || 'Unknown error'));
            }
        } catch (err) {
            console.error(err);
            alert('Error approving listing');
        }
    };

    // 3. Expose the Reject Function
    window.rejectListing = async (id) => {
        const reason = prompt('Reason for rejection:');
        if (!reason) return;
        try {
            const res = await fetch(`${API_BASE}/api/admin/listings/${id}/reject`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: reason.trim() })
            });
            if (res.ok) {
                alert('Listing Rejected');
                loadPendingListings();
            } else {
                const data = await res.json();
                alert('Failed: ' + (data.message || 'Unknown error'));
            }
        } catch (err) {
            console.error(err);
            alert('Error rejecting listing');
        }
    };

    // 4. Initial Load
    // Only load if the container actually exists on this page
    if (document.getElementById('pending-listings-container')) {
        loadPendingListings();
    }

});
