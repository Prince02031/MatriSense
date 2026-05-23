"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Save, CheckCircle, XCircle, Loader2, Trash2, Edit3 } from "lucide-react";

// ---- Types ----

interface PlaceCard {
    id: string;
    name: string;
    short_desc: string;
    primary_category: string;
    secondary_category: string;
    macro_category: string;
    address: string;
    latitude: string;
    longitude: string;
    tags: string;
    visit_duration_min: string;
    country_id: string;
    city_id: string;
    source: string;
    verified: boolean;
    google_place_id?: string;
    saveStatus?: "pending" | "saving" | "saved" | "error";
    saveError?: string;
}

interface ChatMessage {
    id: string;
    text: string;
    sender: "user" | "ai";
    cards?: PlaceCard[];
}

// ---- Editable Card Row ----

function PlaceCardRow({
    card,
    index,
    onChange,
    onRemove,
}: {
    card: PlaceCard;
    index: number;
    onChange: (id: string, field: keyof PlaceCard, value: string) => void;
    onRemove: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);

    const statusIcon = () => {
        if (card.saveStatus === "saving") return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
        if (card.saveStatus === "saved") return <CheckCircle className="w-4 h-4 text-green-500" />;
        if (card.saveStatus === "error") return <span title={card.saveError}><XCircle className="w-4 h-4 text-red-500" /></span>;
        return null;
    };

    return (
        <div className={`rounded-xl border transition-all overflow-hidden ${
            card.saveStatus === "saved" ? "border-green-300 bg-green-50" :
            card.saveStatus === "error" ? "border-red-300 bg-red-50" :
            "border-gray-200 bg-white"
        }`}>
            {/* Header row */}
            <div className="flex items-center gap-3 p-3">
                <span className="text-xs font-bold text-gray-400 w-5 text-center shrink-0">{index + 1}</span>
                <input
                    value={card.name}
                    onChange={(e) => onChange(card.id, "name", e.target.value)}
                    className="flex-1 text-sm font-semibold text-gray-900 border-b border-transparent focus:border-[#F19E39] focus:outline-none bg-transparent py-0.5"
                    placeholder="Place name"
                />
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                    {card.primary_category || "—"}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                    {statusIcon()}
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1 text-gray-400 hover:text-[#F19E39] transition-colors rounded-lg hover:bg-orange-50"
                        title="Edit details"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onRemove(card.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        title="Remove"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Expanded edit fields */}
            {expanded && (
                <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3 bg-gray-50/50">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Primary Category</label>
                            <input
                                value={card.primary_category}
                                onChange={(e) => onChange(card.id, "primary_category", e.target.value)}
                                className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F19E39] bg-white"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Macro Category</label>
                            <select
                                value={card.macro_category}
                                onChange={(e) => onChange(card.id, "macro_category", e.target.value)}
                                className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F19E39] bg-white"
                            >
                                <option>Urban</option>
                                <option>Nature</option>
                                <option>History</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Short Description</label>
                        <textarea
                            value={card.short_desc}
                            onChange={(e) => onChange(card.id, "short_desc", e.target.value)}
                            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F19E39] bg-white h-16 resize-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Latitude</label>
                            <input
                                value={card.latitude}
                                onChange={(e) => onChange(card.id, "latitude", e.target.value)}
                                className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F19E39] bg-white"
                                placeholder="e.g. 48.8584"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Longitude</label>
                            <input
                                value={card.longitude}
                                onChange={(e) => onChange(card.id, "longitude", e.target.value)}
                                className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F19E39] bg-white"
                                placeholder="e.g. 2.2945"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Google Place ID (Optional)</label>
                        <input
                            value={card.google_place_id || ""}
                            onChange={(e) => onChange(card.id, "google_place_id", e.target.value)}
                            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F19E39] bg-white font-mono"
                            placeholder="e.g. ChIJ..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tags (comma sep.)</label>
                            <input
                                value={card.tags}
                                onChange={(e) => onChange(card.id, "tags", e.target.value)}
                                className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F19E39] bg-white"
                                placeholder="Family, Outdoor, Cultural"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Visit Duration (min)</label>
                            <input
                                type="number"
                                value={card.visit_duration_min}
                                onChange={(e) => onChange(card.id, "visit_duration_min", e.target.value)}
                                className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F19E39] bg-white"
                            />
                        </div>
                    </div>
                    {card.saveStatus === "error" && (
                        <p className="text-xs text-red-600 font-medium">⚠ {card.saveError}</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ---- Main Component ----

export default function AIImportForm() {
    const [countries, setCountries] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [selectedCountryId, setSelectedCountryId] = useState("");
    const [selectedCityId, setSelectedCityId] = useState("");

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        {
            id: "init",
            sender: "ai",
            text: "👋 Hi! I'm your AI place importer. Select a Country & City above, then describe the places you want to add — e.g. \"List the 5 best museums in Paris\" or \"Add 3 top beaches in Bali\".",
        },
    ]);
    const [chatInput, setChatInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [generateCount, setGenerateCount] = useState(5);

    const [pendingCards, setPendingCards] = useState<PlaceCard[]>([]);
    const [saveStats, setSaveStats] = useState<{ saved: number; total: number; done: boolean } | null>(null);

    const chatBottomRef = useRef<HTMLDivElement>(null);

    // Load countries
    useEffect(() => {
        fetch("http://localhost:4000/api/admin/countries")
            .then((r) => r.json())
            .then((d) => { if (d.success) setCountries(d.data); })
            .catch(console.error);
    }, []);

    // Load cities when country changes
    useEffect(() => {
        setSelectedCityId("");
        if (selectedCountryId) {
            fetch(`http://localhost:4000/api/admin/cities?country_id=${selectedCountryId}`)
                .then((r) => r.json())
                .then((d) => { if (d.success) setCities(d.data); })
                .catch(console.error);
        } else {
            setCities([]);
        }
    }, [selectedCountryId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, loading]);

    // ---- AI Chat ----

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), sender: "user", text: chatInput };
        setChatMessages((prev) => [...prev, userMsg]);
        setChatInput("");
        setLoading(true);
        setSaveStats(null);

        const country = countries.find((c) => c.id === selectedCountryId)?.name || "";
        const city = cities.find((c) => c.id === selectedCityId)?.name || "";

        try {
            const res = await fetch("http://localhost:4000/api/ai/generatePlaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: chatInput,
                    country,
                    city,
                    count: generateCount,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "AI generation failed");
            }

            const rawPlaces: any[] = data.data?.places || [];

            const parsedCards: PlaceCard[] = rawPlaces.map((p: any) => ({
                id: `ai-${Date.now()}-${Math.random()}`,
                name: p.name || "",
                short_desc: p.short_desc || "",
                primary_category: p.primary_category || "",
                secondary_category: p.secondary_category || "",
                macro_category: p.macro_category || "Urban",
                address: p.address || "",
                latitude: p.latitude?.toString() || "",
                longitude: p.longitude?.toString() || "",
                tags: Array.isArray(p.tags) ? p.tags.join(", ") : (p.tags || ""),
                visit_duration_min: (p.visit_duration_min || 60).toString(),
                country_id: selectedCountryId,
                city_id: selectedCityId,
                source: "AI",
                verified: false,
                google_place_id: p.google_place_id || p.place_id || "",
                saveStatus: "pending",
            }));

            const aiText = `✅ Generated ${parsedCards.length} place${parsedCards.length !== 1 ? "s" : ""}! Review and edit them on the right, then click "Save All" to add them to the database.`;
            const aiMsg: ChatMessage = { id: Date.now().toString() + "ai", sender: "ai", text: aiText, cards: parsedCards };
            setChatMessages((prev) => [...prev, aiMsg]);

            if (parsedCards.length > 0) {
                setPendingCards((prev) => [...prev, ...parsedCards]);
            }
        } catch (err: any) {
            setChatMessages((prev) => [
                ...prev,
                { id: "err-" + Date.now(), sender: "ai", text: `❌ ${err.message || "Error connecting to AI. Please try again."}` },
            ]);
        } finally {
            setLoading(false);
        }
    };

    // ---- Edit a card field ----

    const handleCardChange = (id: string, field: keyof PlaceCard, value: string) => {
        setPendingCards((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    };

    const handleRemoveCard = (id: string) => {
        setPendingCards((prev) => prev.filter((c) => c.id !== id));
    };

    // ---- Save all to DB ----

    const handleSaveAll = async () => {
        if (pendingCards.length === 0) return;
        if (!selectedCityId) {
            alert("Please select a City/District before saving so the places are correctly linked.");
            return;
        }

        const token = localStorage.getItem("token");
        let savedCount = 0;
        const total = pendingCards.filter((c) => c.saveStatus !== "saved").length;
        setSaveStats({ saved: 0, total, done: false });

        const updatedCards = [...pendingCards];

        for (let i = 0; i < updatedCards.length; i++) {
            const card = updatedCards[i];
            if (card.saveStatus === "saved") continue;

            // Mark as saving
            updatedCards[i] = { ...card, saveStatus: "saving" };
            setPendingCards([...updatedCards]);

            try {
                const payload = {
                    name: card.name,
                    short_desc: card.short_desc,
                    primary_category: card.primary_category,
                    secondary_category: card.secondary_category,
                    macro_category: card.macro_category,
                    address: card.address,
                    latitude: card.latitude === "" ? null : card.latitude,
                    longitude: card.longitude === "" ? null : card.longitude,
                    tags: card.tags.split(",").map((t) => t.trim()).filter(Boolean),
                    amenities: [],
                    visit_duration_min: parseInt(card.visit_duration_min) || 60,
                    country_id: card.country_id || selectedCountryId,
                    city_id: card.city_id || selectedCityId,
                    source: "AI",
                    verified: false,
                    google_place_id: card.google_place_id ? card.google_place_id.trim() : null,
                };

                const res = await fetch("http://localhost:4000/api/admin/places", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || `HTTP ${res.status}`);
                }

                savedCount++;
                updatedCards[i] = { ...updatedCards[i], saveStatus: "saved" };
            } catch (err: any) {
                updatedCards[i] = { ...updatedCards[i], saveStatus: "error", saveError: err.message };
            }

            setPendingCards([...updatedCards]);
            setSaveStats({ saved: savedCount, total, done: false });
        }

        setSaveStats({ saved: savedCount, total, done: true });
    };

    const handleClearSaved = () => {
        setPendingCards((prev) => prev.filter((c) => c.saveStatus !== "saved"));
        setSaveStats(null);
    };

    const pendingCount = pendingCards.filter((c) => c.saveStatus !== "saved").length;
    const savedCount = pendingCards.filter((c) => c.saveStatus === "saved").length;

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[75vh]">

            {/* ===== LEFT: Chat Panel ===== */}
            <div className="flex flex-col flex-1 min-w-0 bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">

                {/* Location Context Bar */}
                <div className="p-4 bg-white border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#F19E39]" />
                        Location Context (pre-select before asking AI)
                    </p>
                    <div className="flex gap-3">
                        <select
                            value={selectedCountryId}
                            onChange={(e) => setSelectedCountryId(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#F19E39]"
                        >
                            <option value="">Select Country...</option>
                            {countries.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <select
                            value={selectedCityId}
                            onChange={(e) => setSelectedCityId(e.target.value)}
                            disabled={!selectedCountryId}
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#F19E39] disabled:opacity-50"
                        >
                            <option value="">Select City...</option>
                            {cities.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                                    msg.sender === "user"
                                        ? "bg-[#F19E39] text-white rounded-tr-sm"
                                        : "bg-white text-gray-900 rounded-tl-sm border border-gray-100"
                                }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                {msg.cards && msg.cards.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-black/10">
                                        <p className="text-xs font-semibold opacity-70">
                                            ✅ {msg.cards.length} place{msg.cards.length !== 1 ? "s" : ""} added to review queue →
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white rounded-2xl px-4 py-3 rounded-tl-sm border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin text-[#F19E39]" />
                                    AI is thinking...
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatBottomRef} />
                </div>

                {/* Input */}
                <div className="p-3 bg-white border-t border-gray-100 space-y-2">
                    {/* Count selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">Generate:</span>
                        {[3, 5, 8, 10, 15].map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setGenerateCount(n)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                                    generateCount === n
                                        ? "bg-[#F19E39] text-white"
                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                        <span className="text-xs text-gray-400">places per request</span>
                    </div>
                    <form onSubmit={handleSend}>
                        <div className="relative flex items-center bg-gray-50 rounded-full border border-gray-200 focus-within:ring-2 focus-within:ring-[#F19E39] transition-all px-2">
                            <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder='e.g. "Top museums in Tokyo" or "Beach resorts in Bali"'
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-2 outline-none"
                            />
                            <button
                                type="submit"
                                disabled={loading || !chatInput.trim()}
                                className="p-2 bg-[#F19E39] text-white rounded-full hover:bg-[#d98a2e] transition-transform active:scale-95 disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* ===== RIGHT: Review Queue ===== */}
            <div className="flex flex-col w-full lg:w-[420px] bg-white rounded-2xl border border-gray-200 overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#F19E39]" />
                            Review Queue
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {pendingCards.length === 0
                                ? "Ask the AI to generate places"
                                : `${pendingCount} pending · ${savedCount} saved`}
                        </p>
                    </div>

                    {pendingCards.length > 0 && (
                        <div className="flex gap-2">
                            {savedCount > 0 && (
                                <button
                                    onClick={handleClearSaved}
                                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Clear Saved
                                </button>
                            )}
                            <button
                                onClick={handleSaveAll}
                                disabled={pendingCount === 0}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <Save className="w-3.5 h-3.5" />
                                Save All ({pendingCount})
                            </button>
                        </div>
                    )}
                </div>

                {/* Save Stats Banner */}
                {saveStats && saveStats.done && (
                    <div className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-center ${
                        saveStats.saved === saveStats.total
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                        {saveStats.saved === saveStats.total
                            ? `✅ All ${saveStats.saved} places saved successfully!`
                            : `⚠ ${saveStats.saved}/${saveStats.total} places saved — check errors below`}
                    </div>
                )}

                {/* Cards List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {pendingCards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
                            <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
                                <Sparkles className="w-7 h-7 text-[#F19E39]" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-600">No places yet</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Ask the AI on the left to generate place suggestions
                                </p>
                            </div>
                        </div>
                    ) : (
                        pendingCards.map((card, idx) => (
                            <PlaceCardRow
                                key={card.id}
                                card={card}
                                index={idx}
                                onChange={handleCardChange}
                                onRemove={handleRemoveCard}
                            />
                        ))
                    )}
                </div>

                {/* City warning */}
                {!selectedCityId && pendingCards.length > 0 && (
                    <div className="mx-4 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                        ⚠ Select a Country & City above before saving
                    </div>
                )}
            </div>
        </div>
    );
}
