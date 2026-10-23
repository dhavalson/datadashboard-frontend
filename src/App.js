import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
// import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
// import PendingOrders from './components/TransportDetails/PendingOrders';
// import TransportAllData from './components/TransportDetails/TransportDetailsAll';
// import HoldOrders from './components/TransportDetails/HoldOrders';
// import AllOrders from './components/TransportDetails/AllOrders';
// import RSSAllData from './components/RetailSalesSummary/RSSAllData';
// import AllInvoices from './components/RetailSalesSummary/AllInvoices';
// import TerritoryInvoiceReportTable from './components/utils/TerritoryReportTable';
// import SalesReturnAllData from './components/RetailSalesSummary/SalesReturn/SalesReturnAllData';
// import TerritorySummary from './reports/TerritorySummary';
import DistributorMaster from './components/distributorMaster/distribuotrMaster';
import OrderFormAll from './components/PrimaryOrders/orderFormAll';
// import PaymentMaster from './components/Payment/payment';
import ProductMaster from './components/ProductMaster/productMaster';
import PrimaryOrdersMaster from './components/PrimaryOrders/primaryOrdersMaster';
import PrimaryOrdersSummary from './components/PrimaryOrders/primaryOrdersSummary';
import OrderFormCategoryWise from './components/PrimaryOrders/orderFormCategoryWise';
import UserMaster from './components/User/userMaster';

import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setToken } from './redux/authSlice';
import api from './api';
import './app.css'; // Global styling reset

axios.defaults.withCredentials = true;

function App() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const [isInitializing, setIsInitializing] = useState(true); // 👈 1. Add initialization state

  // useEffect(() => {
  //   // If user is logged in (has session storage user) but Redux memory token was wiped by a refresh:
  //   if (user && !token) {
  //     api.post('/auth/refresh')
  //       .then((res) => {
  //         if (res.data?.token) {
  //           dispatch(setToken(res.data.token)); // Restores token to memory seamlessly
  //         }
  //       })
  //       .catch((err) => {
  //         console.log('Session expired, please log in again.');
  //       });
  //   }
  // }, [user, token, dispatch]);

useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await api.post('/auth/refresh', {}, { withCredentials: true });
        if (res.data?.success && res.data?.token) {
          dispatch(setToken(res.data.token));
        }
      } catch (error) {
        console.log('No active session found. Please log in.');
      } finally {
        setIsInitializing(false); // 👈 2. Unlock rendering once the check finishes (success or fail)
      }
    };

    restoreSession();
  }, [dispatch]);

  // 👈 3. Pause rendering child components until the token check is done
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Unified Protected & Layout-Wrapped Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            {/* Optional Dashboard */}
            {/* <Route path="/dashboard" element={<Dashboard />} /> */}

            {/* Products */}
            {/* <Route path="/products/all" element={<ProductMaster />} /> */}
            <Route
              path="/userdetails/all"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/all"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ProductMaster />
                </ProtectedRoute>
              }
            />

            {/* Primary Orders */}
            <Route path="/primaryorders/categorywise" element={<OrderFormCategoryWise />} />
            <Route path="/primaryorders/create" element={<OrderFormAll />} />
            <Route path="/primaryorders/summary" element={<PrimaryOrdersSummary />} />
            <Route path="/primaryorders/all" element={<PrimaryOrdersMaster />} />

            {/* Distributor Master */}
            <Route path="/distributormaster/all" element={<DistributorMaster />} />

            {/* Transport Details */}
            {/* <Route path="/transportdetails/allorders" element={<AllOrders />} />
            <Route path="/transportdetails/pendingorders" element={<PendingOrders />} />
            <Route path="/transportdetails/holdorders" element={<HoldOrders />} />
            <Route
              path="/transportdetails/all"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <TransportAllData />
                </ProtectedRoute>
              }
            /> */}

            {/* Retail Sales Summary & Returns */}
            {/* <Route path="/retailsalessummary/allinvoices" element={<AllInvoices />} />
            <Route path="/salesreturn/all" element={<SalesReturnAllData />} />
            <Route path="/retailsalessummary/report" element={<TerritoryInvoiceReportTable />} />
            <Route
              path="/retailsalessummary/all"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <RSSAllData />
                </ProtectedRoute>
              }
            /> */}

            {/* Payment */}
            {/* <Route path="/payment/all" element={<PaymentMaster />} /> */}

          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;