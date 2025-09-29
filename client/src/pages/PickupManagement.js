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
      const unsubscribe = pickupService.subscribeToUserPickups(
        currentUser.userID,
        currentUser.userType === 'Collector' ? 'collector' : 'both',
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
      const userPickups = await pickupService.getUserPickups(
        currentUser.userID,
        currentUser.userType === 'Collector' ? 'collector' : 'both'
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
    return pickup.status.toLowerCase() === filter.toLowerCase();
  });

  const statusCounts = {
    all: pickups.length,
    proposed: pickups.filter(p => p.status === 'Proposed').length,
    confirmed: pickups.filter(p => p.status === 'Confirmed').length,
    'in-progress': pickups.filter(p => p.status === 'In-Progress').length,
    completed: pickups.filter(p => p.status === 'Completed').length,
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
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            className={`${styles.filterBtn} ${filter === status ? styles.active : ''}`}
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
            <span className={styles.count}>{count}</span>
          </button>
        ))}
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