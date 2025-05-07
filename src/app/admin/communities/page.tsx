"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function AdminCommunitiesPage() {
  const { user, loading: authLoading, isAdmin, isSuperAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [communities, setCommunities] = useState<any[]>([]);
  const [newCommunity, setNewCommunity] = useState({ name: '', logo_url: '', favicon_url: '' });
  const [inviteLinks, setInviteLinks] = useState<{ [communityId: string]: string }>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCommunity, setEditCommunity] = useState({ name: '', logo_url: '', favicon_url: '' });
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (!isAdmin() && !isSuperAdmin()) {
        router.push('/dashboard');
        return;
      }
      setIsLoading(false);
      fetchCommunities();
    }
    // eslint-disable-next-line
  }, [user, authLoading, isAdmin, isSuperAdmin, router]);

  const fetchCommunities = async () => {
    const res = await fetch('/api/community');
    const data = await res.json();
    setCommunities(Array.isArray(data) ? data : []);
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          name: newCommunity.name,
          logo_url: newCommunity.logo_url,
          favicon_url: newCommunity.favicon_url,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create community');
      setNewCommunity({ name: '', logo_url: '', favicon_url: '' });
      fetchCommunities();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateInvite = async (communityId: string) => {
    setInviteLinks((prev) => ({ ...prev, [communityId]: 'Generating...' }));
    try {
      const res = await fetch('/api/community/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, community_id: communityId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate invite');
      // Construct invite link (assuming /register?invite=...)
      const inviteUrl = `${window.location.origin}/register?invite=${data.invite_token}`;
      setInviteLinks((prev) => ({ ...prev, [communityId]: inviteUrl }));
    } catch (err: any) {
      setInviteLinks((prev) => ({ ...prev, [communityId]: err.message }));
    }
  };

  const handleEditClick = (community: any) => {
    setEditingId(community.id);
    setEditCommunity({
      name: community.name || '',
      logo_url: community.logo_url || '',
      favicon_url: community.favicon_url || '',
    });
  };

  const handleEditCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/community', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          id: editingId,
          ...editCommunity,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update community');
      setEditingId(null);
      setEditCommunity({ name: '', logo_url: '', favicon_url: '' });
      fetchCommunities();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCommunity({ name: '', logo_url: '', favicon_url: '' });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading community management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Manage Communities</h1>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Back
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Create New Community</h2>
          <form onSubmit={handleCreateCommunity} className="space-y-2">
            <div>
              <input
                type="text"
                placeholder="Community Name"
                value={newCommunity.name}
                onChange={e => setNewCommunity({ ...newCommunity, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Logo URL (optional)"
                value={newCommunity.logo_url}
                onChange={e => setNewCommunity({ ...newCommunity, logo_url: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Favicon URL (optional)"
                value={newCommunity.favicon_url}
                onChange={e => setNewCommunity({ ...newCommunity, favicon_url: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? 'Creating...' : 'Create Community'}
            </button>
            {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
          </form>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Existing Communities</h2>
          <ul className="space-y-2">
            {communities.map((c) => (
              <li key={c.id} className="border rounded p-2 flex flex-col md:flex-row md:items-center md:justify-between">
                {editingId === c.id ? (
                  <form onSubmit={handleEditCommunity} className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                    <input
                      type="text"
                      value={editCommunity.name}
                      onChange={e => setEditCommunity({ ...editCommunity, name: e.target.value })}
                      className="px-2 py-1 border rounded"
                      required
                    />
                    <input
                      type="text"
                      value={editCommunity.logo_url}
                      onChange={e => setEditCommunity({ ...editCommunity, logo_url: e.target.value })}
                      className="px-2 py-1 border rounded"
                      placeholder="Logo URL"
                    />
                    <input
                      type="text"
                      value={editCommunity.favicon_url}
                      onChange={e => setEditCommunity({ ...editCommunity, favicon_url: e.target.value })}
                      className="px-2 py-1 border rounded"
                      placeholder="Favicon URL"
                    />
                    <button type="submit" className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                    <button type="button" onClick={handleCancelEdit} className="px-2 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Cancel</button>
                  </form>
                ) : (
                  <>
                    <span>{c.name}</span>
                    <div className="mt-2 md:mt-0 flex flex-col md:flex-row md:items-center gap-2">
                      <button
                        className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        onClick={() => handleEditClick(c)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        onClick={() => handleGenerateInvite(c.id)}
                        type="button"
                      >
                        Generate Invite Link
                      </button>
                      {inviteLinks[c.id] && (
                        <input
                          type="text"
                          value={inviteLinks[c.id]}
                          readOnly
                          className="w-full md:w-64 px-2 py-1 border rounded bg-gray-100 text-xs"
                          onFocus={e => e.target.select()}
                        />
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
} 