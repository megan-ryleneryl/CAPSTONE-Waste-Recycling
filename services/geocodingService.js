// services/geocodingService.js
const NodeGeocoder = require('node-geocoder');

const geocoder = NodeGeocoder({
  provider: 'openstreetmap',
  httpAdapter: 'https',
  formatter: null
});

// Fallback coordinates for major Philippine cities
// These are approximate city center coordinates
const CITY_FALLBACK_COORDS = {
  // NCR Cities
  '137404000': { lat: 14.6760, lng: 121.0437, name: 'Quezon City' },
  '133900000': { lat: 14.5547, lng: 121.0244, name: 'Makati' },
  '137500000': { lat: 14.5764, lng: 121.0851, name: 'Pasig' },
  '137600000': { lat: 14.5176, lng: 121.0509, name: 'Taguig' },
  '133300000': { lat: 14.5995, lng: 120.9842, name: 'Manila' },
  '137800000': { lat: 14.5378, lng: 121.0014, name: 'Pasay' },
  '137700000': { lat: 14.4793, lng: 121.0198, name: 'Parañaque' },
  '134000000': { lat: 14.4453, lng: 120.9820, name: 'Las Piñas' },
  '137602000': { lat: 14.4081, lng: 121.0414, name: 'Muntinlupa' },
  '134500000': { lat: 14.6507, lng: 121.1029, name: 'Marikina' },
  '133700000': { lat: 14.5794, lng: 121.0359, name: 'Mandaluyong' },
  '134800000': { lat: 14.6019, lng: 121.0355, name: 'San Juan' },
  '137401000': { lat: 14.6488, lng: 120.9830, name: 'Caloocan' },
  '133800000': { lat: 14.6625, lng: 120.9559, name: 'Malabon' },
  '138100000': { lat: 14.6681, lng: 120.9402, name: 'Navotas' },
  '137403000': { lat: 14.7008, lng: 120.9830, name: 'Valenzuela' },

  // Other major cities (add as needed)
  '012800000': { lat: 14.1630, lng: 121.2425, name: 'Batangas City' },
  '041000000': { lat: 10.3157, lng: 123.8854, name: 'Cebu City' },
  '082100000': { lat: 7.0731, lng: 125.6128, name: 'Davao City' },
  '014200000': { lat: 14.0860, lng: 122.1545, name: 'Lipa' }
};

class GeocodingService {
  /**
   * Get coordinates from location object with fallback support
   * @param {Object} locationObj - Location with region, province, city, barangay, addressLine
   * @returns {Object|null} - {lat, lng, formattedAddress, isFallback} or null
   */
  static async getCoordinates(locationObj) {
    try {
      const { region, province, city, barangay } = locationObj;

      // Build address string - EXCLUDE addressLine for more reliable geocoding
      // Geocode to barangay level only (smallest unit for general location mapping)
      // addressLine is kept in location object for pickup details
      const parts = [
        barangay?.name,
        city?.name,
        province?.name,
        region?.name,
        'Philippines'
      ].filter(Boolean);

      const address = parts.join(', ');
      console.log('🗺️ Geocoding address (barangay level):', address);

      const results = await geocoder.geocode(address);

      if (results && results.length > 0) {
        console.log('✅ Geocoding successful:', {
          lat: results[0].latitude,
          lng: results[0].longitude
        });

        return {
          lat: results[0].latitude,
          lng: results[0].longitude,
          formattedAddress: results[0].formattedAddress,
          isFallback: false
        };
      }

      // FALLBACK: Try city-level fallback coordinates
      console.log('⚠️ Geocoding failed, attempting fallback to city center...');

      if (city?.code) {
        const fallback = CITY_FALLBACK_COORDS[city.code];
        if (fallback) {
          console.log(`✅ Using fallback coordinates for ${fallback.name}:`, {
            lat: fallback.lat,
            lng: fallback.lng
          });

          return {
            lat: fallback.lat,
            lng: fallback.lng,
            formattedAddress: `${fallback.name} (approximate city center)`,
            isFallback: true
          };
        }
      }

      console.log('❌ No geocoding results found and no fallback available');
      return null;
    } catch (error) {
      console.error('❌ Geocoding error:', error.message);

      // FALLBACK: Try city-level fallback on error
      const { city } = locationObj;
      if (city?.code) {
        const fallback = CITY_FALLBACK_COORDS[city.code];
        if (fallback) {
          console.log(`✅ Using fallback coordinates for ${fallback.name} (after error):`, {
            lat: fallback.lat,
            lng: fallback.lng
          });

          return {
            lat: fallback.lat,
            lng: fallback.lng,
            formattedAddress: `${fallback.name} (approximate city center)`,
            isFallback: true
          };
        }
      }

      return null;
    }
  }

  /**
   * Reverse geocode from coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Object|null} - Address components or null
   */
  static async reverseGeocode(lat, lng) {
    try {
      const results = await geocoder.reverse({ lat, lon: lng });
      return results[0] || null;
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates (in km)
   * @param {number} lat1 
   * @param {number} lng1 
   * @param {number} lat2 
   * @param {number} lng2 
   * @returns {number} - Distance in kilometers
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal
  }

  static toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if coordinates are within Philippines bounds
   * @param {number} lat 
   * @param {number} lng 
   * @returns {boolean}
   */
  static isWithinPhilippines(lat, lng) {
    // Philippines approximate bounds
    const bounds = {
      north: 21.3,
      south: 4.5,
      east: 127.0,
      west: 116.0
    };
    
    return lat >= bounds.south && 
           lat <= bounds.north && 
           lng >= bounds.west && 
           lng <= bounds.east;
  }
}

module.exports = GeocodingService;