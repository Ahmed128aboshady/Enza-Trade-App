const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const clientPath = path.join(root, 'supabase-client.js');
const appPath = path.join(root, 'app.js');

console.log('--- 1. Updating supabase-client.js ---');
let clientCode = fs.readFileSync(clientPath, 'utf8');

// A. Fix updateStore in supabase-client.js to never crash on missing sync_pending
const oldUpdateStore = `          const { data, error } = await sb
            .from('product_variants')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return { success: true, data };`;

const newUpdateStore = `          let { data, error } = await sb
            .from('product_variants')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

          if (error && (error.code === '42703' || (error.message && (error.message.includes('sync_pending') || error.message.includes('schema cache'))))) {
            delete payload.sync_pending;
            const res2 = await sb.from('product_variants').update(payload).eq('id', id).select().single();
            data = res2.data;
            error = res2.error;
          }

          if (error) throw error;
          return { success: true, data };`;

if (clientCode.includes(oldUpdateStore)) {
  clientCode = clientCode.replace(oldUpdateStore, newUpdateStore);
  console.log('✅ Fixed updateStore resilience');
} else {
  console.warn('⚠️ oldUpdateStore pattern not found (might already be modified)');
}

// B. Replace createManualDisbursement to handle multi-items & resilient schema
const oldDisburseFunc = clientCode.substring(
  clientCode.indexOf('async createManualDisbursement('),
  clientCode.indexOf('// ------------------------------------------------------------------------\n    // CUSTODIAN')
);

const newDisburseFunc = `async createManualDisbursement({ customerId, items = [], totalAmount, paidAmount, remainingAmount }) {
        const sb = getClient();
        if (!sb) throw new Error('Supabase not configured');
        const displayNum = 'EN-DIS-' + Math.floor(1000 + Math.random() * 9000);

        // Starts in 'preparing' (قيد التجهيز) before shipping
        const orderPayload = {
          display_number: displayNum,
          customer_id: customerId,
          placed_at: new Date().toISOString(),
          fulfillment_status: 'preparing',
          payment_method: 'صرف يدوي / مباشر',
          shipping_amount: 0,
          total_amount: Number(totalAmount),
          currency: 'EGP'
        };

        let createdOrder = null;
        try {
          // Attempt insert with operational fields
          const fullPayload = {
            ...orderPayload,
            paid_amount: Number(paidAmount || 0),
            remaining_amount: Number(remainingAmount || 0)
          };
          const { data, error } = await sb.from('orders').insert([fullPayload]).select().single();

          const isMissingCol = error && (
            error.code === '42703' ||
            error.code === 'PGRST204' ||
            (error.message && (error.message.includes('column') || error.message.includes('schema cache')))
          );

          if (isMissingCol) {
            const { data: fbData, error: fbErr } = await sb.from('orders').insert([orderPayload]).select().single();
            if (fbErr) throw fbErr;
            createdOrder = fbData;
            try {
              const localStore = JSON.parse(localStorage.getItem('enza_order_ops') || '{}');
              localStore[createdOrder.id] = {
                paid_amount: Number(paidAmount || 0),
                remaining_amount: Number(remainingAmount || 0)
              };
              localStorage.setItem('enza_order_ops', JSON.stringify(localStore));
            } catch(e){}
          } else if (error) {
            throw error;
          } else {
            createdOrder = data;
          }
        } catch (e) {
          // Fallback if network or DB issue
          const { data: fbData } = await sb.from('orders').insert([orderPayload]).select().single();
          createdOrder = fbData || { id: 'temp_' + Date.now(), display_number: displayNum };
          try {
            const localStore = JSON.parse(localStorage.getItem('enza_order_ops') || '{}');
            localStore[createdOrder.id] = {
              paid_amount: Number(paidAmount || 0),
              remaining_amount: Number(remainingAmount || 0)
            };
            localStorage.setItem('enza_order_ops', JSON.stringify(localStore));
          } catch(e){}
        }

        // Process all line items
        if (createdOrder && Array.isArray(items)) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const vId = item.variantId;
            const q = parseInt(item.qty, 10) || 1;
            const p = Number(item.unitPrice || 0);

            try {
              await sb.from('order_lines').insert([{
                order_id: createdOrder.id,
                variant_id: vId,
                qty: q,
                unit_price: p,
                line_total: p * q,
                label_snapshot: item.name || 'بكرة فيلامينت'
              }]);
            } catch(e) {}

            try {
              await EnzaDB.products.applyMovement({
                variantId: vId,
                direction: 'out',
                qty: q,
                reason: 'صرف يدوي للعميل طلب ' + displayNum
              });
            } catch(e) {}

            try {
              await EnzaDB.custodian.recordMovement({
                variantId: vId,
                type: 'disburse_to_customer',
                qty: q,
                cashCollected: i === 0 ? Number(paidAmount || 0) : 0,
                cashRemaining: i === 0 ? Number(remainingAmount || 0) : 0,
                relatedOrderId: createdOrder.id
              });
            } catch(e) {}
          }
        }

        return createdOrder;
      }
    },
`;

if (oldDisburseFunc) {
  clientCode = clientCode.replace(oldDisburseFunc, newDisburseFunc);
  console.log('✅ Replaced createManualDisbursement with multi-item support');
} else {
  console.error('❌ Could not locate oldDisburseFunc');
}

// C. Add Expenses service to EnzaDB in supabase-client.js
const expensesServiceCode = `
    // ------------------------------------------------------------------------
    // EXPENSES & EXPENSE REPORTS (المصروفات والتقارير)
    // ------------------------------------------------------------------------
    expenses: {
      async list() {
        const sb = getClient();
        if (sb) {
          try {
            const { data, error } = await sb
              .from('expenses')
              .select('*')
              .order('created_at', { ascending: false });
            if (!error && data && data.length > 0) return data;
          } catch(e) {}
        }
        return JSON.parse(localStorage.getItem('enza_expenses') || '[]');
      },

      async create({ title, category, amount, notes = '', receiptImageUrl = null }) {
        const expense = {
          id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          title: title.trim(),
          category: category || 'أخرى',
          amount: Number(amount),
          notes: notes?.trim() || '',
          receipt_image_url: receiptImageUrl || null,
          created_at: new Date().toISOString()
        };

        const sb = getClient();
        if (sb) {
          try {
            const { data, error } = await sb.from('expenses').insert([expense]).select().single();
            if (!error && data) {
              this._saveLocal(data);
              return data;
            }
          } catch(e) {}
        }

        this._saveLocal(expense);
        return expense;
      },

      async delete(id) {
        const sb = getClient();
        if (sb) {
          try {
            await sb.from('expenses').delete().eq('id', id);
          } catch(e) {}
        }
        try {
          const list = JSON.parse(localStorage.getItem('enza_expenses') || '[]');
          const filtered = list.filter(x => String(x.id) !== String(id));
          localStorage.setItem('enza_expenses', JSON.stringify(filtered));
        } catch(e) {}
        return true;
      },

      _saveLocal(exp) {
        try {
          const list = JSON.parse(localStorage.getItem('enza_expenses') || '[]');
          list.unshift(exp);
          localStorage.setItem('enza_expenses', JSON.stringify(list));
        } catch(e) {}
      }
    },
`;

if (!clientCode.includes('expenses: {')) {
  clientCode = clientCode.replace(
    '// ------------------------------------------------------------------------\n    // CUSTODIAN',
    expensesServiceCode + '\n    // ------------------------------------------------------------------------\n    // CUSTODIAN'
  );
  console.log('✅ Added expenses service to EnzaDB');
}

fs.writeFileSync(clientPath, clientCode, 'utf8');


console.log('--- 2. Updating app.js ---');
let appCode = fs.readFileSync(appPath, 'utf8');

// Extend icons with expense icons
if (!appCode.includes("receipt: '<path")) {
  const iconsTarget = `icons = {`;
  const iconsAddition = `icons = {
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-8M16 12h-8M10 16h-2"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  gas: '<path d="M3 22h12M4 9h10M4 5h10a2 2 0 0 1 2 2v15H2V7a2 2 0 0 1 2-2ZM16 11l3-3 3 3v8a2 2 0 0 1-2 2h-1"/>',`;
  appCode = appCode.replace(iconsTarget, iconsAddition);
  console.log('✅ Added receipt and trash icons');
}

// Extend state with disburseItems, expenses
if (!appCode.includes('disburseItems: [],')) {
  appCode = appCode.replace(
    `disburseUnitPrice: 0,
  disburseQty: 1,`,
    `disburseItems: [],
  expenses: [],
  expenseCategoryFilter: 'all',`
  );
  console.log('✅ Extended state with disburseItems and expenses');
}

// Update titles map in renderHeader to include 'expenses'
if (!appCode.includes("expenses: ['المصروفات والتقارير'")) {
  appCode = appCode.replace(
    `custody: ['بيان العهدة', 'المخزن الميداني للمندوب'],`,
    `custody: ['بيان العهدة', 'المخزن الميداني للمندوب'],\n    expenses: ['المصروفات والتقارير', 'سجل المصاريف وإيرادات الخزينة'],`
  );
  if (!appCode.includes("custody: ['بيان العهدة'")) {
    appCode = appCode.replace(
      `login: ['تسجيل الدخول', 'بيانات الشركة للمصرح لهم فقط']`,
      `login: ['تسجيل الدخول', 'بيانات الشركة للمصرح لهم فقط'],\n    custody: ['بيان العهدة', 'المخزن الميداني للمندوب'],\n    expenses: ['المصروفات والتقارير', 'سجل المصاريف وإيرادات الخزينة']`
    );
  }
}

// Update renderNav to include custody & expenses routing
appCode = appCode.replace(
  `const active = ({order:'orders', product:'inventory', customer:'customers', activity:'home', custody:'inventory'})[state.screen] || state.screen;`,
  `const active = ({order:'orders', product:'inventory', customer:'customers', activity:'home', custody:'inventory', expenses:'orders'})[state.screen] || state.screen;`
);

// Add quick Expenses button to Home Screen & Custody Screen
const custodyBannerOld = `'<button class="primary-btn" style="background:#fff;color:var(--ink);padding:6px 12px;font-size:11px;border-radius:10px" data-action="open-disburse-wizard">' +
        '+ صرف مباشر' +
      '</button>' +`;

const custodyBannerNew = `'<div style="display:flex;gap:6px">' +
        '<button class="secondary-btn" style="background:rgba(255,255,255,.15);color:#fff;border-color:transparent;padding:6px 10px;font-size:11px;border-radius:10px" data-screen="expenses">' +
          icon('receipt') + ' المصروفات' +
        '</button>' +
        '<button class="primary-btn" style="background:#fff;color:var(--ink);padding:6px 12px;font-size:11px;border-radius:10px" data-action="open-disburse-wizard">' +
          '+ صرف مباشر' +
        '</button>' +
      '</div>' +`;

if (appCode.includes(custodyBannerOld)) {
  appCode = appCode.replace(custodyBannerOld, custodyBannerNew);
  console.log('✅ Added Expenses button to Home Custody banner');
}

// Replace openDisbursementModal & renderDisbursementModal with Multi-Product Version (NO WAYBILL in first step)
const oldDisburseModalBlock = appCode.substring(
  appCode.indexOf('// MANUAL DISBURSEMENT WIZARD (طريقة الصرف اليدوي وإضافة عميل)'),
  appCode.indexOf('function editProductModal() {')
);

const newDisburseModalBlock = `// MANUAL DISBURSEMENT WIZARD — MULTI-PRODUCT (طريقة الصرف اليدوي وإضافة عميل)
// ----------------------------------------------------------------------------
function openDisbursementModal(preselectedProduct = null) {
  state.disburseCustomerTab = 'existing';
  state.disburseSelectedCustomer = null;

  const prods = getProducts();
  const initialProd = preselectedProduct || prods[0];
  const initialPrice = initialProd ? (initialProd.sale_price !== undefined ? initialProd.sale_price : initialProd.price) : 850;

  state.disburseItems = [{
    variantId: initialProd?.id || null,
    unitPrice: Number(initialPrice),
    qty: 1
  }];

  state.disbursePaidAmount = Number(initialPrice);
  renderDisbursementModal();
}

function getDisburseTotal() {
  return state.disburseItems.reduce((sum, item) => sum + (Number(item.unitPrice || 0) * (Number(item.qty) || 1)), 0);
}

function renderDisbursementModal() {
  const prods = getProducts();
  const custs = getCustomers();
  if (prods.length === 0) {
    toast('لا توجد منتجات مسجلة بالمخزن');
    return;
  }

  const grandTotal = getDisburseTotal();
  const paidVal = state.disbursePaidAmount !== undefined ? Number(state.disbursePaidAmount) : grandTotal;
  const remainingVal = Math.max(0, grandTotal - paidVal);

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

  // Multi-item rows HTML
  const itemsHtml = state.disburseItems.map((item, idx) => {
    const p = pBy(item.variantId) || prods[0];
    const subtotal = Number(item.unitPrice || 0) * Number(item.qty || 1);
    return '<div class="disb-item-card" data-item-idx="' + idx + '">' +
      '<div class="disb-item-header">' +
        '<b>المنتج #' + (idx + 1) + '</b>' +
        (state.disburseItems.length > 1 ?
          '<button type="button" class="disb-item-remove" data-action="disb-remove-item" data-idx="' + idx + '">' +
            icon('trash') + ' حذف' +
          '</button>' : '') +
      '</div>' +
      '<select class="field disb-item-product" data-idx="' + idx + '" style="direction:rtl">' +
        prods.map(prod =>
          '<option value="' + prod.id + '" ' + (String(prod.id) === String(p.id) ? 'selected' : '') + '>' +
            esc(prod.brand) + ' — ' + esc(prod.name) + ' (' + esc(prod.color_name || prod.color) + ') [متاح: ' + (prod.available_qty !== undefined ? prod.available_qty : prod.stock) + ']' +
          '</option>'
        ).join('') +
      '</select>' +
      '<div class="disb-item-grid">' +
        '<div>' +
          '<label class="field-label" style="margin-top:6px">سعر البكرة يدوي (ج.م) *</label>' +
          '<input type="number" class="field ltr disb-item-price" data-idx="' + idx + '" min="1" step="10" value="' + item.unitPrice + '" required>' +
        '</div>' +
        '<div>' +
          '<label class="field-label" style="margin-top:6px">الكمية (بكرة) *</label>' +
          '<div class="qty-control" style="background:#fff;border:1px solid #e2e1dd;border-radius:11px;height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 4px">' +
            '<button type="button" data-action="item-qty-minus" data-idx="' + idx + '" style="width:36px;height:36px;display:grid;place-items:center">' + icon('minus') + '</button>' +
            '<strong style="font-size:15px">' + item.qty + '</strong>' +
            '<button type="button" data-action="item-qty-plus" data-idx="' + idx + '" style="width:36px;height:36px;display:grid;place-items:center">' + icon('plus') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="disb-item-subtotal">إجمالي البند: <b>' + money(subtotal) + ' ج.م</b></div>' +
    '</div>';
  }).join('');

  openModal('طلب صرف يدوي ومباشر',
    '<form id="disburse-form">' +
      '<div class="wizard-tabs">' +
        '<button type="button" class="wizard-tab ' + (state.disburseCustomerTab === 'existing' ? 'active' : '') + '" data-action="disburse-tab-existing">عميل مسجل (قديم)</button>' +
        '<button type="button" class="wizard-tab ' + (state.disburseCustomerTab === 'new' ? 'active' : '') + '" data-action="disburse-tab-new">+ عميل جديد</button>' +
      '</div>' +
      custContent +
      '<div class="annotation-rule" style="margin:16px 0;width:100%"></div>' +
      '<div class="section-heading" style="margin-bottom:8px"><h2>بكرات ومنتجات الطلب</h2></div>' +
      itemsHtml +
      '<button type="button" class="add-item-btn" data-action="disb-add-item">' +
        icon('plus') + ' إضافة منتج آخر للطلب' +
      '</button>' +
      '<div class="price-highlight-box">' +
        '<div class="calc-row"><span>إجمالي المطلوب لكل المنتجات:</span><strong id="disb-total-display" style="font-size:16px">' + money(grandTotal) + ' ج.م</strong></div>' +
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
      '<p class="caption-note" style="margin:12px 0 6px">📦 بوليصة الشحن يتم تصويرها ورفعها لاحقاً عند نقل الطلب إلى «تم الشحن».</p>' +
      '<div class="inline-error" id="disb-form-error" role="alert"></div>' +
      '<button type="submit" class="primary-btn" id="disb-submit-btn" style="margin-top:10px">' +
        icon('check') + ' إتمام الصرف والخصم من المخزن' +
      '</button>' +
    '</form>'
  );
}
`;

if (oldDisburseModalBlock) {
  appCode = appCode.replace(oldDisburseModalBlock, newDisburseModalBlock);
  console.log('✅ Replaced renderDisbursementModal with multi-product & removed early waybill');
} else {
  console.error('❌ Could not locate oldDisburseModalBlock');
}

// Add Expenses Screen Renderer & Add Expense Modal
const expensesModuleCode = `
// ----------------------------------------------------------------------------
// EXPENSES & FINANCIAL REPORTS SCREEN (جزء المصروفات والتقارير)
// ----------------------------------------------------------------------------
function renderExpenses() {
  const allExp = (window.EnzaDB ? JSON.parse(localStorage.getItem('enza_expenses') || '[]') : []);
  const history = (window.EnzaDB ? JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]') : []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const curMonthStr = new Date().toISOString().slice(0, 7);

  // Calculations
  const todayExp = allExp.filter(x => (x.created_at || '').startsWith(todayStr)).reduce((s, x) => s + Number(x.amount || 0), 0);
  const monthExp = allExp.filter(x => (x.created_at || '').startsWith(curMonthStr)).reduce((s, x) => s + Number(x.amount || 0), 0);

  const collectedToday = history
    .filter(m => m.type === 'disburse_to_customer' && (m.created_at || '').startsWith(todayStr))
    .reduce((s, m) => s + Number(m.cash_collected || 0), 0);

  const netCashToday = collectedToday - todayExp;

  const categories = [
    ['all', 'الكل'],
    ['fuel', 'وقود وبنزين ⛽'],
    ['transit', 'مواصلات وكارتات 🚗'],
    ['shipping', 'شحن وتوصيل 📦'],
    ['maint', 'صيانة 🔧'],
    ['food', 'بوفيه وضيافة ☕'],
    ['other', 'أخرى 📝']
  ];

  const catNames = {
    fuel: 'وقود وبنزين ⛽',
    transit: 'مواصلات وكارتات 🚗',
    shipping: 'شحن وتوصيل 📦',
    maint: 'صيانة 🔧',
    food: 'بوفيه وضيافة ☕',
    other: 'مصروفات أخرى 📝'
  };

  const filteredExp = allExp.filter(x => {
    if (state.expenseCategoryFilter && state.expenseCategoryFilter !== 'all') {
      return x.category === state.expenseCategoryFilter;
    }
    return true;
  });

  return '<div class="greeting">' +
    '<div><h2>المصروفات والتقارير <span aria-hidden="true">📊</span></h2><p>إدارة مصاريف العهدة وتسوية الخزينة اليومية.</p></div>' +
    '<span class="mode-badge live">دفتر المصاريف</span>' +
  '</div>' +
  '<div class="expense-kpi-card">' +
    '<small>صافي النقدية المتبقية بالخزينة اليوم</small>' +
    '<strong>' + money(netCashToday) + ' <small style="display:inline;font-size:13px">ج.م</small></strong>' +
    '<div class="expense-kpi-row">' +
      '<span>متحصلات المبيعات: <b>+' + money(collectedToday) + ' ج.م</b></span>' +
      '<span>إجمالي المصروفات: <b style="color:#ffd3d6">-' + money(todayExp) + ' ج.م</b></span>' +
    '</div>' +
  '</div>' +
  '<div class="custody-summary-grid">' +
    '<div class="custody-stat-box highlight-red">' +
      '<small>مصروفات اليوم</small>' +
      '<strong>' + money(todayExp) + ' <small style="display:inline;font-size:11px">ج.م</small></strong>' +
    '</div>' +
    '<div class="custody-stat-box">' +
      '<small>مصروفات الشهر (' + curMonthStr + ')</small>' +
      '<strong>' + money(monthExp) + ' <small style="display:inline;font-size:11px">ج.م</small></strong>' +
    '</div>' +
  '</div>' +
  '<div class="button-row" style="margin-bottom:18px">' +
    '<button class="primary-btn" data-action="open-add-expense-modal">' + icon('plus') + ' تسجيل مصروف جديد</button>' +
    '<button class="secondary-btn" data-screen="custody">بيان العهدة</button>' +
  '</div>' +
  '<div class="section-heading"><h2>سجل المصروفات (' + filteredExp.length + ')</h2></div>' +
  '<div class="category-chips">' +
    categories.map(([k, label]) =>
      '<button class="category-chip ' + (state.expenseCategoryFilter === k ? 'active' : '') + '" data-action="filter-expense-cat" data-cat="' + k + '">' +
        label +
      '</button>'
    ).join('') +
  '</div>' +
  (filteredExp.length > 0 ?
    filteredExp.map(x => {
      const catLabel = catNames[x.category] || x.category || 'أخرى';
      return '<div class="expense-card">' +
        '<div class="expense-icon">' + icon('receipt') + '</div>' +
        '<div class="expense-info">' +
          '<b>' + esc(x.title) + '</b>' +
          '<small>' + esc(catLabel) + ' · ' + (x.created_at ? new Date(x.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit'}) : 'اليوم') + '</small>' +
          (x.notes ? '<small style="color:var(--ink);margin-top:2px">' + esc(x.notes) + '</small>' : '') +
          (x.receipt_image_url ?
            '<button type="button" class="text-btn" data-action="view-proof-image" data-img="' + esc(x.receipt_image_url) + '" data-title="فاتورة المصروف" style="padding:0;font-size:10px;margin-top:4px;color:var(--blue)">' +
              '📷 عرض الفاتورة المرفقة' +
            '</button>' : '') +
        '</div>' +
        '<div class="expense-amt">' +
          '<strong>-' + money(x.amount) + ' <small>ج.م</small></strong>' +
          '<button type="button" class="icon-btn" data-action="delete-expense" data-id="' + x.id + '" style="margin-top:6px;width:32px;height:32px;color:#aaa" title="حذف">' +
            icon('trash') +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('') :
    empty('لا توجد مصروفات مسجلة', 'اضغط على زر «تسجيل مصروف جديد» لإضافة فواتير أو مصاريف تشغيلية.'));
}

function openAddExpenseModal() {
  state.expenseReceiptBase64 = null;
  openModal('تسجيل مصروف جديد',
    '<form id="expense-form">' +
      '<label class="field-label" for="exp-amount">المبلغ المصروف (ج.م) *</label>' +
      '<input type="number" id="exp-amount" class="field ltr" min="1" step="10" placeholder="مثال: 150" style="font-size:20px;font-weight:700" required>' +
      '<label class="field-label" for="exp-category">تصنيف المصروف *</label>' +
      '<select id="exp-category" class="field" style="direction:rtl" required>' +
        '<option value="fuel">وقود وبنزين ⛽</option>' +
        '<option value="transit">مواصلات وكارتات 🚗</option>' +
        '<option value="shipping">شحن وتوصيل 📦</option>' +
        '<option value="maint">صيانة وإصلاحات 🔧</option>' +
        '<option value="food">بوفيه وطعام وضيافة ☕</option>' +
        '<option value="other">مصروفات تشغيلية أخرى 📝</option>' +
      '</select>' +
      '<label class="field-label" for="exp-title">بيان المصروف *</label>' +
      '<input type="text" id="exp-title" class="field" placeholder="مثال: بنزين للموتوسيكل / كارتة الطريق" required>' +
      '<label class="field-label" for="exp-notes">ملاحظات إضافية</label>' +
      '<input type="text" id="exp-notes" class="field" placeholder="أي تفاصيل أخرى (اختياري)">' +
      '<label class="field-label" for="exp-receipt-file">📷 تصوير الفاتورة / الإيصال</label>' +
      '<input type="file" accept="image/*" capture="environment" id="exp-receipt-file" class="field">' +
      '<div id="exp-receipt-preview" style="margin-top:6px"></div>' +
      '<div class="inline-error" id="exp-form-error" role="alert"></div>' +
      '<button type="submit" class="primary-btn" id="exp-submit-btn" style="margin-top:16px">' +
        icon('check') + ' حفظ المصروف في الخزينة' +
      '</button>' +
    '</form>'
  );
}
`;

if (!appCode.includes('function renderExpenses()')) {
  appCode = appCode.replace(
    'function renderCustody() {',
    expensesModuleCode + '\nfunction renderCustody() {'
  );
  console.log('✅ Added renderExpenses and openAddExpenseModal');
}

// Add expenses to renderers map
appCode = appCode.replace(
  `  scanner: renderScanner,
  custody: renderCustody,`,
  `  scanner: renderScanner,
  custody: renderCustody,
  expenses: renderExpenses,`
);

// Click events additions
const clickEventsTarget = `    case 'open-disburse-wizard':
      openDisbursementModal();
      break;`;

const clickEventsAddition = `    case 'disb-add-item': {
      const prods = getProducts();
      const first = prods[0];
      const pr = first ? (first.sale_price !== undefined ? first.sale_price : first.price) : 850;
      state.disburseItems.push({
        variantId: first?.id || null,
        unitPrice: Number(pr),
        qty: 1
      });
      state.disbursePaidAmount = getDisburseTotal();
      renderDisbursementModal();
      break;
    }

    case 'disb-remove-item': {
      const idx = Number(b.dataset.idx);
      if (state.disburseItems.length > 1) {
        state.disburseItems.splice(idx, 1);
        state.disbursePaidAmount = getDisburseTotal();
        renderDisbursementModal();
      }
      break;
    }

    case 'item-qty-plus': {
      const idx = Number(b.dataset.idx);
      if (state.disburseItems[idx]) {
        state.disburseItems[idx].qty = (Number(state.disburseItems[idx].qty) || 1) + 1;
        state.disbursePaidAmount = getDisburseTotal();
        renderDisbursementModal();
      }
      break;
    }

    case 'item-qty-minus': {
      const idx = Number(b.dataset.idx);
      if (state.disburseItems[idx]) {
        state.disburseItems[idx].qty = Math.max(1, (Number(state.disburseItems[idx].qty) || 1) - 1);
        state.disbursePaidAmount = getDisburseTotal();
        renderDisbursementModal();
      }
      break;
    }

    case 'open-add-expense-modal':
      openAddExpenseModal();
      break;

    case 'filter-expense-cat':
      state.expenseCategoryFilter = b.dataset.cat;
      render(false);
      break;

    case 'delete-expense': {
      const expId = b.dataset.id;
      if (confirm('هل تريد بالتأكيد حذف هذا المصروف؟')) {
        if (window.EnzaDB?.expenses) await window.EnzaDB.expenses.delete(expId);
        render(false);
        toast('تم حذف المصروف بنجاح');
      }
      break;
    }
`;

if (!appCode.includes("case 'disb-add-item':")) {
  appCode = appCode.replace(clickEventsTarget, clickEventsTarget + '\n' + clickEventsAddition);
  console.log('✅ Added multi-item and expense click handlers');
}

// Change & Input listeners for multi-items
const inputTarget = `  if (e.target.id === 'disb-cust-search') {`;
const inputMultiItemCode = `  if (e.target.classList.contains('disb-item-price')) {
    const idx = Number(e.target.dataset.idx);
    if (state.disburseItems[idx]) {
      state.disburseItems[idx].unitPrice = Number(e.target.value || 0);
      const grandTotal = getDisburseTotal();
      const totEl = $('#disb-total-display');
      if (totEl) totEl.textContent = money(grandTotal) + ' ج.م';

      const paid = Number($('#disb-paid-input')?.value || grandTotal);
      state.disbursePaidAmount = paid;
      const rem = Math.max(0, grandTotal - paid);
      const remEl = $('#disb-remaining-display');
      if (remEl) {
        remEl.textContent = money(rem) + ' ج.م';
        remEl.style.color = rem > 0 ? 'var(--red)' : 'var(--green)';
      }
    }
  }
`;

if (!appCode.includes("disb-item-price")) {
  appCode = appCode.replace(inputTarget, inputMultiItemCode + '\n' + inputTarget);
  console.log('✅ Added multi-item price input listener');
}

// Change listener for item product select
const changeTarget = `  if (e.target.id === 'disb-product-select') {`;
const changeMultiItemCode = `  if (e.target.classList.contains('disb-item-product')) {
    const idx = Number(e.target.dataset.idx);
    if (state.disburseItems[idx]) {
      state.disburseItems[idx].variantId = e.target.value;
      const prod = pBy(e.target.value);
      if (prod) {
        const pr = prod.sale_price !== undefined ? prod.sale_price : prod.price;
        state.disburseItems[idx].unitPrice = Number(pr);
      }
      state.disbursePaidAmount = getDisburseTotal();
      renderDisbursementModal();
    }
  }

  if (e.target.id === 'exp-receipt-file' && e.target.files?.[0]) {
    const reader = new FileReader();
    reader.onload = ev => {
      state.expenseReceiptBase64 = ev.target.result;
      const box = $('#exp-receipt-preview');
      if (box) box.innerHTML = '<img src="' + ev.target.result + '" style="max-height:80px;border-radius:8px;margin-top:6px;border:1px solid #ddd">';
    };
    reader.readAsDataURL(e.target.files[0]);
  }
`;

if (!appCode.includes("disb-item-product")) {
  appCode = appCode.replace(changeTarget, changeMultiItemCode + '\n' + changeTarget);
  console.log('✅ Added multi-item product change listener and expense receipt picker');
}

// Replace #disburse-form submit handler with multi-item submission & add #expense-form submit handler
const oldDisburseSubmit = appCode.substring(
  appCode.indexOf("  if (e.target.id === 'disburse-form') {"),
  appCode.indexOf("  // 1. Barcode Manual Search")
);

const newDisburseSubmit = `  // DISBURSE FORM SUBMISSION (MULTI-PRODUCT)
  if (e.target.id === 'disburse-form') {
    const btn = $('#disb-submit-btn');
    const errBox = $('#disb-form-error');
    errBox.textContent = '';

    const grandTotal = getDisburseTotal();
    const paidAmount = Number($('#disb-paid-input')?.value || 0);
    const remainingAmount = Math.max(0, grandTotal - paidAmount);

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

      const lineItems = state.disburseItems.map(item => {
        const p = pBy(item.variantId);
        return {
          variantId: item.variantId,
          qty: Number(item.qty || 1),
          unitPrice: Number(item.unitPrice || 0),
          name: p ? (p.brand + ' ' + (p.color_name || p.color)) : 'بكرة فيلامينت'
        };
      });

      let createdOrder = null;
      if (isLive()) {
        createdOrder = await window.EnzaDB.orders.createManualDisbursement({
          customerId: customerId,
          items: lineItems,
          totalAmount: grandTotal,
          paidAmount: paidAmount,
          remainingAmount: remainingAmount
        });
      } else {
        lineItems.forEach(item => {
          const prod = pBy(item.variantId);
          if (prod) prod.stock = Math.max(0, (prod.stock || 0) - item.qty);
        });
        createdOrder = {
          id: Date.now(),
          display_number: 'EN-DIS-' + Math.floor(1000 + Math.random() * 9000),
          cid: customerId,
          status: 'preparing',
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          placed_at: new Date().toISOString(),
          shipping: 0,
          items: lineItems.map(i => [i.variantId, i.qty])
        };
        demoOrders.unshift(createdOrder);
      }

      // Record in local custodian history for each item
      lineItems.forEach((item, idx) => {
        const mov = {
          id: 'cm_' + Date.now() + '_' + idx,
          variant_id: item.variantId,
          type: 'disburse_to_customer',
          qty: item.qty,
          cash_collected: idx === 0 ? paidAmount : 0,
          cash_remaining: idx === 0 ? remainingAmount : 0,
          customer_name: customerName,
          created_at: new Date().toISOString()
        };
        try {
          const hist = JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]');
          hist.unshift(mov);
          localStorage.setItem('enza_custodian_movements', JSON.stringify(hist));
        } catch(e) {}
      });

      closeModal();
      if (isLive()) await loadLiveData();
      render(false);

      const totalQty = lineItems.reduce((s, i) => s + i.qty, 0);
      toast('تم صرف ' + totalQty + ' قطع بنجاح للعميل ' + customerName + '!');

      // Show receipt modal
      setTimeout(() => {
        openModal('إيصال الصرف المباشر',
          '<div class="success-text">' +
            '<div class="success-symbol">' + icon('check') + '</div>' +
            '<h3>تم تجهيز طلب الصرف بنجاح</h3>' +
            '<p>العميل: <b>' + esc(customerName) + '</b></p>' +
            '<div class="price-highlight-box" style="margin:14px 0">' +
              '<div class="calc-row"><span>عدد الأصناف:</span><b>' + lineItems.length + ' أصناف (' + totalQty + ' قطعة)</b></div>' +
              '<div class="calc-row"><span>إجمالي القيمة:</span><b>' + money(grandTotal) + ' ج.م</b></div>' +
              '<div class="calc-row"><span>المبلغ المحصل:</span><b style="color:var(--green)">' + money(paidAmount) + ' ج.م</b></div>' +
              '<div class="calc-row"><span>المتبقي الآجل:</span><b style="color:' + (remainingAmount > 0 ? 'var(--red)' : 'var(--muted)') + '">' + money(remainingAmount) + ' ج.م</b></div>' +
            '</div>' +
            '<p class="caption-note">يمكنك رفع صورة بوليصة الشحن عند الانتقال لحالة «تم الشحن».</p>' +
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

  // EXPENSE FORM SUBMISSION
  if (e.target.id === 'expense-form') {
    const btn = $('#exp-submit-btn');
    const errBox = $('#exp-form-error');
    errBox.textContent = '';

    const amount = Number($('#exp-amount')?.value);
    const category = $('#exp-category')?.value;
    const title = $('#exp-title')?.value.trim();
    const notes = $('#exp-notes')?.value.trim();

    if (!amount || amount <= 0) {
      errBox.textContent = 'يرجى إدخال مبلغ صحيح.';
      return;
    }
    if (!title) {
      errBox.textContent = 'يرجى إدخال بيان المصروف.';
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = 'جارٍ حفظ المصروف...';

      if (window.EnzaDB?.expenses) {
        await window.EnzaDB.expenses.create({
          title,
          category,
          amount,
          notes,
          receiptImageUrl: state.expenseReceiptBase64
        });
      }

      closeModal();
      render(false);
      toast('تم تسجيل المصروف بنجاح (' + money(amount) + ' ج.م)');
    } catch(err) {
      errBox.textContent = 'فشل الحفظ: ' + err.message;
      btn.disabled = false;
    }
    return;
  }
`;

if (oldDisburseSubmit) {
  appCode = appCode.replace(oldDisburseSubmit, newDisburseSubmit);
  console.log('✅ Replaced disburse submit handler & added expense submit handler');
} else {
  console.error('❌ Could not locate oldDisburseSubmit');
}

fs.writeFileSync(appPath, appCode, 'utf8');
console.log('✅ app.js updated successfully!');
