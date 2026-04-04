import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export default function VerifyEmail() {
  const navigate = useNavigate()

  const uid = localStorage.getItem('uid')

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  const API_URL = import.meta.env.VITE_API_DB_URL

  const handleVerify = async (e) => {
    e.preventDefault()

    if (otp.length !== 6) {
      toast.error('Enter valid 6-digit OTP')
      return
    }

    try {
      setLoading(true)

      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, otp })
      })

      let data
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (res.ok) {
        toast.success('Email verified successfully 🚀')
        setTimeout(() => navigate('/'), 1000)
      } else {
        toast.error(data.error || 'Verification failed')
      }

    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      })

      let data
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (res.ok) {
        toast.success('OTP resent to your email')
      } else {
        toast.error(data.error || 'Failed to resend OTP')
      }
    } catch {
      toast.error('Error resending OTP')
    }
  }

  return (
    <>
      <ToastContainer theme="dark" position="top-right" autoClose={3000} />

      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111827] p-10 rounded-2xl shadow-2xl border border-gray-800">

          <h2 className="text-2xl font-bold text-white text-center mb-4">
            Verify Your Email
          </h2>

          <p className="text-gray-400 text-sm text-center mb-6">
            Enter the 6-digit OTP sent to your email
          </p>

          <form onSubmit={handleVerify} className="space-y-5">

            {/* OTP Input */}
            <input
              type="text"
              maxLength="6"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center tracking-[12px] text-xl bg-[#1f2937] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-purple-500"
              placeholder="••••••"
            />

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

          </form>

          {/* Resend */}
          <div className="text-center mt-6">
            <button
              onClick={handleResend}
              className="text-purple-400 hover:text-purple-300 text-sm transition"
            >
              Resend OTP
            </button>
          </div>

        </div>
      </div>
    </>
  )
}