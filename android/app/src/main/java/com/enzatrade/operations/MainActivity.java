package com.enzatrade.operations;

import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Rect;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
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
        public boolean sharePdf(String base64PngDataUrl, String fileName, String title) {
            try {
                String clean = base64PngDataUrl;
                int comma = clean.indexOf(',');
                if (comma >= 0) clean = clean.substring(comma + 1);
                byte[] imgBytes = Base64.decode(clean, Base64.DEFAULT);
                Bitmap bmp = BitmapFactory.decodeByteArray(imgBytes, 0, imgBytes.length);
                if (bmp == null) throw new Exception("Invalid invoice image");

                int pageW = 595; // A4 width in PostScript points (72 dpi)
                int pageH = Math.max(842, (int) Math.ceil((double) bmp.getHeight() * pageW / bmp.getWidth()));

                PdfDocument pdf = new PdfDocument();
                PdfDocument.PageInfo pageInfo = new PdfDocument.PageInfo.Builder(pageW, pageH, 1).create();
                PdfDocument.Page page = pdf.startPage(pageInfo);
                Canvas canvas = page.getCanvas();
                canvas.drawBitmap(bmp, null, new Rect(0, 0, pageW, (int) Math.round((double) bmp.getHeight() * pageW / bmp.getWidth())), null);
                pdf.finishPage(page);

                String safeName = (fileName != null && !fileName.trim().isEmpty()) ? fileName.trim() : "ENZA-Invoice.pdf";
                if (!safeName.toLowerCase().endsWith(".pdf")) safeName += ".pdf";

                File cachePdf = new File(getCacheDir(), safeName);
                try (FileOutputStream fos = new FileOutputStream(cachePdf)) {
                    pdf.writeTo(fos);
                }
                pdf.close();
                bmp.recycle();

                // Also save permanent copy to Downloads/Enza-Invoices on Android 10+
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.Downloads.DISPLAY_NAME, safeName);
                        cv.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
                        cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Enza-Invoices");
                        Uri dlUri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                        if (dlUri != null) {
                            try (InputStream in = new FileInputStream(cachePdf);
                                 OutputStream out = getContentResolver().openOutputStream(dlUri)) {
                                if (out != null) {
                                    byte[] buf = new byte[8192];
                                    int n;
                                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                                }
                            }
                        }
                    }
                } catch (Exception ignored) {}

                Uri uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", cachePdf);
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType("application/pdf");
                share.putExtra(Intent.EXTRA_STREAM, uri);
                if (title != null && !title.isEmpty()) {
                    share.putExtra(Intent.EXTRA_SUBJECT, title);
                    share.putExtra(Intent.EXTRA_TEXT, title);
                }
                share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, "تم حفظ ملف PDF في التنزيلات — اختر واتساب للإرسال", Toast.LENGTH_SHORT).show();
                    startActivity(Intent.createChooser(share, "مشاركة الفاتورة PDF"));
                });
                return true;
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "تعذر إنشاء ملف PDF للفاتورة", Toast.LENGTH_SHORT).show());
                return false;
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
