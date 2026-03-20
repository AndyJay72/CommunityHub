import { Auth, API_BASE } from '../auth.js';
import { UI } from '../ui.js';

// ── helpers ────────────────────────────────────────────────────────────────
let _listeners = [];
function on(el, evt, fn) { if (!el) return; el.addEventListener(evt, fn); _listeners.push({ el, evt, fn }); }
function $(id) { return document.getElementById(id); }
const fmt = n => UI.currency(n);

// ── module state ───────────────────────────────────────────────────────────
let bookingsData = [];

// ── page module ────────────────────────────────────────────────────────────
export default {
    title: 'Process Payment',

    css: `
/* ── Final Payment page styles (fp- prefix) ─────────────────────────── */
#fp-page { animation: fp-fadeUp 0.35s ease both; }
@keyframes fp-fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

.fp-header { display:flex; align-items:center; margin-bottom:2rem; gap:1rem; }
.fp-header h1 { font-size:1.5rem; font-weight:700; }
.fp-header h1 i { color:var(--primary); margin-right:8px; }

.fp-form-card { background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:2rem; max-width:860px; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,0.3); }
body.light-mode .fp-form-card { background:rgba(255,255,255,0.92); border-color:rgba(0,0,0,0.1); box-shadow:0 4px 16px rgba(0,0,0,0.08); }

.fp-section-title { font-size:1.05rem; font-weight:700; color:var(--text-main); margin:0 0 1.25rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem; display:flex; align-items:center; gap:10px; }
.fp-section-title i { color:var(--primary); }

.fp-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:2rem; }
.fp-full-width { grid-column:span 2; }
.fp-input-group label { display:block; color:var(--text-muted); font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.4rem; }
.fp-input-wrapper { position:relative; width:100%; }
.fp-input-wrapper i.fp-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--primary); pointer-events:none; font-size:0.9rem; }
.fp-form-card input,
.fp-form-card select { width:100%; padding:12px 12px 12px 42px; background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:10px; color:white; outline:none; font-size:0.95rem; appearance:none; transition:border-color 0.2s; font-family:inherit; min-height:44px; }
body.light-mode .fp-form-card input,
body.light-mode .fp-form-card select { background:rgba(0,0,0,0.04); color:#0f172a; }
.fp-form-card input:focus,
.fp-form-card select:focus { border-color:var(--primary); }
.fp-form-card select { cursor:pointer; }
.fp-form-card input[readonly] { opacity:0.65; cursor:default; }

.fp-summary-bar { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:2rem; }
.fp-summary-item { background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:10px; padding:1rem; text-align:center; }
body.light-mode .fp-summary-item { background:rgba(0,0,0,0.04); }
.fp-summary-item .fp-label { font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
.fp-summary-item .fp-value { font-size:1.3rem; font-weight:700; }

.fp-payment-box { background:rgba(0,0,0,0.2); padding:1.75rem; border-radius:12px; border:1px solid var(--border); }
body.light-mode .fp-payment-box { background:rgba(0,0,0,0.04); }
.fp-amount-row { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; align-items:start; margin-bottom:1.25rem; }

.fp-range-wrap input[type=range] { -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:3px; background:var(--border); padding:0; border:none; cursor:pointer; margin-top:8px; min-height:auto; }
.fp-range-wrap input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:var(--primary); cursor:pointer; }
.fp-range-hint { font-size:0.8rem; color:var(--text-muted); margin-top:4px; }

.fp-amount-input-num { font-size:1.5rem !important; font-weight:700; padding:14px 14px 14px 48px !important; }

.fp-pay-type-badge { display:inline-flex; align-items:center; gap:6px; font-size:0.8rem; font-weight:700; text-transform:uppercase; padding:4px 10px; border-radius:20px; margin-top:8px; }
.fp-pay-type-badge.fp-partial { background:rgba(245,158,11,0.15); color:var(--warning); }
.fp-pay-type-badge.fp-full { background:rgba(16,185,129,0.15); color:var(--success); }

.fp-btn-pay { width:100%; padding:15px; border:none; border-radius:10px; font-weight:700; cursor:pointer; font-size:1rem; background:var(--success); color:#0f172a; margin-top:1.25rem; transition:transform 0.2s, opacity 0.2s; display:flex; align-items:center; justify-content:center; gap:10px; font-family:inherit; }
.fp-btn-pay:hover:not(:disabled) { transform:translateY(-2px); }
.fp-btn-pay:disabled { opacity:0.4; cursor:not-allowed; }
.fp-btn-pay.fp-partial-mode { background:var(--warning); }

.fp-pay-method-row { display:flex; align-items:center; gap:10px; }
.fp-pay-method-label { font-size:0.82rem; color:var(--text-muted); white-space:nowrap; }
.fp-pay-method-select { background:rgba(0,0,0,0.4); border:1px solid var(--border); border-radius:8px; color:white; padding:7px 12px; font-size:0.88rem; outline:none; cursor:pointer; flex:1; min-height:44px; font-family:inherit; }
body.light-mode .fp-pay-method-select { background:rgba(0,0,0,0.04); color:#0f172a; }
.fp-pay-method-select option { background:#1e293b; }
body.light-mode .fp-pay-method-select option { background:#fff; color:#0f172a; }

.fp-btn-full-bal { font-size:0.78rem; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); color:var(--success); border-radius:6px; padding:3px 10px; cursor:pointer; font-family:inherit; min-height:auto; }

/* Receipt overlay */
.fp-receipt-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:200; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
.fp-receipt-overlay.fp-active { display:flex; }
.fp-receipt-card { background:#1e293b; border:1px solid var(--border); border-radius:16px; padding:2rem; max-width:480px; width:90%; text-align:center; }
body.light-mode .fp-receipt-card { background:rgba(255,255,255,0.97); border-color:rgba(0,0,0,0.1); }
.fp-receipt-icon { width:64px; height:64px; border-radius:50%; background:rgba(16,185,129,0.15); border:2px solid var(--success); display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--success); margin:0 auto 1rem; }
.fp-receipt-ref { font-family:monospace; font-size:1.1rem; color:var(--primary); background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.2); border-radius:8px; padding:8px 16px; display:inline-block; margin:8px 0; }
.fp-receipt-detail { font-size:0.9rem; color:var(--text-muted); margin:5px 0; }
.fp-receipt-detail span { color:var(--text-main); font-weight:600; }
.fp-receipt-actions { display:flex; gap:10px; margin-top:1.25rem; }
.fp-receipt-btn { flex:1; padding:10px; border-radius:8px; cursor:pointer; font-weight:600; font-family:inherit; font-size:0.9rem; min-height:44px; }
.fp-receipt-btn-txn { background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); color:var(--primary); }
.fp-receipt-btn-new { background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:var(--success); }

/* Responsive */
@media (max-width:768px) {
    .fp-grid { grid-template-columns:1fr; }
    .fp-full-width { grid-column:span 1; }
    .fp-summary-bar { grid-template-columns:1fr; }
    .fp-amount-row { grid-template-columns:1fr; }
}
`,

    render() {
        return `
<div id="fp-page">

    <!-- Receipt overlay -->
    <div class="fp-receipt-overlay" id="fpReceiptOverlay">
        <div class="fp-receipt-card">
            <div class="fp-receipt-icon"><i class="fa-solid fa-check"></i></div>
            <h2 style="font-size:1.3rem; margin-bottom:4px;" id="fpReceiptTitle">Payment Confirmed</h2>
            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;" id="fpReceiptSubtitle"></p>
            <div class="fp-receipt-ref" id="fpReceiptRef">\u2014</div>
            <div style="margin-top:1rem; padding:1rem; background:rgba(0,0,0,0.2); border-radius:8px; text-align:left;">
                <div class="fp-receipt-detail">Customer: <span id="fpRCustomer">\u2014</span></div>
                <div class="fp-receipt-detail">Room: <span id="fpRRoom">\u2014</span></div>
                <div class="fp-receipt-detail">Event Date: <span id="fpRDate">\u2014</span></div>
                <div class="fp-receipt-detail">Amount Paid: <span id="fpRAmount" style="color:var(--success);">\u2014</span></div>
                <div class="fp-receipt-detail">Remaining Balance: <span id="fpRBalance">\u2014</span></div>
                <div class="fp-receipt-detail" style="margin-top:6px; padding-top:6px; border-top:1px solid var(--border);">Original Deposit Ref: <span id="fpROrigRef" style="font-family:monospace; font-size:0.85rem; color:var(--primary);">\u2014</span></div>
            </div>
            <div class="fp-receipt-actions">
                <button class="fp-receipt-btn fp-receipt-btn-txn" id="fpBtnViewTxn">
                    <i class="fa-solid fa-list"></i> View Transactions
                </button>
                <button class="fp-receipt-btn fp-receipt-btn-new" id="fpBtnNewPayment">
                    <i class="fa-solid fa-plus"></i> New Payment
                </button>
            </div>
        </div>
    </div>

    <div class="fp-header">
        <h1><i class="fa-solid fa-credit-card"></i>Process Payment</h1>
    </div>

    <form id="fpPaymentForm" class="fp-form-card" onsubmit="return false;">

        <div class="fp-section-title"><i class="fa-solid fa-file-invoice"></i> Select Invoice</div>
        <div class="fp-grid">
            <div class="fp-input-group fp-full-width">
                <label>Outstanding Bookings</label>
                <div class="fp-input-wrapper">
                    <i class="fp-icon fa-solid fa-list-ul"></i>
                    <select id="fpBookingSelect" required>
                        <option value="">Loading outstanding balances...</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="fp-section-title"><i class="fa-solid fa-circle-info"></i> Booking Details</div>
        <div class="fp-grid">
            <div class="fp-input-group">
                <label>Customer</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-user"></i><input type="text" id="fpCustomerName" readonly></div>
            </div>
            <div class="fp-input-group">
                <label>Phone</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-phone"></i><input type="text" id="fpCustomerPhone" readonly></div>
            </div>
            <div class="fp-input-group">
                <label>Room</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-door-open"></i><input type="text" id="fpRoomName" readonly></div>
            </div>
            <div class="fp-input-group">
                <label>Event Date</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-calendar"></i><input type="text" id="fpEventDate" readonly></div>
            </div>
            <div class="fp-input-group">
                <label>Time Slot</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-clock"></i><input type="text" id="fpEventTime" readonly></div>
            </div>
            <div class="fp-input-group">
                <label>Customer Email</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-envelope"></i><input type="text" id="fpCustomerEmail" readonly></div>
            </div>
            <div class="fp-input-group fp-full-width">
                <label>Original Deposit Reference</label>
                <div class="fp-input-wrapper"><i class="fp-icon fa-solid fa-tag"></i><input type="text" id="fpDepositRef" readonly placeholder="\u2014"></div>
            </div>
        </div>

        <div class="fp-section-title"><i class="fa-solid fa-chart-pie"></i> Account Summary</div>
        <div class="fp-summary-bar">
            <div class="fp-summary-item">
                <div class="fp-label">Total Booking Value</div>
                <div class="fp-value" id="fpTotalDisplay" style="color:var(--text-main);">\u00a3\u2014</div>
            </div>
            <div class="fp-summary-item">
                <div class="fp-label">Deposit Paid</div>
                <div class="fp-value" id="fpDepositDisplay" style="color:var(--primary);">\u00a3\u2014</div>
            </div>
            <div class="fp-summary-item">
                <div class="fp-label">Outstanding Balance</div>
                <div class="fp-value" id="fpBalanceDisplay" style="color:var(--warning);">\u00a3\u2014</div>
            </div>
        </div>

        <div class="fp-section-title"><i class="fa-solid fa-credit-card"></i> Payment Amount</div>
        <div class="fp-payment-box">
            <div class="fp-pay-method-row" style="margin-bottom:1.2rem;">
                <span class="fp-pay-method-label">Payment Method:</span>
                <select id="fpPayMethodSelect" class="fp-pay-method-select">
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="fp-amount-row">
                <div>
                    <label style="display:block; color:var(--text-muted); font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.4rem;">Amount to Pay (\u00a3)</label>
                    <div class="fp-input-wrapper">
                        <i class="fp-icon fa-solid fa-sterling-sign"></i>
                        <input type="number" id="fpPayAmount" class="fp-amount-input-num" min="1" step="0.01" placeholder="0.00" required>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; margin-top:6px; flex-wrap:wrap;">
                        <span id="fpPayTypeBadge" class="fp-pay-type-badge fp-partial" style="display:none;"></span>
                        <button type="button" id="fpBtnFullBal" class="fp-btn-full-bal">Pay full balance</button>
                    </div>
                </div>
                <div>
                    <label style="display:block; color:var(--text-muted); font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.4rem;">Slide to adjust</label>
                    <div class="fp-range-wrap">
                        <input type="range" id="fpPaySlider" min="100" step="100" value="0">
                    </div>
                    <div class="fp-range-hint" id="fpSliderHint">Drag to set partial amount</div>
                </div>
            </div>

            <button class="fp-btn-pay" id="fpBtnPay" type="button" disabled>
                <i class="fa-solid fa-lock"></i> <span id="fpBtnLabel">Select a booking first</span>
            </button>
        </div>

        <input type="hidden" id="fpBookingId">
        <input type="hidden" id="fpCustomerId">
        <input type="hidden" id="fpMaxBalance">
        <input type="hidden" id="fpHdDepositRef">
    </form>
</div>`;
    },

    async init() {
        // wire events
        on($('fpBookingSelect'), 'change', fillDetails);
        on($('fpPayAmount'), 'input', onAmountChange);
        on($('fpPaySlider'), 'input', onSliderChange);
        on($('fpBtnFullBal'), 'click', setFullAmount);
        on($('fpBtnPay'), 'click', submitPayment);
        on($('fpBtnViewTxn'), 'click', () => {
            $('fpReceiptOverlay')?.classList.remove('fp-active');
            window.location.hash = '#/accounts';
        });
        on($('fpBtnNewPayment'), 'click', () => {
            $('fpReceiptOverlay')?.classList.remove('fp-active');
            resetPage();
        });

        // load outstanding bookings
        await loadOutstanding();
    },

    destroy() {
        _listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
        _listeners = [];
        bookingsData = [];
    }
};

// ── data loading ───────────────────────────────────────────────────────────
async function loadOutstanding() {
    try {
        const res = await fetch(`${API_BASE}/get-outstanding-bookings`, {
            headers: Auth.headers()
        });
        const json = await res.json();
        bookingsData = json.data || (Array.isArray(json) ? json : []);

        const sel = $('fpBookingSelect');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Select Outstanding Invoice --</option>';

        if (bookingsData.length === 0) {
            sel.innerHTML = '<option value="">No outstanding balances found</option>';
            return;
        }

        bookingsData.forEach((b, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            const d = new Date(b.booking_date).toLocaleDateString('en-GB');
            opt.text = `${b.full_name} \u2014 ${b.room_name} (${d}) \u2014 ${fmt(b.balance_due)} outstanding`;
            sel.add(opt);
        });
    } catch (e) {
        console.error('loadOutstanding:', e);
        UI.toast('Failed to load outstanding bookings', 'error');
    }
}

// ── fill details on selection ──────────────────────────────────────────────
function fillDetails() {
    const idx = $('fpBookingSelect').value;
    if (idx === '') { clearForm(); return; }
    const b = bookingsData[idx];

    $('fpCustomerName').value  = b.full_name  || '';
    $('fpCustomerPhone').value = b.phone      || '';
    $('fpRoomName').value      = b.room_name  || '';
    $('fpEventDate').value     = new Date(b.booking_date).toLocaleDateString('en-GB');
    $('fpEventTime').value     = (b.start_time || '?') + ' \u2013 ' + (b.end_time || '?');
    $('fpCustomerEmail').value = b.email      || '';
    $('fpDepositRef').value    = b.deposit_reference || '\u2014';

    $('fpTotalDisplay').innerText   = b.total_amount != null ? fmt(b.total_amount)  : '\u00a3\u2014';
    $('fpDepositDisplay').innerText = b.deposit_paid  != null ? fmt(b.deposit_paid)  : '\u00a3\u2014';
    $('fpBalanceDisplay').innerText = fmt(b.balance_due);

    $('fpBookingId').value    = b.booking_id;
    $('fpCustomerId').value   = b.customer_id;
    $('fpMaxBalance').value   = b.balance_due;
    $('fpHdDepositRef').value = b.deposit_reference || '';

    const max = parseFloat(b.balance_due);
    const slider = $('fpPaySlider');
    slider.max   = Math.round(max * 100);
    slider.min   = 100;
    slider.value = Math.round(max * 100);

    const amtInput = $('fpPayAmount');
    amtInput.max   = max;
    amtInput.min   = 0.01;
    amtInput.value = max.toFixed(2);

    updatePayType(max);
    $('fpBtnPay').disabled = false;
}

function clearForm() {
    ['fpCustomerName','fpCustomerPhone','fpRoomName','fpEventDate','fpEventTime','fpCustomerEmail','fpDepositRef'].forEach(id => {
        $(id).value = '';
    });
    ['fpTotalDisplay','fpDepositDisplay','fpBalanceDisplay'].forEach(id => {
        $(id).innerText = '\u00a3\u2014';
    });
    $('fpPayAmount').value = '';
    $('fpBtnPay').disabled = true;
    $('fpPayTypeBadge').style.display = 'none';
    $('fpBtnLabel').innerText = 'Select a booking first';
}

// ── amount helpers ─────────────────────────────────────────────────────────
function onAmountChange() {
    const amt = parseFloat($('fpPayAmount').value) || 0;
    const max = parseFloat($('fpMaxBalance').value) || 0;
    $('fpPaySlider').value = Math.round(Math.min(amt, max) * 100);
    updatePayType(amt);
}

function onSliderChange() {
    const raw = parseInt($('fpPaySlider').value) / 100;
    $('fpPayAmount').value = raw.toFixed(2);
    updatePayType(raw);
}

function setFullAmount() {
    const max = parseFloat($('fpMaxBalance').value) || 0;
    if (!max) return;
    $('fpPayAmount').value = max.toFixed(2);
    $('fpPaySlider').value = Math.round(max * 100);
    updatePayType(max);
}

function updatePayType(amt) {
    const max   = parseFloat($('fpMaxBalance').value) || 0;
    const badge = $('fpPayTypeBadge');
    const btn   = $('fpBtnPay');
    const lbl   = $('fpBtnLabel');
    if (!max || !amt || amt <= 0) { badge.style.display = 'none'; return; }

    const isFull = parseFloat(amt) >= max - 0.005;
    badge.style.display = 'inline-flex';
    if (isFull) {
        badge.className = 'fp-pay-type-badge fp-full';
        badge.innerHTML = '<i class="fa-solid fa-check-circle"></i> Full Payment';
        btn.className = 'fp-btn-pay';
        lbl.innerText = 'Process Final Payment \u2014 ' + fmt(amt);
    } else {
        badge.className = 'fp-pay-type-badge fp-partial';
        badge.innerHTML = '<i class="fa-solid fa-circle-half-stroke"></i> Part Payment';
        btn.className = 'fp-btn-pay fp-partial-mode';
        lbl.innerText = 'Process Part Payment \u2014 ' + fmt(amt);
    }
}

// ── submit payment ─────────────────────────────────────────────────────────
async function submitPayment() {
    const bookingId        = $('fpBookingId').value;
    const customerId       = $('fpCustomerId').value;
    const amount           = parseFloat($('fpPayAmount').value);
    const maxBal           = parseFloat($('fpMaxBalance').value);
    const depositReference = $('fpHdDepositRef').value;

    if (!bookingId)              { UI.toast('Please select a booking first.', 'warning'); return; }
    if (!amount || amount < 0.01){ UI.toast('Please enter a valid payment amount.', 'warning'); return; }
    if (amount > maxBal + 0.01)  { UI.toast('Amount cannot exceed the outstanding balance of ' + fmt(maxBal) + '.', 'warning'); return; }

    const isPartial = amount < maxBal - 0.005;
    const msg = isPartial
        ? `Confirm PART PAYMENT of ${fmt(amount)}? Remaining balance will be ${fmt(maxBal - amount)}.`
        : `Confirm FULL PAYMENT of ${fmt(amount)}? This will fully settle the account.`;
    if (!confirm(msg)) return;

    const btn = $('fpBtnPay');
    btn.disabled = true;
    $('fpBtnLabel').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    try {
        const res = await fetch(`${API_BASE}/pay-balance`, {
            method: 'POST',
            headers: Auth.headers(),
            body: JSON.stringify({
                booking_id:        bookingId,
                customer_id:       customerId,
                amount:            amount,
                balance_due:       maxBal,
                deposit_reference: depositReference,
                payment_method:    $('fpPayMethodSelect').value
            })
        });
        const result = await res.json();

        if (result.status === 'success') {
            const remaining = Math.max(0, maxBal - amount);
            $('fpReceiptTitle').innerText   = isPartial ? 'Part Payment Confirmed' : 'Final Payment Confirmed';
            $('fpReceiptSubtitle').innerText = isPartial
                ? 'Partial payment recorded. ' + fmt(remaining) + ' still outstanding.'
                : 'Account fully settled \u2014 no further balance due.';
            $('fpReceiptRef').innerText     = result.reference_number || 'Payment recorded';
            $('fpRCustomer').innerText      = $('fpCustomerName').value;
            $('fpRRoom').innerText          = $('fpRoomName').value;
            $('fpRDate').innerText          = $('fpEventDate').value;
            $('fpRAmount').innerText        = fmt(amount);
            $('fpRBalance').innerText       = remaining > 0 ? fmt(remaining) : 'Fully Settled \u2713';
            $('fpROrigRef').innerText       = depositReference || '\u2014';
            $('fpReceiptOverlay').classList.add('fp-active');
            UI.toast(isPartial ? 'Part payment recorded' : 'Payment confirmed', 'success');
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

// ── reset for new payment ──────────────────────────────────────────────────
async function resetPage() {
    clearForm();
    const sel = $('fpBookingSelect');
    if (sel) sel.value = '';
    await loadOutstanding();
}
