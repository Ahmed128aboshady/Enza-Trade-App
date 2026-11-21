package com.enzatrade.operations;

import android.app.Activity;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Direct Android -> Odoo JSON-RPC bridge for real-time archive/unarchive and product edits. */
public class OdooBridge {
    private final Activity activity;
    private final WebView webView;
    private volatile Integer cachedUid = null;

    public OdooBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    @JavascriptInterface
    public boolean isConfigured() {
        return !BuildConfig.ODOO_URL.isEmpty()
                && !BuildConfig.ODOO_DB.isEmpty()
                && !BuildConfig.ODOO_EMAIL.isEmpty()
                && !BuildConfig.ODOO_PASSWORD.isEmpty();
    }

    @JavascriptInterface
    public void setProductArchive(final String odooVariantId, final boolean archived, final String callbackId) {
        new Thread(() -> {
            try {
                if (!isConfigured()) {
                    emitCallback(callbackId, false, "إعدادات Odoo غير مكتملة في التطبيق");
                    return;
                }
                long recId = Long.parseLong(odooVariantId.trim());
                int uid = authenticate();

                JSONObject values = new JSONObject();
                values.put("active", !archived);

                JSONObject ctx = new JSONObject();
                ctx.put("active_test", false);
                JSONObject kwargs = new JSONObject();
                kwargs.put("context", ctx);

                JSONArray ids = new JSONArray();
                ids.put(recId);
                JSONArray methodArgs = new JSONArray();
                methodArgs.put(ids);
                methodArgs.put(values);

                JSONArray rpcArgs = new JSONArray();
                rpcArgs.put(BuildConfig.ODOO_DB);
                rpcArgs.put(uid);
                rpcArgs.put(BuildConfig.ODOO_PASSWORD);
                rpcArgs.put("product.product");
                rpcArgs.put("write");
                rpcArgs.put(methodArgs);
                rpcArgs.put(kwargs);

                callJsonRpc("object", "execute_kw", rpcArgs);
                emitCallback(callbackId, true, archived ? "تمت الأرشفة على Odoo بنجاح" : "تم إلغاء الأرشفة على Odoo بنجاح");
            } catch (Exception e) {
                cachedUid = null;
                emitCallback(callbackId, false, e.getMessage() != null ? e.getMessage() : "تعذر الاتصال بـ Odoo");
            }
        }).start();
    }

    @JavascriptInterface
    public void updateProduct(final String odooVariantId, final String jsonPayload, final String callbackId) {
        new Thread(() -> {
            try {
                if (!isConfigured()) {
                    emitCallback(callbackId, false, "إعدادات Odoo غير مكتملة في التطبيق");
                    return;
                }
                long recId = Long.parseLong(odooVariantId.trim());
                JSONObject input = new JSONObject(jsonPayload);
                JSONObject values = new JSONObject();
                if (input.has("active")) values.put("active", input.getBoolean("active"));
                if (input.has("is_published")) values.put("is_published", input.getBoolean("is_published"));
                if (input.has("list_price") && !input.isNull("list_price")) {
                    values.put("list_price", input.getDouble("list_price"));
                }
                if (input.has("barcode") && !input.isNull("barcode")) {
                    String bc = input.optString("barcode", "").trim();
                    if (!bc.isEmpty()) values.put("barcode", bc);
                }
                if (values.length() == 0) {
                    emitCallback(callbackId, true, "لا توجد تعديلات لإرسالها");
                    return;
                }

                int uid = authenticate();
                JSONObject ctx = new JSONObject();
                ctx.put("active_test", false);
                JSONObject kwargs = new JSONObject();
                kwargs.put("context", ctx);

                JSONArray ids = new JSONArray();
                ids.put(recId);
                JSONArray methodArgs = new JSONArray();
                methodArgs.put(ids);
                methodArgs.put(values);

                JSONArray rpcArgs = new JSONArray();
                rpcArgs.put(BuildConfig.ODOO_DB);
                rpcArgs.put(uid);
                rpcArgs.put(BuildConfig.ODOO_PASSWORD);
                rpcArgs.put("product.product");
                rpcArgs.put("write");
                rpcArgs.put(methodArgs);
                rpcArgs.put(kwargs);

                callJsonRpc("object", "execute_kw", rpcArgs);
                emitCallback(callbackId, true, "تمت مزامنة التعديل مع Odoo بنجاح");
            } catch (Exception e) {
                cachedUid = null;
                emitCallback(callbackId, false, e.getMessage() != null ? e.getMessage() : "تعذر مزامنة التعديل مع Odoo");
            }
        }).start();
    }

    private int authenticate() throws Exception {
        if (cachedUid != null) return cachedUid;
        JSONArray args = new JSONArray();
        args.put(BuildConfig.ODOO_DB);
        args.put(BuildConfig.ODOO_EMAIL);
        args.put(BuildConfig.ODOO_PASSWORD);
        args.put(new JSONObject());
        Object result = callJsonRpc("common", "authenticate", args);
        if (result instanceof Number && ((Number) result).intValue() > 0) {
            cachedUid = ((Number) result).intValue();
            return cachedUid;
        }
        throw new Exception("فشل تسجيل الدخول في Odoo");
    }

    private Object callJsonRpc(String service, String method, JSONArray args) throws Exception {
        String base = BuildConfig.ODOO_URL.replaceAll("/+$", "");
        HttpURLConnection conn = (HttpURLConnection) new URL(base + "/jsonrpc").openConnection();
        conn.setRequestMethod("POST");
        conn.setConnectTimeout(12000);
        conn.setReadTimeout(15000);
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");

        JSONObject params = new JSONObject();
        params.put("service", service);
        params.put("method", method);
        params.put("args", args);

        JSONObject payload = new JSONObject();
        payload.put("jsonrpc", "2.0");
        payload.put("method", "call");
        payload.put("params", params);
        payload.put("id", (int) (System.currentTimeMillis() % 100000));

        byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(bytes);
        }

        int code = conn.getResponseCode();
        BufferedReader br = new BufferedReader(new InputStreamReader(
                code >= 400 ? conn.getErrorStream() : conn.getInputStream(), StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) sb.append(line);
        br.close();

        if (code >= 400) throw new Exception("Odoo HTTP " + code);
        JSONObject resp = new JSONObject(sb.toString());
        if (resp.has("error") && !resp.isNull("error")) {
            JSONObject err = resp.getJSONObject("error");
            String msg = err.optJSONObject("data") != null
                    ? err.getJSONObject("data").optString("message", err.optString("message", "Odoo Error"))
                    : err.optString("message", "Odoo Error");
            throw new Exception(msg);
        }
        return resp.opt("result");
    }

    private void emitCallback(String callbackId, boolean ok, String message) {
        if (callbackId == null || callbackId.isEmpty() || webView == null) return;
        String safeId = JSONObject.quote(callbackId);
        String safeMsg = JSONObject.quote(message != null ? message : "");
        String js = "window.__enzaOdooCallback && window.__enzaOdooCallback(" + safeId + "," + ok + "," + safeMsg + ");";
        activity.runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }
}
