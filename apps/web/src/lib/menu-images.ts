import { resolveMenuImage, VENUE_HERO_IMAGE } from '@tableorder/shared';

export { resolveMenuImage, GENERIC_FOOD_IMAGE, MENU_IMAGES_BY_ID, VENUE_HERO_IMAGE } from '@tableorder/shared';

export function getMenuImage(itemId: string, photoUrl?: string | null, itemName?: string): string {
  return resolveMenuImage(itemId, photoUrl, itemName);
}

export const VENUE_HERO = VENUE_HERO_IMAGE;
