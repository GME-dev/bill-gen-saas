import React from 'react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Bills</h2>
          <p className="text-gray-600 mb-4">Create and manage your bills</p>
          <Link
            to="/bills"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            View Bills
          </Link>
        </div>
        
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">New Bill</h2>
          <p className="text-gray-600 mb-4">Create a new bill</p>
          <Link
            to="/bills/new"
            className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Create Bill
          </Link>
        </div>
        
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Settings</h2>
          <p className="text-gray-600 mb-4">Configure your billing settings</p>
          <Link
            to="/settings"
            className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            View Settings
          </Link>
        </div>
      </div>
    </div>
  )
} 