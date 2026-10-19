import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const PublicLayout = () => {
  return (
    <div className="flex flex-col font-sans text-slate-800 bg-white">
      <Navbar />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
