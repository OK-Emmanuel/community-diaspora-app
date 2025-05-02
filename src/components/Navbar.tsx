'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Navbar() {
  const { user, signOut, loading, isAdmin } = useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Close the mobile menu when navigating to a new page
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  return (
    <nav className="bg-blue-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-white text-xl font-bold">
                Diaspora Community
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {user && (
                <>
                  <Link 
                    href="/dashboard" 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/dashboard') 
                        ? 'bg-blue-700 text-white' 
                        : 'text-blue-50 hover:bg-blue-500'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/feed" 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/feed') 
                        ? 'bg-blue-700 text-white' 
                        : 'text-blue-50 hover:bg-blue-500'
                    }`}
                  >
                    Feed
                  </Link>
                  <Link 
                    href="/announcements" 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/announcements') 
                        ? 'bg-blue-700 text-white' 
                        : 'text-blue-50 hover:bg-blue-500'
                    }`}
                  >
                    Announcements
                  </Link>
                  {isAdmin() && (
                    <Link 
                      href="/admin/members" 
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        isActive('/admin') 
                          ? 'bg-blue-700 text-white' 
                          : 'text-blue-50 hover:bg-blue-500'
                      }`}
                    >
                      Admin
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Right side menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {loading ? (
              <div className="text-blue-50 px-3 py-2">Loading...</div>
            ) : user ? (
              <div className="ml-3 relative flex items-center space-x-4">
                <Link 
                  href="/profile" 
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/profile') 
                      ? 'bg-blue-700 text-white' 
                      : 'text-blue-50 hover:bg-blue-500'
                  }`}
                >
                  <span className="hidden md:inline">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                  <span className="inline md:hidden">Profile</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-2 rounded-md text-sm font-medium text-blue-50 hover:bg-blue-500"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Link
                  href="/login"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/login') 
                      ? 'bg-blue-700 text-white' 
                      : 'text-blue-50 hover:bg-blue-500'
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/register') 
                      ? 'bg-blue-700 text-white' 
                      : 'text-blue-50 hover:bg-blue-500'
                  }`}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-blue-50 hover:bg-blue-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon for menu */}
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Icon for closing menu */}
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} sm:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          {loading ? (
            <div className="text-blue-50 px-3 py-2">Loading...</div>
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/dashboard') 
                    ? 'bg-blue-700 text-white' 
                    : 'text-blue-50 hover:bg-blue-500'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/feed"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/feed') 
                    ? 'bg-blue-700 text-white' 
                    : 'text-blue-50 hover:bg-blue-500'
                }`}
              >
                Feed
              </Link>
              <Link
                href="/announcements"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/announcements') 
                    ? 'bg-blue-700 text-white' 
                    : 'text-blue-50 hover:bg-blue-500'
                }`}
              >
                Announcements
              </Link>
              <Link
                href="/profile"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/profile') 
                    ? 'bg-blue-700 text-white' 
                    : 'text-blue-50 hover:bg-blue-500'
                }`}
              >
                Profile
              </Link>
              {isAdmin() && (
                <Link
                  href="/admin/members"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/admin') 
                      ? 'bg-blue-700 text-white' 
                      : 'text-blue-50 hover:bg-blue-500'
                  }`}
                >
                  Admin
                </Link>
              )}
              <button
                onClick={() => signOut()}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-blue-50 hover:bg-blue-500"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/login') 
                    ? 'bg-blue-700 text-white' 
                    : 'text-blue-50 hover:bg-blue-500'
                }`}
              >
                Login
              </Link>
              <Link
                href="/register"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/register') 
                    ? 'bg-blue-700 text-white' 
                    : 'text-blue-50 hover:bg-blue-500'
                }`}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
} 