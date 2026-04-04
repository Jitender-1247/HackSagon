import { useState, useRef, useEffect } from "react";

const TABS = [
  { key: "chat", label: "Chat", icon: "💬", accent: "#6c3fff", tagBg: "#1a0f3d", tagC: "#a78bfa" },
  { key: "suggest", label: "Suggest", icon: "✦", accent: "#06b6d4", tagBg: "#041a20", tagC: "#22d3ee" },
  { key: "summarize", label: "Summarize", icon: "◈", accent: "#ec4899", tagBg: "#1a0818", tagC: "#f472b6" },
  { key: "explain", label: "Explain", icon: "◎", accent: "#84cc16", tagBg: "#0a1a04", tagC: "#a3e635" },
  { key: "autocomplete", label: "Autocomplete", icon: "⟶", accent: "#f59e0b", tagBg: "#1a1000", tagC: "#fbbf24" },
];

const EXPLAIN_LEVELS = ["beginner", "intermediate", "advanced"];
const SUMMARY_STYLES = ["bullets", "paragraph", "tldr"];

const BASE_URL = import.meta.env.VITE_API_BASE;

async function callAI(endpoint, body, token) {
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export default function AIAssistantPanel({
  token = "",
  documentId = null,
  selectedText = "",
  onInsert,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState("chat");
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef(null);

  // Chat state
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your AI assistant. Ask me anything about your document or paste text for me to help with." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef(null);

  // Shared input state per tab
  const [inputs, setInputs] = useState({ suggest: "", summarize: "", explain: "", autocomplete: "" });
  const [results, setResults] = useState({ suggest: "", summarize: "", explain: "", autocomplete: "" });
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});

  // Tab-specific options
  const [explainLevel, setExplainLevel] = useState("beginner");
  const [summaryStyle, setSummaryStyle] = useState("bullets");
  const [language, setLanguage] = useState("");

  // Pre-fill inputs when selectedText changes
  useEffect(() => {
    if (selectedText) {
      setInputs(prev => ({ ...prev, suggest: selectedText, summarize: selectedText, explain: selectedText, autocomplete: selectedText }));
    }
  }, [selectedText]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Drag logic
  const onMouseDown = (e) => {
    if (e.target.closest("button, input, textarea, select")) return;
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  const setLoad = (key, val) => setLoading(p => ({ ...p, [key]: val }));
  const setErr = (key, val) => setError(p => ({ ...p, [key]: val }));
  const setResult = (key, val) => setResults(p => ({ ...p, [key]: val }));

  // Chat send
  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput("");
    setLoad("chat", true);
    setErr("chat", "");
    try {
      const data = await callAI("chat", { messages: newMessages, documentId }, token);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setErr("chat", e.message);
    } finally {
      setLoad("chat", false);
    }
  };

  // Generic tab action
  const runTab = async (tab) => {
    const text = inputs[tab];
    if (!text.trim()) return;
    setLoad(tab, true);
    setErr(tab, "");
    setResult(tab, "");
    try {
      let data;
      if (tab === "suggest") data = await callAI("suggest", { text, documentId }, token);
      if (tab === "summarize") data = await callAI("summarize", { text, documentId, style: summaryStyle }, token);
      if (tab === "explain") data = await callAI("explain", { text, documentId, level: explainLevel }, token);
      if (tab === "autocomplete") data = await callAI("autocomplete", { text, documentId, language: language || undefined }, token);
      const result = data.suggestions || data.summary || data.explanation || data.completion || "";
      setResult(tab, result);
    } catch (e) {
      setErr(tab, e.message);
    } finally {
      setLoad(tab, false);
    }
  };

  const currentTab = TABS.find(t => t.key === activeTab);
  const accent = currentTab.accent;
  const tagC = currentTab.tagC;
  const tagBg = currentTab.tagBg;

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 380,
        background: "#0b0c18",
        border: `1px solid ${accent}55`,
        borderRadius: 16,
        boxShadow: `0 0 0 1px ${accent}22`,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: dragging ? "none" : "auto",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Header */}
      <div
        onMouseDown={onMouseDown}
        style={{
          padding: "14px 16px 0",
          background: "#0b0c18",
          cursor: dragging ? "grabbing" : "grab",
          borderBottom: `1px solid #1a1b2e`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff" }}>
              ✦
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#f0f0ff", letterSpacing: "-0.3px" }}>AI Assistant</span>
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: tagBg, color: tagC, fontWeight: 600 }}>Gemini</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {selectedText && (
              <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "#12122a", color: "#3d3d5c", fontWeight: 500 }}>
                {selectedText.length > 20 ? selectedText.slice(0, 20) + "…" : selectedText} selected
              </span>
            )}
            <button
              onClick={onClose}
              style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "#1a1b2e", color: "#3d3d5c", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 0 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 10px", borderRadius: "8px 8px 0 0",
                border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                whiteSpace: "nowrap", transition: "all 0.15s",
                background: activeTab === t.key ? "#07080f" : "transparent",
                color: activeTab === t.key ? t.tagC : "#3d3d5c",
                borderBottom: activeTab === t.key ? `2px solid ${t.accent}` : "2px solid transparent",
              }}
            >
              <span style={{ fontSize: 11 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ background: "#07080f", flex: 1 }}>

        {/* ── CHAT ── */}
        {activeTab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: 420 }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  {m.role === "assistant" && (
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: "#6c3fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", flexShrink: 0, marginRight: 8, marginTop: 2 }}>✦</div>
                  )}
                  <div style={{
                    maxWidth: "78%", padding: "9px 13px", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    background: m.role === "user" ? "#6c3fff" : "#12122a",
                    color: m.role === "user" ? "#fff" : "#c9d1d9",
                    fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    border: m.role === "assistant" ? "1px solid #1a1b2e" : "none",
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading.chat && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: "#6c3fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>✦</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#6c3fff", opacity: 0.4 + i * 0.3 }} />
                    ))}
                  </div>
                </div>
              )}
              {error.chat && <div style={{ fontSize: 12, color: "#f472b6", background: "#1a0818", padding: "8px 12px", borderRadius: 8 }}>{error.chat}</div>}
              <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: "10px 12px 12px", borderTop: "1px solid #1a1b2e", display: "flex", gap: 8 }}>
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="Ask anything… (Enter to send)"
                rows={2}
                style={{
                  flex: 1, background: "#0e0f1e", border: "1px solid #1e1e38", borderRadius: 10,
                  padding: "9px 12px", color: "#c9d1d9", fontSize: 12, outline: "none",
                  resize: "none", lineHeight: 1.5, fontFamily: "inherit",
                }}
              />
              <button
                onClick={sendChat}
                disabled={loading.chat || !chatInput.trim()}
                style={{
                  width: 38, borderRadius: 10, border: "none", cursor: loading.chat ? "not-allowed" : "pointer",
                  background: loading.chat ? "#1a1b2e" : "#6c3fff", color: "#fff", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                ↑
              </button>
            </div>
          </div>
        )}

        {/* ── SUGGEST / SUMMARIZE / EXPLAIN / AUTOCOMPLETE ── */}
        {activeTab !== "chat" && (
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Options row */}
            {activeTab === "explain" && (
              <div style={{ display: "flex", gap: 6 }}>
                {EXPLAIN_LEVELS.map(l => (
                  <button
                    key={l}
                    onClick={() => setExplainLevel(l)}
                    style={{
                      flex: 1, padding: "6px 0", borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: 11, fontWeight: 600, textTransform: "capitalize", transition: "all 0.15s",
                      background: explainLevel === l ? accent : "#12122a",
                      color: explainLevel === l ? "#fff" : "#3d3d5c",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}

            {activeTab === "summarize" && (
              <div style={{ display: "flex", gap: 6 }}>
                {SUMMARY_STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => setSummaryStyle(s)}
                    style={{
                      flex: 1, padding: "6px 0", borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: 11, fontWeight: 600, textTransform: "capitalize", transition: "all 0.15s",
                      background: summaryStyle === s ? accent : "#12122a",
                      color: summaryStyle === s ? "#fff" : "#3d3d5c",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {activeTab === "autocomplete" && (
              <input
                value={language}
                onChange={e => setLanguage(e.target.value)}
                placeholder="Language (optional — e.g. JavaScript, Python)"
                style={{ background: "#0e0f1e", border: "1px solid #1e1e38", borderRadius: 9, padding: "8px 12px", color: "#c9d1d9", fontSize: 12, outline: "none" }}
              />
            )}

            {/* Input */}
            <textarea
              value={inputs[activeTab]}
              onChange={e => setInputs(p => ({ ...p, [activeTab]: e.target.value }))}
              placeholder={
                activeTab === "suggest" ? "Paste text to get improvement suggestions…"
                  : activeTab === "summarize" ? "Paste text to summarize…"
                    : activeTab === "explain" ? "Paste concept or text to explain…"
                      : "Paste code or text to autocomplete…"
              }
              rows={5}
              style={{
                background: "#0e0f1e", border: `1px solid #1e1e38`, borderRadius: 10,
                padding: "10px 12px", color: "#c9d1d9", fontSize: 12, outline: "none",
                resize: "vertical", lineHeight: 1.6, fontFamily: activeTab === "autocomplete" ? "monospace" : "inherit",
                minHeight: 100,
              }}
            />

            {/* Run button */}
            <button
              onClick={() => runTab(activeTab)}
              disabled={loading[activeTab] || !inputs[activeTab]?.trim()}
              style={{
                padding: "10px 0", borderRadius: 10, border: "none",
                cursor: loading[activeTab] ? "not-allowed" : "pointer",
                background: loading[activeTab] ? "#1a1b2e" : accent,
                color: "#fff", fontSize: 13, fontWeight: 700, transition: "background 0.15s",
              }}
            >
              {loading[activeTab] ? "Thinking…" : `Run ${currentTab.label}`}
            </button>

            {/* Error */}
            {error[activeTab] && (
              <div style={{ fontSize: 12, color: "#f472b6", background: "#1a0818", padding: "8px 12px", borderRadius: 8 }}>
                {error[activeTab]}
              </div>
            )}

            {/* Result */}
            {results[activeTab] && (
              <div style={{ background: "#0e0f1e", border: `1px solid ${accent}44`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: `1px solid ${accent}22` }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: tagC }}>Result</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => navigator.clipboard.writeText(results[activeTab])}
                      style={{ fontSize: 10, padding: "3px 9px", borderRadius: 6, border: "none", cursor: "pointer", background: tagBg, color: tagC, fontWeight: 600 }}
                    >
                      Copy
                    </button>
                    {onInsert && (
                      <button
                        onClick={() => onInsert(results[activeTab])}
                        style={{ fontSize: 10, padding: "3px 9px", borderRadius: 6, border: "none", cursor: "pointer", background: accent, color: "#fff", fontWeight: 600 }}
                      >
                        Insert →
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ padding: "10px 12px", fontSize: 12, color: "#c9d1d9", lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 200, overflowY: "auto", fontFamily: activeTab === "autocomplete" ? "monospace" : "inherit" }}>
                  {results[activeTab]}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 16px", borderTop: "1px solid #1a1b2e", background: "#0b0c18", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "#3d3d5c" }}>Powered by Gemini 1.5 Flash</span>
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(t => (
            <div
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{ width: 6, height: 6, borderRadius: "50%", background: activeTab === t.key ? t.accent : "#1a1b2e", cursor: "pointer", transition: "background 0.2s" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}