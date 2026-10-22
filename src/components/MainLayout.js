import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
// import NavbarHeader from './NavbarHeader';
import Sidebar from './Sidebar';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Top Navbar Header */}
      {/* <NavbarHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} /> */}

      {/* Main Area directly below Header */}
      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 55px)', overflow: 'hidden' }}>
        {/* Sidebar Wrapper */}
        {sidebarOpen && (
          <aside style={{ width: '240px', flexShrink: 0, height: '100%', backgroundColor: '#1e293b' }}>
            <Sidebar />
          </aside>
        )}

        {/* Dynamic Table Page Area */}
        <main style={{ flex: 1, padding: '2px', backgroundColor: '#f8fafc', overflowY: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;