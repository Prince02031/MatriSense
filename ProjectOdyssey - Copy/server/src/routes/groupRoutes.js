const express = require("express");
const router = express.Router();

const authMiddleware   = require("../middleware/authMiddleware");
const checkGroupRole   = require("../middleware/checkGroupRole");
const GroupTripModel   = require("../models/GroupTrip");
const GroupService     = require("../services/groupService");
const User             = require("../models/User");

// All group routes require a valid JWT
router.use(authMiddleware);

// =============================================================================
// CRUD — Group Trips
// =============================================================================

/**
 * POST /api/groups/create
 * Create a new group trip (linked to an existing itinerary).
 */
router.post("/create", async (req, res) => {
  try {
    const group = await GroupService.createGroup(req.user.id, req.body);
    res.status(201).json({ success: true, group });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || "Failed to create group trip." });
  }
});

/**
 * GET /api/groups/discover
 * Browse public, open group trips.
 * Query: ?destination=&activityType=&maxCost=&openOnly=true
 */
router.get("/discover", async (req, res) => {
  try {
    const { destination, activityType, maxCost, openOnly } = req.query;
    const trips = await GroupTripModel.getPublic({
      destination,
      activityType,
      maxCost: maxCost ? parseFloat(maxCost) : undefined,
      openOnly: openOnly !== "false",
    });

    // Enrich with organizer usernames from MongoDB
    const organizerIds = [...new Set(trips.map((t) => t.organizer_id))];
    const organizers = await User.find({ _id: { $in: organizerIds } }, "_id username").lean();
    const organizerMap = Object.fromEntries(organizers.map((u) => [u._id.toString(), u.username]));
    const enrichedTrips = trips.map((t) => ({ ...t, organizer_name: organizerMap[t.organizer_id] || null }));

    res.json({ success: true, trips: enrichedTrips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/groups/mine
 * All groups the authenticated user is part of.
 */
router.get("/mine", async (req, res) => {
  try {
    const trips = await GroupTripModel.getMine(req.user.id);
    res.json({ success: true, trips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/groups/mine/active
 * Returns the user's single active (approved) group trip with its linked itinerary.
 * Used by the planner to load the group itinerary as the active plan.
 */
router.get("/mine/active", async (req, res) => {
  try {
    const activeMembership = await GroupTripModel.getActiveMembership(req.user.id);
    if (!activeMembership || activeMembership.status !== "approved") {
      return res.json({ success: true, group: null, itinerary: null });
    }
    const group = await GroupTripModel.getById(activeMembership.group_trip_id);
    const itinerary = group.itinerary_id
      ? await GroupTripModel.getLinkedItinerary(group.itinerary_id)
      : null;
    res.json({ success: true, group, itinerary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/groups/resolve/:inviteCode
 * Resolve invite code → { groupId, groupTitle }
 * Used by the frontend redirect resolver page.
 */
router.get("/resolve/:inviteCode", async (req, res) => {
  try {
    const result = await GroupService.resolveInviteCode(req.params.inviteCode);
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/groups/:id
 * Get a single group trip.
 * Returns full data for members, limited data for non-members.
 */
router.get("/:id", async (req, res) => {
  try {
    const group = await GroupTripModel.getById(req.params.id);
    const member = await GroupTripModel.getMember(req.params.id, req.user.id);
    const isMember = member && member.status === "approved";

    // Fetch linked itinerary for all group members (bypasses ownership check)
    let itinerary = null;
    if (group.itinerary_id) {
      itinerary = await GroupTripModel.getLinkedItinerary(group.itinerary_id);
    }

    // Fetch organizer name
    const organizerUser = await User.findById(group.organizer_id, "username").lean();
    const organizerName = organizerUser?.username || null;

    if (!isMember) {
      // Public preview only
      const { invite_code, ...publicData } = group; // never expose invite_code to non-members
      const memberCount = await GroupTripModel.countApprovedMembers(req.params.id);
      return res.json({ success: true, group: { ...publicData, organizer_name: organizerName }, memberCount, membership: member || null });
    }

    const members = await GroupTripModel.getMembers(req.params.id);

    // Enrich members with usernames from MongoDB
    const userIds = [...new Set(members.map((m) => m.user_id))];
    const users = await User.find({ _id: { $in: userIds } }, "_id username").lean();
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.username]));
    const enrichedMembers = members.map((m) => ({ ...m, username: userMap[m.user_id] || null }));

    const memberCount = enrichedMembers.filter((m) => m.status === "approved").length;
    res.json({ success: true, group: { ...group, organizer_name: organizerName }, members: enrichedMembers, memberCount, membership: member, itinerary });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

/**
 * PUT /api/groups/:id
 * Update group trip details (organizer only).
 */
router.put("/:id", checkGroupRole(["organizer"]), async (req, res) => {
  try {
    const updated = await GroupTripModel.update(req.params.id, req.body);
    res.json({ success: true, group: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/groups/:id
 * Delete group trip (organizer only). Cascades to all members/expenses/activities.
 */
router.delete("/:id", checkGroupRole(["organizer"]), async (req, res) => {
  try {
    await GroupTripModel.delete(req.params.id);
    res.json({ success: true, message: "Group trip deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// JOIN / LEAVE / INVITE
// =============================================================================

/**
 * POST /api/groups/:id/join
 * Join via Discover page. Respects auto_approve and invite_rejected history.
 */
router.post("/:id/join", async (req, res) => {
  try {
    const partySize = Math.max(1, parseInt(req.body.partySize) || 1);
    const result = await GroupService.joinGroup(req.params.id, req.user.id, partySize);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/groups/:id/join-invite
 * Join via invite link. Always instant approval.
 */
router.post("/:id/join-invite", async (req, res) => {
  try {
    const partySize = Math.max(1, parseInt(req.body.partySize) || 1);
    const member = await GroupService.joinViaInvite(req.params.id, req.user.id, partySize);
    res.status(201).json({ success: true, member, autoApproved: true });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/groups/:id/reject-invite
 * User declines an invitation. Sets status = invite_rejected.
 * TODO: Integrate with a real notification system when it's built.
 */
router.post("/:id/reject-invite", async (req, res) => {
  try {
    const { member, organizerId } = await GroupService.rejectInvite(req.params.id, req.user.id);

    // Notification placeholder — log until notification system is implemented
    console.log(`[NOTIFY] User ${req.user.id} declined invite for group ${req.params.id}. Notify organiser: ${organizerId}`);
    // TODO: insert into notifications table when system is ready

    res.json({ success: true, member, message: "Invitation declined." });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/groups/:id/leave
 * Authenticated user leaves the group.
 */
router.post("/:id/leave", async (req, res) => {
  try {
    await GroupService.leaveGroup(req.params.id, req.user.id);
    res.json({ success: true, message: "You have left the group." });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// =============================================================================
// MEMBER MANAGEMENT (organizer / admin only)
// =============================================================================

/**
 * GET /api/groups/:id/members
 * List all members.
 */
router.get("/:id/members", checkGroupRole(["organizer", "admin", "member"]), async (req, res) => {
  try {
    const members = await GroupTripModel.getMembers(req.params.id);
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/groups/:id/approve/:userId
 * Approve a pending join request.
 */
router.post("/:id/approve/:userId", checkGroupRole(["organizer", "admin"]), async (req, res) => {
  try {
    const member = await GroupService.approveMember(req.params.id, req.params.userId);
    res.json({ success: true, member });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/groups/:id/reject/:userId
 * Reject a pending join request.
 */
router.post("/:id/reject/:userId", checkGroupRole(["organizer", "admin"]), async (req, res) => {
  try {
    const member = await GroupService.rejectMember(req.params.id, req.params.userId);
    res.json({ success: true, member });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * DELETE /api/groups/:id/kick/:userId
 * Remove a member from the group.
 */
router.delete("/:id/kick/:userId", checkGroupRole(["organizer", "admin"]), async (req, res) => {
  try {
    await GroupService.kickMember(req.params.id, req.params.userId);
    res.json({ success: true, message: "Member removed." });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * PUT /api/groups/:id/members/:userId/role
 * Promote/demote a member's role (organizer only).
 * Body: { role: "admin" | "member" }
 */
router.put("/:id/members/:userId/role", checkGroupRole(["organizer"]), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ error: "Role must be 'admin' or 'member'." });
    }
    const member = await GroupTripModel.updateMember(req.params.id, req.params.userId, { role });
    res.json({ success: true, member });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// EXPENSES
// =============================================================================

/**
 * POST /api/groups/:id/expenses
 * Add an expense.
 */
router.post("/:id/expenses", checkGroupRole(["organizer", "admin", "member"]), async (req, res) => {
  try {
    const expense = await GroupTripModel.addExpense(req.params.id, {
      ...req.body,
      paidBy: req.body.paidBy || req.user.id,
    });
    res.status(201).json({ success: true, expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/groups/:id/expenses
 * Get all expenses.
 */
router.get("/:id/expenses", checkGroupRole(["organizer", "admin", "member"]), async (req, res) => {
  try {
    const expenses = await GroupTripModel.getExpenses(req.params.id);
    res.json({ success: true, expenses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/groups/:id/expenses/summary
 * Calculate and return "who owes who" settlement.
 */
router.get("/:id/expenses/summary", checkGroupRole(["organizer", "admin", "member"]), async (req, res) => {
  try {
    const expenses = await GroupTripModel.getExpenses(req.params.id);
    const members  = await GroupTripModel.getMembers(req.params.id, "approved");
    const memberIds = members.map((m) => m.user_id);
    const settlements = GroupService.calculateSettlement(expenses, memberIds);
    res.json({ success: true, settlements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/groups/:id/expenses/:expenseId
 * Edit an expense (only the person who added it or organizer/admin).
 */
router.put("/:id/expenses/:expenseId", checkGroupRole(["organizer", "admin", "member"]), async (req, res) => {
  try {
    const expense = await GroupTripModel.getExpenseById(req.params.expenseId);
    const isOwner = expense.paid_by === req.user.id;
    const canEdit = isOwner || ["organizer", "admin"].includes(req.groupMember.role);

    if (!canEdit) return res.status(403).json({ error: "You can only edit your own expenses." });

    const updated = await GroupTripModel.updateExpense(req.params.expenseId, req.body);
    res.json({ success: true, expense: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/groups/:id/expenses/:expenseId
 * Delete an expense.
 */
router.delete("/:id/expenses/:expenseId", checkGroupRole(["organizer", "admin", "member"]), async (req, res) => {
  try {
    const expense = await GroupTripModel.getExpenseById(req.params.expenseId);
    const isOwner = expense.paid_by === req.user.id;
    const canDelete = isOwner || ["organizer", "admin"].includes(req.groupMember.role);

    if (!canDelete) return res.status(403).json({ error: "You can only delete your own expenses." });

    await GroupTripModel.deleteExpense(req.params.expenseId);
    res.json({ success: true, message: "Expense deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ACTIVITIES (Task Board)
// =============================================================================

/**
 * POST /api/groups/:id/activities
 * Create a task.
 */
router.post("/:id/activities", checkGroupRole(["organizer", "admin", "member"]), async (req, res) => {
  try {
    const activity = await GroupTripModel.addActivity(req.params.id, {
      ...req.body,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/groups/:id/activities
 * Get all tasks.
 */
router.get("/:id/activities", checkGroupRole(["organizer", "admin", "member"]), async (req, res) => {
  try {
    const activities = await GroupTripModel.getActivities(req.params.id);
    res.json({ success: true, activities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/groups/:id/activities/:activityId
 * Update a task (assign, status, etc.).
 */
router.put("/:id/activities/:activityId", checkGroupRole(["organizer", "admin", "member"]), async (req, res) => {
  try {
    const updated = await GroupTripModel.updateActivity(req.params.activityId, req.body);
    res.json({ success: true, activity: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/groups/:id/activities/:activityId
 * Delete a task (organizer/admin or creator).
 */
router.delete("/:id/activities/:activityId", checkGroupRole(["organizer", "admin", "member"]), async (req, res) => {
  try {
    await GroupTripModel.deleteActivity(req.params.activityId);
    res.json({ success: true, message: "Activity deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
