import { Auth, API_BASE } from '../auth.js';
import { UI } from '../ui.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── Module state ──────────────────────────────────────────────────────────────
let _users = [];
let _listeners = [];

const API = {
    getUsers:   `${API_BASE}/get-users`,
    createUser: `${API_BASE}/create-user`,
    deleteUser: `${API_BASE}/delete-user`,
};

function on(el, evt, fn) {
    if (!el) return;
    el.addEventListener(evt, fn);
    _listeners.push({ el, evt, fn });
}

// ── Export ────────────────────────────────────────────────────────────────────
export default {
    title: 'User Management',

    css: `
/* ── Users page ──────────────────────────────────────────────────── */
#usr-page { animation: usr-fadeUp 0.3s ease both; }
@keyframes usr-fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

/* Header */
.usr-header { display:flex; align-items:center; padding-bottom:1.5rem; border-bottom:1px solid var(--border); margin-bottom:1.75rem; gap:1rem; }
.usr-title { font-size:1.75rem; font-weight:800; letter-spacing:-0.03em; background:linear-gradient(135deg,var(--text-main) 0%,#a5b4fc 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

/* Grid layout */
.usr-grid-split { display:grid; grid-template-columns:1fr 1.5fr; gap:2rem; }

/* Cards */
.usr-card { background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:2rem; box-shadow:0 10px 30px rgba(0,0,0,0.3); transition:transform 0.22s ease,border-color 0.22s ease,box-shadow 0.22s ease; }
.usr-card:hover { transform:translateY(-2px); border-color:rgba(99,120,186,0.34); box-shadow:0 16px 44px rgba(0,0,0,0.5); }
.usr-card-title { font-size:1.1rem; font-weight:700; border-bottom:1px solid var(--border); padding-bottom:1rem; margin-bottom:1.5rem; display:flex; align-items:center; gap:10px; color:var(--text-main); }

/* Form */
.usr-input-group { margin-bottom:1rem; }
.usr-input-group label { display:block; color:var(--text-muted); font-size:0.8rem; font-weight:600; text-transform:uppercase; margin-bottom:0.5rem; }
.usr-input-group input,
.usr-input-group select { width:100%; padding:11px 14px; background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:10px; color:var(--text-main); outline:none; font-size:0.95rem; transition:border 0.3s; font-family:inherit; min-height:44px; }
.usr-input-group input:focus,
.usr-input-group select:focus { border-color:var(--primary); }
.usr-input-group select option { background:#1e293b; }

/* Buttons */
.usr-btn-create { width:100%; padding:13px; background:var(--primary); border:none; border-radius:10px; color:#fff; font-weight:700; cursor:pointer; margin-top:0.5rem; transition:0.2s; font-size:0.95rem; min-height:44px; }
.usr-btn-create:hover { background:#4f46e5; }
.usr-btn-create:disabled { opacity:0.6; cursor:not-allowed; }
.usr-btn-delete { background:rgba(239,68,68,0.2); color:var(--danger); border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:700; transition:0.2s; min-height:unset; }
.usr-btn-delete:hover { background:var(--danger); color:#fff; }

/* Table */
.usr-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
.usr-table-wrap table { width:100%; border-collapse:collapse; min-width:500px; }
.usr-table-wrap th { text-align:left; padding:0.85rem 1rem; color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; border-bottom:1px solid var(--border); white-space:nowrap; }
.usr-table-wrap td { padding:0.85rem 1rem; border-bottom:1px solid var(--border); font-size:0.9rem; vertical-align:middle; }
.usr-table-wrap tr:last-child td { border-bottom:none; }

/* Role badges */
.usr-role-badge { padding:4px 10px; border-radius:20px; font-size:0.72rem; font-weight:700; text-transform:uppercase; background:rgba(99,102,241,0.15); color:var(--primary); }
.usr-role-admin { background:rgba(16,185,129,0.15); color:var(--success); }
.usr-role-manager { background:rgba(245,158,11,0.15); color:#f59e0b; }

/* Light mode overrides */
body.light-mode .usr-card { background:rgba(255,255,255,0.9); border-color:rgba(0,0,0,0.08); }
body.light-mode .usr-input-group input,
body.light-mode .usr-input-group select { background:rgba(0,0,0,0.04); color:#1e293b; border-color:rgba(0,0,0,0.15); }
body.light-mode .usr-input-group select option { background:#fff; color:#1e293b; }
body.light-mode .usr-table-wrap td,
body.light-mode .usr-table-wrap th { color:#1e293b; }
body.light-mode .usr-title { background:linear-gradient(135deg,#0f172a 0%,#4338ca 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

/* Responsive */
@media (max-width:900px) { .usr-grid-split { grid-template-columns:1fr; } }
@media (max-width:768px) {
    .usr-header { padding-bottom:1rem; margin-bottom:1.25rem; }
    .usr-title { font-size:1.4rem; }
    .usr-card { padding:1rem; }
}
@media (max-width:480px) {
    .usr-card { padding:0.85rem; border-radius:12px; }
    .usr-table-wrap table { min-width:420px; }
    .usr-table-wrap td, .usr-table-wrap th { font-size:0.75rem; padding:0.5rem 0.6rem; }
}
`,

    render() {
        return `
<div id="usr-page">
    <!-- Header -->
    <div class="usr-header">
        <h1 class="usr-title"><i class="fa-solid fa-user-shield" style="color:var(--primary);margin-right:10px;-webkit-text-fill-color:unset;"></i>User Management</h1>
    </div>

    <div class="usr-grid-split">
        <!-- CREATE USER FORM -->
        <div class="usr-card">
            <div class="usr-card-title"><i class="fa-solid fa-user-plus"></i> Add New User</div>
            <form id="usr-createUserForm">
                <div class="usr-input-group">
                    <label>Full Name</label>
                    <input type="text" id="usr-newName" placeholder="e.g. Sarah Connor" required>
                </div>
                <div class="usr-input-group">
                    <label>Username</label>
                    <input type="text" id="usr-newUsername" placeholder="e.g. sarahc" required>
                </div>
                <div class="usr-input-group">
                    <label>Password</label>
                    <input type="password" id="usr-newPassword" placeholder="Minimum 6 characters" required>
                </div>
                <div class="usr-input-group">
                    <label>Role</label>
                    <select id="usr-newRole">
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <button class="usr-btn-create" id="usr-createBtn" type="submit">
                    <i class="fa-solid fa-user-plus"></i> Create User
                </button>
            </form>
        </div>

        <!-- USER LIST -->
        <div class="usr-card">
            <div class="usr-card-title"><i class="fa-solid fa-users-gear"></i> Existing Users</div>
            <div class="usr-table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Role</th>
                            <th style="text-align:right">Action</th>
                        </tr>
                    </thead>
                    <tbody id="usr-usersTable">
                        <tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-muted)">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
`;
    },

    async init() {
        const self = this;

        // Form submit
        on(document.getElementById('usr-createUserForm'), 'submit', e => {
            e.preventDefault();
            self._createUser();
        });

        // Users table delegation — delete buttons
        on(document.getElementById('usr-usersTable'), 'click', e => {
            const btn = e.target.closest('[data-action="delete-user"]');
            if (btn) self._deleteUser(btn.dataset.id, btn.dataset.username);
        });

        // Load users
        await this._loadUsers();
    },

    destroy() {
        _listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
        _listeners = [];
        _users = [];
    },

    // ── Private methods ───────────────────────────────────────────────────────

    async _loadUsers() {
        const tbody = document.getElementById('usr-usersTable');
        if (!tbody) return;

        try {
            const res = await fetch(API.getUsers, { headers: Auth.headers() });
            if (!res.ok) throw new Error('Connection Error');

            const json = await res.json();

            // Handle both Array and Object formats
            if (Array.isArray(json)) {
                _users = json;
            } else if (json.data && Array.isArray(json.data)) {
                _users = json.data;
            } else if (json.users && Array.isArray(json.users)) {
                _users = json.users;
            } else {
                _users = [];
            }

            this._renderUsersTable();
        } catch (e) {
            console.error(e);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--danger)"><i class="fa-solid fa-triangle-exclamation"></i> Connection Failed</td></tr>';
            }
            UI.toast('Failed to load users', 'error');
        }
    },

    _renderUsersTable() {
        const tbody = document.getElementById('usr-usersTable');
        if (!tbody) return;

        if (_users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-muted)">No users found.</td></tr>';
            return;
        }

        tbody.innerHTML = _users.map(u => {
            const roleClass = u.role === 'admin' ? 'usr-role-admin' : u.role === 'manager' ? 'usr-role-manager' : '';
            const isProtected = u.username === 'admin';
            return `
            <tr>
                <td><div style="font-weight:600;color:var(--text-main);">${esc(u.full_name || '—')}</div></td>
                <td style="font-family:monospace;color:var(--primary);">${esc(u.username)}</td>
                <td><span class="usr-role-badge ${roleClass}">${esc(u.role)}</span></td>
                <td style="text-align:right;">
                    ${isProtected
                        ? '<span style="opacity:0.3">—</span>'
                        : `<button class="usr-btn-delete" data-action="delete-user" data-id="${esc(u.id)}" data-username="${esc(u.username)}" title="Delete user"><i class="fa-solid fa-trash"></i></button>`
                    }
                </td>
            </tr>`;
        }).join('');
    },

    async _createUser() {
        const btn = document.getElementById('usr-createBtn');
        const nameEl     = document.getElementById('usr-newName');
        const usernameEl = document.getElementById('usr-newUsername');
        const passwordEl = document.getElementById('usr-newPassword');
        const roleEl     = document.getElementById('usr-newRole');

        const name     = nameEl ? nameEl.value.trim() : '';
        const username = usernameEl ? usernameEl.value.trim() : '';
        const password = passwordEl ? passwordEl.value : '';
        const role     = roleEl ? roleEl.value : 'staff';

        if (!name || !username || !password) {
            UI.toast('Please fill in all required fields', 'warning');
            return;
        }
        if (password.length < 6) {
            UI.toast('Password must be at least 6 characters', 'warning');
            return;
        }

        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...'; }

        try {
            const tenantId = Auth.getTenantId();
            const res = await fetch(API.createUser, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...Auth.headers() },
                body: JSON.stringify({
                    full_name: name,
                    username,
                    password,
                    role,
                    tenant_id: tenantId,
                    venue_id: tenantId,
                }),
            });

            if (!res.ok) throw new Error('Failed');

            UI.toast('User created successfully!', 'success');
            document.getElementById('usr-createUserForm').reset();
            await this._loadUsers();
        } catch (e) {
            console.error(e);
            UI.toast('Error creating user. Please try again.', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create User'; }
        }
    },

    async _deleteUser(id, username) {
        if (!confirm(`Are you sure you want to delete user: ${username}?`)) return;

        try {
            const tenantId = Auth.getTenantId();
            const res = await fetch(API.deleteUser, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...Auth.headers() },
                body: JSON.stringify({ user_id: id, tenant_id: tenantId, venue_id: tenantId }),
            });

            if (!res.ok) throw new Error('Failed');

            UI.toast(`User "${username}" deleted.`, 'success');
            await this._loadUsers();
        } catch (e) {
            console.error(e);
            UI.toast('Failed to delete user. Please try again.', 'error');
        }
    },
};
