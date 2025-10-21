// client/src/services/geocodingService.js
// Frontend geocoding service using Nominatim OpenStreetMap API

class GeocodingService {
  /**
   * Get coordinates from location object
   * @param {Object} locationObj - Location with region, province, city, barangay, addressLine
   * @returns {Object|null} - {lat, lng, formattedAddress} or null
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

      // Use Nominatim OpenStreetMap API
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WasteRecyclingApp/1.0' // Nominatim requires a user agent
        }
      });

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const results = await response.json();

      if (results && results.length > 0) {
        const result = results[0];
        console.log('✅ Geocoding successful:', {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        });

        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          formattedAddress: result.display_name
        };
      }

      console.log('⚠️ No geocoding results found');
      return null;
    } catch (error) {
      console.error('❌ Geocoding error:', error.message);
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
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WasteRecyclingApp/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Reverse geocoding API error: ${response.status}`);
      }

      const result = await response.json();
      return result || null;
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

export default GeocodingService;
