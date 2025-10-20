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
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
