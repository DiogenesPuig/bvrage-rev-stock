import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Collection from './pages/Collection'
import BeverageDetail from './pages/BeverageDetail'
import Locations from './pages/Locations'
import Community from './pages/Community'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"              element={<Home />} />
          <Route path="/login"         element={<Login />} />
          <Route path="/register"      element={<Register />} />
          <Route path="/collection"    element={<ProtectedRoute><Collection /></ProtectedRoute>} />
          <Route path="/beverages/:id" element={<ProtectedRoute><BeverageDetail /></ProtectedRoute>} />
          <Route path="/locations"     element={<ProtectedRoute><Locations /></ProtectedRoute>} />
          <Route path="/community"     element={<ProtectedRoute><Community /></ProtectedRoute>} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
