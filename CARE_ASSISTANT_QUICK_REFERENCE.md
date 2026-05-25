# Care Assistant Conversational Enhancement - Quick Reference

## Problem Solved
**Before:** User asks different questions → Same generic urgent message repeated  
**After:** User asks different questions → Contextual, intent-aware responses

## 5-Minute Overview

### What Got Added
1. **Intent Classifier** (`careAssistantIntentClassifier.js`)
   - Detects: Emotional support, next steps, tell health worker, etc.
   - Uses keyword matching (no extra LLM call)
   - Returns: `EMOTIONAL_SUPPORT`, `NEXT_STEPS`, `TELL_HEALTH_WORKER`, etc.

2. **Intent Fallbacks** (`careAssistantIntentFallbacks.js`)
   - 30 customized fallback templates (10 intents × 3 risk levels)
   - Example: EMOTIONAL_SUPPORT/HIGH acknowledges fear + provides action
   - Example: MEDICINE_REQUEST/HIGH firmly refuses drugs
   - Never uses generic message again

3. **Prompt Builder Update** (`careAssistantPromptBuilder.js`)
   - Detects intent at build time
   - Adds intent-specific system instruction guidance
   - Anti-repetition logic: detects if urgent warning was recent
   - Returns: `{ systemInstruction, userPrompt, detectedIntent }`

4. **Controller Update** (`careAssistant.controller.js`)
   - Captures intent from prompt builder
   - Uses intent-based fallback on validation failure
   - Better logging with intent information

5. **Intent-Based Test Suite** (`runCareAssistantIntentTest.js`)
   - 9 test scenarios covering different intents
   - Repetition test: verifies 3 sequential messages get different answers
   - Validates: conversational tone, safety, contextuality

### Intent Types
| Intent | Trigger Example | Response Type |
|--------|---|---|
| EMOTIONAL_SUPPORT | "আমি ভয় পাচ্ছি" | Empathetic + calming steps |
| NEXT_STEPS | "এখন কী করবো?" | Step-by-step action list |
| TELL_HEALTH_WORKER | "ডাক্তারকে কী বলবো?" | Script/summary to read |
| FAMILY_COMMUNICATION | "স্বামীকে কী বলবো?" | Family-facing explanation |
| HOSPITAL_PREPARATION | "কী নিয়ে যাব?" | Practical checklist |
| EXPLAIN_RESULT | "কেন উচ্চ ঝুঁকি?" | Simple education |
| WAIT_OR_DELAY | "কি আমি অপেক্ষা করতে পারি?" | Clear "NO" for HIGH risk |
| MEDICINE_REQUEST | "কোন ওষুধ খাব?" | Firm refusal |
| NEW_OR_WORSENING_SYMPTOM | "এখন রক্তপাত শুরু" | Escalate urgency |
| GENERAL_OTHER | Other questions | Context-appropriate response |

## Test It

```bash
cd backend
node src/careAssistant/tests/runCareAssistantIntentTest.js
```

Expected: 9/9 tests pass, all intents generate different appropriate responses

## What Changed in Behavior

### Example: HIGH RISK Patient

**Old Way:**
```
Q: "আমি ভয় পাচ্ছি"
A: "আপনার লক্ষণগুলো উচ্চ ঝুঁকি... যোগাযোগ করুন..."

Q: "স্বাস্থ্যকর্মীকে কী বলবো?"
A: "আপনার লক্ষণগুলো উচ্চ ঝুঁকি... যোগাযোগ করুন..." ← SAME!

Q: "এখন কী করবো?"
A: "আপনার লক্ষণগুলো উচ্চ ঝুঁকি... যোগাযোগ করুন..." ← SAME AGAIN!
```

**New Way:**
```
Q: "আমি ভয় পাচ্ছি" → EMOTIONAL_SUPPORT detected
A: "আমি বুঝতে পারছি আপনি ভয় পাচ্ছেন। এটা স্বাভাবিক।
   পরিবারকে ডাকুন এবং দ্রুত যোগাযোগ করুন।" ✓

Q: "স্বাস্থ্যকর্মীকে কী বলবো?" → TELL_HEALTH_WORKER detected
A: "স্বাস্থ্যকর্মীকে এভাবে বলুন: 'আমার [symptoms], 
   MatriSense উচ্চ ঝুঁকি দেখিয়েছে।'" ✓ DIFFERENT!

Q: "এখন কী করবো?" → NEXT_STEPS detected
A: "১. অবিলম্বে যোগাযোগ করুন
   २. পরিবারকে জানান
   ३. সমস্ত উপসর্গ বলুন" ✓ ALSO DIFFERENT!
```

## Safety: Nothing Weakened

✅ Validator still active  
✅ No diagnosis  
✅ No medicine advice  
✅ No risk downgrade  
✅ No delay advice for HIGH  
✅ All disclaimers still required  

**Key:** Intent-aware responses still follow all safety rules. EMOTIONAL_SUPPORT doesn't say "you're probably fine". WAIT_OR_DELAY firmly rejects delays for HIGH risk.

## Behind the Scenes

```
User Message
    ↓
1. classifyIntent() → Detects user's need
    ↓
2. buildAssistantPrompt() includes intent-specific guidance
    ↓
3. LLM generates response tailored to the intent
    ↓
4. If safety fails: Use getFallbackByIntent() not generic fallback
    ↓
Output: Contextual, safe, appropriate response
```

## Why This Works

1. **Intent Detection:** Keyword-based (fast, no extra LLM call)
2. **Prompt Guidance:** LLM explicitly told how to answer each intent type
3. **Smart Fallback:** If LLM fails, fallback is still contextual
4. **Anti-Repetition:** Detects if urgent warning was recent, uses shorter reminder

## Files Modified/Created

| File | Purpose |
|------|---------|
| `careAssistantIntentClassifier.js` | NEW: Detect user intent |
| `careAssistantIntentFallbacks.js` | NEW: Intent-specific fallbacks |
| `careAssistantPromptBuilder.js` | UPDATED: Intent-aware prompt |
| `careAssistant.controller.js` | UPDATED: Use intent-based fallback |
| `runCareAssistantIntentTest.js` | NEW: Test intent-based responses |

## Key Code Locations

**Intent Detection:**
```javascript
const detectedIntent = classifyIntent(userMessage);
// Returns: EMOTIONAL_SUPPORT, NEXT_STEPS, etc.
```

**Prompt Guidance:**
```javascript
const intentSpecificGuidance = buildIntentSpecificGuidance(
  detectedIntent, 
  riskLevel, 
  hasRecentFullWarning
);
```

**Smart Fallback:**
```javascript
const intentFallback = getFallbackByIntent(detectedIntent, riskLevel);
// NOT: GET_CONSERVATIVE_FALLBACK(riskLevel)
```

## Logging

```
[CareAssistantController] Detected intent: Emotional Support
[CareAssistantController] Safety Validation PASSED
[CareAssistantController] Intent: Emotional Support
```

## What's Preserved

✅ Rule engine decisions  
✅ Vector RAG system  
✅ JSON RAG fallback  
✅ Safety validator logic  
✅ API endpoints  
✅ Database schema  

## Next Steps

1. Run tests: `node src/careAssistant/tests/runCareAssistantIntentTest.js`
2. Verify: All 9 tests pass
3. Deploy: To staging/production
4. Monitor: Backend logs show detected intents and response quality
5. Gather feedback: User satisfaction with conversational vs repetitive

## Success Metrics

- ✅ Different questions get different answers
- ✅ Answers are contextual to the question
- ✅ Safety validator still passes
- ✅ HIGH-risk urgency maintained
- ✅ No diagnosis/medicine/risk-downgrade
- ✅ Users feel helped, not just warned
