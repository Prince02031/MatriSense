"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LoginPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State for mobile menu
  const [loading, setLoading] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // 2. NEW: Check if user is already logged in
  useEffect(() => {
    // Check if we have a token saved
    const token = localStorage.getItem("token");
    if (token) {
      // If yes, redirect immediately to dashboard
      router.push("/dashboard");
      return;
    }

    // Check if redirected from planner (trying to save without login)
    const fromPlanner = searchParams.get("from");
    if (fromPlanner === "planner") {
      setRedirectMessage("Please login or register to save your itinerary and access all features.");
    }
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Store Token and User Data
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("rememberMe", rememberMe ? "true" : "false");

      // Set Cookie for Middleware
      const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 2 * 60 * 60; // 30 days or 2 hours
      document.cookie = `token=${data.token}; path=/; max-age=${maxAge}; SameSite=Lax`;
      localStorage.setItem("userId", data.user.id); // Store userId separately for easy access

      // Redirect
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-4 z-50 px-8 py-4 mx-4 md:mx-16 my-6 bg-[#FFF5E9]/10 backdrop-blur-lg border border-white/30 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              {/* Make sure the image path is correct relative to your public folder */}
              <img src="/Odyssey_Logo.png" alt="Odyssey Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-medium font-odyssey tracking-wider">Odyssey</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">About</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Destinations</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Pricing</a>
            <button className="px-6 py-2 border-2 border-green-500 text-green-700 rounded-full hover:bg-green-50 transition font-medium">
              Sign-in
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/40 transition"
          >
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:hidden mt-6 flex-col gap-4`}>
          <a href="#" className="text-gray-700 font-medium">About</a>
          <a href="#" className="text-gray-700 font-medium">Destinations</a>
          <a href="#" className="text-gray-700 font-medium">Pricing</a>
          <button className="w-full px-6 py-2 border-2 border-green-500 text-green-700 rounded-full hover:bg-green-50 transition font-medium">
            Sign-in
          </button>
        </div>
      </nav>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-gray-900 rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <h2 className="text-white text-2xl font-semibold mb-2">
            Welcome Back Traveller
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Please login with your Odyssey account
          </p>

          {redirectMessage && (
            <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-200 text-sm p-3 rounded-lg mb-4 text-center">
              {redirectMessage}
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm mb-4 text-center">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full px-4 py-3 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Password */}
            <div>
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-3 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Google Sign-in */}
            <button
              type="button"
              className="w-full py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-gray-400 text-sm">Remember me</span>
              </label>
              <a
                href="#"
                className="text-green-500 text-sm hover:text-green-400"
              >
                Forgot Password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="w-full py-3 border-2 border-green-500 text-green-500 rounded-lg"
            >
              Create Account
            </button>
            {/* Problem logging in link */}
            <div className="text-center pt-2">
              <a
                href="#"
                className="text-gray-400 text-sm hover:text-gray-300 underline"
              >
                Problem logging in?
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-300 py-6 text-center">
        <p className="text-gray-800 text-sm">
          ©Odyssey. Made with <span className="text-red-500">❤️</span> by Route6
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
