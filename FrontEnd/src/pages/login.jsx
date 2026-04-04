import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Logo from '../assets/inksync_logo.svg'
import { Lock, Mail } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const API_URL = import.meta.env.VITE_API_DB_URL
  console.log('API URL:', API_URL)

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!API_URL) {
      toast.error('API URL not configured')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      let data
      try {
        data = await response.json()
      } catch {
        data = {}
      }

      if (response.ok) {
        toast.success('Login successful!')
        navigate('/')
      } else {
        toast.error(data.message || 'Invalid credentials')
      }
    } catch (error) {
      toast.error('Server not reachable')
    }

    setLoading(false)
  }

  return (
    <>
      <ToastContainer theme="dark" position="top-right" autoClose={3000} />

      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="w-full max-w-5xl grid md:grid-cols-2 bg-[#111827] rounded-2xl overflow-hidden shadow-2xl border border-gray-800">

          {/* Left Side */}
          <div className="p-12 flex flex-col justify-center bg-linear-to-br from-purple-300/40 to-black">
            <img src={Logo} alt="Logo" className="w-30 h-auto mb-8" />

            <h1 className="text-3xl font-bold text-white mb-2">
              InkSync
            </h1>
            <p className="text-gray-400">
              Real-time collaborative learning platform
            </p>
          </div>

          {/* Right Side */}
          <div className="p-12 flex flex-col justify-center">
            <form onSubmit={handleLogin}>
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Welcome Back
              </h2>

              <div className="space-y-5">

                {/* Email */}
                <div className="flex items-center bg-[#1f2937] border border-gray-700 rounded-xl px-4 focus-within:border-purple-500">
                  <Mail className="text-gray-400 w-5 h-5 mr-2" />
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent w-full text-white p-3 outline-none placeholder:text-gray-500"
                  />
                </div>

                {/* Password */}
                <div className="flex items-center bg-[#1f2937] border border-gray-700 rounded-xl px-4 focus-within:border-purple-500">
                  <Lock className="text-gray-400 w-5 h-5 mr-2" />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-transparent w-full text-white p-3 outline-none placeholder:text-gray-500"
                  />
                </div>

                {/* Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>

              </div>
            </form>
            <span className='text-gray-300 text-sm my-3'>
              Don't have an account?{" "}
              <a href="/register" className="text-purple-500 hover:underline">
                Sign up
              </a>
            </span>
          </div>

        </div>
      </div>
    </>
  )
}