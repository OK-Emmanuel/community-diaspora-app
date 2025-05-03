import React from 'react';
import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="bg-blue-600 text-blue-50 w-60 min-h-screen p-6 flex flex-col space-y-4">
      <h2 className="text-lg font-bold mb-4">Menu</h2>
      <nav className="flex flex-col space-y-2">
        <Link href="/dashboard" className="hover:bg-blue-700 rounded px-3 py-2">Dashboard</Link>
        <Link href="/feed" className="hover:bg-blue-700 rounded px-3 py-2">Feed</Link>
        <Link href="/announcements" className="hover:bg-blue-700 rounded px-3 py-2">Announcements</Link>
        <Link href="/notifications" className="hover:bg-blue-700 rounded px-3 py-2">Notifications</Link>
        <Link href="/profile" className="hover:bg-blue-700 rounded px-3 py-2">Profile</Link>
      </nav>
    </aside>
  );
} 