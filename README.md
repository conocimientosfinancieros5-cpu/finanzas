# Finanzas

PWA estática mínima en español, sin build ni dependencias.

En Cloudflare Pages, dejar vacío el comando de build y usar `public` como directorio de salida. Publicar en la raíz del dominio; HTTPS permite registrar el service worker.

El índice usa la red primero y recurre al caché sin conexión. Los demás recursos estáticos usan el caché. Al cambiar recursos, incrementar la versión `CACHE` en `public/sw.js`.

`robots.txt` y `_headers` solicitan que los buscadores no indexen el sitio; no restringen el acceso público. No incluir secretos en `public/`.
