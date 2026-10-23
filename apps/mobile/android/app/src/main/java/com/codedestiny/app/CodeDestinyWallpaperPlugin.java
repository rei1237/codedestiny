package com.codedestiny.app;

import android.app.Activity;
import android.app.WallpaperManager;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Original PNG export only. No storage/gallery read permission and no automatic wallpaper change. */
@CapacitorPlugin(name = "CodeDestinyWallpaper")
public class CodeDestinyWallpaperPlugin extends Plugin {
    private final Map<String, File> pendingSaves = new ConcurrentHashMap<>();

    @PluginMethod
    public void exportImage(PluginCall call) {
        File file = null;
        try {
            String action = call.getString("action", "");
            String name = call.getString("fileName", "");
            String encoded = call.getString("base64", "");
            if (!("save".equals(action) || "share".equals(action) || "wallpaper".equals(action)) ||
                !name.matches("[a-z0-9-]{1,100}\\.png") || encoded.length() > 22369624) {
                call.reject("Invalid image export", "INVALID_IMAGE"); return;
            }
            byte[] bytes = Base64.decode(encoded, Base64.NO_WRAP);
            if (bytes.length < 33 || bytes.length > 16 * 1024 * 1024 ||
                bytes[0] != (byte) 137 || bytes[1] != 80 || bytes[2] != 78 || bytes[3] != 71) {
                call.reject("Invalid PNG", "INVALID_IMAGE"); return;
            }
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(bytes, 0, bytes.length, bounds);
            if (!"image/png".equals(bounds.outMimeType) || bounds.outWidth < 1440 || bounds.outWidth > 4096 ||
                bounds.outHeight < 2560 || bounds.outHeight > 8192 ||
                (long) bounds.outWidth * bounds.outHeight > 25000000) {
                call.reject("Invalid image dimensions", "INVALID_IMAGE"); return;
            }
            File directory = new File(getContext().getCacheDir(), "talisman-exports");
            if (!directory.isDirectory() && !directory.mkdirs()) throw new java.io.IOException("Export directory unavailable");
            // Only this plugin's old cache files are removed. Never touch user-selected saved files.
            File[] oldFiles = directory.listFiles();
            if (oldFiles != null) for (File old : oldFiles) {
                if (old.isFile() && old.lastModified() < System.currentTimeMillis() - 86400000L) old.delete();
            }
            file = File.createTempFile("talisman-", ".png", directory);
            try (FileOutputStream output = new FileOutputStream(file)) { output.write(bytes); }
            if ("save".equals(action)) {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/png");
                intent.putExtra(Intent.EXTRA_TITLE, name);
                pendingSaves.put(call.getCallbackId(), file);
                startActivityForResult(call, intent, "saveResult");
                return;
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent intent;
            if ("wallpaper".equals(action)) {
                intent = WallpaperManager.getInstance(getContext()).getCropAndSetWallpaperIntent(uri);
            } else {
                intent = new Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_STREAM, uri);
            }
            intent.setClipData(ClipData.newRawUri("Wallpaper", uri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity("share".equals(action) ? Intent.createChooser(intent, null) : intent);
            // Android chooser completion is not proof that sharing or wallpaper application finished.
            resolveStatus(call, "opened");
        } catch (Exception error) {
            pendingSaves.remove(call.getCallbackId());
            if (file != null) file.delete();
            call.reject("Could not open image export. Save the original and use system wallpaper settings.", "IMAGE_EXPORT_FAILED");
        }
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        File file = pendingSaves.remove(call.getCallbackId());
        try {
            if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
                resolveStatus(call, "cancelled"); return;
            }
            if (file == null) throw new java.io.IOException("Original no longer available");
            try (FileInputStream input = new FileInputStream(file);
                 OutputStream output = getContext().getContentResolver().openOutputStream(result.getData().getData(), "w")) {
                if (output == null) throw new java.io.IOException("Destination unavailable");
                byte[] buffer = new byte[16384];
                int read;
                while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
            }
            resolveStatus(call, "saved");
        } catch (Exception error) {
            call.reject("Could not save the original", "IMAGE_SAVE_FAILED");
        } finally {
            if (file != null) file.delete();
        }
    }

    private void resolveStatus(PluginCall call, String status) {
        JSObject response = new JSObject();
        response.put("status", status);
        call.resolve(response);
    }
}
