import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './DisposalHubMap.module.css';
import { MapPin, Navigation, Phone, Mail, Globe, Clock, Star, Filter, Plus } from 'lucide-react';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons for different hub types
const createCustomIcon = (type, verified) => {
  const color = type === 'MRF' ? '#3B6535' : '#2196F3';
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

const DisposalHubMap = ({ disposalSites = [], userLocation, onSuggestHub }) => {
  const [selectedHub, setSelectedHub] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'MRF', 'Junk Shop'
  const [filterMaterial, setFilterMaterial] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [mapCenter, setMapCenter] = useState(
    userLocation || { lat: 14.5995, lng: 121.0000 } // Default to Manila
  );
  const [mapZoom, setMapZoom] = useState(13);

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
      const url = `https://www.google.com/maps/dir/?api=1&destination=${hub.coordinates.lat},${hub.coordinates.lng}`;
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

  // Reset to user location
  const resetToUserLocation = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapZoom(13);
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
          <p className={styles.subtitle}>
            {filteredSites.length} {filterType === 'all' ? 'disposal hubs' : filterType + 's'} found near you
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.filterButton}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filters
          </button>
          {onSuggestHub && (
            <button
              className={styles.suggestButton}
              onClick={onSuggestHub}
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

            {/* User location marker */}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>
                  <div className={styles.userPopup}>
                    <strong>Your Location</strong>
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
                        {hub.verified && <span className={styles.verifiedBadge}>✓ Verified</span>}
                      </h3>

                      <div className={styles.popupType}>
                        <span className={hub.type === 'MRF' ? styles.typeMRF : styles.typeJunkShop}>
                          {hub.type}
                        </span>
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
            {userLocation && (
              <button
                className={styles.controlButton}
                onClick={resetToUserLocation}
                title="Center on your location"
              >
                <Navigation size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar with list */}
        <div className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Nearby Hubs</h3>

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
                      {hub.verified && <span className={styles.verifiedBadge}>✓</span>}
                    </h4>
                    <span className={hub.type === 'MRF' ? styles.typeBadgeMRF : styles.typeBadgeJunk}>
                      {hub.type}
                    </span>
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
                    >
                      View on Map
                    </button>
                    <button
                      className={styles.directionsButtonSmall}
                      onClick={(e) => {
                        e.stopPropagation();
                        getDirections(hub);
                      }}
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
          <div className={styles.legendMarker} style={{ backgroundColor: '#2196F3' }}></div>
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
