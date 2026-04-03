const express = require('express');
const router = express.Router();
const jwt = require ('jsonwebtoken');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

const generateTokens = (userId) => ({
  accessToken: jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15m" }),
  refreshToken: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" }),
});

router.post('/register',async(req,res)=>{
    const {name,email,password} = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "name, email and password are required" });
    }

    const userExists = await collections.users.where('email', '==', email).get();
    if (!userExists.empty) {
        return res.status(400).json({ error: "User already exists" });
    }

    const hashPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const userRef = collections.users.doc();
    await userRef.set({
        name,
        email,
        password: hashPassword,
        role:"editor",
        isOnline: false,
        createdAt: new Date()
    })

    const user = { id: userRef.id, name, email };
    const tokens = generateTokens(userRef.id);
    res.status(201).json({ user, ...tokens });
    
})

router.post('/login',async(req,res)=>{
    const {email,password} = req.body;

    try{
        if (!email || !password) {
        return res.status(400).json({ error: "Enter email and password" });
    }
    const userSnapshot = await collections.users.where('email', '==', email).get();
    if (userSnapshot.empty) {
        return res.status(400).json({ error: "Invalid email or password" });
    }

    const userDoc = userSnapshot.docs[0];
    const user = userDoc.data();
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ error: "Invalid email or password" });
    }

    await userDoc.ref.update({ isOnline: true });
    const tokens = generateTokens(userDoc.id);
    res.json({ user: { id: userDoc.id }, ...tokens });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});


router.post('/logout',async(req,res)=>{
    const {userId} = req.body;
    try {
        const userRef = collections.users.doc(userId);
        await userRef.update({ isOnline: false });
        res.json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});


module.exports = router;



