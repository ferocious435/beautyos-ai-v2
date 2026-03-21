import React from 'react';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-[#0a0a0c]" dir="rtl">
      <main className="font-sans">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
