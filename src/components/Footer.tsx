import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-blue-700 text-blue-50 py-4 mt-8 w-full text-center text-sm">
      <span>© {new Date().getFullYear()} Diaspora Community. All rights reserved.</span>
    </footer>
  );
} 