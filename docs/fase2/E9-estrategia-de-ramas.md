# E9. Estrategia de ramas y control de cambios

## 1. Ambientes y ramas

| Rama | Ambiente | Propósito | Quién fusiona |
|---|---|---|---|
| `feature/*`, `fix/*`, `test/*` | Local del desarrollador | Trabajo diario de una tarea | Nadie fusiona hacia ellas |
| `dev` | DEV (desarrollo / integración) | Integra las tareas terminadas del equipo | Autor del PR, después de la aprobación |
| `qa` | QA (pruebas) | Versión candidata sobre la que se ejecutan las pruebas | Responsable de QA del sprint |
| `main` | PROD (producción) | Versión estable, lo que está desplegado | Líder del equipo |

Las tres ramas permanentes (`dev`, `qa`, `main`) están **protegidas**: nadie puede hacer `push` directo, todo cambio entra por Pull Request.

## 2. Flujo de promoción

```
feature/xx ──PR──▶ dev ──PR──▶ qa ──PR──▶ main
   (1 revisión)       (1 revisión     (1 revisión
    + CI verde)        + CI verde)     + CI verde)
```

1. **Trabajo de una tarea.** Se crea la rama desde `dev` actualizado:
   `git checkout dev && git pull && git checkout -b feature/nombre-corto`
2. **feature → dev.** Se abre un PR hacia `dev` con la plantilla del repositorio. Requisitos para fusionar:
   - El pipeline CI (`Backend` y `Frontend`: compilación + pruebas unitarias) en verde.
   - Al menos **1 aprobación de otro integrante** (el autor no puede aprobarse a sí mismo).
   - Todas las conversaciones de la revisión resueltas.
3. **dev → qa (promoción a QA).** Cuando un conjunto de tareas está listo para probarse, se abre un PR `dev → qa`. Se ejecutan los casos de prueba del plan sobre esa versión. Mismos requisitos: CI verde + 1 aprobación.
4. **qa → main (promoción a PROD).** Solo si QA no tiene defectos de severidad Alta abiertos. PR `qa → main` con CI verde + 1 aprobación.
5. **Corrección urgente en producción (hotfix).** Rama `fix/xx` desde `main`, PR hacia `main` y después el mismo cambio se lleva hacia `qa` y `dev` para que las ramas no se separen.

**Regla de oro:** un cambio nunca salta un ambiente (no se va de `dev` a `main` directo).

## 3. Convenciones

- **Nombres de rama:** `feature/e10-pruebas-backend`, `fix/def-03-codigo-reutilizable`, `test/guards-frontend`, `docs/estrategia-ramas`.
- **Mensajes de commit** (estilo Conventional Commits): `feat:`, `fix:`, `test:`, `docs:`, `ci:`, `chore:`.
  Ejemplo: `fix(auth): guardar el código de recuperación en su repositorio (DEF-03)`.
- **Cada PR** usa la plantilla `.github/pull_request_template.md` e indica RF, CP y DEF relacionados.

## 4. Qué se exige en una revisión (revisión efectiva)

Quien revisa no solo pulsa "Approve". Debe dejar al menos un comentario concreto sobre:

- Lógica: ¿el cambio hace lo que dice? ¿hay casos borde sin cubrir?
- Pruebas: ¿las aserciones verifican el comportamiento o solo ejecutan líneas?
- Riesgos: seguridad, datos de otros usuarios, secretos en el código.
- Si pide cambios, usa **Request changes** y el autor responde en el mismo hilo con el commit que lo corrige.

## 5. Bloqueo del merge si el pipeline falla

El archivo `.github/workflows/ci.yml` se ejecuta en cada PR hacia `dev`, `qa` y `main`. En la protección de ramas, los checks **`Backend`** y **`Frontend`** están marcados como obligatorios, por lo que GitHub deshabilita el botón "Merge" mientras alguno esté en rojo o en ejecución.

---

## 6. Configuración manual en GitHub (paso a paso)

> Esto lo hace el dueño del repositorio, una sola vez, desde el navegador. Antes, el pipeline debe haberse ejecutado al menos una vez (ya pasa al abrir el primer PR), porque GitHub solo deja elegir checks que ya conoce.

### 6.1 Agregar a los integrantes como colaboradores
1. Repositorio → **Settings** → **Collaborators** → **Add people**.
2. Agregar el usuario de GitHub de cada integrante con rol **Write**.
3. Cada integrante acepta la invitación desde su correo.

### 6.2 Cambiar la rama por defecto a `dev`
1. **Settings** → **General** → sección **Default branch** → icono de flechas.
2. Elegir `dev` → **Update** → confirmar.
   (Así los PR nuevos apuntan a `dev` automáticamente.)

### 6.3 Crear la regla de protección (repetir para `dev`, `qa` y `main`)
1. **Settings** → **Branches** → **Add branch ruleset** (o **Add classic branch protection rule**).
2. Si es *ruleset*:
   - **Ruleset name:** `proteger-dev` (luego `proteger-qa`, `proteger-main`).
   - **Enforcement status:** `Active`.
   - **Target branches** → **Add target** → **Include by pattern** → escribir `dev`.
   - Marcar **Restrict deletions** y **Block force pushes**.
   - Marcar **Require a pull request before merging**:
     - **Required approvals:** `1`.
     - Marcar **Dismiss stale pull request approvals when new commits are pushed**.
     - Marcar **Require conversation resolution before merging**.
   - Marcar **Require status checks to pass** → **Add checks** → escribir y elegir `Backend` y luego `Frontend`.
     - Marcar **Require branches to be up to date before merging**.
   - **Create**.
3. Si es *classic branch protection rule*:
   - **Branch name pattern:** `dev`.
   - Marcar **Require a pull request before merging** → **Require approvals: 1** → **Dismiss stale approvals**.
   - Marcar **Require status checks to pass before merging** → **Require branches to be up to date** → buscar y agregar `Backend` y `Frontend`.
   - Marcar **Require conversation resolution before merging**.
   - Marcar **Do not allow bypassing the above settings**.
   - **Create**.

> Si el repositorio es privado en una cuenta gratuita, GitHub no aplica estas reglas. En ese caso hacerlo **público** (Settings → General → Danger Zone → Change visibility) o usar GitHub Pro / Education.

### 6.4 Comprobar que el bloqueo funciona (evidencia para el informe)
1. Crear una rama `test/demo-bloqueo` desde `dev`, cambiar una aserción de cualquier prueba para que falle, hacer push y abrir el PR hacia `dev`.
2. Esperar al pipeline: aparecerá en rojo y el botón dirá **"Merging is blocked"**. Tomar captura.
3. Cerrar ese PR sin fusionar y borrar la rama.

## 7. Pull Requests de la Fase 2 (mínimo 3 con revisión de otro integrante)

| # | Rama origen → destino | Contenido | Autor | Revisor |
|---|---|---|---|---|
| 1 | `feature/e9-pipeline-ci` → `dev` | Pipeline CI, plantilla de PR y esta política | | |
| 2 | `feature/e10-pruebas-backend` → `dev` | Jest, 43 pruebas, corrección de defectos | | |
| 3 | `feature/e10-pruebas-frontend` → `dev` | Karma/Jasmine, 19 pruebas | | |
| 4 | `dev` → `qa` | Promoción a QA | | |
| 5 | `qa` → `main` | Promoción a PROD | | |

Completar autor y revisor con los nombres reales y adjuntar capturas de cada revisión.
