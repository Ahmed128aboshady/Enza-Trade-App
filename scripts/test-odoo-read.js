// ============================================================================
// ENZA MOBILE — TEST ODOO READ (JSON-RPC)
// Reads 1 test order and 1 test product from enza-trade-co.odoo.com
// WITHOUT modifying any modules or subscription plan.
// ============================================================================

const https = require('https');
const fs = require('fs');
const path = require('path');

// Try loading from .env.odoo if present
const envPath = path.join(__dirname, '..', '.env.odoo');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      if (k && v) process.env[k.trim()] = v.join('=').trim();
    }
  });
}

const ODOO_URL = process.env.ODOO_URL || 'https://enza-trade-co.odoo.com';
const ODOO_DB = process.env.ODOO_DB || 'enza-trade-co';
const ODOO_EMAIL = process.env.ODOO_EMAIL || process.argv[2];
const ODOO_PASSWORD = process.env.ODOO_PASSWORD || process.env.ODOO_API_KEY || process.argv[3];

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dcezhqnzontmqwijysbu.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZXpocW56b250bXF3aWp5c2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MjY1ODQsImV4cCI6MjEwOTIwMjU4NH0.Crr5_hLd5NQtRQgjnxMHcYbCszphXXeILkPKMRv-7eE';

function callOdoo(service, method, args) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(ODOO_URL);
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: service,
        method: method,
        args: args
      },
      id: Math.floor(Math.random() * 100000)
    });

    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: '/jsonrpc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.data?.message || json.error.message || 'Odoo RPC Error'));
          } else {
            resolve(json.result);
          }
        } catch (e) {
          reject(new Error('Invalid JSON response from Odoo: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  if (!ODOO_EMAIL || !ODOO_PASSWORD) {
    console.error('❌ يرجى تمرير البريد الإلكتروني وكلمة المرور/API Key لـ Odoo.');
    console.log('الاستخدام:');
    console.log('node scripts/test-odoo-read.js <email> <password_or_api_key>');
    console.log('أو احفظهما في ملف .env.odoo');
    process.exit(1);
  }

  console.log('🔗 جارٍ الاتصال بـ Odoo على:', ODOO_URL);
  console.log('قاعدة البيانات:', ODOO_DB);
  console.log('البريد:', ODOO_EMAIL);

  try {
    // 1. Authenticate
    console.log('🔐 جارٍ التحقق من بيانات الدخول...');
    const uid = await callOdoo('common', 'authenticate', [
      ODOO_DB,
      ODOO_EMAIL,
      ODOO_PASSWORD,
      {}
    ]);

    if (!uid) {
      console.error('❌ فشل تسجيل الدخول إلى Odoo. تأكد من البريد وكلمة المرور أو API Key.');
      process.exit(1);
    }

    console.log('✅ تم تسجيل الدخول إلى Odoo بنجاح! UID:', uid);

    // 2. Read 1 Product
    console.log('\n📦 جارٍ البحث عن المنتجات في Odoo (product.product)...');
    const productFields = ['id', 'name', 'default_code', 'barcode', 'list_price', 'qty_available'];
    const products = await callOdoo('object', 'execute_kw', [
      ODOO_DB,
      uid,
      ODOO_PASSWORD,
      'product.product',
      'search_read',
      [[['sale_ok', '=', true]]],
      { fields: productFields, limit: 3 }
    ]);

    console.log(`✅ تم قراءة ${products.length} منتجات بنجاح من Odoo:`);
    products.forEach(p => {
      console.log(`   - [ID: ${p.id}] ${p.name} | SKU: ${p.default_code || '—'} | السعر: ${p.list_price} ج.م | الرصيد: ${p.qty_available}`);
    });

    // 3. Read 1 Order
    console.log('\n🛒 جارٍ البحث عن طلبات المتجر (sale.order)...');
    const orderFields = ['id', 'name', 'date_order', 'state', 'partner_id', 'amount_total', 'order_line'];
    const orders = await callOdoo('object', 'execute_kw', [
      ODOO_DB,
      uid,
      ODOO_PASSWORD,
      'sale.order',
      'search_read',
      [[]],
      { fields: orderFields, limit: 1, order: 'id desc' }
    ]);

    if (orders.length === 0) {
      console.log('ℹ️ لم يتم العثور على طلبات سابقة في المتجر.');
    } else {
      const ord = orders[0];
      console.log(`✅ تم قراءة طلب واحد بنجاح من Odoo!`);
      console.log(`   - رقم الطلب: ${ord.name} (ID: ${ord.id})`);
      console.log(`   - التاريخ: ${ord.date_order}`);
      console.log(`   - العميل: ${Array.isArray(ord.partner_id) ? ord.partner_id[1] : ord.partner_id}`);
      console.log(`   - الحالة في Odoo: ${ord.state}`);
      console.log(`   - الإجمالي: ${ord.amount_total} ج.م`);
    }

    console.log('\n🎉 إثبات القراءة من Odoo نجح بنسبة 100% بدون أي تعديل في موديولات أو اشتراك Odoo!');
  } catch (err) {
    console.error('❌ حدث خطأ أثناء الاتصال:', err.message);
  }
}

run();
