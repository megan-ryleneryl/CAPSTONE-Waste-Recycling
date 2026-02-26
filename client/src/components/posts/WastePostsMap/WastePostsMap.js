import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Package, Calendar, Coins } from 'lucide-react';
import { useCollectionRun } from '../../../context/CollectionRunContext';
import GeocodingService from '../../../services/geocodingService';
import styles from './WastePostsMap.module.css';

// ── Icons ────────────────────────────────────────────────────────────────────

// Single-post teardrop marker
const createMarkerIcon = (inRun) => {
  const color = inRun ? '#F0924C' : '#166534';
  return L.divIcon({
    className: 'waste-post-marker',
    html: `<div style="
      background-color:${color};width:30px;height:30px;
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -32],
  });
};

// Cluster marker: circle with count badge
// noneInRun → solid green   allInRun → solid orange   mixed → green + orange ring
const createClusterIcon = (count, noneInRun, allInRun) => {
  const bg     = allInRun  ? '#F0924C' : '#166534';
  const ring   = (!noneInRun && !allInRun) ? '3px solid #F0924C' : '3px solid white';
  const size   = count > 9 ? 42 : 36;
  const half   = size / 2;
  return L.divIcon({
    className: 'waste-cluster-marker',
    html: `<div style="
      background:${bg};width:${size}px;height:${size}px;
      border-radius:50%;border:${ring};
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      color:white;font-weight:800;font-size:13px;font-family:Raleway,sans-serif;
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -(half + 4)],
  });
};

// ── Map helpers ───────────────────────────────────────────────────────────────

// Fit map to all marker bounds on first render
const MapFitter = ({ positions }) => {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitted.current && positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
      fitted.current = true;
    }
  }, [positions, map]);
  return null;
};

// Round coordinates to 5 decimal places (~1 m) to group overlapping posts
const coordKey = (coords) =>
  `${parseFloat(coords.lat).toFixed(5)},${parseFloat(coords.lng).toFixed(5)}`;

// ── Component ─────────────────────────────────────────────────────────────────

const WastePostsMap = ({ locationFilter, currentUserID }) => {
  const [posts, setPosts] = useState([]);
  const [resolvedCoords, setResolvedCoords] = useState({});
  const [loading, setLoading] = useState(true);
  const { addToRun, removeFromRun, isInRun } = useCollectionRun();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationFilter?.region, locationFilter?.province, locationFilter?.city, locationFilter?.barangay]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (locationFilter?.region)   params.append('region',   locationFilter.region);
      if (locationFilter?.province) params.append('province', locationFilter.province);
      if (locationFilter?.city)     params.append('city',     locationFilter.city);
      if (locationFilter?.barangay) params.append('barangay', locationFilter.barangay);

      const url = params.toString()
        ? `http://localhost:3001/api/posts?${params.toString()}`
        : 'http://localhost:3001/api/posts';

      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const available = response.data.posts.filter(p =>
          p.postType === 'Waste' && p.status === 'Active' && p.userID !== currentUserID
        );
        setPosts(available);

        const missing = available.filter(
          p => !p.location?.coordinates?.lat || !p.location?.coordinates?.lng
        );
        resolveCoordinates(missing);
      }
    } catch (err) {
      console.error('WastePostsMap: fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const resolveCoordinates = async (postsWithoutCoords) => {
    const results = {};
    await Promise.all(
      postsWithoutCoords.map(async (post) => {
        if (!post.location) return;
        const coords = await GeocodingService.getCoordinates(post.location);
        if (coords) results[post.postID] = { lat: coords.lat, lng: coords.lng };
      })
    );
    setResolvedCoords(prev => ({ ...prev, ...results }));
  };

  const getCoords = (post) => {
    const direct = post.location?.coordinates;
    if (direct?.lat && direct?.lng) return { lat: direct.lat, lng: direct.lng };
    return resolvedCoords[post.postID] || null;
  };

  // ── Format helpers ────────────────────────────────────────────────────────

  const formatLocation = (loc) => {
    if (!loc) return 'Unknown';
    const parts = [];
    if (loc.barangay?.name) parts.push(loc.barangay.name);
    if (loc.city?.name)     parts.push(loc.city.name);
    return parts.join(', ') || 'Location unavailable';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ── Group plottable posts by coordinate ───────────────────────────────────

  const plottable = posts.filter(p => getCoords(p) !== null);

  const groups = {};
  plottable.forEach(post => {
    const coords = getCoords(post);
    const key = coordKey(coords);
    if (!groups[key]) groups[key] = { coords, posts: [] };
    groups[key].posts.push(post);
  });

  const groupEntries = Object.values(groups);
  const allPositions = groupEntries.map(g => g.coords);

  // ── Single-post popup content ─────────────────────────────────────────────

  const renderPostPopupContent = (post) => {
    const inRun = isInRun(post.postID);
    return (
      <div className={styles.popupContent}>
        <h3 className={styles.popupTitle}>{post.title}</h3>

        <div className={styles.popupRow}>
          <MapPin size={13} className={styles.popupIcon} />
          <span>{formatLocation(post.location)}</span>
        </div>

        {post.materials?.length > 0 && (
          <div className={styles.popupRow}>
            <Package size={13} className={styles.popupIcon} />
            <span>
              {post.materials.slice(0, 3).map(m => m.materialName || m.materialID).join(', ')}
              {post.materials.length > 3 ? ` +${post.materials.length - 3} more` : ''}
              {` · ${post.quantity || 0} kg`}
            </span>
          </div>
        )}

        {post.pickupDate && (
          <div className={styles.popupRow}>
            <Calendar size={13} className={styles.popupIcon} />
            <span>{formatDate(post.pickupDate)}{post.pickupTime ? ` at ${post.pickupTime}` : ''}</span>
          </div>
        )}

        <div className={styles.popupRow}>
          <Coins size={13} className={styles.popupIcon} />
          <span>₱{parseFloat(post.price || 0).toFixed(2)} estimated</span>
        </div>

        <div className={styles.popupActions}>
          <button
            className={inRun ? styles.removeBtn : styles.addBtn}
            onClick={() => inRun ? removeFromRun(post.postID) : addToRun(post)}
          >
            {inRun ? '✓ In Run' : '+ Add to Run'}
          </button>
          <button className={styles.viewBtn} onClick={() => navigate(`/posts/${post.postID}`)}>
            View Post
          </button>
        </div>
      </div>
    );
  };

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.stateBox}>
        <div className={styles.spinner} />
        <p>Loading map...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={styles.stateBox}>
        <MapPin size={40} color="#9ca3af" />
        <p>No available posts in this area</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.mapWrapper}>
      {plottable.length < posts.length && (
        <div className={styles.geocodingNote}>
          {posts.length - plottable.length} post(s) could not be placed on the map due to missing coordinates.
        </div>
      )}

      <MapContainer
        center={[14.5995, 121.0000]}
        zoom={12}
        className={styles.map}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {allPositions.length > 0 && <MapFitter positions={allPositions} />}

        {groupEntries.map(({ coords, posts: groupPosts }) => {
          const key = coordKey(coords);

          // ── Single post at this location ──
          if (groupPosts.length === 1) {
            const post = groupPosts[0];
            const inRun = isInRun(post.postID);
            return (
              <Marker
                key={key}
                position={[coords.lat, coords.lng]}
                icon={createMarkerIcon(inRun)}
              >
                <Popup maxWidth={280}>
                  {renderPostPopupContent(post)}
                </Popup>
              </Marker>
            );
          }

          // ── Multiple posts at same location → cluster marker ──
          const inRunCount  = groupPosts.filter(p => isInRun(p.postID)).length;
          const noneInRun   = inRunCount === 0;
          const allInRun    = inRunCount === groupPosts.length;

          return (
            <Marker
              key={key}
              position={[coords.lat, coords.lng]}
              icon={createClusterIcon(groupPosts.length, noneInRun, allInRun)}
            >
              <Popup maxWidth={300} maxHeight={400}>
                <div className={styles.clusterPopup}>
                  <div className={styles.clusterHeader}>
                    <MapPin size={14} className={styles.popupIcon} />
                    <span>
                      <strong>{groupPosts.length} posts</strong> at this location
                      {formatLocation(groupPosts[0].location) ? ` · ${formatLocation(groupPosts[0].location)}` : ''}
                    </span>
                  </div>

                  <div className={styles.clusterList}>
                    {groupPosts.map((post, idx) => {
                      const inRun = isInRun(post.postID);
                      return (
                        <div
                          key={post.postID}
                          className={`${styles.clusterItem} ${idx < groupPosts.length - 1 ? styles.clusterItemBorder : ''}`}
                        >
                          <div className={styles.clusterItemTitle}>
                            {post.title}
                            {inRun && <span className={styles.inRunBadge}>In Run</span>}
                          </div>

                          <div className={styles.clusterItemDetails}>
                            {post.materials?.length > 0 && (
                              <span>
                                <Package size={11} />
                                {post.materials.slice(0, 2).map(m => m.materialName || m.materialID).join(', ')}
                                {post.materials.length > 2 ? ` +${post.materials.length - 2}` : ''}
                                {` · ${post.quantity || 0} kg`}
                              </span>
                            )}
                            {post.pickupDate && (
                              <span><Calendar size={11} /> {formatDate(post.pickupDate)}</span>
                            )}
                            {post.price > 0 && (
                              <span><Coins size={11} /> ₱{parseFloat(post.price).toFixed(2)}</span>
                            )}
                          </div>

                          <div className={styles.popupActions}>
                            <button
                              className={inRun ? styles.removeBtn : styles.addBtn}
                              onClick={() => inRun ? removeFromRun(post.postID) : addToRun(post)}
                            >
                              {inRun ? '✓ In Run' : '+ Add to Run'}
                            </button>
                            <button
                              className={styles.viewBtn}
                              onClick={() => navigate(`/posts/${post.postID}`)}
                            >
                              View
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default WastePostsMap;
