'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { notificationsApi } from '@/lib/api';

export default function Navbar({ branding }: { branding?: { name: string; logo_url?: string } }) {
  const { user, signOut, loading, isAdmin, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Close the mobile menu when navigating to a new page
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Fetch unread notifications count
  useEffect(() => {
    if (user && !loading) {
      fetchUnreadCount();
    }
  }, [user, loading, pathname]);

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationsApi.getUnreadCount(user?.id || '');
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching notifications count:', err);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  return (
    <nav className="bg-blue-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-white text-xl font-bold flex items-center gap-2">
                {branding?.logo_url && (
                  <img src={branding.logo_url} alt="Logo" className="h-8 w-8 rounded-full bg-white" />
                )}
                {branding?.name || 'Diaspora Community'}
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
                  {(isAdmin() || isSuperAdmin()) && (
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
                  href="/notifications" 
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium relative ${
                    isActive('/notifications') 
                      ? 'bg-blue-700 text-white' 
                      : 'text-blue-50 hover:bg-blue-500'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <Link 
                  href="/profile" 
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/profile') 
                      ? 'bg-blue-700 text-white' 
                      : 'text-blue-50 hover:bg-blue-500'
                  }`}
                >
                  <span className="hidden md:inline">
                    {user.first_name || user.email}
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
                href="/notifications"
                className={`px-3 py-2 rounded-md text-base font-medium flex justify-between items-center ${
                  isActive('/notifications') 
                    ? 'bg-blue-700 text-white' 
                    : 'text-blue-50 hover:bg-blue-500'
                }`}
              >
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
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
              {(isAdmin() || isSuperAdmin()) && (
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