package com.codedestiny.app;

import android.content.res.AssetManager;

import com.getcapacitor.Bridge;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * 앱 번들에서 뺀 기능 소개 그림 경로 → 기능마다 남긴 한 장.
 *
 * 표는 scripts/build-mobile-app.mjs 의 consolidateIntroductionImages 가 public/app-image-aliases.tsv 로 만든다.
 * srcset 이나 `${base}-320.webp` 처럼 조립되는 경로도 있어 웹 코드 대신 여기서 돌려준다.
 * 두 폴더 요청에서만 처음 한 번 읽는다 — 앱 시작 경로에는 비용이 없다.
 */
final class AppImageAliases {
    static final String FILE = "app-image-aliases.tsv";
    private static final String[] PREFIXES = { "/images/service-introductions/", "/feature-details/assets/" };
    private static volatile Map<String, String> table;

    private AppImageAliases() {}

    static boolean covers(String path) {
        if (path == null) return false;
        for (String prefix : PREFIXES) if (path.startsWith(prefix)) return true;
        return false;
    }

    static Map<String, String> parse(String text) {
        Map<String, String> out = new HashMap<>();
        if (text == null) return out;
        for (String line : text.split("\n")) {
            int tab = line.indexOf('\t');
            if (tab <= 0) continue;
            String from = line.substring(0, tab).trim();
            String to = line.substring(tab + 1).trim();
            if (covers(from) && to.startsWith("/")) out.put(from, to);
        }
        return out;
    }

    static String find(Map<String, String> aliases, String path) {
        return covers(path) ? aliases.get(path) : null;
    }

    static String lookup(AssetManager assets, String path) {
        if (!covers(path)) return null;
        Map<String, String> current = table;
        if (current == null) {
            synchronized (AppImageAliases.class) {
                if (table == null) table = load(assets);
                current = table;
            }
        }
        return find(current, path);
    }

    private static Map<String, String> load(AssetManager assets) {
        try (InputStream in = assets.open(Bridge.DEFAULT_WEB_ASSET_DIR + "/" + FILE)) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] buffer = new byte[16384];
            for (int n; (n = in.read(buffer)) > 0; ) bytes.write(buffer, 0, n);
            return parse(new String(bytes.toByteArray(), StandardCharsets.UTF_8));
        } catch (IOException e) {
            return Collections.emptyMap();
        }
    }
}
