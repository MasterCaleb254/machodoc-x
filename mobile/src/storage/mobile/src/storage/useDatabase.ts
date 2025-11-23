import { useEffect, useState } from 'react';
import DatabaseManager from './DatabaseManager';
import { Database } from '@nozbe/watermelondb';

export const useDatabase = () => {
  const [database, setDatabase] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeDb = async () => {
      try {
        const dbManager = DatabaseManager.getInstance();
        const db = await dbManager.initialize();

        if (mounted) {
          setDatabase(db);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    initializeDb();

    return () => {
      mounted = false;
    };
  }, []);

  return { database, loading, error };
};
