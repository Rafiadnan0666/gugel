import React, { useState } from 'react';
import Sidebar from './Sidebar';


const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'md:ml-5' : 'md:ml-10'
      }`}>
        <main role="main" aria-label="Main content">
          {children}
        </main>
      </div>
      
      {/* Skip to main content for keyboard navigation */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:outline-none"
        tabIndex={0}
      >
        Skip to main content
      </a>
    </div>
  );
};

export default Layout;
