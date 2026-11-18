export const formatDateToDDMMYYYY = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

  // Helper to get default dates: 1st of current month & Today's date in DD-MM-YYYY
export const getDefaultDates = () => {
  const today = new Date();
  
  // 1st day of the current month
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const formatDate = (date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  return {
    defaultFrom: formatDate(firstDay),
    defaultTo: formatDate(today)
  };
};

  // Converts YYYY-MM-DD (HTML picker format) to DD-MM-YYYY (Your state format)
  export const formatDateToDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}-${m}-${y}`;
  };

  // Converts DD-MM-YYYY (Your state format) to YYYY-MM-DD (HTML picker format)
 export const formatDateToValue = (dateStr) => {
    if (!dateStr || !dateStr.includes('-')) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
      const [d, m, y] = parts;
      return `${y}-${m}-${d}`;
    }
    return dateStr; // fallback if already in YYYY-MM-DD
  };

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount || 0);
};