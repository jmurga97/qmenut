# QMenut · Ficha de alta de restaurante

Checklist de datos que hay que pedir a un restaurante antes de darlo de alta.
Cada sección se corresponde con un bloque del JSON de `apps/api/tenants/`
(ver `example.tenant.json`); puede convertirse tal cual en un Google Form.

Una vez rellenada: crear el JSON y ejecutar
`bun tenant:create --file tenants/<nombre>.json --remote` desde `apps/api`.

## 1. Datos del restaurante

- [ ] **Nombre comercial** → `restaurant.name`
- [ ] **Idioma principal de la carta** (es, en, …) → `restaurant.defaultLanguageCode`
- [ ] **Otros idiomas de la carta** → `restaurant.languages`
- [ ] **Moneda** (EUR salvo excepción) → `restaurant.defaultCurrency`
- [ ] **Zona horaria IANA** (opcional; por defecto `Europe/Madrid`) → `restaurant.timezone`
- [ ] **Razón social** → `restaurant.legal.legalName`
- [ ] **NIF/CIF** → `restaurant.legal.taxId`
- [ ] **Domicilio fiscal completo** → `restaurant.legal.legalAddress`
- [ ] **Email de contacto para protección de datos** → `restaurant.legal.dataProtectionEmail`
- [ ] **Nombre remitente de emails** (opcional, ej. "Bar La Tasca") → `restaurant.emailFromName`
- [ ] **Dirección remitente de emails** (opcional) → `restaurant.emailFromAddress`
- [ ] **Email de respuesta** (opcional, donde quieren recibir respuestas) → `restaurant.emailReplyTo`

## 2. Datos legales (para las páginas de aviso legal y privacidad)

Los cuatro campos se guardan en `restaurants` y también pueden revisarse o editarse desde la sección **Datos legales del titular** de la página Sucursal. No publicar el tenant sin completarlos y revisarlos.

## 3. Sucursal (local)

- [ ] **Nombre del local** (si difiere del restaurante) → `branch.name`
- [ ] **Dirección** → `branch.address`
- [ ] **Teléfono** → `branch.phone`
- [ ] **WhatsApp** (opcional) → `branch.whatsapp`
- [ ] **Redes sociales** (Instagram, Facebook, TikTok… URLs) → `branch.socialLinks`
- [ ] **Horario por día de la semana** (apertura/cierre; 1 = lunes … 7 = domingo) → `branch.schedules`
- [ ] **Dominio deseado** (ej. `carta.barlatasca.es` o un subdominio exacto de qmenut; siempre un `customDomain` del mismo worker, no un esquema wildcard) → `branch.customDomain`
- [ ] **Plan contratado** (basic) → `branch.planCode`

## 4. Propietario (acceso al panel)

- [ ] **Nombre** → `owner.name`
- [ ] **Email de acceso** (login por código OTP, sin contraseña) → `owner.email`

## 5. Tema visual

- [ ] **Plantilla**: fine (alta cocina) · her (herencia/clásico) · fast (fast food) · cafe (cafetería) · tapas (bar de tapas) → `theme.template`
- [ ] **Color primario** (hex, ej. `#9C2B1F`) → `theme.primary`
- [ ] **Color secundario** (hex) → `theme.secondary`
- [ ] **Eslogan** (opcional, aparece en la cabecera) → `theme.tagline`
- [ ] **Logo / fotos del local** (se suben después desde el panel)

## 6. Menú

El contenido del menú (categorías, platos con precio/descripción/alérgenos,
promociones) **se carga desde el panel de admin** tras el alta — pedir la carta
en PDF/foto como referencia:

- [ ] Carta actual (PDF, foto o enlace)
- [ ] Lista de alérgenos por plato (obligatorio según Reglamento UE 1169/2011)
- [ ] Promociones vigentes (tipo, días, horario)

## 7. Post-alta (checklist interno)

- [ ] Adjuntar el dominio como custom domain del worker `qmenut-web` en Cloudflare
- [ ] Revisar los datos legales en **Sucursal → Datos legales del titular** antes de publicar y
      comprobar `/aviso-legal` y `/privacidad` en el dominio del tenant.
- [ ] Cargar el menú en el panel y verificar la carta pública en el dominio
- [ ] Descargar el QR desde el panel (sección "Código QR") y enviarlo al restaurante
- [ ] Verificar login OTP del propietario

El script publica automáticamente el tema normalizado y `menuVersion:{host}` en KV; no
hay un paso manual de seed. Si D1 falla después de publicar, elimina ambas claves antes
de salir.
