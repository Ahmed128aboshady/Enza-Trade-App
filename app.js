'use strict';
// ============================================================================
// ENZA MOBILE — CORE APPLICATION LOGIC
// Supports: Live Supabase Integration + Isolated Demo Mode + Arabic RTL Design
// ============================================================================

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalizeSearchText = value => String(value ?? '')
  .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
  .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0))
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/ى/g, 'ي')
  .replace(/ؤ/g, 'و')
  .replace(/ئ/g, 'ي')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();
const matchesSearch = (haystack, query) => {
  const q = normalizeSearchText(query);
  if (!q) return true;
  const h = normalizeSearchText(haystack);
  const hCompact = h.replace(/[\s\-+()]/g, '');
  return q.split(' ').every(tok => h.includes(tok) || hCompact.includes(tok.replace(/[\-+()]/g, '')));
};

const icons = {
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-8M16 12h-8M10 16h-2"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  gas: '<path d="M3 22h12M4 9h10M4 5h10a2 2 0 0 1 2 2v15H2V7a2 2 0 0 1 2-2ZM16 11l3-3 3 3v8a2 2 0 0 1-2 2h-1"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  box: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5"/>',
  orders: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3"/>',
  scan: '<path d="M8 3H4a1 1 0 0 0-1 1v4m13-5h4a1 1 0 0 1 1 1v4M3 16v4a1 1 0 0 0 1 1h4m8 0h4a1 1 0 0 0 1-1v-4M3 12h18M8 7v10M12 7v10M16 7v10"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-4-5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  back: '<path d="m9 5 7 7-7 7M4 12h12"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  sync: '<path d="M20 8a8 8 0 0 0-13-3L3 8m0-5v5h5M4 16a8 8 0 0 0 13 3l4-3m0 5v-5h-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="m10.3 4-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 8c.5 3 2 4.5 5 5l2-2M8 8l2-1M13 13l1 2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  truck: '<path d="M1 4h13v12H1zM14 8h4l4 4v4h-8"/><circle cx="5" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8V5a2 2 0 0 1 2-2h12M21 10h-5v5h5M17 12.5h.01"/>',
  sliders: '<path d="M4 7h16M4 17h16M8 4v6M16 14v6"/>',
  arrow: '<path d="m7 17 10-10M7 7h10v10"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  shield: '<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6z"/><path d="m8 12 3 3 5-6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  logout: '<path d="M9 21H4V3h5M13 7l5 5-5 5M8 12h13"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'
};
const icon = n => '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + (icons[n] || icons.box) + '</svg>';

// ----------------------------------------------------------------------------
// DEMO / MOCK DATA (Retained strictly for isolated Demo Mode)
// ----------------------------------------------------------------------------
const demoProducts = [
  {id:1,name:'PLA+ Filament',brand:'eSUN',category:'esun',color:'أبيض عاجي',hex:'#dddcd4',stock:24,min:5,price:850,sku:'ES-PLA-WH-1KG',barcode:'6922572200011',location:'A-01',type:'spool'},
  {id:2,name:'PLA Basic',brand:'BAMBU LAB',category:'bambu',color:'أخضر غابة',hex:'#537966',stock:3,min:5,price:1250,sku:'BL-PLA-GR-1KG',barcode:'6977258000022',location:'A-03',type:'spool'},
  {id:3,name:'PETG Filament',brand:'eSUN',category:'esun',color:'برتقالي',hex:'#e88d4c',stock:18,min:5,price:950,sku:'ES-PETG-OR-1KG',barcode:'6922572200033',location:'B-02',type:'spool'},
  {id:4,name:'Standard Resin',brand:'eSUN',category:'resin',color:'رمادي • راتنج',hex:'#748897',stock:0,min:4,price:1100,sku:'ES-RES-GY-1KG',barcode:'6922572200044',location:'C-01',type:'bottle'},
  {id:5,name:'PLA Matte',brand:'BAMBU LAB',category:'bambu',color:'أسود فحمي',hex:'#3d4149',stock:42,min:6,price:1350,sku:'BL-MAT-BK-1KG',barcode:'6977258000055',location:'A-04',type:'spool'},
  {id:6,name:'PLA+ Filament',brand:'eSUN',category:'esun',color:'أحمر',hex:'#c7444b',stock:12,min:5,price:850,sku:'ES-PLA-RD-1KG',barcode:'6922572200066',location:'B-01',type:'spool'}
];

const demoCustomers = [];

const demoOrders = [];

const demoEvents = [
  {title:'وصل طلب جديد #EN-1048',text:'عمر مصطفى • ٣ قطع',time:'09:35',icon:'orders'},
  {title:'تم تحديث المنتجات والعملاء',text:'اكتملت المزامنة مع المتجر',time:'09:30',icon:'sync'},
  {title:'مخزون PLA Basic قرب يخلص',text:'متبقي ٣ بكرات • الحد الأدنى ٥',time:'09:30',icon:'alert'},
  {title:'تم تجهيز الطلب #EN-1046',text:'جاهز للمراجعة قبل الشحن',time:'08:55',icon:'box'}
];

const statusNames = {new:'جديد',preparing:'قيد التجهيز',shipped:'تم الشحن',delivered:'تم التسليم',cancelled:'ملغي'};

// ----------------------------------------------------------------------------
// APPLICATION STATE
// ----------------------------------------------------------------------------
const state = {
  // Mode: 'live' (default when Supabase configured and auth active) or 'demo'
  mode: window.localStorage.getItem('enza_mode') || 'live',
  screen: 'home',
  orderFilter: 'all',
  productFilter: 'all',
  query: '',
  selectedOrder: null,
  selectedProduct: null,
  selectedCustomer: null,
  returnScreen: 'home',
  syncFailed: false,
  notifications: true,
  sortReverse: false,
  modal: null,
  movement: 'in',
  qty: 1,
  messageTemplate: 'confirm',
  messageCustomer: null,
  messageOrder: null,

  // Live Supabase data state
  loading: false,
  saving: false,
  loadError: null,
  user: null, // Logged in user profile
  liveProducts: [],
  liveOrders: [],
  liveCustomers: [],
  liveSync: null,
  editImageBase64: null,
  dbInitialized: false,

  // Operational & Scanner additions
  scannerRunning: false,
  scannerInstance: null,
  scannerFacing: 'environment',
  custodyMovements: [],
  disburseCustomerTab: 'existing',
  disburseSelectedCustomer: null,
  disburseSelectedProduct: null,
  disburseItems: [],
  expenses: [],
  expenseCategoryFilter: 'all',
  disbursePaidAmount: 0,
  disburseWaybillBase64: null,
  advanceWaybillBase64: null,
  advancePaymentProofBase64: null
};

// ----------------------------------------------------------------------------
// DATA ACCESSORS (Unified for Live vs Demo)
// ----------------------------------------------------------------------------
function getOrderOps(o) {
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

function isLive() {
  return state.mode === 'live' && window.EnzaDB && window.ENZA_SUPABASE_CONFIG?.isConfigured();
}

function getProducts() {
  if (isLive()) return state.liveProducts;
  return demoProducts;
}

function getCustomers() {
  if (isLive()) return state.liveCustomers;
  return demoCustomers;
}

function getOrders() {
  if (isLive()) return state.liveOrders;
  return demoOrders;
}

const pBy = id => getProducts().find(p => String(p.id) === String(id));
const cBy = id => getCustomers().find(c => String(c.id) === String(id));
const oBy = id => getOrders().find(o => String(o.id) === String(id));

const orderCount = n => n === 1 ? 'طلب واحد' : n === 2 ? 'طلبان' : n + ' طلبات';
const pieceLabel = n => n === 1 ? 'قطعة واحدة' : n === 2 ? 'قطعتان' : n + ' قطع';
const money = v => Number(v || 0).toLocaleString('en-US');
const currency = v => '<span class="money"><small>ج.م</small> ' + money(v) + '</span>';

function total(o) {
  if (o.total_amount !== undefined) return Number(o.total_amount);
  if (o.items) {
    return o.items.reduce((n, [id, q]) => {
      const p = pBy(id);
      return n + (p ? p.price * q : 0);
    }, 0) + (o.shipping || 0);
  }
  return 0;
}

function pieceCount(o) {
  if (o.lines) {
    return o.lines.reduce((n, l) => n + (l.qty || 0), 0);
  }
  if (o.items) {
    return o.items.reduce((n, item) => n + item[1], 0);
  }
  return 0;
}

const formatArabicToday = () => {
  const now = new Date();
  const d = now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const t = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  return d + ' · ' + t;
};
const formatArabicDate = iso => {
  const dt = iso ? new Date(iso) : new Date();
  return isNaN(dt.getTime()) ? new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : dt.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
};
const formatArabicTime = iso => {
  const dt = iso ? new Date(iso) : new Date();
  return isNaN(dt.getTime()) ? new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : dt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
};
const formatArabicDateTime = iso => formatArabicDate(iso) + ' · ' + formatArabicTime(iso);

const getProductPhotoUrl = (p, large = false) => {
  if (!p) return '';
  if (p.image_url && String(p.image_url).trim()) return String(p.image_url).trim();
  if (p.external_id && /^\d+$/.test(String(p.external_id).trim())) {
    return 'https://enza-trade-co.odoo.com/web/image/product.product/' + String(p.external_id).trim() + '/' + (large ? 'image_512' : 'image_256');
  }
  return '';
};

const art = (p, large=false) => {
  if (!p) return '<div class="product-art"></div>';
  const hex = p.hex || p.color_hex || '#dddcd4';
  const type = p.type || 'spool';
  const photoUrl = getProductPhotoUrl(p, large);
  if (photoUrl) {
    return '<div class="product-art real-photo ' + (type === 'bottle' ? 'bottle ' : '') + (large ? 'large' : '') + '" style="--swatch:' + hex + '">' +
      '<img class="product-photo-img" src="' + esc(photoUrl) + '" alt="' + esc(p.name || 'منتج') + '" loading="lazy" onerror="this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'block\';this.parentElement.classList.remove(\'real-photo\')">' +
      '<div class="spool" style="display:none"></div>' +
    '</div>';
  }
  return '<div class="product-art ' + (type === 'bottle' ? 'bottle ' : '') + (large ? 'large' : '') + '" style="--swatch:' + hex + '" aria-label="رسم توضيحي للمنتج"><div class="spool"></div></div>';
};

const avatar = c => {
  const init = c?.initials || (c?.name || c?.display_name || '؟').slice(0, 2);
  const col = c?.color || 'red';
  return '<span class="avatar ' + col + '">' + esc(init) + '</span>';
};

const badge = s => '<span class="badge ' + (s || 'new') + '">' + (statusNames[s] || s || 'جديد') + '</span>';
const stockLabel = p => {
  const stock = p.available_qty !== undefined ? p.available_qty : p.stock;
  const min = p.minimum_qty !== undefined ? p.minimum_qty : p.min;
  return stock === 0 ? 'نفد المخزون' : stock <= min ? 'مخزون منخفض' : 'متوفر';
};
const stockClass = p => {
  const stock = p.available_qty !== undefined ? p.available_qty : p.stock;
  const min = p.minimum_qty !== undefined ? p.minimum_qty : p.min;
  return stock === 0 ? 'out' : stock <= min ? 'low' : '';
};

// ----------------------------------------------------------------------------
// CARD COMPONENTS
// ----------------------------------------------------------------------------
function productCard(p) {
  const stock = p.available_qty !== undefined ? p.available_qty : p.stock;
  const price = p.sale_price !== undefined ? p.sale_price : p.price;
  const color = p.color_name || p.color || 'قياسي';
  const hex = p.hex || p.color_hex || '#dddcd4';
  const unit = p.unit || (p.type === 'bottle' ? 'عبوة' : 'بكرة');

  return '<button class="product-card" data-product="' + p.id + '">' +
    art(p) +
    '<div class="product-info">' +
      '<div class="brand-label">' + esc(p.brand) + '</div>' +
      '<div class="product-name" dir="ltr">' + esc(p.name) + '</div>' +
      '<div class="product-meta" style="display:flex;align-items:center;gap:6px;margin-top:4px">' +
        '<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:' + hex + ';border:1px solid #ccc;flex-shrink:0"></span>' +
        '<b style="color:var(--ink);font-size:11px">' + esc(color) + '</b>' +
        '<span>· ' + esc(p.weight || '١ كجم') + '</span>' +
      '</div>' +
      '<div class="product-stock">' +
        '<span class="stock-number ' + stockClass(p) + '"><span class="stock-dot"></span>' + stock + ' ' + unit + '</span>' +
        '<span class="price">' + money(price) + ' <small>ج.م</small></span>' +
      '</div>' +
    '</div>' +
  '</button>';
}

function orderCard(o, compact=false) {
  const c = o.customer || cBy(o.cid || o.customer_id) || { display_name: 'عميل غير مسجل', city: '', area: '' };
  const custName = c.display_name || c.name || 'عميل';
  const custLoc = (c.area ? c.area + '، ' : '') + (c.city || '');
  const ref = o.display_number || ('#EN-' + o.id);
  const status = o.fulfillment_status || o.status || 'new';
  const time = o.placed_at ? new Date(o.placed_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : (o.time || '');

  let dots = '';
  if (o.lines) {
    dots = o.lines.map(l => '<span style="--swatch:' + (l.variant?.color_hex || '#999') + '"></span>').join('');
  } else if (o.items) {
    dots = o.items.map(([id]) => '<span style="--swatch:' + (pBy(id)?.hex || '#999') + '"></span>').join('');
  }

  return '<div class="order-card" style="cursor:default">' +
    '<button type="button" data-order="' + o.id + '" style="display:block;width:100%;text-align:right;background:none;border:0;padding:0;cursor:pointer">' +
      '<div class="order-top"><span class="order-ref">' + esc(ref) + '</span>' + badge(status) + '</div>' +
      '<div class="order-middle">' +
        '<div><div class="customer-name">' + esc(custName) + '</div><div class="meta">' + esc(custLoc) + '</div></div>' +
        currency(total(o)) +
      '</div>' +
      (!compact ?
        '<div class="order-footer">' +
          '<div class="product-dots">' + dots + '<small>' + pieceLabel(pieceCount(o)) + '</small></div>' +
          '<span class="ltr">' + esc(time) + '</span>' +
        '</div>' : '') +
      (getOrderOps(o).remaining > 0 ?
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding:4px 8px;background:#fff5f5;border-radius:8px;font-size:11px;color:var(--red);border:1px solid #fed7d7">' +
          '<span>دائن / متبقي: <b>' + money(getOrderOps(o).remaining) + ' ج.م</b></span>' +
          '<span style="color:var(--brand);font-weight:600">سداد الدائن ←</span>' +
        '</div>' : '') +
    '</button>' +
    (!compact ?
      '<div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #f1efeb;margin-top:10px;padding-top:8px">' +
        '<button type="button" class="secondary-btn" data-action="open-order-invoice" data-id="' + esc(String(o.id)) + '" style="width:auto;padding:5px 12px;font-size:11px;min-height:32px;border-radius:8px">' +
          icon('receipt') + ' الفاتورة' +
        '</button>' +
        '<button type="button" class="secondary-btn" data-action="delete-order" data-id="' + esc(String(o.id)) + '" style="width:auto;padding:5px 12px;font-size:11px;min-height:32px;border-radius:8px;color:var(--red);border-color:#fcd9dc;background:#fff7f7">' +
          icon('trash') + ' حذف الطلب' +
        '</button>' +
      '</div>' : '') +
  '</div>';
}

const search = placeholder =>
  '<label class="search">' + icon('search') +
  '<input id="search-input" type="search" placeholder="' + placeholder + '" aria-label="' + placeholder + '" value="' + esc(state.query) + '" autocomplete="off">' +
  '</label>';

const syncLine = () => {
  if (isLive()) {
    return '<button class="sync-line" data-screen="activity">' +
      icon('database') +
      'قاعدة البيانات متصلة بـ Supabase' +
    '</button>';
  }
  return '<button class="sync-line ' + (state.syncFailed ? 'failed' : '') + '" data-screen="activity">' +
    icon(state.syncFailed ? 'alert' : 'sync') +
    (state.syncFailed ? 'المزامنة متوقفة • عرض التفاصيل' : 'وضع تجريبي • بيانات وهمية') +
  '</button>';
};

// ----------------------------------------------------------------------------
// HEADER & NAVIGATION
// ----------------------------------------------------------------------------
function renderHeader() {
  const titles = {
    home: ['نظرة على يومك', formatArabicToday()],
    orders: ['الطلبات', 'كل أوردر، خطوة أقرب لعميلك'],
    inventory: ['المخزن', 'كل منتج له مكان'],
    scanner: ['مسح الكود', 'وصول أسرع. أخطاء أقل.'],
    customers: ['العملاء', 'العلاقة أهم من الأوردر'],
    activity: ['النشاط والمزامنة', 'حالة الاتصال والبيانات'],
    order: ['تفاصيل الطلب', 'من الطلب لحد باب العميل'],
    product: ['تفاصيل المنتج', 'الكمية، المكان، وكل التفاصيل'],
    customer: ['ملف العميل', 'كل تعاملاتك في مكان واحد'],
    login: ['تسجيل الدخول', 'بيانات الشركة للمصرح لهم فقط'],
    custody: ['العهدة والخزينة', 'إضافة وصرف العهدة النقدية اليوم بيومه'],
    expenses: ['العهدة والخزينة', 'إضافة وصرف العهدة النقدية اليوم بيومه']
  };

  if (state.screen === 'login') {
    $('#app-header').innerHTML =
      '<div class="header-row">' +
        '<img src="assets/enza-logo.png" alt="ENZA 3D Printing" class="mini-logo-img">' +
        '<span class="mode-badge ' + (isLive() ? 'live' : 'demo') + '">' + (isLive() ? 'Supabase' : 'عرض تجريبي') + '</span>' +
      '</div>';
    return;
  }

  const t = titles[state.screen] || titles.home;
  const detail = ['order', 'product', 'customer', 'activity', 'custody', 'expenses'].includes(state.screen);

  $('#app-header').innerHTML =
    '<div class="header-row">' +
      (detail ? '<button class="icon-btn" data-action="back" aria-label="رجوع">' + icon('back') + '</button>' : '') +
      '<div style="flex:1">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<h1 class="header-title">' + t[0] + '</h1>' +
          (state.mode === 'demo' ? '<span class="mode-badge demo">تجريبي</span>' : '') +
        '</div>' +
        '<div class="header-sub">' + (!detail ? '<span class="dot"></span>' : '') + t[1] + '</div>' +
      '</div>' +
      '<div class="header-actions">' +
        (state.screen === 'home' ?
          '<img src="assets/enza-logo.png" alt="ENZA 3D Printing" class="mini-logo-img" style="margin-left:6px">' +
          '<button class="icon-btn" data-screen="activity" aria-label="الإشعارات والنشاط">' + icon('bell') + '<span class="notification-dot"></span></button>' :
          detail ? '' : '<img src="assets/enza-logo.png" alt="ENZA 3D Printing" class="mini-logo-img">') +
      '</div>' +
    '</div>';
}

function renderNav() {
  const active = ({order:'orders', product:'inventory', customer:'customers', activity:'home', custody:'inventory', expenses:'orders'})[state.screen] || state.screen;
  $('#bottom-nav').hidden = state.screen === 'login';
  $('#bottom-nav').style.display = state.screen === 'login' ? 'none' : '';
  $('#bottom-nav').innerHTML = [
    ['home', 'home', 'الرئيسية'],
    ['orders', 'orders', 'الطلبات'],
    ['scanner', 'scan', 'مسح'],
    ['inventory', 'box', 'المخزن'],
    ['customers', 'users', 'العملاء']
  ].map(([s, i, l]) =>
    '<button data-screen="' + s + '" class="' + (s === active ? 'active ' : '') + (s === 'scanner' ? 'scan-nav' : '') + '" ' + (s === active ? 'aria-current="page"' : '') + '>' +
      (s === 'scanner' ? '<span>' + icon(i) + '</span>' : icon(i)) + l +
    '</button>'
  ).join('');
}

// ----------------------------------------------------------------------------
// SCREEN RENDERERS
// ----------------------------------------------------------------------------

function empty(title, text, actionBtn=null) {
  return '<div class="empty">' +
    '<div class="empty-icon">' + icon('search') + '</div>' +
    '<h3>' + esc(title) + '</h3>' +
    '<p>' + esc(text) + '</p>' +
    (actionBtn ? actionBtn : '<button class="secondary-btn" data-action="clear-filters">مسح البحث والفلاتر</button>') +
  '</div>';
}

function renderLoading() {
  return '<div class="loading-box"><div class="spinner"></div><span>جارٍ تحميل البيانات من قاعدة البيانات...</span></div>';
}

function renderConnError() {
  return '<div class="conn-banner">' +
    '<div><strong>تعذّر الاتصال بـ Supabase</strong><div style="font-size:10px;margin-top:2px">' + esc(state.loadError || 'تحقق من اتصالك بالإنترنت') + '</div></div>' +
    '<button class="retry-btn" data-action="retry-fetch">إعادة المحاولة</button>' +
  '</div>';
}

// 1. HOME SCREEN
function renderHome() {
  if (isLive() && state.loading && !state.dbInitialized) {
    return renderLoading();
  }

  const prods = getProducts();
  const ords = getOrders();
  const pending = ords.filter(o => (o.fulfillment_status || o.status) === 'new');
  const low = prods.filter(p => {
    const stock = p.available_qty !== undefined ? p.available_qty : p.stock;
    const min = p.minimum_qty !== undefined ? p.minimum_qty : p.min;
    return stock <= min;
  });

  const totalValue = ords.reduce((s, o) => s + total(o), 0);
  const totalStock = prods.reduce((s, p) => s + (p.available_qty !== undefined ? p.available_qty : p.stock), 0);
  const userName = state.user?.display_name || 'أحمد';

  const allExp = (window.EnzaDB ? JSON.parse(localStorage.getItem('enza_expenses') || '[]') : []);
  const history = (window.EnzaDB ? JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]') : []);
  const totalInflowCash = history
    .filter(m => m.type === 'cash_inflow' || m.type === 'disburse_to_customer' || m.type === 'settle_debt')
    .reduce((s, m) => s + Number(m.cash_collected || 0), 0);
  const totalExpCash = allExp.reduce((s, x) => s + Number(x.amount || 0), 0);
  const currentCustodyCash = totalInflowCash - totalExpCash;

  return (state.loadError ? renderConnError() : '') +
    '<div class="greeting">' +
      '<div><h2>صباح الخير، ' + esc(userName) + '</h2><p>خلّينا نبدأ اليوم بخطوة مرتّبة.</p></div>' +
      (state.mode === 'demo' ?
        '<span class="demo-label">عرض تجريبي</span>' :
        '<span class="mode-badge live">Supabase</span>') +
    '</div>' +
    '<div class="custody-banner" data-screen="expenses" style="cursor:pointer">' +
      '<div>' +
        '<span class="badge-pill">العهدة والخزينة الميدانية</span>' +
        '<b style="display:block;margin-top:6px;font-size:15px">رصيد العهدة النقدية: ' + money(currentCustodyCash) + ' ج.م</b>' +
        '<small style="opacity:.85;font-size:11px">اضغط للدخول لإضافة وصرف العهدة النقدية وكشف المصروفات</small>' +
      '</div>' +
      '<div style="background:rgba(255,255,255,.15);padding:10px 14px;border-radius:12px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;white-space:nowrap">' +
        icon('wallet') + ' دخول العهدة ' + icon('left') +
      '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0">' +
      '<button type="button" class="primary-btn" style="padding:14px 10px;font-size:13px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:6px" data-action="open-disburse-wizard">' +
        icon('scan') + ' صرف بضاعة لعميل' +
      '</button>' +
      '<button type="button" class="secondary-btn" style="background:#fff;border:1.5px solid var(--ink);color:var(--ink);padding:14px 10px;font-size:13px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:6px;font-weight:700" data-action="open-quick-add-stock">' +
        icon('plus') + ' إضافة بضاعة للمخزن' +
      '</button>' +
    '</div>' +
    '<section class="hero">' +
      '<div class="hero-top"><span>قيمة طلبات اليوم</span>' + icon('wallet') + '</div>' +
      '<div class="value"><small>جنيه مصري</small><span>' + money(totalValue) + '</span></div>' +
      '<div class="hero-bottom">' +
        '<span><b>' + ords.length + ' طلبات</b> ' + (isLive() ? 'مسجلة بالقاعدة' : 'من متجرك اليوم') + '</span>' +
        '<button class="link-light" data-screen="orders">كل الطلبات ' + icon('left') + '</button>' +
      '</div>' +
    '</section>' +
    '<div class="stats">' +
      '<button class="stat" data-action="pending">' +
        '<span class="stat-icon red">' + icon('orders') + '</span>' +
        '<span><strong>' + pending.length + '</strong><small>طلبات محتاجة تجهيز</small></span>' +
      '</button>' +
      '<button class="stat" data-action="all-stock">' +
        '<span class="stat-icon">' + icon('box') + '</span>' +
        '<span><strong>' + totalStock + '</strong><small>قطعة في المخزن</small></span>' +
      '</button>' +
    '</div>' +
    '<div class="section-heading">' +
      '<h2>أحدث الطلبات <span class="count">' + ords.length + '</span></h2>' +
      '<button class="text-btn" data-screen="orders">عرض الكل ' + icon('left') + '</button>' +
    '</div>' +
    (ords.length > 0 ?
      ords.slice(0, 2).map(o => orderCard(o, true)).join('') :
      empty('لا توجد طلبات في قاعدة البيانات', 'لم يتم تسجيل أو مزامنة أي طلبات حتى الآن.')) +
    (low.length > 0 ?
      '<button class="low-alert" data-action="low-stock">' +
        icon('alert') +
        '<span><strong>' + low.length + ' منتجات محتاجة إعادة تزويد</strong><small>راجع الكميات قبل تجهيز الطلبات</small></span>' +
        icon('left') +
      '</button>' : '') +
    syncLine();
}

// 2. ORDERS SCREEN
function orderFilters() {
  const ords = getOrders();
  const filterList = [
    ['all', 'الكل'],
    ...Object.entries(statusNames),
    ['credit', 'الدائن والآجل']
  ];
  return '<div class="filters" aria-label="تصفية الطلبات">' +
    filterList.map(([k, l]) => {
      let cnt = 0;
      if (k === 'all') cnt = ords.length;
      else if (k === 'credit') cnt = ords.filter(o => getOrderOps(o).remaining > 0).length;
      else cnt = ords.filter(o => (o.fulfillment_status || o.status) === k).length;
      return '<button data-order-filter="' + k + '" class="' + (state.orderFilter === k ? 'active' : '') + '" aria-pressed="' + (state.orderFilter === k) + '">' +
        l + '<small>' + cnt + '</small>' +
      '</button>';
    }).join('') +
  '</div>';
}

function filteredOrders() {
  const ords = getOrders();
  return ords.filter(o => {
    const status = o.fulfillment_status || o.status;
    const ops = getOrderOps(o);
    let matchFilter = false;
    if (state.orderFilter === 'all') matchFilter = true;
    else if (state.orderFilter === 'credit') matchFilter = (ops.remaining > 0);
    else matchFilter = (status === state.orderFilter);

    const c = o.customer || cBy(o.cid || o.customer_id) || {};
    const ref = o.display_number || ('EN-' + o.id);
    const searchable = [ref, c.display_name, c.name, c.phone_e164, c.phone, c.city].filter(Boolean).join(' ');
    return matchFilter && matchesSearch(searchable, state.query);
  }).sort((a, b) => {
    if (a.placed_at && b.placed_at) {
      return state.sortReverse ? new Date(a.placed_at) - new Date(b.placed_at) : new Date(b.placed_at) - new Date(a.placed_at);
    }
    return state.sortReverse ? a.id - b.id : b.id - a.id;
  });
}

function orderResults() {
  if (isLive() && state.loading) return renderLoading();
  const list = filteredOrders();
  const ords = getOrders();

  if (ords.length === 0) {
    return empty('قاعدة البيانات فارغة حالياً', 'لا توجد طلبات مسجلة في قاعدة بيانات Supabase بعد.');
  }

  return '<div class="list-summary">' +
    '<span>' + list.length + ' طلبات <strong>• ' + (isLive() ? formatArabicDate() : formatArabicToday()) + '</strong></span>' +
    '<button data-action="sort-orders">' + icon('sliders') + (state.sortReverse ? 'الأقدم أولًا' : 'الأحدث أولًا') + '</button>' +
  '</div>' +
  list.map(o => orderCard(o)).join('') +
  (list.length ? '' : empty('مفيش طلبات مطابقة للبحث', 'جرّب اسم عميل أو رقم طلب مختلف.'));
}

function renderOrders() {
  return (state.loadError ? renderConnError() : '') +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 12px;padding-top:4px">' +
      '<h2 style="font-size:14px;font-weight:700">قائمة الطلبات</h2>' +
      '<button class="primary-btn" style="width:auto;padding:7px 14px;font-size:11px;border-radius:10px" data-action="open-disburse-wizard">' +
        icon('plus') + ' صرف طلب جديد' +
      '</button>' +
    '</div>' +
    search('ابحث باسم العميل أو رقم الطلب') +
    orderFilters() +
    '<div id="results">' + orderResults() + '</div>';
}

// 3. INVENTORY / PRODUCTS SCREEN
function productResults() {
  if (isLive() && state.loading) return renderLoading();
  const prods = getProducts();

  if (prods.length === 0) {
    return empty('المخزن فارغ حالياً', 'لا توجد منتجات مسجلة في قاعدة بيانات Supabase بعد.');
  }

  const list = prods.filter(p => {
    const stock = p.available_qty !== undefined ? p.available_qty : p.stock;
    const min = p.minimum_qty !== undefined ? p.minimum_qty : p.min;
    const matchCat = (state.productFilter === 'all' || state.productFilter === p.category || (state.productFilter === 'low' && stock <= min));
    const searchable = [p.name, p.brand, p.color_name, p.color, p.sku].filter(Boolean).join(' ');
    return matchCat && matchesSearch(searchable, state.query);
  });

  return '<div class="list-summary"><span>' + list.length + ' منتجات</span><span>المخزن الرئيسي</span></div>' +
    list.map(productCard).join('') +
    (list.length ? '' : empty('المنتج مش موجود', 'جرّب اسم الخامة، اللون، أو كود المنتج.'));
}

function renderInventory() {
  return (state.loadError ? renderConnError() : '') +
    search('ابحث عن منتج، لون، أو SKU') +
    '<div class="filters" aria-label="تصفية المنتجات">' +
      [['all','الكل'],['esun','eSUN'],['bambu','Bambu Lab'],['resin','Resin'],['low','مخزون منخفض']].map(([k,l]) =>
        '<button data-product-filter="' + k + '" class="' + (state.productFilter === k ? 'active' : '') + '" aria-pressed="' + (state.productFilter === k) + '">' + l + '</button>'
      ).join('') +
    '</div>' +
    '<div id="results">' + productResults() + '</div>';
}

// 4. PRODUCT DETAIL SCREEN
function renderProduct() {
  const p = pBy(state.selectedProduct);
  if (!p) return empty('المنتج غير موجود', 'قد يكون تم حذفه من قاعدة البيانات.');

  const stock = p.available_qty !== undefined ? p.available_qty : p.stock;
  const min = p.minimum_qty !== undefined ? p.minimum_qty : p.min;
  const price = p.sale_price !== undefined ? p.sale_price : p.price;
  const color = p.color_name || p.color;
  const targetStock = p.target_stock || 50;

  return art(p, true) +
    '<div class="brand-label">' + esc(p.brand) + ' / FILAMENT & RESIN</div>' +
    '<h2 class="detail-title">' + esc(p.name) + '</h2>' +
    '<p class="detail-sub">' + esc(color) + ' · ' + esc(p.weight || '١ كجم') + (p.type === 'spool' ? ' · قطر ١.٧٥ مم' : '') + '</p>' +
    '<div class="detail-price">' + money(price) + ' <small>ج.م / ' + (p.type === 'bottle' ? 'عبوة' : 'بكرة') + '</small></div>' +
    '<section class="panel">' +
      '<div class="panel-title">رصيد المخزن<span class="stock-number ' + stockClass(p) + '"><span class="stock-dot"></span>' + stockLabel(p) + '</span></div>' +
      '<div class="info-row"><span>الكمية المتاحة</span><strong style="font-size:25px" class="ltr">' + stock + ' <small style="font-size:11px">قطعة</small></strong></div>' +
      '<div class="stock-meter ' + (stock <= min ? 'low' : '') + '"><span style="width:' + Math.min(100, (stock / targetStock) * 100) + '%"></span></div>' +
      '<div class="info-row"><span>تنبيه عند الوصول إلى</span><b>' + min + ' قطع</b></div>' +
      '<div class="info-row"><span>الموقع في المخزن</span><b class="ltr">' + esc(p.location || 'A-01') + '</b></div>' +
      '<div class="info-row"><span>الحالة على Odoo والموقع</span><b>' + (p.is_published !== false ? '<span style="color:var(--green)">نشط ومنشور على المتجر</span>' : '<span style="color:var(--red)">مؤرشف / مخفي من المتجر</span>') + '</b></div>' +
    '</section>' +
    '<div class="button-row">' +
      '<button class="primary-btn" data-action="open-disburse-from-product">' + icon('plus') + 'صرف مباشر لعميل</button>' +
      '<button class="secondary-btn" data-action="edit-product-modal">' + icon('sliders') + 'تعديل في Odoo والباركود</button>' +
    '</div>' +
    '<div class="button-row" style="margin-top:8px">' +
      '<button class="secondary-btn" data-action="stock-modal">' + icon('box') + 'حركة مخزون (توريد/صرف)</button>' +
      (p.is_published !== false ?
        '<button class="secondary-btn" data-action="toggle-odoo-archive" data-archive="1" style="color:var(--red);border-color:#fcd9dc;background:#fff7f7">' + icon('trash') + 'أرشفة على Odoo</button>' :
        '<button class="secondary-btn" data-action="toggle-odoo-archive" data-archive="0" style="color:var(--green);border-color:#c6ebd4;background:var(--green-bg)">' + icon('check') + 'إلغاء الأرشفة (تفعيل)</button>') +
    '</div>' +
    '<section class="panel">' +
      '<div class="panel-title">بيانات المنتج</div>' +
      '<div class="info-row"><span>كود المنتج (SKU)</span><b class="ltr">' + esc(p.sku) + '</b></div>' +
      '<div class="info-row"><span>الباركود</span><b class="ltr">' + esc(p.barcode || '—') + '</b></div>' +
    '</section>' +
    (isLive() ?
      '<p class="caption-note">الحركات تُحفظ في Supabase مع منع الرصيد السالب بقاعدة البيانات.</p>' :
      '<p class="caption-note">الكمية المعروضة تجريبية. الحركات تُحفظ أثناء المعاينة فقط.</p>');
}

// 5. ORDER DETAIL SCREEN
function renderOrder() {
  const o = oBy(state.selectedOrder);
  if (!o) return empty('الطلب غير موجود', 'قد يكون تم حذفه من قاعدة البيانات.');
  const ops = getOrderOps(o);

  const c = o.customer || cBy(o.cid || o.customer_id) || { display_name: 'عميل غير مسجل', city: '', area: '', address: '' };
  const custName = c.display_name || c.name || 'عميل';
  const custAddress = c.address || 'العنوان غير مسجل';
  const ref = o.display_number || ('#EN-' + o.id);
  const status = o.fulfillment_status || o.status || 'new';

  const statuses = ['new', 'preparing', 'shipped', 'delivered'];
  const current = statuses.indexOf(status);

  let itemsHtml = '';
  if (o.lines && o.lines.length > 0) {
    itemsHtml = o.lines.map(l => {
      const p = l.variant || pBy(l.variant_id);
      return '<div class="order-item">' +
        art(p) +
        '<div class="item-info">' +
          '<div class="brand-label">' + esc(p?.brand || 'eSUN') + '</div>' +
          '<div class="product-name">' + esc(l.label_snapshot || p?.name || 'منتج') + '</div>' +
          '<p class="meta">' + esc(p?.color_name || '') + ' · الكمية ' + l.qty + '</p>' +
        '</div>' +
        currency(l.line_total || (l.unit_price * l.qty)) +
      '</div>';
    }).join('');
  } else if (o.items) {
    itemsHtml = o.items.map(([id, q]) => {
      const p = pBy(id);
      return '<div class="order-item">' +
        art(p) +
        '<div class="item-info">' +
          '<div class="brand-label">' + esc(p?.brand || '') + '</div>' +
          '<div class="product-name">' + esc(p?.name || '') + '</div>' +
          '<p class="meta">' + esc(p?.color || '') + ' · الكمية ' + q + '</p>' +
        '</div>' +
        currency(p ? p.price * q : 0) +
      '</div>';
    }).join('');
  }

  const shipping = Number(o.shipping_amount ?? o.shipping ?? 0);
  const ordTotal = total(o);
  const prodTotal = ordTotal - shipping;

  return '<div class="order-detail-head">' +
    badge(status) +
    '<h2 class="order-ref">' + esc(ref) + '</h2>' +
    '<p class="meta">' + formatArabicDateTime(o.placed_at) + ' · طلب مسجل</p>' +
  '</div>' +
  '<div class="progress-steps">' +
    statuses.map((s, i) =>
      '<div class="step ' + (i < current ? 'done' : i === current ? 'current' : '') + '">' +
        '<span>' + (i < current ? icon('check') : (i + 1)) + '</span>' +
        statusNames[s] +
      '</div>'
    ).join('') +
  '</div>' +
  '<section class="panel">' +
    '<div class="customer-line">' +
      avatar(c) +
      '<div class="customer-text"><b>' + esc(custName) + '</b><p class="meta">' + esc(c.city || '') + ' · عميل متجرك</p></div>' +
      '<button class="icon-btn" data-customer="' + (c.id || o.cid) + '" aria-label="عرض ملف العميل">' + icon('left') + '</button>' +
    '</div>' +
    '<div class="address-line">' + icon('pin') + '<span>' + esc(custAddress) + '</span></div>' +
    '<button class="secondary-btn whatsapp" style="margin-top:12px" data-whatsapp="' + (c.id || o.cid) + '">' + icon('chat') + 'تواصل على واتساب</button>' +
  '</section>' +
  '<section class="panel">' +
    '<div class="panel-title">المنتجات <span class="meta">' + pieceLabel(pieceCount(o)) + '</span></div>' +
    itemsHtml +
  '</section>' +
  '<section class="panel">' +
    '<div class="info-row"><span>قيمة المنتجات</span>' + currency(prodTotal) + '</div>' +
    '<div class="info-row"><span>الشحن</span><b>' + currency(shipping) + ' <button type="button" class="secondary-btn" style="display:inline-flex;width:auto;padding:2px 8px;font-size:10px;margin-right:6px" data-action="open-edit-shipping" data-id="' + o.id + '">' + icon('sliders') + ' تعديل الشحن</button></b></div>' +
    '<div class="info-row"><span>طريقة الدفع</span><b>' + esc(o.payment_method || 'الدفع عند الاستلام') + '</b></div>' +
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
    (ops.remaining > 0 ?
      '<button type="button" class="primary-btn" style="background:var(--green);margin-top:10px;padding:9px" data-action="open-settle-debt-modal" data-id="' + o.id + '">' +
        icon('wallet') + ' تسجيل سداد متبقي العميل (' + money(ops.remaining) + ' ج.م)' +
      '</button>' : '') +
  '</section>' +
  '<section class="panel">' +
    '<div class="panel-title">بوليصة شركة الشحن (Urgent)</div>' +
    (ops.waybill ?
      '<button type="button" class="proof-card" style="width:100%;text-align:right" data-action="view-proof-image" data-img="' + esc(ops.waybill) + '" data-title="بوليصة الشحن (Urgent)">' +
        '<img src="' + esc(ops.waybill) + '" class="proof-thumb" alt="بوليصة الشحن">' +
        '<div><b>صورة بوليصة الشحن (Urgent)</b><small>انقر لمعاينة الصورة كاملة</small></div>' +
      '</button>' +
      '<button type="button" class="secondary-btn" style="margin-top:8px" data-action="prompt-attach-waybill" data-id="' + o.id + '">' +
        icon('truck') + ' تغيير / تحديث صورة بوليصة Urgent' +
      '</button>' :
      '<button type="button" class="secondary-btn" style="margin-top:6px;border:1.5px dashed var(--ink);font-weight:700" data-action="prompt-attach-waybill" data-id="' + o.id + '">' +
        icon('truck') + ' تصوير / إرفاق صورة بوليصة الشحن (Urgent)' +
      '</button>') +
  '</section>' +
  '<div class="button-row" style="margin-bottom:12px">' +
    '<button type="button" class="primary-btn" style="background:#25262b" data-action="open-order-invoice" data-id="' + esc(String(o.id)) + '">' +
      icon('receipt') + ' الفاتورة الرسمية (ENZA)' +
    '</button>' +
    '<button type="button" class="secondary-btn" data-action="delete-order" data-id="' + esc(String(o.id)) + '" style="color:var(--red);border-color:#fcd9dc;background:#fff7f7">' +
      icon('trash') + ' حذف الطلب' +
    '</button>' +
  '</div>' +
  (current < 3 ?
    '<div class="sticky-action"><button class="primary-btn" data-action="advance-order">' +
      icon(current === 0 ? 'box' : current === 1 ? 'truck' : 'check') +
      ['ابدأ تجهيز الطلب', 'تأكيد شحن الطلب', 'تأكيد التسليم'][current] +
    '</button></div>' :
    '<div class="sync-line">' + icon('check') + 'اكتمل الطلب بنجاح</div>') +
  (isLive() ?
    '<p class="caption-note">تحديث الحالة يُسجل في قاعدة البيانات كحالة تشغيلية محلية.</p>' :
    '<p class="caption-note">تغيير الحالة في النموذج لا يعدّل الطلب في Odoo.</p>');
}

// 6. CUSTOMERS SCREEN
function getCustomerTotalDebt(custId) {
  const ords = getOrders().filter(o => String(o.cid || o.customer_id) === String(custId));
  return ords.reduce((sum, o) => sum + getOrderOps(o).remaining, 0);
}

function customerFilters() {
  const custs = getCustomers();
  const debtCusts = custs.filter(c => getCustomerTotalDebt(c.id) > 0);
  const cur = state.customerFilter || 'all';
  return '<div class="filters" aria-label="تصفية العملاء">' +
    '<button data-customer-filter="all" class="' + (cur === 'all' ? 'active' : '') + '">كل العملاء <small>' + custs.length + '</small></button>' +
    '<button data-customer-filter="debt" class="' + (cur === 'debt' ? 'active' : '') + '">عليهم مديونية (مديونين) <small>' + debtCusts.length + '</small></button>' +
  '</div>';
}

function customerResults() {
  if (isLive() && state.loading) return renderLoading();
  const custs = getCustomers();
  const ords = getOrders();

  if (custs.length === 0) {
    return empty('لا يوجد عملاء مسجلون حالياً', 'اضغط على زر «+ إضافة عميل جديد» بالأعلى لتسجيل أول عميل.', '<button class="primary-btn" data-action="open-new-customer-modal">' + icon('plus') + ' إضافة عميل جديد</button>');
  }

  const curFilter = state.customerFilter || 'all';
  const list = custs.filter(c => {
    const debt = getCustomerTotalDebt(c.id);
    if (curFilter === 'debt' && debt <= 0) return false;
    const haystack = [
      c.display_name,
      c.name,
      c.phone_e164,
      c.phone,
      c.city,
      c.area,
      c.address,
      c.notes
    ].filter(Boolean).join(' ');
    return matchesSearch(haystack, state.query);
  });

  return '<div class="list-summary"><span>' + list.length + ' عملاء</span><span>' + (curFilter === 'debt' ? 'عملاء عليهم مديونية' : 'قاعدة البيانات') + '</span></div>' +
    list.map(c => {
      const name = c.display_name || c.name;
      const custOrds = ords.filter(o => String(o.cid || o.customer_id) === String(c.id));
      const count = custOrds.length;
      const debt = custOrds.reduce((sum, o) => sum + getOrderOps(o).remaining, 0);
      return '<div class="customer-card" style="display:flex;flex-direction:column;align-items:stretch;gap:10px;cursor:default">' +
        '<button type="button" data-customer="' + c.id + '" style="display:flex;align-items:center;gap:11px;width:100%;text-align:right;background:none;border:0;padding:0">' +
          avatar(c) +
          '<div class="customer-text" style="flex:1">' +
            '<div class="customer-name">' + esc(name) + '</div>' +
            '<p class="meta">' + esc(c.phone_e164 || c.phone || '') + (c.city ? ' · ' + esc(c.city) : '') + (c.address ? ' (' + esc(c.address) + ')' : '') + ' · ' + orderCount(count) + '</p>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
            (debt > 0 ?
              '<span class="badge" style="background:#fff0f1;color:var(--red);font-weight:700">مديون: ' + money(debt) + ' ج.م</span>' :
              '<span class="badge" style="background:var(--green-bg);color:var(--green)">خالص</span>') +
          '</div>' +
        '</button>' +
        '<div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #f1efeb;padding-top:8px">' +
          '<button type="button" class="secondary-btn" data-action="open-edit-customer-modal" data-id="' + c.id + '" style="width:auto;padding:5px 12px;font-size:11px;min-height:32px;border-radius:8px">' +
            icon('sliders') + ' تعديل البيانات' +
          '</button>' +
          '<button type="button" class="secondary-btn" data-action="delete-customer" data-id="' + c.id + '" style="width:auto;padding:5px 12px;font-size:11px;min-height:32px;border-radius:8px;color:var(--red);border-color:#fcd9dc;background:#fff7f7">' +
            icon('trash') + ' حذف العميل' +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('') +
    (list.length ? '' : empty(curFilter === 'debt' ? 'لا يوجد عملاء مديونون حالياً' : 'مفيش عميل بالاسم أو الرقم ده', 'جرّب جزء من الاسم أو رقم التليفون.'));
}

function renderCustomers() {
  const custs = getCustomers();
  return (state.loadError ? renderConnError() : '') +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<div><b style="font-size:14px">إجمالي العملاء: ' + custs.length + ' عميل</b></div>' +
      '<button type="button" class="primary-btn" style="width:auto;padding:8px 14px;font-size:12px;border-radius:11px" data-action="open-new-customer-modal">' +
        icon('plus') + ' إضافة عميل جديد' +
      '</button>' +
    '</div>' +
    search('ابحث باسم العميل أو رقم التليفون أو المدينة') +
    customerFilters() +
    '<div id="results">' + customerResults() + '</div>';
}

// 7. CUSTOMER DETAIL SCREEN
function renderCustomer() {
  const c = cBy(state.selectedCustomer);
  if (!c) return empty('العميل غير موجود', 'قد يكون تم حذفه من قاعدة البيانات.');

  const ords = getOrders();
  const list = ords.filter(o => String(o.cid || o.customer_id) === String(c.id));
  const name = c.display_name || c.name;
  const totalDebt = list.reduce((s, o) => s + getOrderOps(o).remaining, 0);
  const latestUnpaidOrder = list.find(o => getOrderOps(o).remaining > 0);

  return '<section class="customer-profile">' +
    avatar(c) +
    '<h2>' + esc(name) + '</h2>' +
    '<p class="meta">' + esc(c.phone_e164 || c.phone || '') + (c.city ? ' · ' + esc(c.city) : '') + (c.address ? ' — ' + esc(c.address) : '') + '</p>' +
    '<div class="profile-stats">' +
      '<div><strong>' + list.length + '</strong><small>إجمالي الطلبات</small></div>' +
      '<div><strong style="color:' + (totalDebt > 0 ? 'var(--red)' : 'var(--green)') + '">' + money(totalDebt) + '</strong><small>مديونية متبقية (ج.م)</small></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button type="button" class="secondary-btn" data-action="open-edit-customer-modal" data-id="' + c.id + '" style="padding:8px;font-size:12px;min-height:38px">' +
        icon('sliders') + ' تعديل بيانات العميل' +
      '</button>' +
      '<button type="button" class="secondary-btn" data-action="delete-customer" data-id="' + c.id + '" style="padding:8px;font-size:12px;min-height:38px;color:var(--red);border-color:#fcd9dc;background:#fff7f7">' +
        icon('trash') + ' حذف العميل' +
      '</button>' +
    '</div>' +
  '</section>' +
  '<div class="button-row" style="margin-bottom:10px">' +
    '<button class="primary-btn" data-action="disburse-for-customer" data-id="' + c.id + '">' + icon('plus') + ' صرف بضاعة لهذا العميل</button>' +
    '<button class="secondary-btn whatsapp" data-whatsapp="' + c.id + '">' + icon('chat') + ' واتساب</button>' +
  '</div>' +
  (latestUnpaidOrder ?
    '<button type="button" class="primary-btn" style="background:var(--green);margin-bottom:14px" data-action="open-settle-debt-modal" data-id="' + latestUnpaidOrder.id + '">' +
      icon('wallet') + ' سداد مديونية آخر طلب (' + money(getOrderOps(latestUnpaidOrder).remaining) + ' ج.م)' +
    '</button>' : '') +
  '<div class="section-heading"><h2>الطلبات السابقة</h2><span class="meta">الأحدث أولًا</span></div>' +
  (list.length > 0 ?
    list.map(o => orderCard(o, true)).join('') :
    '<p class="meta" style="text-align:center;padding:20px 0">لا توجد طلبات سابقة لهذا العميل.</p>');
}

function openEditCustomerModal(customerId) {
  const c = cBy(customerId || state.selectedCustomer);
  if (!c) return;
  const name = c.display_name || c.name || '';
  const phone = c.phone_e164 || c.phone || '';
  const city = c.city || '';
  const address = c.address || '';

  openModal('تعديل بيانات العميل',
    '<p class="sheet-description">تعديل الاسم أو رقم التليفون أو العنوان للعميل «' + esc(name) + '»</p>' +
    '<form id="edit-customer-form" data-id="' + c.id + '">' +
      '<label class="field-label" for="edit-cust-name">اسم العميل *</label>' +
      '<input type="text" id="edit-cust-name" class="field" value="' + esc(name) + '" required>' +
      '<label class="field-label" for="edit-cust-phone">رقم التليفون *</label>' +
      '<input type="tel" id="edit-cust-phone" class="field ltr" value="' + esc(phone) + '" required>' +
      '<label class="field-label" for="edit-cust-city">المحافظة / المدينة</label>' +
      '<input type="text" id="edit-cust-city" class="field" value="' + esc(city) + '">' +
      '<label class="field-label" for="edit-cust-address">العنوان بالتفصيل</label>' +
      '<input type="text" id="edit-cust-address" class="field" value="' + esc(address) + '">' +
      '<div class="inline-error" id="edit-cust-error"></div>' +
      '<button type="submit" class="primary-btn" id="edit-cust-submit" style="margin-top:16px">' +
        icon('check') + ' حفظ التعديلات' +
      '</button>' +
      '<button type="button" class="secondary-btn" data-action="delete-customer" data-id="' + c.id + '" style="margin-top:10px;color:var(--red);border-color:#fcd9dc;background:#fff7f7">' +
        icon('trash') + ' حذف هذا العميل نهائياً' +
      '</button>' +
    '</form>'
  );
}

// 8. SCANNER SCREEN

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

function getBarcodeScannerFormats() {
  const F = window.Html5QrcodeSupportedFormats;
  if (!F) return undefined;
  return [
    F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E,
    F.CODE_128, F.CODE_39, F.CODE_93, F.ITF, F.CODABAR,
    F.QR_CODE
  ].filter(v => v !== undefined);
}

async function stopEditBarcodeScanner() {
  if (state.editBarcodeScanner) {
    try { await state.editBarcodeScanner.stop(); } catch (e) {}
    try { state.editBarcodeScanner.clear(); } catch (e) {}
    state.editBarcodeScanner = null;
  }
  const box = document.getElementById('edit-barcode-scanner-box');
  if (box) {
    box.style.display = 'none';
    box.innerHTML = '';
  }
}

async function startCameraScanner() {
  const container = document.getElementById('qr-camera-viewport');
  if (!container || !window.Html5Qrcode) return;

  if (state.scannerInstance && state.scannerRunning) return;

  try {
    if (state.scannerInstance) {
      try { await state.scannerInstance.stop(); } catch (e) {}
      try { state.scannerInstance.clear(); } catch (e) {}
      state.scannerInstance = null;
    }

    const formats = getBarcodeScannerFormats();
    state.scannerInstance = new Html5Qrcode('qr-camera-viewport', {
      formatsToSupport: formats,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      verbose: false
    });

    const ph = document.getElementById('qr-placeholder');
    if (ph) ph.style.display = 'none';
    const errEl = document.getElementById('scan-camera-error');
    if (errEl) errEl.textContent = '';

    await state.scannerInstance.start(
      { facingMode: state.scannerFacing },
      {
        fps: 15,
        qrbox: { width: 260, height: 150 },
        aspectRatio: 1.5
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
    state.scannerInstance = null;
    const ph = document.getElementById('qr-placeholder');
    if (ph) ph.style.display = 'flex';
    const errEl = document.getElementById('scan-camera-error');
    if (errEl) errEl.textContent = 'الكاميرا غير مفعلة: ' + (err.message || 'يرجى السماح بإذن الكاميرا للتطبيق');
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

function renderScanner() {
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
}

// 9. ACTIVITY & SYNC SCREEN

// ----------------------------------------------------------------------------
// 7. CUSTODIAN SCREEN (بيان العهدة الشخصية والمخزن الميداني)
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// EXPENSES & FINANCIAL REPORTS SCREEN (جزء المصروفات والتقارير)
// ----------------------------------------------------------------------------
function buildUnifiedCashLedgerHtml() {
  const allExp = (window.EnzaDB ? JSON.parse(localStorage.getItem('enza_expenses') || '[]') : []);
  const history = (window.EnzaDB ? JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]') : []);

  const catNames = {
    fuel: 'وقود وبنزين',
    transit: 'مواصلات وانتقالات',
    shipping: 'شحن وتوصيل',
    maint: 'صيانة وإصلاحات',
    food: 'ضيافة وإعاشة',
    other: 'مصروفات أخرى'
  };

  // Merge cash inflows (+) and expenses (-) into one chronological array
  const unified = [];

  history.forEach(m => {
    if (m.type === 'cash_inflow' || m.type === 'settle_debt' || (m.type === 'disburse_to_customer' && Number(m.cash_collected) > 0)) {
      const amt = Number(m.cash_collected || 0);
      if (amt > 0) {
        let title = 'إضافة نقدية للعهدة';
        if (m.type === 'cash_inflow') title = m.notes || 'إضافة نقدية للعهدة';
        else if (m.type === 'settle_debt') title = 'تحصيل مديونية عميل: ' + (m.customer_name || 'عميل');
        else if (m.type === 'disburse_to_customer') title = 'تحصيل صرف بضاعة: ' + (m.customer_name || 'عميل');

        unified.push({
          id: m.id,
          kind: 'inflow',
          title: title,
          categoryLabel: 'إضافة للعهدة (+)',
          amount: amt,
          notes: m.type === 'settle_debt' ? (m.notes || '') : '',
          created_at: m.created_at || new Date().toISOString()
        });
      }
    }
  });

  allExp.forEach(x => {
    unified.push({
      id: x.id,
      kind: 'outflow',
      title: x.title || 'مصروف تشغيلي',
      category: x.category || 'other',
      categoryLabel: 'صرف: ' + (catNames[x.category] || x.category || 'مصروفات'),
      amount: Number(x.amount || 0),
      notes: x.notes || '',
      receipt_image_url: x.receipt_image_url || null,
      created_at: x.created_at || new Date().toISOString()
    });
  });

  unified.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const filter = state.expenseCategoryFilter || 'all';
  const filtered = unified.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'inflow') return item.kind === 'inflow';
    if (filter === 'outflow') return item.kind === 'outflow';
    return item.kind === 'outflow' && item.category === filter;
  });

  const filterChips = [
    ['all', 'الكل (إضافة وصرف)'],
    ['inflow', '+ الإضافات فقط'],
    ['outflow', '- المصروفات فقط'],
    ['fuel', 'وقود وبنزين'],
    ['transit', 'مواصلات'],
    ['shipping', 'شحن وتوصيل'],
    ['other', 'أخرى']
  ];

  return '<div class="section-heading"><h2>سجل العهدة النقدية: إضافة وصرف اليوم بيومه (' + filtered.length + ')</h2></div>' +
    '<div class="category-chips">' +
      filterChips.map(([k, label]) =>
        '<button class="category-chip ' + (filter === k ? 'active' : '') + '" data-action="filter-expense-cat" data-cat="' + k + '">' +
          label +
        '</button>'
      ).join('') +
    '</div>' +
    (filtered.length > 0 ?
      filtered.map(item => {
        const isAdd = item.kind === 'inflow';
        const dt = item.created_at ? new Date(item.created_at) : new Date();
        const dateLabel = dt.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
        const timeLabel = dt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        return '<div class="expense-card clickable-card" data-action="open-cash-entry-detail" data-kind="' + item.kind + '" data-id="' + esc(String(item.id || '')) + '" style="border-right:4px solid ' + (isAdd ? 'var(--green)' : 'var(--red)') + '">' +
          '<div class="expense-icon" style="background:' + (isAdd ? 'var(--green-bg);color:var(--green)' : 'var(--rose);color:var(--red)') + '">' +
            icon(isAdd ? 'plus' : 'receipt') +
          '</div>' +
          '<div class="expense-info">' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<span class="badge" style="font-size:9px;padding:1px 6px;background:' + (isAdd ? 'var(--green-bg);color:var(--green)' : 'var(--rose);color:var(--red)') + '">' +
                (isAdd ? '+ إضافة عهدة' : '- صرف عهدة') +
              '</span>' +
              '<b>' + esc(item.title) + '</b>' +
            '</div>' +
            '<small>' + esc(item.categoryLabel) + ' · ' + dateLabel + ' (' + timeLabel + ')</small>' +
            (item.notes ? '<small style="color:var(--ink);margin-top:2px">' + esc(item.notes) + '</small>' : '') +
            '<small style="color:var(--blue);margin-top:3px;font-weight:600">' +
              (item.receipt_image_url ? 'مرفق فاتورة • ' : '') + 'اضغط لعرض التفاصيل ←' +
            '</small>' +
          '</div>' +
          '<div class="expense-amt">' +
            '<strong style="color:' + (isAdd ? 'var(--green)' : 'var(--red)') + ';direction:ltr">' +
              (isAdd ? '+' : '-') + money(item.amount) + ' <small>ج.م</small>' +
            '</strong>' +
            (isAdd ?
              '<button type="button" class="icon-btn" data-action="delete-cash-inflow" data-id="' + item.id + '" style="margin-top:6px;width:32px;height:32px;color:#aaa" title="حذف">' +
                icon('trash') +
              '</button>' :
              '<button type="button" class="icon-btn" data-action="delete-expense" data-id="' + item.id + '" style="margin-top:6px;width:32px;height:32px;color:#aaa" title="حذف">' +
                icon('trash') +
              '</button>') +
          '</div>' +
        '</div>';
      }).join('') :
      empty('لا توجد حركات إضافة أو صرف مسجلة', 'استخدم أزرار «+ إضافة عهدة» و«- صرف مصروف» بالأعلى ليظهر الكشف اليومي هنا في مكان واحد.'));
}

function renderExpenses() {
  const allExp = (window.EnzaDB ? JSON.parse(localStorage.getItem('enza_expenses') || '[]') : []);
  const history = (window.EnzaDB ? JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]') : []);

  const todayStr = new Date().toISOString().slice(0, 10);

  const totalInflow = history
    .filter(m => m.type === 'cash_inflow' || m.type === 'settle_debt' || m.type === 'disburse_to_customer')
    .reduce((s, m) => s + Number(m.cash_collected || 0), 0);
  const totalOutflow = allExp.reduce((s, x) => s + Number(x.amount || 0), 0);
  const netBalance = totalInflow - totalOutflow;

  const todayInflow = history
    .filter(m => (m.type === 'cash_inflow' || m.type === 'settle_debt' || m.type === 'disburse_to_customer') && (m.created_at || '').startsWith(todayStr))
    .reduce((s, m) => s + Number(m.cash_collected || 0), 0);
  const todayOutflow = allExp
    .filter(x => (x.created_at || '').startsWith(todayStr))
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  return '<div class="greeting">' +
    '<div><h2>العهدة النقدية (إضافة وصرف)</h2><p>كشف موحد لإضافة الفلوس وصرف المصروفات اليوم بيومه.</p></div>' +
    '<span class="mode-badge live">كشف العهدة</span>' +
  '</div>' +
  '<div class="expense-kpi-card">' +
    '<small>الرصيد المتبقي في العهدة النقدية الآن</small>' +
    '<strong>' + money(netBalance) + ' <small style="display:inline;font-size:13px">ج.م</small></strong>' +
    '<div class="expense-kpi-row">' +
      '<span>إجمالي الإضافات (+): <b style="color:#a8f0c6">+' + money(totalInflow) + ' ج.م</b></span>' +
      '<span>إجمالي الصرف (-): <b style="color:#ffd3d6">-' + money(totalOutflow) + ' ج.م</b></span>' +
    '</div>' +
  '</div>' +
  '<div class="custody-summary-grid">' +
    '<div class="custody-stat-box highlight-green clickable-box" data-action="filter-expense-cat" data-cat="inflow">' +
      '<small>إضافات العهدة اليوم (+)</small>' +
      '<strong>+' + money(todayInflow) + ' <small style="display:inline;font-size:11px">ج.م</small></strong>' +
    '</div>' +
    '<div class="custody-stat-box highlight-red clickable-box" data-action="filter-expense-cat" data-cat="outflow">' +
      '<small>صرف ومصروفات اليوم (-)</small>' +
      '<strong>-' + money(todayOutflow) + ' <small style="display:inline;font-size:11px">ج.م</small></strong>' +
    '</div>' +
  '</div>' +
  '<div class="button-row" style="margin-bottom:18px">' +
    '<button class="primary-btn" style="background:var(--green)" data-action="open-add-custody-cash">' + icon('plus') + ' إضافة عهدة (فلوس)</button>' +
    '<button class="primary-btn" data-action="open-add-expense-modal">' + icon('receipt') + ' صرف مصروف (فلوس)</button>' +
  '</div>' +
  buildUnifiedCashLedgerHtml();
}

function buildOrderInvoiceData(orderOrId) {
  const o = typeof orderOrId === 'object' && orderOrId ? orderOrId : oBy(orderOrId || state.selectedOrder);
  if (!o) return null;
  const c = o.customer || cBy(o.cid || o.customer_id) || {};
  const ops = getOrderOps(o);
  const ref = o.display_number || ('#EN-' + o.id);
  const shipping = Number(o.shipping_amount ?? o.shipping ?? 0);
  const grandTotal = total(o);
  const subtotal = Math.max(0, grandTotal - shipping);
  const rows = [];
  const allProds = getProducts();

  const findProductForLine = l => {
    if (l.variant) return l.variant;
    const byId = pBy(l.variant_id || l.variantId);
    if (byId) return byId;
    const snap = String(l.product_name || l.label_snapshot || l.name || '').trim().toLowerCase();
    if (snap) {
      const matched = allProds.find(p => {
        const full = ((p.brand || '') + ' ' + (p.name || '') + ' ' + (p.color_name || p.color || '')).toLowerCase();
        return full.includes(snap) || snap.includes((p.name || '').toLowerCase());
      });
      if (matched) return matched;
    }
    return {};
  };

  if (Array.isArray(o.lines) && o.lines.length > 0) {
    o.lines.forEach(l => {
      const p = findProductForLine(l);
      const qty = Number(l.qty || 1);
      const unitPrice = Number(l.unit_price ?? p.sale_price ?? 0);
      const extId = p.external_id || l.external_id || null;
      const photoUrl = getProductPhotoUrl({ image_url: p.image_url || l.image_url, external_id: extId }, false);
      rows.push({
        name: p.name || l.product_name || l.label_snapshot || l.name || 'بكرة ENZA',
        color: p.color_name || p.color || l.color_name || '',
        colorHex: p.color_hex || p.hex || l.color_hex || '#7c858e',
        brand: p.brand || l.brand || '',
        type: p.type || l.type || 'spool',
        photoUrl,
        qty,
        unitPrice,
        lineTotal: qty * unitPrice
      });
    });
  } else if (Array.isArray(o.items) && o.items.length > 0) {
    o.items.forEach(([pid, qty, customPrice]) => {
      const p = pBy(pid) || {};
      const q = Number(qty || 1);
      const unitPrice = Number(customPrice ?? p.sale_price ?? p.price ?? 0);
      rows.push({
        name: p.name || 'بكرة ENZA',
        color: p.color_name || p.color || '',
        colorHex: p.color_hex || p.hex || '#7c858e',
        brand: p.brand || '',
        type: p.type || 'spool',
        photoUrl: getProductPhotoUrl(p, false),
        qty: q,
        unitPrice,
        lineTotal: q * unitPrice
      });
    });
  }

  return {
    id: o.id,
    ref,
    placedAt: o.placed_at || new Date().toISOString(),
    dateText: formatArabicDate(o.placed_at),
    timeText: formatArabicTime(o.placed_at),
    customerName: c.display_name || c.name || 'عميل ENZA',
    customerPhone: c.phone_e164 || c.phone || '—',
    customerCity: c.city || '',
    customerAddress: c.address || '—',
    paymentMethod: o.payment_method || 'نقدي / عند الاستلام',
    rows,
    subtotal,
    shipping,
    grandTotal,
    paid: Number(ops.paid || 0),
    remaining: Number(ops.remaining || 0)
  };
}

function openBrandedInvoiceModal(orderOrId) {
  const inv = buildOrderInvoiceData(orderOrId);
  if (!inv) { toast('تعذر العثور على بيانات الفاتورة'); return; }
  state.activeInvoiceData = inv;

  const payStatusHtml = inv.remaining <= 0
    ? '<span class="badge" style="background:var(--green-bg);color:var(--green);font-weight:700;padding:3px 9px">خالص بالكامل</span>'
    : (inv.paid > 0
      ? '<span class="badge" style="background:#fff6e5;color:#b26a00;font-weight:700;padding:3px 9px">مدفوع جزئياً</span>'
      : '<span class="badge" style="background:#fff0f1;color:var(--red);font-weight:700;padding:3px 9px">آجل بالكامل</span>');

  openModal('فاتورة ENZA الرسمية',
    '<div class="enza-invoice-paper">' +
      '<div class="inv-watermark"><img src="assets/enza-logo.png" alt=""></div>' +
      '<div class="inv-head">' +
        '<div class="inv-head-brand">' +
          '<img src="assets/enza-logo.png" alt="ENZA 3D Printing" class="inv-head-logo">' +
          '<div>' +
            '<h3>ENZA 3D PRINTING</h3>' +
            '<small>فاتورة مبيعات رسمية • OFFICIAL INVOICE</small>' +
          '</div>' +
        '</div>' +
        '<div class="inv-head-meta">' +
          '<strong>' + esc(inv.ref) + '</strong>' +
          '<span>' + esc(inv.dateText) + '</span>' +
          '<span class="ltr">' + esc(inv.timeText) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="inv-red-bar"></div>' +
      '<div class="inv-body">' +
        '<div class="inv-info-grid">' +
          '<div><small>اسم العميل</small><b>' + esc(inv.customerName) + '</b></div>' +
          '<div><small>رقم التليفون</small><b class="ltr" style="text-align:right">' + esc(inv.customerPhone) + '</b></div>' +
          '<div><small>المدينة / العنوان</small><b>' + esc([inv.customerCity, inv.customerAddress].filter(v => v && v !== '—').join(' — ') || '—') + '</b></div>' +
          '<div><small>حالة السداد</small><div style="margin-top:2px">' + payStatusHtml + '</div></div>' +
        '</div>' +
        '<table class="inv-table">' +
          '<thead><tr><th>الصنف واللون</th><th style="text-align:center">الكمية</th><th style="text-align:center">السعر</th><th>الإجمالي</th></tr></thead>' +
          '<tbody>' +
            (inv.rows.length > 0 ? inv.rows.map(r => {
              const thumbHtml = r.photoUrl
                ? '<img class="inv-prod-thumb" src="' + esc(r.photoUrl) + '" alt="" onerror="this.style.display=\'none\'">'
                : '<span class="inv-prod-thumb" style="display:grid;place-items:center;background:#faf9f6"><span style="width:22px;height:22px;border-radius:50%;background:' + esc(r.colorHex) + ';border:3px solid #25262b;display:block"></span></span>';
              return '<tr>' +
                '<td><div class="inv-prod-cell">' +
                  thumbHtml +
                  '<div>' +
                    (r.brand ? '<div style="font-size:9px;color:var(--muted);font-weight:700">' + esc(r.brand) + '</div>' : '') +
                    '<b>' + esc(r.name) + '</b>' +
                    (r.color ? '<div style="font-size:10px;color:var(--muted);margin-top:2px"><span class="inv-color-dot" style="background:' + esc(r.colorHex) + '"></span>' + esc(r.color) + '</div>' : '') +
                  '</div>' +
                '</div></td>' +
                '<td style="text-align:center;font-weight:700">' + r.qty + '</td>' +
                '<td style="text-align:center" class="ltr">' + money(r.unitPrice) + '</td>' +
                '<td class="ltr">' + money(r.lineTotal) + ' ج.م</td>' +
              '</tr>';
            }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--muted)">لا توجد بنود مسجلة</td></tr>') +
          '</tbody>' +
        '</table>' +
        '<div class="inv-totals">' +
          '<div class="inv-total-row"><span>قيمة المنتجات</span><b class="ltr">' + money(inv.subtotal) + ' ج.م</b></div>' +
          '<div class="inv-total-row"><span>مصاريف الشحن والتوصيل</span><b class="ltr">' + money(inv.shipping) + ' ج.م</b></div>' +
          '<div class="inv-total-row grand"><span>الإجمالي النهائي</span><span class="ltr">' + money(inv.grandTotal) + ' ج.م</span></div>' +
          '<div class="inv-total-row" style="margin-top:6px"><span>المبلغ المدفوع</span><b style="color:var(--green)" class="ltr">' + money(inv.paid) + ' ج.م</b></div>' +
          '<div class="inv-total-row"><span>المتبقي على العميل</span><b style="color:' + (inv.remaining > 0 ? 'var(--red)' : 'var(--green)') + '" class="ltr">' + money(inv.remaining) + ' ج.م</b></div>' +
        '</div>' +
      '</div>' +
      '<div class="inv-footer">شكراً لتعاملكم مع <b>ENZA 3D Printing</b> • خامات الطباعة ثلاثية الأبعاد بأعلى جودة</div>' +
    '</div>' +
    '<button type="button" class="primary-btn" style="background:#df2635;margin-bottom:8px" data-action="share-invoice-pdf">' + icon('receipt') + ' حفظ ومشاركة PDF على واتساب</button>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">' +
      '<button type="button" class="secondary-btn" data-action="share-invoice-image">' + icon('box') + ' مشاركة كصورة</button>' +
      '<button type="button" class="secondary-btn" data-action="copy-invoice-text">' + icon('chat') + ' نسخ نص للواتساب</button>' +
    '</div>' +
    '<button type="button" class="secondary-btn" data-action="close-modal">إغلاق</button>'
  );
}

function loadImageAsync(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadSafeCanvasPhoto(photoUrl) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('data:')) return loadImageAsync(photoUrl);
  if (window.EnzaShare && typeof window.EnzaShare.fetchImageDataUrl === 'function') {
    try {
      const dataUrl = window.EnzaShare.fetchImageDataUrl(photoUrl);
      if (dataUrl && dataUrl.startsWith('data:image/')) {
        return await loadImageAsync(dataUrl);
      }
    } catch (e) {}
  }
  return loadImageAsync(photoUrl);
}

function drawSpoolOrBottleFallback(ctx, x, y, size, colorHex, type) {
  ctx.save();
  // Clean card tile
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, size, size, 12) : ctx.rect(x, y, size, size);
  ctx.fill();
  ctx.strokeStyle = '#e6e3dc';
  ctx.lineWidth = 2;
  ctx.stroke();

  const cx = x + size / 2;
  const cy = y + size / 2;
  if (type === 'bottle') {
    // 3D Resin bottle
    ctx.fillStyle = '#25262b';
    ctx.fillRect(cx - 10, y + 8, 20, 10);
    ctx.fillStyle = colorHex || '#7c858e';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cx - 17, y + 18, 34, size - 26, 7) : ctx.rect(cx - 17, y + 18, 34, size - 26);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(cx - 14, cy - 2, 28, 14);
  } else {
    // 3D Filament Spool with exact filament color
    const rOuter = size * 0.38;
    const rInner = size * 0.16;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.fillStyle = '#25262b';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter - 5, 0, Math.PI * 2);
    ctx.fillStyle = colorHex || '#df2635';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, rInner + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f5f4f0';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, rInner - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#25262b';
    ctx.fill();
  }
  ctx.restore();
}

async function renderInvoiceToPngDataUrl(inv) {
  const W = 1080;
  const rowH = 104;
  const rows = inv.rows.length ? inv.rows : [{ name: 'لا توجد بنود', color: '', colorHex: '#7c858e', brand: '', type: 'spool', photoUrl: '', qty: 0, unitPrice: 0, lineTotal: 0 }];
  const H = 860 + rows.length * rowH + 220;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Preload logo + product photos in parallel
  const [logoImg, ...rowImgs] = await Promise.all([
    loadImageAsync('assets/enza-logo.png'),
    ...rows.map(r => loadSafeCanvasPhoto(r.photoUrl))
  ]);

  // Outer soft background
  ctx.fillStyle = '#f3f1ec';
  ctx.fillRect(0, 0, W, H);

  // Main white paper card
  const pad = 38;
  const cardW = W - pad * 2;
  const cardH = H - pad * 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(pad, pad, cardW, cardH, 30) : ctx.rect(pad, pad, cardW, cardH);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#e5e2da';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(pad, pad, cardW, cardH, 30) : ctx.rect(pad, pad, cardW, cardH);
  ctx.stroke();

  // Centered ENZA 3D Printing Background Watermark Logo
  if (logoImg) {
    ctx.save();
    ctx.globalAlpha = 0.065;
    const wmSize = 540;
    const wmScale = Math.min(wmSize / logoImg.width, wmSize / logoImg.height);
    const wmW = logoImg.width * wmScale;
    const wmH = logoImg.height * wmScale;
    ctx.drawImage(logoImg, (W - wmW) / 2, pad + 260 + (cardH - 380 - wmH) / 2, wmW, wmH);
    ctx.restore();
  }

  // Rich Gradient Header Band
  const headH = 195;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(pad, pad, cardW, headH, [30, 30, 0, 0]) : ctx.rect(pad, pad, cardW, headH);
  ctx.clip();
  const hGrad = ctx.createLinearGradient(pad, pad, pad + cardW, pad + headH);
  hGrad.addColorStop(0, '#1c1d22');
  hGrad.addColorStop(1, '#2f313a');
  ctx.fillStyle = hGrad;
  ctx.fillRect(pad, pad, cardW, headH);
  // Subtle decorative red glow circles
  ctx.fillStyle = 'rgba(223, 38, 53, 0.16)';
  ctx.beginPath();
  ctx.arc(pad + 60, pad + 30, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.beginPath();
  ctx.arc(pad + cardW - 180, pad + headH + 20, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Red brand accent bar
  const barGrad = ctx.createLinearGradient(pad, 0, pad + cardW, 0);
  barGrad.addColorStop(0, '#df2635');
  barGrad.addColorStop(0.7, '#b81d29');
  barGrad.addColorStop(1, '#25262b');
  ctx.fillStyle = barGrad;
  ctx.fillRect(pad, pad + headH, cardW, 10);

  // Header Logo Badge (Right side - RTL)
  const logoBoxSize = 128;
  const logoX = pad + cardW - 36 - logoBoxSize;
  const logoY = pad + 33;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(logoX, logoY, logoBoxSize, logoBoxSize, 24) : ctx.rect(logoX, logoY, logoBoxSize, logoBoxSize);
  ctx.fill();
  ctx.restore();
  if (logoImg) {
    const scale = Math.min((logoBoxSize - 16) / logoImg.width, (logoBoxSize - 16) / logoImg.height);
    const dw = logoImg.width * scale;
    const dh = logoImg.height * scale;
    ctx.drawImage(logoImg, logoX + (logoBoxSize - dw) / 2, logoY + (logoBoxSize - dh) / 2, dw, dh);
  }

  // Brand Title next to logo
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px "Cairo", "Segoe UI", Arial, sans-serif';
  ctx.fillText('ENZA 3D PRINTING', logoX - 26, pad + 88);
  ctx.fillStyle = '#d4d6de';
  ctx.font = '23px "Cairo", "Segoe UI", Arial, sans-serif';
  ctx.fillText('فاتورة مبيعات رسمية  •  OFFICIAL INVOICE', logoX - 26, pad + 132);

  // Invoice Number Red Pill + Date/Time (Left side)
  const pillX = pad + 36;
  const pillY = pad + 42;
  ctx.fillStyle = '#df2635';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(pillX, pillY, 240, 48, 12) : ctx.rect(pillX, pillY, 240, 48);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
  ctx.fillText(inv.ref, pillX + 120, pillY + 33);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#e1e2e8';
  ctx.font = '22px "Cairo", "Segoe UI", Arial, sans-serif';
  ctx.fillText(inv.dateText, pillX, pad + 126);
  ctx.fillStyle = '#bfc2cc';
  ctx.font = '21px "Cairo", "Segoe UI", Arial, sans-serif';
  ctx.fillText(inv.timeText, pillX, pad + 158);

  // Clean 2x2 Customer Details Box (ZERO overlap)
  let y = pad + headH + 38;
  const innerX = pad + 36;
  const innerW = cardW - 72;
  const infoH = 166;
  ctx.fillStyle = 'rgba(247, 246, 243, 0.92)';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(innerX, y, innerW, infoH, 20) : ctx.rect(innerX, y, innerW, infoH);
  ctx.fill();
  ctx.strokeStyle = '#e9e6de';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Subtle vertical divider in center
  ctx.strokeStyle = '#e5e2da';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(innerX + innerW / 2, y + 20);
  ctx.lineTo(innerX + innerW / 2, y + infoH - 20);
  ctx.stroke();

  // Right column: Customer Name & Address
  ctx.textAlign = 'right';
  ctx.fillStyle = '#80828a';
  ctx.font = '19px "Cairo", "Segoe UI", Arial, sans-serif';
  ctx.fillText('اسم العميل', innerX + innerW - 24, y + 34);
  ctx.fillStyle = '#1e1f24';
  ctx.font = 'bold 27px "Cairo", "Segoe UI", Arial, sans-serif';
  ctx.fillText(String(inv.customerName).slice(0, 26), innerX + innerW - 24, y + 68);

  ctx.fillStyle = '#80828a';
  ctx.font = '19px "Cairo", "Segoe UI", Arial, sans-serif';
  ctx.fillText('المدينة / العنوان', innerX + innerW - 24, y + 112);
  ctx.fillStyle = '#25262b';
  ctx.font = '22px "Cairo", "Segoe UI", Arial, sans-serif';
  const addrLine = [inv.customerCity, inv.customerAddress].filter(v => v && v !== '—').join(' — ') || '—';
  ctx.fillText(addrLine.slice(0, 34), innerX + innerW - 24, y + 144);

  // Left column: Phone & Payment Status Pill
  const leftColRight = innerX + innerW / 2 - 24;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#80828a';
  ctx.font = '19px "Cairo", "Segoe UI", Arial, sans-serif';
  ctx.fillText('رقم التليفون', leftColRight, y + 34);
  ctx.fillStyle = '#1e1f24';
  ctx.font = 'bold 25px "Segoe UI", Arial, sans-serif';
  ctx.fillText(inv.customerPhone, leftColRight, y + 68);

  ctx.fillStyle = '#80828a';
  ctx.font = '19px "Cairo", "Segoe UI", Arial, sans-serif';
  ctx.fillText('حالة السداد', leftColRight, y + 112);

  const isPaidFull = inv.remaining <= 0;
  const isPartial = !isPaidFull && inv.paid > 0;
  const badgeText = isPaidFull ? 'خالص بالكامل' : (isPartial ? 'مدفوع جزئياً' : 'آجل بالكامل');
  const badgeBg = isPaidFull ? '#e6f6ec' : (isPartial ? '#fff4e0' : '#fdebec');
  const badgeFg = isPaidFull ? '#157a40' : (isPartial ? '#b26a00' : '#df2635');
  const bW = 175, bH = 38;
  ctx.fillStyle = badgeBg;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(leftColRight - bW, y + 120, bW, bH, 10) : ctx.rect(leftColRight - bW, y + 120, bW, bH);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = badgeFg;
  ctx.font = 'bold 21px "Cairo", "Segoe UI", Arial, sans-serif';
  ctx.fillText(badgeText, leftColRight - bW / 2, y + 146);

  // Table Header
  y += infoH + 28;
  ctx.fillStyle = '#25262b';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(innerX, y, innerW, 60, 14) : ctx.rect(innerX, y, innerW, 60);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Cairo", "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('الصنف واللون والشكل', innerX + innerW - 22, y + 39);
  ctx.textAlign = 'center';
  ctx.fillText('الكمية', innerX + 350, y + 39);
  ctx.fillText('السعر', innerX + 225, y + 39);
  ctx.textAlign = 'left';
  ctx.fillText('الإجمالي', innerX + 22, y + 39);

  // Table Rows with Real Spool Photo / 3D Spool Graphic + Color Swatch
  y += 60;
  rows.forEach((r, idx) => {
    if (idx % 2 === 1) {
      ctx.fillStyle = 'rgba(250, 249, 246, 0.85)';
      ctx.fillRect(innerX, y, innerW, rowH);
    }
    ctx.strokeStyle = '#efece6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(innerX, y + rowH);
    ctx.lineTo(innerX + innerW, y + rowH);
    ctx.stroke();

    // Spool / Bottle Photo Tile on right
    const thumbSize = 74;
    const thumbX = innerX + innerW - 16 - thumbSize;
    const thumbY = y + (rowH - thumbSize) / 2;
    const pImg = rowImgs[idx];
    if (pImg) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 14) : ctx.rect(thumbX, thumbY, thumbSize, thumbSize);
      ctx.fill();
      ctx.strokeStyle = '#e6e3dc';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.clip();
      const s = Math.min((thumbSize - 8) / pImg.width, (thumbSize - 8) / pImg.height);
      const w = pImg.width * s;
      const h = pImg.height * s;
      ctx.drawImage(pImg, thumbX + (thumbSize - w) / 2, thumbY + (thumbSize - h) / 2, w, h);
      ctx.restore();
    } else {
      drawSpoolOrBottleFallback(ctx, thumbX, thumbY, thumbSize, r.colorHex, r.type);
    }

    // Product Name + Brand + Color Swatch Dot
    const textRight = thumbX - 18;
    ctx.textAlign = 'right';
    if (r.brand) {
      ctx.fillStyle = '#8b8d94';
      ctx.font = 'bold 17px "Segoe UI", Arial, sans-serif';
      ctx.fillText(String(r.brand).toUpperCase(), textRight, y + 28);
    }
    ctx.fillStyle = '#1e1f24';
    ctx.font = 'bold 23px "Cairo", "Segoe UI", Arial, sans-serif';
    ctx.fillText(String(r.name).slice(0, 28), textRight, y + (r.brand ? 58 : 44));

    if (r.color) {
      // Color dot
      ctx.beginPath();
      ctx.arc(textRight - 8, y + 80, 7, 0, Math.PI * 2);
      ctx.fillStyle = r.colorHex || '#7c858e';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#666870';
      ctx.font = '19px "Cairo", "Segoe UI", Arial, sans-serif';
      ctx.fillText(String(r.color).slice(0, 26), textRight - 22, y + 86);
    }

    // Qty, Unit Price, Total
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1e1f24';
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillText(String(r.qty), innerX + 350, y + 58);
    ctx.fillStyle = '#4a4c54';
    ctx.font = '23px "Segoe UI", Arial, sans-serif';
    ctx.fillText(money(r.unitPrice), innerX + 225, y + 58);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e1f24';
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillText(money(r.lineTotal) + ' ج.م', innerX + 22, y + 58);

    y += rowH;
  });

  // Totals & Payment Breakdown Box
  y += 28;
  const totH = 266;
  ctx.fillStyle = 'rgba(247, 246, 243, 0.94)';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(innerX, y, innerW, totH, 20) : ctx.rect(innerX, y, innerW, totH);
  ctx.fill();
  ctx.strokeStyle = '#e9e6de';
  ctx.lineWidth = 2;
  ctx.stroke();

  const drawTotalRow = (label, value, offsetY, color = '#25262b', big = false) => {
    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.font = (big ? 'bold 30px' : '23px') + ' "Cairo", "Segoe UI", Arial, sans-serif';
    ctx.fillText(label, innerX + innerW - 26, y + offsetY);
    ctx.textAlign = 'left';
    ctx.font = (big ? 'bold 32px' : 'bold 24px') + ' "Segoe UI", Arial, sans-serif';
    ctx.fillText(value, innerX + 26, y + offsetY);
  };

  drawTotalRow('قيمة المنتجات', money(inv.subtotal) + ' ج.م', 44);
  drawTotalRow('مصاريف الشحن والتوصيل', money(inv.shipping) + ' ج.م', 88);

  // Highlighted Grand Total Strip
  ctx.fillStyle = 'rgba(223, 38, 53, 0.08)';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(innerX + 16, y + 108, innerW - 32, 62, 12) : ctx.rect(innerX + 16, y + 108, innerW - 32, 62);
  ctx.fill();
  ctx.strokeStyle = '#df2635';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawTotalRow('الإجمالي النهائي', money(inv.grandTotal) + ' ج.م', 150, '#df2635', true);

  drawTotalRow('المبلغ المدفوع', money(inv.paid) + ' ج.م', 206, '#157a40', false);
  drawTotalRow('المتبقي على العميل', money(inv.remaining) + ' ج.م', 246, inv.remaining > 0 ? '#df2635' : '#157a40', false);

  // Dark Branded Footer Bar
  const footH = 74;
  const footY = pad + cardH - footH;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(pad, footY, cardW, footH, [0, 0, 30, 30]) : ctx.rect(pad, footY, cardW, footH);
  ctx.clip();
  ctx.fillStyle = '#25262b';
  ctx.fillRect(pad, footY, cardW, footH);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 21px "Cairo", "Segoe UI", Arial, sans-serif';
  ctx.fillText('شكراً لتعاملكم مع ENZA 3D Printing', W / 2, footY + 34);
  ctx.fillStyle = '#b9bcc6';
  ctx.font = '18px "Segoe UI", Arial, sans-serif';
  ctx.fillText('enza-trade-co.odoo.com  •  خامات الطباعة ثلاثية الأبعاد بأعلى جودة', W / 2, footY + 60);

  return canvas.toDataURL('image/png');
}

function openCashEntryDetailModal(kind, id) {
  const catNames = {
    fuel: 'وقود وبنزين',
    transit: 'مواصلات وانتقالات',
    shipping: 'شحن وتوصيل',
    maint: 'صيانة وإصلاحات',
    food: 'ضيافة وإعاشة',
    other: 'مصروفات تشغيلية أخرى'
  };

  let entry = null;
  if (kind === 'inflow') {
    const history = JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]');
    const m = history.find(x => String(x.id) === String(id));
    if (!m) { toast('تعذّر العثور على تفاصيل الحركة'); return; }
    let typeLabel = 'إضافة نقدية للعهدة';
    let title = m.notes || 'إضافة نقدية للعهدة';
    if (m.type === 'settle_debt') {
      typeLabel = 'تحصيل مديونية عميل';
      title = 'تحصيل مديونية: ' + (m.customer_name || 'عميل');
    } else if (m.type === 'disburse_to_customer') {
      typeLabel = 'تحصيل نقدي من صرف بضاعة';
      title = 'تحصيل صرف بضاعة: ' + (m.customer_name || 'عميل');
    }
    entry = {
      id: m.id,
      kind: 'inflow',
      typeLabel,
      title,
      amount: Number(m.cash_collected || 0),
      source: m.source || (m.type === 'cash_inflow' ? (m.notes || 'إضافة عهدة نقدية') : typeLabel),
      customerName: m.customer_name || '',
      customerId: m.customer_id || '',
      productName: m.product_name || '',
      qty: m.qty || 0,
      notes: m.notes || '',
      receiptUrl: m.receipt_image_url || m.waybill_image || null,
      createdAt: m.created_at || new Date().toISOString()
    };
  } else {
    const allExp = JSON.parse(localStorage.getItem('enza_expenses') || '[]');
    const x = allExp.find(item => String(item.id) === String(id));
    if (!x) { toast('تعذّر العثور على تفاصيل المصروف'); return; }
    entry = {
      id: x.id,
      kind: 'outflow',
      typeLabel: 'صرف مصروف من العهدة',
      title: x.title || 'مصروف تشغيلي',
      amount: Number(x.amount || 0),
      source: catNames[x.category] || x.category || 'مصروفات تشغيلية أخرى',
      customerName: '',
      customerId: '',
      productName: '',
      qty: 0,
      notes: x.notes || '',
      receiptUrl: x.receipt_image_url || null,
      createdAt: x.created_at || new Date().toISOString()
    };
  }

  const isAdd = entry.kind === 'inflow';
  const dt = new Date(entry.createdAt);
  const fullDate = dt.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const fullTime = dt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  openModal(isAdd ? 'تفاصيل إضافة العهدة (+)' : 'تفاصيل صرف المصروف (-)',
    '<div style="background:' + (isAdd ? 'var(--green-bg)' : '#fff5f5') + ';border:1px solid ' + (isAdd ? '#c6ebd4' : '#fcd9dc') + ';border-radius:16px;padding:16px;text-align:center;margin-bottom:14px">' +
      '<span class="badge" style="background:' + (isAdd ? 'var(--green)' : 'var(--red)') + ';color:#fff;font-size:11px;padding:3px 10px">' +
        esc(entry.typeLabel) +
      '</span>' +
      '<div style="font-size:28px;font-weight:800;margin-top:8px;direction:ltr;color:' + (isAdd ? 'var(--green)' : 'var(--red)') + '">' +
        (isAdd ? '+' : '-') + money(entry.amount) + ' <span style="font-size:14px">ج.م</span>' +
      '</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:4px">' + fullDate + ' · ' + fullTime + '</div>' +
    '</div>' +
    '<div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:4px 14px;margin-bottom:14px">' +
      '<div class="cash-detail-row"><span>البيان / العنوان</span><b>' + esc(entry.title) + '</b></div>' +
      '<div class="cash-detail-row"><span>' + (isAdd ? 'المصدر / النوع' : 'تصنيف المصروف') + '</span><b>' + esc(entry.source) + '</b></div>' +
      (entry.customerName ? '<div class="cash-detail-row"><span>العميل</span><b>' + esc(entry.customerName) + '</b></div>' : '') +
      (entry.productName ? '<div class="cash-detail-row"><span>المنتج</span><b>' + esc(entry.productName) + (entry.qty ? ' (' + entry.qty + ' بكرة)' : '') + '</b></div>' : '') +
      (entry.notes ? '<div class="cash-detail-row"><span>الملاحظات</span><b>' + esc(entry.notes) + '</b></div>' : '') +
      '<div class="cash-detail-row"><span>التاريخ</span><b>' + fullDate + '</b></div>' +
      '<div class="cash-detail-row"><span>الوقت</span><b class="ltr">' + fullTime + '</b></div>' +
    '</div>' +
    (entry.receiptUrl ?
      '<div style="margin-bottom:14px">' +
        '<div style="font-size:12px;font-weight:700;margin-bottom:6px">صورة الفاتورة / الإيصال المرفق</div>' +
        '<img src="' + esc(entry.receiptUrl) + '" alt="إيصال" data-action="view-proof-image" data-img="' + esc(entry.receiptUrl) + '" data-title="صورة الفاتورة المرفقة" style="width:100%;max-height:220px;object-fit:contain;border-radius:12px;border:1px solid var(--line);background:#faf9f7;cursor:pointer">' +
      '</div>' : '') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
      '<button type="button" class="secondary-btn" data-action="' + (isAdd ? 'delete-cash-inflow' : 'delete-expense') + '" data-id="' + esc(String(entry.id)) + '" style="color:var(--red);border-color:#fcd9dc;background:#fff7f7">' +
        icon('trash') + ' حذف الحركة' +
      '</button>' +
      '<button type="button" class="primary-btn" data-action="close-modal">إغلاق</button>' +
    '</div>'
  );
}

function openAddExpenseModal() {
  state.expenseReceiptBase64 = null;
  openModal('تسجيل مصروف جديد',
    '<form id="expense-form" novalidate>' +
      '<label class="field-label" for="exp-amount">المبلغ المصروف (ج.م) *</label>' +
      '<input type="number" id="exp-amount" class="field ltr" min="0.01" step="any" placeholder="مثال: 150" style="font-size:20px;font-weight:700" required>' +
      '<label class="field-label" for="exp-category">تصنيف المصروف *</label>' +
      '<select id="exp-category" class="field" style="direction:rtl" required>' +
        '<option value="fuel">وقود وبنزين</option>' +
        '<option value="transit">مواصلات وانتقالات</option>' +
        '<option value="shipping">شحن وتوصيل</option>' +
        '<option value="maint">صيانة وإصلاحات</option>' +
        '<option value="food">ضيافة وإعاشة</option>' +
        '<option value="other">مصروفات تشغيلية أخرى</option>' +
      '</select>' +
      '<label class="field-label" for="exp-title">بيان المصروف *</label>' +
      '<input type="text" id="exp-title" class="field" placeholder="مثال: بنزين للموتوسيكل / كارتة الطريق" required>' +
      '<label class="field-label" for="exp-notes">ملاحظات إضافية</label>' +
      '<input type="text" id="exp-notes" class="field" placeholder="أي تفاصيل أخرى (اختياري)">' +
      '<label class="field-label" for="exp-receipt-file">تصوير الفاتورة أو اختيارها من المعرض (اختياري)</label>' +
      '<input type="file" accept="image/*" id="exp-receipt-file" class="field">' +
      '<div id="exp-receipt-preview" style="margin-top:6px"></div>' +
      '<div class="inline-error" id="exp-form-error" role="alert"></div>' +
      '<button type="submit" class="primary-btn" id="exp-submit-btn" style="margin-top:16px">' +
        icon('check') + ' حفظ المصروف في الخزينة' +
      '</button>' +
    '</form>'
  );
}

function openAddCustodyCashModal() {
  openModal('إضافة نقدية للعهدة (تزويد فلوس)',
    '<p class="sheet-description">تسجيل مبلغ نقدي مضاف إلى رصيد العهدة والخزينة</p>' +
    '<form id="add-custody-cash-form">' +
      '<label class="field-label" for="cust-cash-amount">المبلغ المضاف للعهدة (ج.م) *</label>' +
      '<input type="number" id="cust-cash-amount" class="field ltr" min="1" step="any" placeholder="مثال: 2000" style="font-size:20px;font-weight:700" required>' +
      '<label class="field-label" for="cust-cash-source">مصدر النقدية *</label>' +
      '<select id="cust-cash-source" class="field" style="direction:rtl">' +
        '<option value="عهدة نقدية من الإدارة">عهدة نقدية من الإدارة</option>' +
        '<option value="توريد من شركة الشحن (Urgent)">توريد من شركة الشحن (Urgent)</option>' +
        '<option value="تحصيل نقدي مباشر">تحصيل نقدي مباشر</option>' +
        '<option value="إضافة نقدية أخرى">إضافة نقدية أخرى</option>' +
      '</select>' +
      '<label class="field-label" for="cust-cash-notes">بيان / ملاحظات (اختياري)</label>' +
      '<input type="text" id="cust-cash-notes" class="field" placeholder="أي تفاصيل إضافية...">' +
      '<div class="inline-error" id="cust-cash-error"></div>' +
      '<button type="submit" class="primary-btn" style="background:var(--green);margin-top:16px">' +
        icon('check') + ' إضافة المبلغ لرصيد العهدة' +
      '</button>' +
    '</form>'
  );
}

function openQuickAddStockModal(preselectedProd = null) {
  const prods = getProducts();
  if (prods.length === 0) {
    toast('لا توجد منتجات في المخزن');
    return;
  }
  const selProd = preselectedProd || prods[0];
  state.quickAddStockVariantId = selProd.id;
  state.quickAddStockQty = 1;

  openModal('إضافة بضاعة للمخزن (توريد بكرات)',
    '<p class="sheet-description">امسح باركود البكرة أو اختر المنتج لتزويد رصيد المخزن</p>' +
    '<div style="margin-bottom:12px">' +
      '<button type="button" class="secondary-btn" data-action="scan-barcode-for-add-stock" style="border:1.5px dashed var(--ink);background:#f8f9fa">' +
        icon('scan') + ' مسح باركود البكرة بالكاميرا' +
      '</button>' +
      '<div id="quick-stock-scanner-box" style="display:none;margin-top:10px;border-radius:12px;overflow:hidden"></div>' +
    '</div>' +
    '<form id="quick-add-stock-form">' +
      '<label class="field-label" for="quick-stock-product">المنتج / البكرة *</label>' +
      '<select id="quick-stock-product" class="field" style="direction:rtl">' +
        prods.map(p =>
          '<option value="' + p.id + '" ' + (String(p.id) === String(selProd.id) ? 'selected' : '') + '>' +
            esc(p.brand) + ' — ' + esc(p.name) + ' (' + esc(p.color_name || p.color) + ') [الرصيد الحالي: ' + (p.available_qty !== undefined ? p.available_qty : p.stock) + ']' +
          '</option>'
        ).join('') +
      '</select>' +
      '<label class="field-label" for="quick-stock-qty">الكمية المضافة للمخزن (بكرة) *</label>' +
      '<input type="number" id="quick-stock-qty" class="field ltr" min="1" step="1" value="1" style="font-size:20px;font-weight:700" required>' +
      '<label class="field-label" for="quick-stock-notes">ملاحظات التوريد (اختياري)</label>' +
      '<input type="text" id="quick-stock-notes" class="field" placeholder="مثال: توريد جديد للمخزن">' +
      '<div class="inline-error" id="quick-stock-error"></div>' +
      '<button type="submit" class="primary-btn" id="quick-stock-submit" style="background:var(--green);margin-top:16px">' +
        icon('check') + ' تأكيد إضافة البضاعة للمخزن' +
      '</button>' +
    '</form>'
  );
}

function openNewCustomerModal() {
  openModal('إضافة عميل جديد',
    '<p class="sheet-description">سجّل بيانات العميل ليظهر في قائمة عملائك ويسهل الصرف له</p>' +
    '<form id="standalone-customer-form">' +
      '<label class="field-label" for="new-cust-name">اسم العميل *</label>' +
      '<input type="text" id="new-cust-name" class="field" placeholder="مثال: إبراهيم محمد" required>' +
      '<label class="field-label" for="new-cust-phone">رقم التليفون *</label>' +
      '<input type="tel" id="new-cust-phone" class="field ltr" placeholder="01xxxxxxxxx" required>' +
      '<label class="field-label" for="new-cust-city">المحافظة / المدينة</label>' +
      '<input type="text" id="new-cust-city" class="field" placeholder="مثال: الإسكندرية">' +
      '<label class="field-label" for="new-cust-address">العنوان بالتفصيل</label>' +
      '<input type="text" id="new-cust-address" class="field" placeholder="المنطقة، الشارع، رقم العقار">' +
      '<div class="inline-error" id="new-cust-error"></div>' +
      '<button type="submit" class="primary-btn" id="new-cust-submit" style="margin-top:16px">' +
        icon('check') + ' حفظ العميل الجديد' +
      '</button>' +
    '</form>'
  );
}

function renderCustody() {
  const history = (window.EnzaDB ? JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]') : []);
  const allExp = (window.EnzaDB ? JSON.parse(localStorage.getItem('enza_expenses') || '[]') : []);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMovements = history.filter(m => (m.created_at || '').startsWith(todayStr));

  const disbursedTodayQty = todayMovements
    .filter(m => m.type === 'disburse_to_customer')
    .reduce((s, m) => s + (m.qty || 0), 0);

  const receivedTotalQty = history
    .filter(m => m.type === 'receive_from_warehouse' || m.type === 'restock' || m.type === 'receive_from_main')
    .reduce((s, m) => s + (m.qty || 0), 0);

  const totalDisbursedQty = history
    .filter(m => m.type === 'disburse_to_customer')
    .reduce((s, m) => s + (m.qty || 0), 0);

  const totalInflowCash = history
    .filter(m => m.type === 'cash_inflow' || m.type === 'disburse_to_customer' || m.type === 'settle_debt')
    .reduce((s, m) => s + Number(m.cash_collected || 0), 0);
  const totalExpCash = allExp.reduce((s, x) => s + Number(x.amount || 0), 0);
  const netCustodyCash = totalInflowCash - totalExpCash;

  const ords = getOrders();
  const totalRemainingDebt = ords.reduce((s, o) => s + getOrderOps(o).remaining, 0);

  const baseCustody = 15;
  const custodianTotalSpools = Math.max(0, baseCustody + receivedTotalQty - totalDisbursedQty);

  const shippedOrders = ords.filter(o => (o.fulfillment_status || o.status) === 'shipped' || (o.fulfillment_status || o.status) === 'delivered');
  const urgentTotalOrders = shippedOrders.reduce((s, o) => s + total(o), 0);
  const urgentShippingFeeTotal = shippedOrders.reduce((s, o) => s + Number(o.shipping_amount ?? o.shipping ?? 80), 0);
  const urgentNetOwed = Math.max(0, urgentTotalOrders - urgentShippingFeeTotal);

  return '<div class="greeting">' +
    '<div><h2>بيان العهدة الشخصية</h2><p>كشف موحد لإضافة وصرف العهدة النقدية وحركة البضاعة.</p></div>' +
    '<span class="mode-badge live">العهدة والخزينة</span>' +
  '</div>' +
  '<div class="expense-kpi-card">' +
    '<small>الرصيد المتبقي في العهدة النقدية الآن</small>' +
    '<strong>' + money(netCustodyCash) + ' <small style="display:inline;font-size:13px">ج.م</small></strong>' +
    '<div class="expense-kpi-row">' +
      '<span>إجمالي الإضافات (+): <b style="color:#a8f0c6">+' + money(totalInflowCash) + ' ج.م</b></span>' +
      '<span>إجمالي الصرف (-): <b style="color:#ffd3d6">-' + money(totalExpCash) + ' ج.م</b></span>' +
    '</div>' +
  '</div>' +
  '<div class="section-heading" style="margin:10px 0 8px"><h2>1. العهدة النقدية (إضافة وصرف فلوس في مكان واحد)</h2></div>' +
  '<div class="button-row" style="margin-bottom:16px">' +
    '<button class="primary-btn" style="background:var(--green)" data-action="open-add-custody-cash">' + icon('plus') + ' إضافة عهدة (فلوس)</button>' +
    '<button class="primary-btn" data-action="open-add-expense-modal">' + icon('receipt') + ' صرف مصروف (فلوس)</button>' +
  '</div>' +
  buildUnifiedCashLedgerHtml() +
  '<div class="section-heading" style="margin:18px 0 8px"><h2>2. حركة البضاعة (صرف وإضافة بضاعة)</h2></div>' +
  '<div class="button-row" style="margin-bottom:16px">' +
    '<button class="primary-btn" data-action="open-disburse-wizard">' + icon('scan') + ' صرف بضاعة لعميل</button>' +
    '<button class="secondary-btn" style="border:1.5px solid var(--ink);font-weight:700" data-action="open-quick-add-stock">' + icon('plus') + ' إضافة بضاعة للمخزن</button>' +
  '</div>' +
  '<div style="margin-bottom:18px;background:#fcfcfc;border:1px solid #e2e1dd;border-radius:14px;padding:14px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<div style="display:flex;align-items:center;gap:6px">' +
        icon('truck') +
        '<b style="font-size:13px">حسابات شركة الشحن (Urgent)</b>' +
      '</div>' +
      '<button type="button" class="secondary-btn" data-action="open-urgent-ledger-modal" style="width:auto;padding:4px 10px;font-size:11px">تفاصيل الكشف</button>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
      '<div style="background:#fff;padding:8px 10px;border-radius:8px;border:1px solid #eee">' +
        '<small style="color:#777;display:block;font-size:10px">شحنات طرف الشحن (' + shippedOrders.length + ')</small>' +
        '<b>' + money(urgentTotalOrders) + ' ج.م</b>' +
      '</div>' +
      '<div style="background:#fff;padding:8px 10px;border-radius:8px;border:1px solid #eee">' +
        '<small style="color:#777;display:block;font-size:10px">صافي مستحق لـ Enza</small>' +
        '<b style="color:var(--green)">' + money(urgentNetOwed) + ' ج.م</b>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderActivity() {
  const user = state.user;
  const cfg = window.ENZA_SUPABASE_CONFIG;
  const configured = cfg && cfg.isConfigured();

  return '<div class="sync-panel ' + (state.loadError ? 'error' : '') + '">' +
    '<div class="sync-status-head">' +
      icon(state.loadError ? 'alert' : 'database') +
      (state.loadError ? 'تعذّر الاتصال بقاعدة البيانات' : (isLive() ? 'قاعدة بيانات Supabase متصلة' : 'الوضع التجريبي نشط')) +
    '</div>' +
    '<p>' +
      (isLive() ?
        'البيانات الحالية مربوطة مع Supabase بضوابط RLS وحماية المخزون.<br>المزامنة مع Odoo: مخططة ومجدولة كل ساعة.' :
        'بيانات تجريبية تعمل في الذاكرة لتجربة التصميم والواجهات.<br>يمكنك ربط Supabase أو التبديل للوضع المباشر.') +
    '</p>' +
    '<button class="secondary-btn" style="margin-top:12px" data-action="test-connection">' +
      icon('sync') + (isLive() ? 'تحديث وفحص الاتصال' : 'معاينة تحديث البيانات') +
    '</button>' +
  '</div>' +

  (user ?
    '<div class="user-chip">' +
      '<div>' +
        '<b>' + esc(user.display_name) + '</b>' +
        '<div style="font-size:10px;color:var(--muted)">' + esc(user.email || '') + '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<span class="role-tag">' + esc(user.role || 'operator') + '</span>' +
        '<button class="icon-btn" data-action="logout" aria-label="تسجيل الخروج">' + icon('logout') + '</button>' +
      '</div>' +
    '</div>' : '') +

  '<div class="section-heading"><h2>سجل الأحداث الأخيرة</h2></div>' +
  demoEvents.map(e =>
    '<div class="activity-row">' +
      '<span class="activity-icon">' + icon(e.icon) + '</span>' +
      '<div><b>' + esc(e.title) + '</b><p>' + esc(e.text) + '</p><time class="ltr">' + e.time + '</time></div>' +
    '</div>'
  ).join('') +

  '<section class="panel">' +
    '<div class="panel-title">إعدادات النظام والاتصال</div>' +
    '<button class="settings-row" style="width:100%;text-align:right" data-action="check-updates">' +
      '<span>فحص التحديثات<small>الإصدار الحالي: v' + esc((window.EnzaUpdater && typeof window.EnzaUpdater.getVersion === 'function') ? window.EnzaUpdater.getVersion() : '1.5.3') + ' • التحقق من GitHub Releases</small></span>' +
      icon('sync') +
    '</button>' +
    '<button class="settings-row" style="width:100%;text-align:right;color:var(--red)" data-action="reset-all-orders">' +
      '<span>تصفير كل الطلبات (البدء على نظافة)<small>مسح جميع الطلبات التجريبية من التطبيق والبدء من الصفر</small></span>' +
      icon('trash') +
    '</button>' +
    '<label class="settings-row">' +
      '<span>إشعارات الطلبات<small>تفضيل الإشعارات التشغيلية</small></span>' +
      '<input class="switch" type="checkbox" id="notifications-switch" ' + (state.notifications ? 'checked' : '') + '>' +
    '</label>' +
    '<button class="settings-row" style="width:100%;text-align:right" data-action="setup-supabase">' +
      '<span>إعداد ربط Supabase<small>' + (configured ? 'تم ضبط الرابط والمفتاح العام' : 'لم يتم إدخال الرابط بعد') + '</small></span>' +
      icon('left') +
    '</button>' +
    '<button class="settings-row" style="width:100%;text-align:right" data-action="toggle-mode">' +
      '<span>نمط التشغيل<small>الحالي: ' + (state.mode === 'live' ? 'الوضع المباشر (Live)' : 'وضع العرض التجريبي (Demo)') + '</small></span>' +
      icon('sliders') +
    '</button>' +
    '<button class="settings-row" style="width:100%;text-align:right" data-screen="login">' +
      '<span>شاشة تسجيل الدخول</span>' +
      icon('left') +
    '</button>' +
  '</section>';
}

// 10. LOGIN SCREEN
function renderLogin() {
  const cfg = window.ENZA_SUPABASE_CONFIG;
  const isConfig = cfg && cfg.isConfigured();

  return '<div style="padding:27px 6px 15px">' +
    '<img src="assets/enza-logo.png" alt="ENZA 3D Printing" class="login-logo-img">' +
    '<div class="eyebrow" style="color:#999">ENZA 3D PRINTING / OPERATIONS</div>' +
    '<h2 style="font-size:31px;line-height:1.6;letter-spacing:-1px">شغلك معاك،<br><span style="color:var(--red)">في كل خطوة.</span></h2>' +
    '<p class="detail-sub" style="line-height:2;margin-top:15px">تسجيل دخول فريق العمل المصرح لهم.<br>بيانات الشركة محمية بسياسات RLS والتسجيل العام مغلق.</p>' +
    '<form id="login-form" style="margin-top:26px">' +
      '<label class="field-label" for="login-email">البريد الإلكتروني</label>' +
      '<input type="email" class="field ltr" id="login-email" placeholder="operator@enza.com" required>' +
      '<label class="field-label" for="login-password">كلمة المرور</label>' +
      '<input type="password" class="field" id="login-password" placeholder="أدخل كلمة المرور" minlength="6" required>' +
      '<div id="login-error" class="inline-error" role="alert"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">' +
        '<button type="button" class="text-btn" data-action="forgot">نسيت كلمة المرور؟</button>' +
        '<button type="button" class="text-btn" style="color:var(--muted)" data-action="setup-supabase">إعداد Supabase</button>' +
      '</div>' +
      '<button class="primary-btn" type="submit" style="margin-top:17px" id="login-submit-btn">' +
        'تسجيل الدخول ' + icon('left') +
      '</button>' +
    '</form>' +
    '<div style="margin-top:24px;border-top:1px solid var(--line);padding-top:18px">' +
      '<button class="secondary-btn" data-action="explore-demo">' +
        icon('box') + 'استكشاف وضع العرض التجريبي (Demo Mode)' +
      '</button>' +
      '<p class="caption-note" style="margin-top:10px">وضع العرض التجريبي منفصل ببيانات وهمية ولا يتصل بقاعدة البيانات.</p>' +
    '</div>' +
  '</div>';
}

const renderers = {
  home: renderHome,
  orders: renderOrders,
  inventory: renderInventory,
  order: renderOrder,
  product: renderProduct,
  customers: renderCustomers,
  customer: renderCustomer,
  scanner: renderScanner,
  custody: renderCustody,
  expenses: renderExpenses,
  activity: renderActivity,
  login: renderLogin
};

const annotations = {
  home: ['01','اليوم يبدأ من هنا.','الأرقام المهمة، الطلبات اللي محتاجة تجهيز، وتنبيهات المخزون. تعرف تبدأ بإيه من أول نظرة.','افتح طلب، راجع تفاصيله، وانقله لمرحلة التجهيز.'],
  orders: ['02','كل طلب، في مكانه.','حالة واضحة، اسم العميل، وقيمة الطلب. والفلاتر توصّلك للطلبات اللي محتاجة تدخلك.','جرّب البحث باسم سارة، أو صفّي الطلبات الجديدة.'],
  inventory: ['03','تعرف عندك إيه.','اللون والخامة والرصيد ظاهرين من القائمة. مكان كل منتج وتنبيه النقص في التفاصيل.','افتح منتج وسجّل إضافة أو صرف من المخزن.'],
  scanner: ['04','وجّه. امسح. خلصنا.','الكود يوصّلك للمنتج ورصيده مباشرة. ومع الإدخال اليدوي، الشغل يكمل حتى لو الكاميرا مش متاحة.','اضغط تجربة قراءة كود، أو اكتب ES-PLA-WH-1KG.'],
  customers: ['05','تواصل له سياق.','ملف لكل عميل، وطلباته السابقة، ورسالة جاهزة حسب مرحلة الطلب.','افتح عميل وجرّب قوالب رسائل واتساب.'],
  activity: ['06','تعرف آخر تحديث.','حالة المزامنة مفهومة، وآخر بيانات ناجحة تفضل متاحة لو الاتصال اتعطل.','فعّل معاينة فشل المزامنة وشوف التنبيه في الطلبات.']
};

let focusBeforeModal = null, toastTimer = null;

function render(resetScroll=true) {
  renderHeader();
  renderNav();
  $('#screen').innerHTML = '<div class="screen-in">' + (renderers[state.screen] ? renderers[state.screen]() : renderHome()) + '</div>';
  if (resetScroll) $('#screen').scrollTop = 0;

  if (state.screen === 'scanner') {
    setTimeout(startCameraScanner, 300);
  } else {
    stopCameraScanner();
  }

  const main = ({order:'orders', product:'inventory', customer:'customers', login:'activity'})[state.screen] || state.screen;
  $$('.screen-menu button').forEach(b => b.classList.toggle('selected', b.dataset.screen === main));
  const a = annotations[main] || annotations.home;
  $('.annotation-number').textContent = a[0] + ' / 06';
  $('#annotation-title').textContent = a[1];
  $('#annotation-copy').textContent = a[2];
  $('#annotation-tip').textContent = a[3];
}

function navigate(screen) {
  if (!renderers[screen]) return;
  clearTimeout(toastTimer);
  $('#toast').innerHTML = '';
  closeModal(false);
  state.returnScreen = state.screen;
  state.screen = screen;
  state.query = '';
  render();
}

function toast(text) {
  clearTimeout(toastTimer);
  $('#toast').innerHTML = '<div class="toast">' + icon('check') + esc(text) + '</div>';
  toastTimer = setTimeout(() => { $('#toast').innerHTML = ''; }, 3500);
}

function openModal(title, body) {
  focusBeforeModal = document.activeElement;
  $('#screen').inert = true;
  $('#app-header').inert = true;
  $('#bottom-nav').inert = true;
  $('#overlay-root').innerHTML =
    '<div class="overlay"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-heading"><h2 id="sheet-title">' + title + '</h2><button class="icon-btn" data-action="close-modal" aria-label="إغلاق">' + icon('close') + '</button></div>' +
      body +
    '</section></div>';
  state.modal = title;
  $('.sheet button, .sheet input, .sheet select, .sheet textarea')?.focus();
}

function closeModal(restore=true) {
  if (state.modalScanner) {
    try { state.modalScanner.stop(); } catch (e) {}
    state.modalScanner = null;
  }
  $('#overlay-root').innerHTML = '';
  $('#screen').inert = false;
  $('#app-header').inert = false;
  $('#bottom-nav').inert = false;
  state.modal = null;
  if (restore && focusBeforeModal?.isConnected) focusBeforeModal.focus();
}

// ----------------------------------------------------------------------------
// MODALS & DIALOGS
// ----------------------------------------------------------------------------
function stockModal() {
  const p = pBy(state.selectedProduct);
  if (!p) return;
  state.movement = 'in';
  state.qty = 1;
  const stock = p.available_qty !== undefined ? p.available_qty : p.stock;

  openModal('حركة مخزون وتعديل الرصيد',
    '<p class="sheet-description">' + esc(p.brand) + ' ' + esc(p.name) + ' · ' + esc(p.color_name || p.color) + '</p>' +
    '<form id="stock-form">' +
      '<div class="segmented">' +
        '<button type="button" data-movement="in" class="selected">+ إضافة للمخزون</button>' +
        '<button type="button" data-movement="out">- صرف من المخزون</button>' +
        '<button type="button" data-movement="set">تعديل الرصيد الفعلي</button>' +
      '</div>' +
      '<label class="field-label" id="stock-qty-label" for="stock-qty">عدد القطع المراد إضافتها *</label>' +
      '<div class="qty-control">' +
        '<button type="button" data-qty="1" aria-label="زيادة الكمية">' + icon('plus') + '</button>' +
        '<input id="stock-qty" type="number" min="0" max="9999" step="1" value="1" required inputmode="numeric">' +
        '<button type="button" data-qty="-1" aria-label="تقليل الكمية">' + icon('minus') + '</button>' +
      '</div>' +
      '<label class="field-label" for="stock-reason">سبب الحركة</label>' +
      '<select class="field" id="stock-reason" required>' +
        '<option value="">اختر السبب</option>' +
        '<option value="supply">توريد جديد</option>' +
        '<option value="return">مرتجع عميل</option>' +
        '<option value="adjustment">تسوية جرد</option>' +
      '</select>' +
      '<div class="receipt-note"><span>الرصيد بعد الحركة</span><b id="stock-after">' + (stock + 1) + ' قطعة</b></div>' +
      '<div id="stock-error" class="inline-error" role="alert"></div>' +
      '<button class="primary-btn" type="submit" id="stock-submit-btn">' +
        icon('check') + (isLive() ? 'حفظ الحركة في قاعدة البيانات' : 'حفظ الحركة في المعاينة') +
      '</button>' +
      (isLive() ?
        '<p class="caption-note">يتم فحص الرصيد داخل PostgreSQL وتحديثه فوراً.</p>' :
        '<p class="caption-note">حركة تجريبية؛ لا يتم إرسالها إلى Odoo أو Supabase.</p>') +
    '</form>'
  );
}

function updateStockPreview() {
  const p = pBy(state.selectedProduct);
  if (!p) return;
  const currentStock = p.available_qty !== undefined ? p.available_qty : p.stock;
  const value = Number($('#stock-qty')?.value) || 0;
  state.qty = value;
  let after = 0;
  if (state.movement === 'set') {
    after = value;
  } else {
    after = currentStock + (state.movement === 'in' ? value : -value);
  }
  if ($('#stock-after')) $('#stock-after').textContent = Number.isFinite(after) ? after + ' قطعة' : '—';
  if ($('#stock-error')) $('#stock-error').textContent = after < 0 ? 'الكمية المطلوبة أكبر من الرصيد المتاح.' : '';
}

function showScan(p, code = '') {
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
}

function messageFor(cid, kind) {
  const c = cBy(cid) || { display_name: 'العميل', name: 'العميل' };
  const custName = c.display_name || c.name;
  const ords = getOrders();
  const o = ords.find(o => String(o.id) === String(state.messageOrder) && String(o.cid || o.customer_id) === String(cid)) ||
            ords.find(o => String(o.cid || o.customer_id) === String(cid)) ||
            { id: '1048' };

  const ref = o.display_number || ('EN-' + o.id);
  const greeting = 'أهلًا ' + custName;

  if (kind === 'shipping') {
    return greeting + '\nطلبك رقم ' + ref + ' اتجهّز وفي طريقه ليك. هنشاركك تفاصيل التوصيل بمجرد تأكيدها.\nشكرًا لاختيارك Enza Trade.';
  }
  if (kind === 'followup') {
    return greeting + '\nبنتابع معاك تجربتك مع خامات Enza Trade. كل حاجة وصلت سليمة؟ لو محتاج مساعدة في إعدادات الطباعة إحنا معاك.';
  }
  return greeting + '\nاستلمنا طلبك رقم ' + ref + ' بقيمة ' + money(total(o)) + ' جنيه شامل الشحن.\nممكن تأكد لنا عنوان التوصيل قبل ما نبدأ التجهيز؟\nEnza Trade';
}

function whatsappModal(cid) {
  state.messageCustomer = cid;
  state.messageOrder = state.screen === 'order' ? state.selectedOrder : null;
  state.messageTemplate = 'confirm';
  const c = cBy(cid) || { display_name: 'العميل', name: 'العميل' };
  const custName = c.display_name || c.name;

  openModal('رسالة واتساب',
    '<p class="sheet-description">إلى ' + esc(custName) + ' • رسالة قابلة للتعديل</p>' +
    '<div class="template-chips">' +
      '<button class="active" data-template="confirm">تأكيد الطلب</button>' +
      '<button data-template="shipping">تحديث الشحن</button>' +
      '<button data-template="followup">متابعة العميل</button>' +
    '</div>' +
    '<label class="field-label" for="message-text">نص الرسالة</label>' +
    '<textarea class="field" id="message-text">' + esc(messageFor(cid, 'confirm')) + '</textarea>' +
    '<button class="primary-btn" style="margin-top:17px;background:var(--green)" data-action="preview-whatsapp">' +
      icon('chat') + 'معاينة وفتح واتساب' +
    '</button>' +
    '<p class="caption-note">يتم فتح رابط واتساب مشفر بنص الرسالة لتراجعه وترسله بنفسك.</p>'
  );
}

function advanceOrderModal() {
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
      '<label class="field-label" for="advance-waybill-file">تصوير / رفع بوليصة الشحن (من الكاميرا أو الاستوديو - اختياري)</label>' +
      '<input type="file" accept="image/*" id="advance-waybill-file" class="field">' +
      '<div id="advance-waybill-preview" style="margin-top:8px"></div>' +
    '</div>';
  } else if (next === 'delivered') {
    extraInputs = '<div style="margin:16px 0;text-align:right">' +
      '<label class="field-label" for="advance-cash-collected">المبلغ المحصل من العميل الآن (ج.م) *</label>' +
      '<input type="number" id="advance-cash-collected" class="field ltr" min="0" step="any" value="' + ops.remaining + '" required>' +
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
}

// RECORD 9: SETTLE DEBT MODAL (سداد دائن العميل)
function openSettleDebtModal(orderId) {
  const o = oBy(orderId);
  if (!o) return;
  const ops = getOrderOps(o);
  const c = o.customer || cBy(o.cid || o.customer_id) || {};
  const cName = c.display_name || c.name || 'العميل';
  const ref = o.display_number || ('#EN-' + o.id);

  openModal('تسجيل سداد مديونية العميل',
    '<p class="sheet-description">' + esc(ref) + ' · ' + esc(cName) + '</p>' +
    '<div class="price-highlight-box" style="background:#fff7f7;border-color:#fcd9dc;margin-bottom:12px">' +
      '<div class="calc-row"><span>إجمالي المطلوب للطلب:</span><b>' + money(total(o)) + ' ج.م</b></div>' +
      '<div class="calc-row"><span>المسدد سابقاً:</span><b style="color:var(--green)">' + money(ops.paid) + ' ج.م</b></div>' +
      '<div class="calc-row"><span>المتبقي في ذمة العميل (المديونية):</span><b style="color:var(--red);font-size:16px">' + money(ops.remaining) + ' ج.م</b></div>' +
    '</div>' +
    '<form id="settle-debt-form" data-id="' + o.id + '">' +
      '<label class="field-label" for="settle-amount-input">المبلغ المحصل الآن (ج.م) *</label>' +
      '<input type="number" id="settle-amount-input" class="field ltr" min="1" step="any" value="' + ops.remaining + '" required>' +
      '<label class="field-label" for="settle-source-input">طريقة تحصيل الفلوس *</label>' +
      '<select id="settle-source-input" class="field" style="direction:rtl">' +
        '<option value="كاش نقدي مباشر (معايا في العهدة)">كاش نقدي مباشر (معايا في العهدة)</option>' +
        '<option value="تحصيل من شركة الشحن (Urgent)">تحصيل من شركة الشحن (Urgent)</option>' +
      '</select>' +
      '<div class="inline-error" id="settle-debt-error"></div>' +
      '<button type="submit" class="primary-btn" style="background:var(--green);margin-top:14px">' +
        icon('check') + ' تأكيد تحصيل وسداد المتبقي' +
      '</button>' +
    '</form>'
  );
}

// RECORD 10: EDIT SHIPPING MODAL (تعديل مصاريف الشحن يدوياً)
function openEditShippingModal(orderId) {
  const o = oBy(orderId);
  if (!o) return;
  const curShipping = Number(o.shipping_amount ?? o.shipping ?? 0);
  openModal('تعديل مصاريف الشحن للطلب',
    '<p class="sheet-description">' + (o.display_number || ('#EN-' + o.id)) + ' · قيمة الشحن</p>' +
    '<form id="edit-shipping-form" data-id="' + o.id + '">' +
      '<label class="field-label" for="edit-shipping-val">مصاريف الشحن بالجنيه المصري (ج.م) *</label>' +
      '<input type="number" id="edit-shipping-val" class="field ltr" min="0" step="any" value="' + curShipping + '" required>' +
      '<div class="inline-error" id="edit-shipping-error"></div>' +
      '<button type="submit" class="primary-btn" style="margin-top:14px">' +
        icon('check') + ' حفظ وتحديث إجمالي الطلب' +
      '</button>' +
    '</form>'
  );
}

function openAttachWaybillModal(orderId) {
  const o = oBy(orderId || state.selectedOrder);
  if (!o) return;
  state.selectedOrder = o.id;
  state.directWaybillBase64 = null;
  const ops = getOrderOps(o);
  const c = o.customer || cBy(o.cid || o.customer_id) || {};
  const cName = c.display_name || c.name || 'العميل';
  const ref = o.display_number || ('#EN-' + o.id);
  const curStatus = o.fulfillment_status || o.status || 'new';

  openModal('إرفاق صورة بوليصة الشحن (Urgent)',
    '<p class="sheet-description">' + esc(ref) + ' · ' + esc(cName) + '</p>' +
    '<form id="direct-waybill-form" data-id="' + o.id + '">' +
      '<label class="field-label" for="direct-waybill-file">تصوير أو اختيار صورة بوليصة الشحن (Urgent) *</label>' +
      '<input type="file" accept="image/*" id="direct-waybill-file" class="field" required>' +
      '<div id="direct-waybill-preview" style="margin-top:10px;text-align:center">' +
        (ops.waybill ? '<img src="' + esc(ops.waybill) + '" style="max-height:130px;border-radius:10px;border:1px solid #ddd">' : '') +
      '</div>' +
      (curStatus !== 'shipped' && curStatus !== 'delivered' ?
        '<label class="settings-row" style="margin-top:14px;background:#fff;padding:12px;border-radius:12px;border:1px solid var(--line)">' +
          '<span><b>تحديث حالة الطلب إلى «تم الشحن»</b><small>تسجيل الشحنة في كشف شركة الشحن Urgent</small></span>' +
          '<input class="switch" type="checkbox" id="direct-waybill-mark-shipped" checked>' +
        '</label>' : '') +
      '<div class="inline-error" id="direct-waybill-error"></div>' +
      '<button type="submit" class="primary-btn" id="direct-waybill-submit" style="margin-top:16px">' +
        icon('check') + ' حفظ صورة بوليصة Urgent' +
      '</button>' +
    '</form>'
  );
}

// RECORD 7: URGENT SHIPPING LEDGER MODAL (كشف حساب شركة الشحن Urgent)
function openUrgentLedgerModal() {
  const ords = getOrders();
  const shippedOrders = ords.filter(o => (o.fulfillment_status || o.status) === 'shipped' || (o.fulfillment_status || o.status) === 'delivered' || getOrderOps(o).waybill);
  const urgentTotalOrders = shippedOrders.reduce((s, o) => s + total(o), 0);
  const urgentShippingFeeTotal = shippedOrders.reduce((s, o) => s + Number(o.shipping_amount ?? o.shipping ?? 80), 0);
  const urgentNetOwed = Math.max(0, urgentTotalOrders - urgentShippingFeeTotal);

  openModal('كشف حساب شركة الشحن (Urgent)',
    '<div class="price-highlight-box" style="margin-bottom:12px">' +
      '<div class="calc-row"><span>إجمالي قيمة شحنات Urgent:</span><b>' + money(urgentTotalOrders) + ' ج.م</b></div>' +
      '<div class="calc-row"><span>إجمالي مصاريف الشحن المستقطعة:</span><b style="color:var(--red)">- ' + money(urgentShippingFeeTotal) + ' ج.م</b></div>' +
      '<div class="calc-row total-row"><span>صافي المديونية المستحقة لـ Enza:</span><strong style="color:var(--green);font-size:16px">' + money(urgentNetOwed) + ' ج.م</strong></div>' +
    '</div>' +
    '<div class="section-heading"><h2>الشحنات المسجلة مع Urgent (' + shippedOrders.length + ')</h2></div>' +
    '<div style="max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:12px">' +
      (shippedOrders.length > 0 ?
        shippedOrders.map(o => {
          const c = o.customer || cBy(o.cid || o.customer_id) || {};
          const shipVal = Number(o.shipping_amount ?? o.shipping ?? 80);
          const ops = getOrderOps(o);
          return '<div style="background:#fff;padding:10px;border-radius:10px;border:1px solid #e2e1dd">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
              '<div><b>' + esc(o.display_number || ('#EN-' + o.id)) + '</b> <small>' + esc(c.display_name || c.name || '') + '</small><div style="font-size:10px;color:#777">شحن: ' + money(shipVal) + ' ج.م</div></div>' +
              '<div style="text-align:left"><b>' + money(total(o)) + ' ج.م</b><span class="badge-pill" style="font-size:9px;background:#eef6ff;color:var(--brand)">' + (statusNames[o.fulfillment_status || o.status] || 'مشحون') + '</span></div>' +
            '</div>' +
            '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #eee;display:flex;justify-content:space-between;align-items:center">' +
              (ops.waybill ?
                '<button type="button" class="text-btn" data-action="view-proof-image" data-img="' + esc(ops.waybill) + '" data-title="بوليصة الشحن (Urgent)" style="font-size:11px;color:var(--green);padding:0">' +
                  icon('check') + ' عرض صورة بوليصة Urgent' +
                '</button>' :
                '<span style="font-size:10px;color:#999">لم ترفق صورة البوليصة بعد</span>') +
              '<button type="button" class="secondary-btn" data-action="prompt-attach-waybill" data-id="' + o.id + '" style="width:auto;padding:4px 10px;font-size:10px">' +
                icon('truck') + (ops.waybill ? ' تغيير البوليصة' : ' + إرفاق بوليصة Urgent') +
              '</button>' +
            '</div>' +
          '</div>';
        }).join('') :
        '<p class="meta" style="text-align:center;padding:12px">لا توجد شحنات مع شركة الشحن حالياً</p>') +
    '</div>' +
    '<button type="button" class="primary-btn" data-action="close-modal">تمت المراجعة</button>'
  );
}


// ----------------------------------------------------------------------------
// MANUAL DISBURSEMENT WIZARD — MULTI-PRODUCT (طريقة الصرف اليدوي وإضافة عميل)
// ----------------------------------------------------------------------------
function openDisbursementModal(preselectedProduct = null, preselectedCustomerId = null) {
  const custs = getCustomers();
  state.disburseOrderSource = 'direct';
  state.disburseCustomerTab = (preselectedCustomerId || custs.length > 0) ? 'existing' : 'new';
  state.disburseSelectedCustomer = preselectedCustomerId || (custs[0]?.id || null);
  state.disburseShipping = 0;
  state.disburseWaybillBase64 = null;

  const prods = getProducts();
  const initialProd = preselectedProduct || prods[0];
  const initialPrice = initialProd ? (initialProd.sale_price !== undefined ? initialProd.sale_price : initialProd.price) : 850;

  state.disburseItems = [{
    variantId: initialProd?.id || null,
    unitPrice: Number(initialPrice),
    qty: 1
  }];

  state.disbursePaidAmount = 0;
  renderDisbursementModal();
}

function getDisburseProductsTotal() {
  return state.disburseItems.reduce((sum, item) => sum + (Number(item.unitPrice || 0) * (Number(item.qty) || 1)), 0);
}

function getDisburseTotal() {
  const prods = getDisburseProductsTotal();
  const shipInp = $('#disb-shipping-input');
  const ship = shipInp ? (Number(shipInp.value) || 0) : (Number(state.disburseShipping) || 0);
  return prods + ship;
}

function syncDisburseItemsFromDOM() {
  document.querySelectorAll('.disb-item-price').forEach(inp => {
    const idx = Number(inp.dataset.idx);
    if (state.disburseItems[idx] && inp.value !== '') {
      state.disburseItems[idx].unitPrice = Number(inp.value) || 0;
    }
  });
  const shipInput = $('#disb-shipping-input');
  if (shipInput) {
    state.disburseShipping = Number(shipInput.value) || 0;
  }
  const paidInput = $('#disb-paid-input');
  if (paidInput && paidInput.dataset.touched === 'true') {
    state.disbursePaidAmount = Number(paidInput.value) || 0;
  }
}

function recalculateDisbursementTotals(paidManuallyChanged = false) {
  let prodTotal = 0;
  state.disburseItems.forEach((it, idx) => {
    const unit = Number(it.unitPrice || 0);
    const qty = Number(it.qty || 1);
    const sub = unit * qty;
    prodTotal += sub;
    const subEl = document.querySelector('.disb-item-card[data-item-idx="' + idx + '"] .disb-item-subtotal');
    if (subEl) subEl.innerHTML = 'إجمالي البند: <b>' + money(sub) + ' ج.م</b>';
  });

  const shipInput = $('#disb-shipping-input');
  const ship = shipInput ? (Number(shipInput.value) || 0) : (Number(state.disburseShipping) || 0);
  state.disburseShipping = ship;

  const grandTotal = prodTotal + ship;

  const totEl = $('#disb-total-display');
  if (totEl) totEl.textContent = money(grandTotal) + ' ج.م';

  const paidInput = $('#disb-paid-input');
  let paid = 0;
  if (paidInput) {
    paid = Number(paidInput.value) || 0;
  } else {
    paid = Number(state.disbursePaidAmount ?? 0);
  }
  state.disbursePaidAmount = paid;

  const remaining = Math.max(0, grandTotal - paid);
  const remEl = $('#disb-remaining-display');
  if (remEl) {
    remEl.textContent = money(remaining) + ' ج.م';
    remEl.style.color = remaining > 0 ? 'var(--red)' : 'var(--green)';
  }

  const badge = $('#disb-payment-status-badge');
  if (badge) {
    if (remaining === 0) {
      badge.innerHTML = '<span class="payment-badge full">خالص بالكامل</span>';
    } else if (paid > 0) {
      badge.innerHTML = '<span class="payment-badge partial">دفع جزئي (مديون بـ ' + money(remaining) + ' ج.م)</span>';
    } else {
      badge.innerHTML = '<span class="payment-badge unpaid">مديون / آجل بالكامل (' + money(remaining) + ' ج.م)</span>';
    }
  }
}

function renderDisbursementModal() {
  const prods = getProducts();
  const custs = getCustomers();
  if (prods.length === 0) {
    toast('لا توجد منتجات مسجلة بالمخزن');
    return;
  }

  const grandTotal = getDisburseTotal();
  const paidVal = state.disbursePaidAmount !== undefined ? Number(state.disbursePaidAmount) : 0;
  const remainingVal = Math.max(0, grandTotal - paidVal);

  let custContent = '';
  if (state.disburseCustomerTab === 'existing') {
    const selectedCust = cBy(state.disburseSelectedCustomer);
    custContent = '<div class="field-label">اختر العميل المسجل (بحث بالاسم أو رقم التليفون)</div>' +
      '<input type="search" id="disb-cust-search" class="field" placeholder="ابحث باسم العميل أو رقم تليفونه...">' +
      (custs.length > 0 ?
        '<div class="cust-select-list" id="disb-cust-list">' +
          custs.slice(0, 15).map(c =>
            '<button type="button" class="cust-select-item ' + (String(state.disburseSelectedCustomer) === String(c.id) ? 'selected' : '') + '" data-action="select-disburse-customer" data-id="' + c.id + '">' +
              '<div><b>' + esc(c.display_name || c.name) + '</b><small>' + esc(c.phone_e164 || c.phone || '') + (c.city ? ' · ' + esc(c.city) : '') + '</small></div>' +
              (String(state.disburseSelectedCustomer) === String(c.id) ? icon('check') : icon('left')) +
            '</button>'
          ).join('') +
        '</div>' :
        '<p class="meta" style="padding:10px 0;color:var(--red)">لا يوجد عملاء مسجلون بعد — اضغط على «+ عميل جديد» لإضافة العميل.</p>') +
      (selectedCust ?
        '<div style="margin-top:8px;padding:8px 12px;background:#eaf3ed;border-radius:10px;font-size:11px;color:var(--green)">' +
          'تم اختيار: <b>' + esc(selectedCust.display_name || selectedCust.name) + '</b> (' + esc(selectedCust.phone_e164 || selectedCust.city || '') + ')' +
        '</div>' :
        '<div class="inline-error" id="disb-cust-error">يرجى اختيار عميل أو الضغط على «+ عميل جديد»</div>');
  } else {
    custContent = '<label class="field-label" for="disb-cust-name">اسم العميل الجديد *</label>' +
      '<input type="text" id="disb-cust-name" class="field" placeholder="مثال: عمر أو إبراهيم" required>' +
      '<label class="field-label" for="disb-cust-phone">رقم الموبايل *</label>' +
      '<input type="tel" id="disb-cust-phone" class="field ltr" placeholder="01xxxxxxxxx" required>' +
      '<label class="field-label" for="disb-cust-city">المحافظة / المدينة</label>' +
      '<input type="text" id="disb-cust-city" class="field" placeholder="مثال: الإسكندرية">' +
      '<label class="field-label" for="disb-cust-address">العنوان بالتفصيل</label>' +
      '<input type="text" id="disb-cust-address" class="field" placeholder="المنطقة والشارع">';
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
          '<input type="number" class="field ltr disb-item-price" data-idx="' + idx + '" min="0.01" step="any" value="' + item.unitPrice + '" required>' +
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

  const srcType = state.disburseOrderSource || 'direct';

  openModal('صرف بضاعة لعميل',
    '<form id="disburse-form" novalidate>' +
      '<div class="field-label" style="margin-top:0">نوع الصرف</div>' +
      '<div class="segmented" style="margin:6px 0 12px">' +
        '<button type="button" data-action="set-disb-source" data-source="direct" class="' + (srcType === 'direct' ? 'selected' : '') + '">صرف مباشر (عملاءنا)</button>' +
        '<button type="button" data-action="set-disb-source" data-source="website" class="' + (srcType === 'website' ? 'selected' : '') + '">صرف طلب موقع (شحن Urgent)</button>' +
      '</div>' +
      '<div class="wizard-tabs">' +
        '<button type="button" class="wizard-tab ' + (state.disburseCustomerTab === 'existing' ? 'active' : '') + '" data-action="disburse-tab-existing">عميل مسجل (قديم)</button>' +
        '<button type="button" class="wizard-tab ' + (state.disburseCustomerTab === 'new' ? 'active' : '') + '" data-action="disburse-tab-new">+ عميل جديد</button>' +
      '</div>' +
      custContent +
      '<div class="annotation-rule" style="margin:16px 0;width:100%"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<h2 style="font-size:14px;font-weight:700">بكرات ومنتجات الطلب</h2>' +
        '<button type="button" class="secondary-btn" data-action="scan-barcode-for-disburse" style="width:auto;padding:6px 12px;font-size:11px;border:1.5px solid var(--ink);font-weight:700">' +
          icon('scan') + ' لقط بالباركود' +
        '</button>' +
      '</div>' +
      '<div id="disb-scanner-box" style="display:none;margin-bottom:12px;border-radius:12px;overflow:hidden"></div>' +
      itemsHtml +
      '<button type="button" class="add-item-btn" data-action="disb-add-item">' +
        icon('plus') + ' إضافة منتج آخر للطلب' +
      '</button>' +
      '<div style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:12px;padding:12px;margin:12px 0">' +
        '<label class="field-label" for="disb-shipping-input" style="margin-top:0">مصاريف الشحن والتوصيل يدوي (ج.م) [اختياري]</label>' +
        '<input type="number" id="disb-shipping-input" class="field ltr" min="0" step="any" value="' + (state.disburseShipping || 0) + '" placeholder="0">' +
      '</div>' +
      '<div class="price-highlight-box">' +
        '<div class="calc-row"><span>إجمالي المطلوب (المنتجات + الشحن):</span><strong id="disb-total-display" style="font-size:16px">' + money(grandTotal) + ' ج.م</strong></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">' +
        '<label class="field-label" for="disb-paid-input" style="margin:0">المبلغ المدفوع حالياً [دفع كام] (ج.م) *</label>' +
        '<div style="display:flex;gap:6px">' +
          '<button type="button" class="text-btn" data-action="disb-set-paid-zero" style="font-size:11px;padding:2px 8px;background:#fff0f1;border-radius:6px">دفع صفر (مديون)</button>' +
          '<button type="button" class="text-btn" data-action="disb-set-paid-full" style="font-size:11px;padding:2px 8px;background:var(--green-bg);color:var(--green);border-radius:6px">دفع الكل</button>' +
        '</div>' +
      '</div>' +
      '<input type="number" id="disb-paid-input" class="field ltr" min="0" step="any" value="' + paidVal + '" style="margin-top:6px" required>' +
      '<div class="price-highlight-box" style="background:#fff7f7;border-color:#fcd9dc">' +
        '<div class="calc-row">' +
          '<span>المتبقي على العميل [مديونية العميل]:</span>' +
          '<strong id="disb-remaining-display" style="font-size:16px;color:' + (remainingVal > 0 ? 'var(--red)' : 'var(--green)') + '">' +
            money(remainingVal) + ' ج.م' +
          '</strong>' +
        '</div>' +
        '<div id="disb-payment-status-badge" style="margin-top:6px">' +
          (remainingVal === 0 ? '<span class="payment-badge full">خالص بالكامل</span>' :
            paidVal > 0 ? '<span class="payment-badge partial">دفع جزئي (مديون بـ ' + money(remainingVal) + ' ج.م)</span>' :
            '<span class="payment-badge unpaid">مديون / آجل بالكامل (' + money(remainingVal) + ' ج.م)</span>') +
        '</div>' +
      '</div>' +
      '<div style="background:#f8f9fa;border:1px solid #e2e1dd;border-radius:12px;padding:12px;margin:12px 0">' +
        '<label class="field-label" for="disb-waybill-file" style="margin-top:0">' + icon('truck') + ' إرفاق صورة بوليصة الشحن (Urgent) [اختياري — الآن أو لاحقاً]</label>' +
        '<input type="file" accept="image/*" id="disb-waybill-file" class="field">' +
        '<div id="disb-waybill-preview" style="margin-top:6px">' +
          (state.disburseWaybillBase64 ? '<img src="' + state.disburseWaybillBase64 + '" style="max-height:80px;border-radius:8px;margin-top:6px;border:1px solid #ddd">' : '') +
        '</div>' +
      '</div>' +
      '<p class="caption-note" style="margin:8px 0 6px">لو العميل لسه مشحنش أو مدفعش، اكتب صفر في المدفوع هيتسجل عليه مديونية وتقدر ترفق بوليصة Urgent أو تسددها لاحقاً.</p>' +
      '<div class="inline-error" id="disb-form-error" role="alert"></div>' +
      '<button type="submit" class="primary-btn" id="disb-submit-btn" style="margin-top:10px">' +
        icon('check') + ' إتمام الصرف والخصم من المخزن' +
      '</button>' +
    '</form>'
  );
}
function editProductModal() {
  const p = pBy(state.selectedProduct);
  if (!p) return;
  state.editImageBase64 = null;
  const price = p.sale_price !== undefined ? p.sale_price : p.price;
  const isPub = p.is_published !== false;

  openModal('تعديل المنتج في المتجر (Odoo)',
    '<p class="sheet-description">' + esc(p.brand) + ' ' + esc(p.name) + '</p>' +
    '<form id="edit-product-form">' +
      '<label class="field-label" for="edit-barcode">باركود المنتج (Barcode)</label>' +
      '<div class="input-with-btn">' +
        '<input id="edit-barcode" class="field ltr" placeholder="مثال: 6922572200011" value="' + esc(p.barcode || '') + '">' +
        '<button type="button" class="secondary-btn" data-action="scan-into-barcode" style="width:auto;padding:0 12px">' +
          icon('scan') + ' مسح' +
        '</button>' +
      '</div>' +
      '<div id="edit-barcode-scanner-box" style="display:none;margin-top:8px;border-radius:12px;overflow:hidden;background:#111;min-height:200px"></div>' +
      '<div id="edit-barcode-scan-error" class="inline-error" style="margin-top:4px"></div>' +
      '<label class="field-label" for="edit-price">سعر البيع على المتجر (ج.م)</label>' +
      '<input id="edit-price" class="field ltr" type="number" min="0" step="10" value="' + price + '" required>' +
      '<label class="settings-row" style="margin-top:14px;background:#fff;padding:12px;border-radius:12px;border:1px solid var(--line)">' +
        '<span><b>حالة العرض على الموقع</b><small>إظهار المنتج أو إخفاؤه من متجر Odoo</small></span>' +
        '<input class="switch" type="checkbox" id="edit-published" ' + (isPub ? 'checked' : '') + '>' +
      '</label>' +
      '<label class="field-label" for="edit-image-file">تغيير صورة المنتج</label>' +
      '<input type="file" id="edit-image-file" class="field" accept="image/*">' +
      '<div id="image-preview-box" style="margin-top:10px;text-align:center"></div>' +
      '<div id="edit-product-error" class="inline-error" role="alert"></div>' +
      '<button class="primary-btn" type="submit" id="edit-product-submit" style="margin-top:16px">' +
        icon('check') + 'حفظ وتحديث المتجر فوراً' +
      '</button>' +
      '<p class="caption-note">يتم تعديل السعر والصورة وحالة النشر على موقع Odoo مباشرة.</p>' +
    '</form>'
  );
}

function setupSupabaseModal() {
  const cfg = window.ENZA_SUPABASE_CONFIG || {};
  openModal('إعداد ربط Supabase',
    '<p class="sheet-description">أدخل رابط المشروع والمفتاح العام (anon key) فقط.<br><b style="color:var(--red)">لا تضع مفتاح service_role السري نهائياً!</b></p>' +
    '<form id="setup-supabase-form">' +
      '<label class="field-label" for="cfg-url">Project URL</label>' +
      '<input type="url" class="field ltr" id="cfg-url" placeholder="https://xyzcompany.supabase.co" value="' + esc(cfg.supabaseUrl || '') + '" required>' +
      '<label class="field-label" for="cfg-anon">Public Anon Key</label>' +
      '<textarea class="field ltr" style="min-height:90px;font-size:11px" id="cfg-anon" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." required>' + esc(cfg.supabaseAnonKey || '') + '</textarea>' +
      '<div id="setup-error" class="inline-error" role="alert"></div>' +
      '<div class="button-row" style="margin-top:14px">' +
        '<button class="primary-btn" type="submit">' + icon('check') + 'حفظ وإعادة الاتصال</button>' +
        (cfg.isConfigured() ? '<button type="button" class="secondary-btn" data-action="clear-config">مسح الإعدادات</button>' : '') +
      '</div>' +
    '</form>'
  );
}

// ----------------------------------------------------------------------------
// DATA FETCHING & SYNC ACTIONS
// ----------------------------------------------------------------------------
async function fetchLiveData() {
  if (!isLive()) return;
  state.loading = true;
  state.loadError = null;
  render(false);

  try {
    const [prods, ords, custs] = await Promise.all([
      window.EnzaDB.products.list(),
      window.EnzaDB.orders.list(),
      window.EnzaDB.customers.list()
    ]);

    state.liveProducts = prods || [];
    state.liveOrders = ords || [];
    state.liveCustomers = custs || [];
    state.dbInitialized = true;
    state.loading = false;
    state.loadError = null;

    if (state.liveProducts.length > 0 && !state.selectedProduct) {
      state.selectedProduct = state.liveProducts[0].id;
    }
    if (state.liveOrders.length > 0 && !state.selectedOrder) {
      state.selectedOrder = state.liveOrders[0].id;
    }
    if (state.liveCustomers.length > 0 && !state.selectedCustomer) {
      state.selectedCustomer = state.liveCustomers[0].id;
    }
  } catch (err) {
    console.error('[Enza] Live data fetch failed:', err);
    state.loading = false;
    state.loadError = err.message || 'تعذّر جلب البيانات من Supabase';
  }
  render(false);
}

// ----------------------------------------------------------------------------
// EVENT LISTENERS
// ----------------------------------------------------------------------------
document.addEventListener('click', async e => {
  const b = e.target.closest('button, [data-action]');
  if (!b) {
    const screenTarget = e.target.closest('[data-screen]');
    if (screenTarget) {
      navigate(screenTarget.dataset.screen);
      return;
    }
    if (e.target.classList.contains('overlay')) closeModal();
    return;
  }

  if (b.dataset.screen) {
    navigate(b.dataset.screen);
    return;
  }

  if (b.dataset.order) {
    state.selectedOrder = b.dataset.order;
    navigate('order');
    return;
  }

  if (b.dataset.product) {
    state.selectedProduct = b.dataset.product;
    navigate('product');
    return;
  }

  if (b.dataset.customer) {
    state.selectedCustomer = b.dataset.customer;
    navigate('customer');
    return;
  }

  if (b.dataset.whatsapp) {
    whatsappModal(b.dataset.whatsapp);
    return;
  }

  if (b.dataset.orderFilter) {
    state.orderFilter = b.dataset.orderFilter;
    render(false);
    return;
  }

  if (b.dataset.productFilter) {
    state.productFilter = b.dataset.productFilter;
    render(false);
    return;
  }

  if (b.dataset.customerFilter) {
    state.customerFilter = b.dataset.customerFilter;
    render(false);
    return;
  }

  if (b.dataset.movement) {
    state.movement = b.dataset.movement;
    $$('[data-movement]').forEach(x => x.classList.toggle('selected', x.dataset.movement === state.movement));
    const sel = $('#stock-reason');
    const lbl = $('#stock-qty-label');
    const input = $('#stock-qty');
    const p = pBy(state.selectedProduct);
    const currentStock = p ? (p.available_qty !== undefined ? p.available_qty : p.stock) : 0;

    if (state.movement === 'set') {
      if (lbl) lbl.textContent = 'الرصيد الفعلي الجديد بعد الجرد (قطعة) *';
      if (input) input.value = currentStock;
      if (sel) sel.innerHTML = '<option value="adjustment" selected>تسوية جرد فعلي مباشر</option>';
    } else {
      if (lbl) lbl.textContent = 'عدد القطع المراد ' + (state.movement === 'in' ? 'إضافتها' : 'صرفها') + ' *';
      if (input && Number(input.value) === currentStock) input.value = 1;
      if (sel) {
        sel.innerHTML = '<option value="">اختر السبب</option>' +
          (state.movement === 'in' ?
            '<option value="supply">توريد جديد</option><option value="return">مرتجع عميل</option>' :
            '<option value="sale">صرف لطلب</option><option value="damage">تالف</option>') +
          '<option value="adjustment">تسوية جرد</option>';
      }
    }
    updateStockPreview();
    return;
  }

  if (b.dataset.qty) {
    const input = $('#stock-qty');
    if (input) {
      input.value = Math.max(1, Math.min(9999, (Number(input.value) || 1) + Number(b.dataset.qty)));
      updateStockPreview();
    }
    return;
  }

  if (b.dataset.template) {
    state.messageTemplate = b.dataset.template;
    $$('[data-template]').forEach(x => x.classList.toggle('active', x === b));
    const txt = $('#message-text');
    if (txt) txt.value = messageFor(state.messageCustomer, state.messageTemplate);
    return;
  }

  switch (b.dataset.action) {
    case 'back':
      navigate(({order:'orders', product:state.returnScreen==='scanner'?'scanner':'inventory', customer:'customers', activity:'home'})[state.screen] || 'home');
      break;

    case 'pending':
      state.orderFilter = 'new';
      navigate('orders');
      break;

    case 'all-stock':
      state.productFilter = 'all';
      navigate('inventory');
      break;

    case 'low-stock':
      state.productFilter = 'low';
      navigate('inventory');
      break;

    case 'clear-filters':
      state.query = '';
      state.orderFilter = 'all';
      state.productFilter = 'all';
      render();
      break;

    case 'sort-orders':
      state.sortReverse = !state.sortReverse;
      $('#results').innerHTML = orderResults();
      break;

    case 'close-modal':
      closeModal();
      break;

    case 'open-settle-debt-modal': {
      const orderId = b.dataset.id;
      openSettleDebtModal(orderId);
      break;
    }

    case 'open-edit-shipping': {
      const orderId = b.dataset.id;
      openEditShippingModal(orderId);
      break;
    }

    case 'open-urgent-ledger-modal': {
      openUrgentLedgerModal();
      break;
    }

    case 'stock-modal':
      stockModal();
      break;

    case 'edit-product-modal':
      editProductModal();
      break;

    case 'simulate-scan': {
      const p = getProducts()[0];
      if (p) showScan(p);
      else toast('لا توجد منتجات في المخزن لمعاينتها');
      break;
    }

    case 'open-scanned':
      closeModal();
      navigate('product');
      break;
    case 'open-disburse-wizard':
      openDisbursementModal();
      break;

    case 'open-add-custody-cash':
      openAddCustodyCashModal();
      break;

    case 'open-quick-add-stock':
      openQuickAddStockModal();
      break;

    case 'open-new-customer-modal':
      openNewCustomerModal();
      break;

    case 'open-edit-customer-modal':
      openEditCustomerModal(b.dataset.id || state.selectedCustomer);
      break;

    case 'delete-customer': {
      const custId = b.dataset.id || state.selectedCustomer;
      const c = cBy(custId);
      const custName = c ? (c.display_name || c.name) : 'العميل';
      if (confirm('هل تريد بالتأكيد حذف العميل «' + custName + '» نهائياً؟')) {
        if (window.EnzaDB?.customers) {
          await window.EnzaDB.customers.delete(custId);
        }
        state.liveCustomers = state.liveCustomers.filter(x => String(x.id) !== String(custId));
        const idx = demoCustomers.findIndex(x => String(x.id) === String(custId));
        if (idx !== -1) demoCustomers.splice(idx, 1);

        closeModal();
        if (state.screen === 'customer') {
          navigate('customers');
        } else {
          render(false);
        }
        toast('تم حذف العميل «' + custName + '» بنجاح');
      }
      break;
    }

    case 'disburse-for-customer':
      openDisbursementModal(null, b.dataset.id);
      break;

    case 'set-disb-source': {
      syncDisburseItemsFromDOM();
      state.disburseOrderSource = b.dataset.source;
      if (state.disburseOrderSource === 'website') {
        state.disbursePaidAmount = 0;
      }
      renderDisbursementModal();
      break;
    }

    case 'disb-set-paid-zero': {
      const inp = $('#disb-paid-input');
      if (inp) {
        inp.value = 0;
        inp.dataset.touched = 'true';
        recalculateDisbursementTotals(true);
      }
      break;
    }

    case 'disb-set-paid-full': {
      const inp = $('#disb-paid-input');
      if (inp) {
        inp.value = getDisburseTotal();
        inp.dataset.touched = 'true';
        recalculateDisbursementTotals(true);
      }
      break;
    }

    case 'scan-barcode-for-disburse': {
      const box = $('#disb-scanner-box');
      if (!box) break;
      if (box.style.display === 'block') {
        if (state.modalScanner) {
          try { await state.modalScanner.stop(); } catch (e) {}
          state.modalScanner = null;
        }
        box.style.display = 'none';
        box.innerHTML = '';
        break;
      }
      box.style.display = 'block';
      box.innerHTML = '<div id="disb-qr-reader" style="width:100%;min-height:200px;background:#111"></div>';
      if (window.Html5Qrcode) {
        try {
          state.modalScanner = new Html5Qrcode('disb-qr-reader');
          await state.modalScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 200, height: 140 } },
            async (decoded) => {
              playBeepSound();
              const clean = String(decoded).trim().toLowerCase();
              const prods = getProducts();
              const match = prods.find(p =>
                (p.barcode && String(p.barcode).trim().toLowerCase() === clean) ||
                (p.sku && String(p.sku).trim().toLowerCase() === clean)
              );
              if (match) {
                try { await state.modalScanner.stop(); } catch (e) {}
                state.modalScanner = null;
                syncDisburseItemsFromDOM();
                const pr = match.sale_price !== undefined ? match.sale_price : match.price;
                const existingItem = state.disburseItems.find(it => String(it.variantId) === String(match.id));
                if (existingItem) {
                  existingItem.qty = (Number(existingItem.qty) || 1) + 1;
                } else if (state.disburseItems.length === 1 && state.disburseItems[0].qty === 1) {
                  state.disburseItems[0].variantId = match.id;
                  state.disburseItems[0].unitPrice = Number(pr);
                } else {
                  state.disburseItems.push({
                    variantId: match.id,
                    unitPrice: Number(pr),
                    qty: 1
                  });
                }
                toast('تم لقط الباركود: ' + match.brand + ' ' + (match.color_name || match.color));
                renderDisbursementModal();
              } else {
                toast('باركود غير مسجل: ' + decoded);
              }
            },
            () => {}
          );
        } catch (err) {
          box.innerHTML = '<p class="meta" style="padding:10px;color:var(--red)">تعذّر فتح الكاميرا: ' + esc(err.message || '') + '</p>';
        }
      }
      break;
    }

    case 'scan-barcode-for-add-stock': {
      const box = $('#quick-stock-scanner-box');
      if (!box) break;
      if (box.style.display === 'block') {
        if (state.modalScanner) {
          try { await state.modalScanner.stop(); } catch (e) {}
          state.modalScanner = null;
        }
        box.style.display = 'none';
        box.innerHTML = '';
        break;
      }
      box.style.display = 'block';
      box.innerHTML = '<div id="quick-stock-qr-reader" style="width:100%;min-height:200px;background:#111"></div>';
      if (window.Html5Qrcode) {
        try {
          state.modalScanner = new Html5Qrcode('quick-stock-qr-reader');
          await state.modalScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 200, height: 140 } },
            async (decoded) => {
              playBeepSound();
              const clean = String(decoded).trim().toLowerCase();
              const prods = getProducts();
              const match = prods.find(p =>
                (p.barcode && String(p.barcode).trim().toLowerCase() === clean) ||
                (p.sku && String(p.sku).trim().toLowerCase() === clean)
              );
              if (match) {
                try { await state.modalScanner.stop(); } catch (e) {}
                state.modalScanner = null;
                box.style.display = 'none';
                const sel = $('#quick-stock-product');
                if (sel) sel.value = match.id;
                toast('تم تحديد المنتج: ' + match.brand + ' ' + (match.color_name || match.color));
              } else {
                toast('باركود غير مسجل: ' + decoded);
              }
            },
            () => {}
          );
        } catch (err) {
          box.innerHTML = '<p class="meta" style="padding:10px;color:var(--red)">تعذّر فتح الكاميرا: ' + esc(err.message || '') + '</p>';
        }
      }
      break;
    }

    case 'disb-add-item': {
      syncDisburseItemsFromDOM();
      const prods = getProducts();
      const first = prods[0];
      const pr = first ? (first.sale_price !== undefined ? first.sale_price : first.price) : 850;
      state.disburseItems.push({
        variantId: first?.id || null,
        unitPrice: Number(pr),
        qty: 1
      });
      renderDisbursementModal();
      break;
    }

    case 'disb-remove-item': {
      syncDisburseItemsFromDOM();
      const idx = Number(b.dataset.idx);
      if (state.disburseItems.length > 1) {
        state.disburseItems.splice(idx, 1);
        renderDisbursementModal();
      }
      break;
    }

    case 'item-qty-plus': {
      const idx = Number(b.dataset.idx);
      if (state.disburseItems[idx]) {
        state.disburseItems[idx].qty = (Number(state.disburseItems[idx].qty) || 1) + 1;
        const qtyEl = b.parentElement?.querySelector('strong');
        if (qtyEl) qtyEl.textContent = state.disburseItems[idx].qty;
        recalculateDisbursementTotals(false);
      }
      break;
    }

    case 'item-qty-minus': {
      const idx = Number(b.dataset.idx);
      if (state.disburseItems[idx]) {
        state.disburseItems[idx].qty = Math.max(1, (Number(state.disburseItems[idx].qty) || 1) - 1);
        const qtyEl = b.parentElement?.querySelector('strong');
        if (qtyEl) qtyEl.textContent = state.disburseItems[idx].qty;
        recalculateDisbursementTotals(false);
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
        closeModal();
        render(false);
        toast('تم حذف المصروف بنجاح');
      }
      break;
    }

    case 'delete-cash-inflow': {
      const movId = b.dataset.id;
      if (confirm('هل تريد بالتأكيد حذف حركة الإضافة هذه؟')) {
        try {
          const list = JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]');
          const filtered = list.filter(x => String(x.id) !== String(movId));
          localStorage.setItem('enza_custodian_movements', JSON.stringify(filtered));
        } catch(e) {}
        closeModal();
        render(false);
        toast('تم حذف حركة الإضافة بنجاح');
      }
      break;
    }


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
      if (bEl) bEl.innerHTML = '<span class="payment-badge full">خالص بالكامل</span>';
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
      if (bEl) bEl.innerHTML = '<span class="payment-badge full">خالص بالكامل</span>';
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
      openAttachWaybillModal(b.dataset.id || state.selectedOrder);
      break;

    case 'prompt-attach-receipt':
      advanceOrderModal();
      break;

    case 'scan-into-barcode': {
      const box = document.getElementById('edit-barcode-scanner-box');
      const errBox = document.getElementById('edit-barcode-scan-error');
      if (errBox) errBox.textContent = '';
      if (!box) break;

      if (state.editBarcodeScanner) {
        await stopEditBarcodeScanner();
        break;
      }

      if (!window.Html5Qrcode) {
        if (errBox) errBox.textContent = 'مكتبة مسح الكاميرا غير محمّلة.';
        break;
      }

      box.style.display = 'block';
      box.innerHTML = '<div id="mini-barcode-viewport" style="width:100%;min-height:200px"></div>';
      try {
        const formats = getBarcodeScannerFormats();
        const miniScanner = new Html5Qrcode('mini-barcode-viewport', {
          formatsToSupport: formats,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          verbose: false
        });
        state.editBarcodeScanner = miniScanner;
        await miniScanner.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 240, height: 120 }, aspectRatio: 1.5 },
          async (decodedText) => {
            playBeepSound();
            if (navigator.vibrate) { try { navigator.vibrate(80); } catch (e) {} }
            const inp = $('#edit-barcode');
            if (inp) inp.value = decodedText.trim();
            await stopEditBarcodeScanner();
            toast('تم التقاط الباركود: ' + decodedText.trim() + ' — اضغط حفظ للتأكيد');
          },
          () => {}
        );
      } catch (err) {
        await stopEditBarcodeScanner();
        if (errBox) errBox.textContent = 'تعذر فتح الكاميرا: ' + (err.message || 'تأكد من تفعيل إذن الكاميرا للتطبيق');
      }
      break;
    }




    case 'advance-order':
      advanceOrderModal();
      break;

    case 'confirm-advance-order': {
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
    }

    case 'preview-whatsapp': {
      const msg = $('#message-text')?.value.trim();
      if (!msg) {
        toast('اكتب نص الرسالة أولًا');
        break;
      }
      const c = cBy(state.messageCustomer);
      const phone = c?.phone_e164 || c?.phone || '';
      const cleanPhone = phone.replace(/[^0-9]/g, '');

      openModal('معاينة الرسالة',
        '<p class="sheet-description">' + esc(c?.display_name || c?.name || 'العميل') + (phone ? ' · ' + esc(phone) : ' (رقم الهاتف غير مسجل)') + '</p>' +
        '<div class="message-preview">' + esc(msg) + '</div>' +
        '<div class="button-row">' +
          (cleanPhone ?
            '<a class="primary-btn whatsapp" href="https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">' +
              icon('chat') + 'فتح في واتساب' +
            '</a>' : '') +
          '<button class="secondary-btn" data-action="copy-message">' + icon('copy') + 'نسخ النص</button>' +
        '</div>' +
        '<p class="caption-note">في تطبيق أندرويد، يفتح واتساب مباشرة بالرسالة المجهزة.</p>'
      );
      state.message = msg;
      break;
    }

    case 'copy-message':
      try {
        await navigator.clipboard.writeText(state.message);
        toast('تم نسخ الرسالة');
      } catch {
        toast('النسخ غير متاح هنا؛ يمكنك تحديد النص ونسخه.');
      }
      break;

    case 'toggle-odoo-archive': {
      const p = pBy(state.selectedProduct);
      if (!p) break;
      const shouldArchive = b.dataset.archive === '1';
      const label = shouldArchive ? 'أرشفة وإخفاء' : 'إلغاء أرشفة وتفعيل';
      if (!confirm('هل تريد ' + label + ' «' + (p.name || '') + ' (' + (p.color_name || '') + ')» مباشرة على Odoo والموقع؟')) break;
      try {
        toast('جاري ' + label + ' المنتج على Odoo...');
        const res = await window.EnzaDB.odoo.setArchive({
          id: p.id,
          externalId: p.external_id,
          archived: shouldArchive
        });
        p.is_published = !shouldArchive;
        render(false);
        toast(res.odooSynced
          ? (shouldArchive ? 'تمت أرشفة المنتج مباشرة على Odoo بنجاح' : 'تم إلغاء أرشفة المنتج وإعادته على Odoo بنجاح')
          : 'تم تحديث الحالة في Supabase (افتح من تطبيق الأندرويد للمزامنة المباشرة مع Odoo)');
      } catch (err) {
        toast('فشل تحديث الأرشيف على Odoo: ' + (err.message || 'خطأ في الاتصال'));
      }
      break;
    }

    case 'open-cash-entry-detail':
      openCashEntryDetailModal(b.dataset.kind, b.dataset.id);
      break;

    case 'delete-order': {
      const targetId = String(b.dataset.id || state.selectedOrder || '');
      if (!targetId) break;
      const ord = oBy(targetId);
      const refLabel = ord ? (ord.display_number || ('#EN-' + ord.id)) : targetId;
      if (!confirm('هل تريد بالتأكيد حذف الطلب «' + refLabel + '»؟')) break;
      try {
        // 1. Remove from local fallback orders
        try {
          const localOrds = JSON.parse(localStorage.getItem('enza_local_orders') || '[]');
          const filtered = localOrds.filter(o => String(o.id) !== targetId);
          localStorage.setItem('enza_local_orders', JSON.stringify(filtered));
        } catch (e) {}
        // 2. Remove associated ops / waybill metadata
        ['enza_order_ops', 'enza_order_ops_v2'].forEach(k => {
          try {
            const m = JSON.parse(localStorage.getItem(k) || '{}');
            if (m && Object.prototype.hasOwnProperty.call(m, targetId)) {
              delete m[targetId];
              localStorage.setItem(k, JSON.stringify(m));
            }
          } catch (e) {}
        });
        // 3. Remove from Supabase if it's a real DB order
        try {
          const sb = window.EnzaDB?.getClient?.();
          if (sb && !targetId.startsWith('ord_')) {
            await sb.from('order_lines').delete().eq('order_id', targetId);
            await sb.from('orders').delete().eq('id', targetId);
          }
        } catch (sbErr) {}
        // 4. Remove from in-memory lists
        if (Array.isArray(state.liveOrders)) {
          state.liveOrders = state.liveOrders.filter(o => String(o.id) !== targetId);
        }
        if (typeof demoOrders !== 'undefined' && Array.isArray(demoOrders)) {
          const idx = demoOrders.findIndex(o => String(o.id) === targetId);
          if (idx >= 0) demoOrders.splice(idx, 1);
        }
        if (state.screen === 'order' && String(state.selectedOrder) === targetId) {
          navigate('orders');
        } else {
          render(false);
        }
        toast('تم حذف الطلب ' + refLabel + ' بنجاح');
      } catch (err) {
        toast('فشل حذف الطلب: ' + (err.message || 'حاول مرة أخرى'));
      }
      break;
    }

    case 'open-order-invoice':
      openBrandedInvoiceModal(b.dataset.id || state.selectedOrder);
      break;

    case 'share-invoice-pdf': {
      const inv = state.activeInvoiceData || buildOrderInvoiceData(state.selectedOrder);
      if (!inv) { toast('لا توجد بيانات فاتورة'); break; }
      try {
        toast('جاري تجهيز وحفظ ملف PDF للفاتورة...');
        const dataUrl = await renderInvoiceToPngDataUrl(inv);
        const safeRef = String(inv.ref || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '');
        if (window.EnzaShare && typeof window.EnzaShare.sharePdf === 'function') {
          window.EnzaShare.sharePdf(dataUrl, 'ENZA-' + safeRef + '.pdf', 'فاتورة ENZA 3D Printing ' + inv.ref);
        } else {
          window.print();
        }
      } catch (err) {
        toast('تعذر إنشاء ملف PDF: ' + (err.message || ''));
      }
      break;
    }

    case 'share-invoice-image': {
      const inv = state.activeInvoiceData || buildOrderInvoiceData(state.selectedOrder);
      if (!inv) { toast('لا توجد بيانات فاتورة للمشاركة'); break; }
      try {
        toast('جاري تجهيز صورة الفاتورة...');
        const dataUrl = await renderInvoiceToPngDataUrl(inv);
        const safeRef = String(inv.ref || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '');
        if (window.EnzaShare && typeof window.EnzaShare.shareImage === 'function') {
          window.EnzaShare.shareImage(dataUrl, 'ENZA-' + safeRef + '.png', 'فاتورة ENZA 3D Printing ' + inv.ref);
        } else {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = 'ENZA-' + safeRef + '.png';
          a.click();
          toast('تم تحميل صورة الفاتورة بنجاح');
        }
      } catch (err) {
        toast('تعذر إنشاء صورة الفاتورة: ' + (err.message || ''));
      }
      break;
    }

    case 'copy-invoice-text': {
      const inv = state.activeInvoiceData || buildOrderInvoiceData(state.selectedOrder);
      if (!inv) break;
      const linesTxt = inv.rows.map(r => '• ' + r.name + (r.color ? ' (' + r.color + ')' : '') + ' × ' + r.qty + ' = ' + money(r.lineTotal) + ' ج.م').join('\n');
      const txt =
        'فاتورة ENZA 3D Printing\n' +
        'رقم الفاتورة: ' + inv.ref + '\n' +
        'التاريخ: ' + inv.dateText + ' - ' + inv.timeText + '\n' +
        'العميل: ' + inv.customerName + ' (' + inv.customerPhone + ')\n' +
        '----------------\n' +
        linesTxt + '\n' +
        '----------------\n' +
        'قيمة المنتجات: ' + money(inv.subtotal) + ' ج.م\n' +
        'الشحن: ' + money(inv.shipping) + ' ج.م\n' +
        'الإجمالي النهائي: ' + money(inv.grandTotal) + ' ج.م\n' +
        'المدفوع: ' + money(inv.paid) + ' ج.م\n' +
        'المتبقي: ' + money(inv.remaining) + ' ج.م';
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(txt);
        toast('تم نسخ نص الفاتورة للواتساب');
      } else {
        toast('النسخ غير مدعوم هنا');
      }
      break;
    }

    case 'reset-all-orders': {
      if (!confirm('هل تريد بالتأكيد تصفير ومسح جميع الطلبات للبدء على نظافة؟ (لن يتم حذف المنتجات أو المخزون)')) break;
      const alsoClearCash = confirm('هل تريد أيضاً تصفير حركات العهدة والمصروفات التجريبية؟\nاضغط OK لتصفير العهدة أيضاً، أو Cancel للإبقاء عليها.');
      try {
        // 1. Clear local order & shipping caches on this device
        localStorage.removeItem('enza_local_orders');
        localStorage.removeItem('enza_order_ops_v2');
        localStorage.removeItem('enza_urgent_ledger');
        if (alsoClearCash) {
          localStorage.removeItem('enza_custodian_movements');
          localStorage.removeItem('enza_expenses');
        }
        // 2. Also delete any orders in Supabase if permitted
        try {
          const sb = window.EnzaDB?.getClient?.();
          if (sb) {
            await sb.from('order_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await sb.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          }
        } catch (sbErr) {}
        state.live.orders = [];
        if (typeof demoOrders !== 'undefined' && Array.isArray(demoOrders)) demoOrders.length = 0;
        if (isLive()) await fetchLiveData();
        render(false);
        toast(alsoClearCash ? 'تم تصفير جميع الطلبات والعهدة بنجاح — جاهز للبدء على نظافة' : 'تم تصفير جميع الطلبات بنجاح — جاهز للبدء على نظافة');
      } catch (err) {
        toast('حدث خطأ أثناء التصفير: ' + (err.message || 'حاول مرة أخرى'));
      }
      break;
    }

    case 'check-updates':
      if (window.EnzaUpdater && typeof window.EnzaUpdater.checkForUpdates === 'function') {
        window.EnzaUpdater.checkForUpdates();
      } else {
        toast('فحص التحديثات التلقائي يعمل داخل تطبيق الأندرويد فقط.');
      }
      break;

    case 'test-connection':
    case 'retry-fetch':
      if (isLive()) {
        await fetchLiveData();
        toast('تم تحديث البيانات من Supabase');
      } else {
        state.syncFailed = false;
        demoEvents.unshift({
          title: 'تمت معاينة تحديث البيانات',
          text: 'محاكاة فقط • لم يتم الاتصال بقاعدة البيانات',
          time: formatArabicTime(),
          icon: 'sync'
        });
        render(false);
        toast('اكتملت معاينة المزامنة');
      }
      break;

    case 'setup-supabase':
      setupSupabaseModal();
      break;

    case 'clear-config':
      window.ENZA_SUPABASE_CONFIG?.clear();
      window.EnzaDB?.resetClient();
      closeModal();
      render();
      toast('تم مسح إعدادات Supabase');
      break;

    case 'toggle-mode':
      state.mode = state.mode === 'live' ? 'demo' : 'live';
      window.localStorage.setItem('enza_mode', state.mode);
      if (state.mode === 'live' && !state.dbInitialized) {
        fetchLiveData();
      }
      render();
      toast(state.mode === 'live' ? 'تم الانتقال للوضع المباشر (Supabase)' : 'تم الانتقال لوضع العرض التجريبي (Demo)');
      break;

    case 'explore-demo':
      state.mode = 'demo';
      window.localStorage.setItem('enza_mode', 'demo');
      navigate('home');
      toast('أهلاً بك في وضع العرض التجريبي');
      break;

    case 'logout':
      if (window.EnzaDB) {
        await window.EnzaDB.auth.signOut();
      }
      state.user = null;
      navigate('login');
      toast('تم تسجيل الخروج');
      break;

    case 'forgot':
      openModal('استعادة كلمة المرور',
        '<p class="sheet-description">اكتب بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور.</p>' +
        '<form id="reset-form">' +
          '<label class="field-label" for="reset-email">البريد الإلكتروني</label>' +
          '<input class="field ltr" id="reset-email" type="email" placeholder="name@company.com" required>' +
          '<div id="reset-error" class="inline-error" role="alert"></div>' +
          '<button class="primary-btn" style="margin-top:17px" type="submit">إرسال الرابط</button>' +
        '</form>'
      );
      break;
  }
});

// Search input handling with simple debounce
let searchDebounce = null;
function applyMainSearch(value, immediate = false) {
  state.query = value || '';
  clearTimeout(searchDebounce);
  const run = () => {
    const res = $('#results');
    if (res) {
      res.innerHTML = ({orders: orderResults, inventory: productResults, customers: customerResults})[state.screen]?.() || '';
    }
  };
  if (immediate) run();
  else searchDebounce = setTimeout(run, 100);
}
document.addEventListener('search', e => {
  if (e.target.id === 'search-input') {
    applyMainSearch(e.target.value, true);
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'search-input') {
    applyMainSearch(e.target.value, false);
  }
  if (e.target.id === 'stock-qty') {
    updateStockPreview();
  }
  if (e.target.id === 'disb-cust-search') {
    const term = e.target.value || '';
    const custs = getCustomers();
    const list = $('#disb-cust-list');
    if (list) {
      const filtered = custs.filter(c => {
        const haystack = [c.display_name, c.name, c.phone_e164, c.phone, c.city, c.area, c.address].filter(Boolean).join(' ');
        return matchesSearch(haystack, term);
      });
      list.innerHTML = filtered.slice(0, 15).map(c =>
        '<button type="button" class="cust-select-item ' + (String(state.disburseSelectedCustomer) === String(c.id) ? 'selected' : '') + '" data-action="select-disburse-customer" data-id="' + c.id + '">' +
          '<div><b>' + esc(c.display_name || c.name) + '</b><small>' + esc(c.phone_e164 || c.phone || '') + ' · ' + esc(c.city || '') + '</small></div>' +
          (String(state.disburseSelectedCustomer) === String(c.id) ? icon('check') : icon('left')) +
        '</button>'
      ).join('');
    }
  }

  if (e.target.classList.contains('disb-item-price')) {
    const idx = Number(e.target.dataset.idx);
    if (state.disburseItems[idx]) {
      state.disburseItems[idx].unitPrice = Number(e.target.value) || 0;
      recalculateDisbursementTotals(false);
    }
  }

  if (e.target.id === 'disb-paid-input') {
    e.target.dataset.touched = 'true';
    recalculateDisbursementTotals(true);
  }
});

document.addEventListener('change', e => {
  if (e.target.classList.contains('disb-item-product')) {
    const idx = Number(e.target.dataset.idx);
    if (state.disburseItems[idx]) {
      state.disburseItems[idx].variantId = e.target.value;
      const prod = pBy(e.target.value);
      if (prod) {
        const pr = prod.sale_price !== undefined ? prod.sale_price : prod.price;
        state.disburseItems[idx].unitPrice = Number(pr) || 0;
        const priceInp = document.querySelector('.disb-item-price[data-idx="' + idx + '"]');
        if (priceInp) priceInp.value = state.disburseItems[idx].unitPrice;
      }
      recalculateDisbursementTotals(false);
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

  if (e.target.id === 'direct-waybill-file' && e.target.files?.[0]) {
    const reader = new FileReader();
    reader.onload = ev => {
      state.directWaybillBase64 = ev.target.result;
      const box = $('#direct-waybill-preview');
      if (box) box.innerHTML = '<img src="' + ev.target.result + '" style="max-height:130px;border-radius:10px;border:1px solid #ddd">';
    };
    reader.readAsDataURL(e.target.files[0]);
  }

  if (e.target.id === 'edit-image-file' && e.target.files?.[0]) {
    const reader = new FileReader();
    reader.onload = ev => {
      state.editImageBase64 = ev.target.result;
      const box = $('#image-preview-box');
      if (box) box.innerHTML = '<img src="' + ev.target.result + '" style="max-height:100px;border-radius:10px;margin-top:8px">';
    };
    reader.readAsDataURL(e.target.files[0]);
  }
  if (e.target.id === 'sync-switch') {
    state.syncFailed = e.target.checked;
    render(false);
  }
  if (e.target.id === 'notifications-switch') {
    state.notifications = e.target.checked;
    toast(state.notifications ? 'تم تفعيل تفضيل الإشعارات' : 'تم إيقاف تفضيل الإشعارات');
  }
});

// Form Submissions
document.addEventListener('submit', async e => {
  e.preventDefault();

  // DIRECT WAYBILL UPLOAD FORM SUBMISSION (إرفاق بوليصة الشحن Urgent)
  if (e.target.id === 'direct-waybill-form') {
    const oId = e.target.dataset.id;
    const o = oBy(oId);
    const errBox = $('#direct-waybill-error');
    const btn = $('#direct-waybill-submit');
    if (!o) return;

    if (!state.directWaybillBase64) {
      if (errBox) errBox.textContent = 'يرجى اختيار أو تصوير صورة بوليصة الشحن أولاً.';
      return;
    }

    const markShipped = $('#direct-waybill-mark-shipped') ? Boolean($('#direct-waybill-mark-shipped').checked) : false;
    const newStatus = markShipped ? 'shipped' : (o.fulfillment_status || o.status || 'new');

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'جارٍ حفظ بوليصة الشحن...';
      }

      o.waybill_image_url = state.directWaybillBase64;
      if (markShipped) {
        o.fulfillment_status = 'shipped';
        o.status = 'shipped';
      }

      try {
        const localStore = JSON.parse(localStorage.getItem('enza_order_ops') || '{}');
        localStore[o.id] = {
          ...(localStore[o.id] || {}),
          waybill_image_url: state.directWaybillBase64
        };
        localStorage.setItem('enza_order_ops', JSON.stringify(localStore));
      } catch (err) {}

      if (isLive() && window.EnzaDB?.orders) {
        await window.EnzaDB.orders.updateOperationalData({
          orderId: o.id,
          status: newStatus,
          waybillImageUrl: state.directWaybillBase64
        });
      }

      closeModal();
      render(false);
      toast('تم إرفاق وحفظ صورة بوليصة الشحن (Urgent) بنجاح!');
    } catch (err) {
      if (errBox) errBox.textContent = 'فشل الحفظ: ' + err.message;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = icon('check') + ' حفظ صورة بوليصة Urgent';
      }
    }
    return;
  }

  // DISBURSE FORM SUBMISSION (MULTI-PRODUCT)
  if (e.target.id === 'disburse-form') {
    syncDisburseItemsFromDOM();
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
        btn.innerHTML = icon('check') + ' إتمام الصرف والخصم من المخزن';
        return;
      }
    } else {
      if (!customerId) {
        errBox.textContent = 'يرجى اختيار عميل مسجل من القائمة أو الضغط على «+ عميل جديد».';
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
          productName: p ? p.name : 'بكرة فيلامينت',
          brand: p ? (p.brand || '') : '',
          colorName: p ? (p.color_name || p.color || '') : '',
          colorHex: p ? (p.color_hex || p.hex || '#7c858e') : '#7c858e',
          externalId: p ? (p.external_id || null) : null,
          imageUrl: p ? (p.image_url || null) : null,
          type: p ? (p.type || 'spool') : 'spool',
          name: p ? ((p.brand ? p.brand + ' — ' : '') + p.name + (p.color_name || p.color ? ' (' + (p.color_name || p.color) + ')' : '')) : 'بكرة فيلامينت'
        };
      });

      let createdOrder = null;
      if (isLive()) {
        createdOrder = await window.EnzaDB.orders.createManualDisbursement({
          customerId: customerId,
          items: lineItems,
          totalAmount: grandTotal,
          paidAmount: paidAmount,
          remainingAmount: remainingAmount,
          shippingAmount: Number(state.disburseShipping || 0),
          waybillImageUrl: state.disburseWaybillBase64 || null
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
          status: state.disburseWaybillBase64 ? 'shipped' : 'preparing',
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          waybill_image_url: state.disburseWaybillBase64 || null,
          placed_at: new Date().toISOString(),
          shipping: Number(state.disburseShipping || 0),
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
      if (isLive()) await fetchLiveData();
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
              '<div class="calc-row"><span>المديونية المتبقية:</span><b style="color:' + (remainingAmount > 0 ? 'var(--red)' : 'var(--muted)') + '">' + money(remainingAmount) + ' ج.م</b></div>' +
            '</div>' +
            '<div class="button-row" style="margin-bottom:8px">' +
              '<button class="primary-btn" style="background:#25262b" data-action="open-order-invoice" data-id="' + esc(String((createdOrder && createdOrder.id) || '')) + '">' + icon('receipt') + ' عرض ومشاركة الفاتورة</button>' +
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
      btn.innerHTML = icon('check') + ' إتمام الصرف والخصم من المخزن';
    }
    return;
  }

  // ADD CUSTODY CASH FORM SUBMISSION (إضافة عهدة فلوس)
  if (e.target.id === 'add-custody-cash-form') {
    const amount = Number($('#cust-cash-amount')?.value || 0);
    const source = $('#cust-cash-source')?.value || 'عهدة نقدية';
    const notes = $('#cust-cash-notes')?.value.trim() || '';
    const errBox = $('#cust-cash-error');
    if (amount <= 0) {
      if (errBox) errBox.textContent = 'يرجى إدخال مبلغ صحيح أكبر من صفر.';
      return;
    }

    const fullNote = source + (notes ? ' — ' + notes : '');
    if (window.EnzaDB?.custodian) {
      await window.EnzaDB.custodian.recordMovement({
        type: 'cash_inflow',
        qty: 0,
        cashCollected: amount,
        cashRemaining: 0,
        notes: fullNote
      });
    } else {
      const hist = JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]');
      hist.unshift({
        id: 'cm_' + Date.now(),
        type: 'cash_inflow',
        qty: 0,
        cash_collected: amount,
        cash_remaining: 0,
        notes: fullNote,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('enza_custodian_movements', JSON.stringify(hist));
    }

    closeModal();
    render(false);
    toast('تم إضافة ' + money(amount) + ' ج.م لرصيد العهدة بنجاح!');
    return;
  }

  // QUICK ADD STOCK FORM SUBMISSION (إضافة بضاعة للمخزن)
  if (e.target.id === 'quick-add-stock-form') {
    const vId = $('#quick-stock-product')?.value;
    const qty = Number($('#quick-stock-qty')?.value || 0);
    const notes = $('#quick-stock-notes')?.value.trim() || 'توريد بضاعة للمخزن';
    const errBox = $('#quick-stock-error');
    const btn = $('#quick-stock-submit');

    if (!vId || qty <= 0) {
      if (errBox) errBox.textContent = 'يرجى اختيار المنتج وإدخال كمية صحيحة.';
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'جارٍ إضافة البضاعة للمخزن...';
      }

      if (isLive() && window.EnzaDB?.products) {
        await window.EnzaDB.products.applyMovement({
          variantId: vId,
          direction: 'in',
          qty: qty,
          reason: notes
        });
      } else {
        const p = pBy(vId);
        if (p) {
          if (p.available_qty !== undefined) p.available_qty += qty;
          else p.stock = (p.stock || 0) + qty;
        }
      }

      const hist = JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]');
      hist.unshift({
        id: 'cm_' + Date.now(),
        variant_id: vId,
        type: 'receive_from_warehouse',
        qty: qty,
        cash_collected: 0,
        cash_remaining: 0,
        notes: notes,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('enza_custodian_movements', JSON.stringify(hist));

      closeModal();
      if (isLive()) await fetchLiveData();
      render(false);
      toast('تم إضافة ' + qty + ' بكرة للمخزن بنجاح!');
    } catch (err) {
      if (errBox) errBox.textContent = 'تعذّر إضافة البضاعة: ' + err.message;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = icon('check') + ' تأكيد إضافة البضاعة للمخزن';
      }
    }
    return;
  }

  // EDIT CUSTOMER FORM SUBMISSION (تعديل بيانات العميل)
  if (e.target.id === 'edit-customer-form') {
    const custId = e.target.dataset.id;
    const name = $('#edit-cust-name')?.value.trim();
    const phone = $('#edit-cust-phone')?.value.trim();
    const city = $('#edit-cust-city')?.value.trim() || 'القاهرة';
    const address = $('#edit-cust-address')?.value.trim() || '';
    const errBox = $('#edit-cust-error');
    const btn = $('#edit-cust-submit');

    if (!name) {
      if (errBox) errBox.textContent = 'يرجى إدخال اسم العميل.';
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'جارٍ حفظ التعديلات...';
      }

      if (window.EnzaDB?.customers) {
        await window.EnzaDB.customers.update(custId, {
          displayName: name,
          phone: phone,
          city: city,
          address: address
        });
      }

      const c = cBy(custId);
      if (c) {
        c.display_name = name;
        c.name = name;
        c.phone_e164 = phone;
        c.phone = phone;
        c.city = city;
        c.area = city;
        c.address = address;
      }

      closeModal();
      render(false);
      toast('تم تعديل بيانات العميل «' + name + '» بنجاح!');
    } catch (err) {
      if (errBox) errBox.textContent = 'فشل تعديل البيانات: ' + err.message;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = icon('check') + ' حفظ التعديلات';
      }
    }
    return;
  }

  // STANDALONE NEW CUSTOMER FORM SUBMISSION (إضافة عميل جديد)
  if (e.target.id === 'standalone-customer-form') {
    const name = $('#new-cust-name')?.value.trim();
    const phone = $('#new-cust-phone')?.value.trim();
    const city = $('#new-cust-city')?.value.trim() || 'القاهرة';
    const address = $('#new-cust-address')?.value.trim() || '';
    const errBox = $('#new-cust-error');
    const btn = $('#new-cust-submit');

    if (!name) {
      if (errBox) errBox.textContent = 'يرجى إدخال اسم العميل.';
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'جارٍ حفظ العميل...';
      }

      if (isLive() && window.EnzaDB?.customers) {
        const newC = await window.EnzaDB.customers.create({
          displayName: name,
          phone: phone,
          city: city,
          address: address
        });
        state.liveCustomers.unshift(newC);
        state.selectedCustomer = newC.id;
      } else {
        const newC = {
          id: Date.now(),
          name: name,
          display_name: name,
          phone: phone,
          phone_e164: phone,
          city: city,
          area: city,
          address: address,
          color: 'red'
        };
        demoCustomers.unshift(newC);
        state.selectedCustomer = newC.id;
      }

      closeModal();
      render(false);
      toast('تم إضافة العميل «' + name + '» بنجاح!');
    } catch (err) {
      if (errBox) errBox.textContent = 'فشل حفظ العميل: ' + err.message;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = icon('check') + ' حفظ العميل الجديد';
      }
    }
    return;
  }

  // RECORD 9: SETTLE DEBT FORM SUBMISSION (سداد دائن العميل)
  if (e.target.id === 'settle-debt-form') {
    const oId = e.target.dataset.id;
    const o = oBy(oId);
    if (!o) return;
    const ops = getOrderOps(o);
    const amountPaid = Number($('#settle-amount-input')?.value || 0);
    const sourceMethod = $('#settle-source-input')?.value || 'كاش نقدي مباشر';
    if (amountPaid <= 0) {
      const errBox = $('#settle-debt-error');
      if (errBox) errBox.textContent = 'يرجى إدخال مبلغ سداد صحيح.';
      return;
    }

    const newPaid = ops.paid + amountPaid;
    const newRemaining = Math.max(0, ops.remaining - amountPaid);
    o.paid_amount = newPaid;
    o.remaining_amount = newRemaining;
    o.payment_status = (newRemaining === 0 ? 'full' : 'partial');

    if (isLive() && window.EnzaDB?.orders) {
      try {
        await window.EnzaDB.orders.recordPayment(o.id, newPaid, newRemaining, o.payment_status);
      } catch (err) {}
    }

    const hist = JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]');
    hist.unshift({
      id: Date.now(),
      created_at: new Date().toISOString(),
      type: 'settle_debt',
      cash_collected: amountPaid,
      cash_remaining: newRemaining,
      qty: 0,
      variant_id: null,
      notes: sourceMethod,
      customer_name: (o.customer?.display_name || o.customer?.name || 'عميل')
    });
    localStorage.setItem('enza_custodian_movements', JSON.stringify(hist));

    closeModal();
    toast('تم تسجيل سداد مديونية العميل (' + money(amountPaid) + ' ج.م — ' + sourceMethod + ') بنجاح!');
    render(false);
    return;
  }

  // RECORD 10: EDIT SHIPPING FORM SUBMISSION (تعديل مصاريف الشحن يدوياً)
  if (e.target.id === 'edit-shipping-form') {
    const oId = e.target.dataset.id;
    const o = oBy(oId);
    if (!o) return;
    const newShipping = Number($('#edit-shipping-val')?.value || 0);
    o.shipping = newShipping;
    o.shipping_amount = newShipping;

    if (isLive() && window.EnzaDB?.orders) {
      try {
        await window.EnzaDB.orders.updateOrderShipping(o.id, newShipping);
      } catch (err) {}
    }

    closeModal();
    toast('تم تحديث مصاريف الشحن بنجاح!');
    render(false);
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


  // 1. Barcode Manual Search
  if (e.target.id === 'manual-scan') {
    const value = $('#barcode-input').value.trim().toLowerCase();
    const errBox = $('#scan-error');
    errBox.textContent = '';

    if (isLive()) {
      try {
        const found = await window.EnzaDB.products.getByCode(value);
        if (found) {
          showScan(found);
        } else {
          errBox.textContent = 'الكود مش مرتبط بأي منتج في قاعدة البيانات.';
        }
      } catch (err) {
        errBox.textContent = 'خطأ أثناء البحث: ' + err.message;
      }
    } else {
      const p = demoProducts.find(p => p.sku.toLowerCase() === value || p.barcode === value);
      if (p) showScan(p);
      else errBox.textContent = 'الكود مش مرتبط بمنتج في المعاينة. جرّب ES-PLA-WH-1KG.';
    }
  }

  // 1.5. Edit Product on Odoo Form Submission
  if (e.target.id === 'edit-product-form') {
    const p = pBy(state.selectedProduct);
    if (!p) return;
    const newPrice = Number($('#edit-price')?.value);
    const isPub = Boolean($('#edit-published')?.checked);
    const submitBtn = $('#edit-product-submit');
    const errBox = $('#edit-product-error');
    errBox.textContent = '';

    if (isNaN(newPrice) || newPrice < 0) {
      errBox.textContent = 'يرجى إدخال سعر صحيح.';
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جارٍ تحديث المتجر وSupabase...';

      await stopEditBarcodeScanner();
      const newBarcode = $('#edit-barcode')?.value.trim();

      const storeRes = await window.EnzaDB.products.updateStore({
        id: p.id,
        externalId: p.external_id,
        price: newPrice,
        isPublished: isPub,
        imageUrl: state.editImageBase64
      });

      let barcodeRes = null;
      if (newBarcode !== undefined) {
        barcodeRes = await window.EnzaDB.products.updateBarcode({
          id: p.id,
          externalId: p.external_id,
          barcode: newBarcode
        });
        p.barcode = newBarcode;
      }

      p.sale_price = newPrice;
      p.is_published = isPub;
      if (state.editImageBase64) p.image_url = state.editImageBase64;

      closeModal();
      render(false);
      const syncedOdoo = Boolean((storeRes && storeRes.odooSynced) || (barcodeRes && barcodeRes.odooSynced));
      toast(syncedOdoo
        ? 'تم حفظ الباركود والسعر ومزامنتهما مباشرة مع Odoo بنجاح!'
        : 'تم حفظ الباركود والسعر في التطبيق بنجاح!');
    } catch (err) {
      console.error('Edit error:', err);
      errBox.textContent = err.message || 'فشل التحديث';
      submitBtn.disabled = false;
      submitBtn.textContent = 'حفظ وتحديث المتجر فوراً';
    }
  }

  // 2. Stock Movement Form Submission
  if (e.target.id === 'stock-form') {
    const p = pBy(state.selectedProduct);
    if (!p) return;
    const q = Number($('#stock-qty').value);
    const reason = $('#stock-reason').value;
    const errBox = $('#stock-error');
    const submitBtn = $('#stock-submit-btn');
    errBox.textContent = '';

    if (!Number.isInteger(q) || q < 0 || q > 9999) {
      errBox.textContent = 'اكتب عددًا صحيحًا من ٠ إلى ٩٩٩٩.';
      return;
    }
    if (!reason) {
      errBox.textContent = 'اختر سبب الحركة أولًا.';
      return;
    }

    const currentStock = p.available_qty !== undefined ? p.available_qty : p.stock;
    let direction = state.movement;
    let changeQty = q;
    let after = 0;

    if (state.movement === 'set') {
      const diff = q - currentStock;
      if (diff === 0) {
        toast('الرصيد مطابق ولم يحدث أي تغيير.');
        closeModal();
        return;
      }
      direction = diff > 0 ? 'in' : 'out';
      changeQty = Math.abs(diff);
      after = q;
    } else {
      after = currentStock + (state.movement === 'in' ? q : -q);
      if (after < 0) {
        errBox.textContent = 'لا يمكن صرف كمية أكبر من الرصيد المتاح.';
        return;
      }
    }

    if (isLive()) {
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'جارٍ الحفظ بقاعدة البيانات...';

        // Call the database atomic procedure
        const result = await window.EnzaDB.products.applyMovement({
          variantId: p.id,
          direction: direction,
          qty: changeQty,
          reason: state.movement === 'set' ? 'تسوية جرد فعلي مباشر' : reason
        });

        // Update local object
        p.available_qty = result.balance_after;
        closeModal();
        render(false);
        toast('تم تعديل رصيد المخزون في Supabase • الرصيد الجديد ' + result.balance_after + ' قطعة');
      } catch (err) {
        console.error('[Enza] Movement save failed:', err);
        errBox.textContent = err.message || 'فشل حفظ الحركة في قاعدة البيانات';
        submitBtn.disabled = false;
        submitBtn.textContent = 'حفظ الحركة في قاعدة البيانات';
      }
    } else {
      p.stock = after;
      demoEvents.unshift({
        title: (state.movement === 'set' ? 'تعديل جرد إلى ' : (state.movement === 'in' ? 'إضافة ' : 'صرف ')) + (state.movement === 'set' ? q : changeQty) + ' قطعة • ' + p.name,
        text: 'الرصيد الجديد ' + after + ' • تعديل داخل المعاينة',
        time: formatArabicTime(),
        icon: 'inventory'
      });
      closeModal();
      render(false);
      toast('تم تعديل رصيد المنتج إلى ' + after + ' قطعة');
    }
    return;
  }

  // 3. Login Form Submission
  if (e.target.id === 'login-form') {
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const errBox = $('#login-error');
    const submitBtn = $('#login-submit-btn');
    errBox.textContent = '';

    if (isLive()) {
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'جارٍ التحقق...';

        const { user, profile } = await window.EnzaDB.auth.signIn(email, password);
        state.user = profile;
        navigate('home');
        toast('تم تسجيل الدخول بنجاح • أهلاً ' + profile.display_name);
        await fetchLiveData();
      } catch (err) {
        console.error('[Enza] Login failed:', err);
        errBox.textContent = err.message || 'بيانات الدخول غير صحيحة أو الحساب غير مصرح له';
        submitBtn.disabled = false;
        submitBtn.textContent = 'تسجيل الدخول';
      }
    } else {
      // Demo mode fallback login
      state.user = { display_name: email.split('@')[0] || 'أحمد', role: 'operator', email: email };
      navigate('home');
      toast('أهلًا بيك في معاينة Enza • وضع تجريبي');
    }
  }

  // 4. Supabase Setup Form
  if (e.target.id === 'setup-supabase-form') {
    const url = $('#cfg-url').value.trim();
    const anon = $('#cfg-anon').value.trim();
    const errBox = $('#setup-error');

    if (!url.startsWith('https://')) {
      errBox.textContent = 'يجب أن يبدأ رابط المشروع بـ https://';
      return;
    }
    if (!anon || anon.length < 20) {
      errBox.textContent = 'يرجى إدخال Anon Key صالح.';
      return;
    }

    window.ENZA_SUPABASE_CONFIG.save(url, anon);
    window.EnzaDB.resetClient();
    state.mode = 'live';
    window.localStorage.setItem('enza_mode', 'live');
    closeModal();
    toast('تم حفظ إعدادات Supabase بنجاح!');
    await fetchLiveData();
  }

  // 5. Password Reset Request
  if (e.target.id === 'reset-form') {
    const email = $('#reset-email').value.trim();
    const errBox = $('#reset-error');

    if (isLive()) {
      try {
        await window.EnzaDB.auth.resetPassword(email);
        openModal('تم إرسال الرابط',
          '<div class="success-text">' +
            '<div class="success-symbol">' + icon('mail') + '</div>' +
            '<h3>راجع بريدك الإلكتروني</h3>' +
            '<p>أرسلنا رابط إعادة تعيين كلمة المرور إلى ' + esc(email) + '.</p>' +
          '</div>' +
          '<button class="primary-btn" style="margin-top:20px" data-action="close-modal">الرجوع لتسجيل الدخول</button>'
        );
      } catch (err) {
        errBox.textContent = err.message || 'تعذّر إرسال رابط الاستعادة';
      }
    } else {
      openModal('راجع بريدك (معاينة)',
        '<div class="success-text">' +
          '<div class="success-symbol">' + icon('mail') + '</div>' +
          '<h3>خطوة واحدة وترجع لشغلك</h3>' +
          '<p>هنا يظهر تأكيد إرسال رابط الاستعادة في التطبيق النهائي.<br>لم يتم إرسال بريد فعلي في المعاينة.</p>' +
        '</div>' +
        '<button class="primary-btn" style="margin-top:20px" data-action="close-modal">الرجوع لتسجيل الدخول</button>'
      );
    }
  }
});

// Modal accessibility key listener
document.addEventListener('keydown', e => {
  if (!state.modal) return;
  if (e.key === 'Escape') {
    closeModal();
    return;
  }
  if (e.key === 'Tab') {
    const focusable = $$('.sheet button:not([disabled]),.sheet input:not([disabled]),.sheet select:not([disabled]),.sheet textarea:not([disabled])');
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

// ----------------------------------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------------------------------
async function initApp() {
  render();

  // If Supabase is configured, check existing session and fetch live data
  if (window.EnzaDB && window.ENZA_SUPABASE_CONFIG?.isConfigured()) {
    try {
      const session = await window.EnzaDB.auth.getSession();
      if (session?.user) {
        const profile = await window.EnzaDB.auth.getProfile(session.user.id);
        if (profile && profile.is_active) {
          state.user = profile;
        }
      }
    } catch (e) {
      console.warn('[Enza] Session check error:', e);
    }

    if (state.mode === 'live') {
      await fetchLiveData();
    }
  }
}

initApp();
