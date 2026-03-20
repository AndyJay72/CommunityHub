import { Auth, API_BASE } from '../auth.js';
import { UI } from '../ui.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
let _listeners = [];
function on(el, evt, fn) { if (!el) return; el.addEventListener(evt, fn); _listeners.push({ el, evt, fn }); }
function $(id) { return document.getElementById(id); }
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

const TYPE_CONFIG = {
    payment:     { cls:'al-type-payment',     label:'Payment',     icon:'fa-credit-card' },
    deposit:     { cls:'al-type-deposit',     label:'Deposit',     icon:'fa-coins' },
    refund:      { cls:'al-type-refund',      label:'Refund',      icon:'fa-rotate-left' },
    booking:     { cls:'al-type-booking',     label:'Booking',     icon:'fa-calendar-check' },
    enquiry:     { cls:'al-type-enquiry',     label:'Enquiry',     icon:'fa-inbox' },
    interaction: { cls:'al-type-interaction', label:'Interaction', icon:'fa-comments' },
    email:       { cls:'al-type-email',       label:'Email',       icon:'fa-envelope' },
};
function getTypeCfg(t) { return TYPE_CONFIG[t] || { cls:'al-type-other', label:t||'Other', icon:'fa-circle' }; }

function fmtDate(ts) {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
    catch { return ts; }
}

// ── Module state ─────────────────────────────────────────────────────────────
let allTx = [];
let filtered = [];
let page = 1;
const PAGE_SIZE = 25;

// ── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
/* ── Audit Log Filter Row ── */
.al-filter-row{display:flex;gap:10px;margin-bottom:1.5rem;flex-wrap:wrap;align-items:center}
.al-input{background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:10px;color:var(--text-main);padding:9px 14px;font-size:0.88rem;outline:none;font-family:inherit}
.al-input:focus{border-color:var(--primary)}
.al-input::placeholder{color:var(--text-muted)}
.al-select{background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:10px;color:var(--text-main);padding:9px 14px;font-size:0.88rem;outline:none;cursor:pointer;font-family:inherit}
.al-select option{background:#1e293b}
.al-clear{background:rgba(148,163,184,0.1);border:1px solid var(--border);color:var(--text-muted);padding:9px 14px;border-radius:10px;cursor:pointer;font-size:0.85rem;font-weight:600;font-family:inherit;transition:0.2s}
.al-clear:hover{color:white;border-color:white}

/* ── Summary Strip ── */
.al-summary-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem}
.al-sum-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:1rem 1.25rem;text-align:center}
.al-sum-val{font-size:1.4rem;font-weight:700;color:var(--text-main)}
.al-sum-lbl{font-size:0.72rem;color:var(--text-muted);margin-top:3px}

/* ── Table ── */
.al-table-wrap{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;overflow:hidden}
.al-table-inner{overflow-x:auto;-webkit-overflow-scrolling:touch}
.al-table-wrap table{width:100%;border-collapse:collapse;min-width:700px}
.al-table-wrap th{text-align:left;padding:1rem 1.25rem;color:var(--text-muted);font-size:0.78rem;text-transform:uppercase;font-weight:600;background:rgba(0,0,0,0.2);border-bottom:1px solid var(--border);white-space:nowrap}
.al-table-wrap td{padding:1rem 1.25rem;border-bottom:1px solid var(--border);color:var(--text-main);font-size:0.9rem;vertical-align:middle}
.al-table-wrap tr:last-child td{border-bottom:none}
.al-table-wrap tbody tr:hover{background:rgba(255,255,255,0.03)}

/* ── Type Pills ── */
.al-type-pill{padding:3px 10px;border-radius:12px;font-size:0.72rem;font-weight:700;text-transform:uppercase;white-space:nowrap}
.al-type-payment{background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3)}
.al-type-deposit{background:rgba(99,102,241,0.15);color:#6366f1;border:1px solid rgba(99,102,241,0.3)}
.al-type-refund{background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3)}
.al-type-booking{background:rgba(6,182,212,0.15);color:#06b6d4;border:1px solid rgba(6,182,212,0.3)}
.al-type-enquiry{background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3)}
.al-type-interaction{background:rgba(139,92,246,0.15);color:#8b5cf6;border:1px solid rgba(139,92,246,0.3)}
.al-type-email{background:rgba(59,130,246,0.15);color:#3b82f6;border:1px solid rgba(59,130,246,0.3)}
.al-type-other{background:rgba(148,163,184,0.1);color:#94a3b8;border:1px solid rgba(148,163,184,0.2)}

/* ── Method Badge ── */
.al-method-badge{padding:3px 8px;border-radius:8px;font-size:0.7rem;font-weight:600;background:rgba(0,0,0,0.3);border:1px solid var(--border);text-transform:capitalize}

/* ── Pagination ── */
.al-pagination{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-top:1px solid var(--border)}
.al-pg-btn{background:var(--bg-card);border:1px solid var(--border);color:var(--text-muted);padding:7px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;transition:0.2s;font-family:inherit}
.al-pg-btn:hover:not(:disabled){color:white;border-color:white}
.al-pg-btn:disabled{opacity:0.35;cursor:not-allowed}
.al-pg-info{font-size:0.82rem;color:var(--text-muted)}

/* ── Header buttons ── */
.al-btn-export{background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);color:#10b981;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:0.88rem;font-weight:600;font-family:inherit;display:flex;align-items:center;gap:6px;transition:0.2s}
.al-btn-export:hover{background:rgba(16,185,129,0.2)}
.al-btn-refresh{background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);color:var(--primary);padding:9px 16px;border-radius:8px;cursor:pointer;font-size:0.88rem;font-weight:600;font-family:inherit;display:flex;align-items:center;gap:6px;transition:0.2s}
.al-btn-refresh:hover{background:rgba(99,102,241,0.2)}

/* ── Responsive ── */
@media(max-width:900px){.al-summary-strip{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.al-summary-strip{grid-template-columns:1fr}.al-table-wrap table{min-width:480px}}
`;

// ── Filter / Render helpers ──────────────────────────────────────────────────
function applyFilters() {
    const q = ($('al-search')?.value || '').toLowerCase();
    const from = $('al-from')?.value || '';
    const to = $('al-to')?.value || '';
    const typ = $('al-type')?.value || '';
    const meth = $('al-method')?.value || '';
    filtered = allTx.filter(t => {
        if (q && ![(t.customer_name||''),(t.room_name||''),(t.ref||''),(t.customer_email||''),(t.details||'')].join(' ').toLowerCase().includes(q)) return false;
        const d = (t.ts||'').slice(0,10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        if (typ && t.type !== typ) return false;
        if (meth && t.method && t.method.toLowerCase() !== meth) return false;
        return true;
    });
    page = 1;
    updateSummary();
    render();
}

function clearFilters() {
    const s = $('al-search'); if (s) s.value = '';
    const f = $('al-from');   if (f) f.value = '';
    const t = $('al-to');     if (t) t.value = '';
    const tp = $('al-type');  if (tp) tp.value = '';
    const m = $('al-method'); if (m) m.value = '';
    applyFilters();
}

function updateSummary() {
    const payTotal = filtered.filter(t => ['payment','deposit','refund'].includes(t.type)).reduce((s,t) => s + parseFloat(t.amount||0), 0);
    const bookEnq  = filtered.filter(t => ['booking','enquiry'].includes(t.type)).length;
    const intCount = filtered.filter(t => ['interaction','email'].includes(t.type)).length;
    const sc = $('al-s-count'); if (sc) sc.textContent = filtered.length;
    const st = $('al-s-total'); if (st) st.textContent = UI.currency(payTotal);
    const sd = $('al-s-deps');  if (sd) sd.textContent = bookEnq;
    const sb = $('al-s-bals');  if (sb) sb.textContent = intCount;
}

function render() {
    const tbody = $('al-tbody');
    if (!tbody) return;
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * PAGE_SIZE;
    const slice = filtered.slice(start, start + PAGE_SIZE);

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--text-muted)">No activity found</td></tr>';
        const pi = $('al-pg-info'); if (pi) pi.textContent = 'No results';
        const pp = $('al-pg-prev'); if (pp) pp.disabled = true;
        const pn = $('al-pg-next'); if (pn) pn.disabled = true;
        return;
    }

    tbody.innerHTML = slice.map(t => {
        const cfg = getTypeCfg(t.type);
        const dateStr = fmtDate(t.ts);
        const amountCell = t.amount
            ? `<span style="font-weight:700;color:var(--success)">${UI.currency(t.amount)}</span>`
            : '<span style="color:var(--text-muted)">—</span>';
        return `<tr>
            <td style="font-size:0.82rem;color:var(--text-muted);white-space:nowrap">${esc(dateStr)}</td>
            <td><div style="font-weight:600">${esc(t.customer_name||'—')}</div><div style="font-size:0.75rem;color:var(--text-muted)">${esc(t.customer_email||'')}</div></td>
            <td style="font-size:0.85rem">${esc(t.room_name||'—')}</td>
            <td><span class="al-type-pill ${cfg.cls}"><i class="fa-solid ${cfg.icon}" style="margin-right:4px"></i>${cfg.label}</span></td>
            <td style="font-size:0.83rem;color:var(--text-muted)">${esc(t.details||'—')}</td>
            <td>${amountCell}</td>
            <td style="font-family:monospace;font-size:0.78rem;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(t.ref||'')}">${esc(t.ref||'—')}</td>
        </tr>`;
    }).join('');

    const pi = $('al-pg-info'); if (pi) pi.textContent = `Page ${page} of ${totalPages} (${filtered.length} records)`;
    const pp = $('al-pg-prev'); if (pp) pp.disabled = (page <= 1);
    const pn = $('al-pg-next'); if (pn) pn.disabled = (page >= totalPages);
}

function changePage(dir) { page += dir; render(); }

function exportCSV() {
    if (!filtered.length) { UI.toast('No data to export.', 'warning'); return; }
    const cols = ['Date & Time','Customer','Email','Room','Type','Details','Amount (GBP)','Ref / Subject'];
    const csvEsc = v => { const s = String(v == null ? '' : v).replace(/"/g, '""'); return /[",\n\r]/.test(s) ? `"${s}"` : s; };
    const rows = filtered.map(t => {
        const dateStr = fmtDate(t.ts);
        return [dateStr, t.customer_name||'', t.customer_email||'', t.room_name||'', t.type||'', t.details||'', parseFloat(t.amount||0).toFixed(2), t.ref||''].map(csvEsc).join(',');
    });
    const csv = [cols.map(csvEsc).join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'venuepro-audit-log-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}

async function loadData() {
    const tbody = $('al-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--text-muted)"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</td></tr>';

    try {
        const [txR, intR, dashR] = await Promise.allSettled([
            fetch(`${API_BASE}/accounts-data`,         { headers: Auth.headers() }),
            fetch(`${API_BASE}/customer-interactions`,  { headers: Auth.headers() }),
            fetch(`${API_BASE}/staff-dashboard`,        { headers: Auth.headers() }),
        ]);
        const events = [];

        // Payments / deposits / refunds
        if (txR.status === 'fulfilled' && txR.value.ok) {
            try {
                const tj = await txR.value.json();
                const td = tj.data || tj;
                const txns = Array.isArray(td) ? td : (td.transactions || td.payments || []);
                txns.filter(t => t && t.amount).forEach(p => {
                    const raw = (p.payment_type || p.type || 'payment').toLowerCase();
                    let type = 'payment';
                    if (/deposit/.test(raw)) type = 'deposit';
                    else if (/refund/.test(raw)) type = 'refund';
                    events.push({
                        type, ts: p.payment_created_at || p.created_at || p.payment_date,
                        customer_name: p.customer_name, customer_email: p.customer_email || p.email,
                        room_name: p.room_name,
                        details: (p.payment_method || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—',
                        amount: p.amount, method: p.payment_method,
                        ref: p.reference || p.reference_number || p.deposit_reference || ''
                    });
                });
            } catch (e) { /* ignore parse errors */ }
        }

        // Interactions
        if (intR.status === 'fulfilled' && intR.value.ok) {
            try {
                const ij = await intR.value.json();
                const ia = ij.data || (Array.isArray(ij) ? ij : []);
                ia.forEach(i => {
                    const isEmail = /email/i.test(i.interaction_type || '');
                    events.push({
                        type: isEmail ? 'email' : 'interaction',
                        ts: i.timestamp || i.created_at,
                        customer_name: i.customer_name, customer_email: i.customer_email || i.email,
                        room_name: i.room_name,
                        details: `${i.interaction_type || 'Interaction'}${i.staff_member ? ' \u00b7 ' + i.staff_member : ''}`,
                        amount: null, ref: i.subject || i.notes || ''
                    });
                });
            } catch (e) { /* ignore parse errors */ }
        }

        // Dashboard — enquiries & bookings
        if (dashR.status === 'fulfilled' && dashR.value.ok) {
            try {
                const dj = await dashR.value.json();
                const dd = dj.data || dj;
                (dd.recent_customers || []).forEach(c => events.push({
                    type: 'enquiry', ts: c.created_at || c.requested_date,
                    customer_name: c.full_name || c.customer_name, customer_email: c.email,
                    room_name: c.room_name,
                    details: `${c.event_type || ''} \u00b7 ${c.guests_count || c.guest_count || '?'} guests`.replace(/^\s*\u00b7\s*/, ''),
                    amount: null, ref: c.notes || ''
                }));
                (dd.upcoming_bookings || []).forEach(b => events.push({
                    type: 'booking', ts: b.booking_created_at || b.booking_date || b.date_from,
                    customer_name: b.customer_name, customer_email: b.customer_email,
                    room_name: b.room_name,
                    details: `${(b.status || 'confirmed').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} \u00b7 ${b.guest_count || '?'} guests`,
                    amount: b.total_amount, ref: b.id || ''
                }));
            } catch (e) { /* ignore parse errors */ }
        }

        // Sort descending by timestamp & deduplicate
        events.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
        const seen = new Set();
        allTx = events.filter(e => {
            const k = `${e.type}|${e.ts}|${e.customer_name}|${e.ref}`;
            if (seen.has(k)) return false;
            seen.add(k); return true;
        });
        applyFilters();
    } catch (e) {
        const tbody2 = $('al-tbody');
        if (tbody2) tbody2.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:#ef4444"><i class="fa-solid fa-triangle-exclamation"></i> Failed to load data</td></tr>';
        console.error(e);
    }
}

// ── Module export ────────────────────────────────────────────────────────────
export default {
    title: 'Audit Log',
    css: CSS,

    render() {
        return `
        <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
            <div>
                <h1 style="font-size:1.8rem;font-weight:700">Audit Log</h1>
                <p style="color:var(--text-muted);font-size:0.88rem;margin-top:3px">All activity — bookings, payments, interactions &amp; enquiries</p>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
                <button class="al-btn-export" id="al-export"><i class="fa-solid fa-file-csv"></i> Export CSV</button>
                <button class="al-btn-refresh" id="al-refresh"><i class="fa-solid fa-rotate-right"></i> Refresh</button>
            </div>
        </header>

        <div class="al-filter-row">
            <input type="text" id="al-search" class="al-input" placeholder="Search customer, room, ref..." style="flex:1;min-width:180px">
            <input type="date" id="al-from" class="al-input" title="From">
            <input type="date" id="al-to" class="al-input" title="To">
            <select id="al-type" class="al-select">
                <option value="">All Types</option>
                <option value="payment">Payment</option>
                <option value="deposit">Deposit</option>
                <option value="refund">Refund</option>
                <option value="booking">Booking</option>
                <option value="enquiry">Enquiry</option>
                <option value="interaction">Interaction</option>
                <option value="email">Email</option>
            </select>
            <select id="al-method" class="al-select">
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
            </select>
            <button class="al-clear" id="al-clear-btn"><i class="fa-solid fa-xmark"></i> Clear</button>
        </div>

        <div class="al-summary-strip">
            <div class="al-sum-card"><div class="al-sum-val" id="al-s-count">—</div><div class="al-sum-lbl">Total Events</div></div>
            <div class="al-sum-card"><div class="al-sum-val" id="al-s-total">—</div><div class="al-sum-lbl">Payments Total</div></div>
            <div class="al-sum-card"><div class="al-sum-val" id="al-s-deps">—</div><div class="al-sum-lbl">Bookings &amp; Enquiries</div></div>
            <div class="al-sum-card"><div class="al-sum-val" id="al-s-bals">—</div><div class="al-sum-lbl">Interactions</div></div>
        </div>

        <div class="al-table-wrap">
            <div class="al-table-inner">
                <table>
                    <thead><tr><th>Date &amp; Time</th><th>Customer</th><th>Room</th><th>Type</th><th>Details</th><th>Amount</th><th>Ref / Subject</th></tr></thead>
                    <tbody id="al-tbody"><tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--text-muted)"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</td></tr></tbody>
                </table>
            </div>
            <div class="al-pagination">
                <button class="al-pg-btn" id="al-pg-prev">&#8249; Prev</button>
                <span class="al-pg-info" id="al-pg-info">—</span>
                <button class="al-pg-btn" id="al-pg-next">Next &#8250;</button>
            </div>
        </div>`;
    },

    async init() {
        // Wire filter events
        on($('al-search'),    'input',  applyFilters);
        on($('al-from'),      'change', applyFilters);
        on($('al-to'),        'change', applyFilters);
        on($('al-type'),      'change', applyFilters);
        on($('al-method'),    'change', applyFilters);
        on($('al-clear-btn'), 'click',  clearFilters);

        // Header buttons
        on($('al-export'),  'click', exportCSV);
        on($('al-refresh'), 'click', () => loadData());

        // Pagination
        on($('al-pg-prev'), 'click', () => changePage(-1));
        on($('al-pg-next'), 'click', () => changePage(1));

        // Load data
        await loadData();
    },

    destroy() {
        // Remove all event listeners
        _listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
        _listeners = [];

        // Reset module state
        allTx = [];
        filtered = [];
        page = 1;
    }
};
