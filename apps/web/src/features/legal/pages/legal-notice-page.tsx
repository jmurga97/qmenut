import { LegalPageLayout } from "~/features/legal/components/legal-page-layout";
import { useLegalBranch } from "~/features/legal/hooks/use-legal-branch";

// Los marcadores [Razón social], [NIF], [Dirección fiscal] y los datos de QMenut se
// recogen en la ficha de alta (docs/onboarding-intake.md). No publicar un tenant sin
// haberlos sustituido.
export function LegalNoticePage() {
  const branch = useLegalBranch();

  if (!branch) {
    return null;
  }

  return (
    <LegalPageLayout title="Aviso legal" subtitle="Información del titular (LSSI-CE)">
      <p>
        En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio
        Electrónico (LSSI-CE), se informa de los datos identificativos del titular de este sitio web.
      </p>

      <h2>1. Titular del sitio</h2>
      <p>
        Este sitio web contiene la carta digital del establecimiento <strong>{branch.name}</strong>, cuyo titular es:
      </p>
      <ul>
        <li>Razón social: [Razón social]</li>
        <li>NIF: [NIF]</li>
        <li>Domicilio: [Dirección fiscal]</li>
        {branch.address ? <li>Establecimiento: {branch.address}</li> : null}
        {branch.phone ? <li>Teléfono: {branch.phone}</li> : null}
      </ul>

      <h2>2. Plataforma</h2>
      <p>
        El sitio se presta a través de la plataforma <strong>QMenut</strong>, operada por [Titular de QMenut], con NIF
        [NIF de QMenut] y domicilio en [Domicilio de QMenut]. Contacto: [email de contacto de QMenut]. QMenut actúa como
        proveedor tecnológico y de alojamiento del titular.
      </p>

      <h2>3. Objeto</h2>
      <p>
        El sitio tiene carácter informativo: publica la carta del establecimiento (platos, precios, alérgenos y
        promociones), sus datos de contacto y horarios. No se realizan ventas ni pagos a través del sitio.
      </p>

      <h2>4. Condiciones de uso</h2>
      <p>
        El acceso al sitio es libre y gratuito. El usuario se compromete a hacer un uso adecuado de los contenidos y a
        no emplearlos para actividades ilícitas o contrarias a la buena fe.
      </p>

      <h2>5. Propiedad intelectual e industrial</h2>
      <p>
        Los contenidos del sitio (textos de la carta, fotografías, marcas y logotipos del establecimiento) son
        titularidad del establecimiento o se publican con su autorización. El software y el diseño de la plataforma son
        titularidad de QMenut. Queda prohibida su reproducción o distribución sin autorización expresa.
      </p>

      <h2>6. Responsabilidad sobre los contenidos</h2>
      <p>
        Los precios, la disponibilidad de los platos y las promociones mostradas tienen carácter orientativo y pueden
        variar; prevalece la información facilitada en el propio establecimiento. La información sobre alérgenos se
        publica conforme al Reglamento (UE) 1169/2011 sobre la información alimentaria facilitada al consumidor; ante
        cualquier alergia o intolerancia, consulte directamente al personal del establecimiento.
      </p>

      <h2>7. Ley aplicable y jurisdicción</h2>
      <p>
        La relación entre el usuario y el titular se rige por la normativa española. Cualquier controversia se someterá
        a los juzgados y tribunales que correspondan conforme a la legislación aplicable.
      </p>

      <p className="legal-updated">Última actualización: 7 de julio de 2026.</p>
    </LegalPageLayout>
  );
}
