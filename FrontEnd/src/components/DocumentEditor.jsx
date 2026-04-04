
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import AIAssistantPanel from "../components/AIAssistantPanel";

// ─── Config ───────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_DB_URL;
const WS  = import.meta.env.VITE_API_DB_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem("token");

/** Decode JWT payload without a library */
const decodeJwt = (token) => {
  try { return JSON.parse(atob(token.split(".")[1])); }
  catch { return {}; }
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// ─── Toolbar button ───────────────────────────────────────────────────────────
function TBtn({ onClick, active, title, children, disabled }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "5px 9px", borderRadius: 7, border: "none",
        cursor: disabled ? "not-allowed" : "pointer", fontSize: 12,
        fontWeight: 600, transition: "all 0.15s", minWidth: 28,
        background: active ? "#6c3fff" : "#12122a",
        color: active ? "#fff" : "#6060a0",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ─── Rich text toolbar ────────────────────────────────────────────────────────
function RichToolbar() {
  const fmt = (cmd, val) => document.execCommand(cmd, false, val);
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {[
        { cmd: "bold",          icon: "B",  title: "Bold" },
        { cmd: "italic",        icon: "I",  title: "Italic" },
        { cmd: "underline",     icon: "U",  title: "Underline" },
        { cmd: "strikeThrough", icon: "S̶", title: "Strikethrough" },
      ].map(b => <TBtn key={b.cmd} onClick={() => fmt(b.cmd)} title={b.title}>{b.icon}</TBtn>)}
      <div style={{ width: 1, background: "#1a1b2e", margin: "0 4px" }} />
      {[
        { cmd: "formatBlock", val: "h1", icon: "H1" },
        { cmd: "formatBlock", val: "h2", icon: "H2" },
        { cmd: "formatBlock", val: "h3", icon: "H3" },
        { cmd: "formatBlock", val: "p",  icon: "¶"  },
      ].map(b => <TBtn key={b.val} onClick={() => fmt(b.cmd, b.val)} title={b.val.toUpperCase()}>{b.icon}</TBtn>)}
      <div style={{ width: 1, background: "#1a1b2e", margin: "0 4px" }} />
      {[
        { cmd: "insertUnorderedList", icon: "• List" },
        { cmd: "insertOrderedList",   icon: "1. List" },
        { cmd: "indent",              icon: "→" },
        { cmd: "outdent",             icon: "←" },
      ].map(b => <TBtn key={b.cmd} onClick={() => fmt(b.cmd)} title={b.cmd}>{b.icon}</TBtn>)}
      <div style={{ width: 1, background: "#1a1b2e", margin: "0 4px" }} />
      <TBtn onClick={() => fmt("removeFormat")} title="Clear formatting">Tx</TBtn>
    </div>
  );
}

// ─── Code toolbar ─────────────────────────────────────────────────────────────
const LANGUAGES = ["javascript","python","typescript","html","css","json","bash","sql"];

function CodeToolbar({ language, onLanguageChange }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select
        value={language}
        onChange={e => onLanguageChange(e.target.value)}
        style={{
          background: "#12122a", border: "1px solid #1e1e38", borderRadius: 7,
          padding: "5px 10px", color: "#a78bfa", fontSize: 12, outline: "none", cursor: "pointer",
        }}
      >
        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
    </div>
  );
}

// ─── Main EditorPage ──────────────────────────────────────────────────────────
export default function DocumentEditor() {
  const { docId } = useParams();
  const navigate  = useNavigate();

  const token = getToken();
  const me    = decodeJwt(token); // { uid, email }

  // ── Doc state ──────────────────────────────────────────────────────────────
  const [doc,          setDoc]          = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  // ── Editor state ───────────────────────────────────────────────────────────
  const [mode,         setMode]         = useState("rich");
  const [language,     setLanguage]     = useState("javascript");
  const [codeContent,  setCodeContent]  = useState("");
  const [title,        setTitle]        = useState("");
  const [editingTitle, setEditingTitle] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showAI,       setShowAI]       = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [saveLabel,    setSaveLabel]    = useState("Saved");
  const [saved,        setSaved]        = useState(true);
  const [wordCount,    setWordCount]    = useState(0);

  // ── Version state ──────────────────────────────────────────────────────────
  const [showVersions,    setShowVersions]    = useState(false);
  const [versions,        setVersions]        = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // ── Collaborators (from socket presence) ───────────────────────────────────
  const [collaborators, setCollaborators] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({}); // userId → { name, color, line }

  // ── Refs ───────────────────────────────────────────────────────────────────
  const richRef      = useRef(null);
  const codeRef      = useRef(null);
  const socketRef    = useRef(null);
  const saveTimer    = useRef(null);
  const richInited   = useRef(false);  // guards one-time innerHTML seed
  const suppressSync = useRef(false);  // prevents echo of our own socket ops
  const pendingRich  = useRef("");     // holds content until richRef is mounted

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Load document from API
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!docId || !token) return;
    (async () => {
      try {
        const res  = await fetch(`${WS}/docs/${docId}`, { headers: authHeaders() });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to load document");
        const { doc: d } = await res.json();

        setDoc(d);
        setTitle(d.title || "Untitled");
        setMode(d.type === "code" ? "code" : "rich");
        setLanguage(d.language || "javascript");

        if (d.type === "code") {
          setCodeContent(d.content || "");
        } else {
          // Store content for the one-time seed (richRef may not be mounted yet)
          pendingRich.current = d.content || "<p>Start writing…</p>";
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [docId, token]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Seed rich editor ONCE after doc loads — the backwards-typing fix.
  //    After this point React NEVER writes innerHTML again; the DOM owns it.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (
      mode === "rich" &&
      richRef.current &&
      !richInited.current &&
      pendingRich.current
    ) {
      richRef.current.innerHTML = pendingRich.current;
      richInited.current = true;
    }
  }); // intentionally no dep array — runs every render until guard fires

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Socket.io — connect once, join doc room
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!docId || !token) return;

    const SOCKET_URL = import.meta.env.VITE_API_AI_URL; // http://localhost:4000
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("doc:join", { documentId: docId });
    });

    // Presence list → collaborators (excluding self)
    socket.on("doc:presence", ({ users }) => {
      setCollaborators(
        users
          .filter(u => u.userId !== me.uid)
          .map(u => ({
            id:       u.userId,
            name:     u.name,
            initials: (u.name || "??").slice(0, 2).toUpperCase(),
            color:    u.color,
            cursor:   u.cursor,
          }))
      );
    });

    // Remote cursor position
    socket.on("doc:cursor", ({ userId, name, color, position }) => {
      setRemoteCursors(prev => ({ ...prev, [userId]: { name, color, line: position?.line } }));
    });

    // Remote plain-text operation — apply without triggering our own handlers
    socket.on("doc:operation", ({ userId, update }) => {
      if (userId === me.uid) return; // ignore echo
      suppressSync.current = true;

      if (mode === "code") {
        setCodeContent(update);
        if (codeRef.current) codeRef.current.value = update;
      } else if (richRef.current) {
        // Preserve caret position as best we can
        const sel   = window.getSelection();
        const range = sel?.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
        richRef.current.innerHTML = update;
        if (range) {
          try { sel.removeAllRanges(); sel.addRange(range); } catch {}
        }
      }
      suppressSync.current = false;
    });

    socket.on("connect_error", err => console.error("[WS]", err.message));

    return () => {
      socket.emit("doc:leave", { documentId: docId });
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, token]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Auto-save — debounced PATCH to backend
  // ═══════════════════════════════════════════════════════════════════════════
  const triggerSave = useCallback((content) => {
    setSaved(false);
    setSaveLabel("Saving…");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`${WS}/docs/${docId}`, {
          method:  "PATCH",
          headers: authHeaders(),
          body:    JSON.stringify({ content }),
        });
        setSaved(true);
        setSaveLabel("Saved");
      } catch {
        setSaveLabel("Save failed");
      }
    }, 1200);
  }, [docId]);

  // ─── Rich text input ───────────────────────────────────────────────────────
  const handleRichInput = useCallback(() => {
    if (suppressSync.current) return;
    const html = richRef.current.innerHTML;

    // Update word count
    setWordCount((richRef.current.innerText || "").trim().split(/\s+/).filter(Boolean).length);

    triggerSave(html);

    // Broadcast plain-text operation to room
    socketRef.current?.emit("doc:operation", {
      documentId: docId,
      update:     html,
      revision:   Date.now(),
    });
  }, [docId, triggerSave]);

  // ─── Code input ────────────────────────────────────────────────────────────
  const handleCodeInput = useCallback((e) => {
    if (suppressSync.current) return;
    const val = e.target.value;
    setCodeContent(val);
    setWordCount(val.trim().split(/\s+/).filter(Boolean).length);
    triggerSave(val);
    socketRef.current?.emit("doc:operation", {
      documentId: docId,
      update:     val,
      revision:   Date.now(),
    });
  }, [docId, triggerSave]);

  // ─── Tab key in code editor ────────────────────────────────────────────────
  const handleCodeKeyDown = (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta    = codeRef.current;
    const start = ta.selectionStart;
    ta.value    = ta.value.substring(0, start) + "  " + ta.value.substring(ta.selectionEnd);
    ta.selectionStart = ta.selectionEnd = start + 2;
    setCodeContent(ta.value);
    triggerSave(ta.value);
  };

  // ─── Cursor broadcast ──────────────────────────────────────────────────────
  const emitCursor = useCallback((line) => {
    socketRef.current?.emit("doc:cursor", {
      documentId: docId,
      position:   { line },
    });
  }, [docId]);

  // ─── Text selection capture ────────────────────────────────────────────────
  const handleSelect = () => {
    if (mode === "rich") {
      const sel = window.getSelection()?.toString().trim();
      if (sel) setSelectedText(sel);
    } else {
      const ta  = codeRef.current;
      if (!ta) return;
      const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd).trim();
      if (sel) setSelectedText(sel);
      const line = ta.value.substring(0, ta.selectionStart).split("\n").length;
      emitCursor(line);
    }
  };

  // ─── Insert AI result ──────────────────────────────────────────────────────
  const handleInsert = (text) => {
    if (mode === "rich" && richRef.current) {
      richRef.current.focus();
      document.execCommand("insertText", false, text);
      handleRichInput();
    } else if (mode === "code" && codeRef.current) {
      const ta    = codeRef.current;
      const start = ta.selectionStart;
      ta.value    = ta.value.substring(0, start) + text + ta.value.substring(ta.selectionEnd);
      ta.selectionStart = ta.selectionEnd = start + text.length;
      setCodeContent(ta.value);
      triggerSave(ta.value);
    }
  };

  // ─── Title save on blur ────────────────────────────────────────────────────
  const handleTitleBlur = async () => {
    setEditingTitle(false);
    if (!title.trim()) return;
    await fetch(`${WS}/docs/${docId}`, {
      method:  "PATCH",
      headers: authHeaders(),
      body:    JSON.stringify({ title }),
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Versions
  // ═══════════════════════════════════════════════════════════════════════════
  const loadVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const res  = await fetch(`${WS}/docs/${docId}/versions`, { headers: authHeaders() });
      const data = await res.json();
      setVersions(data.versions || []);
    } catch {}
    finally { setVersionsLoading(false); }
  }, [docId]);

  const handleSaveVersion = async () => {
    const message = prompt("Version message (optional):") || undefined;
    setSaveLabel("Saving version…");
    await fetch(`${WS}/docs/${docId}/versions`, {
      method:  "POST",
      headers: authHeaders(),
      body:    JSON.stringify({ message }),
    });
    setSaveLabel("Version saved ✓");
    setTimeout(() => setSaveLabel("Saved"), 2000);
    if (showVersions) loadVersions();
  };

  const handleRestoreVersion = async (vid) => {
    if (!confirm("Restore this version? Your current content will be auto-saved first.")) return;
    const res  = await fetch(`${WS}/docs/${docId}/versions/${vid}/restore`, {
      method: "POST", headers: authHeaders(),
    });
    const { doc: restored } = await res.json();
    const content = restored?.content || "";

    if (mode === "code") {
      setCodeContent(content);
      if (codeRef.current) codeRef.current.value = content;
    } else if (richRef.current) {
      richRef.current.innerHTML = content;
    }
    setSaveLabel("Restored ✓");
    setTimeout(() => setSaveLabel("Saved"), 2000);
    loadVersions();
  };

  useEffect(() => {
    if (showVersions) loadVersions();
  }, [showVersions, loadVersions]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Render guards
  // ═══════════════════════════════════════════════════════════════════════════
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#07080f", display: "flex", alignItems: "center", justifyContent: "center", color: "#6060a0", fontFamily: "'Segoe UI', sans-serif" }}>
      Loading document…
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#07080f", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontFamily: "'Segoe UI', sans-serif", flexDirection: "column", gap: 12 }}>
      <div>⚠ {error}</div>
      <button onClick={() => navigate(-1)} style={{ background: "#12122a", border: "none", borderRadius: 8, padding: "8px 16px", color: "#6060a0", cursor: "pointer" }}>Go back</button>
    </div>
  );

  const allCollaborators = [
    { id: me.uid, name: "You", initials: "ME", color: "#6c3fff", cursor: null },
    ...collaborators,
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // JSX
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: "#07080f", fontFamily: "'Segoe UI', sans-serif", color: "#c9d1d9", display: "flex", flexDirection: "column" }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header style={{ background: "#0b0c18", borderBottom: "1px solid #1a1b2e", padding: "0 20px", display: "flex", alignItems: "center", gap: 12, height: 52, flexShrink: 0 }}>

        <button
          onClick={() => navigate(-1)}
          style={{ background: "#12122a", border: "none", borderRadius: 8, padding: "6px 12px", color: "#6060a0", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
        >
          ← Back
        </button>

        <div style={{ width: 1, height: 24, background: "#1a1b2e" }} />

        {/* Editable title */}
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={e => e.key === "Enter" && handleTitleBlur()}
            style={{ background: "#12122a", border: "1px solid #6c3fff", borderRadius: 8, padding: "5px 10px", color: "#f0f0ff", fontSize: 14, fontWeight: 700, outline: "none", width: 240 }}
          />
        ) : (
          <span
            onClick={() => setEditingTitle(true)}
            title="Click to rename"
            style={{ fontSize: 14, fontWeight: 700, color: "#f0f0ff", cursor: "pointer", padding: "4px 8px", borderRadius: 6 }}
          >
            {title}
          </span>
        )}

        <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "#1a0f3d", color: "#a78bfa", fontWeight: 600, textTransform: "capitalize" }}>
          {doc?.type}
        </span>

        <div style={{ flex: 1 }} />

        {/* Collaborator avatars */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex" }}>
            {allCollaborators.map((c, i) => (
              <div
                key={c.id}
                title={c.name}
                style={{
                  width: 28, height: 28, borderRadius: "50%", background: c.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#fff",
                  border: "2px solid #0b0c18", marginLeft: i > 0 ? -8 : 0,
                  position: "relative", zIndex: allCollaborators.length - i,
                }}
              >
                {c.initials}
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: "#22c55e", border: "1.5px solid #0b0c18" }} />
              </div>
            ))}
          </div>
          <span style={{ fontSize: 11, color: "#3d3d5c" }}>{allCollaborators.length} online</span>
        </div>

        <div style={{ width: 1, height: 24, background: "#1a1b2e" }} />

        {/* Mode toggle */}
        <div style={{ display: "flex", background: "#12122a", borderRadius: 9, padding: 3, gap: 2 }}>
          {[{ key: "rich", label: "Rich text", icon: "¶" }, { key: "code", label: "Code", icon: "</>" }].map(m => (
            <button
              key={m.key}
              onClick={() => {
                setMode(m.key);
                // Allow re-seed if switching back to rich
                if (m.key === "rich") {
                  richInited.current = false;
                  pendingRich.current = richRef.current?.innerHTML || codeContent;
                }
              }}
              style={{
                padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 600, transition: "all 0.15s",
                background: mode === m.key ? "#6c3fff" : "transparent",
                color: mode === m.key ? "#fff" : "#3d3d5c",
              }}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleSaveVersion}
          style={{ background: "#12122a", border: "1px solid #1e1e38", borderRadius: 8, padding: "6px 12px", color: "#6060a0", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
        >
          ⊕ Save version
        </button>

        <button
          onClick={() => setShowVersions(v => !v)}
          style={{ background: showVersions ? "#1a0f3d" : "#12122a", border: "1px solid #1e1e38", borderRadius: 8, padding: "6px 12px", color: showVersions ? "#a78bfa" : "#6060a0", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
        >
          ⊞ History
        </button>

        <button
          onClick={() => setShowAI(v => !v)}
          style={{
            background: showAI ? "#6c3fff" : "#1a0f3d",
            border: `1px solid ${showAI ? "#6c3fff" : "#2a1f5e"}`,
            borderRadius: 8, padding: "6px 14px",
            color: showAI ? "#fff" : "#a78bfa",
            fontSize: 11, cursor: "pointer", fontWeight: 700,
            display: "flex", alignItems: "center", gap: 5,
          }}
        >
          <span>✦</span> AI Assistant
        </button>

        <span style={{ fontSize: 11, color: saved ? "#22c55e" : "#f59e0b", fontWeight: 600, minWidth: 70, textAlign: "right" }}>
          {saveLabel}
        </span>
      </header>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div style={{ background: "#0b0c18", borderBottom: "1px solid #1a1b2e", padding: "8px 20px", display: "flex", alignItems: "center", gap: 8 }}>
        {mode === "rich"
          ? <RichToolbar />
          : <CodeToolbar language={language} onLanguageChange={setLanguage} />
        }
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "#3d3d5c" }}>{wordCount} {mode === "code" ? "tokens" : "words"}</span>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Editor area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

          {/* Presence bar */}
          <div style={{ background: "#0a0b16", borderBottom: "1px solid #1a1b2e", padding: "6px 24px", display: "flex", gap: 16, alignItems: "center", flexShrink: 0 }}>
            {allCollaborators.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
                <span style={{ fontSize: 11, color: c.color, fontWeight: 500 }}>{c.name}</span>
                {remoteCursors[c.id]?.line && (
                  <span style={{ fontSize: 10, color: "#3d3d5c" }}>Ln {remoteCursors[c.id].line}</span>
                )}
              </div>
            ))}
          </div>

          {/* ── Rich text editor ── */}
          {mode === "rich" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "40px 60px" }}>
              {/*
                NO dangerouslySetInnerHTML — content is set once in useEffect above.
                React never touches innerHTML again while the user is typing.
                This is the backwards-typing fix.
              */}
              <div
                ref={richRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleRichInput}
                onMouseUp={handleSelect}
                onKeyUp={handleSelect}
                style={{
                  minHeight: 500, outline: "none", fontSize: 15,
                  lineHeight: 1.8, color: "#c9d1d9", caretColor: "#6c3fff",
                  maxWidth: 780, margin: "0 auto",
                }}
              />
              <style>{`
                [contenteditable] h1 { font-size:28px;font-weight:700;color:#f0f0ff;margin:24px 0 12px;letter-spacing:-0.5px }
                [contenteditable] h2 { font-size:22px;font-weight:700;color:#e2e0ff;margin:20px 0 10px }
                [contenteditable] h3 { font-size:18px;font-weight:600;color:#c9d1d9;margin:16px 0 8px }
                [contenteditable] p  { margin:0 0 12px }
                [contenteditable] ul,[contenteditable] ol { padding-left:24px;margin:0 0 12px }
                [contenteditable] li { margin-bottom:4px }
                [contenteditable] b,[contenteditable] strong { color:#f0f0ff }
                [contenteditable] a  { color:#a78bfa }
                [contenteditable] code { background:#12122a;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px;color:#22d3ee }
              `}</style>
            </div>
          )}

          {/* ── Code editor ── */}
          {mode === "code" && (
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Line numbers */}
              <div style={{ background: "#0a0b16", borderRight: "1px solid #1a1b2e", padding: "20px 0", minWidth: 52, textAlign: "right", overflowY: "hidden", flexShrink: 0 }}>
                {codeContent.split("\n").map((_, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#2a2a4a", lineHeight: "1.75", paddingRight: 14, fontFamily: "'Fira Code','Courier New',monospace" }}>
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Textarea + remote cursors */}
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {Object.entries(remoteCursors).map(([uid, cur]) => cur.line && (
                  <div
                    key={uid}
                    style={{
                      position: "absolute", left: 8, top: (cur.line - 1) * 21 + 20,
                      display: "flex", alignItems: "center", gap: 4, zIndex: 10, pointerEvents: "none",
                    }}
                  >
                    <div style={{ width: 2, height: 18, background: cur.color, borderRadius: 1 }} />
                    <span style={{ fontSize: 9, background: cur.color, color: "#fff", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>{cur.name}</span>
                  </div>
                ))}
                <textarea
                  ref={codeRef}
                  value={codeContent}
                  onChange={handleCodeInput}
                  onKeyDown={handleCodeKeyDown}
                  onMouseUp={handleSelect}
                  onKeyUp={handleSelect}
                  spellCheck={false}
                  style={{
                    width: "100%", height: "100%", background: "#07080f",
                    border: "none", outline: "none", resize: "none",
                    padding: "20px", color: "#c9d1d9",
                    fontSize: 13, lineHeight: 1.75,
                    fontFamily: "'Fira Code','Courier New',monospace",
                    caretColor: "#6c3fff", tabSize: 2,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Version history sidebar ── */}
        {showVersions && (
          <aside style={{ width: 260, background: "#0b0c18", borderLeft: "1px solid #1a1b2e", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #1a1b2e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f0f0ff" }}>Version history</span>
              <button onClick={() => setShowVersions(false)} style={{ background: "none", border: "none", color: "#3d3d5c", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {versionsLoading ? (
                <div style={{ color: "#3d3d5c", fontSize: 12, textAlign: "center", marginTop: 20 }}>Loading…</div>
              ) : versions.length === 0 ? (
                <div style={{ color: "#3d3d5c", fontSize: 12, textAlign: "center", marginTop: 20 }}>No saved versions yet</div>
              ) : versions.map((v, i) => (
                <div
                  key={v.id}
                  style={{ background: i === 0 ? "#0d0a1f" : "#0e0f1e", border: `1px solid ${i === 0 ? "#2a1f5e" : "#1a1b2e"}`, borderRadius: 10, padding: "12px 14px" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: i === 0 ? "#1a0f3d" : "#12122a", color: i === 0 ? "#a78bfa" : "#3d3d5c", fontWeight: 600 }}>
                      {i === 0 ? "Latest" : `v${versions.length - i}`}
                    </span>
                    <span style={{ fontSize: 10, color: "#3d3d5c" }}>
                      {new Date(v.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#c9d1d9", marginBottom: 4, fontWeight: 500 }}>{v.message}</div>
                  <div style={{ fontSize: 11, color: "#3d3d5c" }}>by {v.savedBy?.name || "Unknown"}</div>
                  {i > 0 && (
                    <button
                      onClick={() => handleRestoreVersion(v.id)}
                      style={{ marginTop: 8, width: "100%", padding: "5px 0", borderRadius: 7, border: "none", background: "#12122a", color: "#6060a0", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                    >
                      Restore this version
                    </button>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────────── */}
      <div style={{ background: "#0b0c18", borderTop: "1px solid #1a1b2e", padding: "5px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 10, color: "#3d3d5c" }}>{mode === "code" ? language : "Rich text"}</span>
        <div style={{ width: 1, height: 12, background: "#1a1b2e" }} />
        <span style={{ fontSize: 10, color: "#3d3d5c" }}>{codeContent.split("\n").length} lines</span>
        <div style={{ width: 1, height: 12, background: "#1a1b2e" }} />
        <span style={{ fontSize: 10, color: "#3d3d5c" }}>{wordCount} words</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#3d3d5c" }}>{allCollaborators.length} collaborating · auto-save on</span>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: saved ? "#22c55e" : "#f59e0b" }} />
      </div>

      {/* ── AI Assistant Panel ────────────────────────────────────────────────── */}
      {showAI && (
        <AIAssistantPanel
          token={token}
          documentId={docId}
          selectedText={selectedText}
          onInsert={handleInsert}
          onClose={() => setShowAI(false)}
        />
      )}
    </div>
  );
}
