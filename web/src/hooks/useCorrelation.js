import { useState, useEffect } from 'react';

export function useCorrelation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Tambahkan timestamp untuk bypass cache browser
    fetch(`/data/brain_data.json?t=${new Date().getTime()}`)
      .then(res => {
        if (!res.ok) throw new Error("Gagal mengambil data synapse");
        return res.json();
      })
      .then(json => {
        // Validasi struktur data minimal
        if (!json || !json.timeframes) {
            throw new Error("Struktur JSON rusak/kosong");
        }
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Critical Uplink Error:", err);
        setError(err);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}