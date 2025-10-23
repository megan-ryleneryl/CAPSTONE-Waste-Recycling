// Script to seed initial disposal hub data into Firebase
require('dotenv').config();
const DisposalHub = require('../models/DisposalHub');
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Initialize Firebase (uses the config from your .env or firebase config)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample disposal hubs data for Metro Manila
const sampleHubs = [
  {
    name: 'Green Earth MRF Quezon City',
    type: 'MRF',
    coordinates: { lat: 14.6760, lng: 121.0437 },
    address: {
      street: '123 Commonwealth Avenue',
      barangay: 'Barangay Holy Spirit',
      city: 'Quezon City',
      province: 'Metro Manila',
      region: 'NCR',
      postalCode: '1126'
    },
    acceptedMaterials: ['Plastic', 'Paper', 'Cardboard', 'Metal', 'Glass'],
    operatingHours: {
      monday: '8:00 AM - 5:00 PM',
      tuesday: '8:00 AM - 5:00 PM',
      wednesday: '8:00 AM - 5:00 PM',
      thursday: '8:00 AM - 5:00 PM',
      friday: '8:00 AM - 5:00 PM',
      saturday: '8:00 AM - 12:00 PM',
      sunday: 'Closed'
    },
    contact: {
      phone: '+63 2 8123 4567',
      email: 'contact@greenearthmrf.ph',
      website: 'https://greenearthmrf.ph'
    },
    description: 'A fully equipped Material Recovery Facility accepting various recyclable materials. We process and segregate waste materials for proper recycling.',
    verified: true,
    status: 'Active',
    ratings: { average: 4.5, count: 28 }
  },
  {
    name: 'City Recycling Center Makati',
    type: 'MRF',
    coordinates: { lat: 14.5547, lng: 121.0244 },
    address: {
      street: '456 Gil Puyat Avenue',
      barangay: 'Barangay Poblacion',
      city: 'Makati',
      province: 'Metro Manila',
      region: 'NCR',
      postalCode: '1210'
    },
    acceptedMaterials: ['Plastic', 'Paper', 'Metal', 'Glass', 'Organic Waste', 'Textiles'],
    operatingHours: {
      monday: '7:00 AM - 6:00 PM',
      tuesday: '7:00 AM - 6:00 PM',
      wednesday: '7:00 AM - 6:00 PM',
      thursday: '7:00 AM - 6:00 PM',
      friday: '7:00 AM - 6:00 PM',
      saturday: '7:00 AM - 3:00 PM',
      sunday: 'Closed'
    },
    contact: {
      phone: '+63 2 8987 6543',
      email: 'info@makatirecycling.gov.ph',
      website: ''
    },
    description: 'Government-operated MRF accepting all types of recyclable materials. Free drop-off service for Makati residents.',
    verified: true,
    status: 'Active',
    ratings: { average: 4.8, count: 45 }
  },
  {
    name: 'E-Waste Collection Hub BGC',
    type: 'MRF',
    coordinates: { lat: 14.5517, lng: 121.0509 },
    address: {
      street: '789 32nd Street, Bonifacio Global City',
      barangay: 'Barangay Fort Bonifacio',
      city: 'Taguig',
      province: 'Metro Manila',
      region: 'NCR',
      postalCode: '1634'
    },
    acceptedMaterials: ['Electronics', 'Batteries', 'Appliances', 'Computer Parts', 'Mobile Phones'],
    operatingHours: {
      monday: '9:00 AM - 5:00 PM',
      tuesday: '9:00 AM - 5:00 PM',
      wednesday: '9:00 AM - 5:00 PM',
      thursday: '9:00 AM - 5:00 PM',
      friday: '9:00 AM - 5:00 PM',
      saturday: '9:00 AM - 2:00 PM',
      sunday: 'Closed'
    },
    contact: {
      phone: '+63 2 8555 1234',
      email: 'ewaste@bgchub.com',
      website: 'https://ewastehub.ph'
    },
    description: 'Specialized e-waste collection and recycling center. We handle all types of electronic waste safely and responsibly.',
    verified: true,
    status: 'Active',
    ratings: { average: 4.7, count: 32 }
  },
  {
    name: 'Manila Junk Shop',
    type: 'Junk Shop',
    coordinates: { lat: 14.5995, lng: 120.9842 },
    address: {
      street: '101 Rizal Avenue',
      barangay: 'Barangay 289',
      city: 'Manila',
      province: 'Metro Manila',
      region: 'NCR',
      postalCode: '1000'
    },
    acceptedMaterials: ['Metal', 'Aluminum', 'Copper', 'Steel', 'Brass', 'Plastic Bottles'],
    operatingHours: {
      monday: '8:00 AM - 6:00 PM',
      tuesday: '8:00 AM - 6:00 PM',
      wednesday: '8:00 AM - 6:00 PM',
      thursday: '8:00 AM - 6:00 PM',
      friday: '8:00 AM - 6:00 PM',
      saturday: '8:00 AM - 4:00 PM',
      sunday: '8:00 AM - 12:00 PM'
    },
    contact: {
      phone: '+63 917 123 4567',
      email: '',
      website: ''
    },
    description: 'Local junk shop buying scrap metal and other recyclables. Fair prices and immediate payment.',
    verified: true,
    status: 'Active',
    ratings: { average: 4.2, count: 18 }
  },
  {
    name: 'Pasig Eco Center',
    type: 'MRF',
    coordinates: { lat: 14.5764, lng: 121.0851 },
    address: {
      street: '234 Ortigas Avenue',
      barangay: 'Barangay Kapitolyo',
      city: 'Pasig',
      province: 'Metro Manila',
      region: 'NCR',
      postalCode: '1603'
    },
    acceptedMaterials: ['Plastic', 'Paper', 'Glass', 'Metal', 'Organic Waste', 'Textiles', 'Electronics'],
    operatingHours: {
      monday: '8:00 AM - 5:00 PM',
      tuesday: '8:00 AM - 5:00 PM',
      wednesday: '8:00 AM - 5:00 PM',
      thursday: '8:00 AM - 5:00 PM',
      friday: '8:00 AM - 5:00 PM',
      saturday: '8:00 AM - 1:00 PM',
      sunday: 'Closed'
    },
    contact: {
      phone: '+63 2 8641 2345',
      email: 'ecocenter@pasig.gov.ph',
      website: 'https://pasig.gov.ph/ecocenter'
    },
    description: 'Community eco-center promoting zero waste. We accept all types of recyclables and conduct environmental education programs.',
    verified: true,
    status: 'Active',
    ratings: { average: 4.6, count: 22 }
  },
  {
    name: 'Marikina Scrap Depot',
    type: 'Junk Shop',
    coordinates: { lat: 14.6507, lng: 121.1029 },
    address: {
      street: '567 Shoe Avenue',
      barangay: 'Barangay Sta. Elena',
      city: 'Marikina',
      province: 'Metro Manila',
      region: 'NCR',
      postalCode: '1800'
    },
    acceptedMaterials: ['Metal', 'Aluminum', 'Paper', 'Cardboard', 'Plastic Bottles'],
    operatingHours: {
      monday: '8:00 AM - 5:00 PM',
      tuesday: '8:00 AM - 5:00 PM',
      wednesday: '8:00 AM - 5:00 PM',
      thursday: '8:00 AM - 5:00 PM',
      friday: '8:00 AM - 5:00 PM',
      saturday: '8:00 AM - 3:00 PM',
      sunday: 'Closed'
    },
    contact: {
      phone: '+63 918 765 4321',
      email: '',
      website: ''
    },
    description: 'Family-owned junk shop serving Marikina for over 20 years. We buy scrap materials at competitive prices.',
    verified: true,
    status: 'Active',
    ratings: { average: 4.3, count: 15 }
  },
  {
    name: 'Caloocan Community Recycling',
    type: 'MRF',
    coordinates: { lat: 14.6488, lng: 120.9830 },
    address: {
      street: '890 Rizal Avenue Extension',
      barangay: 'Barangay 12',
      city: 'Caloocan',
      province: 'Metro Manila',
      region: 'NCR',
      postalCode: '1400'
    },
    acceptedMaterials: ['Plastic', 'Paper', 'Glass', 'Metal', 'Textiles'],
    operatingHours: {
      monday: '8:00 AM - 4:00 PM',
      tuesday: '8:00 AM - 4:00 PM',
      wednesday: '8:00 AM - 4:00 PM',
      thursday: '8:00 AM - 4:00 PM',
      friday: '8:00 AM - 4:00 PM',
      saturday: '8:00 AM - 12:00 PM',
      sunday: 'Closed'
    },
    contact: {
      phone: '+63 2 8362 1234',
      email: 'recycling@caloocan.gov.ph',
      website: ''
    },
    description: 'Barangay-operated recycling facility. Free service for local residents.',
    verified: true,
    status: 'Active',
    ratings: { average: 4.1, count: 12 }
  },
  {
    name: 'Paranaque Junk Traders',
    type: 'Junk Shop',
    coordinates: { lat: 14.4793, lng: 121.0198 },
    address: {
      street: '345 Doña Soledad Avenue',
      barangay: 'Barangay Better Living',
      city: 'Parañaque',
      province: 'Metro Manila',
      region: 'NCR',
      postalCode: '1711'
    },
    acceptedMaterials: ['Metal', 'Aluminum', 'Copper', 'Paper', 'Cardboard'],
    operatingHours: {
      monday: '8:00 AM - 6:00 PM',
      tuesday: '8:00 AM - 6:00 PM',
      wednesday: '8:00 AM - 6:00 PM',
      thursday: '8:00 AM - 6:00 PM',
      friday: '8:00 AM - 6:00 PM',
      saturday: '8:00 AM - 4:00 PM',
      sunday: 'Closed'
    },
    contact: {
      phone: '+63 919 234 5678',
      email: '',
      website: ''
    },
    description: 'Reliable junk shop with honest pricing. We offer pickup service for large quantities.',
    verified: true,
    status: 'Active',
    ratings: { average: 4.4, count: 19 }
  }
];

async function seedDisposalHubs() {
  console.log('🌱 Starting to seed disposal hubs...\n');

  try {
    let successCount = 0;
    let errorCount = 0;

    for (const hubData of sampleHubs) {
      try {
        const hub = await DisposalHub.create(hubData);
        console.log(`✅ Created: ${hub.name} (${hub.type}) - ${hub.address.city}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to create ${hubData.name}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Seeding complete!`);
    console.log(`   ✅ Successfully created: ${successCount} hubs`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed: ${errorCount} hubs`);
    }
    console.log('\n📍 You can now view these hubs in the Find Nearby Centers tab!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run the seed script
console.log('🔧 Initializing Firebase...');
seedDisposalHubs();
