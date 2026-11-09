import { QmLoyaltyCard } from "@qmenut/ui/components/qm-loyalty-card/react";

export function ShowcaseLoyalty({ name, installed }: { name: string; installed: boolean }) {
  return (
    <section className="showcase-loyalty" aria-label="Tarjeta de fidelización de demostración">
      <QmLoyaltyCard
        restaurantName={name}
        balance={6}
        target={8}
        progressLabel="Tus sellos"
        gridLabel="6 de 8 sellos"
        locked
      >
        <p slot="rewards">8 sellos · 10 % en tu próxima visita</p>
      </QmLoyaltyCard>
      {installed && <p className="showcase-callout">✓ {name} · Añadido a la pantalla de inicio</p>}
    </section>
  );
}
