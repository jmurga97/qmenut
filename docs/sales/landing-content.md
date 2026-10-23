# Landing content

What the QMenut landing says, section by section. Design, motion and visual hooks are
defined separately; this page only fixes the message and the structure. Copy is in
Spanish because the landing targets Spanish speakers (Venezuela first, then Spain).

Status: draft, 23 October 2026. Sources of truth: [`plan-features.md`](./plan-features.md)
for scope, [`playbook-comercial.md`](./playbook-comercial.md) for claims we never make.

## Decisions

- Slogan: **La presencia digital de tu restaurante, a la altura de lo que sirves.**
- Buyer: new concepts with a strong brand that care how they present themselves. Fine
  dining leans on reservations and languages; cafés lean on loyalty and promotions.
- Pricing: Basic 15 USD, Business 55 USD (Venezuela goes first), 14-day trial with card up
  front. No annual plan yet.
  Launch promotions are never published; they are offered at the owner's discretion.
- Delivery is shown as **coming soon** and gets its own prominent section: it is the
  biggest gain the product will offer.
- Reservations are listed as a Business feature with a "Próximamente" badge until shipped.
- Every sign-up CTA points to one generic page (`/empezar`) until self-serve sign-up exists.
- The five demo tenants are linked so visitors can see the look and feel.
- No privacy or "no cookies" claims on the landing.

## The core story

Diners reject QR menus at the table, but they check the menu on their phone before going.
QMenut does not replace the printed menu; it wins the decision before the guest arrives.

| At the table                                                | Before going                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| 88% prefer a paper menu (Technomic via Restaurant Business) | 83% check the menu before going out; 50% choose their dish |
| 66% dislike pulling out the phone as soon as they sit down  | 77% visit the restaurant's website before deciding         |
| QR menus were the most rejected pandemic change (Axios)     | 31% rule out a restaurant whose website looks outdated     |

Every figure must link to its primary source before publishing (see To-dos).

## Feature → owner gain

The home page groups features by what the owner gets, following the guest's path:
**que te encuentren → que te elijan → que vuelvan**, plus two owner-side groups.

| Group                  | Features                                                             | Plan                    |
| ---------------------- | -------------------------------------------------------------------- | ----------------------- |
| Que te encuentren      | Structured menu for Google and AI (JSON-LD, sitemap)                 | Both                    |
|                        | Own domain                                                           | Business                |
|                        | Languages + hreflang                                                 | Business                |
|                        | Google reviews and photo gallery                                     | Business                |
| Que te elijan          | Mobile-first menu, photos, variants, extras, allergens               | Both                    |
|                        | USD prices with bolívares at the rate you choose                     | Both                    |
|                        | Five templates, brand colors and fonts, no QMenut badge              | Business                |
|                        | Featured dishes and promotions                                       | Business                |
| Que vuelvan            | Loyalty points without an app or plastic card                        | Business                |
|                        | Installable app on the guest's home screen                           | Business                |
|                        | Reservations                                                         | Business (próximamente) |
| Que no te cueste       | Admin panel, sold-out toggle, QR and printable QR                    | Both                    |
|                        | Time-based menus, printable PDF menu, staff roles, several locations | Business                |
| Que sepas qué funciona | Analytics and the email digest                                       | Business                |
| Que el canal sea tuyo  | Pickup and delivery orders from your own channel                     | Delivery (próximamente) |

### How we phrase visibility and the domain

Visibility is a promise of **both** plans; the domain is a promise of **ownership**, not
visibility. Never say or imply that a `qmenut.app` address is invisible to Google.

> **Si no te pueden leer, no existes.**
> Una carta en PDF, una foto del menú o un post de Instagram no le dicen nada a Google ni a
> ChatGPT: no pueden leer tus platos ni tus precios. En QMenut cada plato, precio y horario
> se publica en un formato que los buscadores y los asistentes de IA entienden y pueden
> recomendar.

> **Tu nombre, no el nuestro.** _(Business)_
> Tu menú en `turestaurante.com`: la dirección que pones en Google, en Instagram y en
> WhatsApp. Cada enlace y cada reseña suma a tu marca, no a una plataforma. El dominio está
> incluido mientras tengas la suscripción, y si un día te vas, se va contigo.

Basic is described positively, never as a lesser domain:

> Tu menú en `turestaurante.qmenut.app`, listo para compartir desde el primer día.

## Pages

| Page                           | Purpose                                                          | When  |
| ------------------------------ | ---------------------------------------------------------------- | ----- |
| `/`                            | Features home: the story, the gains, demos, pricing summary, FAQ | Now   |
| `/precios`                     | Full plan comparison and billing FAQ                             | Now   |
| `/empezar`                     | Generic placeholder every sign-up CTA lands on                   | Now   |
| `/aviso-legal`, `/privacidad`  | Legal (LSSI in Spain)                                            | Now   |
| `/condiciones`                 | Terms of service for a paid subscription                         | Now   |
| `/cafeterias`, `/restaurantes` | One page per audience                                            | Later |

## Home `/`

1. **Navigation.** Funcionalidades, Demos, Precios, and the CTA "Empieza gratis".

2. **Hero.**
   - H1: La presencia digital de tu restaurante, a la altura de lo que sirves.
   - Sub: Tu menú, tu marca y tu dominio en un canal propio que Google y la IA entienden.
     Para que te elijan antes de llegar y vuelvan después.
   - CTAs: "Prueba 14 días" → `/empezar`; "Ver demos" → section 5.

3. **El giro: la decisión se toma antes de llegar.**
   - Heading: Nadie quiere mirar el móvil en la mesa. Todos lo miran antes de ir.
   - Body: QMenut no sustituye tu carta impresa. Está donde se decide a qué restaurante ir:
     en el móvil, horas antes de sentarse.
   - The two-column data table from "The core story", with sources.

4. **Que te encuentren.** The "Si no te pueden leer, no existes" block, then the domain
   block, then languages (turistas que entienden tu menú, y Google les muestra el idioma
   correcto) and Google reviews (la opinión de otros comensales, justo cuando deciden).
   Proof: Nisia's real menu and what Google reads from it (see section 10).

5. **Que te elijan: tu marca, en cada plato.**
   - Heading: Que se vea como tu restaurante, no como una plantilla.
   - The five demos as cards, each opening the live menu:
     `fine` (alta cocina), `her` (cocina de herencia), `fast` (fast casual),
     `cafe` (cafetería), `tapas` (bar de tapas).
   - Supporting gains: photos, allergens and variants (menos preguntas al personal, más
     confianza para quien tiene alergias), featured dishes and promotions (dirige la
     atención a tu especialidad o a lo que más margen te deja).
   - For Venezuela: Precios en dólares y en bolívares, a la tasa que tú decidas.

6. **Que vuelvan.**
   - Loyalty: Una razón para volver, sin app ni tarjeta de cartón.
   - Installable app: Tus clientes habituales te tienen en la pantalla de inicio.
   - Reservations, badge "Próximamente": Que reserven desde tu propio canal.

7. **Que no te cueste.**
   - Heading: ¿Cambió un precio? ¿Se acabó un plato? Diez segundos y listo.
   - Sold-out toggle, editing, time-based menus (desayuno, comida y cena cambian solos),
     staff roles (tu equipo marca agotados sin ver la facturación), several locations.
   - Paper stays: QR and printable PDF menu. Tu carta en papel sigue en la mesa; QMenut la
     acompaña.

8. **Que sepas qué funciona.**
   - Heading: Señales, no suposiciones.
   - Which dishes get attention, which languages guests use, how many tap to call or get
     directions, delivered to the owner's email. Never framed as sales.

9. **Delivery, próximamente.** The most prominent section after the hero.
   - Heading: Tus pedidos, en tu propio canal.
   - Body: Pronto podrás recibir pedidos para recoger y a domicilio desde tu menú QMenut:
     con tu marca, con tus clientes y con una cuota fija, no un porcentaje de cada pedido.
   - Gains: the customer is yours (sus datos, su relación, su próxima visita), your brand
     instead of a marketplace's, online payment to your own account, an order inbox, and
     later your own riders and fleet.
   - CTA: "Quiero enterarme primero" → `/empezar`.
   - Rules from the playbook: no launch date, no savings percentage, no marketplace
     commission figures without a cited source.

10. **Ya funciona en Valencia.** Nisia Café + Bocatas
    ([nisiacafeteria.com](https://nisiacafeteria.com)): own domain, live menu, and a short
    look at what Google reads from it (dishes, prices, hours). Needs Nisia's OK.

11. **Precios.** Three cards: Basic 15 USD/mes, Business 55 USD/mes, Delivery "Próximamente".
    One line of what each is for, "14 días de prueba", and a link to `/precios`.

12. **Preguntas frecuentes.** From the playbook's objections:
    - ¿Tengo que quitar la carta en papel? No.
    - Ya estoy en Instagram y en Google, ¿para qué lo necesito?
    - ¿No me basta con un PDF?
    - ¿Mis clientes tienen que descargar una app? No.
    - ¿De quién es el dominio? Tuyo.
    - ¿Puedo pasar de Basic a Business? Sí, sin perder nada.
    - ¿Cómo funciona la prueba? 14 días; se pide tarjeta y no se cobra hasta el día 15.
    - ¿Qué pasa si cancelo?
    - ¿Tiene pedidos o delivery? Próximamente.

13. **Cierre.** The slogan again and "Prueba 14 días" → `/empezar`.

## Pricing `/precios`

- Three columns: **Basic** (un menú digital sencillo con tu logo y tu portada),
  **Business** (todo QMenut: tu dominio, tu marca, idiomas, fidelización, analítica),
  **Delivery** (próximamente, sobre Business; no price until launch).
- The full comparison table, grouped by the same five gains as the home page, with the
  scope from `plan-features.md` as implemented in `packages/permissions`.
- "14 días de prueba en cualquier plan" under the prices.
- Billing FAQ: trial and card, change of plan, cancellation, domain and data.

## To-dos

- [ ] Scannable demo: a QR on the landing that opens a demo menu on the visitor's phone.
- [ ] Trace every statistic to its primary source and link it.
- [ ] Ask Nisia for permission to feature them, and for a testimonial.
- [ ] Move the demo tenants to production hosts; `*.dev.qmenut.app` is the development
      environment and can break or reset.
- [ ] Remove the "Próximamente" badge from reservations when it ships.
- [ ] Replace `/empezar` with self-serve sign-up.
- [ ] Delivery waitlist form (today its CTA lands on `/empezar`).
- [ ] Annual plan on `/precios`.
- [ ] EUR prices (and VAT line) when Spain launches.
- [ ] Audience pages: `/cafeterias`, `/restaurantes`.

## Open questions

1. "Menú" or "carta"? Venezuela says menú; Spain says carta, and there menú often means
   menú del día. This draft uses menú for the product and carta for paper.
2. Should the landing compete for searches like "menú digital para restaurantes" (a blog
   or comparison pages), or is it only where prospects are sent?
