import { Auth, API_BASE } from '../auth.js';
import { UI } from '../ui.js';

// Module state
let _listeners = [];
let _users = [];

function on(el, evt, fn) { if (!el) return; el.addEventListener(evt, fn); _listeners.push({ el, evt, fn }); }
function $(id) { return document.getElementById(id); }

// ── Load Users ──
async function loadUsers() {
    const tbody = $('usr-usersTable');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/get-users`, { headers: Auth.headers() });
        if (!res.ok) throw new Error('Connection Error');

        const json = await res.json();

        let users = [];
        if (Array.isArray(json)) {
            users = json;
        } else if (json.data && Array.isArray(json.data)) {
            users = json.data;
        } else if (json.users && Array.isArray(json.users)) {
            users = json.users;
        }
        _users = users;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No users found.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => `
            <tr>
                <td><div style="font-weight:600; color:var(--text-main);">${u.full_name || '---'}</div></td>
                <td style="font-family:monospace; color:var(--primary);">${u.username}</td>
                <td><span class="usr-role-badge ${u.role === 'admin' ? 'usr-role-admin' : ''}">${u.role}</span></td>
                <td style="text-align: right;">
                    ${u.username !== 'admin' ? `<button class="usr-btn-delete" data-uid="${u.id}" data-uname="${u.username}"><i class="fa-solid fa-trash"></i></button>` : '<span style="opacity:0.3">-</span>'}
                </td>
            </tr>
        `).join('');

        // Attach delete handlers via delegation (already handled in init)
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#ef4444;">Connection Failed</td></tr>';
    }
}

// ── Create User ──
async function createUser() {
    const btn = $('usr-btnCreate');
    const name = $('usr-newName').value.trim();
    const user = $('usr-newUsername').value.trim();
    const pass = $('usr-newPassword').value.trim();
    const role = $('usr-newRole').value;

    if (!name || !user || !pass) { UI.toast('Please fill all fields', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';

    try {
        const res = await fetch(`${API_BASE}/create-user`, {
            method: 'POST',
            headers: Auth.headers(),
            body: JSON.stringify({ full_name: name, username: user, password: pass, role: role })
        });

        if (res.ok) {
            UI.toast('User created successfully!', 'success');
            $('usr-createUserForm').reset();
            loadUsers();
        } else { throw new Error('Failed'); }
    } catch (e) {
        UI.toast('Error creating user.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Create User';
    }
}

// ── Delete User ──
async function deleteUser(id, username) {
    if (!confirm(`Are you sure you want to delete user: ${username}?`)) return;

    try {
        const res = await fetch(`${API_BASE}/delete-user`, {
            method: 'POST',
            headers: Auth.headers(),
            body: JSON.stringify({ user_id: id })
        });
        if (res.ok) {
            UI.toast('User deleted', 'success');
            loadUsers();
        } else {
            UI.toast('Failed to delete.', 'error');
        }
    } catch (e) {
        UI.toast('Connection Error', 'error');
    }
}

export default {
    title: 'User Management',

    css: `
        .usr-grid-split { display: grid; grid-template-columns: 1fr 1.5fr; gap: 2rem; }

        .usr-input-group { margin-bottom: 1rem; }
        .usr-input-group label { display: block; color: var(--text-muted); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem; }

        .usr-btn-create { width: 100%; padding: 14px; background: var(--primary); border: none; border-radius: 10px; color: white; font-weight: 700; cursor: pointer; margin-top: 1rem; transition: 0.2s; }
        .usr-btn-create:hover { background: #4f46e5; }
        .usr-btn-create:disabled { opacity: 0.6; cursor: not-allowed; }

        .usr-table-container { overflow-x: auto; }
        .usr-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; border-radius: 12px; }
        .usr-table-wrap table { min-width: 500px; }
        .usr-table { width: 100%; border-collapse: collapse; min-width: 500px; }
        .usr-table th { text-align: left; padding: 1rem; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; border-bottom: 1px solid var(--border); }
        .usr-table td { padding: 1rem; border-bottom: 1px solid var(--border); font-size: 0.95rem; }

        .usr-role-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; background: rgba(99, 102, 241, 0.15); color: var(--primary); }
        .usr-role-admin { background: rgba(16, 185, 129, 0.15); color: var(--success); }

        .usr-btn-delete { background: rgba(239, 68, 68, 0.2); color: var(--danger); border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 700; transition: 0.2s; }
        .usr-btn-delete:hover { background: var(--danger); color: white; }

        @media (max-width: 900px) { .usr-grid-split { grid-template-columns: 1fr; } }
    `,

    render() {
        return `
        <div class="usr-grid-split">
            <!-- CREATE USER FORM -->
            <div class="card">
                <div class="card-title"><i class="fa-solid fa-user-plus"></i> Add New User</div>
                <form id="usr-createUserForm" onsubmit="return false;">
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
                    <button class="usr-btn-create" id="usr-btnCreate">Create User</button>
                </form>
            </div>

            <!-- USER LIST -->
            <div class="card">
                <div class="card-title"><i class="fa-solid fa-users-gear"></i> Existing Users</div>
                <div class="usr-table-container">
                    <div class="usr-table-wrap">
                        <table class="usr-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th style="text-align: right;">Action</th>
                                </tr>
                            </thead>
                            <tbody id="usr-usersTable">
                                <tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted)">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
    },

    async init() {
        // Create user button
        on($('usr-btnCreate'), 'click', createUser);

        // Delete button delegation on the table body
        on($('usr-usersTable'), 'click', (e) => {
            const btn = e.target.closest('.usr-btn-delete');
            if (!btn) return;
            const uid = btn.dataset.uid;
            const uname = btn.dataset.uname;
            deleteUser(uid, uname);
        });

        // Load users on init
        await loadUsers();
    },

    destroy() {
        _listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
        _listeners = [];
        _users = [];
    }
};
