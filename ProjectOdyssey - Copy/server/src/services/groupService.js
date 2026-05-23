const { nanoid } = require("nanoid");
const GroupTripModel = require("../models/GroupTrip");

/**
 * GROUP SERVICE
 * All business logic for group trips.
 * Routes call this service; this service calls GroupTripModel for DB access.
 */

// ===========================================================================
// INVITE CODE
// ===========================================================================

/**
 * Generate a unique 8-character invite code.
 */
function generateInviteCode() {
  return nanoid(8);
}

// ===========================================================================
// CREATE
// ===========================================================================

/**
 * Create a group trip and auto-add the organizer as an approved member.
 */
async function createGroup(organizerId, body) {
  const {
    itineraryId, title, description, coverImage,
    destinationTags, dateRangeStart, dateRangeEnd, activityType,
    maxParticipants, costPerPerson, currency, isPublic, autoApprove
  } = body;

  if (!title || title.trim().length === 0) {
    throw { status: 400, message: "Title is required." };
  }

  const inviteCode = generateInviteCode();

  const group = await GroupTripModel.create({
    organizerId, itineraryId, title: title.trim(), description, coverImage,
    destinationTags, dateRangeStart, dateRangeEnd, activityType,
    maxParticipants, costPerPerson, currency, isPublic, autoApprove, inviteCode
  });

  // Auto-add organizer as approved member with organizer role
  await GroupTripModel.addMember(group.id, organizerId, {
    role: "organizer",
    status: "approved",
    joinedVia: "discovery",
  });

  return group;
}

// ===========================================================================
// JOIN — via Discover page
// ===========================================================================

/**
 * User joins a group trip from the Discover page.
 * Rules:
 *  - If user previously rejected invite (invite_rejected) → always pending
 *  - If group is full → reject
 *  - If auto_approve ON → instant approval
 *  - Otherwise → pending
 */
async function joinGroup(groupId, userId, partySize = 1) {
  const size = Math.max(1, parseInt(partySize) || 1);
  const group = await GroupTripModel.getById(groupId);

  if (!group) throw { status: 404, message: "Group trip not found." };
  if (group.status !== "open") throw { status: 400, message: "This group trip is not accepting new members." };

  const existing = await GroupTripModel.getMember(groupId, userId);

  if (existing) {
    if (existing.status === "approved") throw { status: 400, message: "You are already a member." };
    if (existing.status === "pending") throw { status: 400, message: "Your join request is already pending." };
    if (existing.status === "rejected") throw { status: 403, message: "Your join request was rejected by the organiser." };
  }

  // One-group-at-a-time rule: block if user is already in a different group
  const activeMembership = await GroupTripModel.getActiveMembership(userId);
  if (activeMembership && activeMembership.group_trip_id !== groupId) {
    const tripTitle = activeMembership.group_trips?.title || "another trip";
    throw {
      status: 400,
      message: `You are already part of "${tripTitle}". Leave that trip first before joining a new one.`,
    };
  }

  // Check capacity including the full party size
  const count = await GroupTripModel.countApprovedMembers(groupId);
  const spotsLeft = group.max_participants - count;
  if (spotsLeft <= 0) throw { status: 400, message: "This group trip is full." };
  if (size > spotsLeft) throw { status: 400, message: `Only ${spotsLeft} spot(s) left — not enough for a party of ${size}.` };

  // If user previously rejected an invite, force pending regardless of auto_approve
  const forcesPending = existing && existing.status === "invite_rejected";
  const status = (!forcesPending && group.auto_approve) ? "approved" : "pending";

  const member = await GroupTripModel.addMember(groupId, userId, {
    role: "member",
    status,
    joinedVia: "discovery",
    partySize: size,
  });

  // Update group status to full if needed
  if (status === "approved") {
    const newCount = count + size;
    if (newCount >= group.max_participants) {
      await GroupTripModel.update(groupId, { status: "full" });
    }
  }

  return { member, autoApproved: status === "approved" };
}

// ===========================================================================
// JOIN — via Invite Link (always instant)
// ===========================================================================

/**
 * User joins via invite link. Always approved instantly.
 */
async function joinViaInvite(groupId, userId, partySize = 1) {
  const size = Math.max(1, parseInt(partySize) || 1);
  const group = await GroupTripModel.getById(groupId);
  if (!group) throw { status: 404, message: "Group trip not found." };
  if (group.status !== "open" && group.status !== "full") {
    throw { status: 400, message: "This group trip is no longer accepting members." };
  }

  const existing = await GroupTripModel.getMember(groupId, userId);
  if (existing && existing.status === "approved") {
    throw { status: 400, message: "You are already a member." };
  }

  // One-group-at-a-time rule
  const activeMembership = await GroupTripModel.getActiveMembership(userId);
  if (activeMembership && activeMembership.group_trip_id !== groupId) {
    const tripTitle = activeMembership.group_trips?.title || "another trip";
    throw {
      status: 400,
      message: `You are already part of "${tripTitle}". Leave that trip first before joining a new one.`,
    };
  }

  const count = await GroupTripModel.countApprovedMembers(groupId);
  const spotsLeft = group.max_participants - count;
  if (spotsLeft <= 0) throw { status: 400, message: "This group trip is full." };
  if (size > spotsLeft) throw { status: 400, message: `Only ${spotsLeft} spot(s) left — not enough for a party of ${size}.` };

  const member = await GroupTripModel.addMember(groupId, userId, {
    role: "member",
    status: "approved",        // Always instant for invite link
    joinedVia: "invite_link",
    partySize: size,
  });

  const newCount = count + size;
  if (newCount >= group.max_participants) {
    await GroupTripModel.update(groupId, { status: "full" });
  }

  return member;
}

// ===========================================================================
// REJECT INVITE (user declines invitation)
// ===========================================================================

/**
 * User explicitly rejects an invitation.
 * Sets status to invite_rejected.
 * Returns { member, organizerId } so the route can send a notification.
 */
async function rejectInvite(groupId, userId) {
  const group = await GroupTripModel.getById(groupId);
  if (!group) throw { status: 404, message: "Group trip not found." };

  const existing = await GroupTripModel.getMember(groupId, userId);
  if (existing && existing.status === "approved") {
    throw { status: 400, message: "You are already a member of this trip." };
  }

  // Upsert an invite_rejected row (may not have a row yet if arriving fresh from link)
  const member = await GroupTripModel.addMember(groupId, userId, {
    role: "member",
    status: "invite_rejected",
    joinedVia: "invite_link",
  });

  return { member, organizerId: group.organizer_id };
}

// ===========================================================================
// ORGANIZER ACTIONS: APPROVE / REJECT MEMBER
// ===========================================================================

async function approveMember(groupId, targetUserId) {
  const group = await GroupTripModel.getById(groupId);
  const count = await GroupTripModel.countApprovedMembers(groupId);
  if (count >= group.max_participants) throw { status: 400, message: "Group is already full." };

  // Get the pending member's party_size before approving
  const pending = await GroupTripModel.getMember(groupId, targetUserId);
  const partySize = pending?.party_size || 1;
  if (count + partySize > group.max_participants) {
    throw { status: 400, message: `Only ${group.max_participants - count} spot(s) left, but this request is for a party of ${partySize}.` };
  }

  const member = await GroupTripModel.updateMember(groupId, targetUserId, { status: "approved" });

  const newCount = count + partySize;
  if (newCount >= group.max_participants) {
    await GroupTripModel.update(groupId, { status: "full" });
  }

  return member;
}

async function rejectMember(groupId, targetUserId) {
  return GroupTripModel.updateMember(groupId, targetUserId, { status: "rejected" });
}

// ===========================================================================
// LEAVE / KICK
// ===========================================================================

async function leaveGroup(groupId, userId) {
  const existing = await GroupTripModel.getMember(groupId, userId);
  if (!existing) throw { status: 404, message: "You are not a member of this group." };
  if (existing.role === "organizer") throw { status: 400, message: "Organiser cannot leave. Transfer ownership or delete the trip." };

  await GroupTripModel.updateMember(groupId, userId, { status: "left" });

  // If the group was full, check if it should reopen now that a member left
  const group = await GroupTripModel.getById(groupId);
  if (group && group.status === "full") {
    const newCount = await GroupTripModel.countApprovedMembers(groupId);
    if (newCount < group.max_participants) {
      await GroupTripModel.update(groupId, { status: "open" });
    }
  }

  return true;
}

async function kickMember(groupId, targetUserId) {
  const existing = await GroupTripModel.getMember(groupId, targetUserId);
  if (!existing) throw { status: 404, message: "User is not a member of this group." };
  if (existing.role === "organizer") throw { status: 400, message: "Cannot kick the organiser." };

  await GroupTripModel.removeMember(groupId, targetUserId);

  // If the group was full, check if it should reopen now that a member was kicked
  const group = await GroupTripModel.getById(groupId);
  if (group && group.status === "full") {
    const newCount = await GroupTripModel.countApprovedMembers(groupId);
    if (newCount < group.max_participants) {
      await GroupTripModel.update(groupId, { status: "open" });
    }
  }

  return true;
}

// ===========================================================================
// EXPENSE SETTLEMENT (debt simplification)
// ===========================================================================

/**
 * Calculate "who owes who" from the expense list.
 * Returns an array of { from, to, amount } settlement transactions (minimised).
 */
function calculateSettlement(expenses, memberIds) {
  // Net balance per user (positive = owed money, negative = owes money)
  const balances = {};
  for (const uid of memberIds) balances[uid] = 0;

  for (const expense of expenses) {
    const { paid_by, amount, split_type, split_among, custom_splits } = expense;
    const amt = parseFloat(amount);

    if (split_type === "individual") {
      // Only the payer and one payee — skip settlement (already accounted for)
      continue;
    }

    if (split_type === "custom" && custom_splits && Object.keys(custom_splits).length > 0) {
      balances[paid_by] = (balances[paid_by] || 0) + amt;
      for (const [uid, share] of Object.entries(custom_splits)) {
        balances[uid] = (balances[uid] || 0) - parseFloat(share);
      }
    } else {
      // Equal split among split_among list (or all members if empty)
      const participants = (split_among && split_among.length > 0) ? split_among : memberIds;
      const share = amt / participants.length;
      balances[paid_by] = (balances[paid_by] || 0) + amt;
      for (const uid of participants) {
        balances[uid] = (balances[uid] || 0) - share;
      }
    }
  }

  // Minimise transactions using greedy debt simplification
  const creditors = [];
  const debtors = [];
  for (const [uid, bal] of Object.entries(balances)) {
    const rounded = Math.round(bal * 100) / 100;
    if (rounded > 0) creditors.push({ uid, amount: rounded });
    else if (rounded < 0) debtors.push({ uid, amount: -rounded });
  }

  const settlements = [];
  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];
    const settled = Math.min(credit.amount, debt.amount);

    settlements.push({
      from:   debt.uid,
      to:     credit.uid,
      amount: Math.round(settled * 100) / 100,
    });

    credit.amount -= settled;
    debt.amount -= settled;
    if (credit.amount < 0.01) i++;
    if (debt.amount < 0.01) j++;
  }

  return settlements;
}

// ===========================================================================
// RESOLVE INVITE CODE (for redirect resolver page)
// ===========================================================================

async function resolveInviteCode(inviteCode) {
  const group = await GroupTripModel.getByInviteCode(inviteCode);
  if (!group) throw { status: 404, message: "This invite link is no longer valid." };
  return { groupId: group.id, groupTitle: group.title };
}

module.exports = {
  generateInviteCode,
  createGroup,
  joinGroup,
  joinViaInvite,
  rejectInvite,
  approveMember,
  rejectMember,
  leaveGroup,
  kickMember,
  calculateSettlement,
  resolveInviteCode,
};
