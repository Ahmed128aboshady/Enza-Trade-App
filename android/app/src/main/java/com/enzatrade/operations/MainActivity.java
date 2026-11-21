package com.enzatrade.operations;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new UpdaterBridge(), "EnzaUpdater");
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
