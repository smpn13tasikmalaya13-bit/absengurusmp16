
import { useState, useEffect, useCallback } from 'react';
import type { Coords } from '../types';
import { getDistance } from '../services/locationService';
import { CENTRAL_COORDINATES, MAX_RADIUS_METERS } from '../constants';

export const useGeolocation = () => {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const calculateDistance = useCallback((currentCoords: Coords) => {
    const dist = getDistance(currentCoords, CENTRAL_COORDINATES);
    setDistance(dist);
    setIsWithinRadius(dist <= MAX_RADIUS_METERS);
  }, []);

  const refreshLocation = useCallback(() => {
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoords(newCoords);
        calculateDistance(newCoords);
        setLoading(false);
      },
      (geoError) => {
        setError(geoError.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [calculateDistance]);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  return { coords, distance, isWithinRadius, error, loading, refreshLocation };
};
