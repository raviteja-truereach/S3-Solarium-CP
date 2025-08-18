import React, { useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { populateFromCache } from '../../store/slices/quotationSlice';
import { preloadCacheData } from '../../store/transforms/sqliteTransform';

export const AppInitializer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🔄 Initializing app with cached data...');

        // Preload all cache data
        const cacheData = await preloadCacheData();

        // Transform database model to API model or skip if empty
        if (
          cacheData.quotations.items &&
          cacheData.quotations.items.length > 0
        ) {
          // Comment out until we fix the type mismatch
          console.log(
            '📊 Skipping quotation cache population due to type mismatch'
          );
        } else {
          dispatch(
            populateFromCache({
              quotations: [], // Empty array with correct type
              lastSync: cacheData.quotations.lastSync,
            })
          );
        }

        // You can also populate other slices here if needed
        // dispatch(populateLeadsFromCache(cacheData.leads));
        // dispatch(populateCustomersFromCache(cacheData.customers));

        console.log('✅ App initialization completed');
      } catch (error) {
        console.error('❌ App initialization failed:', error);
      }
    };

    initializeApp();
  }, [dispatch]);

  return <>{children}</>;
};
