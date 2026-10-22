import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { 
  FaChevronDown, 
  FaChevronRight, 
  FaTachometerAlt, 
  FaShippingFast, 
  FaUsers, 
  FaCog,
  FaSignOutAlt
} from 'react-icons/fa';
import { useSelector } from 'react-redux';

// Import your Redux actions
import { logoutUser } from '../redux/authSlice'; // Adjust path based on your folder structure
// import { clearTransportData } from '../redux/transportSlice'; // Adjust path based on your folder structure

const menuItems = [
  {
    title: 'User Details',
    icon: <FaUsers />,
    // path: '/userdetails',
    roles: ['admin'],
    subItems: [
      { title: 'User Details', path: '/userdetails/all' },
      // { title: 'Place a Order', path: '/primaryorders/create' },
      // { title: 'Orders Summary', path: '/primaryorders/summary' },
      // { title: 'Orders Details', path: '/primaryorders/all' },
      // { title: 'Retail Sales Summary All', path: '/retailsalessummary/all', roles:['admin'] },
    ],
  },
  
  {
    title: 'Place Primary Order',
    icon: <FaUsers />,
    path: '/primaryorders',
    subItems: [
      { title: 'Place a Order (Categorywise)', path: '/primaryorders/categorywise' },
      { title: 'Place a Order', path: '/primaryorders/create' },
      { title: 'Orders Summary', path: '/primaryorders/summary' },
      { title: 'Orders Details', path: '/primaryorders/all' },
      // { title: 'Retail Sales Summary All', path: '/retailsalessummary/all', roles:['admin'] },
    ],
  },
  {
    title: 'Product Master',
    icon: <FaTachometerAlt />,
    // path: '/dashboard',
    roles: ['admin'],
    subItems: [
      { title: 'Product Master', path: '/products/all' },
      // { title: 'Analytics', path: '/dashboard/analytics' },
    ],
  },
   {
    title: 'Distributor Details',
    icon: <FaUsers />,
    path: '/distributor',
    subItems: [
      { title: 'Distributor Master', path: '/distributormaster/all' },
      // { title: 'Territory Invoice Report Table', path: '/retailsalessummary/report' },
      // { title: 'Retail Sales Summary All', path: '/retailsalessummary/all', roles:['admin'] },
    ],
  },
  // {
  //   title: 'Order Details',
  //   icon: <FaShippingFast />,
  //   path: '/transportdetails',
  //   subItems: [
  //     { title: 'All Orders', path: '/transportdetails/allorders' },
  //     { title: 'Pending Orders', path: '/transportdetails/pendingorders' },
  //     { title: 'Hold Orders', path: '/transportdetails/holdorders' },
  //     { title: 'Transport Details All', path: '/transportdetails/all', roles:['admin'] },
  //   ],
  // },
  // {
  //   title: 'Invoice Details',
  //   icon: <FaUsers />,
  //   path: '/retailsalessummary',
  //   subItems: [
  //     { title: 'All Invoices', path: '/retailsalessummary/allinvoices' },
  //     { title: 'Territory Invoice Report Table', path: '/retailsalessummary/report' },
  //     { title: 'Retail Sales Summary All', path: '/retailsalessummary/all', roles:['admin'] },
  //   ],
  // },
  // {
  //   title: 'Sales Return',
  //   icon: <FaUsers />,
  //   path: '/salesreturn',
  //   // roles: ['admin'],
  //   subItems: [
  //     { title: 'Sales Return All', path: '/salesreturn/all' },
  //     // { title: 'Add New User', path: '/users/add' },
  //     // { title: 'Roles & Zones', path: '/users/roles' },
  //   ],
  //   },
  // {
  //   title: 'Payment Received',
  //   icon: <FaCog />,
  //   path: '/payment',
  //   subItems: [
  //     { title: 'Payment Received', path: '/payment/all' },
  //     // { title: 'Database Config', path: '/settings/db' },
  //   ],
  // },
];

const Sidebar = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  // const 
  const userRole = user?.role?.toLowerCase();
  // console.log(userRole)

  // 1. Filter and transform menu items in a const before returning JSX
  const accessibleMenuItems = menuItems
    .filter((item) => !item.roles || item.roles.includes(userRole))
    .map((item) => {
      // Pre-filter allowed sub-items for each top-level menu
      const allowedSubItems = item.subItems
        ? item.subItems.filter((sub) => !sub.roles || sub.roles.includes(userRole))
        : [];

      return {
        ...item,
        subItems: allowedSubItems,
        hasSubItems: allowedSubItems.length > 0,
      };
    });

  const toggleSubMenu = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleLogout = async () => {
    // 1. Clear transport cached state to prevent showing old user data
    // await dispatch(clearTransportData());
    
    // 2. Clear token & auth state
    await dispatch(logoutUser());
    
    // 3. Clear local storage token and chache
    // sessionStorage.clear();
    
    // 4. Redirect to login
    navigate('/login');
  };

  return (
    <div style={styles.sidebar}>
      <div>
        <h3 style={styles.title}>
          {user?.name?.toUpperCase()}  ({user?.role?.toUpperCase()})
          <br/>
          {user?.territory?.toUpperCase()} - {user?.zone?.toUpperCase()}
          </h3>
        <ul style={styles.menuList}>
          {accessibleMenuItems.map((item, index) => (
            <li key={item.title || index} style={styles.menuItem}>
              <div
                style={styles.menuHeader}
                onClick={() => {
                  if (item.hasSubItems) {
                    toggleSubMenu(index);
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
              >
                <div style={styles.iconTitle}>
                  <span style={styles.icon}>{item.icon}</span>
                  <span>{item.title}</span>
                </div>

                {item.hasSubItems && (
                  openIndex === index ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />
                )}
              </div>

              {/* Submenu rendering */}
              {openIndex === index && item.hasSubItems && (
                <ul style={styles.subMenuContainer}>
                  {item.subItems.map((sub, subIdx) => (
                    <li
                      key={sub.path || subIdx}
                      style={styles.subMenuItem}
                      onClick={() => navigate(sub.path)}
                    >
                      {sub.title}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div style={styles.logoutContainer} onClick={handleLogout}>
        <div style={styles.iconTitle}>
          <span style={styles.icon}><FaSignOutAlt /></span>
          <span>Logout</span>
        </div>
      </div>
    </div>
  );
};

// Sidebar.jsx
const styles = {
  sidebar: {
    width: '100%',
    height: '100%', // Fills exact height of <aside> without exceeding
    backgroundColor: '#1e293b',
    color: '#fff',
    padding: '15px 10px',
    boxSizing: 'border-box', // Includes padding in total 100% height
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between', // Keeps Logout pinned to the bottom
    overflowY: 'auto', // Scroll inside sidebar if menu items overflow small screens
  },
  title: {
    textAlign: 'center',
    marginBottom: '25px',
    color: '#38bdf8',
  },
  menuList: {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
  },
  menuItem: {
    marginBottom: '8px',
  },
  menuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#334155',
    borderRadius: '6px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  iconTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
  },
  subMenuContainer: {
    listStyleType: 'none',
    paddingLeft: '25px',
    marginTop: '5px',
  },
  subMenuItem: {
    padding: '8px 10px',
    fontSize: '14px',
    color: '#cbd5e1',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  logoutContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#ef4444',
    borderRadius: '6px',
    cursor: 'pointer',
    userSelect: 'none',
    marginTop: 'auto',
  },
};

export default Sidebar;