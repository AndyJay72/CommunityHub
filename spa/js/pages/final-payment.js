import { Auth, API_BASE } from '../auth.js';
import { UI } from '../ui.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(parseFloat(n) || 0);

// ── Module state ──────────────────────────────────────────────────────────────
let _listeners = [];
let _bookingsData = [];

// ── Listener helper ───────────────────────────────────────────────────────────
function on(el, evt, fn) {
    if (!el) return;
    el.addEventListener(evt, fn);
    _listeners.push({ el, evt, fn });
}

// ── Export ────────────────────────────────────────────────────────────────────
export default {
    title: 'Process Payment',

    css: `
/* ── Final Payment page ──────────────────────────────────────────────── */
#fp-page { animation: fp-fadeUp 0.3s ease both; }
@keyframes fp-fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

.fp-header { display:flex; align-items:center; margin-bottom:2rem; gap:1rem; }
.fp-header h1 { font-size:1.5rem; font-weight:700; }
.fp-header h1 i { color:var(--primary); margin-right:8px; }

.fp-form-card { background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:2rem; max-width:860px; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,0.3); }

.fp-section-title { font-size:1.05rem; font-weight:700; color:var(--text-main); margin:0 0 1.25rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem; display:flex; align-items:center; gap:10px; }
.fp-section-title i { color:var(--primary); }

.fp-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:2rem; }
.fp-full-width { grid-column:span 2; }

.fp-input-group label { display:block; color:var(--text-muted); font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.4rem; }
.fp-input-wrapper { position:relative; width:100%; }
.fp-input-wrapper i.fp-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--primary); pointer-events:none; font-size:0.9rem; }
.fp-input-wrapper input, .fp-input-wrapper select { width:100%; padding:12px 12px 12px 42px; background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:10px; color:var(--text-main); outline:none; font-size:0.95rem; appearance:none; transition:border-color 0.2s; min-height:44px; }
.fp-input-wrapper input:focus, .fp-input-wrapper select:focus { border-color:var(--primary); }
.fp-input-wrapper input[readonly] { opacity:0.65; cursor:default; }

.fp-summary-bar { display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem; margin-bottom:2rem; }
.fp-summary-item { background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:10px; padding:1rem; text-align:center; }
.fp-summary-item .fp-s-label { font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
.fp-summary-item .fp-s-value { font-size:1.3rem; font-weight:700; }

.fp-payment-box { background:rgba(0,0,0,0.2); padding:1.75rem; border-radius:12px; border:1px solid var(--border); }
.fp-amount-row { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; align-items:start; margin-bottom:1.25rem; }
.fp-range-wrap input[type=range] { -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:3px; background:var(--border); padding:0; border:none; cursor:pointer; margin-top:8px; }
.fp-range-wrap input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:var(--primary); cursor:pointer; }
.fp-range-hint { font-size:0.8rem; color:var(--text-muted); margin-top:4px; }

.fp-amount-input-num { font-size:1.5rem !important; font-weight:700; padding:14px 14px 14px 48px !important; }

.fp-pay-type-badge { display:inline-flex; align-items:center; gap:6px; font-size:0.8rem; font-weight:700; text-transform:uppercase; padding:4px 10px; border-radius:20px; margin-top:8px; }
.fp-pay-type-badge.fp-partial { background:rgba(245,158,11,0.15); color:var(--warning); }
.fp-pay-type-badge.fp-full { background:rgba(16,185,129,0.15); color:var(--success); }

.fp-btn-pay { width:100%; padding:15px; border:none; border-radius:10px; font-weight:700; cursor:pointer; font-size:1rem; background:var(--success); color:#0f172a; margin-top:1.25rem; transition:transform 0.2s, opacity 0.2s; display:flex; align-items:center; justify-content:center; gap:10px; min-height:44px; font-family:inherit; }
.fp-btn-pay:hover:not(:disabled) { transform:translateY(-2px); }
.fp-btn-pay:disabled { opacity:0.4; cursor:not-allowed; }
.fp-btn-pay.fp-partial-mode { background:var(--warning); }

.fp-pay-method-row { display:flex; align-items:center; gap:10px; margin-bottom:1.2rem; }
.fp-pay-method-label { font-size:0.82rem; color:var(--text-muted); white-space:nowrap; }
.fp-pay-method-select { background:rgba(0,0,0,0.4); border:1px solid var(--border); border-radius:8px; color:var(--text-main); padding:7px 12px; font-size:0.88rem; outline:none; cursor:pointer; flex:1; min-height:44px; font-family:inherit; }
.fp-pay-method-select option { background:#1e293b; }

.fp-set-full-btn { font-size:0.78rem; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); color:var(--success); border-radius:6px; padding:3px 10px; cursor:pointer; font-family:inherit; min-height:unset; }

/* Receipt overlay */
.fp-receipt-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:200; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
.fp-receipt-overlay.active { display:flex; }
.fp-receipt-card { background:#1e293b; border:1px solid var(--border); border-radius:16px; padding:2rem; max-width:480px; width:90%; text-align:center; }
.fp-receipt-icon { width:64px; height:64px; border-radius:50%; background:rgba(16,185,129,0.15); border:2px solid var(--success); display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--success); margin:0 auto 1rem; }
.fp-receipt-ref { font-family:monospace; font-size:1.1rem; color:var(--primary); background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.2); border-radius:8px; padding:8px 16px; display:inline-block; margin:8px 0; }
.fp-receipt-detail { font-size:0.9rem; color:var(--text-muted); margin:5px 0; }
.fp-receipt-detail span { color:var(--text-main); font-weight:600; }
.fp-receipt-actions { display:flex; gap:10px; margin-top:1.25rem; }
.fp-receipt-btn-txn { flex:1; padding:10px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); color:var(--primary); border-radius:8px; cursor:pointer; font-weight:600; font-family:inherit; min-height:44px; }
.fp-receipt-btn-new { flex:1; padding:10px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:var(--success); border-radius:8px; cursor:pointer; font-weight:600; font-family:inherit; min-height:44px; }

/* Light mode overrides */
body.light-mode #fp-page { color:#1e293b; }
body.light-mode .fp-form-card { background:rgba(255,255,255,0.9); border-color:rgba(0,0,0,0.1); }
body.light-mode .fp-section-title { color:#1e293b; border-bottom-color:rgba(0,0,0,0.1); }
body.light-mode .fp-summary-item { background:rgba(0,0,0,0.04); border-color:rgba(0,0,0,0.1); }
body.light-mode .fp-summary-item .fp-s-label { color:#64748b; }
body.light-mode .fp-payment-box { background:rgba(0,0,0,0.04); border-color:rgba(0,0,0,0.1); }
body.light-mode .fp-input-wrapper input,
body.light-mode .fp-input-wrapper select { background:rgba(255,255,255,0.8); color:#1e293b; border-color:rgba(0,0,0,0.15); }
body.light-mode .fp-pay-method-select { background:rgba(255,255,255,0.8); color:#1e293b; border-color:rgba(0,0,0,0.15); }
body.light-mode .fp-pay-method-select option { background:#f8fafc; color:#1e293b; }
body.light-mode .fp-receipt-card { background:#f8fafc; color:#1e293b; }
body.light-mode .fp-range-hint { color:#64748b; }
body.light-mode .fp-pay-method-label { color:#64748b; }

/* Responsive */
@media (max-width: 768px) {
    .fp-form-grid { grid-template-columns:1fr; }
    .fp-full-width { grid-column:span 1; }
    .fp-summary-bar { grid-template-columns:1fr; }
    .fp-amount-row { grid-template-columns:1fr; }
}
@media (max-width: 480px) {
    .fp-form-card { padding:1rem; }
    .fp-receipt-actions { flex-direction:column; }
}
`,

    render() {
        return `
<div id="fp-page">

    <!-- Receipt overlay -->
    <div class="fp-receipt-overlay" id="fp-receiptOverlay">
        <div class="fp-receipt-card">
            <div class="fp-receipt-icon"><i class="fa-solid fa-check"></i></div>
            <h2 style="font-size:1.3rem; margin-bottom:4px;" id="fp-receiptTitle">Payment Confirmed</h2>
            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;" id="fp-receiptSubtitle"></p>
            <div class="fp-receipt-ref" id="fp-receiptRef">—</div>
            <div style="margin-top:1rem; padding:1rem; background:rgba(0,0,0,0.2); border-radius:8px; text-align:left;">
                <div class="fp-receipt-detail">Customer: <span id="fp-rCustomer">—</span></div>
                <div class="fp-receipt-detail">Room: <span id="fp-rRoom">—</span></div>
                <div class="fp-receipt-detail">Event Date: <span id="fp-rDate">—</span></div>
                <div class="fp-receipt-detail">Amount Paid: <span id="fp-rAmount" style="color:var(--success);">—</span></div>
                <div class="fp-receipt-detail">Remaining Balance: <span id="fp-rBalance">—</span></div>
                <div class="fp-receipt-detail" style="margin-top:6px; padding-top:6px; border-top:1px solid var(--border);">Original Deposit Ref: <span id="fp-rOrigRef" style="font-family:monospace; font-size:0.85rem; color:var(--primary);">—</span></div>
            </div>
            <div class="fp-receipt-actions">
                <button class="fp-receipt-btn-txn" id="fp-btnViewTxn">
                    <i class="fa-solid fa-list"></i> View Transactions
                </button>
                <button class="fp-receipt-btn-new" id="fp-btnNewPayment">
                    <i class="fa-solid fa-plus"></i> New Payment
                </button>
            </div>
        </div>
    </div>

    <div class="fp-header">
        <h1><i class="fa-solid fa-credit-card"></i>Process Payment</h1>
    </div>

    <form id="fp-paymentForm" class="fp-form-card">

        <div class="fp-section-title"><i class="fa-solid fa-file-invoice"></i> Select Invoice</div>
        <div class="fp-form-grid">
            <div class="fp-input-group fp-full-width">
                <label>Outstanding Bookings</label>
                <div class="fp-input-wrapper">
                    <i class="fp-icon fa-solid fa-list-ul"></i>
                    <select id="fp-bookingSelect" required>
                        <option value="">Loading outstanding balances...</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="fp-section-title"><i class="fa-solid fa-circle-info"></i> Booking Details</div>
        <div class="fp-form-grid">
            <div class="fp-input-group">
                <label>Customer</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-user"></i><input type="text" id="fp-customerName" readonly></div>
            </div>
            <div class="fp-input-group">
                <label>Phone</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-phone"></i><input type="text" id="fp-customerPhone" readonly></div>
            </div>
            <div class="fp-input-group">
                <label>Room</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-door-open"></i><input type="text" id="fp-roomName" readonly></div>
            </div>
            <div class="fp-input-group">
                <label>Event Date</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-calendar"></i><input type="text" id="fp-eventDate" readonly></div>
            </div>
            <div class="fp-input-group">
                <label>Time Slot</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-clock"></i><input type="text" id="fp-eventTime" readonly></div>
            </div>
            <div class="fp-input-group">
                <label>Customer Email</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-envelope"></i><input type="text" id="fp-customerEmail" readonly></div>
            </div>
            <div class="fp-input-group fp-full-width">
                <label>Original Deposit Reference</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-tag"></i><input type="text" id="fp-depositRef" readonly placeholder="—"></div>
            </div>
        </div>

        <div class="fp-section-title"><i class="fa-solid fa-chart-pie"></i> Account Summary</div>
        <div class="fp-summary-bar">
            <div class="fp-summary-item">
                <div class="fp-s-label">Total Booking Value</div>
                <div class="fp-s-value" id="fp-totalDisplay" style="color:var(--text-main);">£—</div>
            </div>
            <div class="fp-summary-item">
                <div class="fp-s-label">Deposit Paid</div>
                <div class="fp-s-value" id="fp-depositDisplay" style="color:var(--primary);">£—</div>
            </div>
            <div class="fp-summary-item">
                <div class="fp-s-label">Outstanding Balance</div>
                <div class="fp-s-value" id="fp-balanceDisplay" style="color:var(--warning);">£—</div>
            </div>
        </div>

        <div class="fp-section-title"><i class="fa-solid fa-credit-card"></i> Payment Amount</div>
        <div class="fp-payment-box">
            <div class="fp-pay-method-row">
                <span class="fp-pay-method-label">Payment Method:</span>
                <select id="fp-payMethodSelect" class="fp-pay-method-select">
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="fp-amount-row">
                <div>
                    <label style="display:block; color:var(--text-muted); font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.4rem;">Amount to Pay (£)</label>
                    <div class="fp-input-wrapper">
                        <i class="fp-icon fa-solid fa-sterling-sign"></i>
                        <input type="number" id="fp-payAmount" class="fp-amount-input-num" min="1" step="0.01" placeholder="0.00" required>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; margin-top:6px; flex-wrap:wrap;">
                        <span id="fp-payTypeBadge" class="fp-pay-type-badge fp-partial" style="display:none;"></span>
                        <button type="button" id="fp-btnSetFull" class="fp-set-full-btn">Pay full balance</button>
                    </div>
                </div>
                <div>
                    <label style="display:block; color:var(--text-muted); font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.4rem;">Slide to adjust</label>
                    <div class="fp-range-wrap">
                        <input type="range" id="fp-paySlider" min="100" step="100" value="0">
                    </div>
                    <div class="fp-range-hint" id="fp-sliderHint">Drag to set partial amount</div>
                </div>
            </div>

            <button type="button" class="fp-btn-pay" id="fp-btnPay" disabled>
                <i class="fa-solid fa-lock"></i> <span id="fp-btnLabel">Select a booking first</span>
            </button>
        </div>

        <input type="hidden" id="fp-bookingId">
        <input type="hidden" id="fp-customerId">
        <input type="hidden" id="fp-maxBalance">
        <input type="hidden" id="fp-hdDepositRef">
    </form>
</div>`;
    },

    async init() {
        // ── API endpoints ─────────────────────────────────────────────────────
        const LIST_API = `${API_BASE}/get-outstanding-bookings`;
        const PAY_API  = `${API_BASE}/pay-balance`;

        // ── Internal helpers ──────────────────────────────────────────────────
        function getEl(id) { return document.getElementById(id); }

        function fillDetails() {
            const idx = getEl('fp-bookingSelect').value;
            if (idx === '') { clearForm(); return; }
            const b = _bookingsData[idx];

            getEl('fp-customerName').value  = b.full_name  || '';
            getEl('fp-customerPhone').value = b.phone      || '';
            getEl('fp-roomName').value      = b.room_name  || '';
            getEl('fp-eventDate').value     = new Date(b.booking_date).toLocaleDateString('en-GB');
            getEl('fp-eventTime').value     = (b.start_time || '?') + ' \u2013 ' + (b.end_time || '?');
            getEl('fp-customerEmail').value = b.email      || '';
            getEl('fp-depositRef').value    = b.deposit_reference || '\u2014';

            getEl('fp-totalDisplay').textContent   = b.total_amount != null ? fmt(b.total_amount) : '\u00a3\u2014';
            getEl('fp-depositDisplay').textContent = b.deposit_paid  != null ? fmt(b.deposit_paid)  : '\u00a3\u2014';
            getEl('fp-balanceDisplay').textContent = fmt(b.balance_due);

            getEl('fp-bookingId').value    = b.booking_id;
            getEl('fp-customerId').value   = b.customer_id;
            getEl('fp-maxBalance').value   = b.balance_due;
            getEl('fp-hdDepositRef').value = b.deposit_reference || '';

            const max    = parseFloat(b.balance_due);
            const slider = getEl('fp-paySlider');
            slider.max   = Math.round(max * 100);
            slider.min   = 100;
            slider.value = Math.round(max * 100);

            const amtInput = getEl('fp-payAmount');
            amtInput.max   = max;
            amtInput.min   = 0.01;
            amtInput.value = max.toFixed(2);

            updatePayType(max);
            getEl('fp-btnPay').disabled = false;
        }

        function clearForm() {
            ['fp-customerName','fp-customerPhone','fp-roomName','fp-eventDate','fp-eventTime','fp-customerEmail','fp-depositRef'].forEach(id => {
                const el = getEl(id); if (el) el.value = '';
            });
            ['fp-totalDisplay','fp-depositDisplay','fp-balanceDisplay'].forEach(id => {
                const el = getEl(id); if (el) el.textContent = '\u00a3\u2014';
            });
            const pa = getEl('fp-payAmount'); if (pa) pa.value = '';
            getEl('fp-btnPay').disabled = true;
            getEl('fp-payTypeBadge').style.display = 'none';
            getEl('fp-btnLabel').textContent = 'Select a booking first';
        }

        function updatePayType(amt) {
            const max   = parseFloat(getEl('fp-maxBalance').value) || 0;
            const badge = getEl('fp-payTypeBadge');
            const btn   = getEl('fp-btnPay');
            const lbl   = getEl('fp-btnLabel');
            if (!max || !amt || amt <= 0) { badge.style.display = 'none'; return; }

            const isFull = parseFloat(amt) >= max - 0.005;
            badge.style.display = 'inline-flex';
            if (isFull) {
                badge.className = 'fp-pay-type-badge fp-full';
                badge.innerHTML = '<i class="fa-solid fa-check-circle"></i> Full Payment';
                btn.className   = 'fp-btn-pay';
                lbl.textContent = 'Process Final Payment \u2014 ' + fmt(amt);
            } else {
                badge.className = 'fp-pay-type-badge fp-partial';
                badge.innerHTML = '<i class="fa-solid fa-circle-half-stroke"></i> Part Payment';
                btn.className   = 'fp-btn-pay fp-partial-mode';
                lbl.textContent = 'Process Part Payment \u2014 ' + fmt(amt);
            }
        }

        function onAmountChange() {
            const amt = parseFloat(getEl('fp-payAmount').value) || 0;
            const max = parseFloat(getEl('fp-maxBalance').value) || 0;
            getEl('fp-paySlider').value = Math.round(Math.min(amt, max) * 100);
            updatePayType(amt);
        }

        function onSliderChange() {
            const raw = parseInt(getEl('fp-paySlider').value) / 100;
            getEl('fp-payAmount').value = raw.toFixed(2);
            updatePayType(raw);
        }

        function setFullAmount() {
            const max = parseFloat(getEl('fp-maxBalance').value) || 0;
            if (!max) return;
            getEl('fp-payAmount').value = max.toFixed(2);
            getEl('fp-paySlider').value = Math.round(max * 100);
            updatePayType(max);
        }

        function resetToNewPayment() {
            getEl('fp-receiptOverlay').classList.remove('active');
            // Reset booking select and clear form
            const sel = getEl('fp-bookingSelect');
            if (sel) sel.value = '';
            clearForm();
            // Reload outstanding bookings list
            loadOutstanding();
        }

        async function loadOutstanding() {
            try {
                const res  = await fetch(LIST_API, { headers: Auth.headers() });
                const json = await res.json();
                _bookingsData = json.data || (Array.isArray(json) ? json : []);

                const sel = getEl('fp-bookingSelect');
                sel.innerHTML = '<option value="">-- Select Outstanding Invoice --</option>';

                if (_bookingsData.length === 0) {
                    sel.innerHTML = '<option value="">No outstanding balances found</option>';
                    return;
                }

                _bookingsData.forEach((b, i) => {
                    const opt = document.createElement('option');
                    opt.value = i;
                    const d = new Date(b.booking_date).toLocaleDateString('en-GB');
                    opt.text = b.full_name + ' \u2014 ' + b.room_name + ' (' + d + ') \u2014 ' + fmt(b.balance_due) + ' outstanding';
                    sel.add(opt);
                });
            } catch (e) {
                console.error('loadOutstanding:', e);
                UI.toast('Failed to load outstanding bookings.', 'error');
                const sel = getEl('fp-bookingSelect');
                if (sel) sel.innerHTML = '<option value="">Failed to load — please refresh</option>';
            }
        }

        async function submitPayment() {
            const bookingId        = getEl('fp-bookingId').value;
            const customerId       = getEl('fp-customerId').value;
            const amount           = parseFloat(getEl('fp-payAmount').value);
            const maxBal           = parseFloat(getEl('fp-maxBalance').value);
            const depositReference = getEl('fp-hdDepositRef').value;

            if (!bookingId)                { UI.toast('Please select a booking first.', 'warning'); return; }
            if (!amount || amount < 0.01)  { UI.toast('Please enter a valid payment amount.', 'warning'); return; }
            if (amount > maxBal + 0.01)    { UI.toast('Amount cannot exceed the outstanding balance of ' + fmt(maxBal) + '.', 'warning'); return; }

            const isPartial = amount < maxBal - 0.005;
            const msg = isPartial
                ? 'Confirm PART PAYMENT of ' + fmt(amount) + '?\n\nRemaining balance will be ' + fmt(maxBal - amount) + '.'
                : 'Confirm FULL PAYMENT of ' + fmt(amount) + '?\n\nThis will fully settle the account.';
            if (!confirm(msg)) return;

            const btn = getEl('fp-btnPay');
            btn.disabled = true;
            getEl('fp-btnLabel').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

            try {
                const res = await fetch(PAY_API, {
                    method:  'POST',
                    headers: Auth.headers(),
                    body:    JSON.stringify({
                        booking_id:        bookingId,
                        customer_id:       customerId,
                        amount:            amount,
                        balance_due:       maxBal,
                        deposit_reference: depositReference,
                        payment_method:    getEl('fp-payMethodSelect').value
                    })
                });
                const result = await res.json();

                if (result.status === 'success') {
                    const remaining = Math.max(0, maxBal - amount);
                    getEl('fp-receiptTitle').textContent    = isPartial ? 'Part Payment Confirmed' : 'Final Payment Confirmed';
                    getEl('fp-receiptSubtitle').textContent = isPartial
                        ? 'Partial payment recorded. ' + fmt(remaining) + ' still outstanding.'
                        : 'Account fully settled \u2014 no further balance due.';
                    getEl('fp-receiptRef').textContent      = result.reference_number || 'Payment recorded';
                    getEl('fp-rCustomer').textContent       = getEl('fp-customerName').value;
                    getEl('fp-rRoom').textContent           = getEl('fp-roomName').value;
                    getEl('fp-rDate').textContent           = getEl('fp-eventDate').value;
                    getEl('fp-rAmount').textContent         = fmt(amount);
                    getEl('fp-rBalance').textContent        = remaining > 0 ? fmt(remaining) : 'Fully Settled \u2713';
                    getEl('fp-rOrigRef').textContent        = depositReference || '\u2014';
                    getEl('fp-receiptOverlay').classList.add('active');
                    UI.toast(isPartial ? 'Part payment recorded.' : 'Final payment confirmed!', 'success');
                } else {
                    throw new Error(result.message || 'Payment failed');
                }
            } catch (e) {
                console.error(e);
                UI.toast('Payment failed: ' + e.message, 'error');
                btn.disabled = false;
                updatePayType(amount);
            }
        }

        // ── Attach listeners ──────────────────────────────────────────────────
        on(getEl('fp-bookingSelect'), 'change', fillDetails);
        on(getEl('fp-payAmount'),     'input',  onAmountChange);
        on(getEl('fp-paySlider'),     'input',  onSliderChange);
        on(getEl('fp-btnSetFull'),    'click',  setFullAmount);
        on(getEl('fp-btnPay'),        'click',  submitPayment);
        on(getEl('fp-btnNewPayment'), 'click',  resetToNewPayment);
        on(getEl('fp-btnViewTxn'),    'click',  () => {
            getEl('fp-receiptOverlay').classList.remove('active');
            if (window._spaNavigate) {
                window._spaNavigate('accounts');
            } else {
                window.location.href = 'accounts.html';
            }
        });
        on(getEl('fp-paymentForm'),   'submit', e => e.preventDefault());

        // ── Initial load ──────────────────────────────────────────────────────
        await loadOutstanding();
    },

    destroy() {
        _listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
        _listeners    = [];
        _bookingsData = [];
    }
};
