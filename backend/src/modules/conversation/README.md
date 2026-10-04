# Conversation Feature Module (`src/modules/conversation/`)

## Architectural Purpose

This directory contains the **domain logic, workflows, and endpoints for patient conversational intake sessions**.

### Planned Layered Structure (for upcoming Step 1 implementation):

```text
src/modules/conversation/
├── conversation.routes.js     # Express router mounted at /api/conversations
├── controllers/               # Request handling & HTTP response mapping
├── services/                  # Business orchestration & interaction with ai/gemini
├── repositories/              # Database persistence layer for sessions & turns
└── validators/                # Input validation schemas
```

### Architectural Boundaries & Rules

1. **Self-Contained Feature Routing**:
   - `conversation.routes.js` declares all endpoints related to conversations and is mounted explicitly in `src/routes/index.js` (`router.use('/conversations', conversationRoutes)`).
2. **AI Provider Decoupling**:
   - The conversation service orchestrates intake dialog and delegates generative tasks to `src/modules/ai/gemini/` via service interface.
3. **No Cross-Module Leakage**:
   - Does not expose internal database models directly to external consumers.
