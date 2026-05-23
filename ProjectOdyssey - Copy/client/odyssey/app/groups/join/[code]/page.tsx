"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function InviteResolverPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    const token = localStorage.getItem("token");
    if (!token) {
      // Not logged in — send them to login, then come back
      router.replace(`/login?redirect=/groups/join/${code}`);
      return;
    }

    fetch(`${API}/api/groups/resolve/${code}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Redirect to the Group Dashboard with invite context
          router.replace(`/groups/${data.groupId}?via=invite&code=${code}`);
        } else {
          setError(data.error || "This invite link is no longer valid.");
        }
      })
      .catch(() => setError("Something went wrong. Please try again."));
  }, [code, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF5E9]">
        <div className="text-center max-w-sm px-6">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invite Link</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <a
            href="/groups"
            className="inline-block bg-[#4A9B7F] hover:bg-[#3d8a6d] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
          >
            Browse Group Trips
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF5E9]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#4A9B7F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading trip preview…</p>
      </div>
    </div>
  );
}
