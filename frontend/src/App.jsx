import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import BillForm from './pages/BillForm'
import BillList from './pages/BillList'
import BillView from './pages/BillView'
import Dashboard from './pages/Dashboard'
import BillGenerator from './components/BillGenerator'
import BillConversion from './components/BillConversion'
import BillEdit from './pages/BillEdit'

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bills" element={<BillList />} />
            <Route path="/bills/new" element={<BillGenerator />} />
            <Route path="/bills/:id" element={<BillView />} />
            <Route path="/bills/:id/convert" element={<BillConversion />} />
            <Route path="/bills/:id/edit" element={<BillEdit />} />
          </Routes>
        </main>
        <Toaster position="top-right" />
      </div>
    </Router>
  )
}

export default App 