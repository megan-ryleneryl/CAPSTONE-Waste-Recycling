// client/src/pages/PickupManagement.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import pickupService from '../services/pickupService';
import PickupsList from '../components/pickup/PickupsList';
import styles from './PickupManagement.module.css';

const PickupManagement = () => {
  const { currentUser } = useAuth();
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    if (currentUser) {
      loadPickups();

      // Subscribe to real-time updates
      // Always fetch 'both' to get pickups where user is either giver or collector
      const unsubscribe = pickupService.subscribeToUserPickups(
        currentUser.userID,
        'both',
        (updatedPickups) => {
          setPickups(updatedPickups);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [currentUser]);

  const loadPickups = async () => {
    setLoading(true);
    try {
      // Always fetch 'both' to get pickups where user is either giver or collector
      const userPickups = await pickupService.getUserPickups(
        currentUser.userID,
        'both'
      );
      setPickups(userPickups);
    } catch (error) {
      console.error('Error loading pickups:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPickups = pickups.filter(pickup => {
    if (filter === 'all') return true;
    // Match the exact status value
    return pickup.status === filter;
  });

  const statusCounts = {
    all: pickups.length,
    Proposed: pickups.filter(p => p.status === 'Proposed').length,
    Confirmed: pickups.filter(p => p.status === 'Confirmed').length,
    'In-Transit': pickups.filter(p => p.status === 'In-Transit').length,
    ArrivedAtPickup: pickups.filter(p => p.status === 'ArrivedAtPickup').length,
    Completed: pickups.filter(p => p.status === 'Completed').length,
    Cancelled: pickups.filter(p => p.status === 'Cancelled').length,
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading pickups...</p>
      </div>
    );
  }

  return (
    <div className={styles.pickupManagement}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pickup Management</h1>
        <div className={styles.viewToggle}>
          <button 
            className={view === 'grid' ? styles.active : ''}
            onClick={() => setView('grid')}
          >
            Grid View
          </button>
          <button 
            className={view === 'list' ? styles.active : ''}
            onClick={() => setView('list')}
          >
            List View
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        {Object.entries(statusCounts).map(([status, count]) => {
          // Create friendly labels for each status
          const statusLabels = {
            'all': 'All',
            'Proposed': 'Proposed',
            'Confirmed': 'Confirmed',
            'In-Transit': 'In Transit',
            'ArrivedAtPickup': 'Arrived',
            'Completed': 'Completed',
            'Cancelled': 'Cancelled'
          };

          return (
            <button
              key={status}
              className={`${styles.filterBtn} ${filter === status ? styles.active : ''}`}
              onClick={() => setFilter(status)}
            >
              {statusLabels[status] || status}
              <span className={styles.count}>{count}</span>
            </button>
          );
        })}
      </div>

      <PickupsList 
        pickups={filteredPickups}
        currentUser={currentUser}
        viewType={view}
      />
    </div>
  );
};

export default PickupManagement;