# E10. Pruebas unitarias

## 1. Frameworks

| Capa | Framework | Archivos de prueba | Comando |
|---|---|---|---|
| Backend (Node/Express/TypeORM) | **Jest 29 + ts-jest** | `BACK_END/tests/unit/*.test.ts` | `cd BACK_END && npm test` (cobertura: `npm run test:coverage`) |
| Frontend (Angular 19) | **Jasmine + Karma** (ChromeHeadless) | `FRONT_END/frontend/src/app/**/*.spec.ts` | `cd FRONT_END/frontend && npm run test:ci` |

> **Diferencia de niveles.** Estas pruebas verifican **una unidad de código aislada** (un servicio, un middleware, un guard) con un framework de pruebas, sin levantar el servidor ni la base de datos. Las pruebas con Postman/Newman son **pruebas de API** (el sistema corriendo, vía HTTP) y no forman parte de este entregable.

## 2. Total de pruebas: 65

| Archivo | Unidad bajo prueba | Pruebas |
|---|---|---|
| `tests/unit/sessionStore.test.ts` | `sessionStore.ts` | 5 |
| `tests/unit/rbac.middleware.test.ts` | `rbac.middleware.ts` | 4 |
| `tests/unit/auth.middleware.test.ts` | `auth.middleware.ts` (`authenticate`, `optionalAuth`) | 10 |
| `tests/unit/auth.service.test.ts` | `auth.service.ts` (register, login, logout, getMe, forgot/reset password) | 15 |
| `tests/unit/order.service.test.ts` | `order.service.ts` (checkout transaccional, consultas) | 7 |
| `tests/unit/admin.service.test.ts` | `admin.service.ts` (`toggleLock`, detalle y listado de pedidos) | 5 |
| **Subtotal backend** | | **46** |
| `core/guards/guards.spec.ts` | `AuthGuard`, `AdminGuard`, `GuestGuard` | 7 |
| `core/services/auth.service.spec.ts` | `AuthService` del frontend | 5 |
| `core/interceptors/credentials.interceptor.spec.ts` | `CredentialsInterceptor` | 4 |
| `shared/Pipes/pipes.spec.ts` | `FilterActivePipe`, `FilterLockedPipe` | 3 |
| **Subtotal frontend** | | **19** |
| **Total** | | **65** |

## 3. Cobertura sobre los módulos críticos del E2

Módulos críticos definidos en el E2, sección 2.5: autenticación y sesiones (`auth.service.ts`, `auth.middleware.ts`, `sessionStore.ts`), checkout transaccional y control de stock (`order.service.ts`), bloqueo de cuentas (`admin.service.ts`, `sessionStore.ts`) y autorización por rol (`rbac.middleware.ts`, guards de Angular).

**Línea base:** antes de esta fase el proyecto no tenía ninguna prueba (`npm test` del backend solo imprimía `Error: no test specified` y el frontend no tenía archivos `.spec.ts` ni un target `test`). Por eso la cobertura inicial de todos los módulos es **0 %**. Se comprobó ejecutando Jest con `--coverage --passWithNoTests` antes de escribir las pruebas.

### Backend (Jest, `npm run test:coverage`)

| Módulo crítico | Línea base (líneas) | Después (líneas) | Incremento | Ramas después |
|---|---|---|---|---|
| `middleware/sessionStore.ts` | 0 % | 100 % | **+100 pp** | 100 % |
| `middleware/rbac.middleware.ts` | 0 % | 100 % | **+100 pp** | 100 % |
| `middleware/auth.middleware.ts` | 0 % | 100 % | **+100 pp** | 77.8 % |
| `services/auth.service.ts` | 0 % | 97.6 % | **+97.6 pp** | 100 % |
| `services/order.service.ts` | 0 % | 100 % | **+100 pp** | 100 % |
| `services/admin.service.ts` (archivo completo; solo `toggleLock` es crítico) | 0 % | 43.1 % | **+43.1 pp** | 13.8 % |
| **Total módulos críticos backend** | **0 %** | **85.2 %** | **+85.2 pp** | 52.6 % |

### Frontend (Karma, `npm run test:ci`)

| Módulo crítico | Línea base | Después (líneas) | Incremento |
|---|---|---|---|
| `core/guards/auth-guard.ts` | 0 % | 100 % | **+100 pp** |
| `core/guards/admin-guard.ts` | 0 % | 100 % | **+100 pp** |
| `core/guards/guest-guard.ts` | 0 % | 100 % | **+100 pp** |
| `core/interceptors/credentials.interceptor.ts` | 0 % | 100 % | **+100 pp** |
| `core/services/auth.service.ts` | 0 % | 75 % | **+75 pp** |
| **Total frontend medido** | **0 %** | **90.2 %** | **+90.2 pp** |

El incremento supera con amplitud los **20 puntos porcentuales** exigidos. Los reportes HTML/LCOV se publican como artefactos del pipeline (`cobertura-backend`, `cobertura-frontend`).

## 4. Dobles de prueba (mocks y stubs) y justificación

| Doble | Tipo | Dónde | Por qué se aisló |
|---|---|---|---|
| `AppDataSource` de TypeORM (`tests/helpers/mockDataSource.ts`) | Stub con espías | auth.service, order.service, admin.service, auth.middleware | La base real es un archivo SQLite con estado compartido: las pruebas serían lentas, dependerían del orden y de los datos cargados, y no se podría forzar un usuario bloqueado o un código vencido. Con el stub cada prueba define qué devuelve cada repositorio y verifica qué se guardó. |
| `EntityManager` dentro de `transaction()` | Mock | order.service (checkout) | Permite verificar el **orden y los argumentos** de cada operación de la transacción (crear pedido, congelar `priceAtPurchase`, `decrement` del stock, vaciar carrito) y comprobar que si falla la validación de stock **no se escribe nada**. |
| `bcrypt` | Mock | auth.service | El hash real con costo 12 tarda unos 250 ms por llamada. Además se necesita verificar **con qué argumentos** se invoca: costo 12 (RNF-01) y comparación contra un hash de referencia cuando el correo no existe (DEF-01). |
| `jsonwebtoken` (`sign` / `verify`) | Stub / mock | auth.service, auth.middleware | Simula tokens válidos, vencidos o alterados sin depender del reloj ni del secreto real, y devuelve un token fijo para buscarlo en `SessionStore`. |
| `HttpTestingController` | Mock de HTTP | AuthService e interceptor (Angular) | No se llama al backend: se responde cada petición a mano (200, 401, 403, 500) y se verifican URL, método, cuerpo y `withCredentials`. |
| `Router` y `AuthService` en los guards | Mock / stub (`jasmine.createSpyObj`) | guards, interceptor | El guard solo depende de `isLoggedIn` / `isAdmin`; el stub fija ese estado sin simular un login completo. El mock de `Router` verifica **a dónde** se redirige sin navegar. |

`SessionStore` se usa con su implementación real en todas las pruebas, porque es justamente la lógica que se quiere verificar (cierre inmediato de sesiones).

## 5. Defectos detectados por las pruebas y corregidos

Con el código original, **9 de las primeras 43 pruebas del backend fallaban**. Se corrigió lo mínimo en los módulos críticos:

| Defecto | Archivo | Corrección | Prueba que lo cubre |
|---|---|---|---|
| DEF-01 / DEF-09: login con correo inexistente → HTTP 500 y respuesta distinguible | `services/auth.service.ts` | Se compara contra un hash bcrypt de referencia cuando el usuario no existe; se responde 403 "Invalid Credential" igual que con contraseña incorrecta | `auth.service.test.ts` → "con un correo inexistente responde igual…" |
| DEF-03: el código de recuperación se guardaba con el repositorio de `User` | `services/auth.service.ts` | `resetRepo.save(resetCode)` | "marca el código como usado guardándolo en el repositorio de ResetCode" |
| DEF-07 / DEF-08 (causa raíz): todo `ApiError` llegaba como HTTP 500 | `utils/ApiError/ApiError.ts` | `ApiError` expone también `status`, que es lo que lee el manejador global de `app.ts` | order.service: carrito vacío (400), pedido ajeno (404) |
| Nuevo: un usuario bloqueado no perdía sus otras sesiones | `middleware/auth.middleware.ts` | `deleteAllForUser(user.id)` en lugar de pasar el token | "rechaza a un usuario bloqueado y cierra todas sus sesiones…" |
| Nuevo: `SessionStore.size()` se llamaba a sí mismo (recursión infinita) | `middleware/sessionStore.ts` | `return sessionStore.size` | "size devuelve la cantidad de sesiones activas…" |
| Nuevo: `toggleLock` siempre respondía "Account locked" | `services/admin.service.ts` | El mensaje depende de `isLocked` | "al desbloquear informa el desbloqueo…" |
| DEF-11 (encontrado en E11): el detalle de pedido devolvía el `passwordHash` del cliente | `utils/sanitizeOrder.ts`, `order.service.ts`, `admin.service.ts` | Se elimina el hash antes de responder | "getOrderDetail no expone el hash…", "getOrderById nunca devuelve el hash…" |

También se quitaron imports circulares sin uso (servicios que importaban sus propios controladores).

## 6. Ejecución en el pipeline

`.github/workflows/ci.yml` ejecuta en cada PR y push hacia `dev`, `qa` y `main`:

- **Job `Backend`:** `npm ci` → `npm run build` → `npm run test:coverage -- --ci`
- **Job `Frontend`:** `npm ci` → `npm run build` → `npm run test:ci` (Karma en ChromeHeadless)

Si una prueba falla, el job queda en rojo y la protección de ramas (ver E9) bloquea el merge.

## 7. Ejecutar localmente

```bash
cd BACK_END && npm ci && npm run test:coverage
cd FRONT_END/frontend && npm ci && npm run test:ci   # requiere Google Chrome instalado
```
