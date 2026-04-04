const express = require('express')
const router = express.Router()
const { db } = require('../config/firebase')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
require('dotenv').config()

const { sendOtpEmail } = require('./emailService')
const { use } = require('react')

const SALT_ROUNDS = 12

const generateOtp = (length = 6) => {
  const min = 10 ** (length - 1)
  const max = 9 * min
  return Math.floor(min + Math.random() * max).toString()
}

// ================= REGISTER =================
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'JWT secret not configured' })
  }

  try {
    const existing = await db.collection('users')
      .where('email', '==', email)
      .get()

    if (!existing.empty) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    const otp = generateOtp()
    const hashedOtp = await bcrypt.hash(otp, 10)
    const expiry = Date.now() + 5 * 60 * 1000

    const userRef = await db.collection('users').add({
      name,
      email,
      password: hashedPassword,
      role: 'editor',
      isOnline: true,
      emailVerified: false,
      emailOtp: hashedOtp,
      otpExpiry: expiry,
      createdAt: new Date().toISOString()
    })

    await sendOtpEmail(email, otp)

    const token = jwt.sign(
      { uid: userRef.id, email , name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'User registered. Please verify your email.',
      token,
      uid: userRef.id,
      name:userRef.name
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ================= LOGIN =================
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  try {
    const snapshot = await db.collection('users')
      .where('email', '==', email)
      .get()

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const userDoc = snapshot.docs[0]
    const user = userDoc.data()

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    await userDoc.ref.update({ isOnline: true });

    const token = jwt.sign(
      { uid: userDoc.id, email , name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      name: user.name,
      token,
      uid: userDoc.id
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ================= VERIFY EMAIL =================
router.post('/verify-email', async (req, res) => {
  const { uid, otp } = req.body

  if (!uid || !otp) {
    return res.status(400).json({ error: 'UID and OTP required' })
  }

  try {
    const userRef = db.collection('users').doc(uid)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userDoc.data()

    if (Date.now() > user.otpExpiry) {
      return res.status(400).json({ error: 'OTP expired' })
    }

    const isOtpValid = await bcrypt.compare(otp, user.emailOtp)

    if (!isOtpValid) {
      return res.status(400).json({ error: 'Invalid OTP' })
    }

    await userRef.update({
      emailVerified: true,
      emailOtp: null,
      otpExpiry: null
    })

    res.json({ message: 'Email verified successfully' })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ================= RESEND OTP =================
router.post('/resend-otp', async (req, res) => {
  const { uid } = req.body

  if (!uid) {
    return res.status(400).json({ error: 'UID required' })
  }

  try {
    const userRef = db.collection('users').doc(uid)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userDoc.data()

    const otp = generateOtp()
    const hashedOtp = await bcrypt.hash(otp, 10)
    const expiry = Date.now() + 5 * 60 * 1000

    await userRef.update({
      emailOtp: hashedOtp,
      otpExpiry: expiry
    })

    await sendOtpEmail(user.email, otp)

    res.json({ message: 'OTP resent successfully' })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ================= LOGOUT =================
router.post('/logout', async (req, res) => {
  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' })
  }

  try {
    const userRef = db.collection('users').doc(userId)
    await userRef.update({ isOnline: false })

    res.json({ message: 'Logged out successfully' })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router