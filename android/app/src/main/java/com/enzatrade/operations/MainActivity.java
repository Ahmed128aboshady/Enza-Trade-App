package com.enzatrade.operations;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.addJavascriptInterface(new UpdaterBridge(), "EnzaUpdater");
            webView.addJavascriptInterface(new OdooBridge(this, webView), "EnzaOdoo");
            webView.addJavascriptInterface(new ShareBridge(), "EnzaShare");
        }
        Updater.check(this, false);
    }

    @Override
    public void onResume() {
        super.onResume();
        Updater.resumePendingInstall(this);
    }

    private class UpdaterBridge {
        @JavascriptInterface
        public void checkForUpdates() {
            runOnUiThread(() -> Updater.check(MainActivity.this, true));
        }

        @JavascriptInterface
        public String getVersion() {
            return Updater.currentVersion(MainActivity.this);
        }
    }

    private class ShareBridge {
        @JavascriptInterface
        public String fetchImageDataUrl(String imageUrl) {
            try {
                if (imageUrl == null || !imageUrl.startsWith("http")) return "";
                HttpURLConnection conn = (HttpURLConnection) new URL(imageUrl).openConnection();
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(8000);
                conn.setInstanceFollowRedirects(true);
                conn.setRequestProperty("User-Agent", "Enza-Trade-Android");
                if (conn.getResponseCode() != 200) return "";
                String ct = conn.getContentType();
                if (ct == null || !ct.startsWith("image/")) ct = "image/png";
                int semi = ct.indexOf(';');
                if (semi > 0) ct = ct.substring(0, semi).trim();
                try (InputStream in = conn.getInputStream();
                     ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        baos.write(buf, 0, n);
                        if (baos.size() > 2 * 1024 * 1024) return "";
                    }
                    String b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
                    return "data:" + ct + ";base64," + b64;
                }
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public boolean shareImage(String base64DataUrl, String fileName, String title) {
            try {
                String clean = base64DataUrl;
                int comma = clean.indexOf(',');
                if (comma >= 0) clean = clean.substring(comma + 1);
                byte[] bytes = Base64.decode(clean, Base64.DEFAULT);
                String safeName = (fileName != null && !fileName.trim().isEmpty()) ? fileName.trim() : "enza-invoice.png";
                if (!safeName.endsWith(".png")) safeName += ".png";
                File outFile = new File(getCacheDir(), safeName);
                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    fos.write(bytes);
                }
                Uri uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", outFile);
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType("image/png");
                share.putExtra(Intent.EXTRA_STREAM, uri);
                if (title != null && !title.isEmpty()) {
                    share.putExtra(Intent.EXTRA_SUBJECT, title);
                    share.putExtra(Intent.EXTRA_TEXT, title);
                }
                share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                runOnUiThread(() -> startActivity(Intent.createChooser(share, "مشاركة الفاتورة")));
                return true;
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "تعذرت مشاركة صورة الفاتورة", Toast.LENGTH_SHORT).show());
                return false;
            }
        }
    }
}
