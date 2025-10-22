import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, Circle, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import styles from './GeographicHeatmap.module.css';
import { MapPin, ZoomIn, ZoomOut, Maximize2, Activity, TrendingUp } from 'lucide-react';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom heatmap layer component
const HeatmapLayer = ({ points }) => {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Remove existing heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Create heat layer with leaflet.heat
    const heatPoints = points.map(point => [
      point.lat,
      point.lng,
      point.intensity || 0.5
    ]);

    heatLayerRef.current = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 35,
      maxZoom: 13,
      max: 1.0,
      gradient: {
        0.0: '#ffffff',
        0.2: '#ffffb2',
        0.4: '#fed976',
        0.6: '#feb24c',
        0.8: '#fd8d3c',
        1.0: '#f03b20'
      }
    }).addTo(map);

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [points, map]);

  return null;
};

// Map controls component
const MapControls = ({ onZoomToPhilippines, onZoomToNCR }) => {
  return (
    <div className={styles.mapControls}>
      <button
        className={styles.controlButton}
        onClick={onZoomToPhilippines}
        title="Zoom to Philippines"
      >
        <Maximize2 size={18} />
        <span>Philippines</span>
      </button>
      <button
        className={styles.controlButton}
        onClick={onZoomToNCR}
        title="Zoom to Metro Manila"
      >
        <ZoomIn size={18} />
        <span>Metro Manila</span>
      </button>
    </div>
  );
};

// Area markers component
const AreaMarkers = ({ areas }) => {
  if (!areas || areas.length === 0) return null;

  return (
    <>
      {areas.map((area, index) => (
        <Circle
          key={index}
          center={[area.lat, area.lng]}
          radius={area.radius || 2000}
          pathOptions={{
            fillColor: area.color || '#3B6535',
            fillOpacity: 0.3,
            color: area.color || '#3B6535',
            weight: 2,
            opacity: 0.6
          }}
        >
          <Popup>
            <div className={styles.popupContent}>
              <h3>{area.name}</h3>
              <div className={styles.popupStats}>
                <div className={styles.popupStat}>
                  <Activity size={16} />
                  <span><strong>{area.activityCount || 0}</strong> total activities</span>
                </div>
              </div>
              <div className={styles.popupBreakdown}>
                <div className={styles.popupBreakdownTitle}>Activity Breakdown:</div>
                {area.wastePosts > 0 && (
                  <div className={styles.popupBreakdownItem}>
                    <span className={styles.popupDot}>📦</span>
                    <span>{area.wastePosts} Waste Posts</span>
                  </div>
                )}
                {area.forumPosts > 0 && (
                  <div className={styles.popupBreakdownItem}>
                    <span className={styles.popupDot}>💬</span>
                    <span>{area.forumPosts} Forum Posts</span>
                  </div>
                )}
                {area.initiativePosts > 0 && (
                  <div className={styles.popupBreakdownItem}>
                    <span className={styles.popupDot}>🎯</span>
                    <span>{area.initiativePosts} Initiative Posts</span>
                  </div>
                )}
                {area.completedPickups > 0 && (
                  <div className={styles.popupBreakdownItem}>
                    <span className={styles.popupDot}>✅</span>
                    <span>{area.completedPickups} Completed Pickups</span>
                  </div>
                )}
                {area.completedSupports > 0 && (
                  <div className={styles.popupBreakdownItem}>
                    <span className={styles.popupDot}>🤝</span>
                    <span>{area.completedSupports} Completed Supports</span>
                  </div>
                )}
              </div>
              <p className={styles.popupLevel}>
                Activity Level: <strong>{area.activityLevel || 'Low'}</strong>
              </p>
            </div>
          </Popup>
        </Circle>
      ))}
    </>
  );
};

const GeographicHeatmap = ({ heatmapData = [], areaData = [], breakdown = null }) => {
  const [mapView, setMapView] = useState('philippines');
  const mapRef = useRef(null);

  // Philippines coordinates
  const philippinesCenter = [12.8797, 121.7740];
  const philippinesZoom = 6;

  // NCR/Metro Manila coordinates
  const ncrCenter = [14.5995, 121.0000];
  const ncrZoom = 11;

  const handleZoomToPhilippines = () => {
    if (mapRef.current) {
      mapRef.current.setView(philippinesCenter, philippinesZoom);
      setMapView('philippines');
    }
  };

  const handleZoomToNCR = () => {
    if (mapRef.current) {
      mapRef.current.setView(ncrCenter, ncrZoom);
      setMapView('ncr');
    }
  };

  // Calculate statistics
  const stats = {
    totalAreas: areaData.length,
    totalActivity: areaData.reduce((sum, area) => sum + (area.activityCount || 0), 0),
    highActivityAreas: areaData.filter(area => area.activityLevel === 'High').length,
    avgActivity: areaData.length > 0
      ? (areaData.reduce((sum, area) => sum + (area.activityCount || 0), 0) / areaData.length).toFixed(1)
      : 0
  };

  return (
    <div className={styles.heatmapContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>
            <MapPin className={styles.titleIcon} />
            Geographic Activity Heatmap
          </h2>
          <p className={styles.subtitle}>
            Recycling activity distribution across {mapView === 'philippines' ? 'the Philippines' : 'Metro Manila'}
          </p>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.totalAreas}</span>
            <span className={styles.statLabel}>Active Areas</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.totalActivity}</span>
            <span className={styles.statLabel}>Total Activities</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.highActivityAreas}</span>
            <span className={styles.statLabel}>High Activity Zones</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.avgActivity}</span>
            <span className={styles.statLabel}>Avg per Area</span>
          </div>
        </div>
      </div>

      <div className={styles.mapWrapper}>
        <MapContainer
          center={philippinesCenter}
          zoom={philippinesZoom}
          className={styles.map}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"

          />

          {/* Heatmap layer */}
          {heatmapData.length > 0 && <HeatmapLayer points={heatmapData} />}

          {/* Area circles with popups */}
          <AreaMarkers areas={areaData} />
        </MapContainer>

        <MapControls
          onZoomToPhilippines={handleZoomToPhilippines}
          onZoomToNCR={handleZoomToNCR}
        />
      </div>

      <div className={styles.legend}>
        <h3 className={styles.legendTitle}>Activity Intensity</h3>
        <div className={styles.legendGradient}>
          <div className={styles.gradientBar}></div>
          <div className={styles.legendLabels}>
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Activity Breakdown */}
      {breakdown && breakdown.totalActivity > 0 && (
        <div className={styles.breakdownSection}>
          <h3 className={styles.breakdownTitle}>
            <TrendingUp size={18} />
            Activity Breakdown
          </h3>
          <p className={styles.breakdownSubtitle}>
            What activities are included in this heatmap
          </p>
          <div className={styles.breakdownGrid}>
            <div className={styles.breakdownCard}>
              <div className={styles.breakdownIcon}>📦</div>
              <div className={styles.breakdownContent}>
                <span className={styles.breakdownValue}>{breakdown.wastePosts}</span>
                <span className={styles.breakdownLabel}>Waste Posts</span>
              </div>
            </div>
            <div className={styles.breakdownCard}>
              <div className={styles.breakdownIcon}>💬</div>
              <div className={styles.breakdownContent}>
                <span className={styles.breakdownValue}>{breakdown.forumPosts}</span>
                <span className={styles.breakdownLabel}>Forum Posts</span>
              </div>
            </div>
            <div className={styles.breakdownCard}>
              <div className={styles.breakdownIcon}>🎯</div>
              <div className={styles.breakdownContent}>
                <span className={styles.breakdownValue}>{breakdown.initiativePosts}</span>
                <span className={styles.breakdownLabel}>Initiative Posts</span>
              </div>
            </div>
            <div className={styles.breakdownCard}>
              <div className={styles.breakdownIcon}>✅</div>
              <div className={styles.breakdownContent}>
                <span className={styles.breakdownValue}>{breakdown.completedPickups}</span>
                <span className={styles.breakdownLabel}>Completed Pickups</span>
              </div>
            </div>
            <div className={styles.breakdownCard}>
              <div className={styles.breakdownIcon}>🤝</div>
              <div className={styles.breakdownContent}>
                <span className={styles.breakdownValue}>{breakdown.completedSupports}</span>
                <span className={styles.breakdownLabel}>Completed Supports</span>
              </div>
            </div>
            <div className={`${styles.breakdownCard} ${styles.total}`}>
              <div className={styles.breakdownIcon}>📊</div>
              <div className={styles.breakdownContent}>
                <span className={styles.breakdownValue}>{breakdown.totalActivity}</span>
                <span className={styles.breakdownLabel}>Total Activities</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.infoPanel}>
        <div className={styles.infoPanelHeader}>
          <Activity size={18} />
          <h3>How to Use</h3>
        </div>
        <ul className={styles.infoList}>
          <li>Use the buttons above to zoom to Philippines or Metro Manila</li>
          <li>Red/orange areas indicate high recycling activity</li>
          <li>Click on circles to see detailed area statistics</li>
          <li>Zoom in/out using the map controls or mouse wheel</li>
        </ul>
      </div>
    </div>
  );
};

export default GeographicHeatmap;
