export interface PublicTranslation {
  entityId: string;
  entityType: "category" | "dish" | "ingredient" | "variant_group" | "variant_option";
  field: string;
  id: string;
  languageCode: string;
  value: string;
}
