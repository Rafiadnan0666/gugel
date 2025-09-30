import { useState, useEffect } from 'react';

export const useOfflineCache = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastUpdate(new Date());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveData = (key: string, data: any) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem('offline-data') || '{}');
      offlineData[key] = data;
      localStorage.setItem('offline-data', JSON.stringify(offlineData));
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  };

  const loadData = (key: string) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem('offline-data') || '{}');
      return offlineData[key];
    } catch (error) {
      console.error('Error loading offline data:', error);
      return null;
    }
  };

  return { isOnline, lastUpdate, saveData, loadData };
};
