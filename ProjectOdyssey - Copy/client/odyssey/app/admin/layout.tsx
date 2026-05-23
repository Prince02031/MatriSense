"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin" },
    { name: "Database Control", href: "/admin/db-control" },
    { name: "Manage Cities", href: "/admin/cities" },
    { name: "Manage POIs", href: "/admin/pois" },
    { name: "Wiki Test", href: "/admin/wiki-test" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex-shrink-0">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-wider text-[#F19E39]">Odyssey Admin</h1>
        </div>
        <nav className="mt-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#F19E39] text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
