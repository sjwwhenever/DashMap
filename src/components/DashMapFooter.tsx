'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

const DashMapFooter: React.FC = () => {
  const { colors } = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <img 
                src="/Icon/Icon256.png"
                alt="DashMap Logo"
                className="w-8 h-8 rounded-lg mr-3 object-contain"
              />
              <h3 className="text-xl font-bold text-gray-900">DashMap</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed max-w-md">
            Cycling co-pilot for navigation, safety, and emergencies
            </p>
            <div className="flex space-x-4 mt-6">
              <a 
                href="#" 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19 0H5a5 5 0 00-5 5v14a5 5 0 005 5h14a5 5 0 005-5V5a5 5 0 00-5-5zM8 19H5V8h3v11zM6.5 6.732c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zM20 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476V19z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              Platform
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Video Upload
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Emergency Response
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Analytics
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              Support
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Contact Us
                </a>
              </li>

              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Security
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
              <p className="text-sm text-gray-600">
                © {currentYear} DashMap. All rights reserved.
              </p>
              <div className="flex space-x-6">
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Cookie Policy
                </a>
              </div>
            </div>
            <div className="flex items-center mt-4 md:mt-0">
              <span className="text-sm text-gray-500 mr-2">Powered by</span>
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <span>Memories.ai</span>
                <span className="text-gray-400">•</span>
                <span>ElevenLabs</span>
                <span className="text-gray-400">•</span>
                <span>Anthropic</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DashMapFooter;