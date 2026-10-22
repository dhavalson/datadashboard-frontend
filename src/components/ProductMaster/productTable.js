import React, { useState } from 'react';

const formatToDDMMYYYY = (val) => {
  if (!val || val === '-' || String(val).trim() === '') return '-';
  const strVal = String(val).trim();

  if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(strVal)) {
    return strVal.replace(/-/g, '/');
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
    const [year, month, day] = strVal.split('-');
    return `${day}/${month}/${year}`;
  }

  const date = new Date(val);
  if (isNaN(date.getTime())) return '-';

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
};

const formatCurrency = (val) => {
  if (val === null || val === undefined || val === '' || val === 'NULL') return '-';
  const num = parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num)) return '-';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getStatusCellStyle = (value) => {
  if (!value) return {};
  const status = String(value).trim().toLowerCase();

  switch (status) {
    case 'active':
      return { backgroundColor: '#10b981', color: '#ffffff', fontWeight: '600', textAlign: 'center' };
    case 'inactive':
      return { backgroundColor: '#ef4444', color: '#ffffff', fontWeight: '600', textAlign: 'center' };
    default:
      return {};
  }
};

const ProductTable = ({ data = [], columns = [] }) => {
  // Store filter values dynamically for each column key
  const [filters, setFilters] = useState({});

  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) ? columns : [];

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  // Filter rows across all active inputs
  const filteredData = safeData.filter((row) => {
    return safeColumns.every((col) => {
      const filterValue = (filters[col.key] || '').toLowerCase().trim();
      if (!filterValue) return true;

      // Handle product / product_name column mapping
      let rawValue = row[col.key];
      if (rawValue === undefined && (col.key === 'product_code' || col.key === 'product_name')) {
        rawValue = row.product_name || row.product;
      }

      if (rawValue === null || rawValue === undefined || rawValue === 'NULL') return false;

      return String(rawValue).toLowerCase().includes(filterValue);
    });
  });

  const stickyHeaderStyle = {
    position: 'sticky',
    top: 0,
    backgroundColor: '#f1f5f9',
    color: '#334155',
    zIndex: 3,
    boxShadow: '0 1px 0 #cbd5e1',
    fontSize: '13px',
    fontWeight: '600',
    padding: '8px 10px'
  };

  const stickyFilterStyle = {
    position: 'sticky',
    top: '35px',
    backgroundColor: '#f8fafc',
    zIndex: 2,
    boxShadow: '0 1px 0 #cbd5e1',
    padding: '4px 6px'
  };

  return (
    <div style={{ overflow: 'auto', flex: 1, height: '100%', maxHeight: '80vh' }}>
      <table
        border="1"
        cellPadding="8"
        cellSpacing="0"
        style={{
          borderCollapse: 'separate',
          borderSpacing: 0,
          width: '100%',
          textAlign: 'left',
          borderColor: '#e2e8f0'
        }}
      >
        <thead>
          {/* Main Headers */}
          <tr>
            {safeColumns.map((col) => (
              <th key={col.key} style={stickyHeaderStyle}>
                {col.label}
              </th>
            ))}
          </tr>

          {/* Dynamic Search Input Row for Every Column */}
          <tr>
            {safeColumns.map((col) => (
              <th key={`filter-${col.key}`} style={stickyFilterStyle}>
                <input
                  type="text"
                  placeholder={`Search ${col.label}...`}
                  value={filters[col.key] || ''}
                  onChange={(e) => handleFilterChange(col.key, e.target.value)}
                  style={styles.filterInput}
                />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filteredData.length > 0 ? (
            filteredData.map((row, rowIndex) => (
              <tr key={row.id || rowIndex}>
                {safeColumns.map((col) => {
                  const key = col.key ? col.key.toLowerCase() : '';
                  const rawCellVal = row[col.key] !== undefined ? row[col.key] : (row.product_name || row.product);

                  const isStatusCol = key === 'status';
                  const isDateCol = col.isDate || key.includes('date') || key.endsWith('_at');
                  
                  const currencyKeys = ['mrp', 'display_mrp', 'ptr', 'ptd', 'total_amt', 'taxable_amt'];
                  const isCurrencyCol = currencyKeys.includes(key);

                  const isNumericCol =
                    isCurrencyCol ||
                    ['no_of_boxes_order', 'no_of_sent_box', 'pack_size', 'standard_unit_conversion_factor'].includes(key) ||
                    typeof rawCellVal === 'number';

                  const badgeStyle = isStatusCol ? getStatusCellStyle(rawCellVal) : {};

                  let cellValue;

                  if (col.render) {
                    cellValue = col.render(row);
                  } else if (col.format) {
                    cellValue = col.format(rawCellVal);
                  } else if (col.key === 'voucher_no' && rawCellVal) {
                    const rawVal = String(rawCellVal);
                    cellValue = rawVal === '-' ? rawVal : `CK${rawVal.slice(-4)}`;
                  } else if (isDateCol) {
                    cellValue = formatToDDMMYYYY(rawCellVal);
                  } else if (isCurrencyCol && rawCellVal !== null && rawCellVal !== 'NULL') {
                    cellValue = formatCurrency(rawCellVal);
                  } else {
                    cellValue = (rawCellVal === null || rawCellVal === undefined || rawCellVal === 'NULL') ? '-' : String(rawCellVal);
                  }

                  return (
                    <td
                      key={col.key}
                      style={{
                        whiteSpace: 'nowrap',
                        textAlign: isStatusCol ? 'center' : (isNumericCol ? 'right' : 'left'),
                        fontSize: '14px',
                        color: '#1e293b',
                        padding: '8px 10px',
                        ...badgeStyle
                      }}
                    >
                      {cellValue}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={safeColumns.length || 1} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  filterInput: {
    width: '100%',
    padding: '4px 6px',
    fontSize: '12px',
    boxSizing: 'border-box',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    outline: 'none'
  }
};

export default ProductTable;