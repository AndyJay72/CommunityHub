import { Auth, API_BASE } from '../auth.js';
import { UI } from '../ui.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(parseFloat(n) || 0);

// ── API endpoints ─────────────────────────────────────────────────────────────
const PAYMENTS_API     = `${API_BASE}/accounts-data`;
const INTERACTIONS_API = `${API_BASE}/customer-interactions`;
const DASHBOARD_API    = `${API_BASE}/staff-dashboard`;

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    payment:     { cls: 'al-type-payment',     label: 'Payment',     icon: 'fa-credit-card' },
    deposit:     { cls: 'al-type-deposit',     label: 'Deposit',     icon: 'fa-coins' },
    refund:      { cls: 'al-type-refund',      label: 'Refund',      icon: 'fa-rotate-left' },
    booking:     { cls: 'al-type-booking',     label: 'Booking',     icon: 'fa-calendar-check' },
    enquiry:     { cls: 'al-type-enquiry',     label: 'Enquiry',     icon: 'fa-inbox' },
    interaction: { cls: 'al-type-interaction', label: 'Interaction', icon: 'fa-comments' },
    email:       { cls: 'al-type-email',       label: 'Email',       icon: 'fa-envelope' },
};
function getTypeCfg(t) { return TYPE_CONFIG[t] || { cls: 'al-type-other', label: t || 'Other', icon: 'fa-circle' }; }

// ── Module state ──────────────────────────────────────────────────────────────
let _allTx    = [];
let _filtered = [];
let _page     = 1;
let _listeners = [];

const PAGE_SIZE = 25;

function on(el, evt, fn) {
    if (!el) return;
    el.addEventListener(evt, fn);
    _listeners.push({ el, evt, fn });
}

// ── Export ────────────────────────────────────────────────────────────────────
export default {
    title: 'Audit Log',

    css: `
/* ── Audit Log page ─────────────────────────────────────────────────── */
#al-page { animation: al-fadeUp 0.38s ease both; }
@keyframes al-fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }

/* Header */
.al-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border); flex-wrap:wrap; gap:1rem; }
.al-header-left { display:flex; align-items:center; gap:0; }
.al-title { font-size:1.75rem; font-weight:800; letter-spacing:-0.03em; background:linear-gradient(135deg,var(--text-main) 0%,#a5b4fc 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.al-subtitle { color:var(--text-muted); font-size:0.88rem; margin-top:3px; }
.al-header-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }

/* Header buttons */
.al-btn-export { background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); color:#10b981; padding:9px 16px; border-radius:8px; cursor:pointer; font-size:0.88rem; font-weight:600; font-family:inherit; display:flex; align-items:center; gap:6px; transition:0.2s; min-height:44px; }
.al-btn-export:hover { background:rgba(16,185,129,0.2); }
.al-btn-refresh { background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.3); color:var(--primary); padding:9px 16px; border-radius:8px; cursor:pointer; font-size:0.88rem; font-weight:600; font-family:inherit; display:flex; align-items:center; gap:6px; transition:0.2s; min-height:44px; }
.al-btn-refresh:hover { background:rgba(99,102,241,0.2); }

/* Filter row */
.al-filter-row { display:flex; gap:10px; margin-bottom:1.5rem; flex-wrap:wrap; align-items:center; }
.al-f-input { background:rgba(0,0,0,0.25); border:1px solid var(--border); border-radius:10px; color:var(--text-main); padding:9px 14px; font-size:0.88rem; outline:none; font-family:inherit; min-height:44px; }
.al-f-input:focus { border-color:var(--primary); }
.al-f-input::placeholder { color:var(--text-muted); }
.al-f-select { background:rgba(0,0,0,0.25); border:1px solid var(--border); border-radius:10px; color:var(--text-main); padding:9px 14px; font-size:0.88rem; outline:none; cursor:pointer; font-family:inherit; min-height:44px; }
.al-f-select option { background:#1e293b; }
.al-f-clear { background:rgba(148,163,184,0.1); border:1px solid var(--border); color:var(--text-muted); padding:9px 14px; border-radius:10px; cursor:pointer; font-size:0.85rem; font-weight:600; font-family:inherit; transition:0.2s; min-height:44px; }
.al-f-clear:hover { color:var(--text-main); border-color:var(--text-main); }

/* Summary strip */
.al-summary-strip { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.5rem; }
.al-sum-card { background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:1rem 1.25rem; text-align:center; }
.al-sum-val { font-size:1.4rem; font-weight:700; color:var(--text-main); }
.al-sum-lbl { font-size:0.72rem; color:var(--text-muted); margin-top:3px; }

/* Table */
.al-table-wrap { background:var(--bg-card); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
.al-table-inner { overflow-x:auto; -webkit-overflow-scrolling:touch; }
.al-table-inner table { width:100%; border-collapse:collapse; min-width:700px; }
.al-table-inner th { text-align:left; padding:1rem 1.25rem; color:var(--text-muted); font-size:0.78rem; text-transform:uppercase; font-weight:600; background:rgba(0,0,0,0.2); border-bottom:1px solid var(--border); white-space:nowrap; }
.al-table-inner td { padding:1rem 1.25rem; border-bottom:1px solid var(--border); color:var(--text-main); font-size:0.9rem; vertical-align:middle; }
.al-table-inner tr:last-child td { border-bottom:none; }
.al-table-inner tbody tr:hover { background:rgba(255,255,255,0.03); }

/* Type pills */
.al-type-pill { padding:3px 10px; border-radius:12px; font-size:0.72rem; font-weight:700; text-transform:uppercase; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; }
.al-type-payment     { background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); }
.al-type-deposit     { background:rgba(99,102,241,0.15); color:#6366f1; border:1px solid rgba(99,102,241,0.3); }
.al-type-refund      { background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); }
.al-type-booking     { background:rgba(6,182,212,0.15); color:#06b6d4; border:1px solid rgba(6,182,212,0.3); }
.al-type-enquiry     { background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); }
.al-type-interaction { background:rgba(139,92,246,0.15); color:#8b5cf6; border:1px solid rgba(139,92,246,0.3); }
.al-type-email       { background:rgba(59,130,246,0.15); color:#3b82f6; border:1px solid rgba(59,130,246,0.3); }
.al-type-other       { background:rgba(148,163,184,0.1); color:#94a3b8; border:1px solid rgba(148,163,184,0.2); }

/* Pagination */
.al-pagination { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-top:1px solid var(--border); }
.al-pg-btn { background:var(--bg-card); border:1px solid var(--border); color:var(--text-muted); padding:7px 14px; border-radius:8px; cursor:pointer; font-size:0.85rem; font-weight:600; transition:0.2s; font-family:inherit; min-height:44px; }
.al-pg-btn:hover:not(:disabled) { color:var(--text-main); border-color:var(--text-main); }
.al-pg-btn:disabled { opacity:0.35; cursor:not-allowed; }
.al-pg-info { font-size:0.82rem; color:var(--text-muted); }

/* Amount cell */
.al-amount-positive { font-weight:700; color:var(--success,#10b981); }
.al-amount-empty    { color:var(--text-muted); }

/* Ref cell */
.al-ref-cell { font-family:monospace; font-size:0.78rem; color:var(--text-muted); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* Date cell */
.al-date-cell { font-size:0.82rem; color:var(--text-muted); white-space:nowrap; }

/* Customer cell */
.al-customer-name  { font-weight:600; }
.al-customer-email { font-size:0.75rem; color:var(--text-muted); }

/* Details cell */
.al-details-cell { font-size:0.83rem; color:var(--text-muted); }

/* Responsive */
@media (max-width:1200px) { .al-summary-strip { grid-template-columns:repeat(2,1fr); } }
@media (max-width:768px) {
    .al-header { flex-direction:column; align-items:flex-start; }
    .al-header-actions { width:100%; }
    .al-filter-row { flex-direction:column; align-items:stretch; }
    .al-f-input, .al-f-select, .al-f-clear { width:100%; }
    .al-summary-strip { grid-template-columns:1fr 1fr; gap:0.75rem; }
}
@media (max-width:480px) {
    .al-summary-strip { grid-template-columns:1fr; gap:0.6rem; }
    .al-title { font-size:1.2rem; }
}

/* ── Light mode overrides ─────────────────────────────────────────── */
body.light-mode .al-sum-card,
body.light-mode .al-table-wrap { background:rgba(255,255,255,0.92); border-color:rgba(0,0,0,0.1); color:#0f172a; }
body.light-mode .al-table-inner th { background:rgba(240,244,248,0.9); color:#475569; border-color:rgba(0,0,0,0.07); }
body.light-mode .al-table-inner td { color:#0f172a; border-color:rgba(0,0,0,0.06); }
body.light-mode .al-table-inner tbody tr:hover { background:rgba(0,0,0,0.03) !important; }
body.light-mode .al-sum-val { color:#0f172a; }
body.light-mode .al-sum-lbl { color:#64748b; }
body.light-mode .al-f-input,
body.light-mode .al-f-select { background:rgba(255,255,255,0.8); border-color:rgba(0,0,0,0.15); color:#0f172a; }
body.light-mode .al-f-select option { background:#fff; color:#1e293b; }
body.light-mode .al-f-clear { background:rgba(255,255,255,0.8); border-color:rgba(0,0,0,0.15); color:#475569; }
body.light-mode .al-f-clear:hover { color:#0f172a; border-color:#94a3b8; }
body.light-mode .al-pg-btn { background:rgba(255,255,255,0.8); border-color:rgba(0,0,0,0.15); color:#475569; }
body.light-mode .al-pg-btn:hover:not(:disabled) { color:#0f172a; border-color:#94a3b8; }
body.light-mode .al-date-cell,
body.light-mode .al-customer-email,
body.light-mode .al-details-cell,
body.light-mode .al-ref-cell,
body.light-mode .al-pg-info { color:#64748b; }
body.light-mode .al-title { background:linear-gradient(135deg,#0f172a 0%,#4338ca 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
body.light-mode .al-header { border-bottom-color:rgba(0,0,0,0.08); }
`,

    render() {
        return `
<div id="al-page">
    <header class="al-header">
        <div class="al-header-left">
            <div>
                <h1 class="al-title">Audit Log</h1>
                <p class="al-subtitle">All activity — bookings, payments, interactions &amp; enquiries</p>
            </div>
        </div>
        <div class="al-header-actions">
            <button class="al-btn-export" id="al-export-btn">
                <i class="fa-solid fa-file-csv"></i> Export CSV
            </button>
            <button class="al-btn-refresh" id="al-refresh-btn">
                <i class="fa-solid fa-rotate-right"></i> Refresh
            </button>
        </div>
    </header>

    <div class="al-filter-row">
        <input type="text" id="al-f-search" class="al-f-input" placeholder="Search customer, room, ref..." style="flex:1;min-width:180px">
        <input type="date" id="al-f-from" class="al-f-input" title="From">
        <input type="date" id="al-f-to" class="al-f-input" title="To">
        <select id="al-f-type" class="al-f-select">
            <option value="">All Types</option>
            <option value="payment">Payment</option>
            <option value="deposit">Deposit</option>
            <option value="refund">Refund</option>
            <option value="booking">Booking</option>
            <option value="enquiry">Enquiry</option>
            <option value="interaction">Interaction</option>
            <option value="email">Email</option>
        </select>
        <select id="al-f-method" class="al-f-select">
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
        </select>
        <button class="al-f-clear" id="al-clear-btn"><i class="fa-solid fa-xmark"></i> Clear</button>
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
                <thead>
                    <tr>
                        <th>Date &amp; Time</th>
                        <th>Customer</th>
                        <th>Room</th>
                        <th>Type</th>
                        <th>Details</th>
                        <th>Amount</th>
                        <th>Ref / Subject</th>
                    </tr>
                </thead>
                <tbody id="al-log-tbody">
                    <tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--text-muted)"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</td></tr>
                </tbody>
            </table>
        </div>
        <div class="al-pagination">
            <button class="al-pg-btn" id="al-pg-prev">&#8249; Prev</button>
            <span class="al-pg-info" id="al-pg-info">—</span>
            <button class="al-pg-btn" id="al-pg-next">Next &#8250;</button>
        </div>
    </div>
</div>`;
    },

    async init() {
        const self = this;

        // Filter inputs
        on(document.getElementById('al-f-search'), 'input',  () => self._applyFilters());
        on(document.getElementById('al-f-from'),   'change', () => self._applyFilters());
        on(document.getElementById('al-f-to'),     'change', () => self._applyFilters());
        on(document.getElementById('al-f-type'),   'change', () => self._applyFilters());
        on(document.getElementById('al-f-method'), 'change', () => self._applyFilters());

        // Buttons
        on(document.getElementById('al-clear-btn'),   'click', () => self._clearFilters());
        on(document.getElementById('al-export-btn'),  'click', () => self._exportCSV());
        on(document.getElementById('al-refresh-btn'), 'click', () => self._loadData());

        // Pagination
        on(document.getElementById('al-pg-prev'), 'click', () => { _page--; self._render(); });
        on(document.getElementById('al-pg-next'), 'click', () => { _page++; self._render(); });

        // Load data
        await this._loadData();
    },

    destroy() {
        _listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
        _listeners = [];
        _allTx     = [];
        _filtered  = [];
        _page      = 1;
    },

    // ── Private: data loading ─────────────────────────────────────────────────

    async _loadData() {
        const tbody = document.getElementById('al-log-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--text-muted)"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</td></tr>';
        }

        try {
            const headers = Auth.headers();
            const [txR, intR, dashR] = await Promise.allSettled([
                fetch(PAYMENTS_API,     { headers }),
                fetch(INTERACTIONS_API, { headers }),
                fetch(DASHBOARD_API,    { headers }),
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
                            type,
                            ts:             p.payment_created_at || p.created_at || p.payment_date,
                            customer_name:  p.customer_name,
                            customer_email: p.customer_email || p.email,
                            room_name:      p.room_name,
                            details:        (p.payment_method || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—',
                            amount:         p.amount,
                            method:         p.payment_method,
                            ref:            p.reference || p.reference_number || p.deposit_reference || '',
                        });
                    });
                } catch (e) { /* ignore parse errors */ }
            }

            // Interactions / emails
            if (intR.status === 'fulfilled' && intR.value.ok) {
                try {
                    const ij = await intR.value.json();
                    const ia = ij.data || (Array.isArray(ij) ? ij : []);
                    ia.forEach(i => {
                        const isEmail = /email/i.test(i.interaction_type || '');
                        events.push({
                            type:           isEmail ? 'email' : 'interaction',
                            ts:             i.timestamp || i.created_at,
                            customer_name:  i.customer_name,
                            customer_email: i.customer_email || i.email,
                            room_name:      i.room_name,
                            details:        `${i.interaction_type || 'Interaction'}${i.staff_member ? ' \u00b7 ' + i.staff_member : ''}`,
                            amount:         null,
                            ref:            i.subject || i.notes || '',
                        });
                    });
                } catch (e) { /* ignore parse errors */ }
            }

            // Dashboard: enquiries + bookings
            if (dashR.status === 'fulfilled' && dashR.value.ok) {
                try {
                    const dj = await dashR.value.json();
                    const dd = dj.data || dj;
                    (dd.recent_customers || []).forEach(c => events.push({
                        type:           'enquiry',
                        ts:             c.created_at || c.requested_date,
                        customer_name:  c.full_name || c.customer_name,
                        customer_email: c.email,
                        room_name:      c.room_name,
                        details:        `${c.event_type || ''} \u00b7 ${c.guests_count || c.guest_count || '?'} guests`.replace(/^\s*\u00b7\s*/, ''),
                        amount:         null,
                        ref:            c.notes || '',
                    }));
                    (dd.upcoming_bookings || []).forEach(b => events.push({
                        type:           'booking',
                        ts:             b.booking_created_at || b.booking_date || b.date_from,
                        customer_name:  b.customer_name,
                        customer_email: b.customer_email,
                        room_name:      b.room_name,
                        details:        `${(b.status || 'confirmed').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} \u00b7 ${b.guest_count || '?'} guests`,
                        amount:         b.total_amount,
                        ref:            b.id || '',
                    }));
                } catch (e) { /* ignore parse errors */ }
            }

            // Sort newest first, deduplicate
            events.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
            const seen = new Set();
            _allTx = events.filter(e => {
                const k = `${e.type}|${e.ts}|${e.customer_name}|${e.ref}`;
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
            });

            this._applyFilters();

        } catch (e) {
            const tbody2 = document.getElementById('al-log-tbody');
            if (tbody2) {
                tbody2.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:#ef4444"><i class="fa-solid fa-triangle-exclamation"></i> Failed to load data</td></tr>';
            }
            UI.toast('Failed to load audit log data', 'error');
            console.error(e);
        }
    },

    // ── Private: filters ──────────────────────────────────────────────────────

    _clearFilters() {
        const fields = ['al-f-search', 'al-f-from', 'al-f-to', 'al-f-type', 'al-f-method'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        this._applyFilters();
    },

    _applyFilters() {
        const q    = (document.getElementById('al-f-search')?.value || '').toLowerCase();
        const from = document.getElementById('al-f-from')?.value  || '';
        const to   = document.getElementById('al-f-to')?.value    || '';
        const typ  = document.getElementById('al-f-type')?.value  || '';
        const meth = document.getElementById('al-f-method')?.value || '';

        _filtered = _allTx.filter(t => {
            if (q && ![(t.customer_name || ''), (t.room_name || ''), (t.ref || ''), (t.customer_email || ''), (t.details || '')].join(' ').toLowerCase().includes(q)) return false;
            const d = (t.ts || '').slice(0, 10);
            if (from && d < from) return false;
            if (to   && d > to)   return false;
            if (typ  && t.type !== typ) return false;
            if (meth && t.method && t.method.toLowerCase() !== meth) return false;
            return true;
        });

        _page = 1;
        this._updateSummary();
        this._render();
    },

    _updateSummary() {
        const payTotal  = _filtered.filter(t => ['payment', 'deposit', 'refund'].includes(t.type)).reduce((s, t) => s + parseFloat(t.amount || 0), 0);
        const bookEnq   = _filtered.filter(t => ['booking', 'enquiry'].includes(t.type)).length;
        const intCount  = _filtered.filter(t => ['interaction', 'email'].includes(t.type)).length;

        const sCount = document.getElementById('al-s-count');
        const sTotal = document.getElementById('al-s-total');
        const sDeps  = document.getElementById('al-s-deps');
        const sBals  = document.getElementById('al-s-bals');
        if (sCount) sCount.textContent = _filtered.length;
        if (sTotal) sTotal.textContent = fmt(payTotal);
        if (sDeps)  sDeps.textContent  = bookEnq;
        if (sBals)  sBals.textContent  = intCount;
    },

    _render() {
        const tbody = document.getElementById('al-log-tbody');
        if (!tbody) return;

        const totalPages = Math.max(1, Math.ceil(_filtered.length / PAGE_SIZE));
        if (_page > totalPages) _page = totalPages;
        const start = (_page - 1) * PAGE_SIZE;
        const slice = _filtered.slice(start, start + PAGE_SIZE);

        const pgInfo = document.getElementById('al-pg-info');
        const pgPrev = document.getElementById('al-pg-prev');
        const pgNext = document.getElementById('al-pg-next');

        if (!_filtered.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--text-muted)">No activity found</td></tr>';
            if (pgInfo) pgInfo.textContent = 'No results';
            if (pgPrev) pgPrev.disabled = true;
            if (pgNext) pgNext.disabled = true;
            return;
        }

        tbody.innerHTML = slice.map(t => {
            const cfg = getTypeCfg(t.type);
            let dateStr = '—';
            if (t.ts) {
                try { dateStr = new Date(t.ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { dateStr = t.ts; }
            }
            const amountCell = t.amount
                ? `<span class="al-amount-positive">${fmt(t.amount)}</span>`
                : `<span class="al-amount-empty">—</span>`;
            const refVal  = t.ref  || '—';
            const nameVal = t.customer_name  || '—';
            const emailVal = t.customer_email || '';
            const roomVal  = t.room_name || '—';
            const detailsVal = t.details || '—';
            return `<tr>
                <td class="al-date-cell">${dateStr}</td>
                <td><div class="al-customer-name">${nameVal}</div><div class="al-customer-email">${emailVal}</div></td>
                <td style="font-size:0.85rem">${roomVal}</td>
                <td><span class="al-type-pill ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i>${cfg.label}</span></td>
                <td class="al-details-cell">${detailsVal}</td>
                <td>${amountCell}</td>
                <td class="al-ref-cell" title="${refVal}">${refVal}</td>
            </tr>`;
        }).join('');

        if (pgInfo) pgInfo.textContent = `Page ${_page} of ${totalPages} (${_filtered.length} records)`;
        if (pgPrev) pgPrev.disabled = (_page <= 1);
        if (pgNext) pgNext.disabled = (_page >= totalPages);
    },

    // ── Private: export ───────────────────────────────────────────────────────

    _exportCSV() {
        if (!_filtered.length) {
            UI.toast('No data to export', 'warning');
            return;
        }
        const cols = ['Date & Time', 'Customer', 'Email', 'Room', 'Type', 'Details', 'Amount (GBP)', 'Ref / Subject'];
        const esc = v => {
            const s = String(v == null ? '' : v).replace(/"/g, '""');
            return /[",\n\r]/.test(s) ? `"${s}"` : s;
        };
        const rows = _filtered.map(t => {
            let dateStr = '';
            if (t.ts) { try { dateStr = new Date(t.ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { dateStr = t.ts; } }
            return [
                dateStr,
                t.customer_name  || '',
                t.customer_email || '',
                t.room_name      || '',
                t.type           || '',
                t.details        || '',
                parseFloat(t.amount || 0).toFixed(2),
                t.ref            || '',
            ].map(esc).join(',');
        });
        const csv  = [cols.map(esc).join(','), ...rows].join('\r\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'venuepro-audit-log-' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
        UI.toast('CSV exported', 'success');
    },
};
