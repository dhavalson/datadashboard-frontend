import React, { useState } from 'react';

// Format Date string to DD/MM/YYYY format
const formatToDDMMYYYY = (val) => {
  if (!val || val === '-' || String(val).trim() === '') return '-';
  const strVal = String(val).trim();

  if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(strVal)) {
    return strVal.replace(/-/g, '/');
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
    const [year, month, day] = strVal.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  }

  const date = new Date(val);
  if (isNaN(date.getTime())) return '-';

  // const day = String(date.getUTCDate()).padStart(2, '0');
  // const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  // const year = date.getUTCFullYear();

  // return `${day}/${month}/${year}`;

  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }); // Returns "05/10/2026"
};

// Format Currency with Indian numbering system (e.g. ₹7,692.60)
const formatCurrency = (val) => {
  if (val === null || val === undefined || val === '' || val === 'NULL') return '-';
  const num = parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num)) return '-';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Default Columns configuration for Primary Orders Summary API
const SUMMARY_COLUMNS = [
  { key: 'order_no', label: 'Order No' },
  { key: 'order_date', label: 'Order Date', isDate: true },
  { key: 'distributor_name', label: 'Distributor Name' },
  { key: 'distributor_code', label: 'Distributor Code' },
  { key: 'territory_zone', label: 'Territory Zone' },
  { key: 'total_qty', label: 'Total Qty', isNumeric: true },
  { key: 'total_amount', label: 'Total Amount', isCurrency: true },
  { key: 'created_at', label: 'Created At', isDate: true }
];

const PrimaryOrdersSummaryTable = ({ data = [], columns = SUMMARY_COLUMNS }) => {
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

  // Filter rows across all active search inputs
  const filteredData = safeData.filter((row) => {
    return safeColumns.every((col) => {
      const filterValue = (filters[col.key] || '').toLowerCase().trim();
      if (!filterValue) return true;

      const rawValue = row[col.key];
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
          {/* Main Table Headers */}
          <tr>
            {safeColumns.map((col) => (
              <th key={col.key} style={stickyHeaderStyle}>
                {col.label}
              </th>
            ))}
          </tr>

          {/* Dynamic Column Filter Input Row */}
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
              // <tr key={row.order_no || rowIndex}>
              <tr key={row.id || rowIndex}>
                {safeColumns.map((col) => {
                  const key = col.key ? col.key.toLowerCase() : '';
                  const rawCellVal = row[col.key];

                  const isDateCol = col.isDate || key.includes('date') || key.endsWith('_at');
                  const isCurrencyCol = col.isCurrency || key.includes('amount') || key.includes('total_value');
                  const isNumericCol = col.isNumeric || isCurrencyCol || key.includes('qty');

                  let cellValue;

                  if (col.render) {
                    cellValue = col.render(row);
                  } else if (col.format) {
                    cellValue = col.format(rawCellVal);
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
                        textAlign: isNumericCol ? 'right' : 'left',
                        fontSize: '14px',
                        color: '#1e293b',
                        padding: '8px 10px'
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
                No order summary records found.
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

export default PrimaryOrdersSummaryTable;