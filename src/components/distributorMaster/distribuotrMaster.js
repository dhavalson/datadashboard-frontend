import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchDistributorDetails } from '../../redux/distributorSlice';
import DistributorTable from './distributorTable';
import * as XLSX from 'xlsx';
import { FaFileDownload, FaPlus, FaEdit, FaTrash, FaFileUpload } from 'react-icons/fa';
import axios from 'axios';
import api from '../../api'

// 1. Helper to convert Excel date serials, strings (DD-MM-YYYY), or empty cells to YYYY-MM-DD / null
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

// 2. Maps Excel sheet headers to lower snake_case DB fields for Distributor Master
const mapExcelRowToDbFields = (row) => {
  return {
    // id: row['id'] || null,
    distributor_code: row['Distributor Code'] || row['distributor_code'] || null,
    distributor_name: row['Distributor Name'] || row['distributor_name'] || null,
    gst_no: row['Gst No'] || row['gst_no'] || null,
    // pan_no: row['Pan No'] || row['pan_no'] || null,
    state: row['State'] || row['state'] || null,
    pincode: row['Pincode'] || row['pincode'] || null,
    city: row['city'] || row['City'] || null,
    zone: row['Zone'] || row['zone'] || null,
    territory: row['Territory'] || row['territory'] || null,
    allowed_category: row['allowed_category'] || row['Allowed_Category'] || null,
    
    // contact_person: row['Contact Person'] || row['contact_person'] || null,
    // phone: row['Phone'] || row['phone'] ? String(row['Phone'] || row['phone']) : null,
    // email: row['Email'] || row['email'] || null,
    // address: row['Address'] || row['address'] || null,
    // credit_limit: row['Credit Limit'] || row['credit_limit'] ? parseFloat(row['Credit Limit'] || row['credit_limit']) : 0,
    status: row['Status'] || row['status'] || 'Active',
    created_at: parseExcelDate(row['Created At'] || row['created_at']),
  };
};

const generateAllColumns = (data) => {
  if (!data || data.length === 0) return [];
  return Object.keys(data[0]).map((key) => ({
    key: key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    isDate: key.toLowerCase().includes('date') || key.toLowerCase().includes('created_at'),
  }));
};

const DistributorMaster = () => {
  const dispatch = useDispatch();

  const { data = [], loading, error } = useSelector((state) => state.distributor || {});
  console.log(data);
  
  const { user } = useSelector((state) => state.auth || {});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    dispatch(fetchDistributorDetails());
  }, [dispatch, user?.id]);

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Distributor_Master');
    XLSX.writeFile(workbook, `Distributor_Master_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

        // await axios.put('http://localhost:5000/api/distributors/distributormaster/bulk',
        await api.put('/distributors/distributormaster/bulk',
          formattedData,
          { withCredentials: true }
        );

        alert('Bulk Distributor Master data uploaded successfully!');
        dispatch(fetchDistributorDetails());
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
    setFormData(row ? { ...row } : {});
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      };

      if (editingRow) {
        // UPDATE record (PUT) using distributor_code or unique id
        const keyId = formData.id || formData.distributor_code;
        if (!keyId) {
          alert('Distributor Code or ID is required to update the record.');
          return;
        }
        const encodedId = encodeURIComponent(keyId);
        // const response = await axios.put(`http://localhost:5000/api/distributors/distributormaster/${encodedId}`,
        const response = await api.put('/distributors/distributormaster/${encodedId}',
          formData,
          config
        );
        alert(response.data?.message || 'Distributor updated successfully!');
      } else {
        // const keyId = formData.distributor_code || formData.id;
        // if (!keyId) {
        //   alert('Distributor Code or ID is required to update the record.');
        //   return;
        // }
        // CREATE record (POST)
        // const response = await axios.post(`http://localhost:5000/api/distributors/distributormaster/`,
        const response = await api.post('/distributors/distributormaster/',
          formData,
          config
        );
        alert(response.data?.message || 'Distributor created successfully!');
      }

      setIsModalOpen(false);
      setEditingRow(null);
      dispatch(fetchDistributorDetails());
    } catch (err) {
      console.error('Submit Error:', err);
      alert(err.response?.data?.message || 'Operation failed.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this distributor record?')) return;
    try {
      // await axios.delete(`http://localhost:5000/api/distributors/distributormaster/${id}`, {
        await api.delete('/distributors/distributormaster/${id}', {
        withCredentials: true,
      });
      alert('Distributor record deleted successfully!');
      dispatch(fetchDistributorDetails());
    } catch (err) {
      console.error('Delete Error:', err.response ? err.response.data : err.message);
      alert(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  if (loading) return <p>Loading distributor details...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  const baseColumns = generateAllColumns(data);
  const actionColumn = {
    key: 'actions',
    label: 'Actions',
    render: (row) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => handleOpenModal(row)} style={styles.editBtn} title="Edit">
          <FaEdit />
        </button>
        <button onClick={() => handleDelete(row.id )} style={styles.deleteBtn} title="Delete">
          <FaTrash />
        </button>
      </div>
    ),
  };
  const allColumns = [...baseColumns, actionColumn];

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
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={{ margin: 0, marginRight: '500px', fontSize: '24px' }}>Distributor Master</h2>

            <button onClick={handleExportExcel} style={styles.exportBtn}>
              <FaFileDownload /> Download Excel
            </button>
            <button onClick={() => handleOpenModal(null)} style={styles.addBtn}>
              <FaPlus /> Add Distributor
            </button>

            <label style={styles.importBtn}>
              <FaFileUpload /> Upload Excel
              <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} hidden />
            </label>
          </div>

          <p style={{ margin: '0 0 10px 0', color: '#555' }}>
            Showing records of all registered distributors
          </p>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginBottom: '90px' }}>
        <DistributorTable data={data} columns={allColumns} />
        <p style={{ padding: '0', margin: '0', fontFamily: 'Calibri', fontWeight: 'bold', textAlign: 'center' }}>
          Total Results: {data.length}
        </p>

        {/* CRUD Modal */}
        {isModalOpen && (
          <div style={styles.modalBackdrop}>
            <div style={styles.modalContent}>
              <h3>{editingRow ? 'Edit Distributor' : 'Add New Distributor'}</h3>
              <form onSubmit={handleFormSubmit}>
                {baseColumns.map((col) => (
                  <div key={col.key} style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>{col.label}</label>
                    <input
                      type="text"
                      value={formData[col.key] ?? ''}
                      disabled={col.key === 'id'}
                      onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                      style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.addBtn}>
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
  topRightControls: { display: 'flex', gap: '10px', alignItems: 'center' },
  addBtn: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px' },
  exportBtn: { backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px' },
  importBtn: { backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px' },
  editBtn: { backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '400px', maxHeight: '80vh', overflowY: 'auto' },
};

export default DistributorMaster;
