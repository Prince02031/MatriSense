"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";

const getApiBase = () => {
    if (typeof window !== "undefined") {
        const { hostname, protocol } = window.location;
        if (hostname !== "localhost" && hostname !== "127.0.0.1") {
            return `${protocol}//${hostname}:4000`;
        }
    }
    return "http://localhost:4000";
};

const NavBar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [isProfileHovered, setIsProfileHovered] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userProfileImage, setUserProfileImage] = useState<string>("");
    const [token, setToken] = useState<string>("");

    // Initial Auth Check & Session Extension, Fetch User Profile Image
    React.useEffect(() => {
        const storedToken = localStorage.getItem("token");
        setIsLoggedIn(!!storedToken);
        setToken(storedToken || "");

        // Slide session if logged in and NOT "remember me"
        if (storedToken) {
            const rememberMe = localStorage.getItem("rememberMe") === "true";
            if (!rememberMe) {
                // Extend for 2 hours
                document.cookie = `token=${storedToken}; path=/; max-age=${2 * 60 * 60}; SameSite=Lax`;
            }

            // Fetch user profile image
            const fetchUserProfile = async () => {
                try {
                    const apiBase = getApiBase();
                    const res = await fetch(`${apiBase}/api/user/profile`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    if (res.ok) {
                        const userData = await res.json();
                        if (userData.user?.profileImage) {
                            setUserProfileImage(userData.user.profileImage);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch user profile:", err);
                }
            };

            fetchUserProfile();
        }
    }, [pathname]);

    // Exclude NavBar on Landing Page, Login, and Signup
    if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
        return null;
    }

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("rememberMe");
        document.cookie = "token=; path=/; max-age=0";
        setIsLoggedIn(false);
        router.push("/login");
    };

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsProfileHovered(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsProfileHovered(false);
        }, 200); // Small delay to allow moving mouse to dropdown
    };

    return (
        // Centered, constrained width "pill" style
        <nav className="sticky top-4 z-[1000] mx-auto w-[90%] max-w-[1200px] px-7 py-3.5 mt-5 flex items-center justify-between shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md bg-[#F5EFE6]/30 border border-white/40 rounded-[18px] transition-all duration-300">

            {/* Logo */}
            <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => router.push("/dashboard")}
            >
                <div className="w-7 h-7 flex items-center justify-center">
                    <img
                        src="/Odyssey_Logo.png"
                        alt="Odyssey Logo"
                        className="w-full h-full object-contain"
                    />
                </div>
                <span className="text-xl sm:text-2xl font-medium font-odyssey tracking-wider text-[#111]">
                    Odyssey
                </span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-7">
                {(isLoggedIn ? [
                    { name: "Home", path: "/dashboard" },
                    { name: "Planner", path: "/planner2" },
                    { name: "Trip Mode", path: "/trip" },
                    { name: "Destinations", path: "/destinations" },
                    { name: "Groups", path: "/groups" },
                    { name: "Co-travellers", path: "/feed" },
                ] : [
                    { name: "Home", path: "/" },
                    { name: "Planner", path: "/planner2" },
                    { name: "Destinations", path: "/destinations" },
                ]).map((link) => (
                    <Link
                        key={link.name}
                        href={link.path}
                        className={`text-sm font-medium relative transition-opacity hover:opacity-70 ${isActive(link.path) ? "text-black after:content-[''] after:absolute after:w-full after:h-[2px] after:bg-black after:left-0 after:-bottom-1.5" : "text-[#111]"
                            }`}
                    >
                        {link.name}
                    </Link>
                ))}
            </div>

            {/* Profile & Mobile Toggle */}
            <div className="flex items-center gap-3 relative">
                {/* Notification Bell - Only show when logged in */}
                {isLoggedIn && token && (
                    <NotificationBell token={token} />
                )}

                {/* Auth State Switch */}
                {!isLoggedIn ? (
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="text-sm font-medium text-[#111] hover:opacity-70 transition-opacity"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/signup"
                            className="bg-black text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                        >
                            Sign up
                        </Link>
                    </div>
                ) : (
                    /* Profile Dropdown Container */
                    <div
                        className="relative"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                    <div
                            className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden cursor-pointer border border-white shadow-sm hover:shadow-md transition-shadow"
                            onClick={() => router.push("/profile")}
                        >
                            <img src={userProfileImage || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} alt="User" className="w-full h-full object-cover" />
                        </div>

                        {/* Bridge pseudo-element to bridge gap if needed, but relative positioning usually handles it. Adding padding-top to dropdown container helps too. */}

                        <div
                            className={`absolute right-0 top-full pt-2 w-56 transition-all duration-300 origin-top-right z-50 ${isProfileHovered ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
                                }`}
                        >
                            {/* Actual Dropdown Content */}
                            <div className="bg-[#FFF5E9] rounded-2xl shadow-xl border border-white/50 overflow-hidden p-2">
                                <Link href="/my-destinations" className="block px-4 py-3 text-sm text-gray-800 hover:bg-[#FCE1CC] rounded-xl transition-colors font-medium">
                                    My Destinations
                                </Link>
                                <Link href="/saved-places" className="block px-4 py-3 text-sm text-gray-800 hover:bg-[#FCE1CC] rounded-xl transition-colors font-medium">
                                    Saved Places
                                </Link>
                                <Link href="/admin" className="block px-4 py-3 text-sm text-gray-800 hover:bg-[#FCE1CC] rounded-xl transition-colors font-medium">
                                    [ADMIN] Settings
                                </Link>
                                <div className="h-px bg-gray-200 my-1 mx-2"></div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left block px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default NavBar;
