// import React, { useState } from 'react';
// import { Outlet } from 'react-router-dom';
// // import NavbarHeader from './NavbarHeader';
// import Sidebar from './Sidebar';

// const MainLayout = () => {
//   const [sidebarOpen, setSidebarOpen] = useState(true);

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
//       {/* Top Navbar Header */}
//       {/* <NavbarHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} /> */}

//       {/* Main Area directly below Header */}
//       <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 55px)', overflow: 'hidden' }}>
//         {/* Sidebar Wrapper */}
//         {sidebarOpen && (
//           <aside style={{ width: '240px', flexShrink: 0, height: '100%', backgroundColor: '#1e293b' }}>
//             <Sidebar />
//           </aside>
//         )}

//         {/* Dynamic Table Page Area */}
//         <main style={{ flex: 1, padding: '2px', backgroundColor: '#f8fafc', overflowY: 'hidden' }}>
//           <Outlet />
//         </main>
//       </div>
//     </div>
//   );
// };

// export default MainLayout;

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'; // Ensure you have react-icons installed, or replace with text/SVG

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* Main Area */}
      <div style={{ display: 'flex', flex: 1, height: '100vh', overflow: 'hidden', position: 'relative' }}>
        
        {/* Sidebar Wrapper with smooth transition */}
        <aside 
          style={{ 
            width: sidebarOpen ? '240px' : '0px', 
            flexShrink: 0, 
            height: '100%', 
            backgroundColor: '#1e293b',
            transition: 'width 0.1s ease',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 10
          }}
        >
          {/* Sidebar Top Header with Toggle Arrow */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '12px 15px', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            minHeight: '50px'
          }}>
            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>
              ADMIN PANEL
            </span>
            <button 
              onClick={() => setSidebarOpen(false)}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: '#94a3b8', 
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px'
              }}
              title="Collapse Sidebar"
            >
              <FaChevronLeft />
            </button>
          </div>

          {/* Actual Sidebar Content Navigation */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <Sidebar />
          </div>
        </aside>

        {/* Floating Expand Button (Visible only when sidebar is closed) */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            style={{ 
              position: 'absolute', 
              top: '15px', 
              left: '15px', 
              zIndex: 1000, 
              background: '#1e293b', 
              color: '#fff', 
              border: 'none', 
              padding: '8px 10px', 
              borderRadius: '4px', 
              cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Expand Sidebar"
          >
            <FaChevronRight />
          </button>
        )}

        {/* Dynamic Table Page Area */}
        <main style={{ flex: 1, padding: '2px', backgroundColor: '#f8fafc', overflowY: 'auto', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;