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
  if (val === null || val === undefined || val === '') return '-';
  const num = parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num)) return '-';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getStatusCellStyle = (value) => {
  if (!value) return {};
  const status = String(value).trim().toLowerCase();

  switch (status) {
    case 'active':
      return { backgroundColor: '#12dd12', color: '#000', fontWeight: 'bold', textAlign: 'center' };
    case 'inactive':
      return { backgroundColor: '#e64a0d', color: '#000', fontWeight: 'bold', textAlign: 'center' };
    default:
      return {};
  }
};

const DistributorTable = ({ data = [], columns = [] }) => {
  const [distributorFilter, setDistributorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) ? columns : [];

  const distributorColKey = safeColumns.find(
    (col) => col.key && col.key.toLowerCase() === 'distributor'
  )?.key;

  const statusColKey = safeColumns.find(
    (col) => col.key && col.key.toLowerCase() === 'status'
  )?.key;

  const filteredData = safeData.filter((row) => {
    const rawDistributor = distributorColKey ? row[distributorColKey] : row.distributor;
    const rawStatus = statusColKey ? row[statusColKey] : row.status;

    const distributorValue = rawDistributor ? String(rawDistributor).toLowerCase() : '';
    const statusValue = rawStatus ? String(rawStatus).toLowerCase() : '';

    const matchesDistributor = distributorValue.includes(distributorFilter.toLowerCase().trim());
    const matchesStatus = statusValue.includes(statusFilter.toLowerCase().trim());

    return matchesDistributor && matchesStatus;
  });

  const stickyHeaderStyle = {
    position: 'sticky',
    top: 0,
    backgroundColor: '#f1f5f9',
    color: '#334155',
    zIndex: 3,
    boxShadow: '0 1px 0 #cbd5e1',
    fontSize: '13px',
    fontWeight: '600'
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
    <div style={{ overflow: 'auto', flex: 1, height: '100%' }}>
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

          {/* Search Inputs Header Row */}
          <tr>
            {safeColumns.map((col) => {
              const isDistributorCol = col.key && col.key.toLowerCase() === 'distributor';
              const isStatusCol = col.key && col.key.toLowerCase() === 'status';

              return (
                <th key={`filter-${col.key}`} style={stickyFilterStyle}>
                  {isDistributorCol && (
                    <input
                      type="text"
                      placeholder="Search Distributor..."
                      value={distributorFilter}
                      onChange={(e) => setDistributorFilter(e.target.value)}
                      style={styles.filterInput}
                    />
                  )}
                  {isStatusCol && (
                    <input
                      type="text"
                      placeholder="Search Status..."
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={styles.filterInput}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {filteredData.length > 0 ? (
            filteredData.map((row, rowIndex) => (
              <tr key={row.id || rowIndex}>
                {safeColumns.map((col) => {
                  const key = col.key ? col.key.toLowerCase() : '';
                  const isStatusCol = key === 'status';
                  const isDateCol = col.isDate || key.includes('date');
                  const isNumericCol = ['no_of_boxes_order', 'no_of_sent_box', 'total_amt', 'taxable_amt'].includes(key) || typeof row[col.key] === 'number';

                  const badgeStyle = isStatusCol ? getStatusCellStyle(row[col.key]) : {};

                  let cellValue;

                  if (col.render) {
                    cellValue = col.render(row);
                  } else if (col.format) {
                    cellValue = col.format(row[col.key]);
                  } else if (col.key === 'voucher_no' && row[col.key]) {
                    const rawVal = String(row[col.key]);
                    cellValue = rawVal === '-' ? rawVal : `CK${rawVal.slice(-4)}`;
                  } else if (isDateCol) {
                    cellValue = formatToDDMMYYYY(row[col.key]);
                  } else if (isNumericCol && typeof row[col.key] === 'number') {
                    cellValue = formatCurrency(row[col.key]);
                  } else {
                    cellValue = row[col.key] ?? '-';
                  }

                  return (
                    <td
                      key={col.key}
                      style={{
                        whiteSpace: 'nowrap',
                        textAlign: isStatusCol ? 'center' : (isNumericCol ? 'right' : 'left'),
                        fontSize: '15px',
                        color: '#1e293b',
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

export default DistributorTable;