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
  bedrooms: number;
  size: number; // sqft
  price: number; // AED
  pricePerSqft: number;
  paymentMethod: PaymentMethod;
  developer: string;
  floor: number;
  unitNumber: string;
}

// Abu Dhabi Areas with real geography
export const areas: Area[] = [
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
          { id: "sun-tower", name: "Sun Tower", projectId: "shams-abudhabi", floors: 65, units: 480 },
          { id: "sky-tower", name: "Sky Tower", projectId: "shams-abudhabi", floors: 74, units: 520 },
          { id: "gate-tower-1", name: "Gate Tower 1", projectId: "shams-abudhabi", floors: 60, units: 400 },
          { id: "gate-tower-2", name: "Gate Tower 2", projectId: "shams-abudhabi", floors: 60, units: 400 },
          { id: "gate-tower-3", name: "Gate Tower 3", projectId: "shams-abudhabi", floors: 60, units: 400 },
        ],
      },
      {
        id: "marina-square",
        name: "Marina Square",
        developer: "Aldar Properties",
        areaId: "al-reem",
        buildings: [
          { id: "ocean-terrace", name: "Ocean Terrace", projectId: "marina-square", floors: 33, units: 250 },
          { id: "marina-heights-1", name: "Marina Heights 1", projectId: "marina-square", floors: 34, units: 280 },
          { id: "tala-tower", name: "Tala Tower", projectId: "marina-square", floors: 45, units: 350 },
          { id: "rak-tower", name: "RAK Tower", projectId: "marina-square", floors: 52, units: 420 },
        ],
      },
      {
        id: "najmat",
        name: "Najmat Abu Dhabi",
        developer: "Aldar Properties",
        areaId: "al-reem",
        buildings: [
          { id: "najmat-1", name: "Najmat Tower 1", projectId: "najmat", floors: 28, units: 200 },
          { id: "najmat-2", name: "Najmat Tower 2", projectId: "najmat", floors: 28, units: 200 },
        ],
      },
    ],
  },
  {
    id: "saadiyat",
    name: "Saadiyat Island",
    lat: 24.5365,
    lng: 54.4344,
    projects: [
      {
        id: "saadiyat-beach",
        name: "Saadiyat Beach Residences",
        developer: "Aldar Properties",
        areaId: "saadiyat",
        buildings: [
          { id: "mamsha-1", name: "Mamsha Al Saadiyat Block A", projectId: "saadiyat-beach", floors: 8, units: 120 },
          { id: "mamsha-2", name: "Mamsha Al Saadiyat Block B", projectId: "saadiyat-beach", floors: 8, units: 120 },
          { id: "mamsha-3", name: "Mamsha Al Saadiyat Block C", projectId: "saadiyat-beach", floors: 8, units: 100 },
        ],
      },
      {
        id: "saadiyat-grove",
        name: "Saadiyat Grove",
        developer: "Aldar Properties",
        areaId: "saadiyat",
        buildings: [
          { id: "grove-1", name: "The Grove Tower 1", projectId: "saadiyat-grove", floors: 12, units: 160 },
          { id: "grove-2", name: "The Grove Tower 2", projectId: "saadiyat-grove", floors: 12, units: 160 },
        ],
      },
      {
        id: "saadiyat-lagoons",
        name: "Saadiyat Lagoons",
        developer: "Aldar Properties",
        areaId: "saadiyat",
        buildings: [
          { id: "lagoons-villas", name: "Lagoons Villas", projectId: "saadiyat-lagoons", floors: 2, units: 80 },
        ],
      },
    ],
  },
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
          { id: "yas-acres-villas", name: "Yas Acres Villas", projectId: "yas-acres", floors: 2, units: 650 },
          { id: "yas-acres-townhouses", name: "Yas Acres Townhouses", projectId: "yas-acres", floors: 3, units: 450 },
        ],
      },
      {
        id: "waters-edge",
        name: "Waters Edge",
        developer: "Aldar Properties",
        areaId: "yas-island",
        buildings: [
          { id: "waters-edge-1", name: "Waters Edge Block 1", projectId: "waters-edge", floors: 6, units: 80 },
          { id: "waters-edge-2", name: "Waters Edge Block 2", projectId: "waters-edge", floors: 6, units: 80 },
        ],
      },
      {
        id: "mayan",
        name: "Mayan",
        developer: "Aldar Properties",
        areaId: "yas-island",
        buildings: [
          { id: "mayan-1", name: "Mayan 1", projectId: "mayan", floors: 8, units: 120 },
          { id: "mayan-2", name: "Mayan 2", projectId: "mayan", floors: 8, units: 120 },
        ],
      },
    ],
  },
  {
    id: "al-raha",
    name: "Al Raha Beach",
    lat: 24.4547,
    lng: 54.5653,
    projects: [
      {
        id: "al-muneera",
        name: "Al Muneera",
        developer: "Aldar Properties",
        areaId: "al-raha",
        buildings: [
          { id: "al-nada-1", name: "Al Nada 1", projectId: "al-muneera", floors: 8, units: 130 },
          { id: "al-nada-2", name: "Al Nada 2", projectId: "al-muneera", floors: 8, units: 130 },
        ],
      },
      {
        id: "al-zeina",
        name: "Al Zeina",
        developer: "Aldar Properties",
        areaId: "al-raha",
        buildings: [
          { id: "zeina-a", name: "Al Zeina Block A", projectId: "al-zeina", floors: 10, units: 180 },
          { id: "zeina-b", name: "Al Zeina Block B", projectId: "al-zeina", floors: 10, units: 180 },
          { id: "zeina-c", name: "Al Zeina Block C", projectId: "al-zeina", floors: 10, units: 180 },
        ],
      },
    ],
  },
  {
    id: "khalifa-city",
    name: "Khalifa City",
    lat: 24.4225,
    lng: 54.5797,
    projects: [
      {
        id: "bloom-gardens",
        name: "Bloom Gardens",
        developer: "Bloom Properties",
        areaId: "khalifa-city",
        buildings: [
          { id: "bloom-villas", name: "Bloom Gardens Villas", projectId: "bloom-gardens", floors: 2, units: 300 },
        ],
      },
      {
        id: "al-forsan",
        name: "Al Forsan Village",
        developer: "Aldar Properties",
        areaId: "khalifa-city",
        buildings: [
          { id: "forsan-villas", name: "Al Forsan Villas", projectId: "al-forsan", floors: 2, units: 250 },
          { id: "forsan-townhouses", name: "Al Forsan Townhouses", projectId: "al-forsan", floors: 3, units: 200 },
        ],
      },
    ],
  },
  {
    id: "al-maryah",
    name: "Al Maryah Island",
    lat: 24.5014,
    lng: 54.3949,
    projects: [
      {
        id: "al-maryah-vista",
        name: "Al Maryah Vista",
        developer: "Mubadala",
        areaId: "al-maryah",
        buildings: [
          { id: "vista-1", name: "Al Maryah Vista 1", projectId: "al-maryah-vista", floors: 25, units: 200 },
          { id: "vista-2", name: "Al Maryah Vista 2", projectId: "al-maryah-vista", floors: 25, units: 200 },
        ],
      },
    ],
  },
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
          { id: "etihad-t1", name: "Etihad Tower 1", projectId: "etihad-towers", floors: 62, units: 360 },
          { id: "etihad-t2", name: "Etihad Tower 2", projectId: "etihad-towers", floors: 80, units: 500 },
          { id: "etihad-t3", name: "Etihad Tower 3", projectId: "etihad-towers", floors: 54, units: 280 },
        ],
      },
      {
        id: "nation-towers",
        name: "Nation Towers",
        developer: "Al Barakah International Investment",
        areaId: "corniche",
        buildings: [
          { id: "nation-t1", name: "Nation Tower 1", projectId: "nation-towers", floors: 52, units: 300 },
          { id: "nation-t2", name: "Nation Tower 2", projectId: "nation-towers", floors: 65, units: 380 },
        ],
      },
    ],
  },
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
          { id: "ghadeer-villas", name: "Al Ghadeer Villas", projectId: "ghadeer-phase1", floors: 2, units: 400 },
          { id: "ghadeer-townhouses", name: "Al Ghadeer Townhouses", projectId: "ghadeer-phase1", floors: 3, units: 350 },
        ],
      },
    ],
  },
  {
    id: "masdar-city",
    name: "Masdar City",
    lat: 24.4267,
    lng: 54.6153,
    projects: [
      {
        id: "oasis-residences",
        name: "Oasis Residences",
        developer: "Aldar Properties",
        areaId: "masdar-city",
        buildings: [
          { id: "oasis-1", name: "Oasis Tower 1", projectId: "oasis-residences", floors: 14, units: 160 },
          { id: "oasis-2", name: "Oasis Tower 2", projectId: "oasis-residences", floors: 14, units: 160 },
        ],
      },
    ],
  },
  {
    id: "al-shamkha",
    name: "Al Shamkha",
    lat: 24.3660,
    lng: 54.7413,
    projects: [
      {
        id: "reeman-living",
        name: "Reeman Living",
        developer: "Aldar Properties",
        areaId: "al-shamkha",
        buildings: [
          { id: "reeman-villas", name: "Reeman Living Villas", projectId: "reeman-living", floors: 2, units: 500 },
          { id: "reeman-town", name: "Reeman Living Townhouses", projectId: "reeman-living", floors: 3, units: 400 },
        ],
      },
    ],
  },
];

// Flatten helpers
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

// Seed-based pseudo-random for consistent data
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const propertyTypes: PropertyType[] = [
  "Apartment",
  "Villa",
  "Townhouse",
  "Penthouse",
  "Land",
  "Office",
  "Retail",
];

const transactionTypes: TransactionType[] = ["Sale", "Rental"];

const developers = [
  "Aldar Properties",
  "Bloom Properties",
  "Mubadala",
  "IMKAN Properties",
  "Reportage Properties",
  "Al Barakah International Investment",
  "Tamouh Investments",
  "Reem Developers",
  "Q Properties",
  "Dar Al Arkan",
];

// Generate mock transactions with repeat sales on same units for price history
export function generateTransactions(count: number = 5000): Transaction[] {
  const rand = seededRandom(42);
  const transactions: Transaction[] = [];
  const allBuildings = getAllBuildings();
  const allProjects = getAllProjects();

  // Date range: Jan 2023 to Apr 2026
  const startDate = new Date(2023, 0, 1).getTime();
  const endDate = new Date(2026, 3, 14).getTime();
  const dateRange = endDate - startDate;

  // Track units we've already generated so we can create repeat transactions
  const unitPool: {
    building: Building;
    project: Project;
    area: Area;
    propType: PropertyType;
    bedrooms: number;
    size: number;
    floor: number;
    unitNumber: string;
    basePPSF: number;
  }[] = [];

  let txCounter = 0;

  function getBasePPSF(areaId: string): number {
    switch (areaId) {
      case "saadiyat": return 1800 + rand() * 1200;
      case "corniche": return 1600 + rand() * 1000;
      case "al-maryah": return 1500 + rand() * 900;
      case "al-reem": return 1100 + rand() * 700;
      case "yas-island": return 1200 + rand() * 600;
      case "al-raha": return 1000 + rand() * 600;
      default: return 700 + rand() * 500;
    }
  }

  for (let i = 0; i < count; i++) {
    // 20% chance to reuse a previous unit (creates repeat transactions / price history)
    const reuseUnit = unitPool.length > 50 && rand() < 0.2;
    let building: Building, project: Project, area: Area;
    let propType: PropertyType, bedrooms: number, size: number, floor: number, unitNumber: string, basePPSF: number;

    if (reuseUnit) {
      const prev = unitPool[Math.floor(rand() * unitPool.length)];
      building = prev.building;
      project = prev.project;
      area = prev.area;
      propType = prev.propType;
      bedrooms = prev.bedrooms;
      size = prev.size;
      floor = prev.floor;
      unitNumber = prev.unitNumber;
      basePPSF = prev.basePPSF * (1 + (rand() * 0.1 - 0.02)); // slight drift on base
    } else {
      building = allBuildings[Math.floor(rand() * allBuildings.length)];
      project = allProjects.find((p) => p.id === building.projectId)!;
      area = areas.find((a) => a.id === project.areaId)!;

      const isVillaProject =
        building.name.toLowerCase().includes("villa") ||
        building.name.toLowerCase().includes("townhouse");
      propType = isVillaProject
        ? building.name.toLowerCase().includes("townhouse")
          ? "Townhouse"
          : "Villa"
        : propertyTypes[Math.floor(rand() * 5)] as PropertyType; // weighted toward residential + land

      bedrooms =
        propType === "Villa"
          ? Math.floor(rand() * 4) + 3
          : propType === "Townhouse"
            ? Math.floor(rand() * 3) + 2
            : propType === "Penthouse"
              ? Math.floor(rand() * 3) + 3
              : propType === "Land" || propType === "Office" || propType === "Retail"
                ? 0
                : Math.floor(rand() * 4);

      const areaMultiplier =
        area.id === "saadiyat" ? 1.4 : area.id === "corniche" ? 1.3 : area.id === "al-maryah" ? 1.2 : 1;

      let baseSize: number;
      switch (propType) {
        case "Villa": baseSize = 2500 + rand() * 5000; break;
        case "Townhouse": baseSize = 1500 + rand() * 2500; break;
        case "Penthouse": baseSize = 2000 + rand() * 4000; break;
        case "Land": baseSize = 5000 + rand() * 25000; break;
        case "Office": baseSize = 500 + rand() * 3000; break;
        case "Retail": baseSize = 400 + rand() * 2000; break;
        default: baseSize = 400 + rand() * 1800;
      }
      size = Math.round(baseSize * areaMultiplier);
      floor = isVillaProject ? 0 : Math.floor(rand() * building.floors) + 1;
      unitNumber = `${floor}${String(Math.floor(rand() * 20) + 1).padStart(2, "0")}`;
      basePPSF = getBasePPSF(area.id);

      // Save to pool for possible reuse
      unitPool.push({ building, project, area, propType, bedrooms, size, floor, unitNumber, basePPSF });
    }

    // Time-based appreciation (~12% per year)
    const txDate = new Date(startDate + rand() * dateRange);
    const yearsFromStart =
      (txDate.getTime() - startDate) / (365.25 * 24 * 60 * 60 * 1000);
    const appreciation = 1 + yearsFromStart * 0.12;
    const pricePerSqft = Math.round(basePPSF * appreciation);

    const txType = rand() > 0.25 ? "Sale" : "Rental";
    const price =
      txType === "Rental"
        ? Math.round(size * pricePerSqft * 0.06)
        : Math.round(size * pricePerSqft);

    txCounter++;
    transactions.push({
      id: `TX-${String(txCounter).padStart(6, "0")}`,
      date: txDate.toISOString().split("T")[0],
      area: area.name,
      areaId: area.id,
      project: project.name,
      projectId: project.id,
      building: building.name,
      buildingId: building.id,
      propertyType: propType,
      transactionType: txType,
      status: rand() > 0.3 ? "Ready" : "Off-Plan",
      bedrooms,
      size,
      price,
      pricePerSqft: txType === "Rental" ? Math.round(price / size) : pricePerSqft,
      paymentMethod: rand() > 0.45 ? "Cash" : "Mortgage",
      developer: project.developer || developers[Math.floor(rand() * developers.length)],
      floor,
      unitNumber,
    });
  }

  return transactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// Find repeat transactions on the same unit (price history)
export function getUnitPriceHistory(
  allTx: Transaction[],
  buildingId: string,
  unitNumber: string
): Transaction[] {
  return allTx
    .filter((t) => t.buildingId === buildingId && t.unitNumber === unitNumber && t.transactionType === "Sale")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Find all units with multiple transactions
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
      const key = `${t.buildingId}__${t.unitNumber}`;
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
    const sorted = txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
