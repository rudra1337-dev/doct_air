# AGENTS.md

## Purpose

This document defines universal development guidelines for this repository.

These rules apply to:

* Human contributors
* OpenAI Codex
* Claude Code
* Google Antigravity
* GitHub Copilot and similar coding agents
* Other AI coding agents
* Automated development and refactoring tools

These guidelines are intentionally **technology-agnostic**.

They apply regardless of whether the repository uses:

* JavaScript or TypeScript
* Python, Java, C, C++, Go, Rust, C#, PHP, Ruby, Kotlin, Swift, or another language
* React, Vue, Angular, Svelte, Next.js, Nuxt, Flutter, native mobile frameworks, or another UI technology
* Node.js, Django, Spring, FastAPI, .NET, Laravel, Rails, or another backend framework
* SQL, NoSQL, graph databases, files, external APIs, or no database
* Monorepo or single-application architecture
* Frontend, backend, CLI, library, mobile application, desktop application, infrastructure project, or another project type

All contributors and agents must follow these conventions unless:

1. the repository explicitly defines a more specific rule,
2. the task explicitly requires behavior that differs from a rule here, or
3. following the rule would conflict with the actual architecture or tooling of the repository.

When a more specific repository-level instruction exists, follow the more specific instruction.

---

# 1. Core Development Principle

The primary rule for every task is:

```text
Inspect → Understand → Reuse → Modify minimally → Validate → Review
```

Do not follow this pattern:

```text
Guess → Rewrite → Add dependencies → Hope it works
```

Agents must work from the repository's actual state rather than assumptions about how the project "should" be structured.

The existing repository is the primary source of truth for:

* Architecture
* Naming conventions
* Directory structure
* File organization
* Framework usage
* Dependency choices
* Coding style
* API contracts
* Data models
* Configuration
* Testing strategy
* Build system
* Deployment assumptions
* Authentication behavior
* Error handling
* State management
* Styling
* Documentation

---

# 2. Repository Discovery

Before making meaningful changes, inspect the repository.

At minimum, determine:

* Repository root
* Major directories
* Application boundaries
* Source directories
* Configuration files
* Package/build manifests
* Lockfiles
* Documentation
* Existing tests
* Existing scripts
* CI/CD configuration
* Environment/configuration files
* Existing agent instructions
* Git status
* Current branch

Examples of files worth checking when they exist:

```text
README.md
AGENTS.md
CONTRIBUTING.md
package.json
pnpm-workspace.yaml
yarn.lock
package-lock.json
pyproject.toml
requirements.txt
Pipfile
pom.xml
build.gradle
Cargo.toml
go.mod
composer.json
Gemfile
Makefile
CMakeLists.txt
Dockerfile
docker-compose.yml
.env.example
.editorconfig
.eslintrc.*
.prettierrc.*
tsconfig.json
vite.config.*
next.config.*
.github/
.gitlab/
```

Do not assume all of these files exist.

Only inspect the files relevant to the actual repository.

---

# 3. Existing Instructions Have Priority

Before modifying code, search for repository-specific instructions.

Potential sources include:

* Root-level `AGENTS.md`
* Nested `AGENTS.md` files
* `CONTRIBUTING.md`
* `README.md`
* Documentation directories
* Package-specific instructions
* Build instructions
* CI configuration
* Framework-specific configuration
* Comments explicitly describing architectural constraints

If multiple instruction files exist:

1. Read the applicable higher-level instructions.
2. Read more specific instructions for the directory being modified.
3. Follow the most specific applicable rule.
4. Do not ignore repository-specific conventions merely because this file provides a generic recommendation.

When instructions conflict, prefer the instruction that is:

1. more specific to the affected directory,
2. more specific to the technology,
3. explicitly required by the task,
4. more recently established in the repository.

---

# 4. Repository Structure

Do not impose a preferred directory structure on a repository.

First determine how the project is organized.

Possible structures include:

```text
src/
tests/
docs/
scripts/
```

or:

```text
apps/
packages/
services/
libs/
```

or:

```text
frontend/
backend/
shared/
```

or:

```text
client/
server/
```

or another structure entirely.

Follow the structure that already exists.

### Rules

* Keep files inside the appropriate existing application/module/package.
* Do not create duplicate directories for the same responsibility.
* Do not introduce a new architectural boundary without a reason.
* Do not move files merely because another structure appears cleaner.
* Do not create root-level directories without understanding the repository's conventions.
* Do not place application-specific code into unrelated packages.
* Do not mix independent application responsibilities without justification.
* Preserve existing module boundaries unless the task explicitly changes them.

If the repository is a monorepo, identify:

* Applications
* Packages
* Shared libraries
* Internal tooling
* Infrastructure
* Tests
* Documentation

before modifying anything.

---

# 5. General Agent Rules

Before modifying code:

1. Inspect the project structure.
2. Read the relevant instructions.
3. Read the relevant source files.
4. Understand existing implementation patterns.
5. Identify dependencies between affected files.
6. Search for existing implementations of the requested behavior.
7. Determine whether an existing utility, component, service, helper, module, or abstraction can be reused.
8. Make the smallest reasonable change.
9. Validate the change.
10. Review the final diff.

### Do not:

* Rewrite working code unnecessarily.
* Change unrelated files.
* Add dependencies without justification.
* Introduce a second implementation of existing functionality.
* Change architecture merely because another architecture is personally preferred.
* Change public APIs without checking consumers.
* Change database schemas without checking their usage.
* Change authentication without reviewing the complete affected flow.
* Delete code without determining whether it is used.
* Assume an apparently unused file is actually unused.
* Assume a configuration value has no consumers.
* Assume a route is unused.
* Assume a dependency is unnecessary without checking its usage.

---

# 6. Never Guess — Inspect

This is one of the most important rules.

Never assume that a:

* File exists
* Directory exists
* Function exists
* Class exists
* Component exists
* Service exists
* API exists
* Route exists
* Database table exists
* Database collection exists
* Model exists
* Environment variable exists
* Configuration option exists
* Dependency exists
* Test exists
* Build script exists
* Framework is being used
* Authentication mechanism exists
* Styling system exists
* State management system exists

Search the repository first.

Examples:

```text
Before importing a module:
→ verify its actual location.

Before creating a utility:
→ search for an existing equivalent.

Before changing an API:
→ search for all consumers.

Before renaming a field:
→ search the entire repository.

Before deleting a file:
→ search for references.

Before adding a dependency:
→ inspect existing dependencies.

Before changing a configuration value:
→ search for where it is consumed.
```

The repository should be treated as the source of truth.

---

# 7. Understand Before Implementing

Before writing code, answer the following questions internally:

* What currently happens?
* Where does the relevant behavior live?
* What calls this code?
* What does this code call?
* What data enters the affected code?
* What data leaves it?
* Which files depend on it?
* Is there already a pattern for this?
* What conventions does the project use?
* What is the smallest safe change?
* What could break if this changes?
* How will the change be validated?

Do not begin implementation simply because the requested file name is obvious.

---

# 8. Reuse Existing Patterns

Prefer existing repository patterns over new patterns.

If the repository already has:

* A service pattern
* A controller pattern
* A validation utility
* An error class
* A logging utility
* An API client
* A database abstraction
* A UI component pattern
* A state management pattern
* A testing helper
* A configuration loader
* An authentication middleware
* A shared type
* A common utility

reuse it when appropriate.

Do not create:

```text
new implementation
```

when the repository already has:

```text
existing implementation
```

that can reasonably be extended.

Consistency is generally more valuable than introducing a theoretically cleaner isolated solution.

---

# 9. Minimal Change Principle

Every task should result in the smallest change that correctly satisfies the requirement.

Prefer:

```text
small targeted modification
```

over:

```text
large unrelated refactor
```

Do not use a feature request as an excuse to:

* Rename unrelated files
* Reformat the entire project
* Rewrite unrelated components
* Replace the framework
* Replace the database layer
* Replace the styling system
* Replace the testing framework
* Upgrade unrelated dependencies
* Reorganize unrelated directories

unless the task explicitly requires those changes.

---

# 10. Architecture Guidelines

Follow the architecture already present in the repository.

Common architectural patterns may include:

* Layered architecture
* MVC
* MVVM
* Clean Architecture
* Hexagonal architecture
* Feature-based architecture
* Domain-driven organization
* Modular monolith
* Microservices
* Monorepo packages
* Component-based frontend
* Repository/service patterns
* Functional modules
* Event-driven systems

Do not introduce a competing architecture for one small feature.

If the repository does not clearly follow one architectural pattern, inspect several related features before deciding where new code belongs.

---

# 11. Feature Boundaries

When implementing a feature, identify all affected layers.

Depending on the project, a feature may involve:

```text
UI
↓
state
↓
client/service
↓
API
↓
controller/handler
↓
business logic
↓
data access
↓
database/external service
```

Not every project contains every layer.

Only modify the layers that actually exist and are required.

Avoid duplicating the same business logic across multiple layers.

---

# 12. Frontend Guidelines

If the repository contains a frontend, follow its existing frontend architecture.

Do not assume the frontend uses:

* React
* Vue
* Angular
* Svelte
* Next.js
* Vite
* Webpack
* JavaScript
* TypeScript
* CSS
* Tailwind
* Bootstrap
* Material UI

Inspect the repository first.

### General frontend rules

* Follow the existing component architecture.
* Follow existing naming conventions.
* Reuse existing components.
* Reuse existing hooks/composables/utilities.
* Reuse existing state management.
* Reuse existing API clients.
* Preserve existing routing behavior.
* Preserve existing authentication behavior.
* Avoid duplicating API logic.
* Keep UI responsibilities separate from business logic where the architecture supports that separation.
* Keep components reasonably focused.
* Avoid unnecessary state.
* Avoid unnecessary side effects.
* Preserve accessibility conventions already present in the project.

---

# 13. Frontend Structure

Determine how frontend code is organized.

Possible structures include:

```text
src/components/
src/pages/
src/services/
src/hooks/
src/utils/
```

or:

```text
src/features/
src/shared/
src/routes/
```

or:

```text
src/modules/
```

or another structure.

Follow the existing organization.

### Do not:

* Create `components/` if the project intentionally uses feature-based modules.
* Create `pages/` if pages are already organized inside features.
* Create `services/` if the project has a different established API abstraction.
* Move files solely to match this document.
* Introduce duplicate organizational systems.

---

# 14. Pages, Screens, Views, and Routes

If the frontend has pages, screens, views, or routes, follow the existing organization.

For substantial UI units, prefer the repository's existing convention for colocating:

* UI code
* Styles
* Tests
* Supporting utilities
* Data loaders
* Route configuration

For example, if the repository uses:

```text
Feature/
├── Feature.tsx
├── Feature.css
└── Feature.test.tsx
```

follow that pattern.

If it uses:

```text
features/
└── feature/
    ├── components/
    ├── hooks/
    ├── services/
    └── index.ts
```

follow that instead.

Do not impose a new structure.

---

# 15. Frontend Components

Reusable components should follow the project's existing organization.

### Component rules

* Reuse existing components before creating new ones.
* Avoid duplicate UI implementations.
* Keep components focused.
* Avoid excessively large components when reasonable decomposition already exists.
* Do not extract tiny pieces of UI merely for abstraction's sake.
* Follow existing naming conventions.
* Preserve component APIs unless changes are required.
* Check all consumers before changing shared component props.
* Update all affected imports after moving components.
* Preserve accessibility behavior.

If the project uses a component library, inspect and reuse it before creating custom equivalents.

---

# 16. Frontend State Management

If the project uses state management, follow the existing system.

Possible systems include:

* React Context
* Redux
* Zustand
* MobX
* Pinia
* Vuex
* Signals
* Local component state
* Server-state libraries
* Custom stores

Do not introduce another state-management system for a single feature unless explicitly required.

Before adding state, determine whether the value should actually be:

* Local UI state
* Derived state
* Server state
* Global state
* URL state
* Form state
* Cached data

Avoid unnecessary global state.

---

# 17. Frontend API Communication

If the frontend communicates with APIs:

* Search for the existing API client.
* Search for existing request utilities.
* Follow existing authentication handling.
* Follow existing error handling.
* Follow existing response parsing.
* Reuse existing service functions where possible.

Do not duplicate:

```text
fetch()
axios()
HTTP client
GraphQL client
RPC client
```

logic across components when the project already has an abstraction for it.

API communication should remain consistent with the existing architecture.

---

# 18. Frontend Routing and Navigation

If the project uses routing:

Before changing a route:

1. Find the route configuration.
2. Find the target component/page.
3. Search for navigation links.
4. Search for redirects.
5. Search for route guards.
6. Check authentication requirements.
7. Check tests referencing the route.
8. Check deep-link behavior if relevant.

When moving a route:

* Update route imports.
* Update navigation references.
* Update redirects.
* Update tests.
* Search for the old path.
* Verify direct navigation if applicable.

Do not alter authentication or authorization behavior during a structural routing change unless explicitly required.

---

# 19. Frontend Styling

If the project has frontend styling, follow the existing styling system.

Possible systems include:

* Plain CSS
* CSS Modules
* SCSS/Sass
* Tailwind
* Bootstrap
* Material UI
* Styled Components
* Emotion
* CSS-in-JS
* Native platform styling
* Design-system components

Do not introduce a second styling system without a clear reason.

### Styling rules

* Reuse existing styles.
* Reuse existing design tokens.
* Reuse existing components.
* Keep local styles local when that is the repository convention.
* Keep global styles global when intentionally global.
* Avoid unnecessarily generic class names.
* Avoid duplicate declarations.
* Preserve responsive behavior.
* Preserve accessibility.
* Do not rewrite unrelated styles.
* Do not introduce a new CSS framework merely for convenience.

---

# 20. Frontend Imports and Modules

Never guess import paths.

Before changing an import:

1. Verify the source file location.
2. Verify the target file location.
3. Check whether path aliases are configured.
4. Follow existing import conventions.
5. Check case sensitivity.
6. Check extension conventions if relevant.

After moving a file:

* Search for imports of the old path.
* Search for dynamic references.
* Search for tests.
* Search for documentation examples when relevant.
* Update all affected references.

Do not leave broken imports behind.

---

# 21. Framework-Specific Rules

If a specific framework is used, follow its existing conventions.

Examples:

### React

If React is detected:

* Follow existing component conventions.
* Follow existing hook patterns.
* Avoid unnecessary effects.
* Preserve existing state architecture.
* Reuse existing providers.
* Follow the project's JSX/TSX conventions.

### Vue

If Vue is detected:

* Follow existing component conventions.
* Follow the project's Composition API or Options API convention.
* Do not mix patterns unnecessarily.

### Angular

If Angular is detected:

* Follow the existing module/standalone component approach.
* Follow dependency injection conventions.
* Preserve existing observable/state patterns.

### Next.js/Nuxt/etc.

If a full-stack framework is detected:

* Follow its routing model.
* Follow its server/client boundary rules.
* Follow existing data-fetching conventions.
* Preserve rendering behavior.
* Do not move code across server/client boundaries without understanding the consequences.

The specific framework is never assumed in advance.

---

# 22. Backend Guidelines

If the repository contains a backend, inspect its architecture before modifying it.

Do not assume:

* Node.js
* Express
* Django
* FastAPI
* Spring
* .NET
* Laravel
* Rails
* REST
* GraphQL
* gRPC
* SQL
* MongoDB
* JWT
* OAuth

The backend may use any combination of technologies.

Follow the architecture that actually exists.

---

# 23. Backend Structure

Identify existing backend responsibilities.

Common layers may include:

```text
routes/
controllers/
handlers/
services/
models/
repositories/
middleware/
validators/
utils/
config/
```

or a feature-based structure:

```text
features/
└── users/
    ├── controller/
    ├── service/
    ├── repository/
    ├── model/
    └── routes/
```

Use the existing structure.

Do not create both:

```text
controller/
controllers/
```

or:

```text
service/
services/
```

unless the architecture explicitly requires both.

---

# 24. Controllers and Request Handlers

If controllers or handlers exist, they should generally coordinate application behavior rather than contain excessive business logic.

Typical responsibilities include:

* Reading request data
* Calling validation
* Calling business logic
* Calling services
* Calling repositories
* Returning responses
* Mapping errors to protocol responses

Avoid putting large amounts of business logic directly into:

* Route definitions
* HTTP handlers
* Controller methods

when the project already has a service/domain layer.

Follow the repository's existing layering rather than forcing one.

---

# 25. Services and Business Logic

If a service/domain/business layer exists:

* Reuse existing services.
* Extend existing services when appropriate.
* Avoid duplicate business logic.
* Keep business rules in the layer where the repository already places them.
* Avoid moving business logic into controllers merely because it is convenient.
* Avoid moving business logic into UI code.

If no service layer exists, do not automatically create one for a tiny change.

Architecture should match project needs.

---

# 26. Data Models and Data Access

If the project uses persistent data:

Before changing data structures, inspect:

* Models
* Schemas
* Entities
* Repositories
* Queries
* Migrations
* Seed data
* API contracts
* Tests
* Existing consumers

Never silently rename or remove a field that may be used elsewhere.

Consider:

* Existing records
* Nullability
* Defaults
* Constraints
* Relationships
* Indexes
* Unique constraints
* Serialization
* Backward compatibility

---

# 27. Database Changes

Database changes are potentially destructive.

Before modifying a schema:

1. Identify all consumers.
2. Understand the current schema.
3. Check migration conventions.
4. Check existing migration history.
5. Determine whether a migration is required.
6. Consider existing production data.
7. Consider rollback implications.
8. Update affected application code.
9. Update tests.
10. Validate the migration.

Never assume a schema change is harmless because the code compiles.

Do not delete or rename database fields without understanding existing data and consumers.

---

# 28. Migrations

If the repository uses migrations:

* Follow the existing migration tool.
* Follow naming conventions.
* Make migrations deterministic.
* Avoid editing already-applied migrations unless the repository explicitly expects that.
* Test migrations when practical.
* Consider rollback behavior where supported.
* Document manual steps when necessary.

Do not create a second migration system.

If a one-time migration script is necessary, follow the temporary-script rules below.

---

# 29. API Design and Changes

Before changing an existing API:

1. Search all consumers.
2. Inspect the endpoint definition.
3. Inspect handlers/controllers.
4. Inspect business logic.
5. Inspect request validation.
6. Inspect response structures.
7. Inspect authentication requirements.
8. Inspect tests.
9. Inspect documentation if applicable.

Treat public APIs as contracts.

Avoid breaking:

* Request fields
* Response fields
* Status codes
* Error formats
* Authentication requirements
* URL paths
* HTTP methods
* GraphQL schemas
* RPC interfaces

unless the task explicitly requires the breaking change.

If a breaking change is required, identify it clearly.

---

# 30. Authentication and Authorization

Authentication and authorization are security-sensitive.

Before changing authentication, inspect the complete flow.

Possible mechanisms include:

* Sessions
* Cookies
* JWT
* OAuth
* OpenID Connect
* API keys
* Tokens
* Platform-specific authentication
* Custom mechanisms

Do not assume which mechanism is being used.

Before changing authorization, inspect:

* Authentication middleware
* User/session loading
* Role checks
* Permission checks
* Resource ownership checks
* Tenant/workspace checks
* Route protection
* Frontend guards
* API clients

Do not weaken authorization accidentally.

Never:

* Hardcode credentials.
* Commit secrets.
* Commit private keys.
* Commit access tokens.
* Log passwords.
* Log authentication tokens.
* Expose private secrets to clients.
* Disable security checks merely to make development easier.

---

# 31. Configuration and Environment Variables

Inspect how configuration is currently handled.

Possible mechanisms include:

* Environment variables
* Configuration files
* Secrets managers
* Command-line arguments
* Framework configuration
* Dependency injection
* Platform configuration

Follow the existing system.

Never hardcode environment-specific secrets.

If a new configuration value is required:

1. Add it using the repository's existing configuration pattern.
2. Update example configuration if appropriate.
3. Update documentation if necessary.
4. Validate missing-value behavior.
5. Avoid exposing secrets.

Never commit:

```text
passwords
API keys
private keys
access tokens
database credentials
session secrets
OAuth client secrets
```

unless the repository explicitly contains intentionally public test credentials.

---

# 32. Error Handling

Follow the existing error-handling architecture.

Avoid introducing competing approaches such as:

```text
throw custom error
return error object
return null
send HTTP response directly
```

without understanding the existing convention.

Errors should:

* Be handled at the appropriate layer.
* Provide useful diagnostics.
* Avoid exposing sensitive implementation details.
* Use appropriate status/protocol codes where applicable.
* Preserve existing error formats where APIs already depend on them.

Do not silently swallow unexpected errors.

Do not replace meaningful errors with generic messages unless required for security.

---

# 33. Logging and Observability

Follow existing logging conventions.

When adding logs:

* Log useful operational information.
* Avoid logging secrets.
* Avoid logging passwords.
* Avoid logging authentication tokens.
* Avoid logging sensitive personal information.
* Avoid excessive debug output in production paths.
* Preserve structured logging conventions where used.

If the repository has:

* Metrics
* Tracing
* Structured logs
* Error monitoring

reuse the existing system.

Do not introduce a second observability system unnecessarily.

---

# 34. Validation

Follow existing validation conventions.

Validation may exist at:

* UI boundaries
* API boundaries
* Controllers
* Service/domain layers
* Database layers
* CLI boundaries

Do not rely exclusively on client-side validation for security-sensitive input.

Server-side or authoritative validation should remain in place when required.

Before changing validation:

* Search existing validators.
* Search schemas.
* Search shared types.
* Search tests.
* Check API consumers.

Avoid duplicating validation logic unnecessarily.

---

# 35. Dependencies

Before adding a dependency:

1. Inspect existing dependencies.
2. Search for existing functionality that solves the problem.
3. Determine whether the dependency is genuinely required.
4. Check whether the project already uses an equivalent package.
5. Follow the project's package manager.
6. Update the appropriate lockfile.
7. Validate the application afterward.

Do not add a dependency simply because:

* It is convenient.
* It saves a few lines.
* It is popular.
* An AI-generated solution commonly uses it.

Prefer existing dependencies and native platform capabilities when they are appropriate.

---

# 36. Dependency Changes

When changing dependencies:

* Modify the correct manifest.
* Use the repository's package manager.
* Update the corresponding lockfile when applicable.
* Avoid manually editing lockfiles unless required.
* Check for peer-dependency implications.
* Check build compatibility.
* Check runtime compatibility.
* Run the relevant validation commands.

Do not accidentally update unrelated packages.

Avoid broad dependency upgrades during unrelated feature work.

---

# 37. Testing

Before changing code, inspect the project's testing strategy.

Possible test types include:

* Unit tests
* Integration tests
* End-to-end tests
* Component tests
* API tests
* Contract tests
* Snapshot tests
* Database tests
* CLI tests
* Static analysis
* Type checking

Follow existing conventions.

When adding functionality:

* Add or update tests when the repository expects them.
* Reuse existing test helpers.
* Avoid duplicating test setup.
* Test important edge cases.
* Test failure paths where appropriate.
* Do not remove tests merely because they are inconvenient.

---

# 38. Test Scope

Run the smallest relevant validation first.

For example:

```text
1. Focused test
2. Related test suite
3. Type checking
4. Linting
5. Build
6. Broader validation
```

Use the repository's actual commands.

Do not blindly run commands that do not exist.

Inspect:

* package scripts
* Makefile
* CI configuration
* documentation
* framework configuration

before choosing commands.

---

# 39. Build, Lint, Typecheck, and Formatting

After meaningful changes, run the relevant checks available in the repository.

Potential checks include:

```text
tests
lint
typecheck
format check
build
compile
static analysis
package validation
```

Do not claim:

```text
tests passed
build passed
lint passed
```

unless the relevant command was actually run successfully.

If validation could not be run, explicitly state:

```text
Not run because: ...
```

Do not fabricate validation results.

---

# 40. Structural Changes

After moving, renaming, deleting, or reorganizing files:

1. Search for references to the old path/name.
2. Update imports.
3. Update exports.
4. Update tests.
5. Update configuration.
6. Update scripts.
7. Update documentation when relevant.
8. Search dynamic references if applicable.
9. Run relevant validation.
10. Inspect Git status.
11. Inspect the diff.

Use:

```bash
git status
git diff --check
git diff
```

when Git is available.

---

# 41. File Movement and Renaming

When moving or renaming a file:

1. Confirm the current location.
2. Confirm the destination.
3. Search references.
4. Perform the move.
5. Update imports/references.
6. Search again for the old location.
7. Check case-sensitive naming.
8. Run tests/build/typecheck as appropriate.
9. Review Git status.

Do not create duplicate files simply to avoid fixing references.

Do not leave compatibility files unless they are intentionally required.

---

# 42. Refactoring Rules

A refactor should preserve behavior unless behavior changes are explicitly requested.

During refactoring:

* Keep changes focused.
* Preserve public contracts.
* Preserve authentication behavior.
* Preserve database behavior.
* Preserve error behavior unless required.
* Preserve performance characteristics where practical.
* Preserve tests.
* Avoid unrelated formatting changes.
* Avoid unrelated dependency upgrades.
* Avoid architecture changes unless part of the task.

A structural refactor should remain a structural refactor.

If behavior must change as part of the refactor, identify that explicitly.

---

# 43. Temporary Scripts

Temporary scripts may be created for:

* Data migration
* File transformation
* Repository analysis
* One-time automation
* Code generation
* Cleanup
* Debugging

However:

* Clearly identify temporary scripts.
* Keep them scoped.
* Do not commit unnecessary one-time scripts.
* Remove temporary scripts after successful use when they have no lasting value.
* Do not leave generated junk files.
* Verify repository status after cleanup.

If a migration script must remain for future deployments, treat it as permanent project code and follow normal review/documentation rules.

---

# 44. Generated Files

Determine which files are generated by tooling.

Examples may include:

```text
build/
dist/
target/
out/
coverage/
.cache/
generated/
vendor/
node_modules/
```

Do not assume these are always ignored.

Inspect:

```text
.gitignore
tool configuration
build scripts
repository documentation
```

Do not manually modify generated files when they should be regenerated.

If generated files are intentionally committed, follow the repository's existing workflow.

---

# 45. Documentation

Update documentation when the change affects:

* Public APIs
* Setup instructions
* Configuration
* Environment variables
* Architecture
* Commands
* User-facing behavior
* Deployment
* Migration steps
* Breaking changes

Do not update documentation merely to create unrelated churn.

When documentation contains examples, ensure examples remain consistent with the implementation.

Do not claim functionality exists if it does not.

---

# 46. Compatibility

Consider compatibility before changing:

* Public APIs
* Data schemas
* CLI arguments
* Configuration
* File formats
* Database structures
* Shared libraries
* Package exports
* Authentication behavior
* Client/server contracts

Ask:

```text
Who depends on this?
```

before changing a shared interface.

If backward compatibility is expected, preserve it.

If breaking compatibility is unavoidable, document the impact.

---

# 47. Performance

Do not optimize blindly.

Before making performance-sensitive changes:

1. Identify the actual bottleneck when possible.
2. Inspect existing implementation.
3. Determine whether the proposed change improves the relevant path.
4. Avoid unnecessary complexity.
5. Preserve correctness.
6. Validate performance when practical.

Avoid premature optimization.

Also avoid introducing obvious performance regressions such as:

* Repeated expensive operations
* Unnecessary database queries
* N+1 queries
* Excessive network requests
* Unbounded loops
* Repeated computation
* Unnecessary rendering
* Large data copies
* Memory leaks

Performance expectations should be inferred from the project and task.

---

# 48. Security

Security must be considered whenever code handles:

* Authentication
* Authorization
* User input
* File uploads
* Database queries
* External requests
* Serialization
* Deserialization
* Secrets
* Tokens
* Sessions
* Permissions
* Shell commands
* Dynamic code
* HTML rendering

Avoid:

* Command injection
* SQL injection
* NoSQL injection
* XSS
* CSRF vulnerabilities
* Path traversal
* SSRF
* Unsafe deserialization
* Credential leakage
* Improper authorization
* Sensitive-data logging

Do not weaken security controls merely to simplify implementation.

---

# 49. User Input and External Data

Treat external input as untrusted.

External input may come from:

* HTTP requests
* Forms
* Query parameters
* Files
* CLI arguments
* Environment variables
* Webhooks
* External APIs
* Database records
* Message queues
* Third-party services

Validate and normalize data according to the project's existing conventions.

Do not assume external data is:

* Correct
* Complete
* Safe
* Present
* Correctly typed

---

# 50. External Services

If the project communicates with an external service:

Before changing the integration, inspect:

* Existing client
* Authentication
* Configuration
* Retry behavior
* Timeout behavior
* Error handling
* Response parsing
* Rate limits
* Tests/mocks
* Documentation

Reuse the existing integration rather than creating a second client.

Do not expose service credentials.

Do not hardcode external service URLs when the project already uses configuration.

---

# 51. Environment-Specific Behavior

Be careful when modifying behavior for:

```text
development
test
staging
production
```

Do not accidentally apply development-only behavior to production.

Before changing environment-specific logic:

* Inspect configuration loading.
* Inspect environment variables.
* Inspect build scripts.
* Inspect deployment configuration.
* Inspect CI/CD configuration.

---

# 52. CI/CD

If the repository contains CI/CD configuration, inspect it when changes affect:

* Build
* Dependencies
* Tests
* Deployment
* Environment variables
* Docker
* Packaging
* Generated artifacts
* Tool versions

Do not modify CI/CD files casually.

A small application change should not trigger unrelated pipeline rewrites.

---

# 53. Docker and Containers

If the repository uses Docker or another container system:

Before modifying container configuration, inspect:

* Dockerfiles
* Compose files
* Ignore files
* Build scripts
* Environment handling
* Entrypoints
* Health checks
* Existing service dependencies

Do not assume the container runs from the repository root.

Preserve existing build/runtime assumptions unless the task requires changing them.

---

# 54. Monorepo Rules

If the repository is a monorepo:

Identify:

* Workspace manager
* Applications
* Packages
* Shared libraries
* Dependency boundaries
* Build orchestration
* Test orchestration

Before changing shared code:

* Search all consumers.
* Check package boundaries.
* Check public exports.
* Check versioning conventions.
* Run affected package validation.

Do not introduce application-specific dependencies into shared packages without understanding the dependency graph.

---

# 55. Shared Code

Shared code has a larger blast radius.

Before changing a shared:

* Utility
* Component
* Type
* Interface
* Service
* Library
* Configuration
* API client

search all consumers.

Check whether the change is:

* Backward compatible
* Breaking
* Safe for all consumers
* Properly tested

Do not optimize for one consumer while breaking others.

---

# 56. Public Interfaces

Treat these as potentially public interfaces:

* Exported functions
* Classes
* Types
* Components
* CLI commands
* API endpoints
* Database interfaces
* Package exports
* Configuration formats
* File formats

Before changing one:

```text
Search consumers → understand contract → change → validate consumers
```

---

# 57. Git Rules

Agents must respect the current Git state.

Before making changes:

```bash
git status
git branch --show-current
```

Do not switch branches unless explicitly requested.

Do not:

```text
git reset --hard
git clean -fd
git rebase
git push --force
git branch -D
```

or perform other destructive Git operations without explicit authorization.

Do not discard existing user changes.

---

# 58. Existing User Changes

The working tree may contain changes made by the user or another agent.

Before modifying files:

```bash
git status
```

Determine whether relevant files already contain modifications.

Never assume all uncommitted changes were created by you.

Do not overwrite, reset, revert, or discard user changes.

If existing changes overlap with the requested task:

* Inspect them.
* Preserve them.
* Modify only what is necessary.
* Clearly identify conflicts when they cannot safely be resolved automatically.

---

# 59. Git Diff Review

Before considering the task complete:

```bash
git status
git diff --check
git diff
```

Review for:

* Accidental changes
* Debug statements
* Temporary files
* Secrets
* Formatting churn
* Unrelated refactors
* Deleted code
* Broken imports
* Wrong paths
* Generated files
* Unexpected dependency changes

The final diff should tell a clear story about the requested task.

---

# 60. Commit Rules

Follow the repository's existing commit-message convention.

If no convention exists, use clear descriptive messages.

Conventional-style messages are acceptable, for example:

```text
feat: add user search
fix: handle invalid input
refactor: simplify authentication flow
docs: update setup instructions
test: add API validation coverage
chore: update development tooling
```

Avoid vague messages such as:

```text
changes
update
fix stuff
work
final
done
misc
```

Do not create commits unless the task or environment expects you to do so.

---

# 61. Pull Request Guidelines

A pull request should clearly describe:

* What changed
* Why it changed
* Important implementation details
* Architectural impact
* Tests performed
* Build/lint/typecheck results
* Known limitations
* Breaking changes
* Migration requirements

Keep unrelated changes out of the PR.

A large refactor should explain:

* Previous structure
* New structure
* Why the change was needed
* Compatibility implications
* Validation performed

---

# 62. AI Agent Workflow

AI coding agents should follow this workflow:

```text
1. Inspect repository
        ↓
2. Read applicable instructions
        ↓
3. Check Git status
        ↓
4. Identify relevant files
        ↓
5. Read existing implementation
        ↓
6. Search for related functionality
        ↓
7. Understand dependencies and conventions
        ↓
8. Plan the smallest safe change
        ↓
9. Implement
        ↓
10. Search for broken references
        ↓
11. Run relevant validation
        ↓
12. Review git diff
        ↓
13. Check for accidental changes
        ↓
14. Report changes and validation
```

Do not blindly edit files based only on filenames.

---

# 63. AI Agents Must Not Hallucinate Repository State

An agent must never claim that:

* A file exists when it was not inspected.
* A test exists when it was not found.
* A command passed when it was not run.
* A dependency exists when it was not verified.
* An API exists when it was not found.
* A feature is implemented when it was not verified.
* A migration succeeded when it was not executed.
* A deployment succeeded when it was not verified.

When uncertain:

```text
Inspect first.
```

If something cannot be verified:

```text
State the uncertainty clearly.
```

---

# 64. Ambiguous Requirements

When a task is ambiguous, first determine whether the repository provides enough context to resolve the ambiguity.

Use:

* Existing implementation
* Existing conventions
* Existing tests
* Existing documentation
* Existing API contracts
* Existing naming
* Existing architecture

If ambiguity materially affects the implementation and cannot be resolved from the repository, ask for clarification rather than making a risky assumption.

For minor implementation details, choose the option most consistent with existing project conventions.

---

# 65. Scope Control

Every task has a scope.

Before changing a file, ask:

```text
Is this required to complete the requested task?
```

If no:

```text
Do not change it.
```

Avoid scope creep such as:

* Unrelated refactoring
* Formatting unrelated files
* Dependency upgrades
* Architecture redesign
* Documentation rewrites
* Naming cleanup
* Performance optimization
* Test framework changes

unless directly relevant.

---

# 66. Avoid Unnecessary Abstraction

Do not create abstractions merely because they appear theoretically cleaner.

Avoid introducing:

* Wrapper functions with no meaningful reuse
* Generic base classes without multiple use cases
* Extra service layers without architectural need
* Configuration systems for one value
* Utilities used only once
* Complex factories for simple construction
* Extra state layers
* Extra interfaces without a purpose

Prefer simple code that matches the repository.

---

# 67. Avoid Duplicate Implementations

Before creating a new:

* Utility
* Component
* Service
* Hook
* Helper
* Validator
* API client
* Repository
* Middleware
* Configuration loader

search the repository.

If similar functionality exists:

* Reuse it.
* Extend it.
* Refactor it carefully if necessary.

Do not create near-duplicates.

---

# 68. Naming Conventions

Follow the repository's existing naming conventions.

Do not arbitrarily change:

```text
camelCase
PascalCase
snake_case
kebab-case
SCREAMING_SNAKE_CASE
```

for existing code.

New names should match nearby code.

Names should communicate purpose.

Avoid vague names such as:

```text
data
thing
temp
helper
utils2
newService
test2
finalComponent
```

unless the repository intentionally uses such conventions.

---

# 69. Comments

Write comments when they explain:

* Why something exists
* Why a non-obvious decision was made
* A compatibility constraint
* A security requirement
* A tricky algorithm
* An external-system limitation

Avoid comments that merely restate the code.

Bad:

```text
// Increment i
i++;
```

Better:

```text
// Preserve ordering because the downstream API depends on stable item positions.
```

Do not leave stale comments after refactoring.

---

# 70. Code Formatting

Follow the repository's formatter.

Do not introduce a new formatter for a small task.

Avoid reformatting unrelated files.

If formatting is automatic:

* Run the existing formatter when appropriate.
* Review the resulting diff.
* Ensure formatting did not modify unrelated code.

---

# 71. Type Safety

If the repository uses a type system:

* Follow existing type conventions.
* Avoid unnecessary `any`/unsafe casts.
* Preserve public type contracts.
* Update related types when APIs change.
* Do not suppress type errors without understanding them.

If the repository does not use static typing, do not introduce a type system solely for one small feature unless requested.

---

# 72. Data Flow

When modifying a feature, understand its data flow.

For example:

```text
Input
  ↓
Validation
  ↓
Transformation
  ↓
Business Logic
  ↓
Persistence / External Service
  ↓
Response
  ↓
UI / Consumer
```

Determine which stages actually exist.

Avoid introducing duplicate transformations or validation.

---

# 73. Async and Concurrency

If the project uses asynchronous or concurrent operations:

* Follow existing patterns.
* Understand error propagation.
* Preserve cancellation behavior where applicable.
* Avoid unhandled promises/futures/tasks.
* Avoid race conditions.
* Avoid unnecessary parallelism.
* Avoid blocking operations in asynchronous execution paths.

Do not convert synchronous code to asynchronous code unnecessarily.

---

# 74. Resource Management

When code uses:

* Files
* Database connections
* Network connections
* Streams
* Processes
* Threads
* Locks
* Temporary resources

ensure resources are properly managed.

Follow the language/framework's existing cleanup patterns.

Avoid introducing leaks through:

* Unclosed files
* Unreleased connections
* Persistent listeners
* Timers
* Background processes
* Unbounded caches

---

# 75. API and External Failure Handling

External operations can fail.

Consider existing behavior for:

* Timeout
* Network failure
* Authentication failure
* Rate limiting
* Invalid response
* Partial response
* Service unavailable
* Malformed data

Follow the repository's existing retry/fallback conventions.

Do not add aggressive retries without understanding the consequences.

---

# 76. Testing Failure Paths

Where appropriate, test:

* Invalid input
* Missing data
* Unauthorized access
* Not-found cases
* Duplicate data
* Network failures
* Database failures
* Empty states
* Boundary values
* Unexpected external responses

Do not test every theoretical possibility if the repository does not use that level of coverage, but do not ignore obvious failure paths for important functionality.

---

# 77. UI Error and Loading States

If the project contains a user interface, consider existing patterns for:

* Loading
* Empty state
* Error state
* Retry
* Disabled actions
* Validation feedback
* Success feedback

Reuse existing UI patterns.

Do not introduce inconsistent error messages or loading indicators for one feature.

---

# 78. Accessibility

When modifying user interfaces, preserve or improve accessibility.

Consider:

* Semantic elements
* Keyboard navigation
* Labels
* Focus behavior
* Form accessibility
* Contrast
* Screen-reader information
* Error announcements
* Disabled-state semantics

Follow the project's existing accessibility conventions.

Do not remove accessible behavior during visual refactors.

---

# 79. Localization and Internationalization

If the project supports localization:

* Reuse existing translation mechanisms.
* Do not hardcode user-facing strings where the project expects translations.
* Preserve translation keys.
* Consider pluralization and formatting.
* Update translation resources when required.

If the project does not use localization, do not introduce a localization system for a small unrelated feature.

---

# 80. Time, Dates, and Localization

When working with dates and times:

* Inspect existing timezone handling.
* Follow existing date libraries.
* Preserve existing serialization formats.
* Do not assume local time is UTC.
* Do not change date formats casually.

Date-related changes can affect APIs, databases, UI, and users in different regions.

---

# 81. File and Path Handling

When handling filesystem paths:

* Follow platform-safe path conventions.
* Do not assume path separators.
* Validate user-controlled paths.
* Consider path traversal.
* Preserve existing storage conventions.

Do not hardcode absolute local-machine paths.

---

# 82. CLI Applications

If the repository is a CLI application:

* Inspect command definitions.
* Follow existing argument parsing.
* Preserve exit-code conventions.
* Preserve output conventions.
* Reuse existing command helpers.
* Update help text when behavior changes.
* Test invalid arguments when appropriate.

Do not redesign the CLI for a small command addition.

---

# 83. Libraries and SDKs

If the repository is a library or SDK:

Treat exported APIs as especially sensitive.

Before changing an exported function/class/type:

* Search consumers.
* Check public documentation.
* Check examples.
* Check tests.
* Consider semantic versioning.
* Consider backward compatibility.

Avoid breaking consumers without explicit authorization.

---

# 84. Security-Sensitive Changes

For security-sensitive changes:

1. Identify the trust boundary.
2. Identify inputs.
3. Identify authorization requirements.
4. Identify sensitive data.
5. Check logging.
6. Check error messages.
7. Check configuration.
8. Check tests.
9. Review the complete affected flow.

Do not declare a security change complete based solely on compilation.

---

# 85. Destructive Operations

Treat the following as high risk:

* Deleting data
* Dropping database tables/collections
* Removing migrations
* Removing public APIs
* Deleting branches
* Force pushing
* Resetting user changes
* Replacing configuration
* Removing authentication
* Changing permissions
* Bulk file deletion

Before performing a destructive operation:

* Confirm it is required.
* Inspect dependencies.
* Check whether backup/recovery exists.
* Obtain explicit authorization when appropriate.
* Validate the result.

---

# 86. Do Not Destroy User Work

Never silently overwrite work that was already present.

If a file contains existing changes:

```text
Read → Understand → Preserve → Modify only what is necessary
```

Do not use destructive commands to create a clean starting point.

The user's existing work is part of the repository state.

---

# 87. Generated Code and Code Generation

If the project uses generated code:

* Identify the source of truth.
* Modify the source rather than generated output when appropriate.
* Run the generator.
* Review generated changes.
* Do not manually edit generated files unless explicitly required.

Examples:

```text
API clients
database clients
schema types
protobuf output
OpenAPI clients
ORM code
code-generated documentation
```

---

# 88. Temporary Debugging

Temporary debugging is allowed during development.

Examples:

```text
console logs
debug output
temporary files
diagnostic scripts
instrumentation
```

Before completing the task:

* Remove unnecessary debugging code.
* Remove temporary files.
* Remove accidental logs.
* Ensure no secrets were printed.
* Review the final diff.

---

# 89. Final Validation

Before considering a task complete:

### Repository

* [ ] Repository structure was inspected.
* [ ] Applicable instructions were read.
* [ ] Existing architecture was understood.
* [ ] Existing patterns were reused where appropriate.

### Implementation

* [ ] Requested functionality is implemented.
* [ ] Existing behavior is preserved where required.
* [ ] No unnecessary architecture was introduced.
* [ ] No unnecessary dependencies were added.
* [ ] No duplicate implementations were created.

### References

* [ ] Imports are valid.
* [ ] Exports are valid.
* [ ] Moved files have updated references.
* [ ] Old paths/names were searched.
* [ ] Dynamic references were considered where applicable.

### Security

* [ ] No secrets were added.
* [ ] No credentials were exposed.
* [ ] Authorization behavior was reviewed where relevant.
* [ ] Sensitive information is not logged.
* [ ] User-controlled input is handled appropriately.

### Testing

* [ ] Relevant tests were run.
* [ ] Relevant build checks were run.
* [ ] Relevant lint/type checks were run.
* [ ] Manual verification was performed where automated coverage is unavailable.
* [ ] Failed or unavailable checks are documented.

### Git

* [ ] Git status was reviewed.
* [ ] Git diff was reviewed.
* [ ] `git diff --check` was run when applicable.
* [ ] No unrelated files were modified.
* [ ] No user changes were discarded.
* [ ] No accidental generated files were added.

### Documentation

* [ ] Documentation was updated if required.
* [ ] Configuration changes were documented if required.
* [ ] Breaking changes were identified.
* [ ] Migration requirements were identified.

---

# 90. Final Response Requirements for AI Agents

After completing a task, the agent should clearly report:

### What changed

Summarize the actual implementation.

### Files changed

List important files or directories affected.

### Validation

Report exactly what was run.

For example:

```text
Validation:
- Unit tests: passed
- Typecheck: passed
- Build: passed
- git diff --check: passed
```

If something was not run:

```text
Not run:
- End-to-end tests — no configured E2E test command exists.
```

Do not claim successful validation that was not actually performed.

### Notes

Mention:

* Warnings
* Known limitations
* Breaking changes
* Required follow-up
* Environment-dependent behavior

Keep the final report factual and concise.

---

# 91. Universal Decision Framework

When deciding how to implement a change, use this order:

```text
1. What does the repository already do?
        ↓
2. Is there an existing implementation?
        ↓
3. What is the established project pattern?
        ↓
4. What is the smallest change that fits that pattern?
        ↓
5. What could this change break?
        ↓
6. How can that risk be validated?
```

Do not start with:

```text
What architecture would I personally choose?
```

Start with:

```text
What architecture does this repository already use?
```

---

# 92. When to Refactor

Refactor when:

* The task requires it.
* Existing duplication blocks the requested feature.
* The current structure makes the requested change unsafe.
* A small targeted refactor clearly reduces risk.

Do not refactor merely because:

* The code could be prettier.
* Another pattern is more popular.
* The agent prefers another framework.
* The naming is not personally preferred.
* A different directory structure looks cleaner.

---

# 93. When to Ask for Clarification

Ask for clarification when:

* Two requirements conflict.
* The requested behavior is fundamentally ambiguous.
* The repository does not provide enough information.
* The change could cause irreversible data loss.
* Multiple incompatible API behaviors are possible.
* A security-sensitive decision cannot be safely inferred.
* The task requires choosing between materially different architectures.
* User intent determines an important irreversible action.

Do not ask unnecessary questions when repository inspection already resolves the issue.

---

# 94. When to Proceed Without Asking

Proceed when:

* The repository clearly establishes the pattern.
* The requested change is straightforward.
* Existing code resolves the ambiguity.
* The change is reversible.
* The implementation can safely follow established conventions.

Use repository evidence rather than personal preference.

---

# 95. Universal Final Principle

Always prefer:

```text
Understand
    ↓
Inspect
    ↓
Reuse
    ↓
Modify minimally
    ↓
Validate
    ↓
Review
```

over:

```text
Guess
    ↓
Rewrite
    ↓
Add dependencies
    ↓
Change architecture
    ↓
Hope it works
```

The goal is to keep every repository:

* Maintainable
* Predictable
* Secure
* Consistent
* Testable
* Understandable
* Backward-conscious
* Easy for humans to contribute to
* Easy for AI coding agents to contribute to safely

The repository's existing implementation is the source of truth.

**Do not guess. Inspect.**

**Do not rewrite unnecessarily. Reuse.**

**Do not change unrelated code. Stay within scope.**

**Do not claim validation you did not perform.**

**Do not destroy existing work. Preserve it.**

**Do not introduce architecture without understanding the existing architecture.**

**Do not optimize for the agent. Optimize for the maintainability and correctness of the repository.**
