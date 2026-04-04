import { useState, useRef, useEffect } from "react";

const MODES = [
  { key: "chat", label: "Chat", icon: "💬" },
  { key: "suggest", label: "Suggest", icon: "✨" },
  { key: "summarize", label: "Summarize", icon: "◎" },
  { key: "explain", label: "Explain", icon: "📖" },
];

const mockHistory = [
  {
    role: "user",
    content: "Can you suggest a better structure for the authentication section?",
    time: "2m ago",
  },
  {
    role: "assistant",
    content: `Here's a cleaner structure for the authentication section:\n\n**1. Token Types**\n- Access token (15 min expiry)\n- Refresh token (7 day expiry)\n\n**2. Endpoints**\n\`POST /auth/login\` → returns both tokens\n\`POST /auth/refresh\` → returns new access token\n\`POST /auth/logout\` → invalidates refresh token\n\n**3. Headers**\nAlways pass the access token as \`Authorization: Bearer <token>\``,
    time: "2m ago",
  },
];

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      marginBottom: 16,
    }}>
      {!isUser && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10,
          }}>✦</div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#6366f1" }}>AI Assistant</span>
          <span style={{ fontSize: 10, color: "#475569" }}>{msg.time}</span>
        </div>
      )}
      <div style={{
        maxWidth: "88%",
        background: isUser ? "#1e1e2e" : "#12121c",
        border: isUser ? "1px solid #2d2d3d" : "1px solid #6366f122",
        borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
        padding: "10px 14px",
        fontSize: 13,
        color: "#e2e8f0",
        lineHeight: 1.7,
        whiteSpace: "pre-wrap",
      }}>
        {msg.content}
      </div>
      {isUser && (
        <span style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>{msg.time}</span>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%",
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
      }}>✦</div>
      <div style={{
        background: "#12121c", border: "1px solid #6366f122",
        borderRadius: "12px 12px 12px 4px", padding: "12px 16px",
        display: "flex", gap: 4, alignItems: "center",
      }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%", background: "#6366f1",
            animation: "bounce 1.2s infinite",
            animationDelay: `${delay}s`,
          }} />
        ))}
        <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.8);opacity:0.5}40%{transform:scale(1.1);opacity:1}}`}</style>
      </div>
    </div>
  );
}

export default function Test({ selectedText = "", onClose }) {
  const [mode, setMode] = useState("chat");
  const [messages, setMessages] = useState(mockHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [summary, setSummary] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const callAI = async (prompt) => {
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are an AI assistant embedded in CollabLearn, a collaborative document editing platform. Be concise, helpful, and format your responses using markdown when useful. Focus on helping users with their documents, code, and learning.",
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: prompt },
          ],
        }),
      });
      const data = await res.json();
      return data.content?.[0]?.text || "Sorry, I couldn't generate a response.";
    } catch {
      return "Error connecting to AI service. Please try again.";
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input, time: "now" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    const reply = await callAI(input);
    setMessages(prev => [...prev, { role: "assistant", content: reply, time: "now" }]);
  };

  const handleSuggest = async () => {
    setSuggestion(null);
    setLoading(true);
    const text = selectedText || "the current document content";
    const reply = await callAI(`Give me 3 concise improvement suggestions for this text: "${text}". Format as a numbered list.`);
    setSuggestion(reply);
  };

  const handleSummarize = async () => {
    setSummary(null);
    setLoading(true);
    const reply = await callAI(`Summarize this document content in 3-4 bullet points: "${selectedText || "the document"}"`);
    setSummary(reply);
  };

  const quickPrompts = [
    "Fix grammar and spelling",
    "Make this more concise",
    "Add code examples",
    "Explain this to a beginner",
  ];

  return (
    <div style={{
      width: 340,
      height: "100%",
      background: "#0f0f18",
      borderLeft: "1px solid #1e1e2e",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid #1e1e2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>✦</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>AI Assistant</div>
            <div style={{ fontSize: 10, color: "#10b981" }}>● Online</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#475569",
            cursor: "pointer", fontSize: 16, padding: 4,
          }}>×</button>
        )}
      </div>

      {/* Mode tabs */}
      <div style={{
        display: "flex",
        padding: "10px 12px",
        gap: 4,
        borderBottom: "1px solid #1e1e2e",
      }}>
        {MODES.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)} style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 4, padding: "6px 4px", borderRadius: 7, border: "none",
            cursor: "pointer", fontSize: 11, fontWeight: 500,
            background: mode === m.key ? "#6366f1" : "transparent",
            color: mode === m.key ? "#fff" : "#64748b",
            transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 12 }}>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Selected text context */}
      {selectedText && (
        <div style={{
          margin: "10px 14px",
          background: "#1e1e2e",
          border: "1px solid #6366f133",
          borderRadius: 8,
          padding: "8px 12px",
        }}>
          <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 600, marginBottom: 4 }}>
            SELECTED TEXT
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", lineHeight: 1.5 }}>
            "{selectedText.slice(0, 100)}{selectedText.length > 100 ? "..." : ""}"
          </div>
        </div>
      )}

      {/* CHAT MODE */}
      {mode === "chat" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
            {/* Quick prompts */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, marginBottom: 8, letterSpacing: "0.06em" }}>
                QUICK ACTIONS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {quickPrompts.map(q => (
                  <button key={q} onClick={() => setInput(q)} style={{
                    background: "#1e1e2e", border: "1px solid #2d2d3d",
                    borderRadius: 20, padding: "4px 10px", cursor: "pointer",
                    fontSize: 11, color: "#94a3b8", transition: "all 0.12s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f155"; e.currentTarget.style.color = "#a5b4fc"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#2d2d3d"; e.currentTarget.style.color = "#94a3b8"; }}
                  >{q}</button>
                ))}
              </div>
            </div>

            {/* Messages */}
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid #1e1e2e" }}>
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-end",
              background: "#1e1e2e", border: "1px solid #2d2d3d",
              borderRadius: 10, padding: "8px 10px",
            }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Ask the AI anything..."
                rows={2}
                style={{
                  flex: 1, background: "none", border: "none",
                  color: "#e2e8f0", fontSize: 13, outline: "none",
                  resize: "none", lineHeight: 1.5, fontFamily: "inherit",
                }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{
                  width: 30, height: 30, borderRadius: 7, border: "none",
                  background: input.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#2d2d3d",
                  color: input.trim() ? "#fff" : "#475569",
                  cursor: input.trim() ? "pointer" : "default",
                  fontSize: 14, display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                  transition: "all 0.15s",
                }}>↑</button>
            </div>
            <div style={{ fontSize: 10, color: "#334155", marginTop: 6, textAlign: "center" }}>
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        </>
      )}

      {/* SUGGEST MODE */}
      {mode === "suggest" && (
        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, lineHeight: 1.6 }}>
            Get AI-powered improvement suggestions for your selected text or entire document.
          </p>
          <button onClick={handleSuggest} disabled={loading} style={{
            width: "100%", padding: "10px",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            border: "none", borderRadius: 9, color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16,
          }}>
            {loading ? "Generating..." : "✨ Get Suggestions"}
          </button>
          {suggestion && (
            <div style={{
              background: "#12121c", border: "1px solid #6366f122",
              borderRadius: 10, padding: "14px 16px",
              fontSize: 13, color: "#e2e8f0", lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}>{suggestion}</div>
          )}
          {loading && <TypingIndicator />}
        </div>
      )}

      {/* SUMMARIZE MODE */}
      {mode === "summarize" && (
        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, lineHeight: 1.6 }}>
            Generate a concise summary of your document or selected section.
          </p>
          <button onClick={handleSummarize} disabled={loading} style={{
            width: "100%", padding: "10px",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            border: "none", borderRadius: 9, color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16,
          }}>
            {loading ? "Summarizing..." : "◎ Summarize Document"}
          </button>
          {summary && (
            <div style={{
              background: "#12121c", border: "1px solid #6366f122",
              borderRadius: 10, padding: "14px 16px",
              fontSize: 13, color: "#e2e8f0", lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}>{summary}</div>
          )}
          {loading && <TypingIndicator />}
        </div>
      )}

      {/* EXPLAIN MODE */}
      {mode === "explain" && (
        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, lineHeight: 1.6 }}>
            Select text in the editor then click below to get a plain-English explanation.
          </p>
          <button onClick={async () => {
            setLoading(true);
            const reply = await callAI(`Explain this in simple terms for a student: "${selectedText || "WebSocket real-time collaboration with CRDT conflict resolution"}"`);
            setSuggestion(reply);
          }} disabled={loading} style={{
            width: "100%", padding: "10px",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            border: "none", borderRadius: 9, color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16,
          }}>
            {loading ? "Explaining..." : "📖 Explain Selection"}
          </button>
          {suggestion && (
            <div style={{
              background: "#12121c", border: "1px solid #6366f122",
              borderRadius: 10, padding: "14px 16px",
              fontSize: 13, color: "#e2e8f0", lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}>{suggestion}</div>
          )}
          {loading && <TypingIndicator />}
        </div>
      )}
    </div>
  );
}
