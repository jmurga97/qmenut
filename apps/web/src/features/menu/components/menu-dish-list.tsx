import type { MenuContentViewModel, MenuDishViewModel } from "~/features/menu/types/menu-view-model";

interface MenuDishListProps {
  content: MenuContentViewModel;
  onSelectDish: (dish: MenuDishViewModel) => void;
  showDishPhotos: boolean;
}

export function MenuDishList({ content, onSelectDish, showDishPhotos }: MenuDishListProps) {
  return (
    <qm-menu-list emptyLabel="No hay platos disponibles">
      <button slot="featured" type="button" className="dish-trigger" onClick={() => onSelectDish(content.featured)}>
        <qm-featured
          name={content.featured.name}
          desc={content.featured.desc}
          price={content.featured.price}
          oldPrice={content.featured.oldPrice}
          tag={content.featured.tag}
          photo={showDishPhotos}
          photoUrl={content.featured.photoUrl}
        />
      </button>
      <qm-section-header
        slot="section-header"
        num={content.sectionNum}
        tagline={content.sectionTagline}
        sectionLabel={content.sectionLabel}
        sectionCount={content.sectionCount}
      />
      {content.dishes.map((dish) => (
        <button key={dish.rowKey} type="button" className="dish-trigger" onClick={() => onSelectDish(dish)}>
          <qm-dish-row
            name={dish.name}
            desc={dish.desc}
            price={dish.price}
            oldPrice={dish.oldPrice}
            tag={dish.tag}
            photo={showDishPhotos}
            photoUrl={dish.photoUrl}
          />
        </button>
      ))}
    </qm-menu-list>
  );
}
