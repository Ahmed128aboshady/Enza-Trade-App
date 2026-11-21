const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'app.js');
let code = fs.readFileSync(appPath, 'utf8');

// 1. Extend state
const stateTarget = `  editImageBase64: null,
  dbInitialized: false
};`;

const stateReplacement = `  editImageBase64: null,
  dbInitialized: false,

  // Operational & Scanner additions
  scannerRunning: false,
  scannerInstance: null,
  scannerFacing: 'environment',
  custodyMovements: [],
  disburseCustomerTab: 'existing',
  disburseSelectedCustomer: null,
  disburseSelectedProduct: null,
  disburseUnitPrice: 0,
  disburseQty: 1,
  disbursePaidAmount: 0,
  disburseWaybillBase64: null,
  advanceWaybillBase64: null,
  advancePaymentProofBase64: null
};`;

if (!code.includes(stateTarget)) {
  console.error('Target 1 (state) not found!');
  process.exit(1);
}
code = code.replace(stateTarget, stateReplacement);

// 2. Add Helper getOrderOps
const helperInsertPoint = `function isLive() {`;
const helperCode = `function getOrderOps(o) {
  let ops = {};
  try {
    const store = JSON.parse(localStorage.getItem('enza_order_ops') || '{}');
    ops = store[o.id] || {};
  } catch (e) {}

  const ordTotal = total(o);
  const paid = Number(o.paid_amount ?? ops.paid_amount ?? (o.fulfillment_status === 'delivered' ? ordTotal : 0));
  const remaining = Number(o.remaining_amount ?? ops.remaining_amount ?? Math.max(0, ordTotal - paid));
  const waybill = o.waybill_image_url || ops.waybill_image_url || null;
  const paymentProof = o.payment_proof_url || ops.payment_proof_url || null;

  return { paid, remaining, waybill, paymentProof };
}

`;
code = code.replace(helperInsertPoint, helperCode + helperInsertPoint);

// 3. Update renderNav to handle custody
code = code.replace(
  `const active = ({order:'orders', product:'inventory', customer:'customers', activity:'home'})[state.screen] || state.screen;`,
  `const active = ({order:'orders', product:'inventory', customer:'customers', activity:'home', custody:'inventory'})[state.screen] || state.screen;`
);

// 4. Update renderHome to include Custody Banner and Disburse button
const homeHeroTarget = `    '<section class="hero">' +`;
const homeHeroReplacement = `    '<div class="custody-banner" data-screen="custody">' +
      '<div>' +
        '<span class="badge-pill">العهدة والمخزن الميداني</span>' +
        '<b style="display:block;margin-top:5px;font-size:13px">بيان العهدة الشخصية • رصيد البكرات والتحصيل</b>' +
        '<small style="opacity:.8;font-size:10px">انقر لاستعراض العهدة وسجل الصرف للعملاء</small>' +
      '</div>' +
      '<button class="primary-btn" style="background:#fff;color:var(--ink);padding:6px 12px;font-size:11px;border-radius:10px" data-action="open-disburse-wizard">' +
        '+ صرف مباشر' +
      '</button>' +
    '</div>' +
    '<section class="hero">' +`;
code = code.replace(homeHeroTarget, homeHeroReplacement);

// 5. Update renderOrders to include Disburse button
const ordersHeadingTarget = `function renderOrders() {
  return (state.loadError ? renderConnError() : '') +
    search('ابحث باسم العميل أو رقم الطلب') +`;
const ordersHeadingReplacement = `function renderOrders() {
  return (state.loadError ? renderConnError() : '') +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0 12px">' +
      '<h2 style="font-size:14px;font-weight:700">قائمة الطلبات</h2>' +
      '<button class="primary-btn" style="padding:7px 14px;font-size:11px;border-radius:10px" data-action="open-disburse-wizard">' +
        icon('plus') + ' صرف طلب جديد' +
      '</button>' +
    '</div>' +
    search('ابحث باسم العميل أو رقم الطلب') +`;
code = code.replace(ordersHeadingTarget, ordersHeadingReplacement);

// 6. Update renderOrder (Order Detail) to show paid/remaining amounts and waybill/payment proofs
const orderDetailTarget = `  <section class="panel">
    <div class="info-row"><span>قيمة المنتجات</span>' + currency(prodTotal) + '</div>
    <div class="info-row"><span>الشحن</span>' + currency(shipping) + '</div>
    <div class="info-row"><span>طريقة الدفع</span><b>' + esc(o.payment_method || 'الدفع عند الاستلام') + '</b></div>
    <div class="info-row total-row"><b>الإجمالي</b>' + currency(ordTotal) + '</div>
  </section>' +`.replace(/\s+/g, ' ');

// Let's do a reliable replacement around order financial panel
const financialOld = `<div class="info-row"><span>طريقة الدفع</span><b>' + esc(o.payment_method || 'الدفع عند الاستلام') + '</b></div>' +
    '<div class="info-row total-row"><b>الإجمالي</b>' + currency(ordTotal) + '</div>' +
  '</section>' +`;

const financialNew = `<div class="info-row"><span>طريقة الدفع</span><b>' + esc(o.payment_method || 'الدفع عند الاستلام') + '</b></div>' +
    '<div class="info-row total-row"><b>الإجمالي</b>' + currency(ordTotal) + '</div>' +
  '</section>' +
  '<section class="panel">' +
    '<div class="panel-title">المستحقات والتحصيل</div>' +
    '<div class="info-row">' +
      '<span>حالة السداد</span>' +
      (ops.remaining === 0 ? '<span class="payment-badge full">خالص بالكامل</span>' :
        ops.paid > 0 ? '<span class="payment-badge partial">دفع جزئي</span>' :
        '<span class="payment-badge unpaid">آجل بالكامل</span>') +
    '</div>' +
    '<div class="info-row"><span>المبلغ المدفوع [دفع كام]</span><b style="color:var(--green)">' + money(ops.paid) + ' ج.م</b></div>' +
    '<div class="info-row"><span>المتبقي على العميل [متبقي كام]</span><b style="color:' + (ops.remaining > 0 ? 'var(--red)' : 'var(--muted)') + '">' + money(ops.remaining) + ' ج.م</b></div>' +
  '</section>' +
  '<section class="panel">' +
    '<div class="panel-title">مرفقات الشحن والتحصيل</div>' +
    (ops.waybill ?
      '<div class="proof-card" data-action="view-proof-image" data-img="' + esc(ops.waybill) + '" data-title="بوليصة الشحن">' +
        '<img src="' + esc(ops.waybill) + '" class="proof-thumb" alt="بوليصة الشحن">' +
        '<div><b>بوليصة الشحن 📦</b><small>انقر لمعاينة الصورة كاملة</small></div>' +
      '</div>' :
      '<button class="secondary-btn" style="margin-top:6px" data-action="prompt-attach-waybill">' +
        icon('truck') + ' تصوير / إرفاق بوليصة الشحن' +
      '</button>') +
    (ops.paymentProof ?
      '<div class="proof-card" data-action="view-proof-image" data-img="' + esc(ops.paymentProof) + '" data-title="إيصال التحصيل">' +
        '<img src="' + esc(ops.paymentProof) + '" class="proof-thumb" alt="إيصال التحصيل">' +
        '<div><b>إيصال التحصيل والنقدية 💵</b><small>انقر لمعاينة الصورة كاملة</small></div>' +
      '</div>' :
      '<button class="secondary-btn" style="margin-top:6px" data-action="prompt-attach-receipt">' +
        icon('wallet') + ' تصوير / إرفاق إيصال التحصيل' +
      '</button>') +
  '</section>' +`;

code = code.replace(financialOld, financialNew);

// Add const ops = getOrderOps(o); at the start of renderOrder
code = code.replace(
  `  const o = oBy(state.selectedOrder);
  if (!o) return empty('الطلب غير موجود', 'قد يكون تم حذفه من قاعدة البيانات.');`,
  `  const o = oBy(state.selectedOrder);
  if (!o) return empty('الطلب غير موجود', 'قد يكون تم حذفه من قاعدة البيانات.');
  const ops = getOrderOps(o);`
);

// 7. Update renderProduct to add button "+ صرف مباشر لعميل"
const prodBtnRowOld = `<div class="button-row">' +
      '<button class="primary-btn" data-action="stock-modal">' + icon('plus') + 'تسجيل حركة مخزون</button>' +
      '<button class="secondary-btn" data-action="edit-product-modal">' + icon('sliders') + 'تعديل في Odoo</button>' +
    '</div>' +`;

const prodBtnRowNew = `<div class="button-row">' +
      '<button class="primary-btn" data-action="open-disburse-from-product">' + icon('plus') + 'صرف مباشر لعميل</button>' +
      '<button class="secondary-btn" data-action="edit-product-modal">' + icon('sliders') + 'تعديل في Odoo والباركود</button>' +
    '</div>' +
    '<div class="button-row" style="margin-top:8px">' +
      '<button class="secondary-btn" data-action="stock-modal">' + icon('box') + 'حركة مخزون (توريد/صرف)</button>' +
    '</div>' +`;

code = code.replace(prodBtnRowOld, prodBtnRowNew);

// 8. Replace renderScanner with Camera HTML5-QRCode implementation
const renderScannerOld = `function renderScanner() {
  const firstProd = getProducts()[0];
  return '<div class="scanner-screen">' +
    '<span class="demo-label">' + (isLive() ? 'الماسح' : 'معاينة الكاميرا') + '</span>' +
    '<div class="scan-frame">' +
      art(firstProd) +
      '<span class="corner tr"></span><span class="corner tl"></span><span class="corner br"></span><span class="corner bl"></span>' +
      '<span class="scan-line"></span>' +
    '</div>' +
    '<button class="scan-demo" data-action="simulate-scan">' + icon('scan') + 'تجربة قراءة كود</button>' +
    '<p>وجّه الكاميرا نحو الـ QR أو الباركود</p>' +
  '</div>' +
  '<div class="scan-hint">' + icon('shield') + '<span>في تطبيق أندرويد، تُفعّل الكاميرا الأصلية تلقائياً لقراءة الكود والـ QR. الإدخال اليدوي متاح دائماً.</span></div>' +
  '<form id="manual-scan">' +
    '<label class="field-label" for="barcode-input">أو اكتب الكود يدويًا</label>' +
    '<div class="input-with-btn">' +
      '<input class="field ltr" id="barcode-input" placeholder="ES-PLA-WH-1KG" autocomplete="off" required>' +
      '<button class="primary-btn" type="submit" aria-label="بحث عن الكود">' + icon('search') + '</button>' +
    '</div>' +
    '<div class="inline-error" id="scan-error" role="alert"></div>' +
  '</form>' +
  (firstProd ?
    '<div class="section-heading" style="margin-top:5px"><h2>آخر منتج في المخزن</h2></div>' +
    '<button class="scan-shortcut" data-product="' + firstProd.id + '">' +
      icon('clock') +
      '<span><b>' + esc(firstProd.brand) + ' · ' + esc(firstProd.color_name || firstProd.color) + '</b>' +
      '<small>متاح ' + (firstProd.available_qty !== undefined ? firstProd.available_qty : firstProd.stock) + ' بكرة · رف ' + esc(firstProd.location || 'A-01') + '</small></span>' +
      icon('left') +
    '</button>' : '');
}`;

const renderScannerNew = `function renderScanner() {
  const firstProd = getProducts()[0];
  return '<div class="scanner-screen" style="padding:16px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-bottom:12px">' +
      '<span style="font-weight:700;font-size:13px;color:#fff">ماسح الكاميرا الحي (QR & Barcode)</span>' +
      '<span class="demo-label" style="position:static">' + (isLive() ? 'كاميرا نشطة' : 'تجريبي') + '</span>' +
    '</div>' +
    '<div id="qr-camera-viewport" class="camera-viewport-box">' +
      '<div id="qr-placeholder" style="display:' + (state.scannerRunning ? 'none' : 'flex') + ';flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center">' +
        icon('scan') +
        '<p style="color:#bbb;margin-top:10px;font-size:12px">وجّه كاميرا الموبايل نحو باركود البكرة</p>' +
        '<button type="button" class="primary-btn" data-action="toggle-camera" style="margin-top:12px;width:auto;padding:8px 18px">' +
          icon('scan') + ' فتح الكاميرا الآن' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div class="camera-controls-bar">' +
      '<button type="button" class="camera-btn ' + (state.scannerRunning ? 'active' : '') + '" data-action="toggle-camera" id="camera-toggle-btn">' +
        icon('scan') + '<span id="camera-toggle-text">' + (state.scannerRunning ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا') + '</span>' +
      '</button>' +
      '<button type="button" class="camera-btn" data-action="flip-camera">' +
        icon('sync') + ' تبديل الكاميرا' +
      '</button>' +
    '</div>' +
    '<div class="inline-error" id="scan-camera-error" style="color:#ff8591;margin-top:8px"></div>' +
  '</div>' +
  '<form id="manual-scan" style="margin-top:16px">' +
    '<label class="field-label" for="barcode-input">أو اكتب الكود / SKU يدويًا</label>' +
    '<div class="input-with-btn">' +
      '<input class="field ltr" id="barcode-input" placeholder="مثال: 6922572200011 أو ES-PLA" autocomplete="off" required>' +
      '<button class="primary-btn" type="submit" aria-label="بحث عن الكود">' + icon('search') + '</button>' +
    '</div>' +
    '<div class="inline-error" id="scan-error" role="alert"></div>' +
  '</form>' +
  '<div class="button-row" style="margin-top:12px">' +
    '<button class="secondary-btn" data-action="open-disburse-wizard">' + icon('plus') + ' صرف يدوي مباشر بدون مسح</button>' +
  '</div>' +
  (firstProd ?
    '<div class="section-heading" style="margin-top:14px"><h2>آخر منتج في المخزن</h2></div>' +
    '<button class="scan-shortcut" data-product="' + firstProd.id + '">' +
      icon('clock') +
      '<span><b>' + esc(firstProd.brand) + ' · ' + esc(firstProd.color_name || firstProd.color) + '</b>' +
      '<small>متاح ' + (firstProd.available_qty !== undefined ? firstProd.available_qty : firstProd.stock) + ' بكرة · رف ' + esc(firstProd.location || 'A-01') + '</small></span>' +
      icon('left') +
    '</button>' : '');
}`;

code = code.replace(renderScannerOld, renderScannerNew);

// 9. Add Camera Controller Functions
const cameraControllerCode = `
// ----------------------------------------------------------------------------
// CAMERA BARCODE / QR SCANNER CONTROLLER (html5-qrcode)
// ----------------------------------------------------------------------------
function playBeepSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.16);
  } catch (e) {}
}

async function startCameraScanner() {
  const container = document.getElementById('qr-camera-viewport');
  if (!container || !window.Html5Qrcode) return;

  if (state.scannerInstance && state.scannerRunning) return;

  try {
    if (!state.scannerInstance) {
      state.scannerInstance = new Html5Qrcode('qr-camera-viewport');
    }

    const ph = document.getElementById('qr-placeholder');
    if (ph) ph.style.display = 'none';

    await state.scannerInstance.start(
      { facingMode: state.scannerFacing },
      {
        fps: 12,
        qrbox: { width: 230, height: 230 }
      },
      (decodedText) => {
        onBarcodeScanned(decodedText);
      },
      () => {}
    );

    state.scannerRunning = true;
    const t = document.getElementById('camera-toggle-text');
    if (t) t.textContent = 'إيقاف الكاميرا';
    const b = document.getElementById('camera-toggle-btn');
    if (b) b.classList.add('active');
  } catch (err) {
    console.warn('Camera error:', err);
    state.scannerRunning = false;
    const ph = document.getElementById('qr-placeholder');
    if (ph) ph.style.display = 'flex';
    const errEl = document.getElementById('scan-camera-error');
    if (errEl) errEl.textContent = 'الكاميرا غير مفعلة: ' + (err.message || 'تحقق من إذن الكاميرا');
    const t = document.getElementById('camera-toggle-text');
    if (t) t.textContent = 'تشغيل الكاميرا';
    const b = document.getElementById('camera-toggle-btn');
    if (b) b.classList.remove('active');
  }
}

async function stopCameraScanner() {
  if (state.scannerInstance && state.scannerRunning) {
    try {
      await state.scannerInstance.stop();
      state.scannerRunning = false;
      const ph = document.getElementById('qr-placeholder');
      if (ph) ph.style.display = 'flex';
      const t = document.getElementById('camera-toggle-text');
      if (t) t.textContent = 'تشغيل الكاميرا';
      const b = document.getElementById('camera-toggle-btn');
      if (b) b.classList.remove('active');
    } catch (e) {}
  }
}

function onBarcodeScanned(code) {
  if (!code) return;
  playBeepSound();
  if (navigator.vibrate) {
    try { navigator.vibrate([100, 50, 100]); } catch (e) {}
  }

  const clean = String(code).trim().toLowerCase();
  const prods = getProducts();
  const match = prods.find(p =>
    (p.barcode && String(p.barcode).trim().toLowerCase() === clean) ||
    (p.sku && String(p.sku).trim().toLowerCase() === clean) ||
    (String(p.id) === clean)
  );

  if (match) {
    stopCameraScanner();
    showScan(match, code);
  } else {
    toast('كود غير مسجل: ' + code);
  }
}
`;

code = code.replace('function renderScanner() {', cameraControllerCode + '\nfunction renderScanner() {');

// 10. Update showScan to include "+ صرف مباشر لعميل" and "تعديل الباركود"
const showScanOld = `function showScan(p) {
  state.selectedProduct = p.id;
  const stock = p.available_qty !== undefined ? p.available_qty : p.stock;
  openModal('تم العثور على المنتج',
    '<div class="scan-result">' +
      '<div class="success-symbol">' + icon('check') + '</div>' +
      productCard(p) +
      '<div class="info-row"><span>الموقع في المخزن</span><b class="ltr">' + esc(p.location || 'A-01') + '</b></div>' +
      '<div class="button-row">' +
        '<button class="primary-btn" data-action="open-scanned">عرض المنتج</button>' +
        '<button class="secondary-btn" data-action="stock-modal">حركة مخزون</button>' +
      '</div>' +
      '<p class="caption-note">قراءة صحيحة • ' + esc(p.sku) + '</p>' +
    '</div>'
  );
}`;

const showScanNew = `function showScan(p, code = '') {
  state.selectedProduct = p.id;
  const stock = p.available_qty !== undefined ? p.available_qty : p.stock;
  openModal('تم قراءة الكود بنجاح',
    '<div class="scan-result">' +
      '<div class="success-symbol">' + icon('check') + '</div>' +
      productCard(p) +
      '<div class="info-row"><span>الباركود الحالي</span><b class="ltr">' + esc(p.barcode || code || '—') + '</b></div>' +
      '<div class="info-row"><span>الموقع في المخزن</span><b class="ltr">' + esc(p.location || 'A-01') + '</b></div>' +
      '<div class="button-row" style="margin-top:14px">' +
        '<button class="primary-btn" data-action="open-disburse-from-product">' + icon('plus') + 'صرف مباشر لعميل</button>' +
        '<button class="secondary-btn" data-action="edit-product-modal">' + icon('sliders') + 'تعديل الباركود</button>' +
      '</div>' +
      '<div class="button-row" style="margin-top:8px">' +
        '<button class="secondary-btn" data-action="open-scanned">عرض تفاصيل المخزن</button>' +
      '</div>' +
      '<p class="caption-note">كود مقروء بنجاح • ' + esc(p.sku) + '</p>' +
    '</div>'
  );
}`;
code = code.replace(showScanOld, showScanNew);

// 11. Custody Renderer
const custodyRendererCode = `
// ----------------------------------------------------------------------------
// 7. CUSTODIAN SCREEN (بيان العهدة الشخصية والمخزن الميداني)
// ----------------------------------------------------------------------------
function renderCustody() {
  const history = (window.EnzaDB ? JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]') : []);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMovements = history.filter(m => (m.created_at || '').startsWith(todayStr));

  const disbursedTodayQty = todayMovements
    .filter(m => m.type === 'disburse_to_customer')
    .reduce((s, m) => s + (m.qty || 0), 0);

  const collectedCashToday = todayMovements
    .filter(m => m.type === 'disburse_to_customer')
    .reduce((s, m) => s + (m.cash_collected || 0), 0);

  const totalRemainingDebt = history
    .filter(m => m.type === 'disburse_to_customer')
    .reduce((s, m) => s + (m.cash_remaining || 0), 0);

  const custodianTotalSpools = Math.max(0, 15 - disbursedTodayQty);

  return '<div class="greeting">' +
    '<div><h2>بيان العهدة الشخصية <span aria-hidden="true">📋</span></h2><p>رصيد بكراتك، الخزينة، والتحصيلات الميدانية.</p></div>' +
    '<span class="mode-badge live">المخزن الميداني</span>' +
  '</div>' +
  '<div class="custody-summary-grid">' +
    '<div class="custody-stat-box highlight-green">' +
      '<small>المتحصلات النقدية اليوم</small>' +
      '<strong>' + money(collectedCashToday) + ' <small style="display:inline;font-size:11px">ج.م</small></strong>' +
    '</div>' +
    '<div class="custody-stat-box highlight-red">' +
      '<small>متبقيات آجلة طرف العملاء</small>' +
      '<strong>' + money(totalRemainingDebt) + ' <small style="display:inline;font-size:11px">ج.م</small></strong>' +
    '</div>' +
    '<div class="custody-stat-box">' +
      '<small>بكرات متوفرة في العهدة</small>' +
      '<strong>' + custodianTotalSpools + ' <small style="display:inline;font-size:11px">بكرة</small></strong>' +
    '</div>' +
    '<div class="custody-stat-box">' +
      '<small>إجمالي المنصرف اليوم</small>' +
      '<strong>' + disbursedTodayQty + ' <small style="display:inline;font-size:11px">بكرة</small></strong>' +
    '</div>' +
  '</div>' +
  '<div class="button-row" style="margin-bottom:18px">' +
    '<button class="primary-btn" data-action="open-disburse-wizard">' + icon('plus') + ' صرف طلب مباشر لعميل</button>' +
    '<button class="secondary-btn" data-action="restock-custody-modal">' + icon('box') + ' استلام بكرات للعهدة</button>' +
  '</div>' +
  '<div class="section-heading"><h2>سجل حركات العهدة اليومية</h2></div>' +
  (history.length > 0 ?
    '<section class="panel">' +
      history.slice(0, 10).map(m => {
        const prod = pBy(m.variant_id);
        const prodTitle = prod ? (prod.brand + ' ' + (prod.color_name || prod.color)) : 'بكرة فيلامينت';
        const isDisburse = m.type === 'disburse_to_customer';
        return '<div class="movement-log-item">' +
          '<div>' +
            '<b>' + (isDisburse ? 'صرف لعميل • ' : 'استلام من المخزن • ') + esc(prodTitle) + '</b>' +
            '<small>' + (m.created_at ? new Date(m.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit'}) : 'اليوم') +
            ' · كمية: ' + m.qty + ' بكرة' +
            (isDisburse ? ' · دفع: ' + money(m.cash_collected) + ' ج.م' + (m.cash_remaining > 0 ? ' (باقي: ' + money(m.cash_remaining) + ' ج.م)' : '') : '') +
            '</small>' +
          '</div>' +
          '<span class="badge" style="background:' + (isDisburse ? 'var(--rose);color:var(--red)' : 'var(--green-bg);color:var(--green)') + '">' +
            (isDisburse ? '- ' + m.qty : '+ ' + m.qty) +
          '</span>' +
        '</div>';
      }).join('') +
    '</section>' :
    empty('لا توجد حركات عهدة اليوم', 'اضغط على زر «صرف طلب مباشر لعميل» لتسجيل أول حركة صرف.'));
}
`;

code = code.replace('function renderActivity() {', custodyRendererCode + '\nfunction renderActivity() {');

// 12. Add custody to renderers
code = code.replace(
  `  scanner: renderScanner,
  activity: renderActivity,`,
  `  scanner: renderScanner,
  custody: renderCustody,
  activity: renderActivity,`
);

// 13. Update advanceOrderModal to include Waybill and Cash Collection proofs
const advanceOrderModalOld = `function advanceOrderModal() {
  const o = oBy(state.selectedOrder);
  if (!o) return;
  const status = o.fulfillment_status || o.status || 'new';
  const keys = ['new', 'preparing', 'shipped', 'delivered'];
  const next = keys[keys.indexOf(status) + 1];
  if (!next) return;
  const ref = o.display_number || ('#EN-' + o.id);

  openModal('تحديث حالة الطلب',
    '<div class="success-text">' +
      '<div class="success-symbol">' + icon(next === 'shipped' ? 'truck' : 'box') + '</div>' +
      '<h3>' + esc(ref) + '</h3>' +
      '<p>سيتم نقل الطلب إلى «' + statusNames[next] + '».</p>' +
    '</div>' +
    '<div class="button-row">' +
      '<button class="primary-btn" data-action="confirm-advance-order">تأكيد التحديث</button>' +
      '<button class="secondary-btn" data-action="close-modal">رجوع</button>' +
    '</div>' +
    (isLive() ?
      '<p class="caption-note">يتم حفظ الحالة في قاعدة البيانات كحالة تشغيلية محلية.</p>' :
      '<p class="caption-note">لا يتم خصم المخزون أو تحديث Odoo في النموذج.</p>')
  );
}`;

const advanceOrderModalNew = `function advanceOrderModal() {
  const o = oBy(state.selectedOrder);
  if (!o) return;
  const status = o.fulfillment_status || o.status || 'new';
  const keys = ['new', 'preparing', 'shipped', 'delivered'];
  const next = keys[keys.indexOf(status) + 1];
  if (!next) return;
  const ref = o.display_number || ('#EN-' + o.id);
  const ops = getOrderOps(o);

  state.advanceWaybillBase64 = null;
  state.advancePaymentProofBase64 = null;

  let extraInputs = '';
  if (next === 'shipped') {
    extraInputs = '<div style="margin:16px 0;text-align:right">' +
      '<label class="field-label" for="advance-waybill-file">📷 تصوير / رفع بوليصة الشحن (اختياري)</label>' +
      '<input type="file" accept="image/*" capture="environment" id="advance-waybill-file" class="field">' +
      '<div id="advance-waybill-preview" style="margin-top:8px"></div>' +
    '</div>';
  } else if (next === 'delivered') {
    extraInputs = '<div style="margin:16px 0;text-align:right">' +
      '<label class="field-label" for="advance-cash-collected">💵 المبلغ المحصل من العميل (ج.م)</label>' +
      '<input type="number" id="advance-cash-collected" class="field ltr" value="' + ops.remaining + '" required>' +
      '<label class="field-label" for="advance-receipt-file" style="margin-top:10px">📷 تصوير إيصال التحصيل أو النقدية (اختياري)</label>' +
      '<input type="file" accept="image/*" capture="environment" id="advance-receipt-file" class="field">' +
      '<div id="advance-receipt-preview" style="margin-top:8px"></div>' +
    '</div>';
  }

  openModal('تحديث حالة الطلب',
    '<div class="success-text">' +
      '<div class="success-symbol">' + icon(next === 'shipped' ? 'truck' : next === 'delivered' ? 'check' : 'box') + '</div>' +
      '<h3>' + esc(ref) + '</h3>' +
      '<p>سيتم نقل الطلب إلى «<b>' + statusNames[next] + '</b>».</p>' +
    '</div>' +
    extraInputs +
    '<div class="button-row" style="margin-top:16px">' +
      '<button class="primary-btn" data-action="confirm-advance-order">تأكيد ونقل الطلب</button>' +
      '<button class="secondary-btn" data-action="close-modal">رجوع</button>' +
    '</div>' +
    '<p class="caption-note">يتم حفظ الحالة وصور البوليصة والتحصيل مباشرة في النظام.</p>'
  );
}`;

code = code.replace(advanceOrderModalOld, advanceOrderModalNew);

// 14. Update confirm-advance-order action handler
const confirmAdvanceOld = `    case 'confirm-advance-order': {
      const o = oBy(state.selectedOrder);
      if (!o) break;
      const status = o.fulfillment_status || o.status || 'new';
      const keys = ['new', 'preparing', 'shipped', 'delivered'];
      const next = keys[keys.indexOf(status) + 1];
      if (!next) break;

      if (isLive()) {
        try {
          b.disabled = true;
          b.textContent = 'جارٍ الحفظ...';
          await window.EnzaDB.orders.updateFulfillmentStatus(o.id, next);
          o.fulfillment_status = next;
          closeModal();
          render(false);
          toast('تم تحديث حالة الطلب في قاعدة البيانات إلى ' + statusNames[next]);
        } catch (err) {
          toast('فشل التحديث: ' + err.message);
          b.disabled = false;
        }
      } else {
        o.status = next;
        demoEvents.unshift({
          title: 'تحديث الطلب #' + (o.display_number || ('EN-' + o.id)),
          text: statusNames[next] + ' • تعديل داخل المعاينة',
          time: '09:41',
          icon: 'orders'
        });
        closeModal();
        render(false);
        toast('تم تحديث حالة الطلب في المعاينة');
      }
      break;
    }`;

const confirmAdvanceNew = `    case 'confirm-advance-order': {
      const o = oBy(state.selectedOrder);
      if (!o) break;
      const status = o.fulfillment_status || o.status || 'new';
      const keys = ['new', 'preparing', 'shipped', 'delivered'];
      const next = keys[keys.indexOf(status) + 1];
      if (!next) break;

      const ops = getOrderOps(o);
      let updatedPaid = ops.paid;
      let updatedRemaining = ops.remaining;

      if (next === 'delivered') {
        const cashVal = Number($('#advance-cash-collected')?.value || ops.remaining);
        updatedPaid = ops.paid + cashVal;
        updatedRemaining = Math.max(0, total(o) - updatedPaid);
      }

      if (isLive()) {
        try {
          b.disabled = true;
          b.textContent = 'جارٍ الحفظ...';
          await window.EnzaDB.orders.updateOperationalData({
            orderId: o.id,
            status: next,
            paidAmount: updatedPaid,
            remainingAmount: updatedRemaining,
            waybillImageUrl: state.advanceWaybillBase64 || ops.waybill,
            paymentProofUrl: state.advancePaymentProofBase64 || ops.paymentProof
          });

          o.fulfillment_status = next;
          o.paid_amount = updatedPaid;
          o.remaining_amount = updatedRemaining;
          if (state.advanceWaybillBase64) o.waybill_image_url = state.advanceWaybillBase64;
          if (state.advancePaymentProofBase64) o.payment_proof_url = state.advancePaymentProofBase64;

          closeModal();
          render(false);
          toast('تم تحديث الطلب بنجاح إلى ' + statusNames[next]);
        } catch (err) {
          toast('فشل التحديث: ' + err.message);
          b.disabled = false;
        }
      } else {
        o.status = next;
        o.paid_amount = updatedPaid;
        o.remaining_amount = updatedRemaining;
        if (state.advanceWaybillBase64) o.waybill_image_url = state.advanceWaybillBase64;
        if (state.advancePaymentProofBase64) o.payment_proof_url = state.advancePaymentProofBase64;

        closeModal();
        render(false);
        toast('تم تحديث حالة الطلب في المعاينة');
      }
      break;
    }`;

code = code.replace(confirmAdvanceOld, confirmAdvanceNew);

// 15. Update editProductModal to include Barcode input and Scan button
const editProdOld = `      '<label class="field-label" for="edit-price">سعر البيع على المتجر (ج.م)</label>' +
      '<input id="edit-price" class="field ltr" type="number" min="0" step="10" value="' + price + '" required>' +`;

const editProdNew = `      '<label class="field-label" for="edit-barcode">باركود المنتج (Barcode)</label>' +
      '<div class="input-with-btn">' +
        '<input id="edit-barcode" class="field ltr" placeholder="مثال: 6922572200011" value="' + esc(p.barcode || '') + '">' +
        '<button type="button" class="secondary-btn" data-action="scan-into-barcode" style="width:auto;padding:0 12px">' +
          icon('scan') + ' مسح' +
        '</button>' +
      '</div>' +
      '<label class="field-label" for="edit-price">سعر البيع على المتجر (ج.م)</label>' +
      '<input id="edit-price" class="field ltr" type="number" min="0" step="10" value="' + price + '" required>' +`;

code = code.replace(editProdOld, editProdNew);

// 16. Update edit-product-form submit handler to update Barcode
const editSubmitOld = `      await window.EnzaDB.products.updateStore({
        id: p.id,
        externalId: p.external_id,
        price: newPrice,
        isPublished: isPub,
        imageUrl: state.editImageBase64
      });

      p.sale_price = newPrice;
      p.is_published = isPub;
      if (state.editImageBase64) p.image_url = state.editImageBase64;`;

const editSubmitNew = `      const newBarcode = $('#edit-barcode')?.value.trim();

      await window.EnzaDB.products.updateStore({
        id: p.id,
        externalId: p.external_id,
        price: newPrice,
        isPublished: isPub,
        imageUrl: state.editImageBase64
      });

      if (newBarcode !== undefined) {
        await window.EnzaDB.products.updateBarcode({
          id: p.id,
          externalId: p.external_id,
          barcode: newBarcode
        });
        p.barcode = newBarcode;
      }

      p.sale_price = newPrice;
      p.is_published = isPub;
      if (state.editImageBase64) p.image_url = state.editImageBase64;`;

code = code.replace(editSubmitOld, editSubmitNew);

// 17. Add Manual Disbursement Modal & Controller
const disburseModalCode = `
// ----------------------------------------------------------------------------
// MANUAL DISBURSEMENT WIZARD (طريقة الصرف اليدوي وإضافة عميل)
// ----------------------------------------------------------------------------
function openDisbursementModal(preselectedProduct = null) {
  state.disburseCustomerTab = 'existing';
  state.disburseSelectedCustomer = null;
  state.disburseSelectedProduct = preselectedProduct?.id || getProducts()[0]?.id || null;
  const prod = pBy(state.disburseSelectedProduct);
  state.disburseUnitPrice = prod ? (prod.sale_price !== undefined ? prod.sale_price : prod.price) : 850;
  state.disburseQty = 1;
  state.disbursePaidAmount = state.disburseUnitPrice;
  state.disburseWaybillBase64 = null;

  renderDisbursementModal();
}

function renderDisbursementModal() {
  const prods = getProducts();
  const custs = getCustomers();
  const selectedProd = pBy(state.disburseSelectedProduct) || prods[0];
  if (!selectedProd) {
    toast('لا توجد منتجات مسجلة بالمخزن');
    return;
  }

  const unitPrice = state.disburseUnitPrice !== undefined ? Number(state.disburseUnitPrice) : Number(selectedProd.sale_price || selectedProd.price || 850);
  const qty = Number(state.disburseQty || 1);
  const totalVal = unitPrice * qty;
  const paidVal = state.disbursePaidAmount !== undefined ? Number(state.disbursePaidAmount) : totalVal;
  const remainingVal = Math.max(0, totalVal - paidVal);

  let custContent = '';
  if (state.disburseCustomerTab === 'existing') {
    const selectedCust = cBy(state.disburseSelectedCustomer);
    custContent = '<div class="field-label">اختر العميل المسجل</div>' +
      '<input type="search" id="disb-cust-search" class="field" placeholder="ابحث باسم العميل أو رقمه...">' +
      '<div class="cust-select-list" id="disb-cust-list">' +
        custs.slice(0, 15).map(c =>
          '<button type="button" class="cust-select-item ' + (String(state.disburseSelectedCustomer) === String(c.id) ? 'selected' : '') + '" data-action="select-disburse-customer" data-id="' + c.id + '">' +
            '<div><b>' + esc(c.display_name || c.name) + '</b><small>' + esc(c.phone_e164 || '') + ' · ' + esc(c.city || '') + '</small></div>' +
            (String(state.disburseSelectedCustomer) === String(c.id) ? icon('check') : icon('left')) +
          '</button>'
        ).join('') +
      '</div>' +
      (selectedCust ?
        '<div style="margin-top:8px;padding:8px 12px;background:#eaf3ed;border-radius:10px;font-size:11px;color:var(--green)">' +
          'تم اختيار: <b>' + esc(selectedCust.display_name || selectedCust.name) + '</b> (' + esc(selectedCust.city || '') + ')' +
        '</div>' :
        '<div class="inline-error" id="disb-cust-error">يرجى اختيار عميل من القائمة</div>');
  } else {
    custContent = '<label class="field-label" for="disb-cust-name">اسم العميل الجديد *</label>' +
      '<input type="text" id="disb-cust-name" class="field" placeholder="مثال: أحمد عبد الله" required>' +
      '<label class="field-label" for="disb-cust-phone">رقم الموبايل *</label>' +
      '<input type="tel" id="disb-cust-phone" class="field ltr" placeholder="+201xxxxxxxxx" required>' +
      '<label class="field-label" for="disb-cust-city">المحافظة / المدينة</label>' +
      '<input type="text" id="disb-cust-city" class="field" placeholder="مثال: القاهرة — مدينة نصر">' +
      '<label class="field-label" for="disb-cust-address">العنوان بالتفصيل</label>' +
      '<input type="text" id="disb-cust-address" class="field" placeholder="اسم الشارع ورقم العمارة">';
  }

  openModal('طلب صرف يدوي ومباشر',
    '<form id="disburse-form">' +
      '<div class="wizard-tabs">' +
        '<button type="button" class="wizard-tab ' + (state.disburseCustomerTab === 'existing' ? 'active' : '') + '" data-action="disburse-tab-existing">عميل مسجل (قديم)</button>' +
        '<button type="button" class="wizard-tab ' + (state.disburseCustomerTab === 'new' ? 'active' : '') + '" data-action="disburse-tab-new">+ عميل جديد</button>' +
      '</div>' +
      custContent +
      '<div class="annotation-rule" style="margin:16px 0;width:100%"></div>' +
      '<label class="field-label" for="disb-product-select">المنتج المراد صرفه</label>' +
      '<select id="disb-product-select" class="field" style="direction:rtl">' +
        prods.map(p =>
          '<option value="' + p.id + '" ' + (String(p.id) === String(selectedProd.id) ? 'selected' : '') + '>' +
            esc(p.brand) + ' — ' + esc(p.name) + ' (' + esc(p.color_name || p.color) + ') [متاح: ' + (p.available_qty !== undefined ? p.available_qty : p.stock) + ']' +
          '</option>'
        ).join('') +
      '</select>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">' +
        '<div>' +
          '<label class="field-label" for="disb-unit-price">سعر البكرة يدوي (ج.م) *</label>' +
          '<input type="number" id="disb-unit-price" class="field ltr" min="1" step="10" value="' + unitPrice + '" required>' +
        '</div>' +
        '<div>' +
          '<label class="field-label" for="disb-qty">الكمية (بكرة) *</label>' +
          '<div class="qty-control" style="background:#fff;border:1px solid #e2e1dd;border-radius:11px;height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 4px">' +
            '<button type="button" data-action="disb-qty-minus" style="width:36px;height:36px;display:grid;place-items:center">' + icon('minus') + '</button>' +
            '<strong id="disb-qty-val" style="font-size:15px">' + qty + '</strong>' +
            '<button type="button" data-action="disb-qty-plus" style="width:36px;height:36px;display:grid;place-items:center">' + icon('plus') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="price-highlight-box">' +
        '<div class="calc-row"><span>إجمالي قيمة الطلب:</span><strong id="disb-total-display" style="font-size:15px">' + money(totalVal) + ' ج.م</strong></div>' +
      '</div>' +
      '<label class="field-label" for="disb-paid-input">المبلغ المدفوع حالياً [دفع كام] (ج.م) *</label>' +
      '<input type="number" id="disb-paid-input" class="field ltr" min="0" step="50" value="' + paidVal + '" required>' +
      '<div class="price-highlight-box" style="background:#fff7f7;border-color:#fcd9dc">' +
        '<div class="calc-row">' +
          '<span>المتبقي على العميل [متبقي كام]:</span>' +
          '<strong id="disb-remaining-display" style="font-size:16px;color:' + (remainingVal > 0 ? 'var(--red)' : 'var(--green)') + '">' +
            money(remainingVal) + ' ج.م' +
          '</strong>' +
        '</div>' +
        '<div id="disb-payment-status-badge" style="margin-top:6px">' +
          (remainingVal === 0 ? '<span class="payment-badge full">✅ خالص بالكامل</span>' :
            paidVal > 0 ? '<span class="payment-badge partial">⚠️ دفع جزئي (متبقي ' + money(remainingVal) + ' ج.م)</span>' :
            '<span class="payment-badge unpaid">⏳ آجل بالكامل (متبقي ' + money(remainingVal) + ' ج.م)</span>') +
        '</div>' +
      '</div>' +
      '<label class="field-label" for="disb-waybill-file">📷 تصوير / رفع بوليصة الشحن (اختياري)</label>' +
      '<input type="file" accept="image/*" capture="environment" id="disb-waybill-file" class="field">' +
      '<div id="disb-waybill-preview"></div>' +
      '<div class="inline-error" id="disb-form-error" role="alert"></div>' +
      '<button type="submit" class="primary-btn" id="disb-submit-btn" style="margin-top:16px">' +
        icon('check') + ' إتمام الصرف والخصم من المخزن' +
      '</button>' +
    '</form>'
  );
}
`;

code = code.replace('function editProductModal() {', disburseModalCode + '\nfunction editProductModal() {');

// 18. Update click listeners in document.addEventListener('click')
const clickHandlersTarget = `    case 'open-scanned':
      closeModal();
      navigate('product');
      break;`;

const clickHandlersAddition = `    case 'open-disburse-wizard':
      openDisbursementModal();
      break;

    case 'open-disburse-from-product':
      openDisbursementModal(pBy(state.selectedProduct));
      break;

    case 'disburse-tab-existing':
      state.disburseCustomerTab = 'existing';
      renderDisbursementModal();
      break;

    case 'disburse-tab-new':
      state.disburseCustomerTab = 'new';
      renderDisbursementModal();
      break;

    case 'select-disburse-customer':
      state.disburseSelectedCustomer = b.dataset.id;
      renderDisbursementModal();
      break;

    case 'disb-qty-plus': {
      state.disburseQty = Math.max(1, (Number(state.disburseQty) || 1) + 1);
      const valEl = $('#disb-qty-val');
      if (valEl) valEl.textContent = state.disburseQty;
      const unit = Number($('#disb-unit-price')?.value || state.disburseUnitPrice);
      const tot = unit * state.disburseQty;
      const totEl = $('#disb-total-display');
      if (totEl) totEl.textContent = money(tot) + ' ج.م';
      const paidInput = $('#disb-paid-input');
      if (paidInput) {
        paidInput.value = tot;
        state.disbursePaidAmount = tot;
      }
      const remEl = $('#disb-remaining-display');
      if (remEl) remEl.textContent = '0 ج.م';
      const bEl = $('#disb-payment-status-badge');
      if (bEl) bEl.innerHTML = '<span class="payment-badge full">✅ خالص بالكامل</span>';
      break;
    }

    case 'disb-qty-minus': {
      state.disburseQty = Math.max(1, (Number(state.disburseQty) || 1) - 1);
      const valEl = $('#disb-qty-val');
      if (valEl) valEl.textContent = state.disburseQty;
      const unit = Number($('#disb-unit-price')?.value || state.disburseUnitPrice);
      const tot = unit * state.disburseQty;
      const totEl = $('#disb-total-display');
      if (totEl) totEl.textContent = money(tot) + ' ج.م';
      const paidInput = $('#disb-paid-input');
      if (paidInput) {
        paidInput.value = tot;
        state.disbursePaidAmount = tot;
      }
      const remEl = $('#disb-remaining-display');
      if (remEl) remEl.textContent = '0 ج.م';
      const bEl = $('#disb-payment-status-badge');
      if (bEl) bEl.innerHTML = '<span class="payment-badge full">✅ خالص بالكامل</span>';
      break;
    }

    case 'toggle-camera':
      if (state.scannerRunning) stopCameraScanner();
      else startCameraScanner();
      break;

    case 'flip-camera':
      state.scannerFacing = state.scannerFacing === 'environment' ? 'user' : 'environment';
      stopCameraScanner().then(() => startCameraScanner());
      break;

    case 'view-proof-image':
      openModal(b.dataset.title || 'معاينة المستند',
        '<div style="text-align:center;padding:10px">' +
          '<img src="' + esc(b.dataset.img) + '" style="max-width:100%;max-height:65vh;border-radius:14px;box-shadow:0 4px 18px rgba(0,0,0,.15)">' +
          '<button class="primary-btn" style="margin-top:16px" data-action="close-modal">إغلاق المعاينة</button>' +
        '</div>'
      );
      break;

    case 'prompt-attach-waybill':
      advanceOrderModal();
      break;

    case 'prompt-attach-receipt':
      advanceOrderModal();
      break;

    case 'scan-into-barcode': {
      openModal('مسح باركود Spool للكاميرا',
        '<div class="scanner-screen" style="padding:16px">' +
          '<div id="mini-barcode-viewport" class="camera-viewport-box" style="min-height:220px"></div>' +
          '<p style="color:#bbb;margin-top:10px;font-size:12px">وجّه الكاميرا نحو باركود البكرة</p>' +
          '<button class="secondary-btn" style="margin-top:12px" data-action="close-modal">إلغاء</button>' +
        '</div>'
      );
      setTimeout(() => {
        if (window.Html5Qrcode) {
          const miniScanner = new Html5Qrcode('mini-barcode-viewport');
          miniScanner.start({ facingMode: 'environment' }, { fps: 12, qrbox: 200 }, (decodedText) => {
            playBeepSound();
            miniScanner.stop();
            closeModal();
            const inp = $('#edit-barcode');
            if (inp) inp.value = decodedText;
            toast('تم التقاط الباركود: ' + decodedText);
          }, () => {});
        }
      }, 300);
      break;
    }

    case 'restock-custody-modal':
      openModal('استلام بكرات للعهدة من المخزن الرئيسي',
        '<p class="sheet-description">اختر البكرات والكمية المحوّلة إلى عهدتك الميدانية.</p>' +
        '<div class="info-row"><span>المخزن المصدر</span><b>المخزن الرئيسي (A-01)</b></div>' +
        '<div class="info-row"><span>المستلم</span><b>' + esc(state.user?.display_name || 'أحمد') + '</b></div>' +
        '<button class="primary-btn" style="margin-top:16px" data-action="close-modal">تأكيد استلام البكرات في العهدة</button>'
      );
      break;
`;

code = code.replace(clickHandlersTarget, clickHandlersTarget + '\n' + clickHandlersAddition);

// 19. Add Input Listeners for Disbursement Form
const inputListenersTarget = `  if (e.target.id === 'stock-qty') {
    updateStockPreview();
  }`;

const inputListenersAddition = `  if (e.target.id === 'disb-cust-search') {
    const term = e.target.value.toLowerCase().trim();
    const custs = getCustomers();
    const list = $('#disb-cust-list');
    if (list) {
      const filtered = custs.filter(c => ((c.display_name || c.name || '') + ' ' + (c.phone_e164 || '') + ' ' + (c.city || '')).toLowerCase().includes(term));
      list.innerHTML = filtered.slice(0, 15).map(c =>
        '<button type="button" class="cust-select-item ' + (String(state.disburseSelectedCustomer) === String(c.id) ? 'selected' : '') + '" data-action="select-disburse-customer" data-id="' + c.id + '">' +
          '<div><b>' + esc(c.display_name || c.name) + '</b><small>' + esc(c.phone_e164 || '') + ' · ' + esc(c.city || '') + '</small></div>' +
          (String(state.disburseSelectedCustomer) === String(c.id) ? icon('check') : icon('left')) +
        '</button>'
      ).join('');
    }
  }

  if (e.target.id === 'disb-unit-price' || e.target.id === 'disb-paid-input') {
    const unit = Number($('#disb-unit-price')?.value || 0);
    state.disburseUnitPrice = unit;
    const qty = Number(state.disburseQty || 1);
    const tot = unit * qty;
    const totEl = $('#disb-total-display');
    if (totEl) totEl.textContent = money(tot) + ' ج.م';

    const paid = Number($('#disb-paid-input')?.value || 0);
    state.disbursePaidAmount = paid;
    const remaining = Math.max(0, tot - paid);

    const remEl = $('#disb-remaining-display');
    if (remEl) {
      remEl.textContent = money(remaining) + ' ج.م';
      remEl.style.color = remaining > 0 ? 'var(--red)' : 'var(--green)';
    }

    const badge = $('#disb-payment-status-badge');
    if (badge) {
      if (remaining === 0) badge.innerHTML = '<span class="payment-badge full">✅ خالص بالكامل</span>';
      else if (paid > 0) badge.innerHTML = '<span class="payment-badge partial">⚠️ دفع جزئي (متبقي ' + money(remaining) + ' ج.م)</span>';
      else badge.innerHTML = '<span class="payment-badge unpaid">⏳ آجل بالكامل (متبقي ' + money(remaining) + ' ج.م)</span>';
    }
  }`;

code = code.replace(inputListenersTarget, inputListenersTarget + '\n' + inputListenersAddition);

// 20. Add Change Listeners for Waybill & Receipt uploads
const changeListenersTarget = `  if (e.target.id === 'edit-image-file' && e.target.files?.[0]) {`;
const changeListenersAddition = `  if (e.target.id === 'disb-product-select') {
    state.disburseSelectedProduct = e.target.value;
    const prod = pBy(e.target.value);
    if (prod) {
      state.disburseUnitPrice = prod.sale_price !== undefined ? prod.sale_price : prod.price;
      const unitInp = $('#disb-unit-price');
      if (unitInp) unitInp.value = state.disburseUnitPrice;
      const tot = state.disburseUnitPrice * (Number(state.disburseQty) || 1);
      const totEl = $('#disb-total-display');
      if (totEl) totEl.textContent = money(tot) + ' ج.م';
      const paidInp = $('#disb-paid-input');
      if (paidInp) paidInp.value = tot;
      const remEl = $('#disb-remaining-display');
      if (remEl) remEl.textContent = '0 ج.م';
    }
  }

  if (e.target.id === 'disb-waybill-file' && e.target.files?.[0]) {
    const reader = new FileReader();
    reader.onload = ev => {
      state.disburseWaybillBase64 = ev.target.result;
      const box = $('#disb-waybill-preview');
      if (box) box.innerHTML = '<img src="' + ev.target.result + '" style="max-height:80px;border-radius:8px;margin-top:6px;border:1px solid #ddd">';
    };
    reader.readAsDataURL(e.target.files[0]);
  }

  if (e.target.id === 'advance-waybill-file' && e.target.files?.[0]) {
    const reader = new FileReader();
    reader.onload = ev => {
      state.advanceWaybillBase64 = ev.target.result;
      const box = $('#advance-waybill-preview');
      if (box) box.innerHTML = '<img src="' + ev.target.result + '" style="max-height:80px;border-radius:8px;margin-top:6px;border:1px solid #ddd">';
    };
    reader.readAsDataURL(e.target.files[0]);
  }

  if (e.target.id === 'advance-receipt-file' && e.target.files?.[0]) {
    const reader = new FileReader();
    reader.onload = ev => {
      state.advancePaymentProofBase64 = ev.target.result;
      const box = $('#advance-receipt-preview');
      if (box) box.innerHTML = '<img src="' + ev.target.result + '" style="max-height:80px;border-radius:8px;margin-top:6px;border:1px solid #ddd">';
    };
    reader.readAsDataURL(e.target.files[0]);
  }
`;

code = code.replace(changeListenersTarget, changeListenersAddition + '\n' + changeListenersTarget);

// 21. Add Submit Listener for #disburse-form
const submitListenerTarget = `  // 1. Barcode Manual Search
  if (e.target.id === 'manual-scan') {`;

const disburseSubmitCode = `  // DISBURSE FORM SUBMISSION
  if (e.target.id === 'disburse-form') {
    const btn = $('#disb-submit-btn');
    const errBox = $('#disb-form-error');
    errBox.textContent = '';

    const variantId = $('#disb-product-select')?.value;
    const unitPrice = Number($('#disb-unit-price')?.value);
    const qty = Number(state.disburseQty || 1);
    const totalAmount = unitPrice * qty;
    const paidAmount = Number($('#disb-paid-input')?.value || 0);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    let customerId = state.disburseSelectedCustomer;
    let customerName = '';

    if (state.disburseCustomerTab === 'new') {
      const custName = $('#disb-cust-name')?.value.trim();
      const custPhone = $('#disb-cust-phone')?.value.trim();
      const custCity = $('#disb-cust-city')?.value.trim();
      const custAddress = $('#disb-cust-address')?.value.trim();

      if (!custName) {
        errBox.textContent = 'يرجى كتابة اسم العميل الجديد.';
        return;
      }
      customerName = custName;

      try {
        btn.disabled = true;
        btn.textContent = 'جارٍ تسجيل العميل...';
        if (isLive()) {
          const newC = await window.EnzaDB.customers.create({
            displayName: custName,
            phone: custPhone,
            city: custCity,
            address: custAddress
          });
          customerId = newC.id;
          state.liveCustomers.unshift(newC);
        } else {
          customerId = Date.now();
          demoCustomers.unshift({
            id: customerId,
            name: custName,
            display_name: custName,
            phone: custPhone,
            city: custCity || 'القاهرة',
            area: custCity || 'القاهرة',
            address: custAddress || 'عنوان تجريبي',
            color: 'red'
          });
        }
      } catch (err) {
        errBox.textContent = 'فشل تسجيل العميل: ' + err.message;
        btn.disabled = false;
        return;
      }
    } else {
      if (!customerId) {
        errBox.textContent = 'يرجى اختيار عميل مسجل من القائمة.';
        return;
      }
      const c = cBy(customerId);
      customerName = c ? (c.display_name || c.name) : 'العميل';
    }

    try {
      btn.disabled = true;
      btn.textContent = 'جارٍ تسجيل الصرف وخصم الرصيد...';

      let createdOrder = null;
      if (isLive()) {
        createdOrder = await window.EnzaDB.orders.createManualDisbursement({
          customerId: customerId,
          variantId: variantId,
          qty: qty,
          unitPrice: unitPrice,
          totalAmount: totalAmount,
          paidAmount: paidAmount,
          remainingAmount: remainingAmount,
          waybillImageUrl: state.disburseWaybillBase64
        });
      } else {
        const prod = pBy(variantId);
        if (prod) prod.stock = Math.max(0, (prod.stock || 0) - qty);
        createdOrder = {
          id: Date.now(),
          display_number: 'EN-DIS-' + Math.floor(1000 + Math.random() * 9000),
          cid: customerId,
          status: 'shipped',
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          waybill_image_url: state.disburseWaybillBase64,
          placed_at: new Date().toISOString(),
          shipping: 0,
          items: [[variantId, qty]]
        };
        demoOrders.unshift(createdOrder);
      }

      // Record in local custodian history
      const mov = {
        id: 'cm_' + Date.now(),
        variant_id: variantId,
        type: 'disburse_to_customer',
        qty: qty,
        cash_collected: paidAmount,
        cash_remaining: remainingAmount,
        customer_name: customerName,
        created_at: new Date().toISOString()
      };
      try {
        const hist = JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]');
        hist.unshift(mov);
        localStorage.setItem('enza_custodian_movements', JSON.stringify(hist));
      } catch (e) {}

      closeModal();
      if (isLive()) await loadLiveData();
      render(false);

      toast('تم صرف ' + qty + ' بكرة بنجاح للعميل ' + customerName + '!');

      // Show receipt modal
      setTimeout(() => {
        openModal('إيصال الصرف المباشر',
          '<div class="success-text">' +
            '<div class="success-symbol">' + icon('check') + '</div>' +
            '<h3>تم الصرف بنجاح</h3>' +
            '<p>العميل: <b>' + esc(customerName) + '</b></p>' +
            '<div class="price-highlight-box" style="margin:14px 0">' +
              '<div class="calc-row"><span>إجمالي القيمة:</span><b>' + money(totalAmount) + ' ج.م</b></div>' +
              '<div class="calc-row"><span>المبلغ المحصل:</span><b style="color:var(--green)">' + money(paidAmount) + ' ج.م</b></div>' +
              '<div class="calc-row"><span>المتبقي الآجل:</span><b style="color:' + (remainingAmount > 0 ? 'var(--red)' : 'var(--muted)') + '">' + money(remainingAmount) + ' ج.م</b></div>' +
            '</div>' +
            '<div class="button-row">' +
              '<button class="primary-btn" data-action="close-modal">تم</button>' +
              '<button class="secondary-btn" data-screen="custody">بيان العهدة</button>' +
            '</div>' +
          '</div>'
        );
      }, 400);

    } catch (err) {
      errBox.textContent = 'فشل إتمام العملية: ' + err.message;
      btn.disabled = false;
    }
    return;
  }
`;

code = code.replace(submitListenerTarget, disburseSubmitCode + '\n' + submitListenerTarget);

// 22. Hook up camera auto-start/stop in render()
const renderTarget = `  $('#screen').innerHTML = '<div class="screen-in">' + (renderers[state.screen] ? renderers[state.screen]() : renderHome()) + '</div>';
  if (resetScroll) $('#screen').scrollTop = 0;`;

const renderAddition = `  $('#screen').innerHTML = '<div class="screen-in">' + (renderers[state.screen] ? renderers[state.screen]() : renderHome()) + '</div>';
  if (resetScroll) $('#screen').scrollTop = 0;

  if (state.screen === 'scanner') {
    setTimeout(startCameraScanner, 300);
  } else {
    stopCameraScanner();
  }`;

code = code.replace(renderTarget, renderAddition);

fs.writeFileSync(appPath, code, 'utf8');
console.log('✅ app.js updated successfully with all operational features!');
