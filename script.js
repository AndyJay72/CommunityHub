// === CONFIGURATION ===
const WEBHOOK_URL = 'https://n8n.srv1090894.hstgr.cloud:5678/webhook-test/dashboard';
const STAFF_NAME = "Manager";
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// === UTILITIES ===
function escapeHtml(unsafe) {
    if (!unsafe) return 'N/A';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function sanitizeForAttribute(str) {
    return String(str).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
}
const formatCurrency = (num) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(num);

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- SKELETON FUNCTIONS ---

function showLoadingSkeletons() {
    // KPI Skeletons
    document.getElementById('val-revenue').innerHTML = '<div class="skeleton kpi-skeleton"></div>';
    document.getElementById('val-pending').innerHTML = '<div class="skeleton kpi-skeleton"></div>';
    document.getElementById('val-contacted').innerHTML = '<div class="skeleton kpi-skeleton"></div>';

    // Table Skeletons
    const requestSkeletons = Array(4).fill().map(() => `
        <tr class="table-skeleton-row">
            <td><div class="skeleton table-skeleton-text" style="width: 70%;"></div></td>
            <td><div class="skeleton table-skeleton-text" style="width: 50%;"></div></td>
                <td><div class="skeleton table-skeleton-text" style="width: 30%;"></div></td>
            <td><div class="skeleton table-skeleton-text" style="width: 60%;"></div></td>
            <td style="text-align: right;"><div class="skeleton table-skeleton-action"></div></td>
        </tr>
    `).join('');

    const bookingSkeletons = Array(4).fill().map(() => `
        <tr class="table-skeleton-row">
            <td><div class="skeleton table-skeleton-text" style="width: 40%;"></div></td>
            <td><div class="skeleton table-skeleton-text" style="width: 60%;"></div></td>
            <td><div class="skeleton table-skeleton-text" style="width: 80%;"></div></td>
        </tr>
    `).join('');

    document.getElementById('table-requests').innerHTML = requestSkeletons;
    document.getElementById('table-bookings').innerHTML = bookingSkeletons;
}

// === MAIN LOGIC ===
async function loadDashboard() {
    const refreshIcon = document.getElementById('refresh-icon');
    refreshIcon.classList.add('fa-spin');
    showLoadingSkeletons(); // Show skeletons immediately

    try {
        // Fetch from n8n webhook
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'get-dashboard-data' })
        });
        
        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
            } catch (e) {
                errorText = 'Unable to read error response';
            }
            throw new Error(`Webhook failed (${response.status}): ${errorText.substring(0, 100)}`);
        }        const data = await response.json();
        
        const bookings = data.bookings || [];
        const metrics = data.metrics || {};
        
        // 1. Populate Metrics
        document.getElementById('val-revenue').innerText = formatCurrency(metrics.total_revenue_month || 0);
        document.getElementById('val-pending').innerText = metrics.pending_requests || 0;
        document.getElementById('val-contacted').innerText = metrics.contacted_today || 0;

        // 2. Populate Requests Table
        const reqBody = document.getElementById('table-requests');
        const requests = data.recent_customers || bookings.filter(b => (b.status === 'pending' || b.status === 'contacted') && new Date(b.booking_date || b.event_date) >= new Date());
        
        if (requests.length === 0) {
            reqBody.innerHTML = `<tr><td colspan="5" class="empty-table-message">No new requests in the queue.</td></tr>`;
        } else {
            reqBody.innerHTML = requests.map(c => `
                <tr>
                    <td>
                        <div style="font-weight: 600;">${c.customer_name || c.full_name || 'N/A'}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${new Date(c.booking_date || c.event_date).toLocaleDateString()}</div>
                    </td>
                    <td>${c.event_type || 'General'}</td>
                    <td><i class="fa-solid fa-user-group" style="font-size: 0.7rem; margin-right:5px"></i> ${c.guests_count || c.guest_count || 0}</td>
                    <td>
                        <span class="status-badge ${c.status === 'pending' ? 'pending' : 'contacted'}">
                            ${c.status || 'pending'}
                        </span>
                    </td>
                    <td style="text-align: right;">
                        <button id="btn-${c.id}" class="btn-action" 
                            style="margin-left: auto;"
                            onclick="markContacted('${c.id}', '${(c.customer_name || c.full_name || 'Customer').replace(/'/g, "\\'")}')" 
                            ${c.status !== 'pending' ? 'disabled' : ''}>
                            ${c.status === 'pending' ? '<i class="fa-solid fa-check"></i> Accept' : '<i class="fa-solid fa-check-double"></i> Done'}
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        // 3. Populate Bookings Table
        const bookBody = document.getElementById('table-bookings');
        const upcomingBookings = data.upcoming_bookings || bookings.filter(b => new Date(b.booking_date || b.event_date) >= new Date());

        if (upcomingBookings.length === 0) {
            bookBody.innerHTML = `<tr><td colspan="3" class="empty-table-message">No upcoming events scheduled.</td></tr>`;
        } else {
            bookBody.innerHTML = upcomingBookings.slice(0, 10).map(b => `
                <tr>
                    <td>
                        <div style="font-weight: 600;">${new Date(b.booking_date || b.event_date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${b.customer_name || b.full_name || 'N/A'}</div>
                    </td>
                    <td>${b.room_name || b.venue || 'Main Hall'}</td>
                    <td>
                        <span class="status-badge ${(b.balance_due || 0) > 0 ? 'balance' : 'paid'}">
                            ${(b.balance_due || 0) > 0 ? formatCurrency(b.balance_due) + ' Due' : 'Paid in Full'}
                        </span>
                    </td>
                </tr>
            `).join('');
        }

    } catch (error) {
        console.error('Dashboard load error:', error);
        // Reset KPI values to error state
        document.getElementById('val-revenue').innerText = 'ERROR';
        document.getElementById('val-pending').innerText = 'ERROR';
        document.getElementById('val-contacted').innerText = 'ERROR';
        // Clear table skeletons and display error message
        document.getElementById('table-requests').innerHTML = `<tr><td colspan="5" class="error-table-message">Could not load data. Check console.</td></tr>`;
        document.getElementById('table-bookings').innerHTML = `<tr><td colspan="3" class="error-table-message">Could not load data. Check console.</td></tr>`;
        showToast(`Connection error: ${error.message.substring(0, 50)}...`, "error");
    } finally {
        refreshIcon.classList.remove('fa-spin');
    }
}

// === ACTION LOGIC ===
async function markContacted(id, name) {
    // Visual feedback immediately
    const btn = document.getElementById(`btn-${id}`);
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing';
    btn.disabled = true;

    try {
        // Send update to n8n webhook
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ action: 'update-status', id: id, staff_name: STAFF_NAME })
        });
        
        if (response.ok) {
            showToast(`${name} marked as contacted`);
            // Reload data to reflect changes
            setTimeout(loadDashboard, 500);
        } else {
            throw new Error(`Update failed (${response.status})`);
        }
    } catch (error) {
        console.error('Update error:', error);
        showToast(`Failed to update status.`, "error");
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

// Initialize on Load
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // Set welcome message
    const welcomeEl = document.getElementById('welcome-message');
    if (welcomeEl) {
        welcomeEl.innerText = `Welcome back, Staff ${STAFF_NAME}`;
    }
    
    // Initial load
    loadDashboard();
    
    // Auto-refresh every 60 seconds
    refreshInterval = setInterval(loadDashboard, 60000);
});

// Clean up interval on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});