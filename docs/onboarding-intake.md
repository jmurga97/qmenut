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
- [ ] **Nombre remitente de emails** (opcional, ej. "Bar La Tasca") → `restaurant.emailFromName`
- [ ] **Email de respuesta** (opcional, donde quieren recibir respuestas) → `restaurant.emailReplyTo`

## 2. Datos legales (para las páginas de aviso legal y privacidad)

- [ ] **Razón social** (ej. "La Tasca Hostelería S.L.")
- [ ] **NIF/CIF**
- [ ] **Dirección fiscal completa**
- [ ] **Email de contacto para asuntos de protección de datos**

> Estos datos sustituyen los marcadores `[Razón social]`, `[NIF]` y
> `[Dirección fiscal]` de las páginas legales del menú público. No publicar
> el tenant sin revisarlos.

## 3. Sucursal (local)

- [ ] **Nombre del local** (si difiere del restaurante) → `branch.name`
- [ ] **Dirección** → `branch.address`
- [ ] **Teléfono** → `branch.phone`
- [ ] **WhatsApp** (opcional) → `branch.whatsapp`
- [ ] **Redes sociales** (Instagram, Facebook, TikTok… URLs) → `branch.socialLinks`
- [ ] **Horario por día de la semana** (apertura/cierre; 1 = lunes … 7 = domingo) → `branch.schedules`
- [ ] **Dominio deseado** (ej. `carta.barlatasca.es` o subdominio de qmenut) → `branch.customDomain`
- [ ] **Plan contratado** (basic / business) → `branch.planCode`

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

- [ ] Configurar el dominio en Cloudflare (custom domain del worker `qmenut-web`)
- [ ] Cargar el menú en el panel y verificar la carta pública
- [ ] Revisar páginas legales sin marcadores pendientes
- [ ] Descargar el QR desde el panel (sección "Código QR") y enviarlo al restaurante
- [ ] Verificar login OTP del propietario
