import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDistributorDetails } from '../../redux/distributorSlice';

export const FetchDistributor = () => {
  const dispatch = useDispatch();

  // 1. Read 'data' from state.distributor (matching your existing slice)
  const distributorState = useSelector((state) => state.distributor) || {};
  const { distributorData = [], distributorLoading = false, distributorError = null } = distributorState;

  useEffect(() => {
    // Dispatch thunk if data hasn't been fetched yet
    if (!distributorData || distributorData.length === 0) {
      dispatch(fetchDistributorDetails());
    }
  }, [dispatch, distributorData.length]); // Uses data.length to avoid unnecessary re-triggers

  // 2. Wrap reduction in useMemo to prevent re-render loops in OrderForm
  const DISTRI_ALLOWED_GROUP = useMemo(() => {
    return (distributorData || []).reduce((acc, dist) => {
      acc[dist.name] = dist.allowed_groups || dist.secondary_category || [];
      return acc;
    }, {});
  }, [distributorData]);

  // Return data as the first element so DISTRIBUTORS in OrderForm receives the list
  return [distributorData, DISTRI_ALLOWED_GROUP, distributorLoading, distributorError];
};