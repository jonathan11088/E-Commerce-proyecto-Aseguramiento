# E12. Análisis estático de código (SonarCloud)

## 1. Integración
- Configuración: `sonar-project.properties` en la raíz del repositorio.
- Ejecución: job **`SonarCloud`** de `.github/workflows/ci.yml`. Corre después de las pruebas unitarias, usa su cobertura (`lcov.info` de Jest y de Karma) y espera el resultado del quality gate (`sonar.qualitygate.wait=true`). Si el quality gate no se aprueba el job falla y se bloquea el merge.
- Quality gate: **Sonar way** (cobertura de código nuevo ≥ 80 %, duplicación de código nuevo ≤ 3 %, calificaciones A en confiabilidad, seguridad y mantenibilidad, 100 % de security hotspots revisados).

## 2. Estado inicial
El estado inicial oficial es el primer análisis de SonarCloud sobre la rama `main` (código original de la Fase 1): bugs, vulnerabilidades, code smells, duplicación y deuda técnica se toman de esa pantalla.

Antes de configurar SonarCloud ejecuté un análisis previo con las mismas reglas de Sonar para JavaScript/TypeScript (`eslint-plugin-sonarjs`) y CSS. Encontré los siguientes hallazgos relevantes:

| Regla Sonar | Severidad | Archivo | Hallazgo |
|---|---|---|---|
| S3776 Cognitive Complexity | Critical | `BACK_END/src/seeds/productSeed.ts` | Complejidad 24, máximo permitido 15 |
| S4657 Shorthand property override | Critical | `product-card.component.css` | `border` pisa a `border-color` en la misma regla |
| S2245 Pseudorandom generator | Security hotspot | `BACK_END/src/services/auth.service.ts` | Código de recuperación generado con `Math.random` |
| S5689 Version disclosure | Security hotspot | `BACK_END/src/app.ts` | Express revela la versión en `X-Powered-By` |
| S1854 Dead store | Major | `cart.service.ts`, `admin.controller.ts` | 5 asignaciones que no se usan |
| S4656 Duplicate property | Major | `login.component.css`, `profile-page.component.css` | Propiedad `color` repetida |
| S2068 Hard-coded passwords | Security hotspot | `BACK_END/src/seeds/adminSeed.ts` | Contraseñas de usuarios de ejemplo |

## 3. Remediación
| Hallazgo | Corrección |
|---|---|
| S3776 en `productSeed.ts` | Separé la construcción de los mapas de subcategorías (`buildSubCategoryLookup`) y la resolución de la subcategoría (`resolveSubCategory`). La función principal bajó de 24 a menos de 15. |
| S4657 en `product-card` | Quité `border-color`, que quedaba anulado por `border`. El estilo visual no cambia. |
| S2245 en `auth.service.ts` | El código de 6 dígitos se genera con `crypto.randomInt`, que es criptográficamente seguro. |
| S5689 en `app.ts` | `app.disable('x-powered-by')`. |
| S1854 | Eliminé las 5 asignaciones inútiles. |
| S4656 | Dejé solo la declaración de `color` que realmente se aplicaba. |
| S2068 en `adminSeed.ts` | Se revisa como **Safe** en SonarCloud: son cuentas de demostración que solo se crean con `npm run seed` en local. |

Comparativa del análisis previo (backend):

| Regla | Antes | Después |
|---|---|---|
| Cognitive Complexity (Critical) | 1 | 0 |
| Pseudorandom (hotspot) | 1 | 0 |
| X-Powered-By (hotspot) | 1 | 0 |
| Dead store (Major) | 5 | 0 |
| Variables sin uso (Minor) | 10 | 5 |

La comparativa oficial antes/después se toma de SonarCloud: rama `main` (antes) contra el análisis del Pull Request / rama `dev` (después).

## 4. Configuración manual en SonarCloud (una sola vez)
1. Entrar a https://sonarcloud.io → **Log in** → **With GitHub**.
2. **+ (arriba a la derecha) → Analyze new project** → elegir la organización de GitHub `jonathan11088` (si pide crearla, elegir el plan **Free**).
3. Marcar el repositorio `E-Commerce-proyecto-Aseguramiento` → **Set Up**.
4. En "new code" elegir **Previous version** → **Create project**.
5. **Administration → Analysis Method** → desactivar **Automatic Analysis** (el análisis lo hace el pipeline).
6. **My Account → Security → Generate Tokens** → nombre `github-ci` → **Generate** → copiar el token.
7. En GitHub: **Settings → Secrets and variables → Actions → New repository secret** → Name `SONAR_TOKEN`, Secret = el token → **Add secret**.
8. Si SonarCloud muestra una organización o una clave de proyecto distinta, actualizar `sonar.organization` y `sonar.projectKey` en `sonar-project.properties`.

El repositorio debe ser **público** para usar SonarCloud gratis.
