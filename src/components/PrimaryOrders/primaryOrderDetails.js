import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { FaFileDownload, FaEdit, FaTrash, FaFileUpload, FaSearch, FaRedo } from 'react-icons/fa';
import PrimaryOrdersSummaryTable from './primaryOrdersTable';
import api from '../../api';
import { fetchDistributorDetails } from '../../redux/distributorSlice'; // adjust path if needed
import { getDefaultDates, formatDateToDisplay, formatDateToValue } from '../utils/helpers';

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
  const rawQty = row['Total Qty'] ?? row['total_qty'];
  const rawAmount = row['Total Amount'] ?? row['total_amount'];

  return {
    order_no: row['Order No'] ?? row['order_no'] ?? null,
    order_date: parseExcelDate(row['Order Date'] ?? row['order_date']),
    distributor_name: row['Distributor Name'] ?? row['distributor_name'] ?? null,
    distributor_code: row['Distributor Code'] ?? row['distributor_code'] ?? null,
    territory_zone: row['Territory Zone'] ?? row['territory_zone'] ?? null,
    total_qty: rawQty !== undefined && rawQty !== null && rawQty !== '' ? Number(rawQty) : 0,
    total_amount: rawAmount !== undefined && rawAmount !== null && rawAmount !== '' ? Number(rawAmount) : 0,
  };
};

const generateAllColumns = (data) => {
  if (!Array.isArray(data) || data.length === 0 || !data[0] || typeof data[0] !== 'object') {
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

  return Object.keys(data[0]).map((key) => {
    const lower = key.toLowerCase();
    return {
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      isDate: lower.includes('date') || lower.includes('created_at'),
      isNumeric: lower.includes('qty'),
      isCurrency:
        lower.includes('amount') ||
        lower.includes('value') ||
        lower === 'ptd' ||
        lower === 'ptr' ||
        lower === 'mrp' ||
        lower === 'rate',
    };
  });
};

const initialFormState = {
  id: null,
  order_no: '',
  distributor_code: '',
  distributor_name: '',
  product_code: '',
  product_name: '',
  std_unit: '',
  qty: '',
  ptd: '',
  rate: '',
  status: 'Active',
  gst: '',
  tax_value: '',
  taxable_value: '',
};

const PrimaryOrderDetails = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  // Distributor data for unique territories
  const { distributorData = [] } = useSelector((state) => state.distributor || {});

  const { defaultFrom, defaultTo } = getDefaultDates(); // get the from and to date as 1st day of month and today's date

  // Read initial states from URL query params or defaults
  const [fromDate, setFromDate] = useState(searchParams.get('from_date') || defaultFrom);
  const [toDate, setToDate] = useState(searchParams.get('to_date') || defaultTo);
  const [territory, setTerritory] = useState(searchParams.get('territory') || '');
  const [searchCodeName, setSearchCodeName] = useState(searchParams.get('search_code_name') || '');

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Fetch distributor details on mount
  useEffect(() => {
    dispatch(fetchDistributorDetails());
  }, [dispatch]);

  // Extract and sort unique territories alphabetically
  const uniqueTerritories = useMemo(() => {
    if (!Array.isArray(distributorData)) return [];
    const territories = distributorData
      .map((item) => item.territory || item.territory_zone)
      .filter(Boolean);
    const uniqueList = [...new Set(territories)];
    return uniqueList.sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: 'accent', numeric: true })
    );
  }, [distributorData]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/primaryorders/primaryorders/details?${searchParams.toString()}`, {
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

  // Automatically fetch data whenever URL searchParams change
  useEffect(() => {
    fetchOrderDetails();
  }, [searchParams]);

  const handleSearchClick = () => {
    const newParams = {};
    if (fromDate) newParams.from_date = fromDate;
    if (toDate) newParams.to_date = toDate;
    if (territory) newParams.territory = territory;
    if (searchCodeName) newParams.search_code_name = searchCodeName.trim();

    setSearchParams(newParams);
  };

  const handleResetClick = () => {
    const { defaultFrom, defaultTo } = getDefaultDates();
    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setTerritory('');
    setSearchCodeName('');
    setSearchParams({});
    // const { defaultFrom, defaultTo } = getDefaultDates();
  };

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
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target.result;
        const wb = XLSX.read(arrayBuffer, { type: 'array', raw: true });
        const wsname = wb.SheetNames[0];
        const rawParsedData = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

        const formattedData = rawParsedData.map(mapExcelRowToDbFields);

        await api.put('/primaryorders/bulk', formattedData, {
          withCredentials: true,
        });

        alert('Bulk Primary Orders data uploaded successfully!');
        fetchOrderDetails();
      } catch (err) {
        console.error('Upload Error:', err.response ? err.response.data : err.message);
        alert(err.response?.data?.message || 'Failed to upload Excel records to server.');
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // --- CRUD OPERATIONS ---
  const handleOpenModal = (row = null) => {
    setEditingRow(row);
    if (!row) {
      setFormData(initialFormState);
    } else {
      setFormData({
        ...initialFormState,
        ...row,
        id: row.id ?? null,
        order_no: row.order_no ?? '',
        distributor_code: row.distributor_code ?? '',
        distributor_name: row.distributor_name ?? '',
        product_code: row.product_code ?? '',
        product_name: row.product_name ?? '',
        std_unit: row.std_unit ?? '',
        qty: row.qty ?? '',
        ptd: row.ptd ?? row.rate ?? '',
        rate: row.rate ?? row.ptd ?? '',
        status: row.status ?? 'Active',
        gst: row.gst ?? '',
        tax_value: row.tax_value ?? row.tax_amount ?? '',
        taxable_value: row.taxable_value ?? row.taxable_amount ?? '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRow(null);
    setFormData(initialFormState);
  };

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const config = {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      };

      const ptdVal = formData.ptd !== '' && formData.ptd !== null
        ? Number(formData.ptd)
        : formData.rate !== '' && formData.rate !== null
          ? Number(formData.rate)
          : null;

      const payload = {
        order_no: formData.order_no,
        distributor_code: formData.distributor_code,
        distributor_name: formData.distributor_name,
        product_code: formData.product_code,
        product_name: formData.product_name,
        std_unit: formData.std_unit,
        qty: formData.qty !== '' && formData.qty !== null ? Number(formData.qty) : null,
        ptd: ptdVal,
        gst: formData.gst !== '' && formData.gst !== null ? Number(formData.gst) : null,
        tax_value: formData.tax_value !== '' && formData.tax_value !== null ? Number(formData.tax_value) : null,
        taxable_value: formData.taxable_value !== '' && formData.taxable_value !== null ? Number(formData.taxable_value) : null,
      };

      if (editingRow) {
        const keyId = editingRow.id ?? formData.id;
        if (!keyId) {
          alert('Order ID is required to update the record.');
          return;
        }
        const encodedId = encodeURIComponent(keyId);
        const response = await api.put(`/primaryorders/primaryorders/${encodedId}`, payload, config);
        alert(response.data?.message || 'Order updated successfully!');
      } else {
        const response = await api.post('/primaryorders', payload, config);
        alert(response.data?.message || 'Order created successfully!');
      }

      handleCloseModal();
      fetchOrderDetails();
    } catch (err) {
      console.error('Submit Error:', err);
      alert(err.response?.data?.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (lineId, product_code, order_no) => {
    if (!lineId) {
      alert('Invalid order identifier for deletion.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this product from order record?')) return;

    try {
      const encodedId = encodeURIComponent(lineId);
      await api.delete(`/primaryorders/primaryorders/by_id/${encodedId}`, {
        withCredentials: true,
      });
      alert(`Product ${product_code || ''} deleted from Order ${order_no || ''} successfully!`);
      fetchOrderDetails();
    } catch (err) {
      console.error('Delete Error:', err.response ? err.response.data : err.message);
      alert(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  if (loading && data.length === 0) return <p style={{ padding: '20px' }}>Loading order summary details...</p>;
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
        <button onClick={() => handleDelete(row.id, row.product_code, row.order_no)} style={styles.deleteBtn} title="Delete">
          <FaTrash />
        </button>
      </div>
    ),
  };
  const allColumns = [...baseColumns, actionColumn];
  const readOnlyKeys = new Set(['id', 'created_at', 'updated_at']);

  return (
    <div style={styles.pageContainer}>
      {/* HEADER BAR */}
      <div style={styles.headerContainer}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#1e293b' }}>Primary Order Details</h2>
          <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            Showing summary records of all primary orders
          </p>
        </div>

        <div style={styles.topRightControls}>
          <button onClick={handleExportExcel} style={styles.exportBtn}>
            <FaFileDownload /> Download Excel
          </button>
          <label style={styles.importBtn}>
            <FaFileUpload /> Upload Excel
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} hidden />
          </label>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={styles.filterBar}>
        <input
          type="date"
          value={formatDateToValue(fromDate)}
          onChange={(e) => setFromDate(formatDateToDisplay(e.target.value))}
          placeholder="DD-MM-YYYY"
          style={styles.filterInput}
        />
        <input
          type="date"
          value={formatDateToValue(toDate)}
          onChange={(e) => setToDate(formatDateToDisplay(e.target.value))}
          placeholder="DD-MM-YYYY"
          style={styles.filterInput}
        />
        <select
          value={territory}
          onChange={(e) => setTerritory(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">Filter by Geo Location</option>
          {uniqueTerritories.map((terr, idx) => (
            <option key={idx} value={terr}>
              {terr}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={searchCodeName}
          onChange={(e) => setSearchCodeName(e.target.value)}
          placeholder="Search by Order No or Distributor Code or Distributor Name or Product Code..."
          style={styles.filterInputWide}
        />
        <button onClick={handleSearchClick} style={styles.searchBtn}>
          <FaSearch /> Search
        </button>
        <button onClick={handleResetClick} style={styles.resetBtn} title="Reset Filters">
          <FaRedo /> Reset
        </button>
      </div>

      {/* TABLE CONTAINER */}
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
              {baseColumns.map((col) => {
                const rawVal = formData[col.key] ?? '';
                const inputVal = col.isDate && typeof rawVal === 'string' && rawVal.includes('T')
                  ? rawVal.split('T')[0]
                  : rawVal;

                return (
                  <div key={col.key} style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {col.label}
                    </label>
                    <input
                      type={col.isDate ? 'date' : col.isNumeric || col.isCurrency ? 'number' : 'text'}
                      step={col.isCurrency ? '0.01' : '1'}
                      value={inputVal}
                      disabled={readOnlyKeys.has(col.key)}
                      onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                      style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                    />
                  </div>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                <button type="button" onClick={handleCloseModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    ...styles.addBtn,
                    opacity: isSubmitting ? 0.6 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
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
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  topRightControls: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  filterBar: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '12px',
    backgroundColor: '#ebf2fb',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    flexWrap: 'wrap',
  },
  filterInput: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '6px 10px',
    fontSize: '13px',
    color: '#334155',
    outline: 'none',
    width: '120px',
    textAlign: 'center',
  },
  filterSelect: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '6px 10px',
    fontSize: '13px',
    color: '#334155',
    outline: 'none',
  },
  filterInputWide: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '6px 10px',
    fontSize: '13px',
    color: '#334155',
    outline: 'none',
    flex: 1,
    minWidth: '220px',
  },
  searchBtn: {
    backgroundColor: '#eab308',
    color: '#ffffff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  resetBtn: {
    backgroundColor: '#64748b',
    color: '#ffffff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  tableContainer: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  totalText: {
    padding: '8px 0',
    margin: 0,
    fontFamily: 'Calibri, sans-serif',
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#f1f5f9',
    borderTop: '1px solid #e2e8f0',
    fontSize: '13px',
  },
  addBtn: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  exportBtn: { backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  importBtn: { backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  editBtn: { backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '400px', maxHeight: '80vh', overflowY: 'auto' },
};

export default PrimaryOrderDetails;