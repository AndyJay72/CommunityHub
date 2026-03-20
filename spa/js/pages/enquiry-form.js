import { Auth, API_BASE } from '../auth.js';
import { UI } from '../ui.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── Module state ─────────────────────────────────────────────────────────────
let _listeners = [];
let _roomsData = [];
let _blockedRules = [];
let _isAvailable = false;
let _isSubmitting = false;
let _availTimeout = null;

const CHECK_API  = `${API_BASE}/check-availability`;
const SUBMIT_API = `${API_BASE}/d057a40e-fb3e-402a-8ed7-fe16bce70feb`;
const BLOCKED_API = `${API_BASE}/blocked-dates`;

function on(el, evt, fn) { if (!el) return; el.addEventListener(evt, fn); _listeners.push({ el, evt, fn }); }
function $(id) { return document.getElementById(id); }

function isDateBlocked(dateStr) {
    const d = new Date(dateStr + 'T00:00:00'), dow = d.getDay();
    for (const b of _blockedRules) {
        if (b.block_type === 'recurring' && parseInt(b.day_of_week) === dow) return b.label || 'Closed';
        if (b.block_type === 'oneoff' && b.block_date && b.block_date.split('T')[0] === dateStr) return b.label || 'Closed';
        if (b.block_type === 'range' && b.date_from && b.date_to)
            if (dateStr >= b.date_from.split('T')[0] && dateStr <= b.date_to.split('T')[0]) return b.label || 'Closed';
    }
    return null;
}

function setAvailStatus(type, text) {
    const el = $('enq-avail-status');
    if (!el) return;
    const icons = { idle:'fa-circle-info', checking:'fa-circle-notch fa-spin', available:'fa-circle-check', unavailable:'fa-circle-xmark' };
    el.className = 'enq-avail-status ' + type;
    el.querySelector('i').className = 'fa-solid ' + (icons[type] || 'fa-circle-info');
    $('enq-avail-text').textContent = text;
}

function checkAvailability() {
    if (_isSubmitting) return;
    const room     = $('enq-roomName')?.value;
    const isMulti  = $('enq-multiDayToggle')?.dataset.active === 'true';
    const dateFrom = isMulti ? $('enq-dateFrom')?.value : $('enq-eventDate')?.value;
    const dateTo   = isMulti ? $('enq-dateTo')?.value   : $('enq-eventDate')?.value;
    const start    = $('enq-timeFrom')?.value;
    const end      = $('enq-timeTo')?.value;
    const btn      = $('enq-submitBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> <span>Check Availability First</span>'; }
    _isAvailable = false;
    if (!room || !dateFrom || !start || !end) { setAvailStatus('idle', 'Select a room, dates and times to check availability'); return; }
    if (!dateTo || dateTo < dateFrom) { setAvailStatus('unavailable', 'Please select a valid end date.'); return; }
    const msPerDay = 86400000;
    const numDays  = Math.round((new Date(dateTo) - new Date(dateFrom)) / msPerDay) + 1;
    for (let i = 0; i < numDays; i++) {
        const ds = new Date(new Date(dateFrom).getTime() + i * msPerDay).toISOString().split('T')[0];
        const bl = isDateBlocked(ds);
        if (bl) { setAvailStatus('unavailable', 'Sorry, the venue is closed on ' + ds + ' (' + bl + ').'); return; }
    }
    if (start >= end) { setAvailStatus('unavailable', 'End time must be after start time.'); return; }
    clearTimeout(_availTimeout);
    _availTimeout = setTimeout(async () => {
        setAvailStatus('checking', 'Checking availability' + (numDays > 1 ? ` for ${numDays}-day booking` : '') + '...');
        try {
            const tid = Auth.getTenantId();
            const res = await fetch(CHECK_API, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomName: room, eventDate: dateFrom, timeFrom: start, timeTo: end, tenant_id: tid })
            });
            const data = await res.json();
            if (data.available) {
                setAvailStatus('available', numDays > 1 ? `Available for your ${numDays}-day booking! You can submit.` : 'Date is available - you can submit your enquiry.');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>Submit Enquiry</span>'; }
                _isAvailable = true;
            } else { setAvailStatus('unavailable', 'Sorry, this time slot is already booked.'); }
        } catch (e) { setAvailStatus('unavailable', 'Connection error. Please try again.'); }
    }, 500);
}

function toggleMultiDay() {
    const btn = $('enq-multiDayToggle');
    const isMulti = btn.dataset.active !== 'true';
    btn.dataset.active = isMulti;
    btn.classList.toggle('active', isMulti);
    $('enq-singleDateGroup').style.display = isMulti ? 'none' : '';
    $('enq-multiDayFields').style.display  = isMulti ? '' : 'none';
    $('enq-eventDate').required = !isMulti;
    $('enq-dateFrom').required  =  isMulti;
    $('enq-dateTo').required    =  isMulti;
    if (!isMulti) { $('enq-dateFrom').value = ''; $('enq-dateTo').value = ''; }
    checkAvailability();
}

async function submitEnquiry() {
    if (!_isAvailable) return;
    const form = $('enq-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const selectedRoomName = $('enq-roomName').value;
    const selectedRoom = _roomsData.find(r => r.name === selectedRoomName);
    const guestCount = parseInt($('enq-numPeople').value, 10);
    if (selectedRoom && selectedRoom.capacity && guestCount > parseInt(selectedRoom.capacity, 10)) {
        UI.toast(`The ${selectedRoom.name} has a maximum capacity of ${selectedRoom.capacity} guests.`, 'error');
        $('enq-numPeople').focus();
        return;
    }
    const btn = $('enq-submitBtn');
    _isSubmitting = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Sending...</span>';
    btn.disabled = true;
    const g = id => $(id).value;
    const isMulti = $('enq-multiDayToggle').dataset.active === 'true';
    const tid = Auth.getTenantId();
    const payload = {
        name: g('enq-name'), email: g('enq-email'), contact: g('enq-phone'),
        roomName: g('enq-roomName'), eventType: g('enq-eventType'),
        dateFrom: isMulti ? g('enq-dateFrom') : g('enq-eventDate'),
        dateTo:   isMulti ? g('enq-dateTo')   : g('enq-eventDate'),
        eventDate: isMulti ? g('enq-dateFrom') : g('enq-eventDate'),
        timeFrom: g('enq-timeFrom'), timeTo: g('enq-timeTo'),
        numPeople: g('enq-numPeople'), guest_count: g('enq-numPeople'),
        notes: g('enq-notes') || '',
        tenant_id: tid, venue_id: tid
    };
    try {
        const res = await fetch(SUBMIT_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            UI.toast("Enquiry sent! We'll be in touch shortly.", 'success');
            form.reset();
            setAvailStatus('idle', 'Select a room, dates and times to check availability');
            _isAvailable = false;
            btn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> <span>Check Availability First</span>';
            btn.disabled = true; _isSubmitting = false;
        } else throw new Error('Server error');
    } catch (e) {
        _isSubmitting = false;
        setAvailStatus('unavailable', 'Submission failed. Please check your details and try again.');
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>Submit Enquiry</span>';
        btn.disabled = false;
    }
}

async function loadRoomsAndTypes() {
    try {
        const tid = Auth.getTenantId();
        const tenantParam = tid ? `?tenant_id=${tid}` : '';
        const [rooms, types, bRes] = await Promise.all([
            fetch(`${API_BASE}/get-rooms${tenantParam}`).then(r => r.ok ? r.json().then(j => j.data || (Array.isArray(j) ? j : [])) : []).catch(() => []),
            fetch(`${API_BASE}/get-event-types${tenantParam}`).then(r => r.ok ? r.json().then(j => j.data || (Array.isArray(j) ? j : [])) : []).catch(() => []),
            fetch(`${BLOCKED_API}${tenantParam}`).catch(() => null)
        ]);
        if (bRes) { try { _blockedRules = (await bRes.json()).data || []; } catch (e) {} }
        const activeRooms = (rooms || []).filter(r => r.is_active || r.is_active === undefined);
        _roomsData = activeRooms;
        const activeTypes = (types || []).filter(t => t.is_active || t.is_active === undefined);
        const roomSel = $('enq-roomName');
        if (roomSel) {
            roomSel.innerHTML = '<option value="" disabled selected>Select Room</option>';
            activeRooms.forEach(r => roomSel.add(new Option(r.name + (r.capacity ? ` (Cap: ${r.capacity})` : ''), r.name)));
        }
        const typeSel = $('enq-eventType');
        if (typeSel) {
            typeSel.innerHTML = '<option value="" disabled selected>Select Type</option>';
            activeTypes.forEach(t => typeSel.add(new Option(t.name, t.name)));
        }
    } catch (e) { console.warn('Could not load rooms/event types:', e); }
}

// ── Page module ──────────────────────────────────────────────────────────────
export default {
    title: 'Event Enquiry',

    css: `
.enq-wrap { max-width:860px; margin:0 auto; }
.enq-header { margin-bottom:1.75rem; }
.enq-header h1 { font-size:1.8rem; font-weight:700; margin-bottom:4px; background:linear-gradient(135deg,#eef2ff 0%,#a5b4fc 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
body.light-mode .enq-header h1 { background:linear-gradient(135deg,#0f172a 0%,#4338ca 100%); -webkit-background-clip:text; background-clip:text; }
.enq-header p { color:var(--text-muted); font-size:0.88rem; }
.enq-card { background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:2rem; box-shadow:0 10px 40px rgba(0,0,0,0.4); }
body.light-mode .enq-card { background:rgba(255,255,255,0.92); border-color:rgba(0,0,0,0.1); box-shadow:0 4px 16px rgba(0,0,0,0.08); }
.enq-section-title { font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:1.5rem; padding-bottom:0.75rem; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:10px; }
.enq-section-title i { color:var(--primary); }
.enq-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1.25rem; margin-bottom:2rem; }
.enq-full { grid-column:span 2; }
.enq-ig label { display:block; color:var(--text-muted); font-size:0.82rem; margin-bottom:0.45rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
.enq-iw { position:relative; width:100%; }
.enq-iw i.il { position:absolute; left:15px; top:50%; transform:translateY(-50%); color:var(--primary); pointer-events:none; z-index:2; }
.enq-iw i.ir { position:absolute; right:15px; top:50%; transform:translateY(-50%); color:var(--text-muted); pointer-events:none; font-size:0.8rem; z-index:2; }
.enq-iw i.ilt { position:absolute; left:15px; top:15px; color:var(--primary); pointer-events:none; z-index:2; }
.enq-card input, .enq-card select { width:100%; height:50px; padding:0 15px 0 45px; background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:10px; color:white; outline:none; font-size:1rem; transition:all 0.3s; appearance:none; }
body.light-mode .enq-card input, body.light-mode .enq-card select { background:rgba(0,0,0,0.05); color:#0f172a; }
.enq-card select { padding-right:40px; cursor:pointer; }
.enq-card select option { background:#1e293b; color:white; }
body.light-mode .enq-card select option { background:#fff; color:#0f172a; }
.enq-card input:focus, .enq-card select:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(99,102,241,0.2); }
.enq-card input::placeholder { color:var(--text-muted); }
.enq-card input[type="date"] { appearance:auto; -webkit-appearance:auto; color-scheme:dark; }
body.light-mode .enq-card input[type="date"] { color-scheme:light; }
.enq-card input[type="date"]::-webkit-calendar-picker-indicator { filter:brightness(0) invert(1); cursor:pointer; }
body.light-mode .enq-card input[type="date"]::-webkit-calendar-picker-indicator { filter:none; }
.enq-card textarea { width:100%; padding:13px 15px 13px 45px; background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:10px; color:white; outline:none; font-size:1rem; transition:all 0.3s; resize:vertical; font-family:inherit; min-height:90px; }
body.light-mode .enq-card textarea { background:rgba(0,0,0,0.05); color:#0f172a; }
.enq-card textarea:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(99,102,241,0.2); }
.enq-card textarea::placeholder { color:var(--text-muted); }
.enq-avail-status { padding:10px 14px; border-radius:10px; font-size:0.88rem; font-weight:600; display:flex; align-items:center; gap:10px; border:1px solid; margin-bottom:1.5rem; }
.enq-avail-status.checking    { background:rgba(99,102,241,0.1); border-color:rgba(99,102,241,0.3); color:var(--primary); }
.enq-avail-status.available   { background:rgba(16,185,129,0.12); border-color:rgba(16,185,129,0.35); color:#34d399; }
.enq-avail-status.unavailable { background:rgba(239,68,68,0.12); border-color:rgba(239,68,68,0.35); color:#f87171; }
.enq-avail-status.idle        { background:rgba(0,0,0,0.2); border-color:var(--border); color:var(--text-muted); }
body.light-mode .enq-avail-status.idle { background:rgba(0,0,0,0.04); }
.enq-submit { width:100%; padding:16px; background:linear-gradient(135deg,var(--primary),#06b6d4); border:none; border-radius:10px; color:white; font-size:1rem; font-weight:700; cursor:pointer; transition:all 0.3s; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 10px 20px -5px rgba(99,102,241,0.4); min-height:44px; }
.enq-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 15px 30px -5px rgba(99,102,241,0.5); }
.enq-submit:disabled { opacity:0.45; cursor:not-allowed; transform:none; }
.enq-multi-btn { width:100%; padding:0.6rem 1rem; border-radius:8px; font-size:0.85rem; font-weight:600; font-family:inherit; cursor:pointer; transition:all 0.2s; border:1.5px solid var(--primary); background:transparent; color:var(--primary); display:flex; align-items:center; justify-content:center; gap:0.45rem; }
.enq-multi-btn.active { background:var(--primary); color:#fff; }
@media (max-width:900px) { .enq-grid { grid-template-columns:1fr; } .enq-full { grid-column:span 1; } }
`,

    render() {
        const todayStr = new Date().toISOString().split('T')[0];
        return `
        <div class="enq-wrap">
            <div class="enq-header">
                <h1>Event Enquiry</h1>
                <p>Check availability instantly and secure your date.</p>
            </div>
            <form id="enq-form" class="enq-card" onsubmit="return false;">
                <div class="enq-section-title"><i class="fa-solid fa-user"></i> Contact Details</div>
                <div class="enq-grid">
                    <div class="enq-ig enq-full">
                        <label>Full Name <span style="color:var(--danger)">*</span></label>
                        <div class="enq-iw"><i class="fa-solid fa-user il"></i><input type="text" id="enq-name" placeholder="e.g. Jane Smith" required></div>
                    </div>
                    <div class="enq-ig">
                        <label>Email <span style="color:var(--danger)">*</span></label>
                        <div class="enq-iw"><i class="fa-solid fa-envelope il"></i><input type="email" id="enq-email" placeholder="jane@example.com" required></div>
                    </div>
                    <div class="enq-ig">
                        <label>Phone <span style="color:var(--danger)">*</span></label>
                        <div class="enq-iw"><i class="fa-solid fa-phone il"></i><input type="tel" id="enq-phone" placeholder="e.g. 07700 900000" required></div>
                    </div>
                </div>
                <div class="enq-section-title"><i class="fa-solid fa-calendar-check"></i> Event Details</div>
                <div class="enq-grid">
                    <div class="enq-ig">
                        <label>Preferred Room <span style="color:var(--danger)">*</span></label>
                        <div class="enq-iw"><i class="fa-solid fa-door-open il"></i><select id="enq-roomName" required><option value="" disabled selected>Loading rooms...</option></select><i class="fa-solid fa-chevron-down ir"></i></div>
                    </div>
                    <div class="enq-ig">
                        <label>Event Type <span style="color:var(--danger)">*</span></label>
                        <div class="enq-iw"><i class="fa-solid fa-masks-theater il"></i><select id="enq-eventType" required><option value="" disabled selected>Loading types...</option></select><i class="fa-solid fa-chevron-down ir"></i></div>
                    </div>
                    <div class="enq-ig" id="enq-singleDateGroup">
                        <label>Event Date <span style="color:var(--danger)">*</span></label>
                        <div class="enq-iw"><i class="fa-solid fa-calendar il"></i><input type="date" id="enq-eventDate" min="${todayStr}" required></div>
                    </div>
                    <div class="enq-ig" style="align-self:flex-end;">
                        <button type="button" id="enq-multiDayToggle" class="enq-multi-btn"><i class="fa-solid fa-calendar-week"></i> Requires multiple days</button>
                    </div>
                    <div id="enq-multiDayFields" style="display:none;grid-column:span 2;">
                        <div class="enq-grid" style="margin:0;">
                            <div class="enq-ig"><label>Date From <span style="color:var(--danger)">*</span></label><div class="enq-iw"><i class="fa-solid fa-calendar il"></i><input type="date" id="enq-dateFrom" min="${todayStr}"></div></div>
                            <div class="enq-ig"><label>Date To <span style="color:var(--danger)">*</span></label><div class="enq-iw"><i class="fa-solid fa-calendar il"></i><input type="date" id="enq-dateTo" min="${todayStr}"></div></div>
                        </div>
                    </div>
                    <div class="enq-ig">
                        <label>Start Time <span style="color:var(--danger)">*</span></label>
                        <div class="enq-iw"><i class="fa-solid fa-clock il"></i><select id="enq-timeFrom" required><option value="" disabled selected>--:--</option></select><i class="fa-solid fa-chevron-down ir"></i></div>
                    </div>
                    <div class="enq-ig">
                        <label>End Time <span style="color:var(--danger)">*</span></label>
                        <div class="enq-iw"><i class="fa-solid fa-clock il"></i><select id="enq-timeTo" required><option value="" disabled selected>--:--</option></select><i class="fa-solid fa-chevron-down ir"></i></div>
                    </div>
                    <div class="enq-ig">
                        <label>Number of Guests <span style="color:var(--danger)">*</span></label>
                        <div class="enq-iw"><i class="fa-solid fa-users il"></i><input type="number" id="enq-numPeople" placeholder="e.g. 50" min="1" required></div>
                    </div>
                    <div class="enq-ig enq-full">
                        <label>Notes <span style="color:var(--text-muted);font-weight:400;text-transform:none;letter-spacing:0;">(Optional)</span></label>
                        <div class="enq-iw"><i class="fa-solid fa-note-sticky ilt"></i><textarea id="enq-notes" placeholder="Any special requirements, accessibility needs or additional information..." rows="3"></textarea></div>
                    </div>
                </div>
                <div id="enq-avail-status" class="enq-avail-status idle">
                    <i class="fa-solid fa-circle-info"></i>
                    <span id="enq-avail-text">Select a room, dates and times to check availability</span>
                </div>
                <button type="submit" class="enq-submit" id="enq-submitBtn" disabled>
                    <i class="fa-solid fa-arrow-right"></i> <span>Check Availability First</span>
                </button>
            </form>
        </div>`;
    },

    async init() {
        // Populate time dropdowns
        ['enq-timeFrom', 'enq-timeTo'].forEach(id => {
            const sel = $(id);
            if (!sel) return;
            for (let i = 8; i <= 23; i++) {
                const hh = i.toString().padStart(2, '0');
                sel.add(new Option(hh + ':00', hh + ':00'));
                if (i < 23) sel.add(new Option(hh + ':30', hh + ':30'));
            }
        });

        // Wire events
        on($('enq-roomName'), 'change', checkAvailability);
        on($('enq-eventDate'), 'change', checkAvailability);
        on($('enq-dateFrom'), 'change', checkAvailability);
        on($('enq-dateTo'), 'change', checkAvailability);
        on($('enq-timeFrom'), 'change', checkAvailability);
        on($('enq-timeTo'), 'change', checkAvailability);
        on($('enq-multiDayToggle'), 'click', toggleMultiDay);
        on($('enq-submitBtn'), 'click', submitEnquiry);

        // Load data
        await loadRoomsAndTypes();
    },

    destroy() {
        _listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
        _listeners = [];
        clearTimeout(_availTimeout);
        _roomsData = [];
        _blockedRules = [];
        _isAvailable = false;
        _isSubmitting = false;
    }
};
