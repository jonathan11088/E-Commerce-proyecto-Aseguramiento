## Que cambia
<!-- Describe el cambio en 2 o 3 lineas -->

## Tipo de cambio
- [ ] feature (funcionalidad nueva)
- [ ] fix (correccion de defecto, indicar DEF-xx)
- [ ] test (pruebas)
- [ ] docs / ci

## Trazabilidad
- Requerimiento(s): RF-
- Caso(s) de prueba: CP-
- Defecto(s): DEF-

## Como se verifico
- [ ] `cd BACK_END && npm test` pasa en local
- [ ] `cd FRONT_END/frontend && npm run test:ci` pasa en local
- [ ] El pipeline CI esta en verde

## Checklist para quien revisa
- [ ] El codigo hace lo que dice la descripcion
- [ ] Las pruebas verifican el comportamiento y no solo ejecutan lineas
- [ ] No se suben secretos (.env, tokens) ni archivos generados
- [ ] Se dejaron comentarios concretos (lineas, riesgos, mejoras) o se explico por que se aprueba
