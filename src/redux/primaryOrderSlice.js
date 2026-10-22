import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import api from '../api'

// const API_BASE_URL = 'http://localhost:5000/api/primaryorders';  //http://localhost:5000/api/primaryorders/next-sequence

// 1. Fetch Primary Orders Details
export const fetchPrimaryOrdersDetails = createAsyncThunk(
  'primaryOrders/fetchPrimaryOrdersDetails',
  async (_, { rejectWithValue }) => {
    try {
      // const token = getState()?.auth?.token || localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await api.get('/primaryordermaster', {
        withCredentials: true
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch Primary Orders details'
      );
    }
  }
);

// 2. Fetch Next Sequence Counter
export const fetchNextSequence = createAsyncThunk(
  'primaryOrders/fetchNextSequence',
  async (_, { rejectWithValue }) => {
    try {
      // const token = getState()?.auth?.token || localStorage.getItem('token') || sessionStorage.getItem('token');
      // const response = await axios.get('http://localhost:5000/api/primaryorders/next-sequence', {
      const response = await api.get('/primaryorders/next-sequence', {  
        withCredentials: true
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch next sequence counter'
      );
    }
  }
);

const primaryOrdersSlice = createSlice({
  name: 'primaryorders',
  initialState: {
    data: [],
    nextSequence: null,      // Raw numeric counter (e.g., 2)
    paddedCounter: '00001', // String formatted counter (e.g., "00002")
    loading: false,
    sequenceLoading: false,  // Dedicated loading state for sequence endpoint
    error: null,
  },
  reducers: {
    // Clear state on logout or context resets
    clearPrimaryOrdersData: (state) => {
      state.data = [];
      state.nextSequence = null;
      state.paddedCounter = '00001';
      state.loading = false;
      state.sequenceLoading = false;
      state.error = null;
    },

    // Sync sequence state immediately after successful POST save
    updateSequenceAfterSave: (state, action) => {
      // Expects payload: { counter: 5 } or numeric value directly
      const newCounter = typeof action.payload === 'object' 
        ? action.payload?.counter 
        : action.payload;

      if (newCounter) {
        state.nextSequence = Number(newCounter) + 1;
        state.paddedCounter = String(state.nextSequence).padStart(5, '0');
      }
    },

    // Helper reducer to manually increment locally if needed
    incrementSequence: (state) => {
      const current = state.nextSequence !== null ? state.nextSequence : 1;
      state.nextSequence = current + 1;
      state.paddedCounter = String(state.nextSequence).padStart(5, '0');
    }
  },
  extraReducers: (builder) => {
    builder
      // Primary Orders Details Handler
      .addCase(fetchPrimaryOrdersDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPrimaryOrdersDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchPrimaryOrdersDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Next Sequence Handler
      .addCase(fetchNextSequence.pending, (state) => {
        state.sequenceLoading = true;
        state.error = null;
      })
      .addCase(fetchNextSequence.fulfilled, (state, action) => {
        state.sequenceLoading = false;
        
        // Extract counter safely from backend payload response
        const counterVal = action.payload?.nextCounter ?? action.payload?.data?.nextCounter ?? 1;
        const paddedVal = action.payload?.paddedCounter ?? String(counterVal).padStart(5, '0');

        state.nextSequence = Number(counterVal);
        state.paddedCounter = paddedVal;
      })
      .addCase(fetchNextSequence.rejected, (state, action) => {
        state.sequenceLoading = false;
        state.error = action.payload;
      });
  },
});

export const { 
  clearPrimaryOrdersData, 
  updateSequenceAfterSave, 
  incrementSequence 
} = primaryOrdersSlice.actions;

export default primaryOrdersSlice.reducer;