import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import '../../app.css';
import { fetchNextSequence } from '../../redux/primaryOrderSlice';
import { useSelector, useDispatch } from 'react-redux';
import api from '../../api'

// const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];

export default function OrderForm({
  INITIAL_PRODUCTS = [],
  DISTRIBUTORS = [],
  DISTRI_ALLOWED_GROUP = {},
  SIZES = []
}) {
  // Component States
  const [selectedDistributor, setSelectedDistributor] = useState(null);
  const [orderCounter, setOrderCounter] = useState(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [filters, setFilters] = useState({ primary_category: '', secondary_category: '', display_category: '' });

  const { paddedCounter, sequenceLoading, error } = useSelector(
    (state) => state.primaryOrders || {}
  );

  const dispatch = useDispatch();

  // Automatically select the first distributor ONLY once when DISTRIBUTORS loads
  useEffect(() => {
    if (DISTRIBUTORS?.length > 0 && !selectedDistributor) {
      setSelectedDistributor(DISTRIBUTORS[0]);
    }
  }, [DISTRIBUTORS?.length, selectedDistributor]);

  // Initialize Quantities ONLY when INITIAL_PRODUCTS length changes
  useEffect(() => {
    if (INITIAL_PRODUCTS.length > 0) {
      const initialQty = {};
      INITIAL_PRODUCTS.forEach((p) => {
        const variantKey = p.product_code || p.id;
        initialQty[variantKey] = '';
      });
      setQuantities(initialQty);
    }
  }, [INITIAL_PRODUCTS.length]);

  // Memoized Products Matrix mapped to productmaster schema
  // const groupedProductsMatrix = useMemo(() => {
  //   if (!selectedDistributor) return [];

  //   const distributorName = selectedDistributor?.distributor_name || '';
  //   const allowedGroupsForCurrentDist = DISTRI_ALLOWED_GROUP[distributorName] || [];

  //   const productsArray = Array.isArray(INITIAL_PRODUCTS)
  //     ? INITIAL_PRODUCTS
  //     : (INITIAL_PRODUCTS?.data || []);

  //   const rawFilteredRows = productsArray.filter((product) => {
  //     const passesDistributorGuard =
  //       allowedGroupsForCurrentDist.length === 0 ||
  //       allowedGroupsForCurrentDist.includes(product.secondary_category);

  //     const matchesPrimaryCategory = (product.primary_category || '')
  //       .toLowerCase()
  //       .includes((filters.primary_category || '').toLowerCase());

  //     const matchesSecondaryCategory = (product.secondary_category || '')
  //       .toLowerCase()
  //       .includes((filters.secondary_category || '').toLowerCase());

  //     const matchesDisplayCategory = (product.display_category || '')
  //       .toLowerCase()
  //       .includes((filters.display_category || '').toLowerCase());

  //     return (
  //       passesDistributorGuard &&
  //       matchesPrimaryCategory &&
  //       matchesSecondaryCategory &&
  //       matchesDisplayCategory
  //     );
  //   });

  //   const groupedMatrixMap = {};
  //   rawFilteredRows.forEach((row) => {
  //     const groupKey = row.display_category || row.product_name;

  //     if (!groupedMatrixMap[groupKey]) {
  //       groupedMatrixMap[groupKey] = {
  //         id: groupKey,
  //         srNo: Object.keys(groupedMatrixMap).length + 1,
  //         productDivision: row.product_division || '',
  //         primaryCategory: row.primary_category || '',
  //         secondaryCategory: row.secondary_category || '',
  //         displayCategory: row.display_category || '',
  //         productName: row.product_name || '',
  //         hsnCode: row.hsn_code || '',
  //         ptd: Number(row.ptd) || 0,
  //         mrp: Number(row.mrp) || 0,
  //         conversion_factor: row.std_unit_conversion_factor || row.conversion_factor || 5,
  //         // attribute1: row.product_attribute_text1,
  //         // attribute2: row.product_attribute_text2,
  //         colour: row.colour,
  //         alternateCategory: row.alternate_category,
  //         std_unit: row.std_unit,
  //         sizeIdMap: {},
  //         allowedSizes: [],
  //         activeSizes: []
  //       };
  //     }

  //     const sizeVariant = (row.variant || '').trim();
  //     const variantKey = row.product_code || row.id;

  //     if (sizeVariant) {
  //       groupedMatrixMap[groupKey].sizeIdMap[sizeVariant] = variantKey;

  //       if (!groupedMatrixMap[groupKey].allowedSizes.includes(sizeVariant)) {
  //         groupedMatrixMap[groupKey].allowedSizes.push(sizeVariant);
  //       }

  //       if (row.status === 'Active' && !groupedMatrixMap[groupKey].activeSizes.includes(sizeVariant)) {
  //         groupedMatrixMap[groupKey].activeSizes.push(sizeVariant);
  //       }
  //     }
  //   });

  //   return Object.values(groupedMatrixMap);
  // }, [filters, INITIAL_PRODUCTS, selectedDistributor, DISTRI_ALLOWED_GROUP]);

// Memoized Products Matrix mapped to productmaster schema
const groupedProductsMatrix = useMemo(() => {
  if (!selectedDistributor) return [];

  // 1. Extract directly from selectedDistributor object fetched from DB
  const allowedCategoriesRaw = selectedDistributor?.allowed_category || [];

  // 2. Normalize allowed categories (handles Postgres native array OR comma-separated string)
  const allowedGroupsForCurrentDist = (
    Array.isArray(allowedCategoriesRaw)
      ? allowedCategoriesRaw
      : String(allowedCategoriesRaw).split(',')
  )
    .map((cat) => String(cat).trim().toLowerCase())
    .filter(Boolean);

  // 3. Extract products safely
  const productsArray = Array.isArray(INITIAL_PRODUCTS)
    ? INITIAL_PRODUCTS
    : INITIAL_PRODUCTS?.data || [];

  // 4. Single-pass filtering
  const rawFilteredRows = productsArray.filter((product) => {
    // Read the Primary Category from the product
    const productPrimaryCat = String(product?.primary_category || '').trim().toLowerCase();

    // 🔒 DISTRIBUTOR GUARD:
    // If allowedGroupsForCurrentDist is empty (or null in DB), length === 0, allowing ALL categories.
    // Otherwise, check if current product's primary category is included.
    const passesDistributorGuard =
      allowedGroupsForCurrentDist.length === 0 ||
      allowedGroupsForCurrentDist.includes(productPrimaryCat);

    // Case-insensitive search bar filters
    const matchesPrimaryCategory = String(product?.primary_category || '')
      .toLowerCase()
      .includes(String(filters?.primary_category || '').toLowerCase());

    const matchesSecondaryCategory = String(product?.secondary_category || '')
      .toLowerCase()
      .includes(String(filters?.secondary_category || '').toLowerCase());

    const matchesDisplayCategory = String(product?.display_category || '')
      .toLowerCase()
      .includes(String(filters?.display_category || '').toLowerCase());

    return (
      passesDistributorGuard &&
      matchesPrimaryCategory &&
      matchesSecondaryCategory &&
      matchesDisplayCategory
    );
  });

  // 5. Matrix Grouping Logic
  const groupedMatrixMap = {};

  rawFilteredRows.forEach((row) => {
    const groupKey = row.display_category || row.product_name;

    if (!groupedMatrixMap[groupKey]) {
      groupedMatrixMap[groupKey] = {
        id: groupKey,
        srNo: Object.keys(groupedMatrixMap).length + 1,
        productDivision: row.product_division || '',
        primaryCategory: row.primary_category || '',
        secondaryCategory: row.secondary_category || '',
        displayCategory: row.display_category || '',
        productName: row.product_name || '',
        hsnCode: row.hsn_code || '',
        ptd: Number(row.ptd) || 0,
        mrp: Number(row.mrp) || 0,
        conversion_factor:
          row.std_unit_conversion_factor || row.conversion_factor || 5,
        colour: row.colour,
        alternateCategory: row.alternate_category,
        std_unit: row.std_unit,
        sizeIdMap: {},
        allowedSizes: [],
        activeSizes: []
      };
    }

    const sizeVariant = (row.variant || '').trim();
    const variantKey = row.product_code || row.id;

    if (sizeVariant) {
      groupedMatrixMap[groupKey].sizeIdMap[sizeVariant] = variantKey;

      if (!groupedMatrixMap[groupKey].allowedSizes.includes(sizeVariant)) {
        groupedMatrixMap[groupKey].allowedSizes.push(sizeVariant);
      }

      if (
        row.status === 'Active' &&
        !groupedMatrixMap[groupKey].activeSizes.includes(sizeVariant)
      ) {
        groupedMatrixMap[groupKey].activeSizes.push(sizeVariant);
      }
    }
  });

  return Object.values(groupedMatrixMap);
}, [filters, INITIAL_PRODUCTS, selectedDistributor]);
//   const groupedProductsMatrix = useMemo(() => {
//   if (!selectedDistributor) return [];

//   // const distributorName = selectedDistributor?.distributor_name || '';

//   // // 1. Normalize allowed categories for case-insensitive lookup
//   // const allowedGroupsForCurrentDist = (
//   //   DISTRI_ALLOWED_GROUP[distributorName] || []
//   // ).map((cat) => String(cat).trim().toLowerCase());

//   // 1. Extract directly from the selected distributor object fetched from DB
// const allowedCategoriesRaw = selectedDistributor?.allowed_categories || [];

// // 2. Normalize (handles both Postgres array or comma-separated string)
// const allowedGroupsForCurrentDist = (
//   Array.isArray(allowedCategoriesRaw)
//     ? allowedCategoriesRaw
//     : String(allowedCategoriesRaw).split(',')
// )
// .map((cat) => String(cat).trim().toLowerCase())
// .filter(Boolean);


//   // 2. Handle array vs nested object data structure
//   const productsArray = Array.isArray(INITIAL_PRODUCTS)
//     ? INITIAL_PRODUCTS
//     : INITIAL_PRODUCTS?.data || [];

//   // 3. Single-pass filtering
//   const rawFilteredRows = productsArray.filter((product) => {
//     const productSecondaryCategory = String(product?.primary_category || '')
//       .trim()
//       .toLowerCase();

//     // Case-insensitive distributor security guard
//     const passesDistributorGuard =
//       allowedGroupsForCurrentDist.length === 0 ||
//       allowedGroupsForCurrentDist.includes(productSecondaryCategory);

//     // Case-insensitive UI filters
//     const matchesPrimaryCategory = String(product?.primary_category || '')
//       .toLowerCase()
//       .includes(String(filters?.primary_category || '').toLowerCase());

//     const matchesSecondaryCategory = String(product?.secondary_category || '')
//       .toLowerCase()
//       .includes(String(filters?.secondary_category || '').toLowerCase());

//     const matchesDisplayCategory = String(product?.display_category || '')
//       .toLowerCase()
//       .includes(String(filters?.display_category || '').toLowerCase());

//     return (
//       passesDistributorGuard &&
//       matchesPrimaryCategory &&
//       matchesSecondaryCategory &&
//       matchesDisplayCategory
//     );
//   });

//   // 4. Matrix Grouping Logic
//   const groupedMatrixMap = {};

//   rawFilteredRows.forEach((row) => {
//     const groupKey = row.display_category || row.product_name;

//     if (!groupedMatrixMap[groupKey]) {
//       groupedMatrixMap[groupKey] = {
//         id: groupKey,
//         srNo: Object.keys(groupedMatrixMap).length + 1,
//         productDivision: row.product_division || '',
//         primaryCategory: row.primary_category || '',
//         secondaryCategory: row.secondary_category || '',
//         displayCategory: row.display_category || '',
//         productName: row.product_name || '',
//         hsnCode: row.hsn_code || '',
//         ptd: Number(row.ptd) || 0,
//         mrp: Number(row.mrp) || 0,
//         conversion_factor:
//           row.std_unit_conversion_factor || row.conversion_factor || 5,
//         colour: row.colour,
//         alternateCategory: row.alternate_category,
//         std_unit: row.std_unit,
//         sizeIdMap: {},
//         allowedSizes: [],
//         activeSizes: []
//       };
//     }

//     const sizeVariant = (row.variant || '').trim();
//     const variantKey = row.product_code || row.id;

//     if (sizeVariant) {
//       groupedMatrixMap[groupKey].sizeIdMap[sizeVariant] = variantKey;

//       if (!groupedMatrixMap[groupKey].allowedSizes.includes(sizeVariant)) {
//         groupedMatrixMap[groupKey].allowedSizes.push(sizeVariant);
//       }

//       if (
//         row.status === 'Active' &&
//         !groupedMatrixMap[groupKey].activeSizes.includes(sizeVariant)
//       ) {
//         groupedMatrixMap[groupKey].activeSizes.push(sizeVariant);
//       }
//     }
//   });

//   return Object.values(groupedMatrixMap);
// }, [filters, INITIAL_PRODUCTS, selectedDistributor, DISTRI_ALLOWED_GROUP]);

  // Reset search filters on distributor change
  useEffect(() => {
    setFilters({ primary_category: '', secondary_category: '', display_category: '' });
  }, [selectedDistributor]);

  const todayDate = useMemo(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }, []);

  useEffect(() => {
    dispatch(fetchNextSequence());
  }, [dispatch]);

  const orderNumber = useMemo(() => {
    return `XYPO/${paddedCounter || String(orderCounter).padStart(5, '0')}`;
  }, [orderCounter, paddedCounter]);

  const handleQtyChange = (targetVariantKey, value) => {
    setQuantities((prev) => ({
      ...prev,
      [targetVariantKey]: value === '' ? '' : Math.max(0, parseInt(value, 10) || 0)
    }));
  };

  const getRowTotalQty = (product) =>
    SIZES.reduce((sum, s) => sum + (Number(quantities[product.sizeIdMap[s]]) || 0), 0);

  const getRowAmount = (product) => product.ptd * getRowTotalQty(product);

  const grandTotalQty = useMemo(
    () => Object.values(quantities).reduce((sum, qty) => sum + (Number(qty) || 0), 0),
    [quantities]
  );

  const grandTotalAmount = useMemo(
    () => groupedProductsMatrix.reduce((sum, p) => sum + getRowAmount(p), 0),
    [quantities, groupedProductsMatrix]
  );

  const activeOrderItems = useMemo(
    () => groupedProductsMatrix.filter((p) => getRowTotalQty(p) > 0),
    [quantities, groupedProductsMatrix]
  );

  const generatePayloadDataStructure = () => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    const formattedTime = today.toTimeString().split(' ')[0];

    const items = [];

    groupedProductsMatrix.forEach((product) => {
      SIZES.forEach((size) => {
        const variantKey = product.sizeIdMap[size];
        const qtyValue = Number(quantities[variantKey]) || 0;

        if (qtyValue > 0) {
          const conversionFactor = product.conversion_factor || 5;
          const qtyPcs = qtyValue * conversionFactor;
          const ptd = Number(product.ptd) || 0;
          const mrp = Number(product.mrp) || 0;
          const ptr = Number(product.ptr) || ptd;
          const taxableValue = Number((ptd * qtyValue).toFixed(2));

          items.push({
            order_no: orderNumber,
            order_date: formattedDate,
            order_time: formattedTime,
            distributor_code: selectedDistributor?.code || selectedDistributor?.distributor_code || '',
            distributor_name: selectedDistributor?.name || selectedDistributor?.distributor_name || '',
            primary_category: product.primaryCategory,
            secondary_category: product.secondaryCategory,
            display_category: product.displayCategory,
            product_name: product.productName || product.displayCategory,
            product_code: variantKey,
            variant: size,
            product_attribute_text1: product.attribute1 || `${product.displayCategory}_${size}`,
            product_attribute_text2: product.attribute2 || null,
            colour: product.colour || null,
            alternate_category: product.alternateCategory || null,
            qty: qtyValue,
            std_unit: product.std_unit || 'Box',
            qty_pcs: qtyPcs,
            qty_boxes: qtyValue,
            std_unit_conversion_factor: conversionFactor,
            mrp: mrp,
            ptd: ptd,
            ptr: ptr,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total_value: taxableValue
          });
        }
      });
    });

    return {
      orderNo: orderNumber,
      orderDate: formattedDate,
      orderTime: formattedTime,
      distributor: selectedDistributor?.name || selectedDistributor?.distributor_name || '',
      distributorCode: selectedDistributor?.code || selectedDistributor?.distributor_code || '',
      territory: selectedDistributor?.territory || '',
      totalQty: grandTotalQty,
      totalAmount: grandTotalAmount,
      items
    };
  };

  const runExcelExportEngine = (payload) => {
    const workbook = XLSX.utils.book_new();

    const exportRows = payload.items.map((item) => ({
      'Order No': item.order_no,
      'Order Date': item.order_date,
      'Order Time': item.order_time,
      'Distributor Code': item.distributor_code,
      'Distributor Name': item.distributor_name,
      'Primary Category': item.primary_category,
      'Secondary Category': item.secondary_category,
      'Display Category': item.display_category,
      'Product Name': item.product_name,
      'Product Code': item.product_code,
      'Variant': item.variant,
      'Qty (Boxes)': item.qty_boxes,
      'Qty (Pcs)': item.qty_pcs,
      'MRP': item.mrp,
      'PTD': item.ptd,
      'Total Value': item.total_value
    }));

    const worksheetItems = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheetItems, 'Primary Orders');

    worksheetItems['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
      { wch: 25 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }
    ];

    const worksheetSummary = XLSX.utils.json_to_sheet([
      {
        'Order No': payload.orderNo,
        'Order Date': payload.orderDate,
        'Order Time': payload.orderTime,
        'Distributor Name': payload.distributor,
        'Distributor Code': payload.distributorCode,
        'Territory': payload.territory,
        'Total Qty': payload.totalQty,
        'Total Amount': payload.totalAmount
      }
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheetSummary, 'Order Summary');

    const cleanFileName = `${payload.orderNo.replace(/\//g, '-')}_${(payload.distributor || 'Order').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`;
    XLSX.writeFile(workbook, cleanFileName);
  };

  const handleSaveOrder = async () => {
    const payload = generatePayloadDataStructure();

    if (!payload.items || payload.items.length === 0) {
      alert('Cannot save an empty order!');
      return;
    }

    try {
      // const response = await axios.post('http://localhost:5000/api/primaryorders/primaryorders/bulk',
      const response = await api.post('/primaryorders/primaryorders/bulk',
        payload.items,
        { withCredentials: true }
      );

      if (response.data.success) {
        runExcelExportEngine(payload);
        alert(`Success: ${response.data.message}`);
        setOrderCounter((prev) => prev + 1);
        setIsPreviewOpen(false);
      }
    } catch (error) {
      console.error('Save order error:', error);
      alert(
        'Database error saving order: ' +
        (error.response?.data?.error || error.response?.data?.message || error.message)
      );
    }
  };

  return (
    <div style={styles.outerWrapper}>
      <div style={styles.cardContainer}>
        {/* DISTRIBUTOR METADATA HEADER GRID */}
        <div style={styles.headerGrid}>
          <div style={styles.headerColLeft}>
            <label style={{ fontWeight: 900, fontSize: '14px', color: '#1f2937' }}>
              Distributor Name:
            </label>
            <select
              style={styles.distributorSelect}
              value={selectedDistributor?.distributor_name || ''}
              onChange={(e) =>
                setSelectedDistributor(
                  DISTRIBUTORS.find((d) => d.distributor_name === e.target.value)
                )
              }
            >
              {DISTRIBUTORS.map((d) => (
                <option key={d.id || d.distributor_code} value={d.distributor_name}>
                  {d.distributor_name}
                </option>
              ))}
            </select>
            <div style={styles.metaInnerGrid}>
              <div style={{ ...styles.metaCellBorder, gridColumn: 'span 2', fontWeight: 'bold', color: '#1f2937' }}>
                GST Number:
              </div>
              <div style={{ ...styles.metaCellBorder, gridColumn: 'span 4', letterSpacing: '0.05em' }}>
                {selectedDistributor?.gst_no || '-'}
              </div>
              <div style={{ ...styles.metaCellBorder, gridColumn: 'span 2', fontWeight: 'bold', color: '#1f2937' }}>
                Territory:
              </div>
              <div style={{ ...styles.metaCellBorder, gridColumn: 'span 4', letterSpacing: '0.05em' }}>
                {selectedDistributor?.territory || '-'}
              </div>
            </div>
          </div>
          <div style={styles.headerColRight}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', textAlign: 'center', fontWeight: 500, fontSize: '18px' }}>
              <div style={{ borderRight: '1px solid #9ca3af', borderBottom: '1px solid #9ca3af', padding: '6px 0', backgroundColor: '#F9E2CE' }}>
                Order Date:
              </div>
              <div style={{ borderBottom: '1px solid #9ca3af', padding: '6px 0', backgroundColor: '#F9E2CE', fontWeight: 'bold' }}>
                {todayDate}
              </div>
              <div style={{ borderRight: '1px solid #9ca3af', borderBottom: '1px solid #9ca3af', padding: '6px 0', backgroundColor: '#F9E2CE' }}>
                Order Number:
              </div>
              <div style={{ borderBottom: '1px solid #9ca3af', padding: '6px 0', backgroundColor: '#F9E2CE', fontWeight: 'bold', letterSpacing: '0.025em' }}>
                {sequenceLoading ? 'Loading sequence...' : orderNumber}
              </div>
            </div>
          </div>
        </div>

        {/* METRICS SUMMARY DISPLAY STRIP */}
        <div style={styles.summaryStrip}>
          <div style={styles.badgeBlack}>
            <span>Order Qty:</span>
            <span style={{ color: '#facc15', fontWeight: 900 }}>{grandTotalQty}</span>
          </div>
          <div style={styles.badgeSlate}>
            <span>Order Amount:</span>
            <span style={{ color: '#34d399', fontWeight: 900 }}>
              ₹ {grandTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
            </span>
          </div>
        </div>

        {/* PRIMARY INVENTORY ENTRY GRID */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thStickyRow1}>
                <td colSpan={5} style={{ padding: '8px 12px', borderRight: '1px solid #d1d5db', textAlign: 'left' }}>
                  InnerWear Inventory Distribution Matrix
                </td>
                <td colSpan={SIZES.length} style={{ borderRight: '1px solid #d1d5db' }}>
                  SIZE VARIANT
                </td>
                <td colSpan={2} style={{ backgroundColor: '#78BFA2' }}>
                  Calculated Fields
                </td>
              </tr>
              <tr style={styles.thStickyRow2}>
                <th style={{ padding: '4px', width: '48px', borderRight: '1px solid #d1d5db' }}>Sr. No</th>
                <th style={{ padding: '4px 12px', width: '128px', textAlign: 'left', borderRight: '1px solid #d1d5db' }}>Primary Category</th>
                <th style={{ padding: '4px 12px', width: '160px', textAlign: 'left', borderRight: '1px solid #d1d5db' }}>Secondary Category</th>
                <th style={{ padding: '4px 12px', width: '224px', textAlign: 'left', borderRight: '1px solid #d1d5db' }}>Display Category</th>
                <th style={{ padding: '4px', width: '64px', borderRight: '1px solid #d1d5db' }}>PTD (₹)</th>
                {SIZES.map((s) => (
                  <th key={s} style={{ padding: '4px', width: '48px', backgroundColor: '#DDF3E4', borderRight: '1px solid #d1d5db' }}>
                    {s}
                  </th>
                ))}
                <th style={{ padding: '4px', width: '64px', backgroundColor: '#A2DEC3', color: '#111827', fontSize: '14px', borderRight: '1px solid #d1d5db' }}>Total</th>
                <th style={{ padding: '4px', width: '96px', backgroundColor: '#89CFA0', color: '#111827', fontSize: '14px' }}>Amount</th>
              </tr>

              {/* Dynamic Search Filters */}
              <tr style={styles.thStickyRow3}>
                <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                <td style={{ padding: '4px', borderRight: '1px solid #e5e7eb' }}>
                  <input
                    type="text"
                    placeholder="Filter Primary..."
                    style={styles.filterInput}
                    value={filters.primary_category || ''}
                    onChange={(e) => setFilters((p) => ({ ...p, primary_category: e.target.value }))}
                  />
                </td>
                <td style={{ padding: '4px', borderRight: '1px solid #e5e7eb' }}>
                  <input
                    type="text"
                    placeholder="Filter Secondary..."
                    style={styles.filterInput}
                    value={filters.secondary_category || ''}
                    onChange={(e) => setFilters((p) => ({ ...p, secondary_category: e.target.value }))}
                  />
                </td>
                <td style={{ padding: '4px', borderRight: '1px solid #e5e7eb' }}>
                  <input
                    type="text"
                    placeholder="Filter Display Category..."
                    style={styles.filterInput}
                    value={filters.display_category || ''}
                    onChange={(e) => setFilters((p) => ({ ...p, display_category: e.target.value }))}
                  />
                </td>
                <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                <td colSpan={SIZES.length + 2} style={{ backgroundColor: '#f3f4f6' }}></td>
              </tr>
            </thead>
            <tbody>
              {groupedProductsMatrix.length === 0 ? (
                <tr>
                  <td colSpan={SIZES.length + 7} style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontStyle: 'italic' }}>
                    No items matched the current distributor access context or search filter rules.
                  </td>
                </tr>
              ) : (
                groupedProductsMatrix.map((product) => {
                  const rQty = getRowTotalQty(product);
                  const rAmt = getRowAmount(product);
                  return (
                    <tr key={product.id} style={{ borderBottom: '1px solid #d1d5db', fontWeight: 500, color: '#1f2937' }}>
                      <td style={{ ...styles.tdCell, textAlign: 'center', padding: '10px 0' }}>{product.srNo}</td>
                      <td style={{ ...styles.tdCell, fontWeight: 'bold' }}>{product.primaryCategory}</td>
                      <td style={{ ...styles.tdCell, color: '#4b5563' }}>{product.secondaryCategory}</td>
                      <td style={{ ...styles.tdCell, backgroundColor: 'rgba(239, 246, 255, 0.4)', color: '#1e3a8a', fontWeight: 600 }}>
                        {product.displayCategory}
                      </td>
                      <td style={{ ...styles.tdCell, textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', color: '#4b5563', backgroundColor: 'rgba(249, 250, 251, 0.5)' }}>
                        {product.ptd?.toFixed(2)}
                      </td>
                      {SIZES.map((s) => {
                        const isAllowed = product.allowedSizes?.includes(s);
                        const isActive = product.activeSizes?.includes(s);
                        const targetVariantKey = product.sizeIdMap?.[s];

                        if (!isAllowed || !isActive) {
                          return (
                            <td key={s} style={{ ...styles.tdCell, backgroundColor: 'rgba(243, 244, 246, 0.8)', textAlign: 'center', color: '#9ca3af', userSelect: 'none' }}>
                              {isAllowed && !isActive ? 'NA' : '—'}
                            </td>
                          );
                        }

                        return (
                          <td key={s} style={{ ...styles.tdCell, padding: '2px', backgroundColor: '#ffffff' }}>
                            <input
                              type="text"
                              inputMode="numeric"
                              style={styles.qtyInput}
                              value={quantities[targetVariantKey] ?? ''}
                              onChange={(e) => handleQtyChange(targetVariantKey, e.target.value)}
                            />
                          </td>
                        );
                      })}
                      <td style={{ ...styles.tdCell, textAlign: 'center', fontWeight: 900, fontSize: '14px', backgroundColor: rQty > 0 ? '#d1fae5' : '#f3f4f6', color: rQty > 0 ? '#065f46' : '#9ca3af' }}>
                        {rQty}
                      </td>
                      <td style={{ ...styles.tdCell, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '14px', backgroundColor: rAmt > 0 ? '#ecfdf5' : 'rgba(249, 250, 251, 0.4)', color: rAmt > 0 ? '#064e3b' : '#9ca3af' }}>
                        {rAmt > 0 ? `₹${rAmt.toFixed(1)}` : '0.0'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FIXED ACTION PANEL */}
        <div style={styles.actionPanel}>
          <button onClick={() => setIsPreviewOpen(true)} style={styles.btnPreview}>
            Preview Order
          </button>
          <button onClick={handleSaveOrder} style={styles.btnSave}>
            Save Order
          </button>
        </div>
      </div>

      {/* REVIEW MODAL */}
      {isPreviewOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            {/* Modal Header */}
            <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '16px',  justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{display: 'flex', justifyContent:'space-between'}}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Order Review Blueprint</h3>
                <button onClick={() => setIsPreviewOpen(false)} style={styles.closeBtn}>✕</button>
              </div>
              <div>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  margin: 0,
                  width: '100%',
                  marginLeft: 'auto',       // Pushes heading block to the far right inside parent flex container
                  display: 'flex',
                  justifyContent: 'flex-end', // Aligns child flex elements flush right
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'right'        // Aligns raw text content right
                }}>
                  <span style={{ backgroundColor: '#1e293b', padding: '4px 10px', borderRadius: '4px', color: '#e2e8f0' }}>
                    Order Qty: <strong style={{ color: '#ffffff' }}>{grandTotalQty}</strong>
                  </span>
                  <span style={{ backgroundColor: '#1e293b', padding: '4px 10px', borderRadius: '4px', color: '#e2e8f0' }}>
                    Order Amount: <strong style={{ color: '#10b981' }}>₹{Number(grandTotalAmount || 0).toFixed(2)}</strong>
                  </span>
                </h3>
                {/* <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Order Amount: ₹ {grandTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</h3> */}

                {/* <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Active item values flagged for database transaction insertion</p> */}
              </div>

            </div>

            {/* Modal Body with Horizontal and Vertical Scroll */}
            <div style={{ padding: '16px', maxHeight: '60vh', overflowY: 'auto', overflowX: 'auto' }}>
              {activeOrderItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>Empty shopping matrix cart basket.</div>
              ) : (
                <table style={{ width: '100%', minWidth: '850px', textAlign: 'left', borderCollapse: 'collapse', border: '1px solid #d1d5db', fontSize: '13px' }}>
                  <thead style={{ fontSize: '16px' }}>
                    <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', textAlign: 'center' }}>
                      <th style={{ padding: '10px 8px', borderBottom: '1px solid #d1d5db', whiteSpace: 'nowrap' }}>Sr.</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #d1d5db', minWidth: '160px', whiteSpace: 'nowrap' }}>Display Category</th>
                      <th style={{ padding: '10px 8px', borderBottom: '1px solid #d1d5db', whiteSpace: 'nowrap' }}>PTD (₹)</th>
                      {SIZES.map((s) => (
                        <th key={s} style={{ padding: '10px 8px', borderBottom: '1px solid #d1d5db', whiteSpace: 'nowrap' }}>{s}</th>
                      ))}
                      <th style={{ padding: '10px 8px', borderBottom: '1px solid #d1d5db', whiteSpace: 'nowrap' }}>Total</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid #d1d5db', whiteSpace: 'nowrap' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '16px' }}>
                    {activeOrderItems.map((product, idx) => (
                      <tr key={product.id} style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                        <td style={{ padding: '10px 8px' }}>{idx + 1}</td>
                        <td style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>{product.displayCategory}</td>
                        <td style={{ padding: '10px 8px' }}>{product.ptd?.toFixed(2)}</td>
                        {SIZES.map((s) => (
                          <td key={s} style={{ padding: '10px 8px' }}>{quantities[product.sizeIdMap?.[s]] || 0}</td>
                        ))}
                        <td style={{ fontWeight: 900, padding: '10px 8px' }}>{getRowTotalQty(product)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>₹{getRowAmount(product).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ backgroundColor: '#f9fafb', padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setIsPreviewOpen(false)} style={{ backgroundColor: '#4b5563', color: '#ffffff', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>Back</button>
              <button onClick={handleSaveOrder} style={{ backgroundColor: '#059669', color: '#ffffff', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>Confirm & Save Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  outerWrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: '#f9fafb',
    padding: '16px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    position: 'relative'
  },
  cardContainer: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    width: '100%',
    minHeight: 0,
    maxHeight: '100%',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  headerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    borderBottom: '1px solid #d1d5db',
    flexShrink: 0
  },
  headerColLeft: {
    gridColumn: 'span 8',
    backgroundColor: '#DCA7A7',
    padding: '12px',
    borderRight: '1px solid #d1d5db'
  },
  headerColRight: {
    gridColumn: 'span 4',
    backgroundColor: '#F2D1B3'
  },
  distributorSelect: {
    marginLeft: '24px',
    border: '2px solid #374151',
    borderRadius: '4px',
    padding: '4px 8px',
    fontWeight: 'bold',
    fontSize: '14px',
    backgroundColor: '#FAF6F0',
    outline: 'none'
  },
  metaInnerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    rowGap: '8px',
    fontWeight: '600',
    fontSize: '18px',
    marginTop: '8px'
  },
  metaCellBorder: {
    borderTop: '1px solid #9ca3af',
    borderBottom: '1px solid #9ca3af'
  },
  summaryStrip: {
    flexShrink: 0,
    backgroundColor: '#FFF000',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    justify: 'flex-end',
    borderBottom: '1px solid #d1d5db',
    gap: '12px'
  },
  badgeBlack: {
    backgroundColor: '#000000',
    color: '#ffffff',
    padding: '6px 16px',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '14px',
    display: 'flex',
    gap: '8px'
  },
  badgeSlate: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: '6px 16px',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '14px',
    display: 'flex',
    gap: '8px'
  },
  tableWrapper: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    backgroundColor: '#ffffff'
  },
  table: {
    width: '100%',
    textAlign: 'left',
    borderCollapse: 'collapse'
  },
  thStickyRow1: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: '#A4D5B7',
    borderBottom: '1px solid #9ca3af',
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#1f2937',
    textAlign: 'center'
  },
  thStickyRow2: {
    position: 'sticky',
    top: '35px',
    zIndex: 10,
    backgroundColor: '#C8E7D3',
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  thStickyRow3: {
    position: 'sticky',
    top: '63px',
    zIndex: 10,
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #d1d5db'
  },
  filterInput: {
    width: '100%',
    fontSize: '12px',
    padding: '4px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box'
  },
  tdCell: {
    borderBottom: '1px solid #d1d5db',
    borderRight: '1px solid #d1d5db',
    padding: '8px 12px'
  },
  qtyInput: {
    width: '100%',
    textAlign: 'center',
    padding: '4px 0',
    fontWeight: 'bold',
    color: '#111827',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none'
  },
  actionPanel: {
    flexShrink: 0,
    backgroundColor: '#f3f4f6',
    padding: '12px 24px',
    borderTop: '2px solid #d1d5db',
    display: 'flex',
    justify: 'flex-end',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  btnPreview: {
    backgroundColor: '#334155',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: '14px',
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer'
  },
  btnSave: {
    backgroundColor: '#059669',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: '14px',
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dark translucent backdrop
    display: 'flex',
    justifyContent: 'center', // Centers horizontally across full screen
    alignItems: 'center',     // Centers vertically
    zIndex: 1000,             // Keeps it on top of sidebar and order form
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    width: '100vw',
    maxWidth: '1100px',        // Adjust max-width as needed
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  },
  closeBtn: {
    // backgroundColor: 'transparent',
    backgroundColor: 'none',
    color: '#ffffff',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer'
  }
};