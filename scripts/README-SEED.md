# Disposal Hub Seed Script

This script populates your Firebase database with sample disposal hub data for testing the **Find Nearby Centers** feature.

## Sample Data Included

The script creates **8 disposal hubs** across Metro Manila:

1. **Green Earth MRF** - Quezon City (MRF)
2. **City Recycling Center** - Makati (MRF)
3. **E-Waste Collection Hub** - BGC, Taguig (MRF)
4. **Manila Junk Shop** - Manila (Junk Shop)
5. **Pasig Eco Center** - Pasig (MRF)
6. **Marikina Scrap Depot** - Marikina (Junk Shop)
7. **Caloocan Community Recycling** - Caloocan (MRF)
8. **Paranaque Junk Traders** - Parañaque (Junk Shop)

All hubs include:
- ✅ Verified status
- 📍 Coordinates for mapping
- 📞 Contact information
- ⭐ Sample ratings
- 🗂️ Accepted materials list
- 🕐 Operating hours

## How to Run

1. **Make sure your server is NOT running** (to avoid Firebase initialization conflicts)

2. **Run the seed script:**
   ```bash
   node scripts/seedDisposalHubs.js
   ```

3. **Verify the data:**
   - Check your Firebase Console → Firestore Database
   - You should see a new `disposalHubs` collection with 8 documents

4. **Start your server and test:**
   ```bash
   npm run dev
   ```
   - Navigate to: **Analytics → Find Nearby Centers**
   - You should now see the disposal hubs on the map!

## Expected Output

```
🔧 Initializing Firebase...
🌱 Starting to seed disposal hubs...

✅ Created: Green Earth MRF Quezon City (MRF) - Quezon City
✅ Created: City Recycling Center Makati (MRF) - Makati
✅ Created: E-Waste Collection Hub BGC (MRF) - Taguig
✅ Created: Manila Junk Shop (Junk Shop) - Manila
✅ Created: Pasig Eco Center (MRF) - Pasig
✅ Created: Marikina Scrap Depot (Junk Shop) - Marikina
✅ Created: Caloocan Community Recycling (MRF) - Caloocan
✅ Created: Paranaque Junk Traders (Junk Shop) - Parañaque

🎉 Seeding complete!
   ✅ Successfully created: 8 hubs

📍 You can now view these hubs in the Find Nearby Centers tab!
```

## Troubleshooting

### Error: Firebase initialization failed
- Make sure your `.env` file has all Firebase credentials:
  ```
  FIREBASE_API_KEY=...
  FIREBASE_AUTH_DOMAIN=...
  FIREBASE_PROJECT_ID=...
  FIREBASE_STORAGE_BUCKET=...
  FIREBASE_MESSAGING_SENDER_ID=...
  FIREBASE_APP_ID=...
  ```

### Error: Permission denied
- Check your Firebase Firestore Rules
- Make sure the rules allow write access to the `disposalHubs` collection

### Script hangs or doesn't exit
- Press `Ctrl+C` to force exit
- The data should still be created in Firebase

## Clearing Seeded Data

If you want to remove the seeded data:

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Select the `disposalHubs` collection
4. Delete all documents (or select specific ones)

## Adding More Hubs

You can add more hubs by:

1. **Using the UI:** Click "Suggest Location" in the Find Nearby Centers tab
2. **Editing the script:** Add more objects to the `sampleHubs` array
3. **Using the API:** POST to `/api/disposal-hubs/suggest` with authentication

## Next Steps

After seeding:
1. Test the map functionality
2. Try filtering by hub type (MRF/Junk Shop)
3. Click markers to see details
4. Try the "Get Directions" feature
5. Test the "Suggest Location" form
