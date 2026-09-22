package com.radiancepolymers.productionreport;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.widget.Toast;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "NativeDownloader")
public class NativeDownloaderPlugin extends Plugin {

    @PluginMethod
    public void saveExcelFile(PluginCall call) {
        String base64Data = call.getString("base64Data");
        String filename = call.getString("filename");

        if (filename == null || filename.trim().isEmpty()) {
            filename = "Radiance_Part_Master_Template.xlsx";
        }

        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("Empty file content");
            return;
        }

        boolean saved = false;
        String finalPath = "Downloads/" + filename;

        try {
            int commaIndex = base64Data.indexOf(",");
            String cleanBase64 = commaIndex >= 0 ? base64Data.substring(commaIndex + 1) : base64Data;
            byte[] decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

            // Android 10+ (API 29+): MediaStore.Downloads
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                    Uri uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        try (OutputStream os = getContext().getContentResolver().openOutputStream(uri)) {
                            if (os != null) {
                                os.write(decodedBytes);
                                os.flush();
                                saved = true;
                            }
                        }
                    }
                } catch (Exception me) {
                    // Fall through to file fallback
                }
            }

            // Fallback for legacy or if MediaStore insert returned null
            if (!saved) {
                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null || !dir.exists()) {
                    dir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                }
                if (dir == null) {
                    dir = getContext().getCacheDir();
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
                final String displayFilename = filename;
                getActivity().runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(getContext(), 
                            "Template downloaded successfully\nLocation: Downloads/" + displayFilename, 
                            Toast.LENGTH_LONG).show();
                    }
                });

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("location", finalPath);
                ret.put("path", finalPath);
                call.resolve(ret);
            } else {
                call.reject("Failed to write file to storage");
            }
        } catch (Exception e) {
            call.reject("Error saving file: " + e.getMessage());
        }
    }
}
