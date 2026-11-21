// ============================================================================
// ENZA MOBILE — TWO-WAY SYNC DAEMON & ODOO BRIDGE
// 1. Pushes mobile edits (price, image, published) from Supabase to Odoo
// 2. Pulls new orders and products from Odoo into Supabase
// 3. Exposes instant API endpoint on port 3001
// ============================================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env.odoo
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

const ODOO_URL = process.env.ODOO_URL || '';
const ODOO_DB = process.env.ODOO_DB || '';
const ODOO_EMAIL = process.env.ODOO_EMAIL || '';
const ODOO_PASSWORD = process.env.ODOO_PASSWORD || '';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let odooUid = null;

function callOdoo(service, method, args) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(ODOO_URL);
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service, method, args },
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
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) reject(new Error(json.error.data?.message || json.error.message));
          else resolve(json.result);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function callSupabase(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(SUPABASE_URL);
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: '/rest/v1/' + endpoint,
      method: method,
      headers: headers
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getOdooUid() {
  if (odooUid) return odooUid;
  odooUid = await callOdoo('common', 'authenticate', [ODOO_DB, ODOO_EMAIL, ODOO_PASSWORD, {}]);
  return odooUid;
}

// Push a single product update directly to Odoo
async function updateOdooProduct({ odooId, listPrice, isPublished, image1920, barcode }) {
  const uid = await getOdooUid();
  const writeValues = {};

  if (listPrice !== undefined && listPrice !== null) {
    writeValues.list_price = Number(listPrice);
  }
  if (isPublished !== undefined && isPublished !== null) {
    writeValues.is_published = Boolean(isPublished);
  }
  if (barcode !== undefined && barcode !== null && String(barcode).trim()) {
    writeValues.barcode = String(barcode).trim();
  }
  if (image1920) {
    // Strip data:image/...;base64, prefix if present
    writeValues.image_1920 = image1920.replace(/^data:image\/[a-z]+;base64,/, '');
  }

  console.log(`📡 Updating Odoo product ${odooId}:`, Object.keys(writeValues));
  const res = await callOdoo('object', 'execute_kw', [
    ODOO_DB, uid, ODOO_PASSWORD,
    'product.template',
    'write',
    [[Number(odooId)], writeValues]
  ]);

  return res;
}

// Process pending updates from Supabase queue/flag
async function processPendingUpdates() {
  try {
    const pending = await callSupabase('product_variants?sync_pending=eq.true&limit=20', 'GET');
    if (!pending || !Array.isArray(pending) || pending.length === 0) return;

    console.log(`🔄 Found ${pending.length} pending mobile edits to sync to Odoo...`);
    for (const p of pending) {
      if (p.external_id) {
        try {
          await updateOdooProduct({
            odooId: p.external_id,
            listPrice: p.sale_price,
            isPublished: p.is_published,
            barcode: p.barcode,
            image1920: p.image_url?.startsWith('data:') ? p.image_url : null
          });
          console.log(`   ✅ Synced product ${p.name} (Odoo ID: ${p.external_id}) to Odoo!`);
        } catch (err) {
          console.error(`   ❌ Failed to sync product ${p.name}:`, err.message);
        }
      }
      // Clear pending flag
      try {
        await callSupabase(`product_variants?id=eq.${p.id}`, 'PATCH', { sync_pending: false });
      } catch (e) {}
    }
  } catch (err) {
    // Column might not exist yet if not migrated
  }
}

// Check for new orders from Odoo
async function checkNewOrders() {
  try {
    const uid = await getOdooUid();
    const orders = await callOdoo('object', 'execute_kw', [
      ODOO_DB, uid, ODOO_PASSWORD,
      'sale.order',
      'search_read',
      [[]],
      { fields: ['id', 'name', 'date_order', 'state', 'partner_id', 'partner_shipping_id', 'partner_invoice_id', 'amount_total'], limit: 10, order: 'id desc' }
    ]);

    for (const o of orders) {
      const existing = await callSupabase(`orders?display_number=eq.${encodeURIComponent(o.name)}&limit=1`, 'GET');
      if (!existing || existing.length === 0) {
        console.log(`🆕 New order found on Odoo: ${o.name} (${o.amount_total} EGP)`);

        // Check shipping partner if main partner is Public / generic (Record 11)
        const partnerIdToRead = Array.isArray(o.partner_shipping_id) ? o.partner_shipping_id[0] : (Array.isArray(o.partner_id) ? o.partner_id[0] : null);
        let partnerName = Array.isArray(o.partner_id) ? o.partner_id[1] : 'عميل جديد';
        let partnerPhone = '+201000000000';
        let partnerCity = 'القاهرة';
        let partnerStreet = 'طلب من متجر أودو';

        if (partnerIdToRead) {
          try {
            const partnerDetails = await callOdoo('object', 'execute_kw', [
              ODOO_DB, uid, ODOO_PASSWORD,
              'res.partner',
              'read',
              [[partnerIdToRead]],
              { fields: ['name', 'phone', 'mobile', 'street', 'city'] }
            ]);
            if (partnerDetails && partnerDetails[0]) {
              const pd = partnerDetails[0];
              if (pd.name && !pd.name.toLowerCase().includes('public')) {
                partnerName = pd.name;
              }
              const realPhone = pd.mobile || pd.phone;
              if (realPhone) {
                partnerPhone = String(realPhone).trim();
                if (!partnerPhone.startsWith('+') && partnerPhone.startsWith('01')) {
                  partnerPhone = '+2' + partnerPhone;
                }
              }
              if (pd.city) partnerCity = pd.city;
              if (pd.street) partnerStreet = pd.street;
            }
          } catch (pe) {
            console.warn('Could not read detailed partner info:', pe.message);
          }
        }

        let cust = await callSupabase(`customers?display_name=eq.${encodeURIComponent(partnerName)}&limit=1`, 'GET');
        let custId = cust?.[0]?.id;
        if (!custId) {
          const newC = await callSupabase('customers', 'POST', [{
            display_name: partnerName,
            phone_e164: partnerPhone,
            city: partnerCity,
            area: partnerCity,
            address: partnerStreet
          }]);
          custId = newC?.[0]?.id;
        }

        if (custId) {
          await callSupabase('orders', 'POST', [{
            display_number: o.name,
            customer_id: custId,
            placed_at: o.date_order ? new Date(o.date_order.replace(' ', 'T') + 'Z').toISOString() : new Date().toISOString(),
            fulfillment_status: 'new',
            payment_method: 'الدفع عند الاستلام',
            total_amount: Number(o.amount_total || 0),
            currency: 'EGP'
          }]);
          console.log(`   ✅ Order ${o.name} saved to Supabase!`);
        }
      }
    }
  } catch (e) {
    console.error('Check orders error:', e.message);
  }
}

// ----------------------------------------------------------------------------
// HTTP API SERVER (Instant Two-Way Bridge)
// ----------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/update-product' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { variantId, odooId, listPrice, isPublished, image1920, barcode } = payload;

        // 1. Update in Odoo
        if (odooId) {
          await updateOdooProduct({ odooId, listPrice, isPublished, image1920, barcode });
        }

        // 2. Update in Supabase
        if (variantId) {
          const supaUpdate = {};
          if (listPrice !== undefined) supaUpdate.sale_price = Number(listPrice);
          if (isPublished !== undefined) supaUpdate.is_published = Boolean(isPublished);
          if (barcode !== undefined && String(barcode).trim()) supaUpdate.barcode = String(barcode).trim();
          if (image1920) supaUpdate.image_url = image1920;
          supaUpdate.sync_pending = false;

          await callSupabase(`product_variants?id=eq.${variantId}`, 'PATCH', supaUpdate);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'تم تحديث المنتج في Odoo وSupabase بنجاح!' }));
      } catch (err) {
        console.error('API Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', odooConnected: Boolean(odooUid) }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`🌐 Odoo Sync Bridge running on http://localhost:${PORT}`);
  try {
    const uid = await getOdooUid();
    console.log(`✅ Connected to Odoo (${ODOO_URL}) with UID: ${uid}`);
  } catch (e) {
    console.error('⚠️ Odoo initial connection warning:', e.message);
  }

  // Periodic workers (Note: Odoo order auto-sync disabled per manager request; orders are managed directly in the app)
  setInterval(processPendingUpdates, 10000); // Check pending mobile product edits every 10s
});
