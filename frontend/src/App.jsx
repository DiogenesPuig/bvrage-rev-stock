import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Collection from './pages/Collection'
import BeverageDetail from './pages/BeverageDetail'
import CatalogDetail from './pages/CatalogDetail'
import Activity from './pages/Activity'

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
          <Route path="/catalog/:id"   element={<ProtectedRoute><CatalogDetail /></ProtectedRoute>} />
          <Route path="/activity"      element={<ProtectedRoute><Activity /></ProtectedRoute>} />
          <Route path="/locations"     element={<Navigate to="/collection" replace />} />
          <Route path="/community"     element={<Navigate to="/" replace />} />
          <Route path="/search"        element={<Navigate to="/" replace />} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
