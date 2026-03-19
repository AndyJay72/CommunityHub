import { Auth, API_BASE } from '../auth.js';
import { UI } from '../ui.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function on(el, evt, fn) {
    if (!el) return;
    el.addEventListener(evt, fn);
    _listeners.push({ el, evt, fn });
}

// ── Module state ──────────────────────────────────────────────────────────────
let _listeners = [];
let _isAvailable = false;
let _isSubmitting = false;
let _blockedRules = [];
let _roomsData = [];
let _availTimeout = null;
let _tenantId = null;

// ── API endpoints ─────────────────────────────────────────────────────────────
const CHECK_API  = `${API_BASE}/check-availability`;
const SUBMIT_API = `${API_BASE}/d057a40e-fb3e-402a-8ed7-fe16bce70feb`;

function _tidParam() {
    return _tenantId ? `?tenant_id=${encodeURIComponent(_tenantId)}` : '';
}

// ── Blocked-date helper ───────────────────────────────────────────────────────
function _isDateBlocked(dateStr) {
    const d = new Date(dateStr + 'T00:00:00'), dow = d.getDay();
    for (const b of _blockedRules) {
        if (b.block_type === 'recurring' && parseInt(b.day_of_week) === dow) return b.label || 'Closed';
        if (b.block_type === 'oneoff' && b.block_date && b.block_date.split('T')[0] === dateStr) return b.label || 'Closed';
        if (b.block_type === 'range' && b.date_from && b.date_to)
            if (dateStr >= b.date_from.split('T')[0] && dateStr <= b.date_to.split('T')[0]) return b.label || 'Closed';
    }
    return null;
}

// ── Export ────────────────────────────────────────────────────────────────────
export default {
    title: 'Event Enquiry',

    css: `
/* ── Enquiry Form page ───────────────────────────────────────────────── */
#enq-page { animation: enq-fadeUp 0.3s ease both; }
@keyframes enq-fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

.enq-page-wrap { width:100%; max-width:860px; margin:0 auto; padding:2rem 1rem; }
.enq-page-header { margin-bottom:1.75rem; }
.enq-page-header h1 { font-size:1.8rem; font-weight:700; margin-bottom:4px; color:var(--text-main); }
.enq-page-header p { color:var(--text-muted); font-size:0.88rem; }

.enq-venue-badge {
    display:inline-flex; align-items:center; gap:8px;
    padding:5px 14px;
    background:rgba(99,102,241,0.13);
    border:1px solid rgba(99,102,241,0.3);
    border-radius:20px;
    font-size:0.8rem; font-weight:700;
    color:#a5b4fc;
    letter-spacing:0.03em;
    margin-bottom:0.75rem;
}
.enq-venue-badge i { font-size:0.75rem; }

.enq-error-banner {
    background:rgba(239,68,68,0.12);
    border:1px solid rgba(239,68,68,0.3);
    border-radius:12px;
    padding:1.5rem 2rem;
    text-align:center;
    margin-top:2rem;
}
.enq-error-banner i { font-size:2rem; color:#ef4444; display:block; margin-bottom:0.75rem; }
.enq-error-banner h2 { font-size:1.2rem; color:var(--text-main); margin-bottom:0.5rem; }
.enq-error-banner p { color:#94a3b8; font-size:0.9rem; }

.enq-form-card {
    background:rgba(30,41,59,0.7);
    border:1px solid rgba(148,163,184,0.1);
    border-radius:16px;
    padding:2rem;
    box-shadow:0 10px 40px rgba(0,0,0,0.4);
}

.enq-section-title {
    font-size:1.05rem; font-weight:700; color:var(--text-main);
    margin-bottom:1.5rem; padding-bottom:0.75rem;
    border-bottom:1px solid rgba(148,163,184,0.1);
    display:flex; align-items:center; gap:10px;
}
.enq-section-title i { color:var(--primary); }

.enq-form-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1.25rem; margin-bottom:2rem; }
.enq-full-width { grid-column:span 2; }

.enq-input-group label {
    display:block; color:var(--text-muted); font-size:0.82rem;
    margin-bottom:0.45rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;
}

.enq-input-wrapper { position:relative; width:100%; }
.enq-input-wrapper i.enq-icon-left {
    position:absolute; left:15px; top:50%; transform:translateY(-50%);
    color:var(--primary); pointer-events:none; z-index:2;
}
.enq-input-wrapper i.enq-icon-right {
    position:absolute; right:15px; top:50%; transform:translateY(-50%);
    color:var(--text-muted); pointer-events:none; font-size:0.8rem; z-index:2;
}
.enq-input-wrapper i.enq-icon-left-top {
    position:absolute; left:15px; top:15px;
    color:var(--primary); pointer-events:none; z-index:2;
}

.enq-input-wrapper input,
.enq-input-wrapper select {
    width:100%; height:50px;
    padding:0 15px 0 45px;
    background:rgba(0,0,0,0.3);
    border:1px solid rgba(148,163,184,0.1);
    border-radius:10px;
    color:var(--text-main); outline:none; font-size:1rem;
    transition:all 0.3s;
    appearance:none; -webkit-appearance:none; -moz-appearance:none;
}
.enq-input-wrapper select { padding-right:40px; cursor:pointer; }
.enq-input-wrapper select option { background:#1e293b; color:white; }
.enq-input-wrapper input:focus,
.enq-input-wrapper select:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(99,102,241,0.2); background:rgba(0,0,0,0.5); }
.enq-input-wrapper input::placeholder { color:var(--text-muted); }

.enq-input-wrapper input[type="date"] {
    appearance:auto; -webkit-appearance:auto;
    color-scheme:dark;
}
.enq-input-wrapper input[type="date"]::-webkit-calendar-picker-indicator {
    filter:brightness(0) invert(1);
    cursor:pointer;
}

.enq-input-wrapper textarea {
    width:100%; padding:13px 15px 13px 45px;
    background:rgba(0,0,0,0.3); border:1px solid rgba(148,163,184,0.1);
    border-radius:10px; color:var(--text-main); outline:none; font-size:1rem;
    transition:all 0.3s; resize:vertical; font-family:inherit; min-height:90px;
}
.enq-input-wrapper textarea:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(99,102,241,0.2); background:rgba(0,0,0,0.5); }
.enq-input-wrapper textarea::placeholder { color:var(--text-muted); }

.enq-avail-status {
    padding:10px 14px; border-radius:10px; font-size:0.88rem;
    font-weight:600; display:flex; align-items:center; gap:10px;
    border:1px solid; margin-bottom:1.5rem;
}
.enq-avail-status.enq-idle        { background:rgba(0,0,0,0.2);        border-color:rgba(148,163,184,0.1); color:var(--text-muted); }
.enq-avail-status.enq-checking    { background:rgba(99,102,241,0.1);   border-color:rgba(99,102,241,0.3);  color:var(--primary); }
.enq-avail-status.enq-available   { background:rgba(16,185,129,0.12);  border-color:rgba(16,185,129,0.35); color:#34d399; }
.enq-avail-status.enq-unavailable { background:rgba(239,68,68,0.12);   border-color:rgba(239,68,68,0.35);  color:#f87171; }

.enq-submit-btn {
    width:100%; padding:16px;
    background:linear-gradient(135deg,var(--primary),#06b6d4);
    border:none; border-radius:10px;
    color:white; font-size:1rem; font-weight:700;
    cursor:pointer; transition:all 0.3s;
    display:flex; align-items:center; justify-content:center; gap:10px;
    box-shadow:0 10px 20px -5px rgba(99,102,241,0.4);
    min-height:44px;
}
.enq-submit-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 15px 30px -5px rgba(99,102,241,0.5); }
.enq-submit-btn:disabled { opacity:0.45; cursor:not-allowed; transform:none; }

.enq-multi-day-btn {
    width:100%; padding:0.6rem 1rem; border-radius:8px;
    font-size:0.85rem; font-weight:600; font-family:inherit;
    cursor:pointer; transition:all 0.2s;
    border:1.5px solid var(--primary); background:transparent;
    color:var(--primary); display:flex; align-items:center;
    justify-content:center; gap:0.45rem; min-height:44px;
}
.enq-multi-day-btn.active { background:var(--primary); color:#fff; }

@media (max-width:900px) {
    .enq-form-grid { grid-template-columns:1fr; }
    .enq-full-width { grid-column:span 1; }
}

/* ── Light mode overrides ─────────────────────────────────────────────── */
body.light-mode .enq-form-card {
    background:rgba(255,255,255,0.85);
    border-color:rgba(0,0,0,0.08);
    box-shadow:0 10px 40px rgba(0,0,0,0.1);
}
body.light-mode .enq-section-title { border-bottom-color:rgba(0,0,0,0.08); color:var(--text-main); }
body.light-mode .enq-input-wrapper input,
body.light-mode .enq-input-wrapper select,
body.light-mode .enq-input-wrapper textarea {
    background:rgba(0,0,0,0.04);
    border-color:rgba(0,0,0,0.12);
    color:var(--text-main);
}
body.light-mode .enq-input-wrapper input:focus,
body.light-mode .enq-input-wrapper select:focus,
body.light-mode .enq-input-wrapper textarea:focus {
    background:rgba(0,0,0,0.06);
}
body.light-mode .enq-input-wrapper input[type="date"] { color-scheme:light; }
body.light-mode .enq-input-wrapper input[type="date"]::-webkit-calendar-picker-indicator { filter:none; }
body.light-mode .enq-avail-status.enq-idle { background:rgba(0,0,0,0.04); border-color:rgba(0,0,0,0.08); }
body.light-mode .enq-error-banner { background:rgba(239,68,68,0.07); }
body.light-mode .enq-venue-badge { background:rgba(99,102,241,0.08); }
`,

    render() {
        return `
<div id="enq-page">
  <div class="enq-page-wrap">
    <div class="enq-page-header">
      <div class="enq-venue-badge" id="enq-venue-badge" style="display:none">
        <i class="fa-solid fa-building"></i>
        <span id="enq-venue-name"></span>
      </div>
      <h1 id="enq-page-title">Event Enquiry</h1>
      <p>Check availability instantly and secure your date.</p>
    </div>

    <div id="enq-error-banner" class="enq-error-banner" style="display:none">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <h2>Invalid Venue Link</h2>
      <p>This enquiry form link is missing or contains an invalid venue identifier. Please use the link provided by your venue — it should look like <code style="background:rgba(0,0,0,0.12);padding:2px 6px;border-radius:4px;font-size:.85em;">?t=1001</code>.</p>
    </div>

    <form id="enq-form" class="enq-form-card" novalidate>

      <!-- CONTACT DETAILS -->
      <div class="enq-section-title"><i class="fa-solid fa-user"></i> Contact Details</div>
      <div class="enq-form-grid">
        <div class="enq-input-group enq-full-width">
          <label>Full Name <span style="color:#ef4444">*</span></label>
          <div class="enq-input-wrapper">
            <i class="fa-solid fa-user enq-icon-left"></i>
            <input type="text" id="enq-name" placeholder="e.g. Jane Smith" required>
          </div>
        </div>
        <div class="enq-input-group">
          <label>Email <span style="color:#ef4444">*</span></label>
          <div class="enq-input-wrapper">
            <i class="fa-solid fa-envelope enq-icon-left"></i>
            <input type="email" id="enq-email" placeholder="jane@example.com" required>
          </div>
        </div>
        <div class="enq-input-group">
          <label>Phone <span style="color:#ef4444">*</span></label>
          <div class="enq-input-wrapper">
            <i class="fa-solid fa-phone enq-icon-left"></i>
            <input type="tel" id="enq-phone" placeholder="e.g. 07700 900000" required>
          </div>
        </div>
      </div>

      <!-- EVENT DETAILS -->
      <div class="enq-section-title"><i class="fa-solid fa-calendar-check"></i> Event Details</div>
      <div class="enq-form-grid">
        <div class="enq-input-group">
          <label>Preferred Room <span style="color:#ef4444">*</span></label>
          <div class="enq-input-wrapper">
            <i class="fa-solid fa-door-open enq-icon-left"></i>
            <select id="enq-room" required>
              <option value="" disabled selected>Loading rooms...</option>
            </select>
            <i class="fa-solid fa-chevron-down enq-icon-right"></i>
          </div>
        </div>
        <div class="enq-input-group">
          <label>Event Type <span style="color:#ef4444">*</span></label>
          <div class="enq-input-wrapper">
            <i class="fa-solid fa-masks-theater enq-icon-left"></i>
            <select id="enq-event-type" required>
              <option value="" disabled selected>Loading types...</option>
            </select>
            <i class="fa-solid fa-chevron-down enq-icon-right"></i>
          </div>
        </div>
        <div class="enq-input-group" id="enq-single-date-group">
          <label>Event Date <span style="color:#ef4444">*</span></label>
          <div class="enq-input-wrapper">
            <i class="fa-solid fa-calendar enq-icon-left"></i>
            <input type="date" id="enq-event-date" required>
          </div>
        </div>
        <div class="enq-input-group" style="align-self:flex-end;">
          <button type="button" id="enq-multi-day-toggle" class="enq-multi-day-btn">
            <i class="fa-solid fa-calendar-week"></i> Requires multiple days
          </button>
        </div>
        <div id="enq-multi-day-fields" style="display:none;grid-column:span 2;">
          <div class="enq-form-grid" style="margin:0;">
            <div class="enq-input-group">
              <label>Date From <span style="color:#ef4444">*</span></label>
              <div class="enq-input-wrapper">
                <i class="fa-solid fa-calendar enq-icon-left"></i>
                <input type="date" id="enq-date-from">
              </div>
            </div>
            <div class="enq-input-group">
              <label>Date To <span style="color:#ef4444">*</span></label>
              <div class="enq-input-wrapper">
                <i class="fa-solid fa-calendar enq-icon-left"></i>
                <input type="date" id="enq-date-to">
              </div>
            </div>
          </div>
        </div>
        <div class="enq-input-group">
          <label>Start Time <span style="color:#ef4444">*</span></label>
          <div class="enq-input-wrapper">
            <i class="fa-solid fa-clock enq-icon-left"></i>
            <select id="enq-time-from" required>
              <option value="" disabled selected>--:--</option>
            </select>
            <i class="fa-solid fa-chevron-down enq-icon-right"></i>
          </div>
        </div>
        <div class="enq-input-group">
          <label>End Time <span style="color:#ef4444">*</span></label>
          <div class="enq-input-wrapper">
            <i class="fa-solid fa-clock enq-icon-left"></i>
            <select id="enq-time-to" required>
              <option value="" disabled selected>--:--</option>
            </select>
            <i class="fa-solid fa-chevron-down enq-icon-right"></i>
          </div>
        </div>
        <div class="enq-input-group">
          <label>Number of Guests <span style="color:#ef4444">*</span></label>
          <div class="enq-input-wrapper">
            <i class="fa-solid fa-users enq-icon-left"></i>
            <input type="number" id="enq-num-people" placeholder="e.g. 50" min="1" required>
          </div>
        </div>
        <div class="enq-input-group enq-full-width">
          <label>Notes <span style="color:var(--text-muted);font-weight:400;text-transform:none;letter-spacing:0;">(Optional)</span></label>
          <div class="enq-input-wrapper">
            <i class="fa-solid fa-note-sticky enq-icon-left-top"></i>
            <textarea id="enq-notes" placeholder="Any special requirements, accessibility needs or additional information..." rows="3"></textarea>
          </div>
        </div>
      </div>

      <!-- AVAILABILITY STATUS -->
      <div id="enq-avail-status" class="enq-avail-status enq-idle">
        <i class="fa-solid fa-circle-info"></i>
        <span id="enq-avail-text">Select a room, dates and times to check availability</span>
      </div>

      <button type="submit" class="enq-submit-btn" id="enq-submit-btn" disabled>
        <i class="fa-solid fa-arrow-right"></i> <span id="enq-submit-label">Check Availability First</span>
      </button>
    </form>
  </div>
</div>`;
    },

    async init() {
        // Resolve tenant ID from URL param ?t= or ?tenant=
        const params = new URLSearchParams(window.location.search);
        const raw = parseInt(params.get('t') || params.get('tenant') || '0', 10);
        _tenantId = (raw >= 1000) ? raw : null;

        const errorBanner = document.getElementById('enq-error-banner');
        const form        = document.getElementById('enq-form');

        if (!_tenantId) {
            if (errorBanner) errorBanner.style.display = 'block';
            if (form)        form.style.display = 'none';
            return;
        }

        // Populate time selects
        const todayStr = new Date().toISOString().split('T')[0];
        const eventDateEl = document.getElementById('enq-event-date');
        const dateFromEl  = document.getElementById('enq-date-from');
        const dateToEl    = document.getElementById('enq-date-to');
        if (eventDateEl) eventDateEl.min = todayStr;
        if (dateFromEl)  dateFromEl.min  = todayStr;
        if (dateToEl)    dateToEl.min    = todayStr;

        ['enq-time-from', 'enq-time-to'].forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            for (let i = 8; i <= 23; i++) {
                const hh = i.toString().padStart(2, '0');
                sel.add(new Option(hh + ':00', hh + ':00'));
                if (i < 23) sel.add(new Option(hh + ':30', hh + ':30'));
            }
        });

        // Load venue name (non-critical)
        _loadVenueName();

        // Load rooms, event types, blocked dates
        await _loadDropdowns();

        // Attach listeners
        const roomSel     = document.getElementById('enq-room');
        const eventDateI  = document.getElementById('enq-event-date');
        const dateFromI   = document.getElementById('enq-date-from');
        const dateToI     = document.getElementById('enq-date-to');
        const timeFromSel = document.getElementById('enq-time-from');
        const timeToSel   = document.getElementById('enq-time-to');
        const toggleBtn   = document.getElementById('enq-multi-day-toggle');
        const submitBtn   = document.getElementById('enq-submit-btn');

        on(roomSel,     'change', _checkAvailability);
        on(eventDateI,  'change', _checkAvailability);
        on(dateFromI,   'change', _checkAvailability);
        on(dateToI,     'change', _checkAvailability);
        on(timeFromSel, 'change', _checkAvailability);
        on(timeToSel,   'change', _checkAvailability);
        on(toggleBtn,   'click',  _toggleMultiDay);
        on(form,        'submit', _handleSubmit);
    },

    destroy() {
        clearTimeout(_availTimeout);
        _listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
        _listeners    = [];
        _isAvailable  = false;
        _isSubmitting = false;
        _blockedRules = [];
        _roomsData    = [];
        _availTimeout = null;
        _tenantId     = null;
    }
};

// ── Private functions ─────────────────────────────────────────────────────────

async function _loadVenueName() {
    try {
        const r = await fetch(`${API_BASE}/get-tenants`);
        const d = await r.json();
        const venues = d.data || (Array.isArray(d) ? d : []);
        const venue  = venues.find(v => (v.tenant_id || v.id) === _tenantId);
        if (venue) {
            const name = venue.venue_name || venue.name || 'Your Venue';
            const nameEl  = document.getElementById('enq-venue-name');
            const badgeEl = document.getElementById('enq-venue-badge');
            const titleEl = document.getElementById('enq-page-title');
            if (nameEl)  nameEl.textContent  = name;
            if (badgeEl) badgeEl.style.display = 'inline-flex';
            if (titleEl) titleEl.textContent  = 'Event Enquiry — ' + name;
            document.title = 'Event Enquiry | ' + name;
        }
    } catch (e) { /* non-critical */ }
}

async function _loadDropdowns() {
    try {
        const tp = _tidParam();
        const [rooms, types, bRes] = await Promise.all([
            fetch(`${API_BASE}/get-rooms${tp}`).then(r => r.ok ? r.json().then(j => j.data || (Array.isArray(j) ? j : [])) : []).catch(() => []),
            fetch(`${API_BASE}/get-event-types${tp}`).then(r => r.ok ? r.json().then(j => j.data || (Array.isArray(j) ? j : [])) : []).catch(() => []),
            fetch(`${API_BASE}/blocked-dates${tp}`).catch(() => null)
        ]);

        if (bRes) {
            try { _blockedRules = (await bRes.json()).data || []; } catch (e) {}
        }

        const activeRooms = (rooms || []).filter(r => r.is_active || r.is_active === undefined);
        _roomsData = activeRooms;
        const activeTypes = (types || []).filter(t => t.is_active || t.is_active === undefined);

        const roomSel = document.getElementById('enq-room');
        if (roomSel) {
            roomSel.innerHTML = '<option value="" disabled selected>Select Room</option>';
            activeRooms.forEach(r => roomSel.add(new Option(r.name + (r.capacity ? ` (Cap: ${r.capacity})` : ''), r.name)));
        }

        const typeSel = document.getElementById('enq-event-type');
        if (typeSel) {
            typeSel.innerHTML = '<option value="" disabled selected>Select Type</option>';
            activeTypes.forEach(t => typeSel.add(new Option(t.name, t.name)));
        }
    } catch (e) {
        console.warn('Could not load rooms/event types:', e);
    }
}

function _setAvailStatus(type, text) {
    const el      = document.getElementById('enq-avail-status');
    const textEl  = document.getElementById('enq-avail-text');
    const iconEl  = el ? el.querySelector('i') : null;
    const icons   = {
        idle:        'fa-circle-info',
        checking:    'fa-circle-notch fa-spin',
        available:   'fa-circle-check',
        unavailable: 'fa-circle-xmark'
    };
    if (el) el.className = 'enq-avail-status enq-' + type;
    if (iconEl) iconEl.className = 'fa-solid ' + (icons[type] || 'fa-circle-info');
    if (textEl) textEl.textContent = text;
}

function _toggleMultiDay() {
    const btn     = document.getElementById('enq-multi-day-toggle');
    const isMulti = btn.dataset.active !== 'true';
    btn.dataset.active = String(isMulti);
    btn.classList.toggle('active', isMulti);

    const singleGroup  = document.getElementById('enq-single-date-group');
    const multiFields  = document.getElementById('enq-multi-day-fields');
    const eventDateEl  = document.getElementById('enq-event-date');
    const dateFromEl   = document.getElementById('enq-date-from');
    const dateToEl     = document.getElementById('enq-date-to');

    if (singleGroup) singleGroup.style.display = isMulti ? 'none' : '';
    if (multiFields) multiFields.style.display  = isMulti ? ''     : 'none';

    if (eventDateEl) eventDateEl.required = !isMulti;
    if (dateFromEl)  dateFromEl.required  =  isMulti;
    if (dateToEl)    dateToEl.required    =  isMulti;

    if (!isMulti) {
        if (dateFromEl) dateFromEl.value = '';
        if (dateToEl)   dateToEl.value   = '';
    }

    _checkAvailability();
}

function _checkAvailability() {
    if (_isSubmitting) return;

    const room     = (document.getElementById('enq-room') || {}).value || '';
    const toggle   = document.getElementById('enq-multi-day-toggle');
    const isMulti  = toggle && toggle.dataset.active === 'true';
    const dateFrom = isMulti
        ? (document.getElementById('enq-date-from')  || {}).value || ''
        : (document.getElementById('enq-event-date') || {}).value || '';
    const dateTo   = isMulti
        ? (document.getElementById('enq-date-to')    || {}).value || ''
        : dateFrom;
    const start    = (document.getElementById('enq-time-from') || {}).value || '';
    const end      = (document.getElementById('enq-time-to')   || {}).value || '';
    const btn      = document.getElementById('enq-submit-btn');
    const labelEl  = document.getElementById('enq-submit-label');

    if (btn)    btn.disabled = true;
    if (labelEl) labelEl.textContent = 'Check Availability First';
    if (btn) { const ico = btn.querySelector('i'); if (ico) ico.className = 'fa-solid fa-arrow-right'; }
    _isAvailable = false;

    if (!room || !dateFrom || !start || !end) {
        _setAvailStatus('idle', 'Select a room, dates and times to check availability');
        return;
    }
    if (!dateTo || dateTo < dateFrom) {
        _setAvailStatus('unavailable', 'Please select a valid end date (on or after start date).');
        return;
    }

    const msPerDay = 86400000;
    const numDays  = Math.round((new Date(dateTo) - new Date(dateFrom)) / msPerDay) + 1;
    for (let i = 0; i < numDays; i++) {
        const ds = new Date(new Date(dateFrom).getTime() + i * msPerDay).toISOString().split('T')[0];
        const bl = _isDateBlocked(ds);
        if (bl) {
            _setAvailStatus('unavailable', `Sorry, the venue is closed on ${ds} (${bl}).`);
            return;
        }
    }

    if (start >= end) {
        _setAvailStatus('unavailable', 'End time must be after start time.');
        return;
    }

    clearTimeout(_availTimeout);
    _availTimeout = setTimeout(async () => {
        _setAvailStatus('checking', `Checking availability for ${numDays > 1 ? numDays + '-day booking' : dateFrom}...`);
        try {
            const res  = await fetch(CHECK_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomName: room, eventDate: dateFrom, timeFrom: start, timeTo: end, tenant_id: _tenantId })
            });
            const data = await res.json();
            if (data.available) {
                _setAvailStatus('available', numDays > 1
                    ? `Available for your ${numDays}-day booking! You can submit.`
                    : 'Date is available — you can submit your enquiry.');
                const b = document.getElementById('enq-submit-btn');
                if (b) {
                    b.disabled = false;
                    const ico = b.querySelector('i');
                    if (ico) ico.className = 'fa-solid fa-paper-plane';
                    const lbl = document.getElementById('enq-submit-label');
                    if (lbl) lbl.textContent = 'Submit Enquiry';
                }
                _isAvailable = true;
            } else {
                _setAvailStatus('unavailable', 'Sorry, this time slot is already booked.');
            }
        } catch (e) {
            _setAvailStatus('unavailable', 'Connection error. Please try again.');
        }
    }, 500);
}

async function _handleSubmit(e) {
    e.preventDefault();
    if (!_isAvailable) return;

    const form = document.getElementById('enq-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    // Capacity check
    const selectedRoomName = (document.getElementById('enq-room') || {}).value || '';
    const selectedRoom     = _roomsData.find(r => r.name === selectedRoomName);
    const guestCount       = parseInt((document.getElementById('enq-num-people') || {}).value || '0', 10);
    if (selectedRoom && selectedRoom.capacity && guestCount > parseInt(selectedRoom.capacity, 10)) {
        UI.toast(`The ${selectedRoom.name} has a maximum capacity of ${selectedRoom.capacity} guests. Please reduce your guest count or choose a different room.`, 'warning');
        const np = document.getElementById('enq-num-people');
        if (np) np.focus();
        return;
    }

    const btn    = document.getElementById('enq-submit-btn');
    const labelEl = document.getElementById('enq-submit-label');
    const ico    = btn ? btn.querySelector('i') : null;

    _isSubmitting = true;
    if (ico)    ico.className    = 'fa-solid fa-spinner fa-spin';
    if (labelEl) labelEl.textContent = 'Sending...';
    if (btn)    btn.disabled     = true;

    const g = id => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };

    const toggle   = document.getElementById('enq-multi-day-toggle');
    const isMulti  = toggle && toggle.dataset.active === 'true';
    const dateFrom = isMulti ? g('enq-date-from')  : g('enq-event-date');
    const dateTo   = isMulti ? g('enq-date-to')    : g('enq-event-date');

    const payload = {
        name:       g('enq-name'),
        email:      g('enq-email'),
        contact:    g('enq-phone'),
        roomName:   g('enq-room'),
        eventType:  g('enq-event-type'),
        dateFrom,
        dateTo,
        eventDate:  dateFrom,
        timeFrom:   g('enq-time-from'),
        timeTo:     g('enq-time-to'),
        numPeople:  g('enq-num-people'),
        guest_count: g('enq-num-people'),
        notes:      g('enq-notes') || '',
        tenant_id:  _tenantId,
        venue_id:   _tenantId
    };

    try {
        const res = await fetch(SUBMIT_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            UI.toast("Enquiry sent! We'll be in touch shortly.", 'success');
            if (form) form.reset();
            _setAvailStatus('idle', 'Select a room, dates and times to check availability');
            _isAvailable  = false;
            _isSubmitting = false;
            const multiFields = document.getElementById('enq-multi-day-fields');
            const singleGroup = document.getElementById('enq-single-date-group');
            const toggleBtn   = document.getElementById('enq-multi-day-toggle');
            if (multiFields) multiFields.style.display = 'none';
            if (singleGroup) singleGroup.style.display = '';
            if (toggleBtn)   { toggleBtn.dataset.active = 'false'; toggleBtn.classList.remove('active'); }
            if (ico)    ico.className    = 'fa-solid fa-arrow-right';
            if (labelEl) labelEl.textContent = 'Check Availability First';
            if (btn)    btn.disabled     = true;
        } else {
            throw new Error('Server error');
        }
    } catch (e) {
        _isSubmitting = false;
        _setAvailStatus('unavailable', 'Submission failed. Please check your details and try again.');
        if (ico)    ico.className    = 'fa-solid fa-paper-plane';
        if (labelEl) labelEl.textContent = 'Submit Enquiry';
        if (btn)    btn.disabled     = false;
        UI.toast('Submission failed. Please try again.', 'error');
    }
}
