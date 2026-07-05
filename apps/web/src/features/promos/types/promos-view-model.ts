export interface PromoViewModel {
  desc: string;
  discount: string;
  name: string;
  oldPrice?: string;
  price: string;
  vigencia: string;
}

export interface PromosContentViewModel {
  emptyLabel: string;
  promos: PromoViewModel[];
  subtitle: string;
  title: string;
}
