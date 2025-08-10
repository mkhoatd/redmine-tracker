# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application that integrates Redmine project management with AI-powered time estimation. It fetches tasks from Redmine, uses Claude AI to estimate hours, and intelligently distributes time entries across business days.

## Development Commands

```bash
# Development
npm run dev        # Start development server with Turbopack
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

## Environment Setup

Create a `.env.local` file with:
```bash
REDMINE_URL=https://your-redmine-instance.com
```

Note: Redmine API keys are user-specific and configured through the web interface, not environment variables.

## Architecture Overview

### Data Flow
1. **User Configuration**: Users enter their personal Redmine API key (stored in localStorage)
2. **Server Actions**: All API calls go through server actions in `/app/actions/`
3. **AI Estimation**: Claude estimates task hours via Anthropic SDK
4. **Time Distribution**: Smart algorithm distributes hours across business days
5. **Redmine API**: Creates time entries via REST API

### Key Architectural Decisions

- **Hybrid Configuration**: Admin sets environment variables (Redmine URL, Anthropic key), users provide their own Redmine API keys
- **Server Actions**: All sensitive operations (API calls) happen server-side using Next.js server actions
- **No State Management Library**: Uses React hooks for state (simple enough not to need Redux/Zustand)
- **Time Distribution Algorithm**: Custom logic that respects business days, max 8 hours/day, and rounds to 15-minute increments

### Core Modules

**Server Actions** (`/app/actions/`)
- `ai-estimation.ts`: Interfaces with Anthropic API, handles both single and batch estimation
- `redmine.ts`: Wraps all Redmine API operations, uses `getRedmineConfig()` helper to combine env vars with user API key

**Business Logic** (`/lib/`)
- `redmine-client.ts`: Axios-based HTTP client for Redmine REST API
- `time-distribution.ts`: Algorithm for spreading hours across workdays (excludes weekends, respects daily limits)

**UI Components** (`/components/`)
- `task-list.tsx`: Displays issues with checkboxes and hour inputs
- `time-entry-preview.tsx`: Shows planned entries before creation

### API Integration Patterns

**Redmine API**:
- Base URL from `REDMINE_URL` env var
- API key passed from client (user-specific)
- All requests go through `RedmineClient` class
- Handles `/issues.json` and `/time_entries.json` endpoints

### Time Distribution Logic

The `distributeTimeEntries` function implements:
- Business days only (Monday-Friday)
- Maximum 8 hours per day
- Minimum 0.5 hour entries
- Rounds to 0.25 hour increments
- Distributes larger tasks first for better balance
- Generates contextual comments for each entry

## Testing Approach

No test framework is currently configured. When adding tests:
- Unit tests would go in `__tests__` directories
- Server action tests would mock API responses
- Time distribution logic is prime candidate for unit testing

## Common Patterns

- Always check for API key before making Redmine calls
- Use try-catch with proper error messages in server actions
- Return `{ success, data, error }` objects from server actions
- Store user preferences in localStorage
- Show loading states during async operations
