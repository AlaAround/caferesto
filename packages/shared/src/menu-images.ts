const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?w=800&h=600&fit=crop&q=80&auto=format`;

/** Default images keyed by demo menu item UUID */
export const MENU_IMAGES_BY_ID: Record<string, string> = {
  'e0000000-0000-4000-8000-000000000001': IMG('photo-1504754524776-8f4f37790ca0'), // Croissant & Coffee
  'e0000000-0000-4000-8000-000000000002': IMG('photo-1626082927389-6cd086324638'), // Brik
  'e0000000-0000-4000-8000-000000000003': IMG('photo-1540420773420-3366772f4999'), // Salade
  'e0000000-0000-4000-8000-000000000004': IMG('photo-1621996346565-e3dbc646d9a9'), // Harissa Pasta
  'e0000000-0000-4000-8000-000000000005': IMG('photo-1519708227418-c8fd9a32b78a'), // Sea Bass
  'e0000000-0000-4000-8000-000000000006': IMG('photo-1568901346375-23c9450c58cd'), // Burger
  'e0000000-0000-4000-8000-000000000007': IMG('photo-1461023058943-07fcbe16d735'), // Frappuccino
  'e0000000-0000-4000-8000-000000000008': IMG('photo-1556679343-c7306c1976bc'), // Mint Tea
  'e0000000-0000-4000-8000-000000000009': IMG('photo-1519676867240-f03562e64512'), // Baklava
};

/** Keyword fallbacks for items without a stored photo_url */
export const MENU_IMAGES_BY_KEYWORD: [string, string][] = [
  ['croissant', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000001']],
  ['coffee', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000001']],
  ['brik', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000002']],
  ['salade', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000003']],
  ['salad', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000003']],
  ['pasta', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000004']],
  ['harissa', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000004']],
  ['sea bass', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000005']],
  ['fish', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000005']],
  ['burger', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000006']],
  ['frappuccino', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000007']],
  ['latte', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000007']],
  ['tea', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000008']],
  ['mint', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000008']],
  ['baklava', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000009']],
  ['dessert', MENU_IMAGES_BY_ID['e0000000-0000-4000-8000-000000000009']],
];

export const GENERIC_FOOD_IMAGE = IMG('photo-1546069901-ba9599a7e63c');

export const VENUE_HERO_IMAGE = IMG('photo-1517248135467-4c7edcad34c4').replace('800', '1200');

export function resolveMenuImage(
  itemId: string,
  photoUrl?: string | null,
  itemName?: string
): string {
  if (photoUrl?.trim()) return photoUrl;
  if (MENU_IMAGES_BY_ID[itemId]) return MENU_IMAGES_BY_ID[itemId];

  if (itemName) {
    const lower = itemName.toLowerCase();
    for (const [keyword, url] of MENU_IMAGES_BY_KEYWORD) {
      if (lower.includes(keyword)) return url;
    }
  }

  return GENERIC_FOOD_IMAGE;
}

/** All default images for backfilling the database */
export function getDefaultImagesForSeedItems(): { id: string; photoUrl: string }[] {
  return Object.entries(MENU_IMAGES_BY_ID).map(([id, photoUrl]) => ({ id, photoUrl }));
}
