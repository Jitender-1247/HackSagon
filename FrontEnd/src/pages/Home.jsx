import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

const API_BASE = import.meta.env.VITE_API_AI_URL;

export default function Home() {
  const navigate = useNavigate();
  const { workspaces, activeWorkspace, setActiveWorkspace, loadWorkspaces } = useStore();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("token");

  // Load workspaces on mount
  useEffect(() => {
    if (token) loadWorkspaces();
  }, [token]);

  // Fetch docs whenever the active workspace changes
  const fetchDocs = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${activeWorkspace.id}/docs`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Could not fetch documents");
      const data = await res.json();
      setDocs(data.docs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, token]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleCreateDoc = async (type = 'document') => {
    if (!activeWorkspace?.id) {
      alert("No workspace selected. Please create a workspace first.");
      return;
    }
    const title = prompt("Enter document title:", "New Project Draft");
    if (!title) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${activeWorkspace.id}/docs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            type,
            language: type === 'code' ? 'javascript' : null,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to create document");
      const { doc } = await res.json();
      if (doc?.id) navigate(`/editor/${doc.id}`);
    } catch (err) {
      alert("Failed to create document: " + err.message);
    }
  };

  const handleCreateWorkspace = async () => {
    const name = prompt("Workspace name:");
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create workspace");
      await loadWorkspaces(); // refresh list
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex h-screen bg-[#07080f] text-[#c9d1d9] font-sans">

      {/* Sidebar */}
      <aside className="w-64 bg-[#0b0c18] border-r border-[#1a1b2e] flex flex-col">
        <div className="p-6 border-b border-[#1a1b2e]">
          <h1 className="text-xl font-bold text-[#6c3fff] flex items-center gap-2">
            <span className="text-2xl">✦</span> CollabLearn
          </h1>
          <p className="text-[10px] text-[#6060a0] mt-1 uppercase tracking-[0.2em] font-bold">
            Workspace Engine
          </p>
        </div>

        {/* Workspace switcher */}
        <div className="p-4 border-b border-[#1a1b2e]">
          <p className="text-[10px] text-[#3d3d5c] uppercase tracking-wider mb-2">Workspace</p>
          {workspaces.length === 0 ? (
            <button
              onClick={handleCreateWorkspace}
              className="w-full text-left text-sm text-[#a78bfa] hover:text-white p-2 rounded-lg hover:bg-[#12122a] transition-all"
            >
              + Create your first workspace
            </button>
          ) : (
            <>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setActiveWorkspace(ws)}
                  className={`w-full text-left text-sm p-2 rounded-lg transition-all mb-1 ${
                    activeWorkspace?.id === ws.id
                      ? 'bg-[#1a0f3d] text-[#a78bfa]'
                      : 'text-[#6060a0] hover:bg-[#12122a] hover:text-[#c9d1d9]'
                  }`}
                >
                  {ws.name}
                </button>
              ))}
              <button
                onClick={handleCreateWorkspace}
                className="w-full text-left text-xs text-[#3d3d5c] hover:text-[#6060a0] p-2 mt-1 transition-all"
              >
                + New workspace
              </button>
            </>
          )}
        </div>

        <div className="p-6 flex-1 space-y-8">
          <div>
            <h2 className="text-xs font-semibold text-[#3d3d5c] uppercase tracking-wider mb-4">
              Create New
            </h2>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => handleCreateDoc('document')}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#12122a] text-sm text-[#a78bfa] transition-all"
              >
                <span className="text-lg">¶</span> Rich Document
              </button>
              <button
                onClick={() => handleCreateDoc('code')}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#12122a] text-sm text-[#22d3ee] transition-all"
              >
                <span className="text-lg">{'</>'}</span> Source Code
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight">Dashboard</h2>
            <p className="text-[#6060a0] mt-2">
              {activeWorkspace
                ? <>Workspace: <span className="font-mono text-[#a78bfa]">{activeWorkspace.name}</span></>
                : "No workspace selected"}
            </p>
          </div>
          <button
            onClick={() => handleCreateDoc('document')}
            className="bg-[#6c3fff] hover:bg-[#5a32d1] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-[#6c3fff33]"
          >
            + Quick Doc
          </button>
        </header>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-8">
            ⚠ {error}
          </div>
        )}

        {!activeWorkspace && !loading && (
          <div className="col-span-full py-20 border-2 border-dashed border-[#1a1b2e] rounded-3xl text-center text-[#6060a0]">
            Create or select a workspace from the sidebar to get started.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center text-[#3d3d5c] animate-pulse">
              Loading documents...
            </div>
          ) : docs.length === 0 && activeWorkspace ? (
            <div className="col-span-full py-20 border-2 border-dashed border-[#1a1b2e] rounded-3xl text-center text-[#6060a0]">
              No documents yet. Create one from the sidebar.
            </div>
          ) : (
            docs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/editor/${doc.id}`)}
                className="group bg-[#0b0c18] border border-[#1a1b2e] p-6 rounded-2xl hover:border-[#6c3fff] transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-xl text-sm font-bold ${
                    doc.type === 'code'
                      ? 'bg-[#0e162a] text-[#22d3ee]'
                      : 'bg-[#1a0f3d] text-[#a78bfa]'
                  }`}>
                    {doc.type === 'code' ? 'Code' : 'Doc'}
                  </div>
                  <div className="text-[10px] text-[#3d3d5c] font-bold uppercase tracking-widest">
                    {doc.language || 'Plain Text'}
                  </div>
                </div>

                <h4 className="text-lg font-bold text-[#f0f0ff] mb-2 group-hover:text-[#6c3fff] transition-colors">
                  {doc.title}
                </h4>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#1a1b2e]">
                  <div className="w-6 h-6 rounded-full bg-[#1a1b2e] flex items-center justify-center text-[10px] font-bold">
                    {doc.createdBy?.name?.charAt(0) || '?'}
                  </div>
                  <div className="text-xs">
                    <p className="text-[#c9d1d9] font-medium">{doc.createdBy?.name}</p>
                    <p className="text-[#3d3d5c]">{new Date(doc.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}