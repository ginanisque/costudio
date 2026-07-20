export type ModelInfo = {
  id: string;
  name: string;
  age: string; // keep as string for display
  style: 'Editorial' | 'Commercial' | 'High Fashion' | 'Lifestyle';
  ethnicity: 'East Asian' | 'South Asian' | 'Black' | 'Latine' | 'Middle Eastern' | 'White';
  image: string;
};

export const modelsCatalog: ModelInfo[] = [
  {
    id: '1',
    name: 'Aria Chen',
    age: '22',
    style: 'Editorial',
    ethnicity: 'East Asian',
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137139540_ee5d13d5.webp',
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    age: '28',
    style: 'Commercial',
    ethnicity: 'Black',
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137141420_76adabea.webp',
  },
  {
    id: '3',
    name: 'Sofia Rodriguez',
    age: '25',
    style: 'High Fashion',
    ethnicity: 'Latine',
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137143461_46bc0081.webp',
  },
  {
    id: '4',
    name: 'Emma Thompson',
    age: '30',
    style: 'Lifestyle',
    ethnicity: 'White',
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137145383_b4224397.webp',
  },
  {
    id: '5',
    name: 'Raj Patel',
    age: '26',
    style: 'Editorial',
    ethnicity: 'South Asian',
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137147323_47b7c63a.webp',
  },
  {
    id: '6',
    name: 'Zara Al-Hassan',
    age: '24',
    style: 'Commercial',
    ethnicity: 'Middle Eastern',
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137149403_42d87ff9.webp',
  },
  {
    id: '7',
    name: "Liam O'Connor",
    age: '29',
    style: 'High Fashion',
    ethnicity: 'White',
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137151441_520f4db9.webp',
  },
  {
    id: '8',
    name: 'Kenji Nakamura',
    age: '27',
    style: 'Lifestyle',
    ethnicity: 'East Asian',
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137153329_c408a854.webp',
  },
];

