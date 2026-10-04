# AI / Gemini Infrastructure Module (`src/modules/ai/gemini/`)

## Architectural Purpose

This directory is reserved exclusively for the **Google Gemini integration and AI infrastructure layer**.

### Architectural Boundaries & Rules

1. **Isolation of Infrastructure**:
   - Contains SDK wrappers, API key configuration, model client initialization, safety settings, rate limiting, and raw streaming adapters.
2. **Zero Domain Logic**:
   - **MUST NOT** contain conversation management, patient database schemas, triage rules, or route handlers.
3. **Clean Service Interface**:
   - Feature modules (such as `src/modules/conversation/`) interact with this module only through explicit provider abstractions (e.g., `geminiService.generateResponse(prompt, options)`), keeping external AI dependencies decoupled from application business logic.
