import { useState, useEffect, useRef, useCallback } from 'react';
import { getDistance, isWithinRadius } from '../utils/geoUtils';

/**
 * Custom hook for tracking collector location during pickup
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether tracking is enabled
 * @param {Object} options.targetLocation - Target location {lat, lng}
 * @param {number} options.arrivalRadius - Radius in meters to consider "arrived" (default: 50)
 * @param {number} options.updateInterval - Update interval in milliseconds (default: 8000)
 * @param {Function} options.onArrival - Callback when arrived at destination
 * @param {Function} options.onLocationUpdate - Callback on each location update
 * @returns {Object} Tracking state and controls
 */
const useLocationTracking = ({
  enabled = false,
  targetLocation = null,
  arrivalRadius = 50,
  updateInterval = 8000,
  onArrival = null,
  onLocationUpdate = null,
}) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'granted', 'denied', 'prompt'

  const watchIdRef = useRef(null);
  const intervalIdRef = useRef(null);
  const lastPositionRef = useRef(null);
  const hasTriggeredArrivalRef = useRef(false);

  /**
   * Request location permission and get current position
   */
  const requestLocationPermission = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPermissionStatus('granted');
          resolve(position);
        },
        (error) => {
          let errorMessage = 'Unable to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              setPermissionStatus('denied');
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please check your GPS/location settings.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Trying with lower accuracy...';
              break;
            default:
              errorMessage = 'An unknown error occurred while getting location.';
          }
          setError(errorMessage);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true, // Try high accuracy first to trigger permission prompt
          timeout: 15000, // Increased timeout for Windows/desktop
          maximumAge: 10000,
        }
      );
    });
  }, []);

  /**
   * Update location and check arrival
   */
  const updateLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Warn about low accuracy but still use it for distance calculation
        if (accuracy > 500) {
          console.warn('Location accuracy very low:', accuracy, 'meters');
          setError(`Low GPS accuracy (±${Math.round(accuracy)}m). Distance may be inaccurate.`);
        } else if (accuracy > 100) {
          console.warn('Location accuracy low:', accuracy, 'meters');
        } else {
          // Good accuracy, clear any previous error
          setError(null);
        }

        const newLocation = {
          lat: latitude,
          lng: longitude,
          accuracy,
          timestamp: new Date(position.timestamp),
        };

        setCurrentLocation(newLocation);
        lastPositionRef.current = newLocation;

        // Calculate distance to target
        if (targetLocation && targetLocation.lat && targetLocation.lng) {
          const distanceToTarget = getDistance(
            { lat: latitude, lng: longitude },
            targetLocation
          );
          setDistance(distanceToTarget);

          // Check if arrived (only trigger if accuracy is good enough)
          const arrivedAtDestination = isWithinRadius(
            { lat: latitude, lng: longitude },
            targetLocation,
            arrivalRadius
          );

          // Only trigger arrival if accuracy is reasonable (< 100m)
          if (arrivedAtDestination && !hasTriggeredArrivalRef.current && accuracy < 100) {
            setHasArrived(true);
            hasTriggeredArrivalRef.current = true;
            if (onArrival) {
              onArrival({
                location: newLocation,
                distance: distanceToTarget,
              });
            }
          }

          // Callback for location update (still update even with low accuracy)
          if (onLocationUpdate && accuracy < 1000) {
            onLocationUpdate({
              location: newLocation,
              distance: distanceToTarget,
              arrived: arrivedAtDestination,
            });
          }
        }
      },
      (error) => {
        console.error('Location update error:', error);
        let errorMessage = 'Unable to update location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            setPermissionStatus('denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable. Make sure location services are enabled.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'Location error';
        }
        setError(errorMessage);
      },
      {
        enableHighAccuracy: true, // Request high accuracy for updates
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  }, [targetLocation, arrivalRadius, onArrival, onLocationUpdate]);

  /**
   * Start location tracking
   */
  const startTracking = useCallback(async () => {
    try {
      console.log('Starting location tracking...');

      // Request permission and get initial position
      try {
        await requestLocationPermission();
        console.log('Location permission granted');
      } catch (permError) {
        // If high accuracy fails, try again with lower accuracy
        console.warn('High accuracy failed, retrying with low accuracy...');
        if (!navigator.geolocation) {
          throw new Error('Geolocation is not supported');
        }

        // Try once more with lower requirements
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setPermissionStatus('granted');
              console.log('Location permission granted (low accuracy)');
              resolve(position);
            },
            (error) => {
              reject(new Error('Unable to access location. Please check browser settings.'));
            },
            {
              enableHighAccuracy: false,
              timeout: 20000,
              maximumAge: 60000,
            }
          );
        });
      }

      setIsTracking(true);
      setError(null);
      hasTriggeredArrivalRef.current = false;

      // Get initial location
      updateLocation();

      // Set up periodic location updates
      intervalIdRef.current = setInterval(() => {
        updateLocation();
      }, updateInterval);

      console.log('Location tracking started successfully');
    } catch (err) {
      console.error('Failed to start tracking:', err);
      setError(err.message || 'Failed to start location tracking');
      setIsTracking(false);
    }
  }, [requestLocationPermission, updateLocation, updateInterval]);

  /**
   * Stop location tracking
   */
  const stopTracking = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  /**
   * Reset tracking state
   */
  const resetTracking = useCallback(() => {
    stopTracking();
    setCurrentLocation(null);
    setDistance(null);
    setError(null);
    setHasArrived(false);
    hasTriggeredArrivalRef.current = false;
    lastPositionRef.current = null;
  }, [stopTracking]);

  /**
   * Effect to handle enabled state changes
   */
  useEffect(() => {
    if (enabled && !isTracking && !hasArrived) {
      startTracking();
    } else if (!enabled && isTracking) {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, isTracking, hasArrived, startTracking, stopTracking]);

  return {
    currentLocation,
    distance,
    isTracking,
    error,
    hasArrived,
    permissionStatus,
    startTracking,
    stopTracking,
    resetTracking,
  };
};

export default useLocationTracking;
