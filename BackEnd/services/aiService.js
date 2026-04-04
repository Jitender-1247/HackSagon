const router = require('express').Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { collections } = require('../config/firebase');
const { authenticate } = require('../middleware/middleware');

// BUG 1 FIX: guard against missing GEMINI_API_KEY — fail fast with a clear message
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-3-flash-preview',
  systemInstruction: `You are an AI assistant embedded in CollabLearn, a real-time collaborative learning platform used by students and educators.
Your role is to help users with:
- Improving their documents and notes
- Understanding complex concepts
- Writing better code
- Collaborating effectively

Be concise, helpful, and educational. Format your responses with markdown when appropriate.`,
});

router.use(authenticate);

// Helper: call Gemini and log interaction to Firestore
const callGemini = async ({ prompt, type, documentId, userId }) => {
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  if (documentId) {
    collections.aiInteractions.add({
      documentId,
      userId,
      prompt,
      response: text,
      type,
      createdAt: new Date().toISOString(),
    }).catch((err) => console.error('[Firestore log error]', err.message));
  }

  return text;
};

// ── POST /suggest ─────────────────────────────────────────────────────────────
router.post('/suggest', async (req, res) => {
  const { text, documentId, context } = req.body;

  // BUG 2 FIX: removed documentId as required — it is optional across all routes.
  // The original code required it here but not in any other route, which caused
  // the frontend to get a 400 whenever documentId wasn't passed.
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const prompt = `Provide 3 specific, actionable improvement suggestions for this text. Format as a numbered list with a short title and one-sentence explanation for each:\n\n"${text}"\n\n${context ? `Context: ${context}` : ''}`;
    const result = await callGemini({ prompt, type: 'suggestion', documentId, userId: req.user.id });
    res.json({ suggestions: result });
  } catch (err) {
    console.error('[AI /suggest]', err);
    res.status(500).json({ error: 'AI request failed', detail: err.message });
  }
});

// ── POST /summarize ───────────────────────────────────────────────────────────
router.post('/summarize', async (req, res) => {
  const { text, documentId, style = 'bullets' } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const styleInstructions = {
    bullets:   'Summarize in 4-5 concise bullet points.',
    paragraph: 'Write a 2-3 sentence summary.',
    tldr:      'Provide a one-sentence TL;DR summary.',
  };

  if (!styleInstructions[style])
    return res.status(400).json({ error: `Invalid style. Must be one of: ${Object.keys(styleInstructions).join(', ')}` });

  try {
    const prompt = `${styleInstructions[style]}:\n\n${text}`;
    const result = await callGemini({ prompt, type: 'summary', documentId, userId: req.user.id });
    res.json({ summary: result });
  } catch (err) {
    console.error('[AI /summarize]', err);
    res.status(500).json({ error: 'AI request failed', detail: err.message });
  }
});

// ── POST /explain ─────────────────────────────────────────────────────────────
router.post('/explain', async (req, res) => {
  const { text, documentId, level = 'beginner' } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const levelMap = {
    beginner:     'Explain this in simple language for a beginner with no prior knowledge',
    intermediate: 'Explain this for someone with basic knowledge of the subject',
    advanced:     'Provide a technical, in-depth explanation for an expert',
  };

  if (!levelMap[level])
    return res.status(400).json({ error: `Invalid level. Must be one of: ${Object.keys(levelMap).join(', ')}` });

  try {
    const prompt = `${levelMap[level]}:\n\n"${text}"`;
    const result = await callGemini({ prompt, type: 'explanation', documentId, userId: req.user.id });
    res.json({ explanation: result });
  } catch (err) {
    console.error('[AI /explain]', err);
    res.status(500).json({ error: 'AI request failed', detail: err.message });
  }
});

// ── POST /autocomplete ────────────────────────────────────────────────────────
router.post('/autocomplete', async (req, res) => {
  const { text, language, documentId } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const prompt = language
      ? `Complete this ${language} code. Return ONLY the completion, no explanation:\n\n${text}`
      : `Continue this text naturally. Return ONLY the continuation, no explanation:\n\n${text}`;
    const result = await callGemini({ prompt, type: 'autocomplete', documentId, userId: req.user.id });
    res.json({ completion: result });
  } catch (err) {
    console.error('[AI /autocomplete]', err);
    res.status(500).json({ error: 'AI request failed', detail: err.message });
  }
});

// ── POST /chat ────────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { messages, documentId } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages array is required' });

  try {
    // BUG 3 FIX: Gemini requires history to alternate user/model and must START
    // with a user turn. The original code passed the raw history directly which
    // caused Gemini to throw when the first message was from 'assistant'/'model'
    // (e.g. the greeting message seeded in the frontend chat state).
    const rawHistory = messages.slice(0, -1).map((m) => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Drop leading model turns — Gemini rejects history that starts with 'model'
    while (rawHistory.length && rawHistory[0].role === 'model') {
      rawHistory.shift();
    }

    const chat = model.startChat({ history: rawHistory });
    const lastMessage = messages.at(-1).content;
    const result = await chat.sendMessage(lastMessage);
    const text = result.response.text();

    if (documentId) {
      collections.aiInteractions.add({
        documentId,
        userId:    req.user.id,
        prompt:    lastMessage,
        response:  text,
        type:      'chat',
        createdAt: new Date().toISOString(),
      }).catch((err) => console.error('[Firestore log error]', err.message));
    }

    res.json({ reply: text });
  } catch (err) {
    console.error('[AI /chat]', err);
    res.status(500).json({ error: 'AI request failed', detail: err.message });
  }
});

// ── GET /docs/:id/ai-history ──────────────────────────────────────────────────
router.get('/docs/:id/ai-history', async (req, res) => {
  try {
    // BUG 4 FIX: Firestore requires a composite index for .where() + .orderBy()
    // on different fields. If this throws "requires an index", open the link
    // printed in the server console to create the index in Firebase Console.
    const snap = await collections.aiInteractions
      .where('documentId', '==', req.params.id)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const history = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        const userSnap = await collections.users.doc(data.userId).get();
        const userData = userSnap.exists ? userSnap.data() : {};
        return {
          id: doc.id,
          ...data,
          user: { id: data.userId, name: userData.name || 'Unknown' },
        };
      })
    );

    res.json({ history });
  } catch (err) {
    console.error('[AI /ai-history]', err);
    res.status(500).json({ error: 'Failed to fetch AI history', detail: err.message });
  }
});

module.exports = router;