import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [transportData, setTransportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;

    axios
      .get('http://localhost:5000/api/users/transport-details', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        setTransportData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching transport details:', err);
        setError('Failed to fetch transport data.');
        setLoading(false);
      });
  }, [token]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Welcome, {user?.name}!</h2>
          <p>
            Role: <strong>{user?.role}</strong> | Zone: <strong>{user?.zone || '-'}</strong> | Territory: <strong>{user?.territory || '-'}</strong>
          </p>
        </div>
        {/* <button 
          onClick={handleLogout} 
          style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button> */}
      </div>

      <hr style={{ margin: '20px 0' }} />

      
    </div>
  );
};

export default Dashboard;