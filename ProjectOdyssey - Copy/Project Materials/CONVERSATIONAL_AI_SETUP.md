# Conversational AI Implementation - Setup Guide

## Overview
The AI chatbot now has full conversational capabilities with context retention per user. This means the AI remembers previous conversations and can reference them naturally.

## What Was Implemented

### 1. Database Layer (Supabase)
**File**: `server/sql/chat_history_schema.sql`

- Created `chat_history` table to store all conversations
- Columns:
  - `id`: UUID primary key
  - `user_id`: VARCHAR - links to authenticated user
  - `message`: TEXT - the actual message content
  - `role`: VARCHAR - either 'user' or 'ai'
  - `session_id`: VARCHAR (optional) - for grouping conversations
  - `metadata`: JSONB - stores cards, bullets, and other data
  - `created_at`: TIMESTAMP - message timestamp

- Indexes for performance:
  - `idx_chat_history_user_id` - fast user lookups
  - `idx_chat_history_created_at` - chronological sorting
  - `idx_chat_history_session_id` - session filtering

- Row Level Security (RLS) policies:
  - Users can only see their own messages
  - Users can only insert their own messages
  - Users can only delete their own messages

**ACTION REQUIRED**: Execute this SQL in Supabase SQL Editor:
```bash
# Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
# Copy and paste the contents of server/sql/chat_history_schema.sql
# Click "Run" to execute
```

### 2. Backend Model
**File**: `server/src/models/ChatHistory.js`

Functions implemented:
- `saveMessage(userId, message, role, sessionId, metadata)` - Save a chat message
- `getUserHistory(userId, limit, sessionId)` - Get full conversation history
- `getConversationContext(userId, contextLimit=10)` - Get recent messages for AI context
- `clearHistory(userId, sessionId)` - Delete conversation history
- `getMessageCount(userId)` - Get total message count

### 3. API Routes
**File**: `server/src/routes/chatHistory.routes.js`

Endpoints created:
- `GET /api/chat/history?limit=50&sessionId=x` - Fetch user's chat history
- `POST /api/chat/message` - Save a chat message
- `DELETE /api/chat/history?sessionId=x` - Clear chat history
- `GET /api/chat/stats` - Get message count statistics

All routes are protected with `authMiddleware` - requires JWT token.

**Status**: ✅ Already registered in server.js at `/api/chat`

### 4. AI Chat Endpoint Modification
**File**: `server/src/routes/ai.routes.js`

Changes made:
- Added `authMiddleware` to POST /chat endpoint for authentication
- Fetch last 10 messages using `ChatHistory.getConversationContext(userId, 10)`
- Include `conversationHistory` in all payloads sent to Gemini
- Save user messages to database before processing
- Save AI responses to database after generation

**Context Window**: Last 10 messages (configurable)

### 5. AI System Prompts Updated
**Files**: 
- `server/src/services/ai/prompts/itinerary.prompt.js`
- `server/src/services/ai/prompts/search.prompt.js`

Both prompts now include instructions to:
- Use conversation history when provided
- Reference previous discussions naturally
- Remember user preferences mentioned earlier
- Provide continuity across conversations

### 6. Frontend Integration
**File**: `client/odyssey/app/planner/page.tsx`

Changes made:
- Load chat history on component mount
- Show loading indicator while fetching history
- Save user messages to database immediately after sending
- Save AI clustering messages to database
- Display persisted conversation history
- Handle authentication token for all chat API calls

**Features**:
- Chat history loads automatically on page load
- Previous conversations visible immediately
- Seamless continuation across browser sessions
- Support for cards and bullets in message metadata

## How It Works

### Conversation Flow:

1. **User Opens Planner**
   - Frontend fetches chat history: `GET /api/chat/history`
   - Displays previous messages with cards and bullets
   - Shows "Hello! Where are we going?" if no history

2. **User Sends Message**
   - Message saved to database: `POST /api/chat/message`
   - Message sent to AI: `POST /api/ai/chat`
   - Backend fetches last 10 messages for context
   - Context included in Gemini API call

3. **AI Generates Response**
   - Gemini receives conversation history in payload
   - AI references previous messages naturally
   - Response saved to database automatically
   - Frontend displays response with cards/bullets

4. **Context Retention**
   - Each subsequent message includes previous context
   - AI can reference: "Earlier you mentioned beaches..."
   - User preferences remembered across sessions
   - Context window: 10 most recent messages

### Example Conversation:

```
User: "I want to visit Paris"
AI: "Great choice! Paris has amazing museums and landmarks. Would you like to see the Louvre, Eiffel Tower..."
[User selects places, continues next day]

User: "What about food options?"
AI: "Based on your earlier interest in Paris, here are some excellent French restaurants..."
[AI remembers Paris context from previous session]
```

## Testing Checklist

### Backend Testing:
- [ ] Execute SQL schema in Supabase
- [ ] Verify `chat_history` table created
- [ ] Test RLS policies (users can only see own messages)
- [ ] Test POST /api/chat/message endpoint
- [ ] Test GET /api/chat/history endpoint
- [ ] Verify AI responses include conversation context

### Frontend Testing:
- [ ] Login and navigate to planner
- [ ] Send a message about a destination
- [ ] Verify message saves (check Supabase table)
- [ ] Refresh page - history should load
- [ ] Send follow-up message referencing previous topic
- [ ] Verify AI remembers context ("Earlier you mentioned...")
- [ ] Logout and login again - history should persist

### Cross-Session Testing:
- [ ] Send message about beaches
- [ ] Close browser completely
- [ ] Login again next day
- [ ] Send message about food
- [ ] Verify AI references beach preference

## API Examples

### Save a message:
```bash
POST http://localhost:4000/api/chat/message
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "message": "I want to visit beaches in Thailand",
  "role": "user"
}
```

### Get chat history:
```bash
GET http://localhost:4000/api/chat/history?limit=20
Authorization: Bearer YOUR_JWT_TOKEN
```

### Clear chat history:
```bash
DELETE http://localhost:4000/api/chat/history
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get message count:
```bash
GET http://localhost:4000/api/chat/stats
Authorization: Bearer YOUR_JWT_TOKEN
```

## Architecture Diagram

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │
       │ GET /api/chat/history (on mount)
       │ POST /api/chat/message (user sends)
       │ POST /api/ai/chat (AI processing)
       │
       ▼
┌─────────────────────┐
│  Express Server     │
│                     │
│  ┌───────────────┐  │
│  │ Auth Middleware│  │ (JWT validation)
│  └───────┬───────┘  │
│          │          │
│  ┌───────▼───────┐  │
│  │ Chat Routes   │  │ (/api/chat)
│  └───────┬───────┘  │
│          │          │
│  ┌───────▼───────┐  │
│  │ ChatHistory   │  │ (Model)
│  │  Model        │  │
│  └───────┬───────┘  │
│          │          │
│          ▼          │
│  ┌──────────────┐   │
│  │ AI Routes    │   │ (/api/ai/chat)
│  │              │   │
│  │ 1. Fetch ctx │   │ (getConversationContext)
│  │ 2. Call      │   │ (Gemini + context)
│  │    Gemini    │   │
│  │ 3. Save resp │   │ (saveMessage)
│  └──────────────┘   │
└──────────┬──────────┘
           │
           ▼
    ┌─────────────┐         ┌──────────────┐
    │  Supabase   │         │ Gemini API   │
    │ PostgreSQL  │         │ (2.5 Flash)  │
    │             │         │              │
    │ chat_history│         │ + Context    │
    │   table     │         │ + Prompts    │
    └─────────────┘         └──────────────┘
```

## Performance Considerations

- **Context Window**: Limited to 10 messages to prevent token overflow
- **Indexes**: Database indexes ensure fast history retrieval
- **RLS Policies**: Automatic user isolation at database level
- **Caching**: Consider adding Redis for frequently accessed history
- **Pagination**: GET /history supports limit parameter for large histories

## Security Features

- JWT authentication on all endpoints
- Row Level Security (RLS) in Supabase
- Users cannot access other users' conversations
- SQL injection prevention via parameterized queries
- CORS configured for frontend origin only

## Future Enhancements

### Potential Improvements:
1. **Session Management**: Group conversations by trip/session
2. **History Export**: Download conversation as JSON/PDF
3. **Message Editing**: Allow users to edit sent messages
4. **Conversation Summary**: AI-generated summary of long conversations
5. **Context Pruning**: Smart selection of most relevant messages
6. **Search History**: Full-text search across conversations
7. **Message Reactions**: Like/dislike AI responses
8. **Conversation Branching**: Multiple conversation threads

### Configuration Options:
- Adjust context window size (currently 10 messages)
- Enable/disable conversation persistence per user
- Set automatic history expiration (e.g., 30 days)
- Configure different context limits per intent type

## Troubleshooting

### Issue: Chat history not loading
**Solution**: Check browser console for errors, verify JWT token exists in localStorage

### Issue: AI not remembering context
**Solution**: Verify `conversationHistory` is included in Gemini payload, check database for saved messages

### Issue: "Not authenticated" error
**Solution**: Ensure user is logged in, token stored as "token" in localStorage

### Issue: Messages saving but not displaying
**Solution**: Check message format in database, verify frontend parsing logic

### Issue: RLS blocking access
**Solution**: Verify JWT token contains correct user ID, check Supabase RLS policies

## Files Modified Summary

### Created:
- `server/sql/chat_history_schema.sql` - Database schema
- `server/src/models/ChatHistory.js` - Data access layer
- `server/src/routes/chatHistory.routes.js` - API endpoints
- `CONVERSATIONAL_AI_SETUP.md` - This document

### Modified:
- `server/src/server.js` - Registered chat routes
- `server/src/routes/ai.routes.js` - Added context injection
- `server/src/services/ai/prompts/itinerary.prompt.js` - Updated prompt
- `server/src/services/ai/prompts/search.prompt.js` - Updated prompt
- `client/odyssey/app/planner/page.tsx` - Frontend integration

## Next Steps

1. ✅ Execute SQL schema in Supabase (REQUIRED)
2. ✅ Restart Express server
3. ✅ Test message saving
4. ✅ Test conversation continuity
5. ✅ Verify context retention across sessions

## Questions?

If you encounter any issues or have questions:
1. Check Supabase logs for database errors
2. Check Express server console for API errors
3. Check browser console for frontend errors
4. Verify JWT token is valid and not expired
5. Test endpoints individually with Postman/curl

---

**Status**: Implementation Complete ✅
**Date**: December 2024
**Version**: 1.0
