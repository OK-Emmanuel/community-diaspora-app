"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import Link from 'next/link';
import CreateCommunityModal from './CreateCommunityModal';

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
  const [showCreateModal, setShowCreateModal] = useState(false);

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
    const res = await fetch(`/api/community`);
    const data = await res.json();
    setMyCommunity(Array.isArray(data) && data[0] ? data[0] : null);
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      // Let's add the createCommunity method to adminApi since getAllCommunities is working
      if (!adminApi.createCommunity) {
        // If createCommunity doesn't exist in adminApi yet, extend it temporarily
        const res = await fetch('/api/community', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newCommunity.name,
            logo_url: newCommunity.logo_url,
            favicon_url: newCommunity.favicon_url,
            status: 'active',
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create community');
      } else {
        // Use adminApi if the method exists
        await adminApi.createCommunity({
          name: newCommunity.name,
          logo_url: newCommunity.logo_url,
          favicon_url: newCommunity.favicon_url,
          status: 'active',
        });
      }
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
      // Update to use adminApi
      const inviteToken = await adminApi.generateCommunityInvite(communityId, user?.id || '');

      console.log("Generated invite token:", inviteToken);

      if (!inviteToken) {
        throw new Error("Failed to generate invite token");
      }

      // Add a short delay to ensure the database operation completes
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify the invite was created in database
      try {
        const verifyResponse = await fetch(`/api/community/invite?invite_token=${inviteToken}`);
        const verifyData = await verifyResponse.json();
        console.log("Verification response:", verifyData);
        if (!verifyResponse.ok) {
          console.error("Warning: Created invite token not found in database");
        }
      } catch (verifyErr) {
        console.error("Failed to verify invite token:", verifyErr);
      }

      // Construct invite link (assuming /register?invite=...)
      const inviteUrl = `${window.location.origin}/register?invite=${inviteToken}`;
      console.log("Generated invite URL:", inviteUrl);

      setInviteLinks((prev) => ({ ...prev, [communityId]: inviteUrl }));
    } catch (err: any) {
      console.error("Error generating invite:", err);
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
      // Update the community using the adminApi
      await adminApi.updateCommunity(
        editingId,
        {
          name: editCommunity.name,
          logo_url: editCommunity.logo_url,
          favicon_url: editCommunity.favicon_url,
          status: 'active',
        }
      );
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
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Community
              </button>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {isSuperAdmin() && (
          <CreateCommunityModal
            show={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateCommunity}
            creating={creating}
            error={error}
            newCommunity={newCommunity}
            setNewCommunity={setNewCommunity}
            templates={templates}
            selectedTemplate={selectedTemplate}
            handleCreateFromTemplate={handleCreateFromTemplate}
            handleSaveTemplate={handleSaveTemplate}
          />
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logo</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Favicon</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {communities.map((c) => (
                      <tr key={c.id}>
                        {/* Name or edit field */}
                        <td className="px-4 py-2 whitespace-nowrap">
                          {editingId === c.id ? (
                            <input
                              type="text"
                              value={editCommunity.name}
                              onChange={e => setEditCommunity({ ...editCommunity, name: e.target.value })}
                              className="px-2 py-1 border rounded w-full"
                              required
                            />
                          ) : (
                            <span className="font-medium text-gray-900">{c.name}</span>
                          )}
                        </td>
                        {/* Logo */}
                        <td className="px-4 py-2 whitespace-nowrap">
                          {editingId === c.id ? (
                            <input
                              type="text"
                              value={editCommunity.logo_url}
                              onChange={e => setEditCommunity({ ...editCommunity, logo_url: e.target.value })}
                              className="px-2 py-1 border rounded w-full"
                              placeholder="Logo URL"
                            />
                          ) : (
                            c.logo_url ? <img src={c.logo_url} alt="Logo" className="h-8 w-8 rounded-full bg-white" /> : <span className="text-gray-400">—</span>
                          )}
                        </td>
                        {/* Favicon */}
                        <td className="px-4 py-2 whitespace-nowrap">
                          {editingId === c.id ? (
                            <input
                              type="text"
                              value={editCommunity.favicon_url}
                              onChange={e => setEditCommunity({ ...editCommunity, favicon_url: e.target.value })}
                              className="px-2 py-1 border rounded w-full"
                              placeholder="Favicon URL"
                            />
                          ) : (
                            c.favicon_url ? <img src={c.favicon_url} alt="Favicon" className="h-6 w-6 rounded bg-white" /> : <span className="text-gray-400">—</span>
                          )}
                        </td>
                        {/* Status */}
                        <td className="px-4 py-2 whitespace-nowrap">
                          {c.status ? (
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Unknown
                            </span>
                          )}

                        </td>
                        {/* Actions */}
                        <td className="px-4 py-2 whitespace-nowrap text-right space-x-2">
                          {editingId === c.id ? (
                            <>
                              <button type="button" onClick={handleCancelEdit} className="px-2 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Cancel</button>
                              <button type="button" onClick={handleEditCommunity} className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                            </>
                          ) : (
                            <>
                              <button
                                className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                onClick={() => handleEditClick(c)}
                                type="button"
                              >
                                Edit
                              </button>
                              <Link
                                href={`/admin/communities/${c.id}/members`}
                                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                View Members
                              </Link>
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
                                  className="w-40 px-2 py-1 border rounded bg-gray-100 text-xs ml-2"
                                  onFocus={e => e.target.select()}
                                />
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    <Link
                      href={`/admin/communities/${myCommunity.id}/members`}
                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      View Members
                    </Link>
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