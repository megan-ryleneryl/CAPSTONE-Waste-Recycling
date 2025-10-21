// client/src/services/psgcService.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class PSGCService {
  static async getRegions() {
    try {
      const response = await fetch(`${API_BASE_URL}/psgc/regions`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching regions:', error);
      return [];
    }
  }

  static async getProvinces(regionCode) {
    try {
      const response = await fetch(`${API_BASE_URL}/psgc/regions/${regionCode}/provinces`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching provinces:', error);
      return [];
    }
  }

  static async getCitiesMunicipalities(provinceCode) {
    try {
      const response = await fetch(`${API_BASE_URL}/psgc/provinces/${provinceCode}/cities-municipalities`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching cities/municipalities:', error);
      return [];
    }
  }

  // NEW METHOD: Get cities for NCR directly from region
  static async getCitiesFromRegion(regionCode) {
    try {
      const response = await fetch(`${API_BASE_URL}/psgc/regions/${regionCode}/cities-municipalities`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching cities from region:', error);
      return [];
    }
  }

  static async getBarangays(cityCode) {
    try {
      const response = await fetch(`${API_BASE_URL}/psgc/cities-municipalities/${cityCode}/barangays`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching barangays:', error);
      return [];
    }
  }
}

export default PSGCService;