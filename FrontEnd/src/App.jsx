import React from 'react'
import './App.css'
import { Route, Routes, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/login'
import Register from './pages/register'
import VerifyEmail from './components/verifyEmail'
import DocumentEditor from './components/DocumentEditor'
import MembersPage from './pages/MembersPage'
import TasksPage from './pages/TasksPage'
import NotificationsPage from './pages/NotificationsPage'
import ProtectedRoute from './components/protectedRoute'
import LandingPage from './pages/LandingPage'

export default function App() {
  return (
    <Routes>
      {/* Public routes — accessible without login */}
      <Route path="/login"        element={<Login />} />
      <Route path="/"        element={<LandingPage />} />
      <Route path="/register"     element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Protected routes — redirect to /login if no token */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard"                  element={<Home />} />
        <Route path="/editor/:docId"     element={<DocumentEditor />} />
        <Route path="/members"           element={<MembersPage />} />
        <Route path="/tasks"             element={<TasksPage />} />
        <Route path="/notifications"     element={<NotificationsPage />} />
      </Route>

      {/* Fallback — redirect unknown paths to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}