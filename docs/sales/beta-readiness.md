# Qmenut: preparación técnica de la beta

Revisión cerrada el 28 de agosto de 2026 sobre `develop`, el playbook comercial, el código,
la configuración de Cloudflare y los entornos desplegados. El objetivo es comenzar las
demostraciones y la reserva de plazas en una semana para España y Venezuela.

Este documento es el checklist técnico de lanzamiento. La landing, billing, reservas,
delivery, pedidos y pagos nuevos quedan fuera de esta fase.

## Decisiones cerradas

- La beta admite restaurantes de una sola sucursal. El onboarding inicial, la creación del
  tenant y la configuración del dominio pueden ser manuales.
- `countryCode` pertenece al restaurante, usa ISO 3166-1 alpha-3, es obligatorio, no tiene
  valor por defecto y no puede modificarse después del alta.
- `sourceCurrency` pertenece al restaurante y tampoco puede modificarse: `EUR` para España
  y `USD` para Venezuela. La sucursal deja de tener moneda propia.
- Los precios venezolanos se introducen y almacenan en USD. El restaurante decide la tasa
  VES que se muestra al público; la referencia externa nunca modifica los precios ni la
  tasa elegida.
- El visitante venezolano ve USD inicialmente y puede elegir USD o VES. La preferencia se
  conserva en `localStorage` y los bolívares se muestran con dos decimales.
- El acceso a fidelización por correo sin verificación es una decisión de producto. Se
  añadirá consentimiento explícito, versionado y asociado al cliente y al restaurante.
- Los cinco tenants de demostración viven únicamente en development. Producción se reserva
  para restaurantes reales de la beta.
- El formulario público de contacto se elimina por completo. Se mantienen teléfono, mapa,
  horarios y enlaces externos configurados.
- El restaurante trabaja de forma autónoma después del onboarding. Owner y admin gestionan
  configuración; staff opera carta, disponibilidad, fidelización y tasa de cambio según la
  matriz de permisos definida abajo.

## Revisión arquitectónica

La separación actual es adecuada para la beta: D1 contiene el negocio y su contenido, KV
contiene la configuración visual, el menú público resuelve el tenant por host y
`tenant-config` concentra las escrituras de tema. No hace falta introducir una nueva capa
de tenancy ni separar aplicaciones por país.

Los cambios deben respetar estos límites:

| Responsabilidad                   | Fuente de verdad                                             |
| --------------------------------- | ------------------------------------------------------------ |
| País y moneda fuente              | Restaurante en Qmenut D1                                     |
| Precios fuente                    | Enteros en moneda menor dentro de Qmenut D1                  |
| Moneda de una operación histórica | Snapshot obligatorio en pedido o pago                        |
| Tasa pública elegida              | Tabla asociada al restaurante en Qmenut D1                   |
| Referencia de mercado             | Ming Exchange Rate Worker y su propia D1                     |
| Tema publicado                    | Tenant Theme KV, escrito por `tenant-config`                 |
| Borrador del preview              | Estado local del formulario; no se persiste antes de Guardar |
| Capacidades públicas              | Derivadas del estado real de cada módulo                     |
| Consentimiento de fidelización    | Cliente + restaurante + versión + fecha en Qmenut D1         |

El riesgo arquitectónico principal es la invalidación entre D1, KV y el menú público.
Cualquier mutación que cambie lo visible —tema, tasa, moneda disponible o fidelización—
debe incrementar la versión pública de todas las sucursales del restaurante.

## P0 — antes de comenzar las demostraciones

### 1. Crear el baseline limpio de D1

- [ ] Crear las bases `qmenut-db` y `qmenut-db-dev`, cambiar los bindings de Wrangler y
      aplicar una sola vez la cadena de migraciones versionada en el repositorio.
      **Fix:** no reutilizar V2: sus migraciones registradas divergen de los archivos
      actuales. Conservar V2 temporalmente como respaldo de solo lectura.
- [ ] Recrear o importar los tenants de demostración en la nueva base de development.
      **Fix:** ejecutar el seed contra el nuevo binding y comprobar host, plantilla,
      categorías, platos, promociones y usuario de acceso de cada tenant.
- [ ] Añadir un preflight que compare migraciones locales y remotas antes de desplegar.
      **Fix:** hacer que el despliegue falle si una migración aplicada tiene el mismo nombre
      pero contenido o orden distinto.

### 2. Rehacer el contrato de país y moneda

- [ ] Sustituir la moneda actual por `restaurants.sourceCurrency` y retirar
      `branches.currency` mediante una migración generada por Drizzle.
      **Fix:** crear el campo obligatorio, poblarlo desde país durante la migración y eliminar
      nombres, fallbacks y consultas que asumen EUR por sucursal.
- [ ] Eliminar defaults silenciosos de país y moneda.
      **Fix:** exigir `countryCode` y `sourceCurrency` al crear el restaurante y validar la
      pareja `ESP/EUR` o `VEN/USD`; no exponer mutaciones posteriores.
- [ ] Mantener la moneda histórica de pedidos y pagos.
      **Fix:** hacerla obligatoria y sin default EUR, copiando `sourceCurrency` al crear cada
      operación futura.
- [ ] Generalizar el lenguaje del panel.
      **Fix:** renombrar `priceEuros`, `ticketMedioEuros`, `eurosToCents` y equivalentes a
      conceptos de dinero; mostrar el símbolo mediante `sourceCurrency`.
- [ ] Aceptar coma y punto decimal sin usar floats como contrato de persistencia.
      **Fix:** normalizar entradas como `12,50` y `12.50` a enteros de moneda menor y validar
      como máximo dos decimales para precios.

### 3. Añadir la tasa venezolana elegida por el restaurante

- [ ] Crear una tabla de tasas asociada al restaurante.
      **Fix:** guardar `restaurantId`, moneda destino `VES`, tasa positiva con máximo seis
      decimales, `isEnabled`, `updatedAt` y `updatedBy`; una tasa significa VES por 1 USD.
- [ ] Añadir la edición a Información general.
      **Fix:** mostrar tasa actual, referencia externa y ejemplo de conversión; advertir si la
      diferencia supera 10 %, pero permitir guardar. Staff también puede editar esta tarjeta
      mediante `exchangeRates.write`, aunque no pueda modificar el resto de la página.
- [ ] Impedir activar VES sin una tasa válida y permitir ocultarlo temporalmente.
      **Fix:** separar “tasa guardada” de `isEnabled` y validar la precondición en la API.
- [ ] Añadir el selector USD/VES en el menú venezolano.
      **Fix:** mostrar USD por defecto, persistir la elección por origen en `localStorage`,
      convertir solo para presentación y formatear VES con dos decimales.
- [ ] Invalidar todos los hosts del restaurante cuando cambie la tasa o su disponibilidad.
      **Fix:** incrementar `menuVersion` para cada sucursal después de confirmar la escritura.

### 4. Crear el servicio compartido de referencia cambiaria

- [ ] Crear Ming Exchange Rate Worker como aplicación independiente.
      **Fix:** cron cada dos horas, scraping resiliente de USD y EUR, D1 propia con snapshots
      históricos y conservación del último valor válido.
- [ ] Exponer la referencia solo mediante Service Binding.
      **Fix:** definir un contrato tipado de lectura y enlazar API → worker; no publicar una API
      de Internet ni asociar los snapshots a restaurantes.
- [ ] Observar fallos de captura.
      **Fix:** enviar a Sentry errores de red, parseo o persistencia e incluir la fecha del
      último snapshot en la respuesta administrativa.

### 5. Completar usuarios y membresías

- [x] Crear la página Usuarios con lista, estados y botón “Agregar usuario”.
      **Fix:** modal con nombre, correo y rol `admin` o `staff`; owner es el único que dispone
      de `users.manage`.
- [x] Crear inmediatamente cuenta y membresía.
      **Fix:** reutilizar una cuenta existente por correo sin sobrescribir su nombre, crear la
      nueva membresía de forma idempotente y permitir el mismo usuario en varios restaurantes.
- [x] Añadir cambio de rol y desactivar/reactivar.
      **Fix:** permitir cambios únicamente entre admin y staff; impedir modificar o desactivar
      al owner principal y bloquear la desactivación de la membresía propia.
- [x] Añadir `user-invite` a Ming Email Worker.
      **Fix:** correo informativo con restaurante, URL del panel y explicación del acceso por
      OTP. Enviarlo después del commit; si falla, conservar la membresía, registrar el error y
      permitir reenvío.
- [x] Aplicar la matriz mínima de permisos.
      **Fix:** owner tiene todo; admin gestiona configuración, tema, fidelización y analítica;
      staff opera carta, disponibilidad, fidelización y tasa; solo owner gestiona usuarios;
      owner y admin tienen `analytics.read` y pueden activar/desactivar fidelización.

### 6. Terminar la configuración visual y su preview

- [ ] Limitar el formulario a opciones comprensibles.
      **Fix:** plantilla, colores primario/secundario, eslogan y dos controles semánticos:
      “mostrar fotos en la carta” y “mostrar foto al abrir un plato”. No exponer sliders ni
      propiedades técnicas del preset.
- [ ] Hacer que los controles de fotos prevalezcan sobre la plantilla.
      **Fix:** aplicar ambos flags en los componentes públicos y conservarlos al cambiar de
      plantilla, incluso cuando contradigan el default del preset.
- [ ] Mostrar un preview móvil literal y sticky.
      **Fix:** cargar el menú público real en un iframe de móvil y enviar el borrador mediante
      `postMessage` con origen validado. Los cambios se ven inmediatamente sin persistirse.
- [ ] Publicar solo al pulsar Guardar.
      **Fix:** escribir la configuración completa en Tenant Theme KV mediante `tenant-config`
      y hacer el bump de versión después de una escritura exitosa.

### 7. Cerrar fidelización pública

- [x] Derivar la capacidad pública del estado real.
      **Fix:** `publicFeatures.loyalty = program.isActive && activeRewardCount > 0`; ocultar el
      tab si es falso y mantener la pantalla de “no disponible” para enlaces directos.
- [x] Añadir consentimiento debajo del correo.
      **Fix:** checkbox obligatorio con enlace a privacidad; guardar en la relación
      cliente-restaurante la versión del texto y `acceptedAt`. El servidor fija la versión y
      rechaza altas sin aceptación. No añadir OTP ni magic link.
- [x] Invalidar navegación y SEO al activar o apagar el programa.
      **Fix:** owner/admin hacen bump de `menuVersion`; retirar `/puntos` del sitemap y usar
      `noindex` cuando la capacidad esté apagada. No borrar tarjetas, puntos ni recompensas.

### 8. Eliminar el formulario de contacto

- [ ] Retirar por completo formulario, tab, ruta y eventos analíticos asociados.
      **Fix:** conservar los bloques configurados de teléfono, mapa, horarios y redes, y
      retirar la ruta de sitemap, navegación y enlaces internos.
- [ ] Corregir las afirmaciones de privacidad sobre el formulario eliminado.
      **Fix:** borrar finalidad, campos y retención de mensajes que Qmenut ya no recopila.

### 9. Corregir páginas legales por país

- [x] Seleccionar plantillas legales mediante `restaurant.countryCode`.
      **Fix:** separar contenido aprobado para España y Venezuela e inyectar únicamente los
      datos fiscales configurados del restaurante; no mostrar referencias españolas en VEN.
- [x] Actualizar privacidad para fidelización y almacenamiento técnico.
      **Fix:** describir correo, consentimiento, tarjeta local y analítica cookieless según el
      comportamiento real. La redacción final de cada país requiere validación local.

### 10. Preparar demos reproducibles

- [ ] Actualizar y desplegar `develop` en development antes de ensayar.
      **Fix:** recrear D1/KV, desplegar API, tenant-config, admin y web desde el mismo commit y
      registrar ese commit en el checklist de la demostración.
- [ ] Preparar al menos un tenant venezolano realista.
      **Fix:** `countryCode=VEN`, `sourceCurrency=USD`, zona `America/Caracas`, tasa manual VES
      activa y contenido coherente; no usar EUR ni zona horaria española.
- [ ] Publicar inglés revisado en al menos una demo.
      **Fix:** ejecutar traducción, revisar nombres/descripciones y comprobar cambio de idioma
      desde un móvil real.
- [ ] Sembrar analítica exclusivamente de demostración.
      **Fix:** dataset reproducible con cargas, platos, idiomas y acciones claramente marcado
      como datos demo; no presentar esos datos como actividad de clientes.
- [x] Evitar indexar development.
      **Fix:** aplicar `X-Robots-Tag: noindex`, meta `noindex` y `robots.txt` restrictivo a todo
      el entorno, sin depender de configurarlo tenant por tenant.
- [ ] Eliminar la dependencia de Unsplash durante la demo.
      **Fix:** copiar los assets necesarios a `qmenut-media` y actualizar los seeds.
- [ ] Corregir las fechas 1970 del sitemap.
      **Fix:** mantener `menuVersion` en milisegundos, regenerar datos y verificar `lastmod`
      después del corte limpio.

### 11. Completar configuración remota prometida en la demo

- [ ] Configurar reseñas de Google en ambos entornos de API.
      **Fix:** añadir `GOOGLE_PLACES_API_KEY` restringida a Places API (New); la misma key
      alimenta el autocompletado de direcciones de sucursal. Conectar y probar un `placeId`
      válido.
- [ ] Configurar la lectura de PostHog para analítica.
      **Fix:** añadir `POSTHOG_PROJECT_ID` y una `POSTHOG_PERSONAL_API_KEY` de solo lectura;
      declarar también `POSTHOG_API_HOST` dentro de development y ejecutar una
      materialización manual de prueba.

### 12. Recuperar una puerta de calidad fiable

- [ ] Arreglar el ciclo E2E de reset y reutilización de Workers.
      **Fix:** reiniciar servicios después de recrear D1/KV o impedir el reset automático bajo
      `E2E_REUSE_SERVERS=1`; después ejecutar las 52 pruebas sin puertos residuales.
- [ ] Ejecutar el gate completo sobre el commit de demo.
      **Fix:** `bun run check`, `bun run build`, lint de código y E2E; resolver el fallo de
      formato ajeno al runtime sin ocultar errores del producto.
- [ ] Verificar la integración Git de Cloudflare.
      **Fix:** confirmar que cada Worker usa el directorio y comando correctos y que un build
      fallido bloquea el despliegue. La integración automática no sustituye los checks.

## P1 — antes de incorporar el primer restaurante real

- [ ] Ocultar billing durante la beta.
      **Fix:** retirar rutas y navegación para todos los roles sin borrar el modelo futuro.
- [ ] Preparar el alta manual de producción.
      **Fix:** runbook para crear restaurante, owner, sucursal, tema, dominio, DNS, imágenes y
      smoke test; producción no contiene tenants ficticios.
- [ ] Hacer una prueba integral de imágenes.
      **Fix:** subida firmada → staging → cola → Ming Image Worker → media → render público.
      Buckets, colas, CORS, lifecycle y notificaciones ya existen; no reprovisionarlos.
- [ ] Sustituir el checklist de producción obsoleto.
      **Fix:** conservar un único runbook actualizado con los nuevos nombres de D1,
      migraciones completas, secretos, Service Bindings y rollback; eliminar referencias a la
      antigua base cuando el reemplazo esté verificado.
- [ ] Crear un procedimiento de exportación completa.
      **Fix:** script o runbook allowlisted que exporte datos del restaurante e inventaríe
      medios y dominio antes de seguir prometiendo portabilidad.
- [ ] Validar caché y SEO en un dominio real de beta.
      **Fix:** comprobar invalidación tras precio, tema, tasa y fidelización; revisar canonical,
      sitemap, robots y JSON-LD con la moneda fuente correcta.

## P2 — endurecimiento durante la beta

- [ ] Añadir cabeceras de seguridad.
      **Fix:** CSP compatible con imágenes y analítica, HSTS en producción,
      `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`; probar admin y web.
- [ ] Definir backup y restauración.
      **Fix:** frecuencia para D1/KV, retención, responsables y primer ensayo documentado de
      recuperación de un tenant.
- [ ] Resolver vulnerabilidades de dependencias.
      **Fix:** actualizar primero Drizzle a una versión compatible y segura; mantener la
      landing sin desplegar hasta actualizar Astro; después triage de transitivas.
- [ ] Añadir observabilidad de operaciones críticas.
      **Fix:** alertas para fallos de email, scraping, materialización analítica, imágenes y
      mutaciones de tema, con contexto de restaurante pero sin datos personales innecesarios.

## Fuera del plan de esta beta

- Landing pública de Qmenut.
- Facturación y cobro dentro del producto.
- Reservas y su futuro `reservation.isActive`.
- Nuevos flujos de pedidos, pagos o delivery.
- Carta imprimible hasta que exista una implementación terminada.
- Verificación OTP o magic link para fidelización.
- Automatización completa del onboarding, creación de tenant o configuración de dominio.

## Criterio técnico de salida

Las demostraciones pueden comenzar cuando todos los P0 estén cerrados y se haya completado
un ensayo desde cero: abrir un dominio development en un móvil, cambiar idioma, editar un
precio, cambiar tema, alternar USD/VES, publicar el cambio, observar analítica de demo y
comprobar que un rol staff no accede a acciones administrativas.

El primer restaurante real puede incorporarse cuando, además, estén cerrados los P1 y el
alta completa se haya ensayado sobre la nueva base de producción.
