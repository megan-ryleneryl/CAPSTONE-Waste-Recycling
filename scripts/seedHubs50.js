// seedDisposalHubs.js
// Run from project root: node seedDisposalHubs.js
//
// This script uses the Firebase Admin SDK (already configured in your project)
// to write 50 disposal hubs directly to Firestore.

require('dotenv').config();
const { admin } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

const db = admin.firestore();

// ─── Metro Manila cities / barangays with realistic coordinates ───────────────
const metroManilaCities = [
  { city: 'Quezon City',      province: 'Metro Manila', region: 'NCR' },
  { city: 'Manila',           province: 'Metro Manila', region: 'NCR' },
  { city: 'Makati',           province: 'Metro Manila', region: 'NCR' },
  { city: 'Pasig',            province: 'Metro Manila', region: 'NCR' },
  { city: 'Taguig',           province: 'Metro Manila', region: 'NCR' },
  { city: 'Mandaluyong',      province: 'Metro Manila', region: 'NCR' },
  { city: 'Marikina',         province: 'Metro Manila', region: 'NCR' },
  { city: 'Parañaque',        province: 'Metro Manila', region: 'NCR' },
  { city: 'Las Piñas',        province: 'Metro Manila', region: 'NCR' },
  { city: 'Muntinlupa',       province: 'Metro Manila', region: 'NCR' },
  { city: 'Caloocan',         province: 'Metro Manila', region: 'NCR' },
  { city: 'Valenzuela',       province: 'Metro Manila', region: 'NCR' },
  { city: 'San Juan',         province: 'Metro Manila', region: 'NCR' },
  { city: 'Pasay',            province: 'Metro Manila', region: 'NCR' },
  { city: 'Malabon',          province: 'Metro Manila', region: 'NCR' },
  { city: 'Navotas',          province: 'Metro Manila', region: 'NCR' },
];

// A few nearby cities outside Metro Manila for variety
const nearbyCities = [
  { city: 'Antipolo',   province: 'Rizal',   region: 'Region IV-A' },
  { city: 'Cainta',     province: 'Rizal',   region: 'Region IV-A' },
  { city: 'San Mateo',  province: 'Rizal',   region: 'Region IV-A' },
  { city: 'Bacoor',     province: 'Cavite',  region: 'Region IV-A' },
  { city: 'Imus',       province: 'Cavite',  region: 'Region IV-A' },
  { city: 'Meycauayan', province: 'Bulacan', region: 'Region III' },
];

// Approximate center coordinates per city (lat, lng)
const cityCoords = {
  'Quezon City':    { lat: 14.6760, lng: 121.0437 },
  'Manila':         { lat: 14.5995, lng: 120.9842 },
  'Makati':         { lat: 14.5547, lng: 121.0244 },
  'Pasig':          { lat: 14.5764, lng: 121.0851 },
  'Taguig':         { lat: 14.5176, lng: 121.0509 },
  'Mandaluyong':    { lat: 14.5794, lng: 121.0359 },
  'Marikina':       { lat: 14.6507, lng: 121.1029 },
  'Parañaque':      { lat: 14.4793, lng: 121.0198 },
  'Las Piñas':      { lat: 14.4445, lng: 120.9939 },
  'Muntinlupa':     { lat: 14.4081, lng: 121.0415 },
  'Caloocan':       { lat: 14.6500, lng: 120.9667 },
  'Valenzuela':     { lat: 14.6942, lng: 120.9608 },
  'San Juan':       { lat: 14.6017, lng: 121.0355 },
  'Pasay':          { lat: 14.5378, lng: 121.0014 },
  'Malabon':        { lat: 14.6625, lng: 120.9567 },
  'Navotas':        { lat: 14.6667, lng: 120.9417 },
  'Antipolo':       { lat: 14.5886, lng: 121.1762 },
  'Cainta':         { lat: 14.5767, lng: 121.1222 },
  'San Mateo':      { lat: 14.6983, lng: 121.1175 },
  'Bacoor':         { lat: 14.4624, lng: 120.9645 },
  'Imus':           { lat: 14.4297, lng: 120.9367 },
  'Meycauayan':     { lat: 14.7367, lng: 120.9608 },
};

// Barangay pools per city (sample real barangay names)
const barangays = {
  'Quezon City':    ['Diliman', 'Commonwealth', 'Fairview', 'Batasan Hills', 'Holy Spirit', 'Tandang Sora', 'Project 6', 'Novaliches Proper', 'Bagong Pag-asa', 'Kamuning'],
  'Manila':         ['Ermita', 'Sampaloc', 'Tondo', 'Binondo', 'Quiapo', 'San Miguel', 'Paco', 'Malate', 'Santa Cruz', 'Pandacan'],
  'Makati':         ['Poblacion', 'Bel-Air', 'San Antonio', 'Guadalupe Viejo', 'Bangkal', 'Tejeros', 'Pio del Pilar', 'Cembo', 'West Rembo'],
  'Pasig':          ['Kapitolyo', 'Ugong', 'Bagong Ilog', 'Rosario', 'Santolan', 'San Miguel', 'Pinagbuhatan', 'Bambang'],
  'Taguig':         ['Ususan', 'Bagumbayan', 'Lower Bicutan', 'Upper Bicutan', 'Western Bicutan', 'Signal Village', 'New Lower Bicutan', 'Hagonoy'],
  'Mandaluyong':    ['Addition Hills', 'Barangka Drive', 'Highway Hills', 'Pleasant Hills', 'Wack-Wack Greenhills', 'Hulo', 'Namayan'],
  'Marikina':       ['Barangka', 'Kalumpang', 'Concepcion Dos', 'Nangka', 'Parang', 'Industrial Valley', 'Tumana', 'Sto. Niño'],
  'Parañaque':      ['Baclaran', 'San Dionisio', 'Tambo', 'BF Homes', 'Don Galo', 'La Huerta', 'San Martin de Porres', 'Merville'],
  'Las Piñas':      ['Almanza Uno', 'Almanza Dos', 'Daniel Fajardo', 'Elias Aldana', 'Pamplona Tres', 'Talon Tres', 'CAA-BF International'],
  'Muntinlupa':     ['Alabang', 'Bayanan', 'Buli', 'Cupang', 'Putatan', 'Sucat', 'Tunasan', 'Poblacion'],
  'Caloocan':       ['Bagong Barrio', 'Grace Park', 'Morning Breeze', 'Bagong Silang', 'Camarin', 'Deparo', 'Llano', 'Tala'],
  'Valenzuela':     ['Karuhatan', 'Lingunan', 'Marulas', 'Maysan', 'Malinta', 'Canumay West', 'Paso de Blas', 'Dalandanan'],
  'San Juan':       ['Balong Bato', 'Corazon de Jesus', 'Greenhills', 'Kabayanan', 'Little Baguio', 'Onse', 'Salapan', 'West Crame'],
  'Pasay':          ['Barangay 76', 'Barangay 183', 'Barangay 201', 'Villamor', 'San Isidro', 'Don Carlos', 'Malibay'],
  'Malabon':        ['Acacia', 'Baritan', 'Catmon', 'Concepcion', 'Dampalit', 'Longos', 'Potrero', 'Tonsuya'],
  'Navotas':        ['North Bay Blvd. North', 'North Bay Blvd. South', 'San Roque', 'Tangos', 'Tanza', 'Sipac-Almacen', 'Bagumbayan North'],
  'Antipolo':       ['San Roque', 'Dela Paz', 'Mayamot', 'Cupang', 'San Jose', 'Mambugan'],
  'Cainta':         ['San Juan', 'San Andres', 'Santo Domingo', 'Santa Rosa', 'San Isidro'],
  'San Mateo':      ['Ampid I', 'Banaba', 'Guitnang Bayan I', 'Malanday', 'Santa Ana', 'Dulongbayan'],
  'Bacoor':         ['Molino', 'Queens Row', 'Habay', 'Real I', 'Talaba', 'Zapote'],
  'Imus':           ['Anabu', 'Bayan Luma', 'Palico', 'Tanzang Luma', 'Malagasang'],
  'Meycauayan':     ['Calvario', 'Hanga', 'Lawa', 'Perez', 'Poblacion', 'Iba'],
};

// Realistic street names
const streets = [
  'National Highway', 'Rizal Avenue', 'Quezon Boulevard', 'EDSA', 'C5 Road',
  'Shaw Boulevard', 'Ortigas Avenue', 'Aurora Boulevard', 'Marcos Highway',
  'Commonwealth Avenue', 'Taft Avenue', 'España Boulevard', 'Recto Avenue',
  'Gil Puyat Avenue', 'Chino Roces Avenue', 'Sen. Gil Puyat Avenue',
  'JP Rizal Street', 'A. Bonifacio Avenue', 'MacArthur Highway',
  'Quirino Highway', 'Congressional Avenue', 'Visayas Avenue',
  'Katipunan Avenue', 'Sumulong Highway', 'Alabang-Zapote Road',
  'Sucat Road', 'Dr. A. Santos Avenue', 'Gen. Trias Drive',
  'Molino Road', 'Daang Hari', 'Gov. Drive', 'E. Rodriguez Avenue',
];

// Material pools
const materialSets = {
  MRF: [
    ['PET Bottles', 'HDPE Containers', 'Cardboard', 'Mixed Paper', 'Aluminum Cans', 'Glass Bottles', 'Tin Cans'],
    ['PET Bottles', 'Cardboard', 'Newspaper', 'Office Paper', 'Aluminum Cans', 'Steel Cans', 'Glass Bottles', 'Plastic Bags'],
    ['PET Bottles', 'HDPE Containers', 'LDPE Film', 'Corrugated Cardboard', 'Mixed Paper', 'Aluminum Cans', 'Glass Bottles', 'Organic Waste'],
    ['PET Bottles', 'Mixed Plastics', 'Cardboard', 'Paper', 'Metal Cans', 'E-Waste (small appliances)', 'Used Cooking Oil'],
    ['PET Bottles', 'HDPE', 'PP Containers', 'Corrugated Cardboard', 'Newspaper', 'Aluminum', 'Tin Cans', 'Clear Glass', 'Colored Glass'],
  ],
  'Junk Shop': [
    ['Scrap Metal', 'Copper Wire', 'Aluminum', 'Cardboard', 'Newspaper', 'PET Bottles', 'Old Appliances'],
    ['Iron / Steel Scrap', 'Copper', 'Brass', 'Aluminum Cans', 'Cardboard', 'Plastic Bottles', 'Car Batteries'],
    ['Scrap Metal', 'Aluminum', 'Stainless Steel', 'Cardboard', 'Newspaper', 'Mixed Paper', 'PET Bottles', 'HDPE Bottles'],
    ['Copper', 'Brass', 'Iron', 'Tin', 'Lead-acid Batteries', 'Aluminum', 'Cardboard', 'Newspaper'],
    ['Scrap Metal', 'Electronic Waste', 'Copper Wire', 'Aluminum', 'Cardboard', 'Mixed Paper', 'Plastic Bottles', 'Glass Bottles'],
  ],
};

// MRF name templates
const mrfNames = [
  '{city} Materials Recovery Facility',
  'Brgy. {barangay} MRF',
  '{city} Eco Center',
  '{barangay} Community MRF',
  '{city} Recycling Center',
  '{city} Green Hub',
  '{barangay} Materials Recovery Facility',
  '{city} Waste Management Center',
  '{barangay} Eco-Station',
  '{city} Circular Economy Hub',
];

// Junk shop name templates
const junkShopNames = [
  '{owner} Junk Shop',
  '{city} Scrap Trading',
  '{barangay} Buy & Sell Scrapyard',
  '{owner} Scrap & Recyclables',
  'Golden {material} Trading',
  '{owner} Metal & Paper Trading',
  '{city} Recyclable Depot',
  '{barangay} Junkyard Trading',
  '{owner} Eco-Trading',
  '{city} Scrap Dealers',
];

const ownerFirstNames = [
  'Mang Bert', 'Aling Nena', 'Kuya Jun', 'Tita Luz', 'Mang Tony',
  'Aling Rosa', 'Kuya Ed', 'Mang Boy', 'Aling Cora', 'Kuya Danny',
  'Tita Ditas', 'Mang Erning', 'Aling Vicky', 'Kuya Nonoy', 'Mang Cesar',
];

const materialPrefixes = ['Metal', 'Steel', 'Paper', 'Copper', 'Iron', 'Eco'];

// Operating hour variations
const operatingHoursVariations = [
  {
    monday: '7:00 AM - 5:00 PM', tuesday: '7:00 AM - 5:00 PM', wednesday: '7:00 AM - 5:00 PM',
    thursday: '7:00 AM - 5:00 PM', friday: '7:00 AM - 5:00 PM', saturday: '7:00 AM - 12:00 PM', sunday: 'Closed',
  },
  {
    monday: '8:00 AM - 5:00 PM', tuesday: '8:00 AM - 5:00 PM', wednesday: '8:00 AM - 5:00 PM',
    thursday: '8:00 AM - 5:00 PM', friday: '8:00 AM - 5:00 PM', saturday: '8:00 AM - 3:00 PM', sunday: 'Closed',
  },
  {
    monday: '6:00 AM - 6:00 PM', tuesday: '6:00 AM - 6:00 PM', wednesday: '6:00 AM - 6:00 PM',
    thursday: '6:00 AM - 6:00 PM', friday: '6:00 AM - 6:00 PM', saturday: '6:00 AM - 6:00 PM', sunday: '6:00 AM - 12:00 PM',
  },
  {
    monday: '8:00 AM - 6:00 PM', tuesday: '8:00 AM - 6:00 PM', wednesday: '8:00 AM - 6:00 PM',
    thursday: '8:00 AM - 6:00 PM', friday: '8:00 AM - 6:00 PM', saturday: '8:00 AM - 4:00 PM', sunday: 'Closed',
  },
  {
    monday: '7:30 AM - 4:30 PM', tuesday: '7:30 AM - 4:30 PM', wednesday: '7:30 AM - 4:30 PM',
    thursday: '7:30 AM - 4:30 PM', friday: '7:30 AM - 4:30 PM', saturday: 'Closed', sunday: 'Closed',
  },
];

// Phone prefixes (Metro Manila landlines + mobile)
const phonePrefixes = ['(02) 8', '0917', '0918', '0919', '0920', '0927', '0928', '0935', '0936', '0945', '0956', '0977'];

// Descriptions
const mrfDescriptions = [
  'Government-operated MRF serving the local barangay. Accepts segregated household recyclables during operating hours.',
  'Community-run materials recovery facility. Walk-ins welcome. Please segregate materials before drop-off.',
  'Barangay MRF with weighing station and sorting area. Residents receive eco-points for recyclables brought in.',
  'Modern MRF equipped with conveyor belts and baling machines. Accepts bulk drop-offs from households and businesses.',
  'Small but well-maintained facility run by the barangay council. Focused on diverting recyclables from the landfill.',
  'LGU-operated recycling center with dedicated areas for plastics, paper, metals, and glass. Free drop-off for residents.',
  'Eco-center with educational displays about waste segregation. Open to school field trips by appointment.',
  'Newly renovated MRF with improved sorting capacity. Part of the municipal Zero Waste program.',
];

const junkShopDescriptions = [
  'Long-established junk shop buying all types of scrap metal, paper, and plastics at competitive prices.',
  'Family-run scrap trading business. We buy aluminum, copper, iron, paper, and plastic. Fair weighing guaranteed.',
  'Full-service junk shop with pickup available for large quantities. Call ahead for bulk scrap metal.',
  'Neighborhood junk shop open daily. Best prices for copper, brass, and aluminum in the area.',
  'Trusted buy-and-sell shop for recyclables. We also accept old appliances and electronic waste.',
  'Clean and organized junk shop. We weigh in front of you. Instant cash payment.',
  'Specializing in metal scrap and paper products. Serving the community for over 15 years.',
  'Reliable scrapyard accepting all recyclables. Pickup service available within 5 km radius.',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function jitter(base, range) {
  return base + randomBetween(-range, range);
}

function generatePhone() {
  const prefix = pick(phonePrefixes);
  if (prefix.startsWith('(02)')) {
    return `${prefix}${String(Math.floor(Math.random() * 9000000 + 1000000))}`;
  }
  return `${prefix}-${String(Math.floor(Math.random() * 9000000 + 1000000)).replace(/(\d{3})(\d{4})/, '$1-$2')}`;
}

function generatePostalCode(city) {
  const postalRanges = {
    'Manila': [1000, 1099], 'Quezon City': [1100, 1128], 'Caloocan': [1400, 1429],
    'Makati': [1200, 1234], 'Pasig': [1600, 1612], 'Taguig': [1630, 1638],
    'Mandaluyong': [1550, 1556], 'Marikina': [1800, 1811], 'Parañaque': [1700, 1714],
    'Las Piñas': [1740, 1752], 'Muntinlupa': [1770, 1781], 'Valenzuela': [1440, 1447],
    'San Juan': [1500, 1504], 'Pasay': [1300, 1309], 'Malabon': [1470, 1475],
    'Navotas': [1485, 1489], 'Antipolo': [1870, 1880], 'Cainta': [1900, 1905],
    'San Mateo': [1850, 1855], 'Bacoor': [4102, 4102], 'Imus': [4103, 4103],
    'Meycauayan': [3020, 3020],
  };
  const [min, max] = postalRanges[city] || [1000, 1999];
  return String(Math.floor(randomBetween(min, max + 1)));
}

function generateRating() {
  const count = Math.floor(randomBetween(0, 85));
  if (count === 0) return { average: 0, count: 0 };
  const average = Math.round(randomBetween(3.0, 5.0) * 10) / 10;
  return { average, count };
}

function buildHub(index) {
  // ~80 % Metro Manila, ~20 % nearby provinces
  const isMetro = Math.random() < 0.8;
  const cityObj = isMetro ? pick(metroManilaCities) : pick(nearbyCities);
  const { city, province, region } = cityObj;

  const type = Math.random() < 0.45 ? 'MRF' : 'Junk Shop';

  // Coordinates: jitter ±0.015° (~1.5 km) from city center
  const center = cityCoords[city];
  const lat = Math.round(jitter(center.lat, 0.015) * 10000) / 10000;
  const lng = Math.round(jitter(center.lng, 0.015) * 10000) / 10000;

  const barangay = pick(barangays[city] || ['Poblacion']);
  const street = pick(streets);

  // Name
  let name;
  if (type === 'MRF') {
    name = pick(mrfNames).replace('{city}', city).replace('{barangay}', barangay);
  } else {
    const owner = pick(ownerFirstNames);
    const mat = pick(materialPrefixes);
    name = pick(junkShopNames)
      .replace('{owner}', owner)
      .replace('{city}', city)
      .replace('{barangay}', barangay)
      .replace('{material}', mat);
  }

  // Accepted materials
  const materials = pick(materialSets[type]);

  // ~85 % verified, ~15 % unverified
  const verified = Math.random() < 0.85;

  // ~90 % active, ~8 % temporarily closed, ~2 % permanently closed
  let status = 'Active';
  const statusRoll = Math.random();
  if (statusRoll > 0.98) status = 'Permanently Closed';
  else if (statusRoll > 0.90) status = 'Temporarily Closed';

  const hubID = uuidv4();
  const createdAt = new Date(Date.now() - Math.floor(randomBetween(0, 365 * 24 * 60 * 60 * 1000))).toISOString();

  return {
    hubID,
    name,
    type,
    coordinates: { lat, lng },
    address: {
      street,
      barangay,
      city,
      province,
      region,
      postalCode: generatePostalCode(city),
    },
    acceptedMaterials: materials,
    operatingHours: pick(operatingHoursVariations),
    contact: {
      phone: generatePhone(),
      email: type === 'MRF' ? `mrf.${barangay.toLowerCase().replace(/\s+/g, '')}@${city.toLowerCase().replace(/\s+/g, '')}.gov.ph` : '',
      website: '',
    },
    verified,
    addedBy: null,
    verifiedBy: verified ? 'SYSTEM_SEED' : null,
    verifiedAt: verified ? createdAt : null,
    photos: [],
    ratings: generateRating(),
    status,
    description: type === 'MRF' ? pick(mrfDescriptions) : pick(junkShopDescriptions),
    createdAt,
    updatedAt: createdAt,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding 50 disposal hubs...\n');

  const batch = db.batch();
  const hubs = [];

  for (let i = 0; i < 50; i++) {
    const hub = buildHub(i);
    hubs.push(hub);
    const ref = db.collection('disposalHubs').doc(hub.hubID);
    batch.set(ref, hub);
  }

  await batch.commit();

  // Summary
  const mrfCount = hubs.filter(h => h.type === 'MRF').length;
  const jsCount = hubs.filter(h => h.type === 'Junk Shop').length;
  const verifiedCount = hubs.filter(h => h.verified).length;
  const cities = [...new Set(hubs.map(h => h.address.city))];

  console.log('✅ Done!\n');
  console.log(`   Total hubs:       ${hubs.length}`);
  console.log(`   MRFs:             ${mrfCount}`);
  console.log(`   Junk Shops:       ${jsCount}`);
  console.log(`   Verified:         ${verifiedCount}`);
  console.log(`   Cities covered:   ${cities.length} → ${cities.join(', ')}`);
  console.log('\n   Hub IDs:');
  hubs.forEach((h, i) => {
    console.log(`     ${String(i + 1).padStart(2)}. [${h.type.padEnd(9)}] ${h.name} (${h.address.city})`);
  });

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
