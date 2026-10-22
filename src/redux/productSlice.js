import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import api from '../api'

// Async thunk to fetch transport records from Express backend
export const fetchProductDetails = createAsyncThunk(
  'productmaster/fetchProductDetails',
  async (_, { rejectWithValue }) => {
    try {
      // 1. Get token from Redux state OR fallback directly to sessionStorage
      // const token = getState().auth.token || sessionStorage.getItem('token');

      // if (!token) {
      //   return rejectWithValue('No authentication token found');
      // }

      // const response = await axios.get('http://localhost:5000/api/products/productmaster', {
      const response = await api.get('/products/productmaster', {
        withCredentials: true // Sends cookie automatically
      });
      
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch Product details');
    }
  }
);

const productSlice = createSlice({
  name: 'product',
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {
    // 1. Action to clear data on logout or account switch
    clearProductData: (state) => {
      state.data = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductDetails.fulfilled, (state, action) => {
        state.loading = false;
        // state.data = action.payload;
        state.data = action.payload?.data || action.payload || [];
      })
      .addCase(fetchProductDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearProductData } = productSlice.actions;
export default productSlice.reducer;