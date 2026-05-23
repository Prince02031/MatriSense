"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Expense {
  id: string;
  paid_by: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  split_type: string;
  expense_date: string;
  notes?: string;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

interface Member {
  user_id: string;
  username?: string;
}

interface Props {
  groupId: string;
  expenses: Expense[];
  settlements: Settlement[];
  members: Member[];
  currentUserId: string;
  currentUserRole: string;
  currency: string;
  onRefresh: () => void;
}

const CATEGORIES = ["food", "transport", "accommodation", "tickets", "other"];
const CATEGORY_EMOJI: Record<string, string> = {
  food: "🍜", transport: "🚌", accommodation: "🏨", tickets: "🎟️", other: "📦"
};

const emptyForm = {
  title: "", amount: "", category: "food", splitType: "equal",
  notes: "", expenseDate: new Date().toISOString().split("T")[0],
};

export default function ExpenseTracker({
  groupId, expenses, settlements, members, currentUserId, currentUserRole, currency, onRefresh
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<"list" | "summary">("list");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function memberName(uid: string) {
    const m = members.find((m) => m.user_id === uid);
    return m?.username || uid.slice(0, 8) + "…";
  }

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.amount) { setError("Title and amount are required."); return; }
    setSubmitting(true);
    setError(null);
    const token = localStorage.getItem("token");

    const res = await fetch(`${API}/api/groups/${groupId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title:       form.title,
        amount:      parseFloat(form.amount),
        category:    form.category,
        splitType:   form.splitType,
        splitAmong:  [],
        notes:       form.notes,
        expenseDate: form.expenseDate,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setShowModal(false);
      setForm(emptyForm);
      onRefresh();
    } else {
      setError(data.error || "Failed to add expense.");
    }
    setSubmitting(false);
  }

  async function handleDelete(expenseId: string) {
    if (!confirm("Delete this expense?")) return;
    const token = localStorage.getItem("token");
    await fetch(`${API}/api/groups/${groupId}/expenses/${expenseId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    onRefresh();
  }

  const totalSpend = expenses.reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">Total: <span className="text-gray-900 font-semibold">{currency} {totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab toggle */}
          <div className="flex bg-white border border-gray-200 rounded-lg p-0.5 text-sm shadow-sm">
            <button onClick={() => setTab("list")} className={`px-3 py-1.5 rounded-md transition ${tab === "list" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}`}>
              Expenses
            </button>
            <button onClick={() => setTab("summary")} className={`px-3 py-1.5 rounded-md transition ${tab === "summary" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}`}>
              Settlement
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#4A9B7F] hover:bg-[#3d8a6d] text-white text-sm px-3 py-2 rounded-lg transition"
          >
            + Add
          </button>
        </div>
      </div>

      {/* List Tab */}
      {tab === "list" && (
        <div className="space-y-2">
          {expenses.length === 0 && (
            <p className="text-center text-gray-400 py-10 text-sm">No expenses yet. Add the first one!</p>
          )}
          {expenses.map((exp) => (
            <div key={exp.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">{CATEGORY_EMOJI[exp.category] || "📦"}</span>
                <div>
                  <p className="text-sm text-gray-900 font-medium">{exp.title}</p>
                  <p className="text-xs text-gray-500">
                    Paid by {memberName(exp.paid_by)} · {new Date(exp.expense_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-gray-900 font-semibold text-sm">{exp.currency} {parseFloat(String(exp.amount)).toLocaleString()}</p>
                {(exp.paid_by === currentUserId || ["organizer","admin"].includes(currentUserRole)) && (
                  <button onClick={() => handleDelete(exp.id)} className="text-gray-600 hover:text-red-400 text-xs transition">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settlement Tab */}
      {tab === "summary" && (
        <div className="space-y-3">
          {settlements.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">Everyone&apos;s even! No outstanding balances.</p>
          ) : (
            settlements.map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                <p className="text-sm text-gray-700">
                  <span className="text-red-600 font-medium">{memberName(s.from)}</span>
                  {" "}owes{" "}
                  <span className="text-emerald-600 font-medium">{memberName(s.to)}</span>
                </p>
                <p className="text-gray-900 font-semibold text-sm">{currency} {s.amount.toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Add Expense</h3>
              <button onClick={() => { setShowModal(false); setError(null); }} className="text-gray-400 hover:text-gray-700 text-lg">✕</button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <input
                type="text" placeholder="What was it for?" value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4A9B7F]"
              />
              <div className="flex gap-3">
                <input
                  type="number" min="0" step="0.01" placeholder="Amount" value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4A9B7F]"
                />
                <select
                  value={form.category} onChange={(e) => set("category", e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{CATEGORY_EMOJI[c]} {c}</option>)}
                </select>
              </div>
              <select
                value={form.splitType} onChange={(e) => set("splitType", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
              >
                <option value="equal">Split equally among all</option>
                <option value="individual">Just me (no split)</option>
              </select>
              <input
                type="date" value={form.expenseDate} onChange={(e) => set("expenseDate", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
              />
              <input
                type="text" placeholder="Notes (optional)" value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4A9B7F]"
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                type="submit" disabled={submitting}
                className="w-full bg-[#4A9B7F] hover:bg-[#3d8a6d] text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {submitting ? "Adding…" : "Add Expense"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
