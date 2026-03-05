import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './DisposalHubMap.module.css';
import GuideLink from '../guide/GuideLink';
import { MapPin, Navigation, Phone, Mail, Globe, Clock, Star, Filter, Plus, Crosshair, Target } from 'lucide-react';

// Custom marker icons removed - using custom divIcon instead

// Custom icons for different hub types
const createCustomIcon = (type, verified) => {
  const color = type === 'MRF' ? '#3B6535' : '#F0924C';
  const badge = verified ? '✓' : '';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 14px;
          color: white;
          font-weight: bold;
        ">${badge}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Component to update map view when user location changes
const MapViewController = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  return null;
};

// Component to handle map clicks for setting custom location
const MapClickHandler = ({ onLocationSet, enabled }) => {
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onLocationSet({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
};

const DisposalHubMap = ({ disposalSites = [], userLocation, onSuggestHub, onLocationChange, onRadiusChange, currentSearchLocation, searchRadius = 10 }) => {
  const [selectedHub, setSelectedHub] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'MRF', 'Junk Shop'
  const [filterMaterial, setFilterMaterial] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [mapCenter, setMapCenter] = useState(
    { lat: 14.5995, lng: 121.0000 } // Default to Metro Manila
  );
  const [mapZoom, setMapZoom] = useState(11); // Zoom out to show more of Metro Manila
  const [clickToSetLocation, setClickToSetLocation] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get unique materials for filter
  const allMaterials = [...new Set(
    disposalSites.flatMap(site => site.acceptedMaterials || site.types || [])
  )].filter(m => m);

  // Filter disposal sites based on selected filters
  const filteredSites = disposalSites.filter(site => {
    const typeMatch = filterType === 'all' || site.type === filterType;
    const materialMatch = filterMaterial === 'all' ||
      (site.acceptedMaterials || site.types || []).some(
        m => m.toLowerCase().includes(filterMaterial.toLowerCase())
      );
    return typeMatch && materialMatch;
  });

  // Get directions to hub (opens Google Maps)
  const getDirections = (hub) => {
    if (hub.coordinates && hub.coordinates.lat && hub.coordinates.lng) {
      let url = `https://www.google.com/maps/dir/?api=1&destination=${hub.coordinates.lat},${hub.coordinates.lng}`;

      // Add origin if search location is set
      if (currentSearchLocation && currentSearchLocation.lat && currentSearchLocation.lng) {
        url += `&origin=${currentSearchLocation.lat},${currentSearchLocation.lng}`;
      }

      window.open(url, '_blank');
    }
  };

  // Center map on specific hub
  const centerOnHub = (hub) => {
    if (hub.coordinates) {
      setMapCenter({ lat: hub.coordinates.lat, lng: hub.coordinates.lng });
      setMapZoom(16);
      setSelectedHub(hub);
    }
  };

  // Center map on search location
  const resetToUserLocation = () => {
    if (currentSearchLocation) {
      console.log('Centering map on search location:', currentSearchLocation);
      setMapCenter({ ...currentSearchLocation }); // Create new object to force update
      setMapZoom(13);
    } else {
      alert('Please set your location first using "Use current location" or "Set a custom location"');
    }
  };

  // Get user's current GPS location
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('GPS location obtained:', newLocation);
        setMapCenter({ ...newLocation }); // Create new object to force update
        setMapZoom(13);
        if (onLocationChange) {
          console.log('Notifying parent of location change');
          onLocationChange(newLocation);
        }
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to retrieve your location. Please try clicking on the map instead.');
        setIsGettingLocation(false);
      }
    );
  };

  // Toggle click-to-set-location mode
  const toggleClickMode = () => {
    setClickToSetLocation(!clickToSetLocation);
  };

  // Handle map click to set custom location
  const handleMapClick = (location) => {
    console.log('Map clicked, setting custom location:', location);
    setMapCenter({ ...location }); // Create new object to force update
    setMapZoom(13);
    if (onLocationChange) {
      console.log('Notifying parent of location change');
      onLocationChange(location);
    }
    setClickToSetLocation(false); // Disable click mode after setting location
  };

  // Handle radius change
  const handleRadiusChange = (newRadius) => {
    if (onRadiusChange) {
      onRadiusChange(newRadius);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header with filters */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>
            <MapPin size={24} />
            Disposal Hub Locator
          </h2>
        </div>
        <div style={{ textAlign: 'left', marginTop: '0.25rem' }}>
          <h3 className={styles.helpText}>Tip: Set your map location to view nearby hubs</h3>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.filterButton}
            onClick={() => setShowFilters(!showFilters)}
            title="Show or hide filters for hub type and materials"
          >
            <Filter size={18} />
            Filters
          </button>
          {onSuggestHub && (
            <button
              className={styles.suggestButton}
              onClick={onSuggestHub}
              title="Suggest a new disposal hub location"
            >
              <Plus size={18} />
              Suggest Location
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className={styles.filterPanel}>
          {/* Hub Type Filter */}
          <div className={styles.filterGroup}>
            <label>Hub Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Types</option>
              <option value="MRF">MRF (Material Recovery Facility)</option>
              <option value="Junk Shop">Junk Shop</option>
            </select>
          </div>

          {/* Material Filter */}
          <div className={styles.filterGroup}>
            <label>Material Accepted:</label>
            <select
              value={filterMaterial}
              onChange={(e) => setFilterMaterial(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Materials</option>
              {allMaterials.map(material => (
                <option key={material} value={material}>{material}</option>
              ))}
            </select>
          </div>

          <button
            className={styles.clearFiltersButton}
            onClick={() => {
              setFilterType('all');
              setFilterMaterial('all');
            }}
            title="Reset all filters to show all hub types and materials"
          >
            Clear Filters
          </button>
        </div>
      )}

      <div className={styles.mapContainer}>
        {/* Map */}
        <div className={styles.map}>
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={mapZoom}
            className={styles.leafletMap}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapViewController center={[mapCenter.lat, mapCenter.lng]} zoom={mapZoom} />
            <MapClickHandler onLocationSet={handleMapClick} enabled={clickToSetLocation} />

            {/* Search radius circle */}
            {currentSearchLocation && (
              <Circle
                center={[currentSearchLocation.lat, currentSearchLocation.lng]}
                radius={searchRadius * 1000} // Convert km to meters
                pathOptions={{
                  color: '#3B6535',
                  fillColor: '#3B6535',
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: '5, 10'
                }}
              />
            )}

            {/* Search location marker (different from user location) */}
            {currentSearchLocation && (
              <Marker
                position={[currentSearchLocation.lat, currentSearchLocation.lng]}
                icon={L.divIcon({
                  className: 'search-location-marker',
                  html: `
                    <div style="
                      background-color: #dc2626;
                      width: 24px;
                      height: 24px;
                      border-radius: 50%;
                      border: 3px solid white;
                      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    "></div>
                  `,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12],
                })}
              >
                <Popup>
                  <div className={styles.userPopup}>
                    <strong>Search Center</strong>
                    <p>Showing hubs within {searchRadius} km</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Disposal hub markers */}
            {filteredSites.map((hub) => (
              hub.coordinates && hub.coordinates.lat && hub.coordinates.lng && (
                <Marker
                  key={hub.id || hub.hubID}
                  position={[hub.coordinates.lat, hub.coordinates.lng]}
                  icon={createCustomIcon(hub.type, hub.verified)}
                  eventHandlers={{
                    click: () => setSelectedHub(hub),
                  }}
                >
                  <Popup className={styles.customPopup}>
                    <div className={styles.popupContent}>
                      <h3 className={styles.popupTitle}>
                        {hub.name}
                      </h3>

                      <div className={styles.popupType}>
                        <div className={hub.type === 'MRF' ? styles.typeMRF : styles.typeJunkShop}>
                          {hub.type}
                        </div>
                        <div>
                          {hub.verified ? (
                            <span className={styles.verifiedBadge}>✓ Verified</span>
                          ) : (
                            <span className={styles.unverifiedBadge}>Pending Verification</span>
                          )}
                        </div>
                      </div>

                      <div className={styles.popupInfo}>
                        <MapPin size={14} />
                        <span>{hub.address}</span>
                      </div>

                      {hub.distance && (
                        <div className={styles.popupInfo}>
                          <Navigation size={14} />
                          <span>{hub.distance} away</span>
                        </div>
                      )}

                      {hub.operatingHours && (
                        <div className={styles.popupInfo}>
                          <Clock size={14} />
                          <span>{hub.operatingHours}</span>
                        </div>
                      )}

                      {hub.ratings && hub.ratings.count > 0 && (
                        <div className={styles.popupInfo}>
                          <Star size={14} />
                          <span>{hub.ratings.average.toFixed(1)} ({hub.ratings.count} reviews)</span>
                        </div>
                      )}

                      <div className={styles.materialsSection}>
                        <strong>Accepted Materials:</strong>
                        <div className={styles.materialTags}>
                          {(hub.acceptedMaterials || hub.types || []).map((material, idx) => (
                            <span key={idx} className={styles.materialTag}>{material}</span>
                          ))}
                        </div>
                      </div>

                      <button
                        className={styles.directionsButton}
                        onClick={() => getDirections(hub)}
                        title="Open directions to this hub in Google Maps"
                      >
                        <Navigation size={16} />
                        Get Directions
                      </button>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>

          {/* Map Controls */}
          <div className={styles.mapControls}>
            {/* Location Controls */}
            <div className={styles.locationControlsMap}>
              <button
                className={styles.mapControlButton}
                onClick={useMyLocation}
                disabled={isGettingLocation}
                title="Use your current GPS location"
              >
                <Crosshair size={20} /> Use current location
                
              </button>
              <button
                className={`${styles.mapControlButton} ${clickToSetLocation ? styles.active : ''}`}
                onClick={toggleClickMode}
                title="Click on the map to set a custom location"
              >
                <Target size={20} />
                 Set a custom location
              </button>
            </div>

            {/* Radius Control */}
            <div className={styles.radiusControlMap}>
              <label className={styles.radiusLabel}>{searchRadius} km</label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={searchRadius}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                className={styles.radiusSliderMap}
                title={`Search radius: ${searchRadius} km`}
              />
            </div>

            {/* Reset to search location (if set) */}
            {currentSearchLocation && (
              <button
                className={styles.mapControlButton}
                onClick={resetToUserLocation}
                title="Center on search location"
              >
                <Navigation size={20} /> Center on search
              </button>
            )}
          </div>

          {/* Click Mode Hint */}
          {clickToSetLocation && (
            <div className={styles.clickModeHintMap}>
              <Target size={16} />
              Click anywhere on the map to set your search location
            </div>
          )}
        </div>

        {/* Sidebar with list */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Nearby Hubs
            <p className={styles.subtitle}>
              {filteredSites.length} {filterType === 'all' ? 'disposal hubs' : filterType + 's'}
            </p>
          </div>

          {filteredSites.length === 0 ? (
            <div className={styles.noResults}>
              <MapPin size={48} className={styles.noResultsIcon} />
              <p>No disposal hubs found</p>
              <p className={styles.noResultsSubtext}>
                Try adjusting your filters or suggest a new location
              </p>
            </div>
          ) : (
            <div className={styles.hubList}>
              {filteredSites.map((hub) => (
                <div
                  key={hub.id || hub.hubID}
                  className={`${styles.hubCard} ${selectedHub?.id === hub.id ? styles.hubCardActive : ''}`}
                  onClick={() => centerOnHub(hub)}
                >
                  <div className={styles.hubCardHeader}>
                    <h4 className={styles.hubName}>
                      {hub.name}
                    </h4>
                    <span className={hub.type === 'MRF' ? styles.typeBadgeMRF : styles.typeBadgeJunk}>
                      {hub.type}
                    </span>
                    {hub.verified ? (
                      <span className={styles.verifiedBadge}>✓</span>
                    ) : (
                      <span className={styles.unverifiedBadge}>Pending</span>
                    )}
                  </div>

                  {hub.distance && (
                    <div className={styles.hubDistance}>
                      <Navigation size={14} />
                      {hub.distance}
                    </div>
                  )}

                  <div className={styles.hubAddress}>
                    <MapPin size={14} />
                    {hub.address}
                  </div>

                  {hub.contact && (
                    <div className={styles.hubContact}>
                      <Phone size={14} />
                      {hub.contact}
                    </div>
                  )}

                  <div className={styles.hubMaterials}>
                    {(hub.acceptedMaterials || hub.types || []).slice(0, 3).map((material, idx) => (
                      <span key={idx} className={styles.materialChip}>{material}</span>
                    ))}
                    {(hub.acceptedMaterials || hub.types || []).length > 3 && (
                      <span className={styles.materialChip}>+{(hub.acceptedMaterials || hub.types).length - 3} more</span>
                    )}
                  </div>

                  <div className={styles.hubActions}>
                    <button
                      className={styles.viewButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        centerOnHub(hub);
                      }}
                      title="Center map on this disposal hub"
                    >
                      View on Map
                    </button>
                    <button
                      className={styles.directionsButtonSmall}
                      onClick={(e) => {
                        e.stopPropagation();
                        getDirections(hub);
                      }}
                      title="Get directions to this hub"
                    >
                      <Navigation size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendMarker} style={{ backgroundColor: '#3B6535' }}></div>
          <span>MRF (Material Recovery Facility)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendMarker} style={{ backgroundColor: '#F0924C' }}></div>
          <span>Junk Shop</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.verifiedBadge}>✓</span>
          <span>Verified Location</span>
        </div>
      </div>
    </div>
  );
};

export default DisposalHubMap;
