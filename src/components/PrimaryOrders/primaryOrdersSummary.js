import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { FaFileDownload, FaPlus, FaEdit, FaTrash, FaFileUpload, FaSearch, FaRedo } from 'react-icons/fa';
import PrimaryOrdersSummaryTable from './primaryOrdersTable'; // Adjust path as needed
import OrderForm from './orderForm'; // 👈 Import your OrderForm component
import api from '../../api';
import { getDefaultDates, formatDateToDisplay, formatDateToValue } from '../utils/helpers';
import { fetchDistributorDetails } from '../../redux/distributorSlice';
import { fetchProductDetails } from '../../redux/productSlice';

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
    total_qty: row['Total Qty'] || row['total_qty_in_box'] !== undefined ? Number(row['Total Qty'] ?? row['total_qty_in_box']) : 0,
    total_amount: row['Total Amount'] || row['total_amount'] !== undefined ? Number(row['Total Amount'] ?? row['total_amount']) : 0,
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
      { key: 'total_qty_in_box', label: 'Total Qty (Box)', isNumeric: true },
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

  const { user } = useSelector((state) => state.auth || {});
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const { defaultFrom, defaultTo } = getDefaultDates(); // get the from and to date as 1st day of month and today's date  
  // Read initial states from URL query params or defaults
  const [fromDate, setFromDate] = useState(searchParams.get('from_date') || defaultFrom);
  const [toDate, setToDate] = useState(searchParams.get('to_date') || defaultTo);
  const [territory, setTerritory] = useState(searchParams.get('territory') || '');
  const [searchCodeName, setSearchCodeName] = useState(searchParams.get('search_code_name') || '');

  // Form & Edit States
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrderData, setEditingOrderData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Master lists needed by OrderForm
  // const [products, setProducts] = useState([]);
  // const [distributors, setDistributors] = useState([]);

  // const { productData = [] } = useSelector((state) => state.product || {});
  const { distributorData = [] } = useSelector((state) => state.distributor || {});
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

  const fetchOrdersSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/primaryorders/primaryorders/summary?${searchParams.toString()}`, {
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

  // Fetch product master & distributors required by OrderForm
  // const fetchOrderFormMasters = async () => {
  //   try {
  //     const [prodRes, distRes] = await Promise.all([
  //       api.get('/products', { withCredentials: true }),
  //       api.get('/distributors/distributormaster', { withCredentials: true })
  //     ]);
  //     setProducts(prodRes.data?.data || prodRes.data || []);
  //     setDistributors(distRes.data?.data || distRes.data || []);
  //   } catch (err) {
  //     console.error('Failed to fetch OrderForm master lists:', err);
  //   }
  // };

  // Fetch master lists once on user load
  useEffect(() => {
    // fetchOrderFormMasters();
    dispatch(fetchDistributorDetails());
    // dispatch(fetchProductDetails())
  }, [user?.id]);

  // Re-fetch summary whenever user or URL searchParams change
  useEffect(() => {
    fetchOrdersSummary();
  }, [user?.id, searchParams]);

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

  // --- EXCEL IMPORT ---
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

        await api.put('/primaryorders/bulk', formattedData, { withCredentials: true });

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

  // --- OPEN ORDER FORM FOR EDITING ---
  const handleEditClick = async (row) => {
    const orderNo = row.order_no;
    if (!orderNo) {
      alert('Order Number is missing for this record.');
      return;
    }

    setLoadingDetails(true);
    try {
      const response = await api.get(`/primaryorders/primaryorders/details/${encodeURIComponent(orderNo)}`, {
        withCredentials: true,
      });

      const lineItems = response.data?.items || [];
      // console.log(lineItems[0]);
      // console.log(row);

      const matchedDistributor = distributors.find(
        (d) => d.distributor_code === row.distributor_code || d.distributor_name === row.distributor_name
      ) || {
        distributor_code: row.distributor_code,
        distributor_name: row.distributor_name,
        territory: row.territory || row.territory_zone,
        // gst_no: row.gst_no || ''
      };


      // Pass distributor details directly from the summary row
      setEditingOrderData({
        order_no: orderNo,
        order_date: row.order_date,
        distributor_code: row.distributor_code,
        distributor_name: row.distributor_name,
        territory: row.territory,
        gst_no: row.gst_no || lineItems[0]?.gst_no, // Catch GST if available
        items: lineItems,
      });
      console.log(editingOrderData);


      setIsEditing(true);
      setIsOrderFormOpen(true);
    } catch (err) {
      console.error('Fetch Order Details Error:', err);
      alert(err.response?.data?.message || 'Failed to load order matrix details for editing.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // --- OPEN ORDER FORM FOR ADDING NEW ORDER ---
  const handleAddNewClick = () => {
    setEditingOrderData(null);
    setIsEditing(false);
    setIsOrderFormOpen(true);
  };

  // --- DELETE ORDER ---
  const handleDelete = async (orderIdentifier) => {
    if (!orderIdentifier) {
      alert('Invalid order identifier for deletion.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this order summary record?')) return;
    try {
      const encodedId = encodeURIComponent(orderIdentifier);
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
        <button
          onClick={() => handleEditClick(row)}
          style={styles.editBtn}
          title="Edit Order"
          disabled={loadingDetails}
        >
          <FaEdit />
        </button>
        <button
          onClick={() => handleDelete(row.id || row.order_no)}
          style={styles.deleteBtn}
          title="Delete Order"
        >
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
          <h2 style={{ margin: 0, fontSize: '24px' }}>Primary Orders Summary</h2>
          <p style={{ margin: '4px 0 0 0', color: '#555' }}>
            Showing summary records of all primary sales orders
          </p>
        </div>

        <div style={styles.topRightControls}>
          <button onClick={handleExportExcel} style={styles.exportBtn}>
            <FaFileDownload /> Download Excel
          </button>
          {/* <button onClick={handleAddNewClick} style={styles.addBtn}>
            <FaPlus /> Add Order
          </button> */}
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
          placeholder="Search by Order No or Distributor Code or Distributor Name..."
          style={styles.filterInputWide}
        />
        <button onClick={handleSearchClick} style={styles.searchBtn}>
          <FaSearch /> Search
        </button>
        <button onClick={handleResetClick} style={styles.resetBtn} title="Reset Filters">
          <FaRedo /> Reset
        </button>
      </div>

      <div style={styles.tableContainer}>
        <PrimaryOrdersSummaryTable data={data} columns={allColumns} />
        <p style={styles.totalText}>
          Total Results: {data.length}
        </p>
      </div>

      {/* ORDER FORM MODAL (HANDLES BOTH CREATE & EDIT) */}
      {isOrderFormOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.orderFormModalContent}>
            <div style={styles.modalHeaderBar}>
              <h3>{isEditing ? `Edit Order (${editingOrderData?.order_no})` : 'Create New Primary Order'}</h3>
              <button
                onClick={() => setIsOrderFormOpen(false)}
                style={styles.closeModalBtn}
              >
                ✕
              </button>
            </div>
            <p>{editingOrderData?.items?.product_code}</p>

            <OrderForm
              INITIAL_PRODUCTS={products}
              DISTRIBUTORS={distributors}
              SIZES={['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL']}
              initialOrderData={editingOrderData}
              isEditing={isEditing}
              onSaveComplete={() => {
                setIsOrderFormOpen(false);
                fetchOrdersSummary(); // Refresh summary list after save/update
              }}
            />
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
    justify: 'space-between',
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
  addBtn: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  exportBtn: { backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  importBtn: { backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  editBtn: { backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  orderFormModalContent: { backgroundColor: '#fff', borderRadius: '8px', width: '95vw', maxWidth: '1400px', maxHeight: '92vh', overflowY: 'auto', padding: '16px', boxSizing: 'border-box' },
  modalHeaderBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' },
  closeModalBtn: { backgroundColor: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }
};

export default PrimaryOrdersSummary;