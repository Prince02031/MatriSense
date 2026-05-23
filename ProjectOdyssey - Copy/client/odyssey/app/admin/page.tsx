"use client";

import React, { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    countries: 0,
    cities: 0,
    pois: 0
  });

  useEffect(() => {
    fetch("http://localhost:4000/api/admin/stats")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
            setStats(data.data);
        }
      })
      .catch(err => console.error("Failed to load stats", err));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium uppercase">Total Users</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.users}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium uppercase">Countries</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.countries}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium uppercase">Cities (Districts)</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.cities}</p>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium uppercase">Total POIs</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pois}</p>
        </div>
      </div>
      
      <div className="mt-8 bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome to the Control Center</h2>
        <p className="text-gray-600 mb-6">Use the sidebar to manage database entries or test fetching tools.</p>
        <a 
            href="/admin/db-control" 
            className="inline-block bg-[#F19E39] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#d68b31] transition"
        >
            Go to Database Control
        </a>
      </div>
    </div>
  );
}
