export interface MockContactLocation {
  name: string;
  addr: string;
  status: string;
}

export interface MockContactContent {
  title: string;
  subtitle: string;
  mapLabel: string;
  locations: MockContactLocation[];
  form: {
    nameLabel: string;
    namePlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    submitLabel: string;
  };
}

export const MOCK_CONTACT_CONTENT: MockContactContent = {
  title: "Contacto",
  subtitle: "Estamos para ayudarte",
  mapLabel: "Mapa de ubicaciones",
  locations: [
    {
      name: "Casa Marea · Centro",
      addr: "Calle Mayor 8",
      status: "Abierto",
    },
    {
      name: "Casa Marea · Puerto",
      addr: "Paseo Marítimo 2",
      status: "23:30",
    },
  ],
  form: {
    nameLabel: "Nombre",
    namePlaceholder: "Nombre",
    messageLabel: "Mensaje",
    messagePlaceholder: "Mensaje",
    submitLabel: "Enviar",
  },
};
