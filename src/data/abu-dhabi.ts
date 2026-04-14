// Abu Dhabi real estate hierarchy and mock transaction data

export interface Area {
  id: string;
  name: string;
  nameAr?: string;
  lat: number;
  lng: number;
  projects: Project[];
}

export interface Project {
  id: string;
  name: string;
  developer: string;
  areaId: string;
  buildings: Building[];
}

export interface Building {
  id: string;
  name: string;
  projectId: string;
  floors: number;
  units: number;
}

export type PropertyType =
  | "Apartment"
  | "Villa"
  | "Townhouse"
  | "Penthouse"
  | "Land"
  | "Office"
  | "Retail";
export type TransactionType = "Sale" | "Rental";
export type PropertyStatus = "Ready" | "Off-Plan";
export type PaymentMethod = "Cash" | "Mortgage";

export interface Transaction {
  id: string;
  date: string;
  area: string;
  areaId: string;
  project: string;
  projectId: string;
  building: string;
  buildingId: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  status: PropertyStatus;
  bedrooms: number; // 0 = Studio
  bathrooms: number;
  maidsRoom: boolean;
  size: number; // sqft
  price: number; // AED
  pricePerSqft: number;
  paymentMethod: PaymentMethod;
  developer: string;
  floor: number;
  unitNumber: string;
}

// ── Abu Dhabi Areas with verified real project/building data ─────────
export const areas: Area[] = [
  // ── Al Reem Island ──────────────────────────────────────────────
  {
    id: "al-reem",
    name: "Al Reem Island",
    lat: 24.4975,
    lng: 54.4025,
    projects: [
      {
        id: "shams-abudhabi",
        name: "Shams Abu Dhabi",
        developer: "Aldar Properties",
        areaId: "al-reem",
        buildings: [
          { id: "sky-tower", name: "Sky Tower", projectId: "shams-abudhabi", floors: 80, units: 560 },
          { id: "sun-tower", name: "Sun Tower", projectId: "shams-abudhabi", floors: 64, units: 480 },
          { id: "gate-tower-1", name: "Gate Tower 1", projectId: "shams-abudhabi", floors: 64, units: 440 },
          { id: "gate-tower-2", name: "Gate Tower 2", projectId: "shams-abudhabi", floors: 64, units: 440 },
          { id: "gate-tower-3", name: "Gate Tower 3", projectId: "shams-abudhabi", floors: 64, units: 440 },
          { id: "the-arc", name: "The Arc", projectId: "shams-abudhabi", floors: 22, units: 180 },
        ],
      },
      {
        id: "marina-square",
        name: "Marina Square",
        developer: "Tamouh Investments",
        areaId: "al-reem",
        buildings: [
          { id: "tala-tower", name: "Tala Tower", projectId: "marina-square", floors: 49, units: 380 },
          { id: "ocean-terrace", name: "Ocean Terrace", projectId: "marina-square", floors: 50, units: 390 },
          { id: "rak-tower", name: "RAK Tower", projectId: "marina-square", floors: 43, units: 330 },
          { id: "al-maha-tower", name: "Al Maha Tower", projectId: "marina-square", floors: 43, units: 330 },
          { id: "burooj-views", name: "Burooj Views", projectId: "marina-square", floors: 45, units: 340 },
          { id: "marina-heights-1", name: "Marina Heights 1", projectId: "marina-square", floors: 30, units: 220 },
          { id: "marina-heights-2", name: "Marina Heights 2", projectId: "marina-square", floors: 30, units: 220 },
        ],
      },
      {
        id: "city-of-lights",
        name: "City of Lights",
        developer: "Tamouh Investments",
        areaId: "al-reem",
        buildings: [
          { id: "hydra-avenue-1", name: "Hydra Avenue Tower 1", projectId: "city-of-lights", floors: 29, units: 210 },
          { id: "hydra-avenue-2", name: "Hydra Avenue Tower 2", projectId: "city-of-lights", floors: 29, units: 210 },
          { id: "hydra-avenue-3", name: "Hydra Avenue Tower 3", projectId: "city-of-lights", floors: 24, units: 170 },
          { id: "sigma-tower-1", name: "Sigma Tower 1", projectId: "city-of-lights", floors: 28, units: 200 },
          { id: "sigma-tower-2", name: "Sigma Tower 2", projectId: "city-of-lights", floors: 28, units: 200 },
          { id: "horizon-tower-a", name: "Horizon Tower A", projectId: "city-of-lights", floors: 57, units: 420 },
          { id: "horizon-tower-b", name: "Horizon Tower B", projectId: "city-of-lights", floors: 38, units: 280 },
        ],
      },
      {
        id: "najmat-abudhabi",
        name: "Najmat Abu Dhabi",
        developer: "Reem Developers",
        areaId: "al-reem",
        buildings: [
          { id: "reem-bay-1", name: "Al Reem Bay Tower 1", projectId: "najmat-abudhabi", floors: 29, units: 210 },
          { id: "reem-bay-2", name: "Al Reem Bay Tower 2", projectId: "najmat-abudhabi", floors: 29, units: 210 },
        ],
      },
    ],
  },
  // ── Saadiyat Island ─────────────────────────────────────────────
  {
    id: "saadiyat",
    name: "Saadiyat Island",
    lat: 24.5365,
    lng: 54.4344,
    projects: [
      {
        id: "mamsha-saadiyat",
        name: "Mamsha Al Saadiyat",
        developer: "Aldar Properties",
        areaId: "saadiyat",
        buildings: [
          { id: "mamsha-a", name: "Block A", projectId: "mamsha-saadiyat", floors: 8, units: 120 },
          { id: "mamsha-b", name: "Block B", projectId: "mamsha-saadiyat", floors: 8, units: 120 },
          { id: "mamsha-c", name: "Block C", projectId: "mamsha-saadiyat", floors: 8, units: 100 },
        ],
      },
      {
        id: "saadiyat-beach",
        name: "Saadiyat Beach Residences",
        developer: "Aldar Properties",
        areaId: "saadiyat",
        buildings: [
          { id: "sbr-1", name: "Building 1", projectId: "saadiyat-beach", floors: 5, units: 60 },
          { id: "sbr-2", name: "Building 2", projectId: "saadiyat-beach", floors: 5, units: 60 },
          { id: "sbr-3", name: "Building 3", projectId: "saadiyat-beach", floors: 5, units: 60 },
          { id: "sbr-4", name: "Building 4", projectId: "saadiyat-beach", floors: 5, units: 60 },
          { id: "sbr-5", name: "Building 5", projectId: "saadiyat-beach", floors: 5, units: 60 },
          { id: "sbr-6", name: "Building 6", projectId: "saadiyat-beach", floors: 5, units: 60 },
        ],
      },
      {
        id: "stregis-residences",
        name: "St. Regis Residences",
        developer: "Aldar Properties",
        areaId: "saadiyat",
        buildings: [
          { id: "stregis-1", name: "Building 1", projectId: "stregis-residences", floors: 7, units: 70 },
          { id: "stregis-2", name: "Building 2", projectId: "stregis-residences", floors: 7, units: 70 },
          { id: "stregis-3", name: "Building 3", projectId: "stregis-residences", floors: 7, units: 70 },
        ],
      },
      {
        id: "saadiyat-lagoons",
        name: "Saadiyat Lagoons",
        developer: "Aldar Properties",
        areaId: "saadiyat",
        buildings: [
          { id: "lagoons-villas", name: "Villas", projectId: "saadiyat-lagoons", floors: 2, units: 80 },
        ],
      },
      {
        id: "nobu-residences",
        name: "Nobu Residences",
        developer: "Aldar Properties",
        areaId: "saadiyat",
        buildings: [
          { id: "nobu-1", name: "Tower 1", projectId: "nobu-residences", floors: 12, units: 100 },
          { id: "nobu-2", name: "Tower 2", projectId: "nobu-residences", floors: 10, units: 80 },
        ],
      },
      {
        id: "park-view",
        name: "Park View",
        developer: "Bloom Holding",
        areaId: "saadiyat",
        buildings: [
          { id: "parkview-1", name: "Tower 1", projectId: "park-view", floors: 10, units: 90 },
        ],
      },
    ],
  },
  // ── Yas Island ──────────────────────────────────────────────────
  {
    id: "yas-island",
    name: "Yas Island",
    lat: 24.4891,
    lng: 54.6057,
    projects: [
      {
        id: "yas-acres",
        name: "Yas Acres",
        developer: "Aldar Properties",
        areaId: "yas-island",
        buildings: [
          { id: "cedars-villas", name: "The Cedars Villas", projectId: "yas-acres", floors: 2, units: 200 },
          { id: "royal-oak-villas", name: "The Royal Oak Villas", projectId: "yas-acres", floors: 2, units: 180 },
          { id: "yas-acres-townhouses", name: "Townhouses", projectId: "yas-acres", floors: 3, units: 300 },
        ],
      },
      {
        id: "waters-edge",
        name: "Waters Edge",
        developer: "Aldar Properties",
        areaId: "yas-island",
        buildings: [
          { id: "waters-edge-1", name: "Tower 1", projectId: "waters-edge", floors: 6, units: 80 },
          { id: "waters-edge-2", name: "Tower 2", projectId: "waters-edge", floors: 6, units: 80 },
          { id: "waters-edge-3", name: "Tower 3", projectId: "waters-edge", floors: 6, units: 80 },
          { id: "waters-edge-4", name: "Tower 4", projectId: "waters-edge", floors: 6, units: 80 },
          { id: "waters-edge-5", name: "Tower 5", projectId: "waters-edge", floors: 6, units: 80 },
        ],
      },
      {
        id: "mayan",
        name: "Mayan",
        developer: "Aldar Properties",
        areaId: "yas-island",
        buildings: [
          { id: "mayan-1", name: "Building 1", projectId: "mayan", floors: 10, units: 130 },
          { id: "mayan-2", name: "Building 2", projectId: "mayan", floors: 10, units: 130 },
          { id: "mayan-3", name: "Building 3", projectId: "mayan", floors: 10, units: 130 },
          { id: "mayan-4", name: "Building 4", projectId: "mayan", floors: 10, units: 130 },
          { id: "mayan-5", name: "Building 5", projectId: "mayan", floors: 10, units: 130 },
        ],
      },
      {
        id: "ansam",
        name: "Ansam",
        developer: "Aldar Properties",
        areaId: "yas-island",
        buildings: [
          { id: "ansam-1", name: "Building 1", projectId: "ansam", floors: 8, units: 100 },
          { id: "ansam-2", name: "Building 2", projectId: "ansam", floors: 8, units: 100 },
          { id: "ansam-3", name: "Building 3", projectId: "ansam", floors: 8, units: 100 },
          { id: "ansam-4", name: "Building 4", projectId: "ansam", floors: 6, units: 70 },
        ],
      },
      {
        id: "noya",
        name: "Noya",
        developer: "Aldar Properties",
        areaId: "yas-island",
        buildings: [
          { id: "noya-luma", name: "Noya Luma Townhouses", projectId: "noya", floors: 3, units: 250 },
          { id: "noya-viva", name: "Noya Viva Villas", projectId: "noya", floors: 2, units: 150 },
        ],
      },
    ],
  },
  // ── Al Raha Beach ───────────────────────────────────────────────
  {
    id: "al-raha",
    name: "Al Raha Beach",
    lat: 24.4547,
    lng: 54.5653,
    projects: [
      {
        id: "al-bandar",
        name: "Al Bandar",
        developer: "Aldar Properties",
        areaId: "al-raha",
        buildings: [
          { id: "al-naseem-a", name: "Al Naseem A", projectId: "al-bandar", floors: 12, units: 160 },
          { id: "al-naseem-b", name: "Al Naseem B", projectId: "al-bandar", floors: 12, units: 160 },
        ],
      },
      {
        id: "al-zeina",
        name: "Al Zeina",
        developer: "Aldar Properties",
        areaId: "al-raha",
        buildings: [
          { id: "zeina-a", name: "Building A", projectId: "al-zeina", floors: 15, units: 200 },
          { id: "zeina-b", name: "Building B", projectId: "al-zeina", floors: 15, units: 200 },
          { id: "zeina-c", name: "Building C", projectId: "al-zeina", floors: 15, units: 200 },
        ],
      },
      {
        id: "al-muneera",
        name: "Al Muneera",
        developer: "Aldar Properties",
        areaId: "al-raha",
        buildings: [
          { id: "al-nada-1", name: "Al Nada 1", projectId: "al-muneera", floors: 8, units: 130 },
          { id: "al-nada-2", name: "Al Nada 2", projectId: "al-muneera", floors: 8, units: 130 },
          { id: "al-rahba", name: "Al Rahba", projectId: "al-muneera", floors: 8, units: 130 },
          { id: "al-sana", name: "Al Sana", projectId: "al-muneera", floors: 8, units: 130 },
        ],
      },
      {
        id: "al-hadeel",
        name: "Al Hadeel",
        developer: "Aldar Properties",
        areaId: "al-raha",
        buildings: [
          { id: "hadeel-1", name: "Tower 1", projectId: "al-hadeel", floors: 10, units: 120 },
          { id: "hadeel-2", name: "Tower 2", projectId: "al-hadeel", floors: 10, units: 120 },
        ],
      },
    ],
  },
  // ── Khalifa City ────────────────────────────────────────────────
  {
    id: "khalifa-city",
    name: "Khalifa City",
    lat: 24.4225,
    lng: 54.5797,
    projects: [
      {
        id: "bloom-gardens",
        name: "Bloom Gardens",
        developer: "Bloom Holding",
        areaId: "khalifa-city",
        buildings: [
          { id: "bloom-gardens-villas", name: "Villas", projectId: "bloom-gardens", floors: 2, units: 300 },
        ],
      },
      {
        id: "bloom-living",
        name: "Bloom Living",
        developer: "Bloom Holding",
        areaId: "khalifa-city",
        buildings: [
          { id: "bloom-living-a", name: "Apartments Block A", projectId: "bloom-living", floors: 6, units: 80 },
          { id: "bloom-living-b", name: "Apartments Block B", projectId: "bloom-living", floors: 6, units: 80 },
          { id: "bloom-living-villas", name: "Villas", projectId: "bloom-living", floors: 2, units: 200 },
        ],
      },
      {
        id: "golf-gardens",
        name: "Golf Gardens",
        developer: "Aldar Properties",
        areaId: "khalifa-city",
        buildings: [
          { id: "golf-townhouses", name: "Townhouses", projectId: "golf-gardens", floors: 3, units: 250 },
          { id: "golf-villas", name: "Villas", projectId: "golf-gardens", floors: 2, units: 200 },
        ],
      },
      {
        id: "al-forsan",
        name: "Al Forsan Village",
        developer: "Aldar Properties",
        areaId: "khalifa-city",
        buildings: [
          { id: "forsan-villas", name: "Villas", projectId: "al-forsan", floors: 2, units: 250 },
          { id: "forsan-townhouses", name: "Townhouses", projectId: "al-forsan", floors: 3, units: 200 },
        ],
      },
      {
        id: "al-rayyana",
        name: "Al Rayyana",
        developer: "Aldar Properties",
        areaId: "khalifa-city",
        buildings: [
          { id: "rayyana-1", name: "Building 1", projectId: "al-rayyana", floors: 5, units: 60 },
          { id: "rayyana-2", name: "Building 2", projectId: "al-rayyana", floors: 5, units: 60 },
          { id: "rayyana-3", name: "Building 3", projectId: "al-rayyana", floors: 5, units: 60 },
        ],
      },
    ],
  },
  // ── Al Maryah Island ────────────────────────────────────────────
  {
    id: "al-maryah",
    name: "Al Maryah Island",
    lat: 24.5014,
    lng: 54.3949,
    projects: [
      {
        id: "four-seasons-residences",
        name: "Four Seasons Private Residences",
        developer: "Mubadala",
        areaId: "al-maryah",
        buildings: [
          { id: "four-seasons-tower", name: "Tower", projectId: "four-seasons-residences", floors: 34, units: 280 },
        ],
      },
      {
        id: "w-residences",
        name: "W Residences",
        developer: "Taraf Holding",
        areaId: "al-maryah",
        buildings: [
          { id: "w-tower", name: "Tower", projectId: "w-residences", floors: 37, units: 300 },
        ],
      },
      {
        id: "al-maryah-vista",
        name: "Al Maryah Vista",
        developer: "Mubadala",
        areaId: "al-maryah",
        buildings: [
          { id: "vista-1", name: "Tower 1", projectId: "al-maryah-vista", floors: 25, units: 200 },
          { id: "vista-2", name: "Tower 2", projectId: "al-maryah-vista", floors: 25, units: 200 },
        ],
      },
    ],
  },
  // ── Corniche Area ───────────────────────────────────────────────
  {
    id: "corniche",
    name: "Corniche Area",
    lat: 24.4764,
    lng: 54.3476,
    projects: [
      {
        id: "etihad-towers",
        name: "Etihad Towers",
        developer: "Aldar Properties",
        areaId: "corniche",
        buildings: [
          { id: "etihad-t3", name: "Tower 3 Residential", projectId: "etihad-towers", floors: 55, units: 320 },
          { id: "etihad-t4", name: "Tower 4 Residential", projectId: "etihad-towers", floors: 62, units: 380 },
          { id: "etihad-t5", name: "Tower 5 Residential", projectId: "etihad-towers", floors: 57, units: 340 },
        ],
      },
      {
        id: "nation-towers",
        name: "Nation Towers",
        developer: "International Capital Trading",
        areaId: "corniche",
        buildings: [
          { id: "nation-a", name: "Tower A", projectId: "nation-towers", floors: 65, units: 380 },
        ],
      },
      {
        id: "wtc-abudhabi",
        name: "WTC Abu Dhabi",
        developer: "Aldar Properties",
        areaId: "corniche",
        buildings: [
          { id: "burj-mbr", name: "Burj Mohammed Bin Rashid", projectId: "wtc-abudhabi", floors: 92, units: 600 },
        ],
      },
      {
        id: "landmark-tower",
        name: "Landmark Tower",
        developer: "Landmark Group",
        areaId: "corniche",
        buildings: [
          { id: "landmark", name: "Tower", projectId: "landmark-tower", floors: 72, units: 460 },
        ],
      },
      {
        id: "wave-tower",
        name: "Wave Tower",
        developer: "National Investment Corporation",
        areaId: "corniche",
        buildings: [
          { id: "wave", name: "Tower", projectId: "wave-tower", floors: 40, units: 250 },
        ],
      },
    ],
  },
  // ── Al Ghadeer ──────────────────────────────────────────────────
  {
    id: "al-ghadeer",
    name: "Al Ghadeer",
    lat: 24.3262,
    lng: 55.1847,
    projects: [
      {
        id: "ghadeer-phase1",
        name: "Al Ghadeer Phase 1",
        developer: "Aldar Properties",
        areaId: "al-ghadeer",
        buildings: [
          { id: "ghadeer1-townhouses", name: "Townhouses", projectId: "ghadeer-phase1", floors: 3, units: 350 },
          { id: "ghadeer1-villas", name: "Villas", projectId: "ghadeer-phase1", floors: 2, units: 250 },
          { id: "ghadeer1-terrace", name: "Terrace Apartments", projectId: "ghadeer-phase1", floors: 4, units: 180 },
        ],
      },
      {
        id: "ghadeer-phase2",
        name: "Al Ghadeer Phase 2",
        developer: "Aldar Properties",
        areaId: "al-ghadeer",
        buildings: [
          { id: "ghadeer2-townhouses", name: "Townhouses", projectId: "ghadeer-phase2", floors: 3, units: 300 },
          { id: "ghadeer2-villas", name: "Villas", projectId: "ghadeer-phase2", floors: 2, units: 200 },
        ],
      },
    ],
  },
  // ── Masdar City ─────────────────────────────────────────────────
  {
    id: "masdar-city",
    name: "Masdar City",
    lat: 24.4267,
    lng: 54.6153,
    projects: [
      {
        id: "oasis-residences",
        name: "Oasis Residences",
        developer: "Reportage Properties",
        areaId: "masdar-city",
        buildings: [
          { id: "oasis-1", name: "Oasis 1", projectId: "oasis-residences", floors: 9, units: 110 },
          { id: "oasis-2", name: "Oasis 2", projectId: "oasis-residences", floors: 6, units: 70 },
        ],
      },
      {
        id: "leonardo-residences",
        name: "Leonardo Residences",
        developer: "Reportage Properties",
        areaId: "masdar-city",
        buildings: [
          { id: "leonardo-tower", name: "Tower", projectId: "leonardo-residences", floors: 6, units: 70 },
        ],
      },
      {
        id: "the-gate-masdar",
        name: "The Gate",
        developer: "Reportage Properties",
        areaId: "masdar-city",
        buildings: [
          { id: "gate-tower", name: "Tower", projectId: "the-gate-masdar", floors: 10, units: 130 },
        ],
      },
    ],
  },
  // ── Al Shamkha ──────────────────────────────────────────────────
  {
    id: "al-shamkha",
    name: "Al Shamkha",
    lat: 24.366,
    lng: 54.7413,
    projects: [
      {
        id: "reeman-living",
        name: "Reeman Living",
        developer: "Aldar Properties",
        areaId: "al-shamkha",
        buildings: [
          { id: "reeman-1", name: "Building 1", projectId: "reeman-living", floors: 5, units: 60 },
          { id: "reeman-2", name: "Building 2", projectId: "reeman-living", floors: 5, units: 60 },
          { id: "reeman-3", name: "Building 3", projectId: "reeman-living", floors: 5, units: 60 },
          { id: "reeman-4", name: "Building 4", projectId: "reeman-living", floors: 5, units: 60 },
          { id: "reeman-5", name: "Building 5", projectId: "reeman-living", floors: 5, units: 60 },
        ],
      },
      {
        id: "fay-alreeman",
        name: "Fay Alreeman",
        developer: "Aldar Properties",
        areaId: "al-shamkha",
        buildings: [
          { id: "fay-phase1", name: "Villas Phase 1", projectId: "fay-alreeman", floors: 2, units: 300 },
          { id: "fay-phase2", name: "Villas Phase 2", projectId: "fay-alreeman", floors: 2, units: 300 },
        ],
      },
    ],
  },
];

// ── Flatten helpers ─────────────────────────────────────────────────
export function getAllProjects(): Project[] {
  return areas.flatMap((a) => a.projects);
}

export function getAllBuildings(): Building[] {
  return areas.flatMap((a) => a.projects.flatMap((p) => p.buildings));
}

export function getProjectsForArea(areaId: string): Project[] {
  return areas.find((a) => a.id === areaId)?.projects ?? [];
}

export function getBuildingsForProject(projectId: string): Building[] {
  return getAllProjects().find((p) => p.id === projectId)?.buildings ?? [];
}

// ── Seed-based pseudo-random for consistent data ────────────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Helpers: bathrooms & maids room ─────────────────────────────────
function deriveBathrooms(
  propType: PropertyType,
  bedrooms: number,
  rand: () => number
): number {
  if (propType === "Villa" || propType === "Townhouse") {
    // bedrooms-1 to bedrooms
    return bedrooms - 1 + Math.floor(rand() * 2);
  }
  if (bedrooms === 0 || bedrooms === 1) return 1;
  if (bedrooms === 2) return 2;
  if (bedrooms === 3) return 2 + Math.floor(rand() * 2); // 2-3
  return 3 + Math.floor(rand() * 2); // 4+ BR => 3-4
}

function deriveMaidsRoom(
  propType: PropertyType,
  bedrooms: number,
  rand: () => number
): boolean {
  if (propType === "Villa" || propType === "Townhouse") return rand() < 0.8;
  if (bedrooms >= 3) return true;
  return false; // Studios and 1-2BR apartments
}

// ── Base price-per-sqft by area ─────────────────────────────────────
function getAreaBasePPSF(areaId: string, rand: () => number): number {
  switch (areaId) {
    case "saadiyat":
      return 1800 + rand() * 1200;
    case "corniche":
      return 1600 + rand() * 1000;
    case "al-maryah":
      return 1500 + rand() * 900;
    case "al-reem":
      return 1100 + rand() * 700;
    case "yas-island":
      return 1200 + rand() * 600;
    case "al-raha":
      return 1000 + rand() * 600;
    default:
      return 700 + rand() * 500;
  }
}

// ── Fixed unit pool for reliable repeat-sale tracking ───────────────
interface FixedUnit {
  buildingId: string;
  unitNumber: string;
  size: number;
  bedrooms: number;
  bathrooms: number;
  maidsRoom: boolean;
  propertyType: PropertyType;
  floor: number;
  basePPSF: number;
}

function buildFixedUnitPool(): FixedUnit[] {
  const rand = seededRandom(999);
  const pool: FixedUnit[] = [];
  const allBldgs = getAllBuildings();
  const allProjs = getAllProjects();
  const targetCount = 200;

  for (let i = 0; i < targetCount; i++) {
    const building = allBldgs[Math.floor(rand() * allBldgs.length)];
    const project = allProjs.find((p) => p.id === building.projectId)!;
    const area = areas.find((a) => a.id === project.areaId)!;

    const nameLC = building.name.toLowerCase();
    const isVilla = nameLC.includes("villa");
    const isTownhouse = nameLC.includes("townhouse");

    let propType: PropertyType;
    if (isVilla) propType = "Villa";
    else if (isTownhouse) propType = "Townhouse";
    else propType = rand() < 0.85 ? "Apartment" : "Penthouse";

    let bedrooms: number;
    if (propType === "Villa") bedrooms = Math.floor(rand() * 4) + 3;
    else if (propType === "Townhouse") bedrooms = Math.floor(rand() * 3) + 2;
    else if (propType === "Penthouse") bedrooms = Math.floor(rand() * 3) + 3;
    else bedrooms = Math.floor(rand() * 4); // 0=Studio through 3

    const bathrooms = deriveBathrooms(propType, bedrooms, rand);
    const maidsRoom = deriveMaidsRoom(propType, bedrooms, rand);

    const floor =
      propType === "Villa" || propType === "Townhouse"
        ? 0
        : propType === "Penthouse"
          ? building.floors - Math.floor(rand() * 3)
          : Math.floor(rand() * (building.floors - 1)) + 1;

    const unitSuffix = String(Math.floor(rand() * 20) + 1).padStart(2, "0");
    const unitNumber = floor > 0 ? `${floor}${unitSuffix}` : `G${unitSuffix}`;

    let size: number;
    switch (propType) {
      case "Villa":
        size = Math.round(2500 + rand() * 5000);
        break;
      case "Townhouse":
        size = Math.round(1500 + rand() * 2500);
        break;
      case "Penthouse":
        size = Math.round(2000 + rand() * 4000);
        break;
      default:
        if (bedrooms === 0) size = Math.round(400 + rand() * 250);
        else if (bedrooms === 1) size = Math.round(650 + rand() * 350);
        else if (bedrooms === 2) size = Math.round(1000 + rand() * 500);
        else size = Math.round(1400 + rand() * 800);
        break;
    }

    const basePPSF = getAreaBasePPSF(area.id, rand);

    pool.push({
      buildingId: building.id,
      unitNumber,
      size,
      bedrooms,
      bathrooms,
      maidsRoom,
      propertyType: propType,
      floor,
      basePPSF,
    });
  }

  return pool;
}

// Pre-build the fixed pool once at module load
const FIXED_UNIT_POOL = buildFixedUnitPool();

// ── Transaction generator ───────────────────────────────────────────
export function generateTransactions(count: number = 5000): Transaction[] {
  const rand = seededRandom(42);
  const transactions: Transaction[] = [];
  const allBldgs = getAllBuildings();
  const allProjs = getAllProjects();

  // Date range: Jan 2023 to Apr 2026
  const startDate = new Date(2023, 0, 1).getTime();
  const endDate = new Date(2026, 3, 14).getTime();
  const dateRange = endDate - startDate;

  // Track dates per fixed-pool unit so repeat sales are chronologically ordered
  const fixedUnitTxDates = new Map<string, number[]>();

  let txCounter = 0;

  for (let i = 0; i < count; i++) {
    // ~30% of transactions come from the fixed pool (repeat sales)
    const useFixedPool = rand() < 0.3;

    let buildingId: string;
    let buildingName: string;
    let projectId: string;
    let projectName: string;
    let areaId: string;
    let areaName: string;
    let developer: string;
    let propType: PropertyType;
    let bedrooms: number;
    let bathrooms: number;
    let maidsRoom: boolean;
    let size: number;
    let floor: number;
    let unitNumber: string;
    let basePPSF: number;

    if (useFixedPool) {
      // Pick a random unit from the fixed pool
      const unit = FIXED_UNIT_POOL[Math.floor(rand() * FIXED_UNIT_POOL.length)];
      const building = allBldgs.find((b) => b.id === unit.buildingId);
      if (!building) continue;
      const project = allProjs.find((p) => p.id === building.projectId)!;
      const area = areas.find((a) => a.id === project.areaId)!;

      buildingId = unit.buildingId;
      buildingName = building.name;
      projectId = project.id;
      projectName = project.name;
      areaId = area.id;
      areaName = area.name;
      developer = project.developer;
      propType = unit.propertyType;
      bedrooms = unit.bedrooms;
      bathrooms = unit.bathrooms;
      maidsRoom = unit.maidsRoom;
      size = unit.size;
      floor = unit.floor;
      unitNumber = unit.unitNumber;
      basePPSF = unit.basePPSF;
    } else {
      // Generate a fresh (non-repeat) unit
      const building = allBldgs[Math.floor(rand() * allBldgs.length)];
      const project = allProjs.find((p) => p.id === building.projectId)!;
      const area = areas.find((a) => a.id === project.areaId)!;

      buildingId = building.id;
      buildingName = building.name;
      projectId = project.id;
      projectName = project.name;
      areaId = area.id;
      areaName = area.name;
      developer = project.developer;

      const nameLC = building.name.toLowerCase();
      const isVilla = nameLC.includes("villa");
      const isTownhouse = nameLC.includes("townhouse");
      const isTerrace =
        nameLC.includes("terrace") || nameLC.includes("apartment");

      if (isVilla) {
        propType = "Villa";
      } else if (isTownhouse) {
        propType = "Townhouse";
      } else if (isTerrace) {
        propType = "Apartment";
      } else {
        const r = rand();
        if (r < 0.75) propType = "Apartment";
        else if (r < 0.88) propType = "Penthouse";
        else if (r < 0.93) propType = "Office";
        else if (r < 0.97) propType = "Retail";
        else propType = "Land";
      }

      // Bedrooms
      if (propType === "Villa") {
        bedrooms = Math.floor(rand() * 4) + 3; // 3-6
      } else if (propType === "Townhouse") {
        bedrooms = Math.floor(rand() * 3) + 2; // 2-4
      } else if (propType === "Penthouse") {
        bedrooms = Math.floor(rand() * 3) + 3; // 3-5
      } else if (
        propType === "Land" ||
        propType === "Office" ||
        propType === "Retail"
      ) {
        bedrooms = 0;
      } else {
        bedrooms = Math.floor(rand() * 4); // 0(Studio)-3
      }

      // Bathrooms & maids room
      bathrooms = deriveBathrooms(propType, bedrooms, rand);
      maidsRoom = deriveMaidsRoom(propType, bedrooms, rand);

      // Size
      switch (propType) {
        case "Villa":
          size = Math.round(2500 + rand() * 5000);
          break;
        case "Townhouse":
          size = Math.round(1500 + rand() * 2500);
          break;
        case "Penthouse":
          size = Math.round(2000 + rand() * 4000);
          break;
        case "Land":
          size = Math.round(5000 + rand() * 25000);
          break;
        case "Office":
          size = Math.round(500 + rand() * 3000);
          break;
        case "Retail":
          size = Math.round(400 + rand() * 2000);
          break;
        default:
          if (bedrooms === 0) size = Math.round(400 + rand() * 250);
          else if (bedrooms === 1) size = Math.round(650 + rand() * 350);
          else if (bedrooms === 2) size = Math.round(1000 + rand() * 500);
          else size = Math.round(1400 + rand() * 800);
          break;
      }

      floor =
        propType === "Villa" || propType === "Townhouse" || propType === "Land"
          ? 0
          : propType === "Penthouse"
            ? building.floors - Math.floor(rand() * 3)
            : Math.floor(rand() * (building.floors - 1)) + 1;

      const unitSuffix = String(Math.floor(rand() * 20) + 1).padStart(2, "0");
      unitNumber = floor > 0 ? `${floor}${unitSuffix}` : `G${unitSuffix}`;

      basePPSF = getAreaBasePPSF(area.id, rand);
    }

    // ── Generate transaction date ──────────────────────────────────
    let txDate: Date;
    const unitKey = `${buildingId}__${unitNumber}`;

    if (useFixedPool) {
      // For repeat-sale units, ensure dates progress chronologically
      const existingDates = fixedUnitTxDates.get(unitKey) || [];
      if (existingDates.length === 0) {
        // First transaction: place in first 40% of date range
        txDate = new Date(startDate + rand() * dateRange * 0.4);
      } else {
        // Subsequent: place AFTER the last transaction with a minimum gap
        const lastDateMs = Math.max(...existingDates);
        const remainingRange = endDate - lastDateMs;
        const minGap = 60 * 24 * 60 * 60 * 1000; // 60 days
        if (remainingRange < minGap) {
          txDate = new Date(endDate - rand() * 30 * 24 * 60 * 60 * 1000);
        } else {
          txDate = new Date(
            lastDateMs +
              minGap +
              rand() * Math.min(remainingRange - minGap, remainingRange * 0.5)
          );
        }
      }
      if (!fixedUnitTxDates.has(unitKey))
        fixedUnitTxDates.set(unitKey, []);
      fixedUnitTxDates.get(unitKey)!.push(txDate.getTime());
    } else {
      txDate = new Date(startDate + rand() * dateRange);
    }

    // Clamp to valid range
    if (txDate.getTime() > endDate) txDate = new Date(endDate);
    if (txDate.getTime() < startDate) txDate = new Date(startDate);

    // ── Time-based appreciation (~12% per year) ────────────────────
    const yearsFromStart =
      (txDate.getTime() - startDate) / (365.25 * 24 * 60 * 60 * 1000);
    const appreciation = 1 + yearsFromStart * 0.12;
    const jitter = 0.95 + rand() * 0.1; // +/-5% noise
    const pricePerSqft = Math.round(basePPSF * appreciation * jitter);

    const txType: TransactionType = rand() > 0.25 ? "Sale" : "Rental";
    const price =
      txType === "Rental"
        ? Math.round(size * pricePerSqft * 0.06)
        : Math.round(size * pricePerSqft);

    txCounter++;
    transactions.push({
      id: `TX-${String(txCounter).padStart(6, "0")}`,
      date: txDate.toISOString().split("T")[0],
      area: areaName,
      areaId,
      project: projectName,
      projectId,
      building: buildingName,
      buildingId,
      propertyType: propType,
      transactionType: txType,
      status: rand() > 0.3 ? "Ready" : "Off-Plan",
      bedrooms,
      bathrooms,
      maidsRoom,
      size,
      price,
      pricePerSqft: txType === "Rental" ? Math.round(price / size) : pricePerSqft,
      paymentMethod: rand() > 0.45 ? "Cash" : "Mortgage",
      developer,
      floor,
      unitNumber,
    });
  }

  return transactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// ── Find repeat transactions on the same unit (price history) ───────
export function getUnitPriceHistory(
  allTx: Transaction[],
  buildingId: string,
  unitNumber: string
): Transaction[] {
  return allTx
    .filter(
      (t) =>
        t.buildingId === buildingId &&
        t.unitNumber === unitNumber &&
        t.transactionType === "Sale"
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ── Find all units with multiple sale transactions (repeat sales) ───
// Matches on buildingId + unitNumber + size + bedrooms to confirm
// we are tracking the SAME physical unit across transactions.
export function getRepeatSaleUnits(allTx: Transaction[]): {
  key: string;
  buildingId: string;
  unitNumber: string;
  building: string;
  project: string;
  area: string;
  history: Transaction[];
  priceChange: number; // percent
}[] {
  const unitMap = new Map<string, Transaction[]>();
  allTx
    .filter((t) => t.transactionType === "Sale")
    .forEach((t) => {
      const key = `${t.buildingId}__${t.unitNumber}__${t.size}__${t.bedrooms}`;
      if (!unitMap.has(key)) unitMap.set(key, []);
      unitMap.get(key)!.push(t);
    });

  const results: {
    key: string;
    buildingId: string;
    unitNumber: string;
    building: string;
    project: string;
    area: string;
    history: Transaction[];
    priceChange: number;
  }[] = [];

  unitMap.forEach((txs, key) => {
    if (txs.length < 2) return;
    const sorted = txs.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const pctChange = ((last.price - first.price) / first.price) * 100;
    results.push({
      key,
      buildingId: first.buildingId,
      unitNumber: first.unitNumber,
      building: first.building,
      project: first.project,
      area: first.area,
      history: sorted,
      priceChange: Math.round(pctChange * 10) / 10,
    });
  });

  return results.sort((a, b) => b.history.length - a.history.length);
}

// Pre-generate
export const transactions = generateTransactions(5000);
