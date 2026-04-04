import React from 'react'
import './App.css'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/login'
import Register from './pages/register'
import VerifyEmail from './components/verifyEmail'
import DocumentEditor from './components/DocumentEditor'
import MembersPage from './pages/MembersPage'
import TasksPage from './pages/TasksPage'
import NotificationsPage from './pages/NotificationsPage'


export default function App() {
  return (
    <>
    <Routes>
      <Route path='/' element={<Home/>} />
      <Route path='/login' element={<Login/>} />
      <Route path='/verify-email' element={<VerifyEmail/>} />
      <Route path='/register' element={<Register/>} />
      <Route path='/editor/:docId' element={<DocumentEditor/>} />
      <Route path='/members' element={<MembersPage/>} />
      <Route path='/tasks' element={<TasksPage/>} />
      <Route path='/notifications' element={<NotificationsPage/>} />
    </Routes>
      
    </>
  )
}
