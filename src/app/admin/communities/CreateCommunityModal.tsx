import React from 'react';

interface CreateCommunityModalProps {
  show: boolean;
  onClose: () => void;
  onCreate: (e: React.FormEvent) => void;
  creating: boolean;
  error: string | null;
  newCommunity: { name: string; logo_url: string; favicon_url: string };
  setNewCommunity: (c: { name: string; logo_url: string; favicon_url: string }) => void;
  templates: Array<{ name: string; logo_url?: string; favicon_url?: string }>;
  selectedTemplate: number | null;
  handleCreateFromTemplate: (idx: number) => void;
  handleSaveTemplate: () => void;
}

const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  show,
  onClose,
  onCreate,
  creating,
  error,
  newCommunity,
  setNewCommunity,
  templates,
  selectedTemplate,
  handleCreateFromTemplate,
  handleSaveTemplate,
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Create New Community</h2>
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
        <form onSubmit={onCreate} className="space-y-2">
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
    </div>
  );
};

export default CreateCommunityModal; 