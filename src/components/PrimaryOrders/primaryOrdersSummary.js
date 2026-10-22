import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import * as XLSX from 'xlsx';
import { FaFileDownload, FaPlus, FaEdit, FaTrash, FaFileUpload } from 'react-icons/fa';
import axios from 'axios';
import PrimaryOrdersSummaryTable from './primaryOrdersTable'; // adjust path as needed
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

// 2. Maps Excel sheet headers to lower snake_case DB fields for Primary Orders
const mapExcelRowToDbFields = (row) => {
  return {
    order_no: row['Order No'] || row['order_no'] || null,
    order_date: parseExcelDate(row['Order Date'] || row['order_date']),
    distributor_name: row['Distributor Name'] || row['distributor_name'] || null,
    distributor_code: row['Distributor Code'] || row['distributor_code'] || null,
    territory_zone: row['Territory Zone'] || row['territory_zone'] || null,
    total_qty: row['Total Qty'] || row['total_qty'] !== undefined ? Number(row['Total Qty'] ?? row['total_qty']) : 0,
    total_amount: row['Total Amount'] || row['total_amount'] !== undefined ? Number(row['Total Amount'] ?? row['total_amount']) : 0,
  };
};

const generateAllColumns = (data) => {
  if (!Array.isArray(data) || data.length === 0 || !data[0] || typeof data[0] !== 'object') {
    // Default fallback columns if data is not loaded yet
    return [
      { key: 'order_no', label: 'Order No' },
      { key: 'order_date', label: 'Order Date', isDate: true },
      { key: 'distributor_name', label: 'Distributor Name' },
      { key: 'distributor_code', label: 'Distributor Code' },
      { key: 'territory_zone', label: 'Territory Zone' },
      { key: 'total_qty', label: 'Total Qty', isNumeric: true },
      { key: 'total_amount', label: 'Total Amount', isCurrency: true },
      { key: 'created_at', label: 'Created At', isDate: true },
    ];
  }

  return Object.keys(data[0]).map((key) => ({
    key: key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    isDate: key.toLowerCase().includes('date') || key.toLowerCase().includes('created_at'),
    isNumeric: key.toLowerCase().includes('qty'),
    isCurrency: key.toLowerCase().includes('amount') || key.toLowerCase().includes('value'),
  }));
};

const PrimaryOrdersSummary = () => {
  const dispatch = useDispatch();

  // Primary orders state from Redux (falls back to local fetch if Redux slice is absent)
  const { user } = useSelector((state) => state.auth || {});
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({});

  const fetchOrdersSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      // const response = await axios.get('http://localhost:5000/api/primaryorders/primaryorders/summary', {
      const response = await api.get('/primaryorders/primaryorders/summary', {
        withCredentials: true,
      });
      setData(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Fetch Orders Error:', err);
      setError(err.response?.data?.message || 'Failed to fetch primary order summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersSummary();
  }, [user?.id]);

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Primary_Orders');
    XLSX.writeFile(workbook, `Primary_Orders_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

        // await axios.put('http://localhost:5000/api/primaryorders/bulk',
        await api.put('/primaryorders/bulk',
          formattedData,
          { withCredentials: true }
        );

        alert('Bulk Primary Orders data uploaded successfully!');
        fetchOrdersSummary();
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
        // UPDATE record (PUT) using order_no or id
        const keyId = formData.id || formData.order_no;

        const { id, created_at, updated_at, ...payload } = formData;
        if (!keyId) {
          alert('Order No or ID is required to update the record.');
          return;
        }
        const encodedId = encodeURIComponent(keyId);
        // const response = await axios.put(`http://localhost:5000/api/primaryorders/${encodedId}`,
        const response = await api.put(`/primaryorders/${encodedId}`,
          payload,
          config
        );
        alert(response.data?.message || 'Order updated successfully!');
      } else {
        // CREATE record (POST)
        // const response = await axios.post(`http://localhost:5000/api/primaryorders`,
        const response = await api.post(`/primaryorders`,  
          formData,
          config
        );
        alert(response.data?.message || 'Order created successfully!');
      }

      setIsModalOpen(false);
      setEditingRow(null);
      fetchOrdersSummary();
    } catch (err) {
      console.error('Submit Error:', err);
      alert(err.response?.data?.message || 'Operation failed.');
    }
  };

  const handleDelete = async (orderIdentifier) => {
    if (!orderIdentifier) {
      alert('Invalid order identifier for deletion.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this order summary record?')) return;
    try {
      const encodedId = encodeURIComponent(orderIdentifier);
      // await axios.delete(`http://localhost:5000/api/primaryorders/primaryorders/${encodedId}`, {
      await api.delete(`/primaryorders/primaryorders/${encodedId}`, {
        withCredentials: true,
      });
      alert('Order record deleted successfully!');
      fetchOrdersSummary();
    } catch (err) {
      console.error('Delete Error:', err.response ? err.response.data : err.message);
      alert(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  if (loading) return <p style={{ padding: '20px' }}>Loading order summary details...</p>;
  if (error) return <p style={{ color: 'red', padding: '20px' }}>{error}</p>;

  const baseColumns = generateAllColumns(data);
  const actionColumn = {
    key: 'actions',
    label: 'Actions',
    render: (row) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => handleOpenModal(row)} style={styles.editBtn} title="Edit">
          <FaEdit />
        </button>
        <button onClick={() => handleDelete(row.id || row.order_no)} style={styles.deleteBtn} title="Delete">
          <FaTrash />
        </button>
      </div>
    ),
  };
  const allColumns = [...baseColumns, actionColumn];

  return (
    <div style={styles.pageContainer}>
      <div style={styles.headerContainer}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>Primary Orders Master</h2>
          <p style={{ margin: '4px 0 0 0', color: '#555' }}>
            Showing summary records of all primary sales orders
          </p>
        </div>

        <div style={styles.topRightControls}>
          <button onClick={handleExportExcel} style={styles.exportBtn}>
            <FaFileDownload /> Download Excel
          </button>
          <button onClick={() => handleOpenModal(null)} style={styles.addBtn}>
            <FaPlus /> Add Order
          </button>
          <label style={styles.importBtn}>
            <FaFileUpload /> Upload Excel
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} hidden />
          </label>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <PrimaryOrdersSummaryTable data={data} columns={allColumns} />
        <p style={styles.totalText}>
          Total Results: {data.length}
        </p>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <h3>{editingRow ? 'Edit Order Summary' : 'Add New Order'}</h3>
            <form onSubmit={handleFormSubmit}>
              {baseColumns.map((col) => (
                <div key={col.key} style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {col.label}
                  </label>
                  <input
                    type={col.isDate ? 'date' : col.isNumeric || col.isCurrency ? 'number' : 'text'}
                    step={col.isCurrency ? '0.01' : '1'}
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
  );
};

const styles = {
  pageContainer: {
    height: '100vh',
    maxHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '12px 20px',
    boxSizing: 'border-box',
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  topRightControls: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  tableContainer: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  totalText: {
    padding: '8px 0',
    margin: 0,
    fontFamily: 'Calibri, sans-serif',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  addBtn: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  exportBtn: { backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  importBtn: { backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  editBtn: { backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '400px', maxHeight: '80vh', overflowY: 'auto' },
};

export default PrimaryOrdersSummary;