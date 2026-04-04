const router = require('express').Router();
const {GoogleGenerativeAI} = require('@google/generative-ai');
const { collections } = require('../config/firebase');
const { authMiddleware } = require('../middleware/middleware');
const { text } = require('express');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction:`You are an AI assistant embedded in CollabLearn, a real-time collaborative learning platform used by students and educators.
        Your role is to help users with:
        - Improving their documents and notes
        - Understanding complex concepts
        - Writing better code
        - Collaborating effectively

        Be concise, helpful, and educational. Format your responses with markdown when appropriate.`,
})

router.use(authMiddleware);


//call gemini and log interaction
const callGemini = async ({ prompt, type, documentId, userId }) => {
    const result = await model.generateContent(prompt);
    const text = result.response.text();


    //Logging the interaction to FireStore
    if (documentId) {
    collections.aiInteractions.add({
      documentId,
      userId,
      prompt,
      response: text,
      type,
      createdAt: new Date().toISOString(),
    }).catch(() => {});
  }

  return text;
}

// AI suggest 
router.post('/suggest',async(req,res)=>{
    const {text,documentId,context} = req.body;
    if(!text || !documentId) return res.status(400).json({error:'Text and documentId are required'});

    try{
        const prompt = `Provide 3 specific, actionable improvement suggestions for this text. Format as a numbered list with a short title and one-sentence explanation for each:\n\n"${text}"\n\n${context ? `Context: ${context}` : ""}`;
        const result = await callGemini({ prompt, type: "suggestion", documentId, userId: req.user.id });
        res.json({ suggestions: result });
    }catch(error){
        res.status(500).json({ error: "AI request failed", detail: err.message });
    }
})


// AI summarize
router.post('/summarize',async(req,res)=>{
    const {text,documentId,style="bullets"} = req.body;
    if(!text) return res.status(400).json({error:'Text is required'});

    const styleInstructions ={
        bullets:"Summarize in 4-5 concise bullet points.",
        paragraph:"Write 2-3 sentences summary.",
        tldr:"Provide a one-sentence TL;DR summary.",
    }

    try{
        const prompt = `${styleInstructions[style] || styleInstructions.bullets}:\n\n${text}`;
        const result = await callGemini({ prompt, type: "summary", documentId, userId: req.user.id });
        res.json({ summary: result });
    }catch(err){
        res.status(500).json({ error: "AI request failed", detail: err.message });
    }
})


// AI Explain

router.post('/explain',async(req,res)=>{
    const {text,documentId,level="beginner"} = req.body;
    if(!text) return res.status(400).json({error:'Text is required'});

    const levelMap = {
        beginner: "Explain this in simple language for a beginner with no prior knowledge",
        intermediate: "Explain this for someone with basic knowledge of the subject",
        advanced: "Provide a technical, in-depth explanation for an expert",
    }

    try{
        const prompt = `${levelMap[level] || levelMap.beginner}:\n\n"${text}"`;
        const result = await callGemini({ prompt, type: "explanation", documentId, userId: req.user.id });
        res.json({ explanation: result });

    }catch(err){
        res.status(500).json({ error: "AI request failed", detail: err.message });
    }
})

//AI AutoComplete

router.post('/autocomplete',async(req,res)=>{
    const {text,language,documentId} = req.body;
    if(!text) return res.status(400).json({error:'Text is required'});

    try{
        const prompt = language 
        ? `Complete this ${language} code. Return ONLY the completion, no explanation:\n\n${text}`
        : `Continue this text naturally. Return ONLY the continuation, no explanation:\n\n${text}`;
        const result = await callGemini({ prompt, type: "autocomplete", documentId, userId: req.user.id });
        res.json({ completion: result });
    }catch(err){
        res.status(500).json({ error: "AI request failed", detail: err.message });
    }
})

//AI chat 

router.post('/chat',async(req,res)=>{
    const {messages,documentId} = req.body;
    if(!messages?.length) return res.status(400).json({error:'Messages array is required'});

    try{
        const chat = model.startChat({
            history:messages.slice(0,-1).map((m)=>({
                role : m.role === "assistant" ? "model" : "user",
                parts: [{text:m.content}],
            })),
        });

        const lastMessage = messages.at(-1).content;
        const result = await chat.sendMessage(lastMessage);
        const text = result.response.text();

        // Log the interaction
        if (documentId) {
            collections.aiInteractions.add({
                documentId,
                userId: req.user.id,
                prompt: lastMessage,
                response: text,
                type: "chat",
                createdAt: new Date().toISOString(),
            }).catch(() => {});
        }

        res.json({ reply : text });

    }catch(err){
        res.status(500).json({ error: "AI request failed", detail: err.message });
    }
})


// AI History 
// GET /api/v1/ai/docs/:id/ai-history
router.post('/docs/:id/ai-history',async(req,res)=>{
    const snap = await collections.aiInteractions
    .where("documentId","==",req.params.id)
    .orderBy("createdAt","desc")
    .limit(50)
    .get();

    const history = await Promise.all(
        snap.docs.map(async(doc)=>{
            const data = doc.data();
            const userSnap = await collections.users.doc(data.userId).get();
            const userData = userSnap.exists ? userSnap.data() : { name: "Unknown User" };
            return {
                id: doc.id,
                ...data,
                user:{ id: data.userId, name: userData.name || "Unknown" },
            }
        })
    )
    res.json({ history });
})

module.exports = router;