import React from 'react';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen relative bg-[#050505] overflow-x-hidden" dir="rtl" style={{ width: '100%' }}>
      <main style={{ width: '100%' }}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
