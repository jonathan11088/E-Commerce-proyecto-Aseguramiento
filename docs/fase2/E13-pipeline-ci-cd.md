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

El despliegue llama a los *Deploy Hooks* de Render del backend y del frontend y después espera a que `https://e-commerce-backend-2pn0.onrender.com/api/health` responda.

## 4. Configuración manual en Render (una sola vez)
1. Entrar a https://dashboard.render.com y abrir el servicio del **backend**.
2. **Settings → Build & Deploy → Auto-Deploy** → cambiar a **Off** (así solo despliega el pipeline, después de que todas las pruebas pasan).
3. En la misma página, **Deploy Hook** → copiar la URL.
4. En GitHub: **Settings → Secrets and variables → Actions → New repository secret** → Name `RENDER_DEPLOY_HOOK_BACKEND` → pegar la URL.
5. Repetir con el servicio del **frontend** y guardar `RENDER_DEPLOY_HOOK_FRONTEND`.
6. Comprobar en Render que ambos servicios usan este repositorio y la rama `main`.
