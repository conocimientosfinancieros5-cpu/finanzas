# Finanzas

PWA estática mínima en español, sin build ni dependencias.

En Cloudflare Workers Builds, conectar el repositorio de GitHub, dejar vacío el build command y usar `npx wrangler deploy` como deploy command. El Worker sirve solo los static assets de `public/`, según `wrangler.jsonc`. Publicar en la raíz del dominio; HTTPS permite registrar el service worker.

El índice usa la red primero y recurre al caché sin conexión. Los demás recursos estáticos usan el caché. Al cambiar recursos, incrementar la versión `CACHE` en `public/sw.js`.

`robots.txt` y `_headers` solicitan que los buscadores no indexen el sitio; no restringen el acceso público. No incluir secretos en `public/`.
