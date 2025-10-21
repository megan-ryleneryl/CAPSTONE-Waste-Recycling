// scripts/initMaterials.js
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin (adjust path to your service account)
const serviceAccount = require('../config/serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const defaultMaterials = [
  { displayName: 'White Paper (used)', category: 'Paper', type: 'white_paper_used', averagePricePerKg: 8.00 },
  { displayName: 'Cartons (corrugated, brown)', category: 'Paper', type: 'cartons_corrugated', averagePricePerKg: 2.50 },
  { displayName: 'Newspaper', category: 'Paper', type: 'newspaper', averagePricePerKg: 4.00 },
  { displayName: 'Assorted/Mixed waste paper', category: 'Paper', type: 'mixed_paper', averagePricePerKg: 1.50 },
  { displayName: 'PET Bottles', category: 'Plastic', type: 'pet_bottles', averagePricePerKg: 14.00 },
  { displayName: 'Aluminum Cans', category: 'Metal', type: 'aluminum_cans', averagePricePerKg: 50.00 },
  { displayName: 'Plastic (HDPE)', category: 'Plastic', type: 'plastic_hdpe', averagePricePerKg: 10.00 },
  { displayName: 'Plastic (LDPE)', category: 'Plastic', type: 'plastic_ldpe', averagePricePerKg: 5.00 },
  { displayName: 'Copper Wire_Class A', category: 'Metal', type: 'copper_wire_a', averagePricePerKg: 300.00 },
  { displayName: 'Copper Wire_Class B', category: 'Metal', type: 'copper_wire_b', averagePricePerKg: 250.00 },
  { displayName: 'Copper Wire_Class C', category: 'Metal', type: 'copper_wire_c', averagePricePerKg: 150.00 },
  { displayName: 'Steel (Iron alloys)', category: 'Metal', type: 'steel', averagePricePerKg: 9.00 },
  { displayName: 'Stainless Steel', category: 'Metal', type: 'stainless_steel', averagePricePerKg: 60.00 },
  { displayName: 'GI Sheet', category: 'Metal', type: 'gi_sheet', averagePricePerKg: 7.00 },
  { displayName: 'Tin Can', category: 'Metal', type: 'tin_can', averagePricePerKg: 3.00 },
  { displayName: 'Glass Bottles', category: 'Glass', type: 'glass_bottles', averagePricePerKg: 1.50 },
  { displayName: 'Glass Cullets (Broken glass)', category: 'Glass', type: 'glass_cullets', averagePricePerKg: 1.00 },
  { displayName: 'Electronic Waste', category: 'E-Waste', type: 'electronic_waste', averagePricePerKg: 70.00 }
].map(item => ({
  ...item,
  materialID: uuidv4(),
  pricingHistory: [{ price: item.averagePricePerKg, date: new Date() }],
  createdAt: new Date(),
  updatedAt: new Date()
}));

async function initializeMaterials() {
  console.log('🚀 Starting material initialization...');
  
  try {
    const batch = db.batch();
    
    for (const material of defaultMaterials) {
      const docRef = db.collection('materials').doc(material.materialID);
      batch.set(docRef, material);
      console.log(`✅ Added: ${material.displayName}`);
    }
    
    await batch.commit();
    console.log('🎉 All recyclables initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing materials:', error);
    process.exit(1);
  }
}

initializeMaterials();
