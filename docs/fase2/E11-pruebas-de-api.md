# E11. Pruebas de API

## 1. Herramienta y ubicación

| Elemento | Ubicación |
|---|---|
| Colección Postman (versionada) | `BACK_END/tests/api/ecommerce-api.postman_collection.json` |
| Ambiente | `BACK_END/tests/api/ci.postman_environment.json` |
| Ejecución por línea de comandos | Newman: `cd BACK_END && npm run test:api` |
| Ejecución en el pipeline | Job **`API`** de `.github/workflows/ci.yml` |
| Reporte | Artefacto `reporte-newman` (formato JUnit XML) |

Se importa en Postman con **Import → File** y se ejecuta con **Run collection**. Requiere el backend corriendo en `http://localhost:3000`.

## 2. Contenido: 32 solicitudes y 71 aserciones

| Carpeta | Solicitudes | Qué verifica |
|---|---|---|
| 01 Catálogo (invitado) | 7 | Salud, listado paginado con esquema, tope de 50 (RNF-04), filtro de precio, taxonomía, detalle y 404 |
| 02 Autenticación | 8 | Registro (201, 409, 400), login incorrecto, correo inexistente (DEF-01/09), acceso sin sesión (401), login correcto con cookie httpOnly y SameSite Lax (RNF-03), perfil |
| 03 Flujo de compra completo | 13 | Carrito, actualización, checkout sin pago, checkout exitoso, historial, detalle, carrito vacío (DEF-07), acceso de cliente al panel admin, logout y sesión inválida |
| 04 Administración | 4 | Login admin, listado de clientes, detalle de pedido de otro cliente (RF-26), logout |

Cada solicitud tiene aserciones automáticas de:
- **Código de respuesta**: `pm.response.to.have.status(...)`.
- **Esquema**: `pm.response.to.have.jsonSchema(...)` en listado de productos, taxonomía y pedido creado.
- **Contenido**: valores concretos (total = precio × cantidad, precio congelado, stock descontado, ausencia de `passwordHash`, cookie con `HttpOnly`).

## 3. Flujo completo de negocio encadenado

Las solicitudes se pasan datos entre sí con variables de colección:

1. **Listar productos** guarda `productId` y `productPrice` de un producto con stock.
2. **Registrar cliente** genera un correo único (`ana.<timestamp>@mail.com`) y guarda `customerId`.
3. **Login correcto** deja la cookie de sesión, que Newman reutiliza en las siguientes solicitudes.
4. **Agregar al carrito** guarda `stockBefore`.
5. **Checkout exitoso** valida total, precio congelado y que el stock bajó en 3, y guarda `orderId`.
6. **Historial** y **detalle** usan `orderId`.
7. **Administración** busca el `customerEmail` y el `orderId` creados en el mismo recorrido.

Como el correo es único en cada ejecución, la colección se puede repetir sin limpiar la base de datos.

## 4. Ejecución en el pipeline

El job `API` se ejecuta después de que el job `Backend` pasa:

1. Instala dependencias y compila.
2. Copia `ecommerce.db` a un archivo temporal, para no modificar la base del repositorio.
3. Levanta la API con `npm start` y espera a que `/api/health` responda.
4. Ejecuta `npm run test:api` (Newman). Si una aserción falla, el job queda en rojo y se bloquea el merge.
5. Publica el reporte JUnit como artefacto.

## 5. Defecto encontrado por las pruebas de API

| ID | Descripción | Corrección |
|---|---|---|
| DEF-11 | `GET /api/admin/orders/:id`, `GET /api/order/:id` y el checkout devolvían el objeto del cliente con su `passwordHash` | `BACK_END/src/utils/sanitizeOrder.ts` elimina el hash antes de responder; se agregaron 3 pruebas unitarias y 3 aserciones de API |

## 6. Resultado

| Métrica | Valor |
|---|---|
| Solicitudes | 32 |
| Aserciones | 71 |
| Fallidas | 0 |
| Tiempo promedio de respuesta | aprox. 38 ms (local) |
