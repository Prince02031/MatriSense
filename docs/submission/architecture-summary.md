# MatriSense Architecture Summary

MatriSense is a Bangla-first maternal health triage and referral system for rural Bangladesh.

## Core Flow

```text
Mother reports symptoms in Bangla
→ AI extracts structured symptoms
→ Mother confirms symptoms and answers follow-up questions
→ Rule engine detects danger signs and decides urgency
→ Rule-aware RAG retrieves safe guidance
→ LLM explains the fixed decision in Bangla
→ Safety validator blocks unsafe output
→ High-risk cases appear on the health worker dashboard
```

## Safety-First Design

MatriSense is not a free-form medical chatbot. The LLM does not decide urgency. The rule engine controls risk level and allowed action type, while RAG provides source-grounded support for the already-decided risk level.

## Advanced MVP Upgrades

- Vector RAG with JSON fallback
- Source-agnostic ingestion for JSON, markdown, PDF, and HTML
- Regional referral and hospital assignment workflow
- Health worker case status and audit trail
