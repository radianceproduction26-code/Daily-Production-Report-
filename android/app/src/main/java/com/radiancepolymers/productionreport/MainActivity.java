package com.radiancepolymers.productionreport;

import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeDownloaderPlugin.class);
        super.onCreate(savedInstanceState);

        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // Add direct JavascriptInterface for guaranteed instant access in WebView
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public String saveExcelFile(String base64Data, String filename) {
                        boolean ok = saveExcelToDownloads(base64Data, filename);
                        return "{\"success\":" + ok + ",\"path\":\"Downloads/" + filename + "\"}";
                    }
                }, "AndroidExcelDownloader");

                // Intercept WebView downloads safely - NEVER launch unhandled Intent
                webView.setDownloadListener(new DownloadListener() {
                    @Override
                    public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                        try {
                            if (url != null && (url.startsWith("data:") || url.contains("base64,"))) {
                                saveExcelToDownloads(url, "Radiance_Part_Master_Template.xlsx");
                            } else if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                                if (intent.resolveActivity(getPackageManager()) != null) {
                                    startActivity(intent);
                                }
                            }
                            // Never launch an intent on blob: URLs or internal schemes to avoid
                            // "No activity found to handle the intent"
                        } catch (Exception ignored) {
                        }
                    }
                });
            }
        } catch (Exception e) {
            // Ignore if webview not yet attached
        }
    }

    public boolean saveExcelToDownloads(String base64Data, String filename) {
        if (filename == null || filename.trim().isEmpty()) {
            filename = "Radiance_Part_Master_Template.xlsx";
        }
        if (base64Data == null || base64Data.trim().isEmpty()) {
            return false;
        }

        try {
            int commaIndex = base64Data.indexOf(",");
            String cleanBase64 = commaIndex >= 0 ? base64Data.substring(commaIndex + 1) : base64Data;
            byte[] decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

            boolean saved = false;

            // Android 10+ (API 29+): MediaStore to standard Downloads
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                            if (os != null) {
                                os.write(decodedBytes);
                                os.flush();
                                saved = true;
                            }
                        }
                    }
                } catch (Exception ignored) {
                }
            }

            if (!saved) {
                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null || !dir.exists()) {
                    dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                }
                if (dir == null) {
                    dir = getCacheDir();
                }
                if (!dir.exists()) {
                    dir.mkdirs();
                }
                File outFile = new File(dir, filename);
                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    fos.write(decodedBytes);
                    fos.flush();
                    saved = true;
                }
            }

            if (saved) {
                final String fName = filename;
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(MainActivity.this, 
                            "Template downloaded successfully\nLocation: Downloads/" + fName, 
                            Toast.LENGTH_LONG).show();
                    }
                });
                return true;
            }
            return false;
        } catch (Exception e) {
            final String err = e.getMessage();
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, "Download error: " + err, Toast.LENGTH_SHORT).show();
                }
            });
            return false;
        }
    }
}
