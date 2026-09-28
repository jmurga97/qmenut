import { DragIcon, EditIcon, ImageIcon, StarIcon, TrashIcon } from "@jmurga97/components/icon";

import type { IconProps } from "@jmurga97/components/icon";

const ICONS = { drag: DragIcon, edit: EditIcon, image: ImageIcon, star: StarIcon, trash: TrashIcon };

export type IconName = keyof typeof ICONS;

export function Icon({ name, ...props }: IconProps & { name: IconName }) {
  const Glyph = ICONS[name];
  return <Glyph {...props} />;
}
