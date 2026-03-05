/**
 * update-material-prices.js
 * 
 * Run from the backend root: node scripts/update-material-prices.js
 * 
 * This script updates all materials in Firestore with:
 *   - standardMarketPrice: strictly 1/5th of current junk shop estimate
 *   - maxPricePerKg: factory average price (price cap)
 *   - averagePricePerKg is NOT changed (preserves existing community data)
 * 
 * Source: EMB Central Office MRF recyclable price list
 * Adjustment: Prices dropped ~20-30% since document was published
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAtaEB8Sw4Nj9tjsGAAsyTdS8XsVvpvK0E",
  authDomain: "capstone-recycling-system.firebaseapp.com",
  projectId: "capstone-recycling-system",
  storageBucket: "capstone-recycling-system.firebasestorage.app",
  messagingSenderId: "175035875160",
  appId: "1:175035875160:web:01a59fc73c851aa7842f2d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// standardMarketPrice = current junk shop estimate / 5 (strictly 1/5th)
// maxPricePerKg = factory price (adjusted down from EMB doc)
// Current junk shop estimates are ~20-30% below the EMB document values

const MATERIAL_UPDATES = [
  {
    materialID: '87cdcf2e-77e9-44d7-be87-4199b753389d',
    displayName: 'White Paper (used)',
    // EMB junk shop: P8 -> Current est: ~P6 -> /5 = P1.20
    standardMarketPrice: 1.20,
    maxPricePerKg: 8,
  },
  {
    materialID: '4bfdcdd0-5954-490e-94d4-dbb4709f6f52',
    displayName: 'Cartons (corrugated, brown)',
    // EMB junk shop: P2.50 -> Current est: ~P2 -> /5 = P0.40
    standardMarketPrice: 0.40,
    maxPricePerKg: 2.50,
  },
  {
    materialID: '46ee1fd7-02be-499f-80d6-4c0883859334',
    displayName: 'Newspaper',
    // EMB junk shop: P4 -> Current est: ~P3 -> /5 = P0.60
    standardMarketPrice: 0.60,
    maxPricePerKg: 5,
  },
  {
    materialID: '2a10510b-5a5e-4713-8ee9-b0d81b051e15',
    displayName: 'Assorted/Mixed waste paper',
    // EMB junk shop: P1.50 -> Current est: ~P1 -> /5 = P0.20
    standardMarketPrice: 0.20,
    maxPricePerKg: 1.50,
  },
  {
    materialID: '776a606a-452e-4892-8457-13b3fe1951ab',
    displayName: 'PET Bottles',
    // EMB junk shop: P12-16 -> Current est: ~P8 -> /5 = P1.60
    standardMarketPrice: 1.60,
    maxPricePerKg: 15,
  },
  {
    materialID: 'e5db559b-a19c-407d-9962-ab11096b58ed',
    displayName: 'Aluminum Cans',
    // EMB junk shop: P50 -> Current est: ~P35 -> /5 = P7.00
    standardMarketPrice: 7.00,
    maxPricePerKg: 50,
  },
  {
    materialID: '717b308a-53ab-4847-a489-54c47d6fd866',
    displayName: 'Plastic (HDPE)',
    // EMB junk shop: P10 -> Current est: ~P7 -> /5 = P1.40
    standardMarketPrice: 1.40,
    maxPricePerKg: 10,
  },
  {
    materialID: 'ea9714a5-24a5-48c3-853b-3d5415996c5c',
    displayName: 'Plastic (LDPE)',
    // EMB junk shop: P5 -> Current est: ~P3.50 -> /5 = P0.70
    standardMarketPrice: 0.70,
    maxPricePerKg: 8,
  },
  {
    materialID: '84b63e91-f3c1-44c3-b030-2d5c33f91adf',
    displayName: 'Copper Wire_Class A',
    // EMB junk shop: P300 -> Current est: ~P220 -> /5 = P44.00
    standardMarketPrice: 44.00,
    maxPricePerKg: 280,
  },
  {
    materialID: 'f1bc3b82-847a-47b3-9f37-2316537187bc',
    displayName: 'Copper Wire_Class B',
    // EMB junk shop: P250 -> Current est: ~P180 -> /5 = P36.00
    standardMarketPrice: 36.00,
    maxPricePerKg: 240,
  },
  {
    materialID: 'fc9079bc-95c2-4c2e-9727-eefe620e41a0',
    displayName: 'Copper Wire_Class C',
    // EMB junk shop: P150 -> Current est: ~P110 -> /5 = P22.00
    standardMarketPrice: 22.00,
    maxPricePerKg: 160,
  },
  {
    materialID: 'e2002696-b658-4064-b6f1-95e58003e9e3',
    displayName: 'Steel (Iron alloys)',
    // EMB junk shop: P9 -> Current est: ~P7 -> /5 = P1.40
    standardMarketPrice: 1.40,
    maxPricePerKg: 10,
  },
  {
    materialID: '1f3e8623-6021-4dfc-80a7-18e71291b587',
    displayName: 'Stainless Steel',
    // EMB junk shop: P60 -> Current est: ~P45 -> /5 = P9.00
    standardMarketPrice: 9.00,
    maxPricePerKg: 56,
  },
  {
    materialID: '7bc27fc3-1452-4616-b97a-67ce445c20f4',
    displayName: 'GI Sheet',
    // EMB junk shop: P7 -> Current est: ~P5 -> /5 = P1.00
    standardMarketPrice: 1.00,
    maxPricePerKg: 8,
  },
  {
    materialID: 'cf23be26-02a1-47da-802f-1cbb0bef6a5d',
    displayName: 'Tin Can',
    // EMB junk shop: ~P5 -> Current est: ~P3.50 -> /5 = P0.70
    standardMarketPrice: 0.70,
    maxPricePerKg: 7,
  },
  {
    materialID: 'e3c385b3-0bcd-4e6b-8469-91b8bd62bb93',
    displayName: 'Glass Bottles',
    // EMB junk shop: ~P2 -> Current est: ~P1.50 -> /5 = P0.30
    standardMarketPrice: 0.30,
    maxPricePerKg: 2.50,
  },
  {
    materialID: '43d2e707-45a1-4a1f-ad9f-3d075c6a94c1',
    displayName: 'Glass Cullets (Broken glass)',
    // EMB junk shop: ~P1 -> Current est: ~P0.75 -> /5 = P0.15
    standardMarketPrice: 0.15,
    maxPricePerKg: 4,
  },
  {
    materialID: '6ddaae84-7ef0-4d99-9e2d-da3b19b85369',
    displayName: 'Electronic Waste',
    // EMB junk shop: ~P8-10 -> Current est: ~P6 -> /5 = P1.20
    standardMarketPrice: 1.20,
    maxPricePerKg: 8,
  },
];

async function updateMaterials() {
  console.log('===================================================');
  console.log('  EcoTayo Material Price Migration Script');
  console.log('  Formula: 70% base + 30% market (qty-weighted)');
  console.log('  Base = standardMarketPrice (1/5 of junk shop)');
  console.log('===================================================\n');

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const mat of MATERIAL_UPDATES) {
    try {
      const materialRef = doc(db, 'materials', mat.materialID);
      const snap = await getDoc(materialRef);

      if (!snap.exists()) {
        console.log('  SKIP: "' + mat.displayName + '" -- not found (ID: ' + mat.materialID + ')');
        skipped++;
        continue;
      }

      const current = snap.data();

      await updateDoc(materialRef, {
        standardMarketPrice: mat.standardMarketPrice,
        maxPricePerKg: mat.maxPricePerKg,
        updatedAt: new Date(),
      });

      console.log(
        '  OK ' + mat.displayName.padEnd(32) + ' | ' +
        'base(1/5): P' + mat.standardMarketPrice.toFixed(2).padStart(7) + ' | ' +
        'max(factory): P' + mat.maxPricePerKg.toFixed(2).padStart(7) + ' | ' +
        'community: P' + (current.averagePricePerKg || 0).toString().padStart(6)
      );
      updated++;
    } catch (err) {
      console.error('  ERR: "' + mat.displayName + '" -- ' + err.message);
      errors++;
    }
  }

  console.log('\n===================================================');
  console.log('  Done! Updated: ' + updated + ' | Skipped: ' + skipped + ' | Errors: ' + errors);
  console.log('===================================================');
  console.log('\nPET Bottles example:');
  console.log('  base = P1.60 (1/5 of ~P8 current junk shop)');
  console.log('  market avg ~ P13.46 (community qty-weighted)');
  console.log('  display = (1.60 x 0.7) + (13.46 x 0.3) = P5.16');
  console.log('  max cap = P15 (factory price)\n');

  process.exit(0);
}

updateMaterials().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
