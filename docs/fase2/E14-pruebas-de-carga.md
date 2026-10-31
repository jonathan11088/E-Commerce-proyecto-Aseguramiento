# E14. Pruebas de carga

## 1. Herramienta y escenario
- Herramienta: **k6**. Script: `tests/carga/carga-catalogo.js`.
- Ejecución: workflow **Prueba de carga** (`.github/workflows/carga.yml`), lanzado a mano desde Actions contra el ambiente de Render.
- Endpoints críticos: `GET /api/products` (listado del catálogo) y `GET /api/products/:id` (detalle de producto).
- Rampa de 0 a 50 usuarios virtuales en 1 minuto, **50 usuarios sostenidos durante 5 minutos** y bajada de 30 segundos. Cada usuario espera 1 segundo entre peticiones.

## 2. Criterios de aceptación
Los RNF del E1 no definían tiempos de respuesta, así que agrego dos como actualización del E1:

| Código | Atributo | Criterio verificable |
|---|---|---|
| RNF-09 | Tiempo de respuesta del catálogo | Con 50 usuarios concurrentes el percentil 95 de las peticiones al catálogo es menor a 2000 ms |
| RNF-10 | Tasa de error bajo carga | Con 50 usuarios concurrentes menos del 1 % de las peticiones falla |

Se configuraron como `thresholds` en k6: si no se cumplen, la ejecución termina en rojo.

## 3. Cómo ejecutarla
1. GitHub → **Actions** → **Prueba de carga** → **Run workflow** → dejar la URL por defecto → **Run workflow**.
2. Esperar unos 8 minutos.
3. Abrir la ejecución → job **k6** → paso **Ejecutar prueba de carga**: al final está la tabla de resultados.
4. En **Artifacts** descargar `resultados-carga` (`resumen-carga.md` y `resumen-carga.json`).

## 4. Métricas reportadas
`resumen-carga.md` reporta: tiempo promedio, percentil 95, máximo, throughput (peticiones por segundo), tasa de error y el desglose por endpoint, además del CUMPLE / NO CUMPLE de RNF-09 y RNF-10.
