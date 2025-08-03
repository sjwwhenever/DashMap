'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

const DashMapHeader: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Image
              src="/Icon/Icon256.png"
              alt="DashMap Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <h1 className="text-xl font-semibold" style={{ color: colors.primary }}>
              DashMap
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashMapHeader;