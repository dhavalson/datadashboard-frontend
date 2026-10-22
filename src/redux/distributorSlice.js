import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import api from '../api'

// Async thunk to fetch transport records from Express backend
export const fetchDistributorDetails = createAsyncThunk(
  'distributormaster/fetchDistributorDetails',
  async (_, { rejectWithValue }) => {
    try {
      // 1. Get token from Redux state OR fallback directly to sessionStorage
      // const token = getState().auth.token || sessionStorage.getItem('token');

      // if (!token) {
      //   return rejectWithValue('No authentication token found');
      // }

      const response = await api.get('/distributors/distributormaster', {
        withCredentials: true // Sends cookie automatically
      });
      
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch Distributor details');
    }
  }
);

const distributorSlice = createSlice({
  name: 'distributor',
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {
    // 1. Action to clear data on logout or account switch
    clearRSSData: (state) => {
      state.data = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDistributorDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDistributorDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchDistributorDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearRSSData } = distributorSlice.actions;
export default distributorSlice.reducer;