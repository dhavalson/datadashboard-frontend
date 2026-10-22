import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProductDetails } from '../../redux/productSlice';
import { fetchDistributorDetails } from '../../redux/distributorSlice';
import OrderForm from './orderForm';
import { FetchDistributor } from './FetchDistributor';


const PREDEFINED_SIZE_ORDER = [
    'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', '4XL', '5XL',
    'ONE SIZE', 'FREE SIZE', 'FS',
    '30INCH', '32INCH', '34INCH', '36INCH', '38INCH', '40INCH', '42INCH'
  ];

  // 2. Helper function to sort sizes
  const sortSizes = (sizeArray) => {
    if (!Array.isArray(sizeArray)) return [];

    return [...sizeArray].sort((a, b) => {
      const cleanA = String(a || '').trim().toUpperCase();
      const cleanB = String(b || '').trim().toUpperCase();

      const indexA = PREDEFINED_SIZE_ORDER.indexOf(cleanA);
      const indexB = PREDEFINED_SIZE_ORDER.indexOf(cleanB);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      const numA = parseInt(cleanA.replace(/\D/g, ''), 10);
      const numB = parseInt(cleanB.replace(/\D/g, ''), 10);

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }

      return cleanA.localeCompare(cleanB);
    });
  };


const OrderFormCategoryWise = () => {
  const dispatch = useDispatch();
  const { data = [] } = useSelector((state) => state.product || {});
  const { user } = useSelector((state) => state.auth || {});

  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sizes, setSizes] = useState(null);
  const [DISTRIBUTORS = [], DISTRI_ALLOWED_GROUP = {}, loadingD] = FetchDistributor();
  const [selectedDistributor, setSelectedDistributor] = useState(null);
  const distributorName = selectedDistributor?.distributor_name || '';
  const allowedGroupsForCurrentDist = DISTRI_ALLOWED_GROUP[distributorName] || [];

  useEffect(() => {
    dispatch(fetchDistributorDetails());
    dispatch(fetchProductDetails());
  }, [dispatch, user?.id]);

  const primaryCategories = Array.isArray(data)
    ? [...new Set(data.map((item) => item?.primary_category).filter(Boolean))]
    : [];

  // const sizes = Array.isArray(data)
  //   ? [...new Set(data.map((item) => item?.variant).filter(Boolean))]
  //   : [];  

  // 1. Move static order array outside the component to avoid re-creating on every render
  
  // -------------------------------------------------------------

  // Inside your component:
  const handlePrimaryCategoryClick = (categoryName) => {
    setSelectedCategory(categoryName);

    // Filter products by selected primary category
    const filteredProducts = categoryName
      ? data.filter((item) => item?.primary_category === categoryName)
      : data;

    setProducts(filteredProducts);

    // Extract unique sizes from the filtered category products
    const rawUniqueSizes = [
      ...new Set(
        filteredProducts
          .map((item) => item?.variant?.toString().trim())
          .filter(Boolean)
      )
    ];

    // Sort and set sizes directly in state
    const sorted = sortSizes(rawUniqueSizes);
    setSizes(sorted);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setProducts([]);
  };

  const sortedPrimaryCategories = useMemo(() => {
  if (!Array.isArray(primaryCategories)) return [];
  return [...primaryCategories].sort((a, b) =>
    String(a || '').localeCompare(String(b || ''))
  );
}, [primaryCategories]);

  // Render OrderForm with full vertical and horizontal scroll support
  if (selectedCategory) {
    return (
      <div style={styles.orderFormContainer}>
        <button
          onClick={handleBackToCategories}
          style={styles.backButton}
        >
          ← Back to Categories
        </button>
        <OrderForm
          INITIAL_PRODUCTS={products}
          DISTRIBUTORS={DISTRIBUTORS}
          SIZES={sizes}
          // selectedDistributor={selectedDistributor}
          // setSelectedDistributor={setSelectedDistributor}
          DISTRI_ALLOWED_GROUP={allowedGroupsForCurrentDist}
        />
      </div>
    );
  }

  

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Select Primary Category</h2>
      <div style={styles.categoryContainer}>
        {sortedPrimaryCategories.map((p_category, index) => (
          <button
            key={p_category || index}
            style={styles.categoryButton}
            onClick={() => handlePrimaryCategoryClick(p_category)}
          >
            {p_category}
          </button>
        ))}
      </div>
    </div>
  );
};



const styles = {
  container: {
    padding: '20px',
    width: '100%',
    height: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: '#f8f9fa',
  },
  categoryContainer: {
  display: 'flex',
  flexDirection: 'column',
  flexWrap: 'wrap',
  height: '420px',          // Height constraint to force wrapping into Column 2
  maxHeight: '70vh',
  overflowX: 'auto',
  overflowY: 'hidden',

  // 1. Control spacing between columns & rows explicitly
  gap: '50px 70px',          // [row-gap column-gap] -> 16px between columns

  // 2. Align multi-column content closely to the start (Left side)
  alignContent: 'flex-start', // 👈 Stops Flexbox from spreading columns apart across full width
  justifyContent: 'flex-start',

  padding: '10px',
},
  // Added full scrollable container properties for OrderForm view
  orderFormContainer: {
    width: '100%',
    height: '100vh',
    overflowY: 'auto',
    overflowX: 'auto',
    padding: '20px 20px 80px 20px', // Added extra bottom padding (80px) to clear action buttons
    boxSizing: 'border-box',
    backgroundColor: '#f8f9fa',
  },
  heading: {
    margin: '0 0 8px 0',
    fontSize: '20px',
    color: '#333333',
  },
  // gridContainer: {
  //   display: 'grid',
  //   gridTemplateColumns: 'repeat(1, 1fr)',
  //   gap: '20px',
  //   width: '400px',
  //   overflowY: 'auto',
  //   padding: '20px',
  //   backgroundColor: '#ffffff',
  //   borderRadius: '8px',
  //   border: '1px solid #e0e0e0',
  //   boxSizing: 'border-box',
  // },
  categoryButton: {
    display: 'flex',
    minWidth: '300px',
    width: '300px',
  flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 10px',
    fontSize: '17px',
    fontWeight: '500',
    color: '#0c0404',
    backgroundColor: '#ceedcb',
    border: '1px solid #555c62',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    wordBreak: 'break-word',
    transition: 'all 0.2s ease',
    // width: '100%',
  },
  backButton: {
    padding: '8px 16px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#333333',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default OrderFormCategoryWise;