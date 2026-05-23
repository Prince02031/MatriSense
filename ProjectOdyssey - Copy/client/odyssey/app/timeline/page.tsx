// app/timeline/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TripTimeline from "@/components/timeline/TripTimeline";

const TimelinePage: React.FC = () => {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const validateSession = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/login");
                return;
            }

            try {
                const res = await fetch("http://localhost:4000/api/user/profile", {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!res.ok) throw new Error("Invalid token");

                const data = await res.json();
                setUser(data.user);
            } catch (err) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                localStorage.removeItem("rememberMe");
                document.cookie = "token=; path=/; max-age=0";
                router.push("/login");
            }
        };

        validateSession();
    }, [router]);

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FFF5E9]">
                Loading Odyssey...
            </div>
        );
    }

    return (
        <div className="bg-[#FFF5E9] min-h-screen font-body">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8">
                {/* Back button */}
                <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-8 group"
                >
                    <svg
                        className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                    <span className="font-medium">Back to Dashboard</span>
                </button>

                {/* Timeline */}
                <TripTimeline />
            </div>

            {/* Footer */}
            <footer className="bg-gray-300 py-6 text-center mt-16">
                <p className="text-gray-800 text-sm">
                    ©Odyssey. Made with <span className="text-red-500">❤️</span> by Route6
                </p>
            </footer>
        </div>
    );
};

export default TimelinePage;
