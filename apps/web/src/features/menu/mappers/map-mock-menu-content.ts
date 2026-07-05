import type { MockDish, MockMenuContent } from "~/features/menu/mock/mock-menu-content";
import type { MenuContentViewModel, MenuDishViewModel } from "~/features/menu/types/menu-view-model";

const MOCK_DISH_REPEAT_COUNT = 3;

function mapMockDish({ dish, rowKey }: { dish: MockDish; rowKey: string }): MenuDishViewModel {
  return {
    allergens: dish.allergens,
    desc: dish.desc,
    extras: dish.extras,
    name: dish.name,
    oldPrice: dish.oldPrice,
    photoUrl: dish.photoUrl,
    price: dish.price,
    rowKey,
    tag: dish.tag,
  };
}

export function mapMockMenuContent(content: MockMenuContent): MenuContentViewModel {
  const dishes = Array.from({ length: MOCK_DISH_REPEAT_COUNT }, (_, groupIndex) =>
    content.dishes.map((dish) =>
      mapMockDish({
        dish,
        rowKey: `${groupIndex}-${dish.name}`,
      }),
    ),
  ).flat();

  return {
    dishes,
    featured: mapMockDish({ dish: content.featured, rowKey: "featured" }),
    heroLabel: content.heroLabel,
    logoLabel: content.logoLabel,
    sectionCount: content.sectionCount,
    sectionLabel: content.sectionLabel,
    sectionNum: content.sectionNum,
    sectionTagline: content.sectionTagline,
  };
}
