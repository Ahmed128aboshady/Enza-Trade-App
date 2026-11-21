// ============================================================================
// ENZA MOBILE — SUPABASE CLIENT & API SERVICE
// Encapsulates Supabase Auth, Queries, RPC, Error Handling & Odoo Two-Way sync
// ============================================================================

(function(window) {
  'use strict';

  let client = null;

  function getClient() {
    if (client) return client;
    const cfg = window.ENZA_SUPABASE_CONFIG;
    if (cfg && cfg.isConfigured() && window.supabase) {
      try {
        client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
          }
        });
      } catch (e) {
        console.error('[Enza Supabase] Init error:', e);
      }
    }
    return client;
  }

  function resetClient() {
    client = null;
    return getClient();
  }

  const _odooCallbacks = {};
  window.__enzaOdooCallback = function (cbId, ok, message) {
    const entry = _odooCallbacks[cbId];
    if (!entry) return;
    delete _odooCallbacks[cbId];
    clearTimeout(entry.timer);
    if (ok) entry.resolve({ success: true, odooSynced: true, message });
    else entry.reject(new Error(message || 'تعذر الاتصال بـ Odoo'));
  };

  function callNativeOdoo(fnName, ...args) {
    return new Promise((resolve, reject) => {
      if (!window.EnzaOdoo || typeof window.EnzaOdoo[fnName] !== 'function') {
        return reject(new Error('جسر Odoo المباشر متاح داخل تطبيق الأندرويد فقط'));
      }
      if (typeof window.EnzaOdoo.isConfigured === 'function' && !window.EnzaOdoo.isConfigured()) {
        return reject(new Error('بيانات الاتصال بـ Odoo غير مضبوطة'));
      }
      const cbId = 'odoo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const timer = setTimeout(() => {
        delete _odooCallbacks[cbId];
        reject(new Error('انتهت مهلة الاتصال بـ Odoo'));
      }, 20000);
      _odooCallbacks[cbId] = { resolve, reject, timer };
      try {
        window.EnzaOdoo[fnName](...args, cbId);
      } catch (err) {
        clearTimeout(timer);
        delete _odooCallbacks[cbId];
        reject(err);
      }
    });
  }

  const EnzaDB = {
    getClient: getClient,
    resetClient: resetClient,

    isReady: function() {
      return Boolean(getClient());
    },

    odoo: {
      isAvailable() {
        return Boolean(window.EnzaOdoo && typeof window.EnzaOdoo.isConfigured === 'function' && window.EnzaOdoo.isConfigured());
      },
      async setArchive({ id, externalId, archived }) {
        let odooSynced = false;
        let odooMessage = '';
        if (externalId && this.isAvailable()) {
          const res = await callNativeOdoo('setProductArchive', String(externalId), Boolean(archived));
          odooSynced = true;
          odooMessage = res.message || '';
        }
        const sb = getClient();
        if (sb && id) {
          await sb.from('product_variants').update({ is_published: !archived }).eq('id', id);
        }
        return { success: true, odooSynced, message: odooMessage };
      }
    },

    // ------------------------------------------------------------------------
    // AUTHENTICATION & PROFILES
    // ------------------------------------------------------------------------
    auth: {
      async signIn(email, password) {
        const sb = getClient();
        if (!sb) throw new Error('لم يتم إعداد بيانات الاتصال بـ Supabase');
        const { data, error } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });
        if (error) throw error;

        // Verify profile
        const profile = await EnzaDB.auth.getProfile(data.user.id);
        return { user: data.user, session: data.session, profile: profile || { display_name: email.split('@')[0], role: 'admin', is_active: true } };
      },

      async signOut() {
        const sb = getClient();
        if (sb) {
          await sb.auth.signOut();
        }
      },

      async resetPassword(email) {
        const sb = getClient();
        if (!sb) throw new Error('لم يتم إعداد بيانات الاتصال بـ Supabase');
        const { data, error } = await sb.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        return data;
      },

      async getSession() {
        const sb = getClient();
        if (!sb) return null;
        const { data } = await sb.auth.getSession();
        return data?.session || null;
      },

      async getProfile(userId) {
        const sb = getClient();
        if (!sb) return null;
        const { data, error } = await sb
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (error) {
          console.warn('[Enza Supabase] Profile fetch error:', error);
          return null;
        }
        return data;
      },

      onAuthStateChange(callback) {
        const sb = getClient();
        if (!sb) return { data: { subscription: { unsubscribe: () => {} } } };
        return sb.auth.onAuthStateChange(callback);
      }
    },

    // ------------------------------------------------------------------------
    // PRODUCTS & INVENTORY
    // ------------------------------------------------------------------------
    products: {
      async list({ query = '', category = 'all', lowStock = false } = {}) {
        const sb = getClient();
        if (!sb) throw new Error('Supabase not configured');

        let q = sb
          .from('product_variants')
          .select('*')
          .order('name', { ascending: true });

        if (category && category !== 'all' && category !== 'low') {
          q = q.eq('category', category);
        }

        const { data, error } = await q;
        if (error) throw error;

        let results = data || [];

        if (lowStock || category === 'low') {
          results = results.filter(p => p.available_qty <= p.minimum_qty);
        }

        if (query && query.trim()) {
          const lower = query.trim().toLowerCase();
          results = results.filter(p =>
            (p.name || '').toLowerCase().includes(lower) ||
            (p.brand || '').toLowerCase().includes(lower) ||
            (p.color_name || '').toLowerCase().includes(lower) ||
            (p.sku || '').toLowerCase().includes(lower) ||
            (p.barcode || '').toLowerCase().includes(lower)
          );
        }

        return results;
      },

      async getById(id) {
        const sb = getClient();
        if (!sb) throw new Error('Supabase not configured');
        const { data, error } = await sb
          .from('product_variants')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      },

      async getByCode(code) {
        const sb = getClient();
        if (!sb) throw new Error('Supabase not configured');
        const clean = code.trim().toLowerCase();
        const { data, error } = await sb
          .from('product_variants')
          .select('*')
          .or(`sku.ilike.${clean},barcode.eq.${clean}`)
          .limit(1);
        if (error) throw error;
        return (data && data.length > 0) ? data[0] : null;
      },

      async applyMovement({ variantId, direction, qty, reason }) {
        const sb = getClient();
        if (!sb) throw new Error('Supabase not configured');

        const idempotencyKey = 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

        const { data, error } = await sb.rpc('apply_stock_movement', {
          p_variant_id: variantId,
          p_direction: direction,
          p_qty: parseInt(qty, 10),
          p_reason: reason,
          p_idempotency_key: idempotencyKey
        });

        if (error) {
          if (error.message && (error.message.includes('أكبر من الرصيد') || error.code === '23514')) {
            throw new Error('قاعدة البيانات: لا يمكن صرف كمية أكبر من الرصيد المتاح بالمخزن.');
          }
          throw error;
        }

        // Auto-archive on Odoo when stock hits 0, auto-unarchive when restocked > 0
        try {
          const { data: vRow } = await sb
            .from('product_variants')
            .select('id, external_id, available_qty, is_published')
            .eq('id', variantId)
            .single();
          if (vRow && vRow.external_id && window.EnzaDB.odoo.isAvailable()) {
            const newQty = Number(vRow.available_qty || 0);
            if (newQty <= 0 && vRow.is_published !== false) {
              await window.EnzaDB.odoo.setArchive({ id: vRow.id, externalId: vRow.external_id, archived: true });
            } else if (newQty > 0 && vRow.is_published === false && direction === 'in') {
              await window.EnzaDB.odoo.setArchive({ id: vRow.id, externalId: vRow.external_id, archived: false });
            }
          }
        } catch (odooErr) {
          console.warn('[Enza] Auto-archive Odoo sync skipped:', odooErr.message);
        }

        return data;
      },

      // TWO-WAY: Update product in Supabase and trigger Odoo update
      async updateStore({ id, externalId, price, isPublished, imageUrl }) {
        const sb = getClient();
        let odooSynced = false;

        // 1. Direct native Android -> Odoo JSON-RPC (24/7, no PC needed)
        if (externalId && window.EnzaDB.odoo.isAvailable()) {
          try {
            await callNativeOdoo('updateProduct', String(externalId), JSON.stringify({
              list_price: Number(price),
              is_published: Boolean(isPublished),
              active: Boolean(isPublished)
            }));
            odooSynced = true;
          } catch (e) {
            console.warn('[Enza] Native Odoo update warning:', e.message);
          }
        }

        // 2. Fallback: Try local bridge if reachable
        if (!odooSynced) {
          try {
            const res = await fetch('http://localhost:3001/api/update-product', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                variantId: id,
                odooId: externalId,
                listPrice: price,
                isPublished: isPublished,
                image1920: imageUrl
              })
            });
            if (res.ok) {
              const json = await res.json();
              if (json.success) odooSynced = true;
            }
          } catch (e) {}
        }

        // 3. Direct Supabase update
        if (sb) {
          const payload = {
            sale_price: Number(price),
            is_published: Boolean(isPublished)
          };
          if (imageUrl) payload.image_url = imageUrl;

          const { data, error } = await sb
            .from('product_variants')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return { success: true, odooSynced, data };
        }
        return { success: true, odooSynced };
      },

      async updateBarcode({ id, externalId, barcode }) {
        const cleanBarcode = String(barcode || '').trim();
        const sb = getClient();

        // 1. Direct native Android -> Odoo JSON-RPC
        if (externalId && window.EnzaDB.odoo.isAvailable()) {
          try {
            await callNativeOdoo('updateProduct', String(externalId), JSON.stringify({ barcode: cleanBarcode }));
          } catch (e) {
            console.warn('[Enza] Native Odoo barcode sync warning:', e.message);
          }
        }

        // 2. Direct Supabase update
        if (sb) {
          const { data, error } = await sb
            .from('product_variants')
            .update({ barcode: cleanBarcode })
            .eq('id', id)
            .select()
            .single();
          if (error) throw error;
          return { success: true, data };
        }
      }
    },

    // ------------------------------------------------------------------------
    // ORDERS
    // ------------------------------------------------------------------------
    orders: {
      async list({ query = '', status = 'all', sortReverse = false } = {}) {
        const sb = getClient();
        if (!sb) throw new Error('Supabase not configured');

        let q = sb
          .from('orders')
          .select(`
            *,
            customer:customers(id, display_name, city, area, address, phone_e164),
            lines:order_lines(
              id, qty, unit_price, line_total, label_snapshot,
              variant:product_variants(id, name, brand, color_hex, color_name, sku)
            )
          `)
          .order('placed_at', { ascending: sortReverse });

        if (status && status !== 'all') {
          q = q.eq('fulfillment_status', status);
        }

        const { data, error } = await q;
        let results = (!error && data) ? data : [];

        try {
          const localOrds = JSON.parse(localStorage.getItem('enza_local_orders') || '[]');
          localOrds.forEach(lo => {
            if (!results.some(r => String(r.id) === String(lo.id) || r.display_number === lo.display_number)) {
              results.unshift(lo);
            }
          });
        } catch (e) {}

        if (query && query.trim()) {
          const lower = query.trim().toLowerCase();
          results = results.filter(o =>
            (o.display_number || '').toLowerCase().includes(lower) ||
            (o.customer?.display_name || '').toLowerCase().includes(lower) ||
            (o.customer?.city || '').toLowerCase().includes(lower)
          );
        }

        return results;
      },

      async getById(id) {
        const sb = getClient();
        if (!sb) throw new Error('Supabase not configured');
        const { data, error } = await sb
          .from('orders')
          .select(`
            *,
            customer:customers(*),
            lines:order_lines(
              id, qty, unit_price, line_total, label_snapshot,
              variant:product_variants(*)
            )
          `)
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      },

      async updateFulfillmentStatus(orderId, newStatus) {
        const sb = getClient();
        if (!sb) throw new Error('Supabase not configured');
        const { data, error } = await sb
          .from('orders')
          .update({ fulfillment_status: newStatus })
          .eq('id', orderId)
          .select()
          .single();
        if (error) throw error;
        return data;
      },

      async updateOperationalData({ orderId, status, paidAmount, remainingAmount, waybillImageUrl, paymentProofUrl }) {
        const sb = getClient();
        if (!sb) throw new Error('Supabase not configured');

        const payload = {};
        if (status) payload.fulfillment_status = status;
        if (paidAmount !== undefined && paidAmount !== null) payload.paid_amount = Number(paidAmount);
        if (remainingAmount !== undefined && remainingAmount !== null) payload.remaining_amount = Number(remainingAmount);
        if (waybillImageUrl) payload.waybill_image_url = waybillImageUrl;
        if (paymentProofUrl) payload.payment_proof_url = paymentProofUrl;

        try {
          const { data, error } = await sb
            .from('orders')
            .update(payload)
            .eq('id', orderId)
            .select()
            .single();

          if (error) {
            // Column 42703 missing: update only status and save ops in localStorage
            if (error.code === '42703' && status) {
              await sb.from('orders').update({ fulfillment_status: status }).eq('id', orderId);
            }
            try {
              const localStore = JSON.parse(localStorage.getItem('enza_order_ops') || '{}');
              localStore[orderId] = {
                ...(localStore[orderId] || {}),
                paid_amount: paidAmount !== undefined ? Number(paidAmount) : localStore[orderId]?.paid_amount,
                remaining_amount: remainingAmount !== undefined ? Number(remainingAmount) : localStore[orderId]?.remaining_amount,
                waybill_image_url: waybillImageUrl || localStore[orderId]?.waybill_image_url,
                payment_proof_url: paymentProofUrl || localStore[orderId]?.payment_proof_url
              };
              localStorage.setItem('enza_order_ops', JSON.stringify(localStore));
            } catch (e) {}
            return { id: orderId, fulfillment_status: status };
          }
          return data;
        } catch (e) {
          // Graceful fallback
          if (status) {
            try { await sb.from('orders').update({ fulfillment_status: status }).eq('id', orderId); } catch(err){}
          }
          try {
            const localStore = JSON.parse(localStorage.getItem('enza_order_ops') || '{}');
            localStore[orderId] = {
              ...(localStore[orderId] || {}),
              paid_amount: paidAmount !== undefined ? Number(paidAmount) : localStore[orderId]?.paid_amount,
              remaining_amount: remainingAmount !== undefined ? Number(remainingAmount) : localStore[orderId]?.remaining_amount,
              waybill_image_url: waybillImageUrl || localStore[orderId]?.waybill_image_url,
              payment_proof_url: paymentProofUrl || localStore[orderId]?.payment_proof_url
            };
            localStorage.setItem('enza_order_ops', JSON.stringify(localStore));
          } catch(err){}
          return { id: orderId, fulfillment_status: status };
        }
      },

      async recordPayment(orderId, paidAmount, remainingAmount, paymentStatus = 'full') {
        const sb = getClient();
        try {
          const localStore = JSON.parse(localStorage.getItem('enza_order_ops') || '{}');
          localStore[orderId] = {
            ...(localStore[orderId] || {}),
            paid_amount: Number(paidAmount || 0),
            remaining_amount: Number(remainingAmount || 0),
            payment_status: paymentStatus
          };
          localStorage.setItem('enza_order_ops', JSON.stringify(localStore));

          if (sb) {
            await sb.from('orders').update({
              paid_amount: Number(paidAmount || 0),
              remaining_amount: Number(remainingAmount || 0)
            }).eq('id', orderId);
          }
        } catch (e) {}
      },

      async updateOrderShipping(orderId, shippingAmount) {
        const sb = getClient();
        try {
          const localStore = JSON.parse(localStorage.getItem('enza_order_ops') || '{}');
          localStore[orderId] = {
            ...(localStore[orderId] || {}),
            shipping_amount: Number(shippingAmount || 0)
          };
          localStorage.setItem('enza_order_ops', JSON.stringify(localStore));

          if (sb) {
            await sb.from('orders').update({
              shipping_amount: Number(shippingAmount || 0)
            }).eq('id', orderId);
          }
        } catch (e) {}
      },

      async createManualDisbursement({ customerId, items = [], totalAmount, paidAmount, remainingAmount, shippingAmount = 0, waybillImageUrl = null }) {
        const sb = getClient();
        if (!sb) throw new Error('Supabase not configured');
        const displayNum = 'EN-DIS-' + Math.floor(1000 + Math.random() * 9000);

        const orderPayload = {
          display_number: displayNum,
          customer_id: customerId,
          placed_at: new Date().toISOString(),
          fulfillment_status: waybillImageUrl ? 'shipped' : 'preparing',
          payment_method: 'صرف يدوي / مباشر',
          shipping_amount: Number(shippingAmount || 0),
          total_amount: Number(totalAmount),
          currency: 'EGP'
        };

        let createdOrder = null;
        try {
          const fullPayload = {
            ...orderPayload,
            paid_amount: Number(paidAmount || 0),
            remaining_amount: Number(remainingAmount || 0),
            ...(waybillImageUrl ? { waybill_image_url: waybillImageUrl } : {})
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
          } else if (error) {
            throw error;
          } else {
            createdOrder = data;
          }
        } catch (e) {
          const { data: fbData } = await sb.from('orders').insert([orderPayload]).select().single();
          createdOrder = fbData || {
            id: 'ord_' + Date.now(),
            ...orderPayload,
            paid_amount: Number(paidAmount || 0),
            remaining_amount: Number(remainingAmount || 0),
            ...(waybillImageUrl ? { waybill_image_url: waybillImageUrl } : {}),
            lines: items.map(it => ({
              qty: Number(it.qty || 1),
              unit_price: Number(it.unitPrice || 0),
              line_total: Number(it.unitPrice || 0) * Number(it.qty || 1),
              label_snapshot: it.name || 'بكرة فيلامينت'
            }))
          };
          if (!fbData) {
            try {
              const localOrds = JSON.parse(localStorage.getItem('enza_local_orders') || '[]');
              localOrds.unshift(createdOrder);
              localStorage.setItem('enza_local_orders', JSON.stringify(localOrds));
            } catch (err) {}
          }
        }

        if (createdOrder) {
          try {
            const localStore = JSON.parse(localStorage.getItem('enza_order_ops') || '{}');
            localStore[createdOrder.id] = {
              paid_amount: Number(paidAmount || 0),
              remaining_amount: Number(remainingAmount || 0),
              ...(waybillImageUrl ? { waybill_image_url: waybillImageUrl } : {})
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

    // ------------------------------------------------------------------------
    // CUSTODIAN (بيان العهدة والمخزن الشخصي)
    // ------------------------------------------------------------------------
    custodian: {
      async recordMovement({ variantId = null, type, qty = 0, cashCollected = 0, cashRemaining = 0, relatedOrderId = null, notes = '' }) {
        const movement = {
          id: 'cm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          variant_id: variantId,
          type: type, // 'receive_from_main', 'disburse_to_customer', 'return_to_main', 'cash_inflow'
          qty: parseInt(qty || 0, 10),
          cash_collected: Number(cashCollected || 0),
          cash_remaining: Number(cashRemaining || 0),
          related_order_id: relatedOrderId,
          notes: notes || '',
          created_at: new Date().toISOString()
        };

        const sb = getClient();
        if (sb) {
          try {
            await sb.from('custodian_movements').insert([movement]);
          } catch (e) {}
        }

        try {
          const history = JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]');
          history.unshift(movement);
          localStorage.setItem('enza_custodian_movements', JSON.stringify(history.slice(0, 100)));
        } catch (e) {}

        return movement;
      },

      async getHistory() {
        const sb = getClient();
        if (sb) {
          try {
            const { data } = await sb.from('custodian_movements').select('*').order('created_at', { ascending: false });
            if (data && data.length > 0) return data;
          } catch (e) {}
        }
        return JSON.parse(localStorage.getItem('enza_custodian_movements') || '[]');
      }
    },

    // ------------------------------------------------------------------------
    // CUSTOMERS
    // ------------------------------------------------------------------------
    customers: {
      async create({ displayName, phone, city, address }) {
        const sb = getClient();
        const colorPalette = ['red', 'green', 'blue', 'purple', 'ink'];
        const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        const payload = {
          display_name: displayName.trim(),
          phone_e164: phone?.trim() || '+201000000000',
          city: city?.trim() || 'القاهرة',
          area: city?.trim() || 'القاهرة',
          address: address?.trim() || 'عنوان العميل',
          color: randomColor
        };

        if (sb) {
          try {
            const { data, error } = await sb
              .from('customers')
              .insert([payload])
              .select()
              .single();
            if (!error && data) return data;
          } catch (e) {}
        }

        const localCustomer = {
          id: 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          ...payload,
          created_at: new Date().toISOString()
        };
        try {
          const list = JSON.parse(localStorage.getItem('enza_local_customers') || '[]');
          list.unshift(localCustomer);
          localStorage.setItem('enza_local_customers', JSON.stringify(list));
        } catch (e) {}
        return localCustomer;
      },
      async list({ query = '' } = {}) {
        const sb = getClient();
        if (!sb) throw new Error('Supabase not configured');

        let results = [];
        try {
          const { data, error } = await sb
            .from('customers')
            .select(`
              *,
              orders:orders(id, display_number, total_amount, fulfillment_status, placed_at)
            `)
            .order('display_name', { ascending: true });
          if (!error && data) results = data;
        } catch (e) {}

        try {
          const localList = JSON.parse(localStorage.getItem('enza_local_customers') || '[]');
          localList.forEach(lc => {
            if (!results.some(r => String(r.id) === String(lc.id) || (r.phone_e164 && r.phone_e164 === lc.phone_e164 && r.display_name === lc.display_name))) {
              results.unshift(lc);
            }
          });
        } catch (e) {}

        try {
          const deletedIds = JSON.parse(localStorage.getItem('enza_deleted_customers') || '[]');
          if (deletedIds.length > 0) {
            results = results.filter(c => !deletedIds.includes(String(c.id)));
          }
          const overrides = JSON.parse(localStorage.getItem('enza_customer_overrides') || '{}');
          results = results.map(c => overrides[c.id] ? { ...c, ...overrides[c.id] } : c);
        } catch (e) {}

        if (query && query.trim()) {
          const lower = query.trim().toLowerCase();
          results = results.filter(c =>
            (c.display_name || '').toLowerCase().includes(lower) ||
            (c.city || '').toLowerCase().includes(lower) ||
            (c.area || '').toLowerCase().includes(lower) ||
            (c.phone_e164 || '').includes(lower)
          );
        }

        return results;
      },

      async update(id, { displayName, phone, city, address }) {
        const sb = getClient();
        const updates = {
          display_name: displayName.trim(),
          phone_e164: phone?.trim() || '',
          city: city?.trim() || 'القاهرة',
          area: city?.trim() || 'القاهرة',
          address: address?.trim() || ''
        };

        if (sb && !String(id).startsWith('cust_')) {
          try {
            await sb.from('customers').update(updates).eq('id', id);
          } catch (e) {}
        }

        try {
          const localList = JSON.parse(localStorage.getItem('enza_local_customers') || '[]');
          const updatedLocal = localList.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c);
          localStorage.setItem('enza_local_customers', JSON.stringify(updatedLocal));

          const overrides = JSON.parse(localStorage.getItem('enza_customer_overrides') || '{}');
          overrides[id] = updates;
          localStorage.setItem('enza_customer_overrides', JSON.stringify(overrides));
        } catch (e) {}

        return { id, ...updates };
      },

      async delete(id) {
        const sb = getClient();
        if (sb && !String(id).startsWith('cust_')) {
          try {
            await sb.from('customers').delete().eq('id', id);
          } catch (e) {}
        }

        try {
          const localList = JSON.parse(localStorage.getItem('enza_local_customers') || '[]');
          localStorage.setItem('enza_local_customers', JSON.stringify(localList.filter(c => String(c.id) !== String(id))));

          const deletedIds = JSON.parse(localStorage.getItem('enza_deleted_customers') || '[]');
          if (!deletedIds.includes(String(id))) {
            deletedIds.push(String(id));
            localStorage.setItem('enza_deleted_customers', JSON.stringify(deletedIds));
          }
        } catch (e) {}

        return true;
      },

      async getById(id) {
        const sb = getClient();
        if (!sb) throw new Error('Supabase not configured');
        const { data, error } = await sb
          .from('customers')
          .select(`
            *,
            orders:orders(
              id, display_number, total_amount, fulfillment_status, placed_at, shipping_amount,
              lines:order_lines(qty, line_total, label_snapshot)
            )
          `)
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      }
    }
  };

  window.EnzaDB = EnzaDB;
})(window);
