package com.enzatrade.operations;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.addJavascriptInterface(new UpdaterBridge(), "EnzaUpdater");
            webView.addJavascriptInterface(new OdooBridge(this, webView), "EnzaOdoo");
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
}
