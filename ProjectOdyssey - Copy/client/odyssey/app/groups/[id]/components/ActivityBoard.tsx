"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Activity {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  created_by: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date?: string;
}

interface Member {
  user_id: string;
  username?: string;
}

interface Props {
  groupId: string;
  activities: Activity[];
  members: Member[];
  currentUserId: string;
  currentUserRole: string;
  onRefresh: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  todo:        "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-50 text-blue-700",
  done:        "bg-emerald-50 text-emerald-700",
};

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-gray-500", medium: "bg-yellow-500", high: "bg-red-500"
};

const emptyForm = { title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" };

export default function ActivityBoard({ groupId, activities, members, currentUserId, currentUserRole, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");

  function memberName(uid?: string) {
    if (!uid) return "Unassigned";
    const m = members.find((m) => m.user_id === uid);
    return m?.username || uid.slice(0, 8) + "…";
  }

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) return;
    setSubmitting(true);
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/api/groups/${groupId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title:      form.title,
        description:form.description,
        assignedTo: form.assignedTo || undefined,
        priority:   form.priority,
        dueDate:    form.dueDate || undefined,
      }),
    });
    const data = await res.json();
    if (data.success) { setShowModal(false); setForm(emptyForm); onRefresh(); }
    setSubmitting(false);
  }

  async function cycleStatus(activity: Activity) {
    const next: Record<string, string> = { todo: "in_progress", in_progress: "done", done: "todo" };
    const token = localStorage.getItem("token");
    await fetch(`${API}/api/groups/${groupId}/activities/${activity.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: next[activity.status] }),
    });
    onRefresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this task?")) return;
    const token = localStorage.getItem("token");
    await fetch(`${API}/api/groups/${groupId}/activities/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    onRefresh();
  }

  const filtered = filter === "all" ? activities : activities.filter((a) => a.status === filter);
  const counts = {
    all: activities.length,
    todo: activities.filter((a) => a.status === "todo").length,
    in_progress: activities.filter((a) => a.status === "in_progress").length,
    done: activities.filter((a) => a.status === "done").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 text-xs bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
          {(["all", "todo", "in_progress", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md transition capitalize ${filter === f ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}`}
            >
              {f.replace("_", " ")} <span className="text-gray-400 ml-0.5">({counts[f]})</span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="bg-[#4A9B7F] hover:bg-[#3d8a6d] text-white text-sm px-3 py-2 rounded-lg transition">
          + Task
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No tasks here.</p>
        )}
        {filtered.map((a) => (
          <div key={a.id} className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            {/* Status toggle button */}
            <button
              onClick={() => cycleStatus(a)}
              className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 transition ${
                a.status === "done" ? "bg-emerald-500 border-emerald-500" :
                a.status === "in_progress" ? "border-blue-500" : "border-gray-300"
              }`}
              title="Click to cycle status"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${a.status === "done" ? "line-through text-gray-400" : "text-gray-900"}`}>
                  {a.title}
                </p>
                {/* Priority dot */}
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[a.priority]}`} title={`${a.priority} priority`} />
              </div>
              {a.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{a.description}</p>}
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[a.status]}`}>
                  {a.status.replace("_", " ")}
                </span>
                <span className="text-xs text-gray-600">👤 {memberName(a.assigned_to)}</span>
                {a.due_date && <span className="text-xs text-gray-600">🗓 {new Date(a.due_date).toLocaleDateString()}</span>}
              </div>
            </div>

            {(a.created_by === currentUserId || ["organizer","admin"].includes(currentUserRole)) && (
              <button onClick={() => handleDelete(a.id)} className="text-gray-600 hover:text-red-400 text-xs mt-0.5 shrink-0 transition">✕</button>
            )}
          </div>
        ))}
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">New Task</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-lg">✕</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <input
                type="text" placeholder="Task title *" value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4A9B7F]"
              />
              <input
                type="text" placeholder="Description (optional)" value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4A9B7F]"
              />
              <select
                value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
              >
                <option value="">— Assign to —</option>
                {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.username || m.user_id}</option>)}
              </select>
              <div className="flex gap-3">
                <select
                  value={form.priority} onChange={(e) => set("priority", e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
                >
                  <option value="low">Low priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="high">High priority</option>
                </select>
                <input
                  type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
                />
              </div>
              <button
                type="submit" disabled={submitting || !form.title}
                className="w-full bg-[#4A9B7F] hover:bg-[#3d8a6d] text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create Task"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
