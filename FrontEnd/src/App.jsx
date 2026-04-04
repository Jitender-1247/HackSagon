import React from 'react'
import './App.css'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/login'
import Register from './pages/register'
import VerifyEmail from './components/verifyEmail'
import Test from './pages/Test'


export default function App() {
  return (
    <>
    <Routes>
      <Route path='/' element={<Home/>} />
      <Route path='/login' element={<Login/>} />
      <Route path='/verify-email' element={<VerifyEmail/>} />
      <Route path='/register' element={<Register/>} />
      <Route path='/test' element={<Test/>} />
    </Routes>
      
    </>
  )
}
