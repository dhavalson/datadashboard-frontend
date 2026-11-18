import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import api from '../api'

// Async thunk to fetch transport records from Express backend
export const fetchProductDetails = createAsyncThunk(
  'productmaster/fetchProductDetails',
  async (searchParams, { rejectWithValue }) => {
    try {
      // 1. Get token from Redux state OR fallback directly to sessionStorage
      // const token = getState().auth.token || sessionStorage.getItem('token');

      // if (!token) {
      //   return rejectWithValue('No authentication token found');
      // }

      // const response = await axios.get('http://localhost:5000/api/products/productmaster', {
      // Safely build the query string if searchParams exists and has keys
      const params = searchParams ? new URLSearchParams(searchParams).toString() : '';
      const url = `/products/productmaster${params ? `?${params}` : ''}`;

      const response = await api.get(url, {
        withCredentials: true // Sends cookie automatically
      });
      // const response = await api.get(`/products/productmaster?${searchParams.toString()}`, {
      //   withCredentials: true // Sends cookie automatically
      // });
      
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch Product details');
    }
  }
);

const productSlice = createSlice({
  name: 'product',
  initialState: {
    productData: [],
    productLoading: false,
    productError: null,
  },
  reducers: {
    // 1. Action to clear data on logout or account switch
    clearProductData: (state) => {
      state.productData = [];
      state.productLoading = false;
      state.productError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductDetails.pending, (state) => {
        state.productLoading = true;
        state.productError = null;
      })
      .addCase(fetchProductDetails.fulfilled, (state, action) => {
        state.productLoading = false;
        state.productData = action.payload?.data || action.payload || [];
      })
      .addCase(fetchProductDetails.rejected, (state, action) => {
        state.productLoading = false;
        state.productError = action.payload;
      });
  },
});

export const { clearProductData } = productSlice.actions;
export default productSlice.reducer;