const GroupTripModel = require("../models/GroupTrip");

/**
 * CHECK GROUP ROLE MIDDLEWARE FACTORY
 *
 * Usage in routes:
 *   router.post('/:id/something', checkGroupRole(['organizer', 'admin']), handler);
 *   router.get('/:id/something',  checkGroupRole(['organizer', 'admin', 'member']), handler);
 *
 * Attaches req.groupMember (the caller's member row) for use in route handlers.
 */
function checkGroupRole(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      const groupId = req.params.id;
      const userId  = req.user.id;

      if (!groupId) {
        return res.status(400).json({ error: "Group ID is required." });
      }

      const member = await GroupTripModel.getMember(groupId, userId);

      if (!member || member.status !== "approved") {
        return res.status(403).json({ error: "You are not an approved member of this group." });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        return res.status(403).json({
          error: `This action requires one of these roles: ${allowedRoles.join(", ")}.`,
        });
      }

      req.groupMember = member; // Available to downstream handlers
      next();
    } catch (err) {
      console.error("checkGroupRole error:", err);
      res.status(500).json({ error: "Failed to verify group permissions." });
    }
  };
}

module.exports = checkGroupRole;
