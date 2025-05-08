"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

// Community Template Types
type CommunityTemplate = {
  name: string;
  logo_url?: string;
  favicon_url?: string;
};

// Simple stat card for community stats
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
  };
  return (
    <div className={`px-4 py-2 rounded shadow text-center ${colorMap[color]}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs font-medium">{label}</div>
    </div>
  );
}

export default function AdminCommunitiesPage() {
  const { user, loading: authLoading, isAdmin, isSuperAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [communities, setCommunities] = useState<any[]>([]);
  const [myCommunity, setMyCommunity] = useState<any | null>(null);
  const [newCommunity, setNewCommunity] = useState({ name: '', logo_url: '', favicon_url: '' });
  const [inviteLinks, setInviteLinks] = useState<{ [communityId: string]: string }>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCommunity, setEditCommunity] = useState({ name: '', logo_url: '', favicon_url: '' });
  const router = useRouter();

  // Template state
  const [templates, setTemplates] = useState<CommunityTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

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
      if (isSuperAdmin()) {
        fetchCommunitiesSuperadmin();
      } else if (isAdmin()) {
        fetchMyCommunity();
      }
    }
    // eslint-disable-next-line
  }, [user, authLoading, isAdmin, isSuperAdmin, router]);

  // Load templates from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('communityTemplates');
    if (stored) setTemplates(JSON.parse(stored));
  }, []);

  // Save templates to localStorage
  useEffect(() => {
    localStorage.setItem('communityTemplates', JSON.stringify(templates));
  }, [templates]);

  // For superadmin: fetch all communities using adminApi
  const fetchCommunitiesSuperadmin = async () => {
    try {
      const data = await adminApi.getAllCommunities();
      setCommunities(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch communities');
    }
  };

  const fetchMyCommunity = async () => {
    const res = await fetch(`/api/community?id=eq.${user?.community_id}`);
    const data = await res.json();
    setMyCommunity(Array.isArray(data) && data[0] ? data[0] : null);
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
      fetchCommunitiesSuperadmin();
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
      fetchCommunitiesSuperadmin();
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

  // Save current newCommunity as a template
  const handleSaveTemplate = () => {
    if (!newCommunity.name) return;
    setTemplates([...templates, { ...newCommunity }]);
    setNewCommunity({ name: '', logo_url: '', favicon_url: '' });
  };

  // Create new community from selected template
  const handleCreateFromTemplate = (idx: number) => {
    const template = templates[idx];
    setNewCommunity({
      name: template.name,
      logo_url: template.logo_url || '',
      favicon_url: template.favicon_url || '',
    });
    setSelectedTemplate(idx);
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
        {isSuperAdmin() && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Create New Community</h2>
            {/* Template selection */}
            {templates.length > 0 && (
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Create from Template:</label>
                <div className="flex flex-wrap gap-2">
                  {templates.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`px-2 py-1 rounded border ${selectedTemplate === idx ? 'bg-blue-100 border-blue-500' : 'bg-gray-100 border-gray-300'}`}
                      onClick={() => handleCreateFromTemplate(idx)}
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                >
                  {creating ? 'Creating...' : 'Create Community'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save as Template
                </button>
              </div>
              {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
            </form>
            {/* List templates */}
            {templates.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-1">Saved Templates:</h3>
                <ul className="list-disc pl-5 text-sm">
                  {templates.map((tpl, idx) => (
                    <li key={idx}>{tpl.name} {tpl.logo_url && <span className="text-gray-400">(Logo)</span>} {tpl.favicon_url && <span className="text-gray-400">(Favicon)</span>}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">{isSuperAdmin() ? 'Existing Communities' : 'Your Community'}</h2>
          {isSuperAdmin() ? (
            <>
              {/* Community stats for superadmin */}
              <div className="mb-4 flex flex-wrap gap-4">
                <Stat label="Total" value={communities.length} color="blue" />
                <Stat label="Active" value={communities.filter((c) => c.status === 'active').length} color="green" />
                <Stat label="Inactive" value={communities.filter((c) => c.status !== 'active').length} color="red" />
              </div>
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
            </>
          ) : myCommunity ? (
            <div className="border rounded p-2 flex flex-col md:flex-row md:items-center md:justify-between">
              {editingId === myCommunity.id ? (
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
                  <span>{myCommunity.name}</span>
                  <div className="mt-2 md:mt-0 flex flex-col md:flex-row md:items-center gap-2">
                    <button
                      className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      onClick={() => handleEditClick(myCommunity)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      onClick={() => handleGenerateInvite(myCommunity.id)}
                      type="button"
                    >
                      Generate Invite Link
                    </button>
                    {inviteLinks[myCommunity.id] && (
                      <input
                        type="text"
                        value={inviteLinks[myCommunity.id]}
                        readOnly
                        className="w-full md:w-64 px-2 py-1 border rounded bg-gray-100 text-xs"
                        onFocus={e => e.target.select()}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-gray-500">No community found for your account.</div>
          )}
        </div>
      </main>
    </div>
  );
} 