import { LegalPageLayout } from "~/features/legal/components/legal-page-layout";
import { useLegalBranch } from "~/features/legal/hooks/use-legal-branch";

// Los marcadores [Razón social], [NIF], [Dirección fiscal] y los datos de QMenut se
// recogen en la ficha de alta (docs/onboarding-intake.md). No publicar un tenant sin
// haberlos sustituido.
export function PrivacyPage() {
  const branch = useLegalBranch();

  if (!branch) {
    return null;
  }

  return (
    <LegalPageLayout title="Política de privacidad" subtitle="Protección de datos (RGPD)">
      <p>
        Esta política describe cómo se tratan los datos personales de quienes visitan la carta digital de{" "}
        <strong>{branch.name}</strong>, conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018
        (LOPDGDD).
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>El responsable del tratamiento de los datos recogidos en este sitio es el titular del establecimiento:</p>
      <ul>
        <li>Razón social: [Razón social]</li>
        <li>NIF: [NIF]</li>
        <li>Domicilio: [Dirección fiscal]</li>
        <li>Contacto en materia de protección de datos: [email de contacto]</li>
      </ul>

      <h2>2. Encargado del tratamiento</h2>
      <p>
        La plataforma <strong>QMenut</strong> ([Titular de QMenut], NIF [NIF de QMenut]) presta el servicio tecnológico
        de la carta digital y actúa como encargado del tratamiento por cuenta del establecimiento, conforme al artículo
        28 del RGPD.
      </p>

      <h2>3. Datos que se tratan y finalidades</h2>
      <ul>
        <li>
          <strong>Formulario de contacto:</strong> el nombre y el mensaje que decidas enviar se utilizan únicamente para
          atender tu consulta.
        </li>
        <li>
          <strong>Datos técnicos de conexión:</strong> la dirección IP y datos básicos del navegador se procesan de
          forma transitoria para servir la página de forma segura (prevención de abuso, registro de errores). No se usan
          para elaborar perfiles.
        </li>
        <li>
          <strong>Programa de fidelidad (cuando se active):</strong> si el establecimiento activa su programa de puntos
          y decides participar, se tratarán tu email, nombre y fecha de nacimiento para gestionar tus puntos y ventajas.
          Se informará de ello en el momento del registro.
        </li>
      </ul>

      <h2>4. Analítica sin cookies</h2>
      <p>
        Para conocer qué platos y secciones despiertan más interés se utiliza <strong>PostHog</strong> (PostHog EU, con
        alojamiento de datos en la Unión Europea) en modo anónimo: sin cookies, sin almacenamiento en tu dispositivo y
        sin identificarte entre visitas. Los eventos registrados (por ejemplo, ver la carta o abrir un plato) no se
        asocian a tu identidad.
      </p>

      <h2>5. Base jurídica</h2>
      <ul>
        <li>Formulario de contacto: consentimiento del interesado (art. 6.1.a RGPD).</li>
        <li>
          Datos técnicos y analítica anónima: interés legítimo en la seguridad y mejora del servicio (art. 6.1.f RGPD).
        </li>
        <li>Programa de fidelidad: ejecución de la relación con el participante (art. 6.1.b RGPD).</li>
      </ul>

      <h2>6. Destinatarios y encargados</h2>
      <p>No se ceden datos a terceros salvo obligación legal. Prestan servicios como encargados:</p>
      <ul>
        <li>QMenut — plataforma de la carta digital.</li>
        <li>Cloudflare, Inc. — alojamiento y red de distribución de contenidos.</li>
        <li>PostHog EU — analítica anónima sin cookies (datos alojados en la UE).</li>
        <li>Proveedor de envío de email — mensajes transaccionales (p. ej. códigos de acceso).</li>
      </ul>
      <p>
        Los pagos del establecimiento a la plataforma se gestionan con Stripe y no afectan a los datos de los visitantes
        de la carta.
      </p>

      <h2>7. Conservación</h2>
      <p>
        Los mensajes de contacto se conservan el tiempo necesario para atender la consulta. Los datos del programa de
        fidelidad se conservan mientras dure la participación o hasta que solicites la baja.
      </p>

      <h2>8. Derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y
        portabilidad escribiendo al responsable ([email de contacto]), acreditando tu identidad. Si consideras que el
        tratamiento no es conforme, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).
      </p>

      <h2>9. Cookies y tecnologías de almacenamiento</h2>
      <p>
        Este sitio <strong>no utiliza cookies</strong> ni tecnologías equivalentes de almacenamiento en tu dispositivo
        con fines publicitarios o de seguimiento. Por eso no se muestra ningún banner de cookies. Solo se emplea el
        almacenamiento técnico imprescindible para el funcionamiento de la página (por ejemplo, recordar el idioma que
        has elegido para ver la carta), exento de consentimiento conforme al art. 22.2 LSSI-CE.
      </p>

      <h2>10. Cambios en esta política</h2>
      <p>
        Esta política puede actualizarse para reflejar cambios normativos o del servicio. La versión vigente estará
        siempre publicada en esta página.
      </p>

      <p className="legal-updated">Última actualización: 7 de julio de 2026.</p>
    </LegalPageLayout>
  );
}
