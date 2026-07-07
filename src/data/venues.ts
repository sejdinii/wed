import type { CityKey, Hall, IncludedKey, NearbyPlace, Venue, VenueScores } from '@/domain/types';

/**
 * Seed catalogue — realistic North Macedonian wedding venues.
 * Photos are Unsplash placeholders; production photos come from venue onboarding.
 *
 * Pricing reflects the local convention: per-guest (куверт) with menu included,
 * typically 1.100–2.400 MKD. Kapar is either a fixed amount (the traditional
 * handshake figure) or a percentage of the estimated total with a floor.
 *
 * Seeds are written without slug/published/halls/included; `augment()` at the
 * bottom fills sensible defaults (single hall from venue capacity, standard
 * inclusions) with explicit overrides for multi-hall venues — so adding a
 * venue stays a small, safe edit.
 */

const img = (id: string): string => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

type VenueSeed = Omit<Venue, 'slug' | 'published' | 'halls' | 'included' | 'scores' | 'houseRules' | 'coords' | 'nearby'>;

const SEEDS: VenueSeed[] = [
  {
    id: 'panorama-garden',
    name: 'Панорама Гарден',
    city: 'skopje',
    venueType: 'garden',
    address: 'ул. Водњанска 41, Скопје',
    phone: '+38970111222',
    photos: [img('photo-1519167758481-83f550bb49b3'), img('photo-1464366400600-7168b8af9bc3'), img('photo-1519225421980-715cb0215aed')],
    capacityMin: 120,
    capacityMax: 450,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
        description: {
          mk: 'Топло-ладно предјадење, главно јадење, десерт и безалкохолни пијалаци.',
          sq: 'Antipastë, pjatë kryesore, ëmbëlsirë dhe pije joalkoolike.',
          en: 'Starter, main course, dessert and soft drinks.',
        },
        pricePerGuestMkd: 1450,
      },
      {
        id: 'premium',
        name: { mk: 'Премиум', sq: 'Premium', en: 'Premium' },
        description: {
          mk: 'Богато мени со риба и месо, неограничени пијалаци и торта.',
          sq: 'Meny e pasur me peshk dhe mish, pije pa limit dhe tortë.',
          en: 'Rich fish & meat menu, unlimited drinks and wedding cake.',
        },
        pricePerGuestMkd: 1850,
      },
      {
        id: 'deluxe',
        name: { mk: 'Делукс', sq: 'Deluks', en: 'Deluxe' },
        description: {
          mk: 'Дегустациско мени од пет ганга, premium бар и целосна декорација.',
          sq: 'Meny degustimi me pesë pjata, bar premium dhe dekorim i plotë.',
          en: 'Five-course tasting menu, premium bar and full decoration.',
        },
        pricePerGuestMkd: 2400,
      },
    ],
    amenities: ['garden', 'parking', 'liveMusic', 'airCon', 'bridalSuite', 'inHouseCatering', 'cityView'],
    description: {
      mk: 'Сала со панорамски поглед кон Скопје во подножјето на Водно. Градина за церемонии на отворено и балска сала за до 450 гости.',
      sq: 'Sallë me pamje panoramike të Shkupit në rrëzë të Vodnos. Kopsht për ceremoni në natyrë dhe sallë ballosh deri në 450 mysafirë.',
      en: 'A venue with a panoramic view of Skopje at the foot of Vodno. Outdoor ceremony garden and a ballroom for up to 450 guests.',
    },
    rating: 4.8,
    reviewCount: 124,
    verified: true,
    responseTimeHours: 2,
    featured: true,
    kaparPolicy: {
      kind: 'fixed',
      fixedAmountMkd: 30000,
      minAmountMkd: 30000,
      refundTiers: [
        { minDaysBeforeEvent: 180, refundPercent: 100 },
        { minDaysBeforeEvent: 90, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-07-11', '2026-07-18', '2026-08-01', '2026-08-15', '2026-08-22', '2026-09-05', '2026-09-12', '2026-09-19'],
  },
  {
    id: 'akvamarin-ohrid',
    name: 'Аквамарин',
    city: 'ohrid',
    venueType: 'lake',
    address: 'Кеј Македонија 12, Охрид',
    phone: '+38970333444',
    photos: [img('photo-1505236858219-8359eb29e329'), img('photo-1510076857177-7470076d4098'), img('photo-1469371670807-013ccf25f16a')],
    capacityMin: 80,
    capacityMax: 260,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Езерско', sq: 'Liqenore', en: 'Lakeside' },
        description: {
          mk: 'Свежа охридска пастрмка или месно мени, салати и десерт.',
          sq: 'Troftë e freskët e Ohrit ose meny mishi, sallata dhe ëmbëlsirë.',
          en: 'Fresh Ohrid trout or meat menu, salads and dessert.',
        },
        pricePerGuestMkd: 1600,
      },
      {
        id: 'premium',
        name: { mk: 'Сончев залез', sq: 'Perëndimi', en: 'Sunset' },
        description: {
          mk: 'Гала мени со морска храна, неограничен бар и торта.',
          sq: 'Meny gala me fruta deti, bar pa limit dhe tortë.',
          en: 'Seafood gala menu, unlimited bar and wedding cake.',
        },
        pricePerGuestMkd: 2100,
      },
    ],
    amenities: ['lakeView', 'terrace', 'garden', 'parking', 'liveMusic', 'bridalSuite'],
    description: {
      mk: 'Церемонија на самиот брег на Охридското Езеро, со тераса над водата и залез што гостите го паметат со години.',
      sq: 'Ceremoni në bregun e Liqenit të Ohrit, me tarracë mbi ujë dhe një perëndim që mysafirët e mbajnë mend me vite.',
      en: 'A ceremony right on the shore of Lake Ohrid, with a terrace above the water and a sunset guests remember for years.',
    },
    rating: 4.9,
    reviewCount: 89,
    verified: true,
    responseTimeHours: 3,
    featured: true,
    kaparPolicy: {
      kind: 'percent',
      percentOfEstimate: 10,
      minAmountMkd: 25000,
      refundTiers: [
        { minDaysBeforeEvent: 150, refundPercent: 100 },
        { minDaysBeforeEvent: 60, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-07-11', '2026-07-25', '2026-08-08', '2026-08-15', '2026-08-29', '2026-09-05', '2026-09-26'],
  },
  {
    id: 'grand-park-bitola',
    name: 'Гранд Парк',
    city: 'bitola',
    venueType: 'ballroom',
    address: 'бул. 1-ви Мај 155, Битола',
    phone: '+38970555666',
    photos: [img('photo-1519671482749-fd09be7ccebf'), img('photo-1478146896981-b80fe463b330'), img('photo-1507504031003-b417219a0fde')],
    capacityMin: 150,
    capacityMax: 500,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
        description: {
          mk: 'Традиционално мени со локални специјалитети и пијалаци.',
          sq: 'Meny tradicionale me specialitete lokale dhe pije.',
          en: 'Traditional menu with local specialities and drinks.',
        },
        pricePerGuestMkd: 1250,
      },
      {
        id: 'premium',
        name: { mk: 'Премиум', sq: 'Premium', en: 'Premium' },
        description: {
          mk: 'Проширено мени, неограничени пијалаци и свадбена торта.',
          sq: 'Meny e zgjeruar, pije pa limit dhe tortë dasme.',
          en: 'Extended menu, unlimited drinks and wedding cake.',
        },
        pricePerGuestMkd: 1600,
      },
      {
        id: 'deluxe',
        name: { mk: 'Гранд', sq: 'Grand', en: 'Grand' },
        description: {
          mk: 'Гала вечера, premium бар, декорација и пречек со шампањ.',
          sq: 'Darkë gala, bar premium, dekorim dhe pritje me shampanjë.',
          en: 'Gala dinner, premium bar, decoration and champagne reception.',
        },
        pricePerGuestMkd: 2000,
      },
    ],
    amenities: ['parking', 'liveMusic', 'airCon', 'inHouseCatering', 'childrenArea', 'accessible'],
    description: {
      mk: 'Најголемата балска сала во Битола — кристални лустери, бина за оркестар и капацитет за 500 гости.',
      sq: 'Salla më e madhe e ballove në Manastir — llambadarë kristali, skenë për orkestër dhe kapacitet për 500 mysafirë.',
      en: 'The largest ballroom in Bitola — crystal chandeliers, an orchestra stage and capacity for 500 guests.',
    },
    rating: 4.6,
    reviewCount: 203,
    verified: true,
    responseTimeHours: 5,
    featured: false,
    kaparPolicy: {
      kind: 'fixed',
      fixedAmountMkd: 25000,
      minAmountMkd: 25000,
      refundTiers: [
        { minDaysBeforeEvent: 120, refundPercent: 100 },
        { minDaysBeforeEvent: 45, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-07-18', '2026-08-08', '2026-08-22', '2026-09-12', '2026-09-19', '2026-10-03'],
  },
  {
    id: 'vila-bardha',
    name: 'Vila Bardha',
    city: 'tetovo',
    venueType: 'garden',
    address: 'rr. Ilindenit 88, Tetovë',
    phone: '+38970777888',
    photos: [img('photo-1523438885200-e635ba2c371e'), img('photo-1511795409834-ef04bbd61622'), img('photo-1465495976277-4387d4b0b4c6')],
    capacityMin: 100,
    capacityMax: 350,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
        description: {
          mk: 'Богата трпеза со локални јадења и пијалаци.',
          sq: 'Sofër e pasur me gjellë lokale dhe pije.',
          en: 'A rich table of local dishes and drinks.',
        },
        pricePerGuestMkd: 1300,
      },
      {
        id: 'premium',
        name: { mk: 'Премиум', sq: 'Premium', en: 'Premium' },
        description: {
          mk: 'Дегустациско мени, неограничен бар и декорација.',
          sq: 'Meny degustimi, bar pa limit dhe dekorim.',
          en: 'Tasting menu, unlimited bar and decoration.',
        },
        pricePerGuestMkd: 1700,
      },
    ],
    amenities: ['garden', 'parking', 'liveMusic', 'airCon', 'bridalSuite', 'fireworks'],
    description: {
      mk: 'Елегантна вила со градина во подножјето на Шар Планина, позната по гостопримството и огнометот на полноќ.',
      sq: 'Vilë elegante me kopsht në rrëzë të Malit Sharr, e njohur për mikpritjen dhe fishekzjarrët në mesnatë.',
      en: 'An elegant villa with a garden at the foot of the Šar Mountains, known for its hospitality and midnight fireworks.',
    },
    rating: 4.7,
    reviewCount: 156,
    verified: true,
    responseTimeHours: 2,
    featured: true,
    kaparPolicy: {
      kind: 'percent',
      percentOfEstimate: 8,
      minAmountMkd: 20000,
      refundTiers: [
        { minDaysBeforeEvent: 180, refundPercent: 100 },
        { minDaysBeforeEvent: 90, refundPercent: 60 },
        { minDaysBeforeEvent: 30, refundPercent: 25 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-07-11', '2026-07-25', '2026-08-01', '2026-08-29', '2026-09-05', '2026-09-12', '2026-10-10'],
  },
  {
    id: 'ezerski-raj',
    name: 'Езерски Рај',
    city: 'struga',
    venueType: 'lake',
    address: 'Езерски пат бб, Струга',
    phone: '+38971222333',
    photos: [img('photo-1469371670807-013ccf25f16a'), img('photo-1519225421980-715cb0215aed'), img('photo-1505236858219-8359eb29e329')],
    capacityMin: 60,
    capacityMax: 220,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
        description: {
          mk: 'Мени со свежа риба и локални вина.',
          sq: 'Meny me peshk të freskët dhe verëra lokale.',
          en: 'Fresh fish menu with local wines.',
        },
        pricePerGuestMkd: 1400,
      },
      {
        id: 'premium',
        name: { mk: 'Премиум', sq: 'Premium', en: 'Premium' },
        description: {
          mk: 'Гала мени, неограничени пијалаци и жива музика до зори.',
          sq: 'Meny gala, pije pa limit dhe muzikë live deri në agim.',
          en: 'Gala menu, unlimited drinks and live music till dawn.',
        },
        pricePerGuestMkd: 1750,
      },
    ],
    amenities: ['lakeView', 'garden', 'terrace', 'parking', 'liveMusic'],
    description: {
      mk: 'Интимна сала на брегот кај Струга — совршена за помали свадби со церемонија до самата вода.',
      sq: 'Sallë intime në breg afër Strugës — perfekte për dasma më të vogla me ceremoni buzë ujit.',
      en: 'An intimate lakeside venue near Struga — perfect for smaller weddings with a ceremony at the water’s edge.',
    },
    rating: 4.5,
    reviewCount: 67,
    verified: false,
    responseTimeHours: 8,
    featured: false,
    kaparPolicy: {
      kind: 'fixed',
      fixedAmountMkd: 20000,
      minAmountMkd: 20000,
      refundTiers: [
        { minDaysBeforeEvent: 120, refundPercent: 100 },
        { minDaysBeforeEvent: 60, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-07-18', '2026-08-15', '2026-08-22', '2026-09-19'],
  },
  {
    id: 'mermeren-dvor',
    name: 'Мермерен Двор',
    city: 'skopje',
    venueType: 'ballroom',
    address: 'ул. Индустриска 2, Скопје',
    phone: '+38971444555',
    photos: [img('photo-1507504031003-b417219a0fde'), img('photo-1464366400600-7168b8af9bc3'), img('photo-1530103862676-de8c9debad1d')],
    capacityMin: 200,
    capacityMax: 600,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
        description: {
          mk: 'Стандардно свадбено мени со пијалаци.',
          sq: 'Meny standarde dasme me pije.',
          en: 'Standard wedding menu with drinks.',
        },
        pricePerGuestMkd: 1350,
      },
      {
        id: 'premium',
        name: { mk: 'Премиум', sq: 'Premium', en: 'Premium' },
        description: {
          mk: 'Проширено мени, premium бар и декорација.',
          sq: 'Meny e zgjeruar, bar premium dhe dekorim.',
          en: 'Extended menu, premium bar and decoration.',
        },
        pricePerGuestMkd: 1800,
      },
      {
        id: 'deluxe',
        name: { mk: 'Империјал', sq: 'Imperial', en: 'Imperial' },
        description: {
          mk: 'Целосен гала пакет со шоу програма и пиротехника.',
          sq: 'Paketë e plotë gala me program shfaqjeje dhe piroteknikë.',
          en: 'Full gala package with show programme and pyrotechnics.',
        },
        pricePerGuestMkd: 2300,
      },
    ],
    amenities: ['parking', 'liveMusic', 'airCon', 'inHouseCatering', 'accessible', 'childrenArea', 'fireworks'],
    description: {
      mk: 'Мега-сала за големи свадби — мермерен фоаје, LED ѕидови и капацитет до 600 гости без компромис во услугата.',
      sq: 'Mega-sallë për dasma të mëdha — holl mermeri, mure LED dhe kapacitet deri në 600 mysafirë pa kompromis në shërbim.',
      en: 'A mega-venue for big weddings — marble foyer, LED walls and capacity for 600 guests with no compromise on service.',
    },
    rating: 4.4,
    reviewCount: 312,
    verified: true,
    responseTimeHours: 6,
    featured: false,
    kaparPolicy: {
      kind: 'fixed',
      fixedAmountMkd: 40000,
      minAmountMkd: 40000,
      refundTiers: [
        { minDaysBeforeEvent: 90, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-07-11', '2026-07-18', '2026-07-25', '2026-08-01', '2026-08-08', '2026-09-05', '2026-09-26', '2026-10-17'],
  },
  {
    id: 'imperial-kumanovo',
    name: 'Империјал',
    city: 'kumanovo',
    venueType: 'restaurant',
    address: 'ул. Гоце Делчев 77, Куманово',
    phone: '+38972666777',
    photos: [img('photo-1530103862676-de8c9debad1d'), img('photo-1519167758481-83f550bb49b3'), img('photo-1478146896981-b80fe463b330')],
    capacityMin: 100,
    capacityMax: 400,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
        description: {
          mk: 'Домашна кујна, богата салата барка и пијалаци.',
          sq: 'Kuzhinë shtëpie, sallata të pasura dhe pije.',
          en: 'Home-style cuisine, rich salad bar and drinks.',
        },
        pricePerGuestMkd: 1200,
      },
      {
        id: 'premium',
        name: { mk: 'Премиум', sq: 'Premium', en: 'Premium' },
        description: {
          mk: 'Проширено мени со неограничени пијалаци.',
          sq: 'Meny e zgjeruar me pije pa limit.',
          en: 'Extended menu with unlimited drinks.',
        },
        pricePerGuestMkd: 1500,
      },
    ],
    amenities: ['parking', 'liveMusic', 'airCon', 'childrenArea'],
    description: {
      mk: 'Позната кумановска сала со традиција од 20 години — одличен сооднос на цена и квалитет.',
      sq: 'Sallë e njohur në Kumanovë me traditë 20-vjeçare — raport i shkëlqyer çmim-cilësi.',
      en: 'A well-known Kumanovo venue with a 20-year tradition — excellent value for money.',
    },
    rating: 4.3,
    reviewCount: 98,
    verified: false,
    responseTimeHours: 12,
    featured: false,
    kaparPolicy: {
      kind: 'fixed',
      fixedAmountMkd: 15000,
      minAmountMkd: 15000,
      refundTiers: [
        { minDaysBeforeEvent: 90, refundPercent: 100 },
        { minDaysBeforeEvent: 30, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-08-15', '2026-09-12', '2026-10-03'],
  },
  {
    id: 'belvi-garden',
    name: 'Белви Гарден',
    city: 'veles',
    venueType: 'terrace',
    address: 'ул. Осми Септември 5, Велес',
    phone: '+38972888999',
    photos: [img('photo-1465495976277-4387d4b0b4c6'), img('photo-1510076857177-7470076d4098'), img('photo-1519671482749-fd09be7ccebf')],
    capacityMin: 80,
    capacityMax: 300,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
        description: {
          mk: 'Мени во три ганга со локални вина од Тиквешијата.',
          sq: 'Meny me tre pjata me verëra lokale nga Tikveshi.',
          en: 'Three-course menu with local Tikveš wines.',
        },
        pricePerGuestMkd: 1150,
      },
      {
        id: 'premium',
        name: { mk: 'Премиум', sq: 'Premium', en: 'Premium' },
        description: {
          mk: 'Богато мени, неограничен бар и торта.',
          sq: 'Meny e pasur, bar pa limit dhe tortë.',
          en: 'Rich menu, unlimited bar and wedding cake.',
        },
        pricePerGuestMkd: 1450,
      },
    ],
    amenities: ['garden', 'terrace', 'parking', 'liveMusic', 'airCon'],
    description: {
      mk: 'Градинска сала над Вардар со поглед кон стариот град — романтична атмосфера и врвна домашна кујна.',
      sq: 'Sallë kopshti mbi Vardar me pamje nga qyteti i vjetër — atmosferë romantike dhe kuzhinë shtëpie e nivelit të lartë.',
      en: 'A garden venue above the Vardar overlooking the old town — romantic atmosphere and top home-style cuisine.',
    },
    rating: 4.6,
    reviewCount: 74,
    verified: true,
    responseTimeHours: 4,
    featured: false,
    kaparPolicy: {
      kind: 'percent',
      percentOfEstimate: 10,
      minAmountMkd: 15000,
      refundTiers: [
        { minDaysBeforeEvent: 120, refundPercent: 100 },
        { minDaysBeforeEvent: 45, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-07-25', '2026-08-08', '2026-09-19', '2026-09-26'],
  },
  {
    id: 'artemida-gostivar',
    name: 'Артемида',
    city: 'gostivar',
    venueType: 'garden',
    address: 'ул. Браќа Ѓиноски 120, Гостивар',
    phone: '+38970121212',
    photos: [img('photo-1519225421980-715cb0215aed'), img('photo-1464366400600-7168b8af9bc3'), img('photo-1478146896981-b80fe463b330')],
    capacityMin: 100,
    capacityMax: 380,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
        description: {
          mk: 'Богата трпеза, локални специјалитети и пијалаци.',
          sq: 'Sofër e pasur, specialitete lokale dhe pije.',
          en: 'Rich table, local specialities and drinks.',
        },
        pricePerGuestMkd: 1250,
      },
      {
        id: 'premium',
        name: { mk: 'Премиум', sq: 'Premium', en: 'Premium' },
        description: {
          mk: 'Проширено мени, неограничен бар и торта.',
          sq: 'Meny e zgjeruar, bar pa limit dhe tortë.',
          en: 'Extended menu, unlimited bar and cake.',
        },
        pricePerGuestMkd: 1550,
      },
    ],
    amenities: ['garden', 'parking', 'liveMusic', 'airCon', 'childrenArea'],
    description: {
      mk: 'Пространа градинска сала во подножјето на Шар Планина, позната по гостопримство и богата трпеза.',
      sq: 'Sallë e gjerë me kopsht në rrëzë të Sharrit, e njohur për mikpritje dhe sofër të pasur.',
      en: 'A spacious garden venue at the foot of the Šar range, known for hospitality and generous menus.',
    },
    rating: 4.5,
    reviewCount: 82,
    verified: true,
    responseTimeHours: 4,
    featured: false,
    kaparPolicy: {
      kind: 'fixed',
      fixedAmountMkd: 18000,
      minAmountMkd: 18000,
      refundTiers: [
        { minDaysBeforeEvent: 120, refundPercent: 100 },
        { minDaysBeforeEvent: 45, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-07-18', '2026-08-15', '2026-09-05'],
  },
  {
    id: 'mareli-prilep',
    name: 'Марели',
    city: 'prilep',
    venueType: 'ballroom',
    address: 'ул. Питу Гули 8, Прилеп',
    phone: '+38970343434',
    photos: [img('photo-1519671482749-fd09be7ccebf'), img('photo-1507504031003-b417219a0fde'), img('photo-1530103862676-de8c9debad1d')],
    capacityMin: 120,
    capacityMax: 420,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
        description: {
          mk: 'Традиционално мени со пијалаци и салата барка.',
          sq: 'Meny tradicionale me pije dhe sallata.',
          en: 'Traditional menu with drinks and salad bar.',
        },
        pricePerGuestMkd: 1150,
      },
      {
        id: 'premium',
        name: { mk: 'Гала', sq: 'Gala', en: 'Gala' },
        description: {
          mk: 'Гала вечера, неограничен бар и декорација.',
          sq: 'Darkë gala, bar pa limit dhe dekorim.',
          en: 'Gala dinner, unlimited bar and decoration.',
        },
        pricePerGuestMkd: 1450,
      },
    ],
    amenities: ['parking', 'liveMusic', 'airCon', 'inHouseCatering', 'accessible'],
    description: {
      mk: 'Модерна балска сала во центарот на Прилеп со LED осветлување и бина за оркестар.',
      sq: 'Sallë moderne ballosh në qendër të Prilepit me ndriçim LED dhe skenë për orkestër.',
      en: 'A modern ballroom in central Prilep with LED lighting and an orchestra stage.',
    },
    rating: 4.4,
    reviewCount: 118,
    verified: false,
    responseTimeHours: 10,
    featured: false,
    kaparPolicy: {
      kind: 'fixed',
      fixedAmountMkd: 15000,
      minAmountMkd: 15000,
      refundTiers: [
        { minDaysBeforeEvent: 90, refundPercent: 100 },
        { minDaysBeforeEvent: 30, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-08-01', '2026-08-22', '2026-10-10'],
  },
  {
    id: 'astibo-stip',
    name: 'Астибо Гарден',
    city: 'stip',
    venueType: 'terrace',
    address: 'ул. Тошо Арсов 44, Штип',
    phone: '+38971565656',
    photos: [img('photo-1465495976277-4387d4b0b4c6'), img('photo-1519167758481-83f550bb49b3'), img('photo-1469371670807-013ccf25f16a')],
    capacityMin: 80,
    capacityMax: 280,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
        description: {
          mk: 'Мени во три ганга со локални вина.',
          sq: 'Meny me tre pjata me verëra lokale.',
          en: 'Three-course menu with local wines.',
        },
        pricePerGuestMkd: 1200,
      },
      {
        id: 'premium',
        name: { mk: 'Премиум', sq: 'Premium', en: 'Premium' },
        description: {
          mk: 'Богато мени, неограничени пијалаци и торта.',
          sq: 'Meny e pasur, pije pa limit dhe tortë.',
          en: 'Rich menu, unlimited drinks and cake.',
        },
        pricePerGuestMkd: 1500,
      },
    ],
    amenities: ['terrace', 'garden', 'parking', 'liveMusic', 'airCon'],
    description: {
      mk: 'Летна тераса над Отиња со поглед кон Исарот — омилено место за штипски свадби.',
      sq: 'Tarracë verore mbi Otinja me pamje nga Isari — vend i preferuar për dasmat e Shtipit.',
      en: 'A summer terrace above the Otinja with a view of the Isar — Štip’s favourite wedding spot.',
    },
    rating: 4.6,
    reviewCount: 59,
    verified: true,
    responseTimeHours: 5,
    featured: false,
    kaparPolicy: {
      kind: 'percent',
      percentOfEstimate: 10,
      minAmountMkd: 15000,
      refundTiers: [
        { minDaysBeforeEvent: 120, refundPercent: 100 },
        { minDaysBeforeEvent: 60, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-07-11', '2026-09-12'],
  },
  {
    id: 'carevi-kuli-strumica',
    name: 'Цареви Кули Панорама',
    city: 'strumica',
    venueType: 'panoramic',
    address: 'пат кон Цареви Кули, Струмица',
    phone: '+38971787878',
    photos: [img('photo-1523438885200-e635ba2c371e'), img('photo-1505236858219-8359eb29e329'), img('photo-1519225421980-715cb0215aed')],
    capacityMin: 90,
    capacityMax: 320,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
        description: {
          mk: 'Мени со струмички специјалитети и пијалаци.',
          sq: 'Meny me specialitete të Strumicës dhe pije.',
          en: 'Menu with Strumica specialities and drinks.',
        },
        pricePerGuestMkd: 1300,
      },
      {
        id: 'premium',
        name: { mk: 'Панорама', sq: 'Panorama', en: 'Panorama' },
        description: {
          mk: 'Гала мени, неограничен бар и огномет.',
          sq: 'Meny gala, bar pa limit dhe fishekzjarre.',
          en: 'Gala menu, unlimited bar and fireworks.',
        },
        pricePerGuestMkd: 1650,
      },
    ],
    amenities: ['cityView', 'terrace', 'parking', 'liveMusic', 'fireworks'],
    description: {
      mk: 'Сала на ридот над Струмица со панорама кон целата котлина — залезите се спектакл.',
      sq: 'Sallë në kodrën mbi Strumicë me panoramë të gjithë luginës — perëndimet janë spektakël.',
      en: 'A hilltop venue above Strumica with a panorama of the whole valley — the sunsets are a spectacle.',
    },
    rating: 4.7,
    reviewCount: 71,
    verified: true,
    responseTimeHours: 3,
    featured: true,
    kaparPolicy: {
      kind: 'fixed',
      fixedAmountMkd: 20000,
      minAmountMkd: 20000,
      refundTiers: [
        { minDaysBeforeEvent: 150, refundPercent: 100 },
        { minDaysBeforeEvent: 60, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-07-18', '2026-08-08', '2026-08-29', '2026-09-19'],
  },
  {
    id: 'tikves-dvor-kavadarci',
    name: 'Тиквешки Двор',
    city: 'kavadarci',
    venueType: 'restaurant',
    address: 'ул. Илинденска 2, Кавадарци',
    phone: '+38972909090',
    photos: [img('photo-1510076857177-7470076d4098'), img('photo-1464366400600-7168b8af9bc3'), img('photo-1511795409834-ef04bbd61622')],
    capacityMin: 70,
    capacityMax: 250,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Винарско', sq: 'Verëtari', en: 'Winery' },
        description: {
          mk: 'Мени спарено со тиквешки вина од локални визби.',
          sq: 'Meny e shoqëruar me verëra të Tikveshit nga bodrumet lokale.',
          en: 'Menu paired with Tikveš wines from local cellars.',
        },
        pricePerGuestMkd: 1400,
      },
      {
        id: 'premium',
        name: { mk: 'Резерва', sq: 'Rezervë', en: 'Reserve' },
        description: {
          mk: 'Дегустациско мени со премиум вина и торта.',
          sq: 'Meny degustimi me verëra premium dhe tortë.',
          en: 'Tasting menu with premium wines and cake.',
        },
        pricePerGuestMkd: 1750,
      },
    ],
    amenities: ['inHouseCatering', 'garden', 'parking', 'liveMusic', 'bridalSuite'],
    description: {
      mk: 'Свадба меѓу буриња и лозја — ресторан-визба во срцето на Тиквешијата.',
      sq: 'Dasmë mes fuçive dhe vreshtave — restorant-bodrum në zemër të Tikveshit.',
      en: 'A wedding among barrels and vineyards — a cellar-restaurant in the heart of Tikveš wine country.',
    },
    rating: 4.8,
    reviewCount: 64,
    verified: true,
    responseTimeHours: 2,
    featured: true,
    kaparPolicy: {
      kind: 'percent',
      percentOfEstimate: 12,
      minAmountMkd: 18000,
      refundTiers: [
        { minDaysBeforeEvent: 150, refundPercent: 100 },
        { minDaysBeforeEvent: 75, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-07-25', '2026-09-05', '2026-09-26', '2026-10-03'],
  },
  {
    id: 'apolonija-gevgelija',
    name: 'Аполонија Гарден',
    city: 'gevgelija',
    venueType: 'garden',
    address: 'ул. Маршал Тито 71, Гевгелија',
    phone: '+38972131313',
    photos: [img('photo-1469371670807-013ccf25f16a'), img('photo-1478146896981-b80fe463b330'), img('photo-1523438885200-e635ba2c371e')],
    capacityMin: 60,
    capacityMax: 240,
    menuTiers: [
      {
        id: 'classic',
        name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
        description: {
          mk: 'Медитеранско мени со локални вина.',
          sq: 'Meny mesdhetare me verëra lokale.',
          en: 'Mediterranean menu with local wines.',
        },
        pricePerGuestMkd: 1350,
      },
      {
        id: 'premium',
        name: { mk: 'Ривиера', sq: 'Riviera', en: 'Riviera' },
        description: {
          mk: 'Богато мени, неограничен бар и вечерна градина.',
          sq: 'Meny e pasur, bar pa limit dhe kopsht mbrëmjeje.',
          en: 'Rich menu, unlimited bar and an evening garden.',
        },
        pricePerGuestMkd: 1700,
      },
    ],
    amenities: ['garden', 'terrace', 'parking', 'liveMusic', 'airCon', 'childrenArea'],
    description: {
      mk: 'Јужна градина со палми и медитеранска атмосфера — најтоплата свадбена сезона во земјата.',
      sq: 'Kopsht jugor me palma dhe atmosferë mesdhetare — sezoni më i ngrohtë i dasmave në vend.',
      en: 'A southern garden with palms and a Mediterranean feel — the warmest wedding season in the country.',
    },
    rating: 4.6,
    reviewCount: 55,
    verified: false,
    responseTimeHours: 6,
    featured: false,
    kaparPolicy: {
      kind: 'fixed',
      fixedAmountMkd: 16000,
      minAmountMkd: 16000,
      refundTiers: [
        { minDaysBeforeEvent: 120, refundPercent: 100 },
        { minDaysBeforeEvent: 45, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    },
    bookedDates: ['2026-08-15', '2026-08-22', '2026-09-12'],
  },
];

/** Explicit halls for multi-hall venues; everyone else gets one default hall. */
const HALL_OVERRIDES: Record<string, Hall[]> = {
  'panorama-garden': [
    {
      id: 'garden',
      name: { mk: 'Градина Панорама', sq: 'Kopshti Panorama', en: 'Panorama Garden' },
      capacityMin: 120,
      capacityMax: 300,
      indoor: false,
      pricePerGuestAdjMkd: 0,
    },
    {
      id: 'grand',
      name: { mk: 'Гранд сала', sq: 'Salla Grand', en: 'Grand Hall' },
      capacityMin: 200,
      capacityMax: 450,
      indoor: true,
      pricePerGuestAdjMkd: 100,
    },
  ],
  'mermeren-dvor': [
    {
      id: 'crystal',
      name: { mk: 'Кристална сала', sq: 'Salla e Kristaltë', en: 'Crystal Hall' },
      capacityMin: 200,
      capacityMax: 400,
      indoor: true,
      pricePerGuestAdjMkd: 0,
    },
    {
      id: 'imperial',
      name: { mk: 'Империјал сала', sq: 'Salla Imperial', en: 'Imperial Hall' },
      capacityMin: 300,
      capacityMax: 600,
      indoor: true,
      pricePerGuestAdjMkd: 150,
    },
  ],
  'grand-park-bitola': [
    {
      id: 'grand',
      name: { mk: 'Гранд сала', sq: 'Salla Grand', en: 'Grand Hall' },
      capacityMin: 150,
      capacityMax: 500,
      indoor: true,
      pricePerGuestAdjMkd: 0,
    },
    {
      id: 'garden',
      name: { mk: 'Летна градина', sq: 'Kopshti veror', en: 'Summer Garden' },
      capacityMin: 100,
      capacityMax: 250,
      indoor: false,
      pricePerGuestAdjMkd: -50,
    },
  ],
};

const DEFAULT_INCLUDED: IncludedKey[] = ['tablesChairs', 'lightingSound', 'bridalRoom', 'parking'];

const HALL_NAME_BY_TYPE: Record<VenueSeed['venueType'], Hall['name']> = {
  garden: { mk: 'Градинска сала', sq: 'Salla me kopsht', en: 'Garden Hall' },
  lake: { mk: 'Езерска сала', sq: 'Salla e liqenit', en: 'Lake Hall' },
  ballroom: { mk: 'Голема сала', sq: 'Salla e madhe', en: 'Grand Hall' },
  terrace: { mk: 'Тераса', sq: 'Tarraca', en: 'Terrace Hall' },
  panoramic: { mk: 'Панорамска сала', sq: 'Salla panoramike', en: 'Panorama Hall' },
  restaurant: { mk: 'Главна сала', sq: 'Salla kryesore', en: 'Main Hall' },
};

const CITY_COORDS: Record<CityKey, { lat: number; lng: number }> = {
  skopje: { lat: 41.9981, lng: 21.4254 },
  tetovo: { lat: 42.0106, lng: 20.9714 },
  gostivar: { lat: 41.8, lng: 20.9083 },
  ohrid: { lat: 41.1231, lng: 20.8016 },
  bitola: { lat: 41.0328, lng: 21.3347 },
  struga: { lat: 41.1778, lng: 20.6783 },
  kumanovo: { lat: 42.1322, lng: 21.7144 },
  prilep: { lat: 41.3464, lng: 21.5542 },
  veles: { lat: 41.7153, lng: 21.7753 },
  stip: { lat: 41.7414, lng: 22.195 },
  strumica: { lat: 41.4378, lng: 22.6431 },
  kavadarci: { lat: 41.4328, lng: 22.0117 },
  gevgelija: { lat: 41.1392, lng: 22.5017 },
};

const NEAR_CENTER: NearbyPlace['label'] = { mk: 'Центар на градот', sq: 'Qendra e qytetit', en: 'City center' };
const NEAR_HOTELS: NearbyPlace['label'] = { mk: 'Хотели за гости', sq: 'Hotele për mysafirët', en: 'Guest hotels' };
const NEAR_CHURCH: NearbyPlace['label'] = { mk: 'Црква / верски објект', sq: 'Kishë / objekt fetar', en: 'Church / place of worship' };
const NEAR_AIRPORT: NearbyPlace['label'] = { mk: 'Аеродром', sq: 'Aeroporti', en: 'Airport' };

/** Deterministic one-decimal jitter so category bars look real, not uniform. */
function jitter(base: number, salt: number, spread: number): number {
  const offset = (((salt * 37) % 9) / 8 - 0.5) * spread;
  return Math.min(10, Math.round((base + offset) * 10) / 10);
}

function augment(seed: VenueSeed, index: number): Venue {
  const halls: Hall[] = HALL_OVERRIDES[seed.id] ?? [
    {
      id: 'main',
      name: HALL_NAME_BY_TYPE[seed.venueType],
      capacityMin: seed.capacityMin,
      capacityMax: seed.capacityMax,
      indoor: seed.venueType === 'ballroom' || seed.venueType === 'restaurant',
      pricePerGuestAdjMkd: 0,
    },
  ];
  // Widen the gallery: unique variant URLs so keys stay distinct (C3: swipe counter).
  const photos = [
    ...seed.photos,
    ...seed.photos.map((uri) => `${uri}&sat=-12`),
  ];
  const included: IncludedKey[] = seed.amenities.includes('inHouseCatering')
    ? [...DEFAULT_INCLUDED, 'waitstaff', 'basicDecor']
    : DEFAULT_INCLUDED;

  const base = seed.rating * 2;
  const scores: VenueScores = {
    food: jitter(base, index + 1, 0.6),
    service: jitter(base, index + 2, 0.6),
    organization: jitter(base, index + 3, 0.5),
    location: jitter(base, index + 4, 0.9),
    value: jitter(base, index + 5, 0.8),
  };

  const city = CITY_COORDS[seed.city] ?? CITY_COORDS.skopje;
  const coords = { lat: city.lat + (index % 5) * 0.004 - 0.008, lng: city.lng + (index % 7) * 0.003 - 0.009 };
  const nearby: NearbyPlace[] = [
    { label: NEAR_CENTER, km: Math.round((0.8 + (index % 5) * 0.9) * 10) / 10 },
    { label: NEAR_CHURCH, km: Math.round((0.4 + (index % 3) * 0.5) * 10) / 10 },
    { label: NEAR_HOTELS, km: Math.round((0.6 + (index % 4) * 0.7) * 10) / 10 },
    ...(seed.city === 'skopje' || seed.city === 'ohrid' ? [{ label: NEAR_AIRPORT, km: seed.city === 'skopje' ? 22 : 9 }] : []),
  ];

  return {
    ...seed,
    slug: seed.id,
    published: true,
    halls,
    included,
    photos,
    scores,
    coords,
    nearby,
    houseRules: {
      musicUntil: index % 3 === 0 ? '01:00' : index % 3 === 1 ? '00:00' : '02:00',
      fireworksAllowed: seed.amenities.includes('fireworks'),
      ownAlcoholAllowed: index % 4 === 0,
      ownDecorAllowed: index % 5 !== 4,
    },
  };
}

export const VENUES: Venue[] = SEEDS.map(augment);
