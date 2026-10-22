import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUserDetails } from '../../redux/userSlice';
import UserTable from './userTable';
import * as XLSX from 'xlsx';
import { FaFileDownload, FaPlus, FaEdit, FaTrash, FaFileUpload } from 'react-icons/fa';
import api from '../../api'

// 1. Helper to parse and format dates for Excel import/export
const parseExcelDate = (val) => {
  if (val === null || val === undefined || String(val).trim() === '') {
    return null;
  }

  const numVal = Number(val);
  if (!isNaN(numVal) && numVal > 10000) {
    const dateObj = XLSX.SSF.parse_date_code(numVal);
    if (dateObj) {
      const year = dateObj.y;
      const month = String(dateObj.m).padStart(2, '0');
      const day = String(dateObj.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  if (typeof val === 'string') {
    const cleanStr = val.trim();
    const delimiter = cleanStr.includes('-') ? '-' : cleanStr.includes('/') ? '/' : null;
    if (delimiter) {
      const parts = cleanStr.split(delimiter);
      if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  const dateObj = new Date(val);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toISOString().split('T')[0];
  }

  return null;
};

// 2. Maps Excel sheet headers to lower snake_case DB fields for User Master
const mapExcelRowToDbFields = (row) => {
  return {
    name: row['Name'] || row['name'] || null,
    email: row['Email'] || row['email'] || null,
    password: row['Password'] || row['password'] || 'DefaultPassword123!', // fallback if not supplied
    role: row['Role'] || row['role'] || 'user',
    zone: row['Zone'] || row['zone'] || null,
    territory: row['Territory'] || row['territory'] || null,
    created_at: parseExcelDate(row['Created At'] || row['created_at']),
  };
};

const UserMaster = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth || {});
  const { data = [], loading1, error1 } = useSelector((state) => state.user || {});

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({});

  // Fetch users function
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      // const response = await api.get('/users/all');
      await dispatch(fetchUserDetails());
      setUsers(data)
      // if (response.data) {
      //   setUsers(response.data.data || response.data);
      // }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load user master records. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [dispatch, user?.id]);

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(users);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'User_Master');
    XLSX.writeFile(workbook, `User_Master_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // --- EXCEL IMPORT WITH SANITIZATION ---
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', raw: true });
        const wsname = wb.SheetNames[0];
        const rawParsedData = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

        const formattedData = rawParsedData.map(mapExcelRowToDbFields);

        await api.put('/users/bulk', formattedData);

        alert('Bulk User Master data uploaded successfully!');
        fetchUsers();
      } catch (err) {
        console.error('Upload Error:', err.response ? err.response.data : err.message);
        alert(err.response?.data?.message || 'Failed to upload Excel records to server.');
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  // --- CRUD OPERATIONS ---
  const handleOpenModal = (row = null) => {
    setEditingRow(row);
    setFormData(row ? { ...row } : { role: 'user' });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();

    try {
      if (editingRow) {
        const keyId = formData.id;
        if (!keyId) {
          alert('User ID is required to update the record.');
          return;
        }
        const response = await api.put(`/users/${keyId}`, formData);
        alert(response.data?.message || 'User updated successfully!');
      } else {
        const response = await api.post('/users/register', formData);
        alert(response.data?.message || 'User created successfully!');
      }

      setIsModalOpen(false);
      setEditingRow(null);
      fetchUsers();
    } catch (err) {
      console.error('Submit Error:', err);
      alert(err.response?.data?.message || 'Operation failed.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user record?')) return;
    try {
      await api.delete(`/users/${id}`);
      alert('User record deleted successfully!');
      fetchUsers();
    } catch (err) {
      console.error('Delete Error:', err.response ? err.response.data : err.message);
      alert(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  if (loading) return <p style={{ padding: '20px' }}>Loading user details...</p>;
  if (error) return <p style={{ color: 'red', padding: '20px' }}>{error}</p>;

  // Column definitions for the table view
  const userColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'zone', label: 'Zone' },
    { key: 'territory', label: 'Territory' },
    { key: 'refresh_token', label: 'Session Status' },
    { key: 'created_at', label: 'Created At', isDate: true },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => handleOpenModal(row)} style={styles.editBtn} title="Edit">
            <FaEdit />
          </button>
          <button onClick={() => handleDelete(row.id)} style={styles.deleteBtn} title="Delete">
            <FaTrash />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '12px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div style={styles.headerContainer}>
        <div style={{ flexShrink: 0, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={{ margin: 0, fontSize: '24px' }}>User Master Directory</h2>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button onClick={handleExportExcel} style={styles.exportBtn}>
                <FaFileDownload /> Download Excel
              </button>
              <button onClick={() => handleOpenModal(null)} style={styles.addBtn}>
                <FaPlus /> Add User
              </button>
              <label style={styles.importBtn}>
                <FaFileUpload /> Upload Excel
                <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} hidden />
              </label>
            </div>
          </div>

          <p style={{ margin: '0 0 10px 0', color: '#555' }}>
            Showing records of all registered system users
          </p>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginBottom: '90px' }}>
        <UserTable data={users} columns={userColumns} />
        <p style={{ padding: '8px 0', margin: '0', fontFamily: 'Calibri', fontWeight: 'bold', textAlign: 'center' }}>
          Total Results: {users?.length}
        </p>

        {/* CRUD Modal */}
        {isModalOpen && (
          <div style={styles.modalBackdrop}>
            <div style={styles.modalContent}>
              <h3>{editingRow ? 'Edit User' : 'Register New User'}</h3>
              <form onSubmit={handleFormSubmit}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={styles.label}>Full Name</label>
                  <input
                    type="text"
                    value={formData.name ?? ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={styles.inputField}
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    value={formData.email ?? ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    style={styles.inputField}
                  />
                </div>

                {!editingRow && (
                  <div style={{ marginBottom: '10px' }}>
                    <label style={styles.label}>Password</label>
                    <input
                      type="password"
                      value={formData.password ?? ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      style={styles.inputField}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '10px' }}>
                  <label style={styles.label}>Role</label>
                  <select
                    value={formData.role ?? 'user'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={styles.inputField}
                  >
                    <option value="user">User</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={styles.label}>Zone</label>
                  <input
                    type="text"
                    value={formData.zone ?? ''}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    placeholder="e.g. North, South, All"
                    style={styles.inputField}
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={styles.label}>Territory</label>
                  <input
                    type="text"
                    value={formData.territory ?? ''}
                    onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                    placeholder="e.g. Karnataka, Gujarat"
                    style={styles.inputField}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.saveBtn}>
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  headerContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  addBtn: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px', fontWeight: '600' },
  exportBtn: { backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px', fontWeight: '600' },
  importBtn: { backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' },
  editBtn: { backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '420px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  label: { display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#334155' },
  inputField: { width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px' },
  cancelBtn: { backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer' },
  saveBtn: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' },
};

export default UserMaster;