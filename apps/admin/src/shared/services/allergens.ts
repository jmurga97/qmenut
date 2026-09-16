const ALLERGEN_LABELS: Record<string, string> = {
  celery: "Apio",
  crustaceans: "Crustáceos",
  eggs: "Huevos",
  fish: "Pescado",
  gluten: "Gluten",
  lupin: "Altramuces",
  milk: "Leche",
  molluscs: "Moluscos",
  mustard: "Mostaza",
  nuts: "Frutos de cáscara",
  peanuts: "Cacahuetes",
  sesame: "Sésamo",
  soybeans: "Soja",
  sulphites: "Sulfitos",
};

export function toAllergenDisplayLabel(code: string) {
  return ALLERGEN_LABELS[code] ?? code;
}
