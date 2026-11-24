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

import java.io.File;
import java.io.FileOutputStream;

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
