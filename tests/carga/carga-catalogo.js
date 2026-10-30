/**
 * Prueba de carga (E14) con k6 sobre el ambiente desplegado en Render.
 *
 * Endpoints criticos bajo prueba:
 *   1. GET /api/products        -> listado del catalogo con paginacion (pagina principal de la tienda)
 *   2. GET /api/products/:id    -> detalle de producto (paso previo a agregar al carrito)
 *
 * Escenario: rampa de 0 a 50 usuarios virtuales en 1 minuto, 50 usuarios sostenidos
 * durante 5 minutos y bajada de 30 segundos.
 *
 * Criterios (RNF-09 y RNF-10 propuestos como actualizacion del E1):
 *   - percentil 95 del tiempo de respuesta menor a 2000 ms
 *   - tasa de error menor a 1 %
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://e-commerce-proyecto-aseguramiento-backend.onrender.com';

const listadoDuracion = new Trend('listado_duracion', true);
const detalleDuracion = new Trend('detalle_duracion', true);
const errores = new Rate('errores_funcionales');
const listadoTotal = new Counter('listado_peticiones');
const detalleTotal = new Counter('detalle_peticiones');

export const options = {
  scenarios: {
    rampa_50_usuarios: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    listado_duracion: ['p(95)<2000'],
    detalle_duracion: ['p(95)<2000'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)'],
};

// Render en plan gratuito apaga el servicio sin trafico; se despierta antes de medir.
export function setup() {
  for (let i = 0; i < 30; i++) {
    const res = http.get(`${BASE_URL}/api/health`, { timeout: '60s' });
    if (res.status === 200) break;
    sleep(5);
  }
  const res = http.get(`${BASE_URL}/api/products?limit=50`);
  const ids = res.status === 200 ? res.json('products').map((p) => p.id) : [];
  if (ids.length === 0) throw new Error(`No se pudo leer el catalogo en ${BASE_URL}`);
  return { ids };
}

export default function (data) {
  const page = Math.floor(Math.random() * 3) + 1;
  const listado = http.get(`${BASE_URL}/api/products?page=${page}&limit=12`, { tags: { endpoint: 'listado' } });
  listadoDuracion.add(listado.timings.duration);
  listadoTotal.add(1);
  errores.add(!check(listado, {
    'listado responde 200': (r) => r.status === 200,
    'listado trae productos': (r) => Array.isArray(r.json('products')),
  }));

  sleep(1);

  const id = data.ids[Math.floor(Math.random() * data.ids.length)];
  const detalle = http.get(`${BASE_URL}/api/products/${id}`, { tags: { endpoint: 'detalle' } });
  detalleDuracion.add(detalle.timings.duration);
  detalleTotal.add(1);
  errores.add(!check(detalle, {
    'detalle responde 200': (r) => r.status === 200,
  }));

  sleep(1);
}

function fila(nombre, trend, reqs) {
  const v = trend.values;
  return `| ${nombre} | ${reqs} | ${v.avg.toFixed(0)} ms | ${v['p(95)'].toFixed(0)} ms | ${v.max.toFixed(0)} ms |`;
}

export function handleSummary(data) {
  const m = data.metrics;
  const total = m.http_reqs.values.count;
  const tasaError = (m.http_req_failed.values.rate * 100).toFixed(2);
  const p95 = m.http_req_duration.values['p(95)'];
  const cumpleTiempo = p95 < 2000;
  const cumpleError = m.http_req_failed.values.rate < 0.01;
  const md = [
    '# Resultado de la prueba de carga (E14)',
    '',
    `- URL probada: ${BASE_URL}`,
    `- Usuarios virtuales maximos: ${m.vus_max.values.max}`,
    `- Duracion total: ${(data.state.testRunDurationMs / 1000).toFixed(0)} s`,
    '',
    '| Metrica | Valor |',
    '|---|---|',
    `| Peticiones totales | ${total} |`,
    `| Throughput | ${m.http_reqs.values.rate.toFixed(2)} peticiones/s |`,
    `| Tiempo promedio | ${m.http_req_duration.values.avg.toFixed(0)} ms |`,
    `| Percentil 95 | ${p95.toFixed(0)} ms |`,
    `| Tiempo maximo | ${m.http_req_duration.values.max.toFixed(0)} ms |`,
    `| Tasa de error HTTP | ${tasaError} % |`,
    '',
    '| Endpoint | Muestras | Promedio | Percentil 95 | Maximo |',
    '|---|---|---|---|---|',
    fila('GET /api/products', m.listado_duracion, m.listado_peticiones.values.count),
    fila('GET /api/products/:id', m.detalle_duracion, m.detalle_peticiones.values.count),
    '',
    `- RNF-09 (p95 < 2000 ms): ${cumpleTiempo ? 'CUMPLE' : 'NO CUMPLE'}`,
    `- RNF-10 (error < 1 %): ${cumpleError ? 'CUMPLE' : 'NO CUMPLE'}`,
    '',
  ].join('\n');
  return {
    stdout: md,
    'resultados/resumen-carga.md': md,
    'resultados/resumen-carga.json': JSON.stringify(data, null, 2),
  };
}
