import axios from 'axios';
import {store} from './redux/store'; // Path to your Redux store
import { setToken } from './redux/authSlice'; // Adjust action name based on your slice


const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://datadashboard-backend.onrender.com/api' 
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Allows cookies (like refresh tokens) to be sent automatically
});

// const api = axios.create({
//   // baseURL: 'http://localhost:5000/api',
//   baseURL:'https://datadashboard-backend.onrender.com/api',
//   withCredentials: true, // 👈 CRITICAL: Allows browser to send/receive HttpOnly cookies automatically
// });

// 1. Request Interceptor: Attach Access Token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth?.token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      // config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Catch expired tokens and refresh automatically
api.interceptors.response.use(
  (response) => response, // Pass through successful responses
  async (error) => {
    const originalRequest = error.config;

    // Check if error is due to an expired/invalid token (403 or 401) and we haven't retried yet
    if (
      (error.response?.status === 403 || error.response?.status === 401) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true; // Prevent infinite loops

      try {
        // Call the refresh endpoint (browser automatically attaches the refreshToken HttpOnly cookie)
        // const res = await axios.post('https://datadashboard-backend.onrender.com/api',
        const res = await axios.post(`${API_URL}/auth/refresh`,
          // 'http://localhost:5000/api/auth/refresh',
          
          {},
          { withCredentials: true }
        );

        if (res.data?.success && res.data?.token) {
          const newAccessToken = res.data.token;

          // Save new token to Redux store
          store.dispatch(setToken(newAccessToken));

          // Update header for the failed request and retry it
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Refresh token expired or invalid. Forcing logout.', refreshError);
        
        // Optional: Dispatch logout action or redirect to login if refresh token also expired
        // store.dispatch(logoutUser());
        // window.location.href = '/login';
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;