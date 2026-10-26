# Finanzas

PWA estática en español, sin build ni dependencias. Publicar `public/` en Cloudflare Pages, sin comando de build, en la raíz del dominio y con HTTPS.

## Datos

El contrato está en `work/formato.md`. Después de agregar o modificar capítulos, ejecutar desde la raíz:

```sh
node tools/validar.mjs
```

Valida todos los `public/data/cap-*.json`, incluidos IDs únicos globales, y regenera `public/data/capitulos.json` usando los números y títulos de `work/capitulos.json`. Un archivo ausente tiene total 0. Los errores se muestran por archivo y el proceso termina con código 1; corregirlos antes de publicar.

## Uso y progreso

Cada ronda muestra primero las preguntas nuevas, luego las que tuvieron un último resultado incorrecto y finalmente el resto. Las opciones se mezclan manteniendo sus explicaciones. «Falladas» usa el último resultado. El porcentaje de aciertos es aciertos / intentos; «respondidas» cuenta preguntas distintas. El progreso queda en localStorage de ese dispositivo; el reinicio confirmado afecta solo al capítulo elegido. Si el navegador impide guardar, la app avisa y permite practicar durante la sesión.

El service worker usa network-first para la portada y `data/`, con caché como respaldo sin conexión. Los capítulos consultados quedan disponibles offline; hace falta abrir la app con conexión al menos una vez. Los demás recursos usan cache-first. No guarda respuestas redirigidas y utiliza `/` para la portada. Incrementar `CACHE` en `public/sw.js` al cambiar recursos estáticos; una versión nueva puede requerir cerrar las ventanas anteriores de la app y volver a abrirla.

## Prueba aislada

```sh
node tools/probar.mjs
node tools/demo-server.mjs
```

La prueba genera ejemplos exclusivamente en `work/demo/`, verifica el validador y ejercita la app con un DOM de prueba y almacenamiento simulado. El servidor sirve la app en `http://localhost:4173`, sustituyendo solo los datos por los de demo (no modifica los capítulos reales). Detener con Ctrl+C. No compartir este origen con producción si se quiere conservar separado el progreso.

`robots.txt` y `_headers` solicitan no indexar el sitio; no restringen el acceso público. No incluir secretos en `public/`.
