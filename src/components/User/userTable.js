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
  if (isNaN(date.getTime())) return val; // fallback for timestamp strings like "48:10.3"

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
};

const formatProperText = (str) => {
  if (!str || str.trim() === '') return '-';
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_]/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getRoleBadgeStyle = (role) => {
  if (!role) return {};
  const r = String(role).trim().toLowerCase();
  switch (r) {
    case 'admin':
      return { backgroundColor: '#d4edda', color: '#155724', fontWeight: 'bold', textAlign: 'center' };
    case 'employee':
      return { backgroundColor: '#fff3cd', color: '#856404', fontWeight: 'bold', textAlign: 'center' };
    case 'user':
      return { backgroundColor: '#cce5ff', color: '#004085', fontWeight: 'bold', textAlign: 'center' };
    default:
      return {};
  }
};

const UserTable = ({ data = [], columns = [] }) => {
  const [nameFilter, setNameFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');

  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) && columns.length > 0 ? columns : [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'zone', label: 'Zone' },
    { key: 'territory', label: 'Territory' },
    { key: 'refresh_token', label: 'Session Status' },
    { key: 'created_at', label: 'Created At' }
  ];

  const filteredData = safeData.filter((row) => {
    const nameVal = row.name ? String(row.name).toLowerCase() : '';
    const roleVal = row.role ? String(row.role).toLowerCase() : '';
    const zoneVal = row.zone ? String(row.zone).toLowerCase() : '';

    const matchesName = nameVal.includes(nameFilter.toLowerCase().trim());
    const matchesRole = roleVal.includes(roleFilter.toLowerCase().trim());
    const matchesZone = zoneVal.includes(zoneFilter.toLowerCase().trim());

    return matchesName && matchesRole && matchesZone;
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
              const key = col.key ? col.key.toLowerCase() : '';
              const isNameCol = key === 'name';
              const isRoleCol = key === 'role';
              const isZoneCol = key === 'zone';

              return (
                <th key={`filter-${col.key}`} style={stickyFilterStyle}>
                  {isNameCol && (
                    <input
                      type="text"
                      placeholder="Search Name..."
                      value={nameFilter}
                      onChange={(e) => setNameFilter(e.target.value)}
                      style={styles.filterInput}
                    />
                  )}
                  {isRoleCol && (
                    <input
                      type="text"
                      placeholder="Search Role..."
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      style={styles.filterInput}
                    />
                  )}
                  {isZoneCol && (
                    <input
                      type="text"
                      placeholder="Search Zone..."
                      value={zoneFilter}
                      onChange={(e) => setZoneFilter(e.target.value)}
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
                  const isRoleCol = key === 'role';
                  const isSessionCol = key === 'refresh_token';
                  const isDateCol = key.includes('date') || key === 'created_at';

                  const badgeStyle = isRoleCol ? getRoleBadgeStyle(row[col.key]) : {};

                  let cellValue;

                  if (col.render) {
                    cellValue = col.render(row);
                  } else if (col.format) {
                    cellValue = col.format(row[col.key]);
                  } else if (isRoleCol) {
                    cellValue = formatProperText(row[col.key]);
                  } else if (isSessionCol) {
                    cellValue = row[col.key] ? (
                      <span style={styles.activeBadge}>Active</span>
                    ) : (
                      <span style={styles.inactiveBadge}>Logged Out</span>
                    );
                  } else if (['name', 'zone', 'territory'].includes(key)) {
                    cellValue = formatProperText(row[col.key]);
                  } else if (isDateCol) {
                    cellValue = formatToDDMMYYYY(row[col.key]);
                  } else {
                    cellValue = row[col.key] ?? '-';
                  }

                  return (
                    <td
                      key={col.key}
                      style={{
                        whiteSpace: 'nowrap',
                        textAlign: isRoleCol || isSessionCol ? 'center' : 'left',
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
                No user records found.
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
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  },
  inactiveBadge: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '12px'
  }
};

export default UserTable;