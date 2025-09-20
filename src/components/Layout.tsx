import React from 'react'
import Sidebar from './Sidebar' 
import Navbar from './Navbar'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children ,  }) => {
    return (
        <div>
            <div>
 {/* <Navbar/> */}
     
            </div>
           
  <div className="layout-container" style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '1rem' }}>
                {children}
            </main>
        </div>
        </div>
      
    )
}

export default Layout