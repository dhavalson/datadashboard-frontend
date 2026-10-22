import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import api from '../api'

// Async thunk to fetch transport records from Express backend
export const fetchUserDetails = createAsyncThunk(
  'usermaster/fetchUserDetails',
  async (_, { rejectWithValue }) => {
    try {
      // 1. Get token from Redux state OR fallback directly to sessionStorage
      // const token = getState().auth.token || sessionStorage.getItem('token');

      // if (!token) {
      //   return rejectWithValue('No authentication token found');
      // }

    //   const response = await axios.get('http://localhost:5000/api/distributors/distributormaster', {
    //   const response = await axios.get('https://datadashboard-backend.onrender.com/api/users/all', {
      const response = await api.get('/users/all', {          
        withCredentials: true // Sends cookie automatically
      });
      
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch User details');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
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
      .addCase(fetchUserDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchUserDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearUserData } = userSlice.actions;
export default userSlice.reducer;