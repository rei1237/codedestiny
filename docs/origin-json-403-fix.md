# JSON 403 Origin Server Fix Guide

This guide addresses 403 Forbidden on static JSON files such as `/manifest.json` and `/status.json` at the origin server layer.

## 1) File existence and permissions

Run on Linux origin host:

```bash
# Adjust WEB_ROOT to your server document root.
WEB_ROOT=/var/www/code-destiny

ls -l "$WEB_ROOT/manifest.json" "$WEB_ROOT/status.json"

sudo chown www-data:www-data "$WEB_ROOT/manifest.json" "$WEB_ROOT/status.json"
sudo chmod 644 "$WEB_ROOT/manifest.json" "$WEB_ROOT/status.json"
```

Optional folder permission sanity check:

```bash
sudo chown -R www-data:www-data "$WEB_ROOT"
sudo find "$WEB_ROOT" -type d -exec chmod 755 {} \;
```

## 2) Nginx configuration (recommended)

Add this block under your site server block:

```nginx
# Allow direct access to static JSON and prevent stale 403 cache.
location ~* \.(json)$ {
    try_files $uri =404;

    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept, Authorization" always;

    if ($request_method = OPTIONS) {
        return 204;
    }

    add_header Cache-Control "public, max-age=60, must-revalidate" always;
}
```

Validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 3) Apache alternative

If Apache is used instead of Nginx, enable headers module and add:

```apache
<IfModule mod_headers.c>
  <FilesMatch "\\.json$">
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, OPTIONS"
    Header always set Access-Control-Allow-Headers "Origin, Content-Type, Accept, Authorization"
    Header always set Cache-Control "public, max-age=60, must-revalidate"
  </FilesMatch>
</IfModule>
```

## 4) About crossorigin on manifest

Use `crossorigin="anonymous"` for manifest unless credentials are explicitly required.

- `crossorigin="use-credentials"` requires credentialed CORS handling and does not combine well with wildcard `*` CORS policy.
- For same-origin manifest with open CORS policy, anonymous is safer and simpler.

## 5) Cache-busting policy in this repo

This repository now appends version query strings:

- `/manifest.json?v=1.0.1`
- `/manifest-samba.json?v=1.0.1`
- `/status.json?v=1.0.1`

When deploying the next release, bump the version suffix to force clients to bypass stale cache.