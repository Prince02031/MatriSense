const supabase = require("../config/supabaseClient");

/**
 * GROUP TRIP MODEL
 * Raw Supabase CRUD for group_trips, group_members, group_expenses, group_activities.
 * Business logic (invite codes, join rules, notifications) lives in groupService.js.
 */

class GroupTripModel {

  // ===========================================================================
  // GROUP TRIPS
  // ===========================================================================

  /**
   * Create a new group trip.
   * @param {object} data - { organizerId, itineraryId, title, description, coverImage,
   *   destinationTags, dateRangeStart, dateRangeEnd, activityType, maxParticipants,
   *   costPerPerson, currency, isPublic, autoApprove, inviteCode }
   */
  static async create(data) {
    const {
      organizerId, itineraryId, title, description, coverImage,
      destinationTags, dateRangeStart, dateRangeEnd, activityType,
      maxParticipants, costPerPerson, currency, isPublic, autoApprove, inviteCode
    } = data;

    const { data: row, error } = await supabase
      .from("group_trips")
      .insert({
        organizer_id:     organizerId,
        itinerary_id:     itineraryId || null,
        title,
        description:      description || null,
        cover_image:      coverImage || null,
        destination_tags: destinationTags || [],
        date_range_start: dateRangeStart || null,
        date_range_end:   dateRangeEnd || null,
        activity_type:    activityType || null,
        max_participants: maxParticipants || 10,
        cost_per_person:  costPerPerson || 0,
        currency:         currency || "BDT",
        is_public:        isPublic !== undefined ? isPublic : true,
        auto_approve:     autoApprove !== undefined ? autoApprove : false,
        invite_code:      inviteCode,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create group trip: ${error.message}`);
    return row;
  }

  /**
   * Get one group trip by ID.
   */
  static async getById(groupId) {
    const { data, error } = await supabase
      .from("group_trips")
      .select("*")
      .eq("id", groupId)
      .single();

    if (error) throw new Error(`Group trip not found: ${error.message}`);
    return data;
  }

  /**
   * Resolve invite code → return the group trip row.
   */
  static async getByInviteCode(inviteCode) {
    const { data, error } = await supabase
      .from("group_trips")
      .select("*")
      .eq("invite_code", inviteCode)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Discover public, open group trips with optional filters.
   * @param {object} filters - { destination, activityType, maxCost, openOnly }
   */
  static async getPublic({ destination, activityType, maxCost, openOnly = true } = {}) {
    let query = supabase
      .from("group_trips")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (openOnly) query = query.eq("status", "open");
    if (activityType) query = query.eq("activity_type", activityType);
    if (maxCost) query = query.lte("cost_per_person", maxCost);
    if (destination) {
      query = query.contains("destination_tags", [destination]);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch public trips: ${error.message}`);
    return data;
  }

  /**
   * Check if user already has an active membership (pending OR approved) in ANY group.
   * Used to enforce one-group-at-a-time rule.
   * Returns the membership row (with group title) or null.
   */
  static async getActiveMembership(userId) {
    const { data, error } = await supabase
      .from("group_members")
      .select("group_trip_id, status, joined_at, group_trips(title)")
      .eq("user_id", userId)
      .eq("status", "approved")          // only fully approved memberships
      .order("joined_at", { ascending: false }) // most recently joined group first
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data; // null if user is not in any active group
  }

  /**
   * Get all group trips a user is part of (any status).
   */
  static async getMine(userId) {
    // Get all membership rows for this user
    const { data: memberships, error: memErr } = await supabase
      .from("group_members")
      .select("group_trip_id, role, status, joined_via, joined_at")
      .eq("user_id", userId)
      .neq("status", "left");

    if (memErr) throw new Error(`Failed to fetch memberships: ${memErr.message}`);
    if (!memberships || memberships.length === 0) return [];

    const groupIds = memberships.map((m) => m.group_trip_id);

    const { data: trips, error: tripErr } = await supabase
      .from("group_trips")
      .select("*")
      .in("id", groupIds)
      .order("created_at", { ascending: false });

    if (tripErr) throw new Error(`Failed to fetch group trips: ${tripErr.message}`);

    // Merge membership info into each trip
    const membershipMap = Object.fromEntries(memberships.map((m) => [m.group_trip_id, m]));
    return trips.map((t) => ({ ...t, membership: membershipMap[t.id] }));
  }

  /**
   * Update group trip fields (organizer only — enforced in route).
   */
  static async update(groupId, updates) {
    const allowed = [
      "title", "description", "cover_image", "destination_tags",
      "date_range_start", "date_range_end", "activity_type",
      "max_participants", "cost_per_person", "currency",
      "is_public", "auto_approve", "status", "itinerary_id"
    ];

    const payload = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) payload[key] = updates[key];
    }
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("group_trips")
      .update(payload)
      .eq("id", groupId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update group trip: ${error.message}`);
    return data;
  }

  /**
   * Fetch the itinerary linked to a group trip.
   * Bypasses the user-ownership check in tripRoutes so any group member can view it.
   */
  static async getLinkedItinerary(itineraryId) {
    const { data, error } = await supabase
      .from("itineraries")
      .select("*")
      .eq("id", itineraryId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Delete a group trip. Cascades to members, expenses, activities.
   */
  static async delete(groupId) {
    const { error } = await supabase
      .from("group_trips")
      .delete()
      .eq("id", groupId);

    if (error) throw new Error(`Failed to delete group trip: ${error.message}`);
    return true;
  }

  // ===========================================================================
  // MEMBERS
  // ===========================================================================

  /**
   * Get all members of a group (with optional status filter).
   */
  static async getMembers(groupId, statusFilter = null) {
    let query = supabase
      .from("group_members")
      .select("*")
      .eq("group_trip_id", groupId)
      .order("joined_at", { ascending: true });

    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch members: ${error.message}`);
    return data;
  }

  /**
   * Get a single member row for a user in a group.
   */
  static async getMember(groupId, userId) {
    const { data, error } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_trip_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch member: ${error.message}`);
    return data; // null if not a member
  }

  /**
   * Add a member row (upsert to handle re-joins after leaving).
   */
  static async addMember(groupId, userId, { role = "member", status = "pending", joinedVia = "discovery", partySize = 1 } = {}) {
    const { data, error } = await supabase
      .from("group_members")
      .upsert(
        {
          group_trip_id: groupId,
          user_id:       userId,
          role,
          status,
          joined_via:    joinedVia,
          party_size:    Math.max(1, parseInt(partySize) || 1),
          joined_at:     new Date().toISOString(),
          updated_at:    new Date().toISOString(),
        },
        { onConflict: "group_trip_id,user_id" }
      )
      .select()
      .single();

    if (error) throw new Error(`Failed to add member: ${error.message}`);
    return data;
  }

  /**
   * Update a member's status or role.
   */
  static async updateMember(groupId, userId, updates) {
    const { data, error } = await supabase
      .from("group_members")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("group_trip_id", groupId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update member: ${error.message}`);
    return data;
  }

  /**
   * Remove a member row entirely (kick).
   */
  static async removeMember(groupId, userId) {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_trip_id", groupId)
      .eq("user_id", userId);

    if (error) throw new Error(`Failed to remove member: ${error.message}`);
    return true;
  }

  /**
   * Count approved members for a group.
   */
  static async countApprovedMembers(groupId) {
    const { data, error } = await supabase
      .from("group_members")
      .select("party_size")
      .eq("group_trip_id", groupId)
      .eq("status", "approved");

    if (error) throw new Error(`Failed to count members: ${error.message}`);
    // Sum party_size so a member row representing 3 people counts as 3
    return (data || []).reduce((sum, m) => sum + (m.party_size || 1), 0);
  }

  // ===========================================================================
  // EXPENSES
  // ===========================================================================

  /**
   * Add an expense.
   */
  static async addExpense(groupId, data) {
    const { paidBy, title, amount, currency, category, splitType, splitAmong, customSplits, receiptUrl, notes, expenseDate } = data;

    const { data: row, error } = await supabase
      .from("group_expenses")
      .insert({
        group_trip_id:  groupId,
        paid_by:        paidBy,
        title,
        amount,
        currency:       currency || "BDT",
        category:       category || "other",
        split_type:     splitType || "equal",
        split_among:    splitAmong || [],
        custom_splits:  customSplits || {},
        receipt_url:    receiptUrl || null,
        notes:          notes || null,
        expense_date:   expenseDate || new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add expense: ${error.message}`);
    return row;
  }

  /**
   * Get all expenses for a group.
   */
  static async getExpenses(groupId) {
    const { data, error } = await supabase
      .from("group_expenses")
      .select("*")
      .eq("group_trip_id", groupId)
      .order("expense_date", { ascending: false });

    if (error) throw new Error(`Failed to fetch expenses: ${error.message}`);
    return data;
  }

  /**
   * Get a single expense.
   */
  static async getExpenseById(expenseId) {
    const { data, error } = await supabase
      .from("group_expenses")
      .select("*")
      .eq("id", expenseId)
      .single();

    if (error) throw new Error(`Expense not found: ${error.message}`);
    return data;
  }

  /**
   * Update an expense.
   */
  static async updateExpense(expenseId, updates) {
    const { data, error } = await supabase
      .from("group_expenses")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", expenseId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update expense: ${error.message}`);
    return data;
  }

  /**
   * Delete an expense.
   */
  static async deleteExpense(expenseId) {
    const { error } = await supabase
      .from("group_expenses")
      .delete()
      .eq("id", expenseId);

    if (error) throw new Error(`Failed to delete expense: ${error.message}`);
    return true;
  }

  // ===========================================================================
  // ACTIVITIES (Task Board)
  // ===========================================================================

  /**
   * Create a task.
   */
  static async addActivity(groupId, data) {
    const { title, description, assignedTo, createdBy, status, priority, dueDate } = data;

    const { data: row, error } = await supabase
      .from("group_activities")
      .insert({
        group_trip_id: groupId,
        title,
        description:   description || null,
        assigned_to:   assignedTo || null,
        created_by:    createdBy,
        status:        status || "todo",
        priority:      priority || "medium",
        due_date:      dueDate || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create activity: ${error.message}`);
    return row;
  }

  /**
   * Get all activities for a group.
   */
  static async getActivities(groupId) {
    const { data, error } = await supabase
      .from("group_activities")
      .select("*")
      .eq("group_trip_id", groupId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to fetch activities: ${error.message}`);
    return data;
  }

  /**
   * Update an activity (assign, change status, etc.).
   */
  static async updateActivity(activityId, updates) {
    const { data, error } = await supabase
      .from("group_activities")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", activityId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update activity: ${error.message}`);
    return data;
  }

  /**
   * Delete an activity.
   */
  static async deleteActivity(activityId) {
    const { error } = await supabase
      .from("group_activities")
      .delete()
      .eq("id", activityId);

    if (error) throw new Error(`Failed to delete activity: ${error.message}`);
    return true;
  }
}

module.exports = GroupTripModel;
