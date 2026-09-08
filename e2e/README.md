# Cobertura E2E

La suite comprueba recorridos completos por pantalla y usa tRPC para preparar datos,
limpiarlos y confirmar persistencia. Una comprobación por API no se contabiliza como
cobertura de una interacción de UI.

## Ejecución

Usar la versión de Bun declarada en el `package.json` actual. Instalar navegadores desde
este workspace para usar la misma versión de Playwright que los tests:

```bash
cd e2e
bunx --no-install playwright install chromium webkit firefox
cd ..
bun run test:e2e
```

Los hosts `tapas.localhost`, `fine.localhost`, `cafe.localhost`, `her.localhost` y
`fast.localhost` deben resolver a `127.0.0.1` (ver `AGENTS.md`). El comando reinicia D1/KV
**locales**, prepara las cuentas OTP y arranca API, tenant-config, admin y el Worker
público compilado. Finalmente ejecuta la limpieza SQL, también si falla Playwright.

```bash
# Solo recorridos críticos, en Chromium + WebKit/iPhone + Firefox
bun run --cwd e2e test --grep @critical

# Repetición sin retries de los escenarios añadidos, conservando datos entre repeticiones
bun run --cwd e2e test 'journey|recovery|boundaries|offline' --repeat-each=3 --retries=0

# Solo inventario; no arranca servidores ni reinicia datos
cd e2e
bunx --no-install playwright test --list
```

`E2E_REUSE_SERVERS=1` permite reutilizar servicios E2E ya arrancados. No ejecutar un
reset mientras otros procesos usan el mismo D1/KV. Las capturas visuales siguen siendo
optativas con `E2E_VISUAL=1` o `CI`; sus baselines dependen del sistema operativo.

## Matriz de recorridos añadidos

Los archivos están bajo `tests/`. `@critical` selecciona exactamente cinco historias
que se ejecutan además en `critical-webkit` y `critical-firefox`. El resto conserva
los proyectos Chromium actuales, incluido el perfil móvil de la carta pública.

| Recorrido                                                          | Rol y estados                                                                         | Prueba                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Carta, categorías, detalle, extras, alérgenos, idioma y destacados | Cliente; navegación, vuelta y foco                                                    | `web/navigation-journey.spec.ts` · `@critical` |
| Categoría y plato con relaciones publicados                        | Administrador y cliente; guardar, reabrir, persistir                                  | `cross/menu-recovery.spec.ts` · `@critical`    |
| Cancelar edición                                                   | Administrador y cliente; borrador descartado                                          | `cross/menu-recovery.spec.ts`                  |
| Ocultar/reactivar un plato destacado                               | Staff y cliente; carta y destacados tras navegar                                      | `cross/menu-recovery.spec.ts`                  |
| Guardado interrumpido antes de escribir                            | Administrador y cliente; error, datos conservados, reintento                          | `cross/menu-recovery.spec.ts` · `@critical`    |
| Relaciones fallidas, respuesta perdida, pulsación repetida         | Administrador; recuperación sin duplicados                                            | `cross/menu-recovery.spec.ts`                  |
| Canje completo por dos pantallas                                   | Cliente y staff; validación, saldo y polling sin recargar                             | `cross/loyalty-recovery.spec.ts` · `@critical` |
| Rechazo y recuperación de tarjeta pendiente                        | Cliente y staff; rechazo, reload, contexto reabierto                                  | `cross/loyalty-recovery.spec.ts`               |
| Segundo sello, saldo insuficiente y saldo exacto                   | Cliente; límites y ausencia de movimientos indebidos                                  | `cross/loyalty-recovery.spec.ts`               |
| Solicitud doble, validación doble, cancelar frente a validar       | Dos pestañas o empleados; estado terminal y saldo coherentes                          | `cross/loyalty-recovery.spec.ts`               |
| Sello sin conexión                                                 | Cliente; fallo visible y reintento explícito al reconectar                            | `cross/loyalty-recovery.spec.ts`               |
| Tarjeta al visitar otro restaurante                                | Cliente; almacenamiento y token aislados                                              | `cross/loyalty-recovery.spec.ts`               |
| Carta almacenada y ruta nunca visitada                             | Cliente offline; lectura o recuperación con destino e idioma                          | `web/offline.spec.ts`                          |
| Cambio de sucursal y publicación                                   | Administrador y cliente; destino correcto y vuelta                                    | `cross/branch-journey.spec.ts`                 |
| QR de carta y fidelización                                         | Administrador y cliente; copiar, navegar, PNG y SVG válidos                           | `cross/branch-journey.spec.ts`                 |
| Cambio de restaurante                                              | Cuenta con dos restaurantes; caché y sucursal reiniciadas                             | `admin/access-journey.spec.ts`                 |
| Alta y revocación de empleado                                      | Owner y empleado; UI y sesión abierta sin autorización                                | `admin/access-journey.spec.ts`                 |
| Sesión caducada y plato eliminado                                  | Administrador; escritura rechazada y enlace profundo                                  | `admin/access-journey.spec.ts`                 |
| Login y logout con Atrás                                           | Usuario anónimo/autenticado; teclado y sesión cerrada                                 | `admin/session-journey.spec.ts` · `@critical`  |
| Precios y nombres                                                  | Administrador; coma, punto, cero, negativos, decimales, espacios, texto largo y emoji | `admin/form-boundaries.spec.ts`                |
| Contenido vacío y traducción incompleta/desactivada                | Cliente; estados vacíos, navegación y fallback                                        | `cross/content-boundaries.spec.ts`             |

## Aislamiento y sincronización

- Mantener un solo worker: los proyectos comparten D1/KV. Las carreras usan contextos
  o pestañas dentro de un test, sin paralelizar tests independientes.
- Usar nombres/identidades únicos y la fixture `cleanup`. Registrar la restauración
  antes de escribir; ejecutar todas las restauraciones en orden inverso y fallar si
  cualquiera de ellas falla. La limpieza SQL elimina después los registros E2E.
- La fixture `diner` tiene almacenamiento vacío y conserva el perfil del proyecto;
  las fixtures de empleados mantienen sesiones independientes.
- Preparar datos por API está permitido. La acción anunciada en el nombre del test
  debe realizarse por UI, seguida de una comprobación visible o de persistencia.
- En respuesta perdida, `route.fetch()` deja terminar la escritura real antes de
  abortar su entrega. No simular un éxito que nunca llegó al backend.
- Esperar estado visible, respuestas o polling. Para Escape, esperar el foco del modal.
  Para offline, esperar el control del service worker y su caché real; usar la ruta
  canónica, que puede carecer de barra final.
- Los cambios públicos se exigen al navegar/recargar. Solo fidelización exige
  actualización sin recargar porque dispone de polling explícito.

## Límites deliberados

No se verifica entrega real de correo, almacenamiento remoto de imágenes ni cobro de
pagos. El alta de empleados verifica la membresía aunque la invitación no se entregue;
la configuración local existente conserva sus bindings de servicios. No añadir nuevas
credenciales ni tratar estos tests como certificación de esas integraciones.

Los QR se comprueban por destino copiado, navegación y formato de descarga; no se
comprueba su decodificación óptica. Los destinos HTTPS generados se adaptan únicamente
a HTTP y puerto 4011 para navegar al Worker local.

No se exige funcionamiento offline de recursos no descargados, métricas de rendimiento,
actualización en vivo de la carta ni compatibilidad de todo el producto en tres motores.
Los escaneos de accesibilidad mantienen el umbral existente (`serious`/`critical`) y se
complementan con teclado, foco y validaciones. La emulación móvil no sustituye una
comprobación en dispositivos físicos.
