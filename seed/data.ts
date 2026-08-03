/**
 * Hardcoded metadata for the seed images, so seeding never calls Anthropic and
 * always produces the same gallery (SPEC §9.1). One entry per file in
 * seed/images/, with alt text written the way the vision model should: what the
 * photo shows, under 125 characters, no "image of".
 */
export type SeedPhoto = {
  /** Filename inside seed/images/ */
  file: string
  /**
   * Album name, created on demand by the seed. Omitted on a few entries on
   * purpose, so the demo also shows photos that belong to no album.
   */
  album?: string
  altText: string
  description: string
  tags: string[]
}

export const SEED_PHOTOS: SeedPhoto[] = [
  {
    file: '48-street-001.jpg',
    album: 'Exteriors',
    altText:
      'Cafe entrance under a dark tiled awning, sign reading 48 Street in Latin and Japanese script',
    description:
      'Hanging ferns and concrete stools frame the doorway of a Japanese-styled coffee shop.',
    tags: ['exterior', 'signage', 'plants', 'architecture', 'daylight'],
  },
  {
    file: '48-street-003.jpg',
    album: 'Interiors',
    altText:
      'Dim cafe corner with two grey armchairs and a small round table against a bare concrete wall',
    description:
      'A single downlight throws a soft arc across the raw concrete behind the seating.',
    tags: ['interior', 'concrete', 'seating', 'moody', 'minimal'],
  },
  {
    file: 'bagi-kopi-signature-001.jpg',
    album: 'Exteriors',
    altText:
      'Gravel courtyard with white metal stools and a concrete sign reading Bagi Kopi Signature',
    description:
      'Customers stand under a corrugated canopy shaded by a large tree.',
    tags: ['exterior', 'courtyard', 'signage', 'people', 'daylight'],
  },
  {
    file: 'daruma-001.jpg',
    album: 'Exteriors',
    altText:
      'Whitewashed cafe with a tall steel-framed window, trailing ivy along the roofline',
    description:
      'Terracotta pots and monstera line a narrow gravel courtyard outside the glass.',
    tags: ['exterior', 'plants', 'architecture', 'courtyard', 'white'],
  },
  {
    file: 'daruma-003.jpg',
    album: 'Interiors',
    altText:
      'Sunlit balcony table and wooden chairs looking out over green treetops',
    description:
      'Afternoon light rakes across a herringbone floor on an open upper terrace.',
    tags: ['interior', 'balcony', 'wood', 'sunlight', 'greenery'],
  },
  {
    file: 'handoko-001.jpg',
    album: 'Exteriors',
    altText:
      'Small A-frame cafe with a steep dark roof, surrounded by tree ferns and palms',
    description:
      'Picnic benches and a striped umbrella sit on gravel in front of the cabin.',
    tags: ['exterior', 'architecture', 'garden', 'a-frame', 'daylight'],
  },
  {
    file: 'handoko-004.jpg',
    album: 'Food & Drink',
    altText:
      'Four takeaway boxes of club sandwiches and seasoned fries on a wooden stool',
    description:
      'Printed cartons stacked on a stool and step, shot from above in flat daylight.',
    tags: ['food', 'sandwich', 'fries', 'takeaway', 'flatlay'],
  },
  {
    file: 'imadji-coffee-001.jpg',
    album: 'Exteriors',
    altText:
      'Angular concrete coffee kiosk on a beachfront promenade, sea and cloud behind it',
    description:
      'White stools and a menu board stand on brick paving beside the serving window.',
    tags: ['exterior', 'beach', 'concrete', 'kiosk', 'architecture'],
  },
  {
    file: 'kalibata-house-21-001.jpg',
    altText:
      'Person in an orange jumper walking past the glass entrance of Kalibata House 21',
    description:
      'A cat lies in the doorway of a converted house with a steep tiled roof.',
    tags: ['exterior', 'signage', 'people', 'street', 'daylight'],
  },
  {
    file: 'kopi-toko-djawa-critical-11-001.jpg',
    album: 'Exteriors',
    altText:
      'Weathered concrete facade painted with a red Kopi Toko Djawa sign, overgrown with plants',
    description:
      'Red stools line a tiled counter under a glass canopy at the shop front.',
    tags: ['exterior', 'signage', 'red', 'plants', 'industrial'],
  },
  {
    file: 'kopi-toko-djawa-critical-11-003.jpg',
    album: 'Interiors',
    altText:
      'Deep blue cafe interior with three globe pendant lights above a long service counter',
    description:
      'Bags of roasted coffee and a pastry case line the counter under a slatted orange ceiling.',
    tags: ['interior', 'blue', 'counter', 'lighting', 'coffee'],
  },
  {
    file: 'mahboen-coffee-001.jpg',
    album: 'Exteriors',
    altText:
      'Brick and timber pavilion under a terracotta tiled roof, seen across a lawn',
    description:
      'A green Mahboen sign hangs from the eaves of a garden coffee house.',
    tags: ['exterior', 'garden', 'brick', 'architecture', 'signage'],
  },
  {
    file: 'mahboen-coffee-004.jpg',
    album: 'Food & Drink',
    altText:
      'Two iced coffees in tumblers on a wooden ledge, one topped with rosemary, one with mint',
    description: 'Paired drink shots against a brick and stone wall.',
    tags: ['drink', 'iced-coffee', 'brick', 'garnish', 'closeup'],
  },
  {
    file: 'nest-004.jpg',
    album: 'Food & Drink',
    altText:
      'Tall wine glass of layered purple and red iced drink on a pale wooden table',
    description:
      'Grapes and mint float in the glass, with a blurred tropical garden behind.',
    tags: ['drink', 'mocktail', 'purple', 'garden', 'closeup'],
  },
  {
    file: 'over-the-moon-001.jpg',
    album: 'Interiors',
    altText:
      'Cafe bar with a pink neon sign reading Over the Moon above a carved terracotta wall',
    description:
      'Two staff work behind a pale green counter on patterned tile flooring.',
    tags: ['interior', 'neon', 'bar', 'pink', 'people'],
  },
  {
    file: 'over-the-moon-004.jpg',
    album: 'Food & Drink',
    altText:
      'Strawberry yoghurt parfait in a glass on the corner of a wooden table',
    description:
      'Granola, berry compote and mint on top, with a pale green sofa behind.',
    tags: ['food', 'dessert', 'parfait', 'strawberry', 'closeup'],
  },
  {
    file: 'qual-coffee-001.jpg',
    altText:
      'Two-storey red brick coffee shop with a rooftop terrace and a serving window on the street',
    description:
      'A customer orders at the window while a barista works inside.',
    tags: ['exterior', 'brick', 'architecture', 'street', 'people'],
  },
  {
    file: 'qual-coffee-003.jpg',
    album: 'Interiors',
    altText:
      'Barista in a bucket hat at work below a yellow neon sign reading Qual Coffee',
    description:
      'Shot through the serving window past brewing gear and a paper menu.',
    tags: ['interior', 'neon', 'barista', 'people', 'coffee'],
  },
  {
    file: 'sedjuk-bakmi-kopi-001.jpg',
    altText:
      'Shopfront sign reading Sedjuk Bakmi & Kopi above a glass door framed by planters',
    description:
      'Frangipani and climbing greenery crowd the entrance of a noodle and coffee shop.',
    tags: ['exterior', 'signage', 'plants', 'street', 'daylight'],
  },
  {
    file: 'sedjuk-bakmi-kopi-004.jpg',
    album: 'Food & Drink',
    altText:
      'Two bowls of egg noodles with grilled chicken and a bowl of wonton soup on dark wood',
    description:
      'Overhead shot with chilli relish, fried shallots and clear broth alongside.',
    tags: ['food', 'noodles', 'soup', 'indonesian', 'flatlay'],
  },
]
