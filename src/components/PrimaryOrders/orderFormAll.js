import React, { useEffect, useState, useMemo } from 'react';
import OrderForm from './orderForm';
import '../../app.css';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProductDetails } from '../../redux/productSlice';
import { FetchDistributor } from './FetchDistributor';
import { fetchDistributorDetails } from '../../redux/distributorSlice';

export default function OrderFormAll() {
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth || {});
  const { data = [], loading, error } = useSelector((state) => state.product || {});
  const [DISTRIBUTORS = [], DISTRI_ALLOWED_GROUP = {}, loadingD] = FetchDistributor();

  const [selectedDistributor, setSelectedDistributor] = useState(null);


  // Master custom sort SIZES order map
  const PREDEFINED_SIZE_ORDER = [
    'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', '4XL', '5XL',
    'ONE SIZE', '30inch', '32inch', '34inch', '36inch', '38inch', '40inch', '42inch'
  ];

  const sortSizes = (sizeArray) => {
    if (!Array.isArray(sizeArray)) return [];

    return [...sizeArray].sort((a, b) => {
      const cleanA = String(a || '').trim().toUpperCase();
      const cleanB = String(b || '').trim().toUpperCase();

      const indexA = PREDEFINED_SIZE_ORDER.indexOf(cleanA);
      const indexB = PREDEFINED_SIZE_ORDER.indexOf(cleanB);

      // 1. Both sizes exist in predefined standard list (e.g., S vs XL)
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // 2. Standard predefined sizes always come first
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // 3. Extract numbers for inch sizes (e.g., "30inch", "32INCH", "30")
      const numA = parseInt(cleanA.replace(/\D/g, ''), 10);
      const numB = parseInt(cleanB.replace(/\D/g, ''), 10);

      // If both are numeric/inch measurements, sort numerically ascending (30 ➔ 32 ➔ 34 ➔ 36 ➔ 38 ➔ 40 ➔ 42)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }

      // 4. Fallback alphabetical sorting for unknown text
      return cleanA.localeCompare(cleanB);
    });
  };

  // 1. Compute unique sizes dynamically using useMemo (No infinite re-render)
  const sizes = useMemo(() => {
    if (!Array.isArray(data)) return [];


    // 1. Extract unique raw variant strings
    const rawUniqueSizes = [
      ...new Set(data.map((item) => item?.variant?.toString().trim()).filter(Boolean))
    ];

    // 2. Return strictly sorted sizes
    return sortSizes(rawUniqueSizes);
  }, [data]);

  // 2. Set default selected distributor safely when loaded
  useEffect(() => {
    if (DISTRIBUTORS.length > 0 && !selectedDistributor) {
      setSelectedDistributor(DISTRIBUTORS[0]);
    }
  }, [DISTRIBUTORS, selectedDistributor]);

  // 3. Dispatch data fetching thunks
  useEffect(() => {
    dispatch(fetchProductDetails());
    dispatch(fetchDistributorDetails());
  }, [dispatch, user?.id]);

  const distributorName = selectedDistributor?.distributor_name || '';
  const allowedGroupsForCurrentDist = DISTRI_ALLOWED_GROUP[distributorName] || [];

  if (loading || loadingD) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xs font-mono text-gray-500">
        Loading Master Inventory Grid Matrix...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xs font-mono text-red-500 font-bold p-6 text-center">
        {error}
      </div>
    );
  }

  return (
    <OrderForm
      INITIAL_PRODUCTS={data}
      DISTRIBUTORS={DISTRIBUTORS}
      SIZES={sizes}
      DISTRI_ALLOWED_GROUP={allowedGroupsForCurrentDist}
      // selectedDistributor={selectedDistributor}
      // setSelectedDistributor={setSelectedDistributor}
    />
  );
}