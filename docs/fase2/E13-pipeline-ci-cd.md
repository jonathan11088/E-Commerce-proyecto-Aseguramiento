# E13. Pipeline de integración y despliegue continuo

## 1. Herramienta
GitHub Actions. Archivo: `.github/workflows/ci.yml`.

## 2. Etapas, en orden
| # | Etapa | Job | Depende de |
|---|---|---|---|
| 1 | Compilación + pruebas unitarias del backend | `Backend` | - |
| 1 | Compilación + pruebas unitarias del frontend | `Frontend` | - |
| 2 | Análisis estático con verificación del quality gate | `SonarCloud` | Backend y Frontend |
| 3 | Pruebas de API con Newman | `API` | SonarCloud |
| 4 | Despliegue a Render | `Despliegue (PROD)` | API |

Si una etapa falla, las siguientes no se ejecutan y el Pull Request queda bloqueado.

## 3. Despliegue por ambiente
| Rama | Qué ejecuta |
|---|---|
| PR hacia `dev`, `qa` o `main` | Etapas 1 a 3 (validación) |
| Push a `dev` | Etapas 1 a 3 (ambiente DEV = integración) |
| Push a `qa` | Etapas 1 a 3 (ambiente QA = versión candidata) |
| Push a `main` | Etapas 1 a 4: **despliega a producción en Render** |

En producción hay **un solo servicio web en Render** que compila el backend y el frontend. Express sirve la API y el build de Angular desde el mismo origen (RNF-08), así que la cookie de sesión funciona sin configuración CORS. El despliegue llama al *Deploy Hook* de ese servicio y después espera a que `https://e-commerce-proyecto-aseguramiento-backend.onrender.com/api/health` responda.

## 4. Configuración manual en Render (una sola vez)
1. Servicio web con Root Directory `BACK_END` y rama `main`.
2. **Build Command:** `npm install --include=dev && npm run build && cd ../FRONT_END/frontend && npm install --include=dev && npm run build`
3. **Start Command:** `npm start`
4. Variables: `NODE_ENV=production`, `JWT_SECRET`, `DB_PATH=./ecommerce.db`, `NODE_VERSION=22`.
5. **Settings → Build & Deploy → Auto-Deploy: Off** y copiar el **Deploy Hook**.
6. En GitHub: secreto `RENDER_DEPLOY_HOOK` con esa URL.
