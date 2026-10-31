# QMenut: métricas de complejidad después de limpiar la landing

**Fecha:** 31 de octubre de 2026. **Referencia actual:** `c98097b5306d` más las 30 eliminaciones locales de la landing. Este documento actualiza el informe anterior. La [foto anterior y sus evidencias](/Users/murgapja/.codex/visualizations/2026/10/31/01a191ac-d187-7491-b6eb-b04e2576a5bd/qmenut-metrics/report.md) se conservan para poder comparar.

## Conclusión

La limpieza ha retirado los únicos excesos de complejidad cognitiva: el máximo baja de **42 a 15** y actualmente **ninguna función supera 15**. Las funciones restantes tienen una complejidad baja en general. Esto no demuestra que el sistema carezca de fallos ni justifica una reescritura.

Las prioridades del producto se mantienen: **probar reservas, la convergencia de suscripciones y las decisiones de entrega de notificaciones**. La limpieza de recursos de marketing no cambia esas brechas. Los puntos de coordinación con más cambios siguen estando en menú, QR, imágenes y fidelización.

## Comparación con la medición anterior

| Métrica                            | Anterior   | Actual     | Lectura                          |
| ---------------------------------- | ---------- | ---------- | -------------------------------- |
| Líneas de código (cloc)            | 68.191     | 67.586     | -605 netas; explicación debajo   |
| Archivos del recuento              | 878        | 876        | −2 archivos de código            |
| Funciones medidas                  | 3410       | 3370       | −40 funciones del motor retirado |
| Máxima cognitiva                   | 42         | 15         | −27; desaparecen ambos excesos   |
| Funciones con cognitiva > 15       | 2          | 0          | 0 actualmente                    |
| Funciones con ciclomática > 10     | 78         | 74         | −4                               |
| Funciones con ciclomática > 20     | 10         | 9          | −1                               |
| Ciclos estáticos de ejecución      | 0          | 0          | Sin cambios                      |
| Clones / líneas duplicadas         | 83 / 1.124 | 83 / 1.124 | Sin nuevos clones                |
| Duplicación jscpd                  | 1,51 %     | 1,52 %     | Cambio de denominador            |
| Pruebas ejecutadas que pasan       | 61         | 61         | Sin fallos                       |
| E2E inventariadas, sin ejecutarlas | 115        | 115        | Mismo alcance                    |

**Precisión sobre las líneas:** la limpieza retira **664 líneas de código según cloc** en dos archivos: el motor JavaScript (437) y el script de generación (227). Respecto al primer recuento publicado también hay **59 líneas adicionales en web**, en reservas, idiomas y su ruta contenedora; por eso la reducción neta es 605, no 664. El primer recuento de líneas y la foto anterior de métricas de funciones se tomaron en momentos distintos. No se atribuyen esos 59 cambios a esta limpieza.

Al comparar los hashes de la foto anterior de funciones con los actuales, **todos los archivos de producción conservados son idénticos**; solo desaparece el motor de animación. El historial sí incorpora un commit adicional que confirma cambios ya presentes en la foto anterior. No debe confundirse esa confirmación con cambios nuevos en el contenido medido.

Los **30 archivos eliminados y 967 líneas de texto en el diff** también incluyen instrucciones de generación y un manifiesto JSON, que no forman parte del recuento de código usado aquí. Además, se retiraron imágenes y fuentes sin uso. La landing conserva sus páginas y su contenido, pendiente de la validación del propietario; este análisis no valida afirmaciones comerciales ni legales.

## Alcance y reproducibilidad

Se repitieron las seis mediciones con el mismo alcance, versiones y umbrales. Se cuentan **67.586 líneas de código en 876 archivos**. Se excluyen dependencias, compilados, archivos generados, documentación, JSON, comentarios y líneas vacías.

| Área                         | Líneas de código |
| ---------------------------- | ---------------- |
| Herramientas y configuración | 183              |
| Migraciones y semillas SQL   | 1.683            |
| Pruebas y fixtures           | 4.716            |
| apps/admin                   | 18.293           |
| apps/api                     | 10.075           |
| apps/landing                 | 1.749            |
| apps/tenant-config           | 113              |
| apps/web                     | 13.588           |
| packages/auth                | 210              |
| packages/db                  | 7.809            |
| packages/permissions         | 102              |
| packages/ui                  | 9.065            |

El subtotal de aplicaciones y paquetes, sin pruebas, migraciones ni herramientas, es **61.004 líneas**.

Funciones y dependencias se miden sobre **678 archivos TS/TSX/JS de producción y 3.370 funciones**, incluidos métodos y callbacks. Se excluyen tests, helpers de tests, `.d.ts`, configuración y rutas generadas. Los archivos Astro completos no forman parte de la complejidad por función. CSS se incluye en duplicación. Los diccionarios TypeScript sí cuentan; los JSON no.

Se usan ESLint 10.9.1, SonarJS 4.2.0 y `@typescript-eslint/parser` 8.69.0 instalados. El analizador invoca las reglas oficiales, sin aplicar supresiones locales y con umbral cero para registrar todas las puntuaciones. Pasa sus tres comprobaciones de control; **cero errores de análisis y cero funciones sin puntuación ciclomática**. No se modifica la configuración de lint.

## 1. Complejidad cognitiva

La puntuación estima la dificultad de seguir las decisiones y la anidación de una función. Las funciones muy pequeñas y callbacks reducen la media; se muestran también percentiles y extremos.

| Métrica     | Media | Mediana | P90 | P95 | P99 | Máximo |
| ----------- | ----- | ------- | --- | --- | --- | ------ |
| Cognitiva   | 0,85  | 0       | 2   | 4   | 9   | 15     |
| Ciclomática | 2,32  | 1       | 5   | 7   | 14  | 29     |

Distribución cognitiva actual: **2.077 funciones con 0**, 1.200 con 1–5, 69 con 6–10 y 24 con 11–15. **24 de 3.370 superan 10 (0,71 %)**; ninguna supera 15.

| Ubicación                                                                                                                       | Función                          | Cognitiva | Ciclomática |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------- | ----------- |
| [dashboard-page.tsx:26](/Users/murgapja/dev/qmenut/apps/admin/src/app/dashboard/pages/dashboard-page.tsx:26)                    | `DashboardPage`                  | 15        | 18          |
| [promotion-input.schema.ts:40](/Users/murgapja/dev/qmenut/apps/api/src/modules/admin-promotions/promotion-input.schema.ts:40)   | `z.object.superRefine callback`  | 15        | 16          |
| [index.ts:127](/Users/murgapja/dev/qmenut/packages/ui/src/components/molecules/qm-map/index.ts:127)                             | `rebuildMap`                     | 15        | 16          |
| [promotion-formatting.ts:28](/Users/murgapja/dev/qmenut/apps/web/src/shared/public-menu/promotion-formatting.ts:28)             | `formatValidity`                 | 15        | 15          |
| [use-qr-print-controller.ts:23](/Users/murgapja/dev/qmenut/apps/admin/src/features/qr/hooks/use-qr-print-controller.ts:23)      | `useQrPrintController`           | 14        | 26          |
| [services.ts:38](/Users/murgapja/dev/qmenut/apps/admin/src/features/analytics/services.ts:38)                                   | `formatAnalyticsTrend`           | 14        | 12          |
| [tenant-theme-config.ts:154](/Users/murgapja/dev/qmenut/packages/ui/src/theme/tenant-theme-config.ts:154)                       | `parseThemePreviewUpdateMessage` | 13        | 23          |
| [notification-jobs.ts:21](/Users/murgapja/dev/qmenut/apps/api/src/modules/notifications/notification-jobs.ts:21)                | `deliverPush`                    | 13        | 22          |
| [translation-row.tsx:38](/Users/murgapja/dev/qmenut/apps/admin/src/shared/components/translation-editor/translation-row.tsx:38) | `TranslationRow`                 | 13        | 17          |
| [image-activity.tsx:69](/Users/murgapja/dev/qmenut/apps/admin/src/shared/images/image-activity.tsx:69)                          | `useEffect callback`             | 13        | 15          |

Los máximos ahora están en el dashboard, la validación de promociones, el mapa y el formato de vigencias. La limpieza elimina los dos máximos de la animación anterior. Esta mejora procede de retirar código que ya no se usaba; las funciones del producto conservadas mantienen su puntuación.

## 2. Complejidad ciclomática

Se usa la variante `classic` de ESLint. Cuenta caminos de control, incluidos operadores lógicos, valores por defecto y cadenas opcionales. No representa literalmente cuántos tests necesita una función.

**74 funciones superan 10 (2,20 %), 23 superan 15 y 9 superan 20 (0,27 %).** El máximo sigue en 29. Los cortes >10 y >20 son criterios de revisión de este informe, no reglas nuevas ni defectos demostrados.

| Ubicación                                                                                                                     | Función                          | Ciclomática | Cognitiva |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------- | --------- |
| [mappers.ts:29](/Users/murgapja/dev/qmenut/apps/admin/src/features/menu/mappers.ts:29)                                        | `toDishFormValues`               | 29          | 0         |
| [google-reviews.service.ts:73](/Users/murgapja/dev/qmenut/apps/api/src/modules/public-menu/google-reviews.service.ts:73)      | `mapReview`                      | 26          | 5         |
| [use-qr-print-controller.ts:23](/Users/murgapja/dev/qmenut/apps/admin/src/features/qr/hooks/use-qr-print-controller.ts:23)    | `useQrPrintController`           | 26          | 14        |
| [apply-theme.ts:242](/Users/murgapja/dev/qmenut/packages/ui/src/theme/apply-theme.ts:242)                                     | `resolveTemplate`                | 24          | 0         |
| [tenant-theme-config.ts:154](/Users/murgapja/dev/qmenut/packages/ui/src/theme/tenant-theme-config.ts:154)                     | `parseThemePreviewUpdateMessage` | 23          | 13        |
| [notification-jobs.ts:21](/Users/murgapja/dev/qmenut/apps/api/src/modules/notifications/notification-jobs.ts:21)              | `deliverPush`                    | 22          | 13        |
| [get-public-menu.ts:52](/Users/murgapja/dev/qmenut/apps/api/src/modules/public-menu/get-public-menu.ts:52)                    | `getPublicMenu`                  | 22          | 10        |
| [menu-print-editor.tsx:46](/Users/murgapja/dev/qmenut/apps/admin/src/features/menu-print/components/menu-print-editor.tsx:46) | `MenuPrintEditor`                | 21          | 11        |
| [use-redemption-flow.ts:24](/Users/murgapja/dev/qmenut/apps/web/src/features/loyalty/hooks/use-redemption-flow.ts:24)         | `useRedemptionFlow`              | 21          | 9         |

`toDishFormValues` tiene 29 ciclomática y 0 cognitiva: su puntuación procede de campos opcionales y valores por defecto en un mapeo lineal. `resolveTemplate` presenta el mismo patrón. No se recomienda fragmentarlos para bajar una cifra.

En cambio, `useQrPrintController` (26), `deliverPush` (22), `getPublicMenu` (22) y `useRedemptionFlow` (21) coordinan estados y decisiones; sus combinaciones y errores son mejores candidatos a protección mediante pruebas.

| Área                   | Archivos medidos | Funciones | Máx. cognitiva | Funciones CC > 10 |
| ---------------------- | ---------------- | --------- | -------------- | ----------------- |
| `apps/admin`           | 238              | 1329      | 15             | 26                |
| `apps/api`             | 134              | 637       | 15             | 16                |
| `apps/landing`         | 2                | 1         | 0              | 0                 |
| `apps/tenant-config`   | 1                | 8         | 10             | 0                 |
| `apps/web`             | 154              | 653       | 15             | 17                |
| `packages/auth`        | 3                | 12        | 6              | 1                 |
| `packages/db`          | 60               | 466       | 10             | 3                 |
| `packages/permissions` | 1                | 5         | 0              | 0                 |
| `packages/ui`          | 85               | 259       | 15             | 11                |

## 3. Acoplamiento y ciclos

El grafo contiene **2.193 pares de archivos relacionados incluyendo tipos**. Hay **1.756 relaciones de ejecución incluyendo importaciones dinámicas**, de las cuales **1.750 son estáticas**. Las cifras no cambian con la limpieza porque el motor retirado no importaba módulos del producto.

- **0 ciclos estáticos de ejecución.** No se han detectado dentro de este alcance.
- **1 ciclo de ejecución al incluir importaciones dinámicas:** [apps/api/src/modules/analytics/get-restaurant-analytics-snapshot.ts](/Users/murgapja/dev/qmenut/apps/api/src/modules/analytics/get-restaurant-analytics-snapshot.ts:273) importa el cálculo de insights; este importa del snapshot el umbral `MIN_LOADS_FOR_INSIGHTS`. La importación diferida evita tratarlo como un ciclo estático. No se demuestra un fallo; separar el umbral compartido puede quitar esa dependencia circular.
- **1 ciclo adicional exclusivamente por tipos:** [packages/db/src/mappers/public-menu.mapper.ts](/Users/murgapja/dev/qmenut/packages/db/src/mappers/public-menu.mapper.ts:17) depende de tipos del repositorio que importa el mapper. No sobrevive como ciclo de ejecución. Extraer las formas de fila solo resulta útil si esta relación empieza a dificultar cambios.

Archivos centrales, excluyendo dependencias exclusivamente de tipos:

| Archivo                                                                                                                                    | Dependientes (fan-in) | Dependencias (fan-out) |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ---------------------- |
| [admin/src/lib/i18n.ts](/Users/murgapja/dev/qmenut/apps/admin/src/lib/i18n.ts)                                                             | 128                   | 0                      |
| [admin/src/lib/trpc.ts](/Users/murgapja/dev/qmenut/apps/admin/src/lib/trpc.ts)                                                             | 48                    | 1                      |
| [ui/src/internal/component-styles.ts](/Users/murgapja/dev/qmenut/packages/ui/src/internal/component-styles.ts)                             | 41                    | 0                      |
| [ui/src/internal/base-styles.ts](/Users/murgapja/dev/qmenut/packages/ui/src/internal/base-styles.ts)                                       | 41                    | 0                      |
| [admin/src/shared/api.ts](/Users/murgapja/dev/qmenut/apps/admin/src/shared/api.ts)                                                         | 31                    | 2                      |
| [permissions/src/index.ts](/Users/murgapja/dev/qmenut/packages/permissions/src/index.ts)                                                   | 30                    | 0                      |
| [api/src/trpc/trpc.ts](/Users/murgapja/dev/qmenut/apps/api/src/trpc/trpc.ts)                                                               | 22                    | 4                      |
| [admin/src/shared/components/state/loading-state.tsx](/Users/murgapja/dev/qmenut/apps/admin/src/shared/components/state/loading-state.tsx) | 22                    | 1                      |

Los 128 dependientes de traducciones o los consumidores de permisos son centralización esperable; no indican por sí solos mal diseño. El punto de composición [apps/admin/src/features/menu/pages/menu-pages.tsx](/Users/murgapja/dev/qmenut/apps/admin/src/features/menu/pages/menu-pages.tsx) conserva **26 dependencias de ejecución y 21 commits** en la ventana, pero su máximo cognitivo es solo 3. Su interés está en el alcance de los cambios que coordina.

El grafo resuelve importaciones y reexportaciones, alias locales y exports de paquetes QMenut. No modela llamadas HTTP/tRPC, bindings de Workers, SQL, importaciones con nombres construidos ni servicios externos. Las dos referencias a rutas generadas quedan excluidas.

## 4. Duplicación

Se repitió jscpd 4.0.5 con modo `mild`, mínimo **5 líneas y 50 tokens**, sobre los mismos directorios que siguen existiendo. Se excluyen tests, declaraciones, código generado, dependencias, JSON y documentación.

Resultado: **83 clones y 1.124 líneas duplicadas**, exactamente los mismos que antes. El porcentaje pasa de **1,51 % a 1,52 %** porque el denominador baja de 74.531 a **74.044 líneas**. **No han aparecido nuevos clones**. No debe compararse este denominador con el de cloc.

Se procesan **763 archivos físicos**, representados por **894 unidades de lenguaje** debido al contenido embebido. Los nueve archivos pequeños sin unidades registradas en el detector se conservan en el alcance de complejidad; los formatos Astro completos no se incluyen en esta detección.

| Formato    | Clones | Líneas duplicadas | Porcentaje jscpd |
| ---------- | ------ | ----------------- | ---------------- |
| css        | 11     | 409               | 3,69 %           |
| typescript | 62     | 599               | 1,39 %           |
| javascript | 0      | 0                 | 0 %              |
| tsx        | 10     | 116               | 0,87 %           |

Las principales coincidencias siguen siendo:

- **CSS de admin y landing:** dos bloques de 253 y 68 líneas en `app/styles/layout.css` y `landing/src/styles/layout.css`. Una fuente compartida puede evitar divergencias si deben evolucionar juntos; sus estilos específicos pueden seguir separados.
- **Cabeceras públicas:** `qm-hero-header` y `qm-page-header` comparten bloques de 32 y 21 líneas. Una extracción pequeña puede servir si ambas deben cambiar a la vez.
- **Routers y repositorios:** controles y consultas semejantes producen clones cortos. No justifican por sí solos una capa CRUD genérica.

La repetición semántica de validaciones de promociones entre formulario y API sigue fuera del alcance completo de un detector textual. Conservar validación en la API es necesario; compartir código solo debe hacerse si simplifica los tipos de entrada y conserva las mismas reglas de negocio. No se ha probado una divergencia incorrecta.

## 5. Frecuencia y concentración de cambios

La ventana se mantiene: **3 de agosto a 31 de octubre de 2026**, 90 días naturales. Hay **188 commits no merge**, frente a 187 antes. Se cuentan commits por ruta y líneas añadidas/eliminadas, sin seguir renombrados. Las incorporaciones iniciales cuentan y las eliminaciones locales de la landing aún no cuentan como commits.

Los máximos de frecuencia son los diccionarios inglés/español (**26 commits** cada uno), `menu-pages.tsx` (**21**), el esquema de entorno (**21**), `highlights-page.tsx` (**18**) y `use-menu-controllers.ts` (**17**). Traducir o ampliar configuración no implica complejidad alta.

Para ordenar los puntos de revisión se conserva el índice **commits × máxima complejidad cognitiva del archivo**. Es una ayuda local para priorizar, no una métrica estándar ni una probabilidad de fallos.

| Archivo                                                                                                                                                            | Commits | Máx. cognitiva | Índice |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | -------------- | ------ |
| [admin/src/features/qr/components/qr-printable-panel.tsx](/Users/murgapja/dev/qmenut/apps/admin/src/features/qr/components/qr-printable-panel.tsx)                 | 9       | 12             | 108    |
| [admin/src/shared/images/image-activity.tsx](/Users/murgapja/dev/qmenut/apps/admin/src/shared/images/image-activity.tsx)                                           | 7       | 13             | 91     |
| [admin/src/app/shell/admin-shell.tsx](/Users/murgapja/dev/qmenut/apps/admin/src/app/shell/admin-shell.tsx)                                                         | 13      | 7              | 91     |
| [web/src/features/promos/pages/highlights-page.tsx](/Users/murgapja/dev/qmenut/apps/web/src/features/promos/pages/highlights-page.tsx)                             | 18      | 5              | 90     |
| [admin/src/features/loyalty/pages/loyalty-program-page.tsx](/Users/murgapja/dev/qmenut/apps/admin/src/features/loyalty/pages/loyalty-program-page.tsx)             | 11      | 8              | 88     |
| [web/src/features/menu/components/menu-content/menu-featured.tsx](/Users/murgapja/dev/qmenut/apps/web/src/features/menu/components/menu-content/menu-featured.tsx) | 11      | 8              | 88     |
| [admin/src/shared/images/image-gallery-control.tsx](/Users/murgapja/dev/qmenut/apps/admin/src/shared/images/image-gallery-control.tsx)                             | 7       | 12             | 84     |
| [web/src/features/loyalty/hooks/use-loyalty-controller.ts](/Users/murgapja/dev/qmenut/apps/web/src/features/loyalty/hooks/use-loyalty-controller.ts)               | 7       | 12             | 84     |

Impresión QR, estado de imágenes, shell administrativo y fidelización combinan frecuencia y decisiones. Menú merece una revisión complementaria por coordinación: sus **1.098 líneas añadidas y 851 eliminadas** se reparten en 21 commits, aunque sus funciones sean sencillas.

La prioridad de reservas no proviene de un valor alto de complejidad: su repositorio tiene máximo cognitivo 4. Proviene de su efecto en cupos, fechas y datos de clientes y de la ausencia de escenarios específicos en la suite.

## 6. Pruebas y cobertura de flujos críticos

### Verificaciones repetidas

- **61 pruebas pasan, 0 fallan**, en 8 archivos; 4.179 aserciones. Se incluyen UI y los scripts de web/API. Se usa la biblioteca SQLite actual que ya contempla el test de traducciones en macOS.
- **Oxlint: 0 diagnósticos**, sobre 750 archivos y 541 reglas. No equivale a ejecutar build, formato global o una comprobación de tipos independiente.
- **Playwright: 115 ejecuciones inventariadas**, correspondientes a 104 casos funcionales únicos, una preparación de autenticación y 10 repeticiones adicionales de cinco historias críticas en WebKit y Firefox. La suite visual opcional está desactivada. No se han ejecutado E2E.

La ejecución actual usa Bun **1.4.3** disponible en este equipo; el repositorio declara 1.4.0. No se ha cambiado esa configuración ni se afirma equivalencia de comportamiento entre versiones.

### Cobertura instrumental observada

El LCOV de las 61 pruebas registra **105 archivos de producción cargados**, **9.618 de 11.173 líneas instrumentadas ejecutadas (86,08 %)** y **389 de 592 funciones (65,71 %)**.

Estas cifras **no son la cobertura global de QMenut**. No incluyen los archivos que las pruebas no importan, las ramas no están medidas con counters utilizables en este LCOV y los diccionarios de traducción cargados aumentan el peso de líneas sin demostrar recorridos. No se asigna cobertura de navegador a los E2E inventariados.

### Matriz de protección

| Flujo              | Evidencia actual                                                                       | Brecha                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Reservas           | No se encuentran escenarios específicos en los 44 archivos de pruebas.                 | Cupos simultáneos, confirmación/cancelación, fechas, zona horaria, recordatorios y aislamiento de reservas. |
| Suscripciones      | billing-guards y roles: acceso por rol y rechazo de firmas inválidas.                  | Evento válido, duplicación/reordenación, recuperación tras fallos y convergencia D1/KV/caché.               |
| Notificaciones     | No aparecen casos específicos para entrega push o mantenimiento programado.            | ack/retry, caducidad, 404/410, 429/5xx y aislamiento de fallos de cron.                                     |
| Permisos y tenants | roles, tenant-integrity, tenant-isolation, login y access-journey.                     | Casos escritos y conservados; E2E no ejecutado hoy ni matriz exhaustiva de endpoints.                       |
| Fidelización       | Canje, saldo, doble petición, validación concurrente, recuperación y otro restaurante. | Diversidad de casos escritos; falta validación E2E de esta ejecución y de tareas automáticas.               |
| Menú y publicación | CRUD, relaciones, sucursales, caché, recuperación y offline.                           | Casos E2E inventariados; no certifican almacenamiento remoto de imágenes ni proveedores.                    |
| UI e idiomas       | 61 pruebas ejecutadas que incluyen UI, plurales, locales y traducción parcial.         | 22 pruebas de scripts siguen fuera de bun run test y de bun test packages en el deploy.                     |

Las brechas indican ausencia de comprobación, no defectos demostrados. Un ejemplo es [apps/api/src/modules/billing/sync-subscription-state.ts](/Users/murgapja/dev/qmenut/apps/api/src/modules/billing/sync-subscription-state.ts:31): cognitiva 6 y ciclomática 16, pero coordina datos de suscripción, plan, tema e invalidación. Su impacto merece más protección que un mapper con puntuación mayor.

## Prioridades tras la limpieza

1. **Reservas:** crear, consultar, confirmar y cancelar; dos solicitudes a la última plaza; fechas locales y acceso desde otro restaurante. Después, recordatorios y anonimización.
2. **Suscripciones:** eventos válidos repetidos y fuera de orden, y recuperación después de fallar KV o la invalidación. Comprobar el plan efectivo en D1 y en la respuesta pública.
3. **Notificaciones:** cubrir `deliverPush` para caducidad, dispositivos inexistentes, rechazos permanentes y fallos temporales; comprobar que una tarea programada fallida no bloquea las otras.
4. **Punto de entrada de tests:** incluir las 22 pruebas de scripts en el flujo habitual y documentar su requisito SQLite.
5. **Mantenimiento selectivo:** revisar menú por coordinación y QR/imágenes por decisiones y frecuencia. Extraer por responsabilidad al modificarlos, sin dividir mapeos lineales para reducir números.
6. **Seguimiento:** comparar nuevos excesos cognitivos >15, funciones CC >20 con estados de negocio, nuevos ciclos y duplicación con estos mismos parámetros. La animación retirada ya no requiere trabajo.

## Evidencias y comandos

Los resultados completos se conservan en [los archivos de esta revisión](/Users/murgapja/.codex/visualizations/2026/10/31/01a191ac-d187-7491-b6eb-b04e2576a5bd/qmenut-metrics-after-cleanup): [funciones](/Users/murgapja/.codex/visualizations/2026/10/31/01a191ac-d187-7491-b6eb-b04e2576a5bd/qmenut-metrics-after-cleanup/functions.csv), [dependencias](/Users/murgapja/.codex/visualizations/2026/10/31/01a191ac-d187-7491-b6eb-b04e2576a5bd/qmenut-metrics-after-cleanup/coupling.csv), [frecuencia y puntos de revisión](/Users/murgapja/.codex/visualizations/2026/10/31/01a191ac-d187-7491-b6eb-b04e2576a5bd/qmenut-metrics-after-cleanup/hotspots.csv), [declaraciones de pruebas](/Users/murgapja/.codex/visualizations/2026/10/31/01a191ac-d187-7491-b6eb-b04e2576a5bd/qmenut-metrics-after-cleanup/tests.csv), [inventario E2E expandido](/Users/murgapja/.codex/visualizations/2026/10/31/01a191ac-d187-7491-b6eb-b04e2576a5bd/qmenut-metrics-after-cleanup/e2e-inventory.csv), [análisis JSON](/Users/murgapja/.codex/visualizations/2026/10/31/01a191ac-d187-7491-b6eb-b04e2576a5bd/qmenut-metrics-after-cleanup/analysis.json), [duplicación](/Users/murgapja/.codex/visualizations/2026/10/31/01a191ac-d187-7491-b6eb-b04e2576a5bd/qmenut-metrics-after-cleanup/duplication.json), [LCOV](/Users/murgapja/.codex/visualizations/2026/10/31/01a191ac-d187-7491-b6eb-b04e2576a5bd/qmenut-metrics-after-cleanup/lcov.info) y [comandos](/Users/murgapja/.codex/visualizations/2026/10/31/01a191ac-d187-7491-b6eb-b04e2576a5bd/qmenut-metrics-after-cleanup/commands.txt).

Se guardan el analizador, sus comprobaciones y los hashes SHA-256 de los archivos de producción. Los hashes se han vuelto a verificar antes de generar este informe. El inventario AST cuenta declaraciones; Playwright expande bucles y proyectos, por lo que sus totales no son intercambiables.

Referencias: [métricas Sonar](https://docs.sonarsource.com/sonarqube-server/user-guide/code-metrics/metrics-definition), [regla complexity de ESLint](https://eslint.org/docs/latest/rules/complexity), [jscpd](https://github.com/kucherenko/jscpd).

## Límites

No se han ejecutado E2E ni reiniciado D1/KV locales. Tampoco se han hecho despliegues, llamadas reales a proveedores, pruebas de carga, revisión exhaustiva de SQL o una auditoría de seguridad. `qmenut-ops` y los servicios externos quedan fuera. Los tests y los datos del producto no se han modificado; esta revisión actualiza el informe y sus evidencias.
