import { useState, useEffect } from 'react';

export const useCorrelation = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // --- HYPERGENIUS PATH FIX ---
        // Menggunakan import.meta.env.BASE_URL agar otomatis menyesuaikan
        // path entah itu di Localhost ('/') atau GitHub Pages ('/synaps/')
        const baseUrl = import.meta.env.BASE_URL;
        // Hapus slash di ujung jika ada untuk mencegah double slash
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        
        // Fetch dengan Timestamp agar tidak kena Cache
        const response = await fetch(`${cleanBase}data/brain_data.json?t=${new Date().getTime()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Critical Uplink Error:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};