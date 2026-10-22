import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProductDetails } from '../../redux/productSlice';
import ProductTable from './productTable';
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

const getFieldValue = (row, ...keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return null;
};

const mapExcelRowToDbFields = (row) => {
  // Safe helper to extract numbers or return default numeric value (not null)
  const getNumericField = (defaultVal, ...keys) => {
    const val = getFieldValue(row, ...keys);
    if (val === null) return defaultVal;
    const parsed = Number(val);
    return isNaN(parsed) ? defaultVal : parsed;
  };

  // Safe helper for optional text/string fields (returns '' instead of null for Zod string schemas)
  const getStringField = (...keys) => {
    const val = getFieldValue(row, ...keys);
    return val !== null ? String(val).trim() : '';
  };

  // 2. Maps Excel sheet headers to lower snake_case DB fields for Product Master
  return {
    // Required String Fields
    product_division: getStringField('Product Division', 'product_division'),
    primary_category: getStringField('Primary Category', 'primary_category'),
    secondary_category: getStringField('Secondary Category', 'secondary_category'),
    display_category: getStringField('Display Category', 'display_category'),
    product_name: getStringField('Product Name', 'product_name'),
    variant: getStringField('Variant', 'variant'),
    standard_unit: getStringField('Standard Unit', 'standard_unit'),
    unit: getStringField('Unit', 'unit'),
    channel: getStringField('Channel', 'channel'),
    hsn_code: getStringField('HSN Code', 'hsn_code', 'HSN_Code'),
    product_code: getStringField('Product Code', 'product_code', 'Product_AttributeText1'),
    status: getStringField('Status', 'status') || 'Active',
    product_range: getStringField('product_range', 'Product_Range'),

    // Optional String Fields
    alternate_category: getStringField('Alternate Category', 'alternate_category'),
    description: getStringField('Description', 'description'),
    color_name: getStringField('Color Name', 'color_name'),
    rgb_values: getStringField('RGB Values', 'rgb_values'),
    image_id: getStringField('Image ID', 'image_id'),

    // Packaging & Quantities (Must be positive numbers, fallback to 1)
    super_unit: getNumericField(1, 'Super Unit', 'super_unit'),
    standard_unit_conversion_factor: getNumericField(1, 'Standard Unit Conversion Factor', 'standard_unit_conversion_factor'),
    pack_size: getNumericField(1, 'Pack Size', 'pack_size'),
    min_buying_qty: getNumericField(1, 'Min Buying Qty', 'min_buying_qty'),
    max_buying_qty: getFieldValue(row, 'Max Buying Qty', 'max_buying_qty') !== null
      ? Number(getFieldValue(row, 'Max Buying Qty', 'max_buying_qty'))
      : null,

    // Pricing Fields (Must be parsed as Numbers)
    mrp: getNumericField(0, 'MRP', 'mrp'),
    display_mrp: getNumericField(0, 'Display MRP', 'display_mrp'),
    ptr: getNumericField(0, 'PTR', 'ptr'),
    ptd: getNumericField(0, 'PTD', 'ptd'),
  };
};

const generateAllColumns = (data) => {
  // Guard against non-array, empty array, or null/undefined first item
  if (!Array.isArray(data) || data.length === 0 || !data[0] || typeof data[0] !== 'object') {
    return [];
  }

  return Object.keys(data[0]).map((key) => ({
    key: key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    isDate: key.toLowerCase().includes('date') || key.toLowerCase().includes('created_at'),
  }));
};

const ProductMaster = () => {
  const dispatch = useDispatch();

  const { data = [], loading, error } = useSelector((state) => state.product || {});
  // console.log(data);

  const { user } = useSelector((state) => state.auth || {});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    dispatch(fetchProductDetails());
  }, [dispatch, user?.id]);

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Product_Master');
    XLSX.writeFile(workbook, `Product_Master_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        // console.log(formattedData);
        

        // await axios.put('http://localhost:5000/api/products/productmaster/bulk',
        await api.put('/products/productmaster/bulk',  
          formattedData,
          { withCredentials: true }
        );

        alert('Bulk product Master data uploaded successfully!');
        dispatch(fetchProductDetails());
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
        // UPDATE record (PUT) using product_code or unique id
        const keyId = formData.id;

        // const { id, created_at, updated_at, ...payload } = formData;

        // 1. Strip all system-managed metadata keys across both cases
        const {
          id,
          created_at,
          updated_at,
          createdAt,
          updatedAt,
          ...rawPayload
        } = formData;

        // 2. Convert empty form strings ("") to null to prevent schema/type errors
        const payload = Object.fromEntries(
          Object.entries(rawPayload).map(([key, value]) => [
            key,
            value === '' ? null : value,
          ])
        );
        if (!keyId) {
          alert('Product Code or ID is required to update the record.');
          return;
        }
        const encodedId = encodeURIComponent(keyId);
        // const response = await axios.put(`http://localhost:5000/api/products/productmaster/${encodedId}`,
        const response = await api.put('/products/productmaster/${encodedId}',  
          payload,
          config
        );
        alert(response.data?.message || 'Product updated successfully!');
      } else {
        // CREATE record (POST)
        // const response = await axios.post(`http://localhost:5000/api/products/productmaster`,
        const response = await api.post('/products/productmaster',
          formData,
          config
        );
        alert(response.data?.message || 'Product created successfully!');
      }

      setIsModalOpen(false);
      setEditingRow(null);
      dispatch(fetchProductDetails());
    } catch (err) {
      // console.error('Submit Error:', err);
      // alert(err.response?.data?.message || 'Operation failed.');
      console.error('Validation Error List:', err.response?.data?.errors);

      // Show detailed error in alert for quick debugging
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors
          .map(e => `${e.field}: ${e.message}`)
          .join('\n');
        alert(`Validation Failed:\n${errorMessages}`);
      } else {
        alert(err.response?.data?.message || 'Operation failed.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!id) {
      alert('Invalid record ID for deletion.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this product record?')) return;
    try {
      // await axios.delete(`http://localhost:5000/api/products/productmaster/${id}`, {
      await api.delete('/products/productmaster/${id}', {  
        withCredentials: true,
      });
      alert('Product record deleted successfully!');
      dispatch(fetchProductDetails());
    } catch (err) {
      console.error('Delete Error:', err.response ? err.response.data : err.message);
      alert(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  if (loading) return <p style={{ padding: '20px' }}>Loading product details...</p>;
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
        <button onClick={() => handleDelete(row.id || row.product_code)} style={styles.deleteBtn} title="Delete">
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
          <h2 style={{ margin: 0, fontSize: '24px' }}>Product Master</h2>
          <p style={{ margin: '4px 0 0 0', color: '#555' }}>
            Showing records of all registered products
          </p>
        </div>

        <div style={styles.topRightControls}>
          <button onClick={handleExportExcel} style={styles.exportBtn}>
            <FaFileDownload /> Download Excel
          </button>
          <button onClick={() => handleOpenModal(null)} style={styles.addBtn}>
            <FaPlus /> Add Product
          </button>
          <label style={styles.importBtn}>
            <FaFileUpload /> Upload Excel
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} hidden  />
          </label>
        </div>
      </div>

      <div style={styles.tableContainer}>
        {/* <ProductTable data={data} columns={allColumns} /> */}
        <div style={styles.tableScrollWrapper}>
          <ProductTable data={data} columns={allColumns} />
        </div>
        <p style={styles.totalTextFooter}>
          Total Results: {data.length}
        </p>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <h3>{editingRow ? 'Edit Product' : 'Add New Product'}</h3>
            <form onSubmit={handleFormSubmit}>
              {baseColumns.filter((col) =>
                col.key !== 'created_at' &&
                col.key !== 'updated_at' &&
                col.key !== 'createdAt' &&
                col.key !== 'updatedAt' &&
                col.key !== 'id'
              ).map((col) => (
                <div key={col.key} style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {col.label}
                  </label>
                  <input
                    type={col.isDate ? 'date' : 'text'}
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

    height: '100%',
    maxHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden', // 👈 Keeps 100vh strict boundary without page-level overflow
    padding: '12px 20px',
    boxSizing: 'border-box',
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between', // 👈 Fixed typo from 'justify'
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  topRightControls: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  tableContainer: {
    flex: 1, // Takes up remaining vertical space between header and total count
    minHeight: 0, // Critical for nested flex scrolling
    marginTop: '10px',
    marginBottom: '10px',
    display: 'flex',
    flexDirection: 'column',
  },
  tableScrollWrapper: {
    flex: 1,
    overflow: 'auto', // 👈 Enables scroll inside table wrapper so totalText stays fixed at bottom
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
  },
  totalText: {
    padding: 0,
    margin: 0,
    fontFamily: 'Calibri, sans-serif',
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#fff', // Keeps text clear over table background
    flexShrink: 0, // Ensures total counter never collapses or shrinks out of view
  },
  totalTextFooter: {
    flexShrink: 0, // 👈 Prevents text from being crushed or pushed out
    height: '5px',
    lineHeight: '30px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    fontFamily: 'Calibri, sans-serif',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#374151',
    zIndex: 10,
  },
  addBtn: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  exportBtn: { backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  importBtn: { backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  editBtn: { backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '400px', maxHeight: '80vh', overflowY: 'auto' },
};

export default ProductMaster;