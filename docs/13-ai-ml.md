# 13. AI / ML

## 13.1 Status: Not Implemented

This application contains **no artificial intelligence or machine learning functionality**. There are no models, no training data, no inference calls, no prompts, no embeddings, no vector database, and no third-party AI API integration (OpenAI, Anthropic, or otherwise) anywhere in the codebase (`backend/` or `frontend/`).

This was verified by inspecting every dependency in `backend/package.json` (`express`, `cors`, `pg`) and `frontend/package.json` (`vite` only) — none is an AI/ML library or SDK.

## 13.2 Where AI-Adjacent Features Might Naturally Fit (Not Built)

Documented here only to distinguish "not built" from "not considered" — none of the following exist today:

| Potential feature | Status |
|---|---|
| Chatbot / concierge assistant for guest questions | Not implemented |
| Smart room recommendations based on guest history | Not implemented — the only "recommended" sort on the Rooms page is a static rule (available rooms first), not a learned ranking |
| Dynamic/AI-driven pricing | Not implemented — pricing is a fixed, deterministic formula (see [11-business-logic.md](11-business-logic.md)) |
| Review sentiment analysis | Not implemented — there is no review-submission feature at all |
| Fraud/anomaly detection on bookings | Not implemented |

If this section is being read in the context of planning future work, see [25-roadmap.md](25-roadmap.md) — none of the above currently appear there either, as they were not requested or scoped for this project.
