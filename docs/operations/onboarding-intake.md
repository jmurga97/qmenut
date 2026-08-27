# Ficha de alta de restaurante

Lista de datos que hay que pedir a un restaurante antes de darlo de alta. Cada sección se
corresponde con un bloque del JSON de `apps/api/tenants/`; véase `example.tenant.json`.
La lista puede convertirse tal cual en un formulario.

Cuando la ficha esté completa, cree el JSON y seleccione explícitamente el ambiente. Las
operaciones remotas no tienen un ambiente por defecto:

```bash
bun tenant:create --file tenants/<nombre>.json --remote --env production
```

Para development use `--env development` y un hostname exclusivo de ese ambiente, por
ejemplo `cliente.dev.qmenut.app`. Puede reutilizar la misma ficha sin editarla mediante
`--host cliente.dev.qmenut.app`. Ejecute `bun tenant:environments` para consultar los
recursos y Workers seleccionados por cada ambiente.

## 1. Datos del restaurante

- [ ] Nombre comercial → `restaurant.name`
- [ ] País como código ISO 3166-1 alpha-3 en mayúsculas (por ejemplo, ESP o VEN) →
      `restaurant.countryCode`
- [ ] Idioma principal de la carta (es, en, …) → `restaurant.defaultLanguageCode`
- [ ] Otros idiomas de la carta → `restaurant.languages`
- [ ] Moneda; EUR salvo excepción → `restaurant.defaultCurrency`
- [ ] Zona horaria IANA; opcional, por defecto `Europe/Madrid` → `restaurant.timezone`
- [ ] Razón social → `restaurant.legal.legalName`
- [ ] NIF o CIF → `restaurant.legal.taxId`
- [ ] Domicilio fiscal completo → `restaurant.legal.legalAddress`
- [ ] Email de contacto para protección de datos → `restaurant.legal.dataProtectionEmail`
- [ ] Nombre del remitente de los emails; opcional, por ejemplo "Bar La Tasca" →
      `restaurant.emailFromName`
- [ ] Dirección del remitente de los emails; opcional → `restaurant.emailFromAddress`
- [ ] Email de respuesta; opcional, donde quieren recibir las respuestas →
      `restaurant.emailReplyTo`

## 2. Datos legales

Los cuatro campos legales se guardan en `restaurants` y alimentan las páginas de aviso
legal y privacidad. También pueden revisarse o editarse desde la sección "Datos legales
del titular" de la página Sucursal. No publique el tenant sin completarlos y revisarlos.

## 3. Sucursal

- [ ] Nombre del local, si difiere del restaurante → `branch.name`
- [ ] Dirección → `branch.address`
- [ ] Teléfono → `branch.phone`
- [ ] WhatsApp; opcional → `branch.whatsapp`
- [ ] Redes sociales (URLs de Instagram, Facebook, TikTok…) → `branch.socialLinks`
- [ ] Horario por día de la semana, con apertura y cierre; 1 = lunes … 7 = domingo →
      `branch.schedules`
- [ ] Dominio deseado, por ejemplo `carta.barlatasca.es`, o un subdominio exacto de
      qmenut. Siempre es un `customDomain` del mismo worker, nunca un esquema wildcard →
      `branch.customDomain`
- [ ] Plan contratado (basic) → `branch.planCode`

## 4. Propietario

- [ ] Nombre → `owner.name`
- [ ] Email de acceso; el login es por código OTP, sin contraseña → `owner.email`

## 5. Tema visual

- [ ] Plantilla: fine (alta cocina), her (herencia o clásico), fast (fast food), cafe
      (cafetería) o tapas (bar de tapas) → `theme.template`
- [ ] Color primario en hexadecimal, por ejemplo `#9C2B1F` → `theme.primary`
- [ ] Color secundario en hexadecimal → `theme.secondary`
- [ ] Eslogan; opcional, aparece en la cabecera → `theme.tagline`
- [ ] Logo y fotos del local; se suben después desde el panel

## 6. Menú

El contenido del menú (categorías, platos con precio, descripción y alérgenos, y
promociones) se carga desde el panel de administración después del alta. Pida la carta en
PDF o foto como referencia:

- [ ] Carta actual, en PDF, foto o enlace
- [ ] Lista de alérgenos por plato; obligatoria según el Reglamento UE 1169/2011
- [ ] Promociones vigentes, con tipo, días y horario

## 7. Tareas posteriores al alta

- [ ] Adjuntar el dominio exacto al Worker indicado por el script: `qmenut-web` en
      producción o `qmenut-web-dev` en development.
- [ ] Revisar los datos legales en Sucursal > Datos legales del titular antes de publicar,
      y comprobar `/aviso-legal` y `/privacidad` en el dominio del tenant.
- [ ] Cargar el menú en el panel y verificar la carta pública en el dominio.
- [ ] Descargar el QR desde el panel, en la sección "Código QR", y enviarlo al
      restaurante.
- [ ] Verificar el login OTP del propietario.

El script publica automáticamente el tema normalizado y `menuVersion:{host}` en KV; no hay
un paso manual de seed. Si D1 falla después de publicar, el script elimina ambas claves
antes de salir.

No reutilice el mismo hostname entre ambientes. El hostname guardado en D1, la clave de KV
y el custom domain de Cloudflare deben coincidir exactamente.
