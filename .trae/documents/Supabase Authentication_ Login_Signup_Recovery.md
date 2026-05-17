## Overview
- Implement a responsive, accessible authentication flow (login, signup, password recovery) using the existing DOBIUM Supabase project.
- Gate the app behind auth: show login first; on success, transition to main app, persist session.
- Match current slate/yellow/amber aesthetics with Tailwind utilities already used.

## Use Existing DOBIUM Supabase
- Read `SUPABASE_URL` and `SUPABASE_ANON_KEY` from the existing environment (no new Supabase project).
- Configure email verification and password reset to redirect back into the app.

## Config Injection
- Serve `GET /config/supabase.js` that returns: `window.SUPABASE_CONFIG = { url: process.env.SUPABASE_URL, anonKey: process.env.SUPABASE_ANON_KEY }`.
- Include this script before auth logic in the app so the client initializes Supabase with the DOBIUM project.

## UI/UX: Login View
- Implement a login view (either new `login.html` or a dedicated section inside `index.html`) with Tailwind:
  - Email and password inputs (labels, aria attributes, required, validation messages).
  - Buttons: Login, Create account, Forgot password.
  - Error banner and field-level messages; loading states during operations.
  - Mobile-responsive card; desktop-centered with `bg-slate-900/50` and amber accents.

## Signup Flow
- Fields: email, password, confirm password with strength meter (≥8 chars, upper/lower/digit/symbol).
- Call `supabase.auth.signUp({ email, password })` with email verification redirect.
- Show a confirmation UI instructing the user to verify email.

## Login Flow
- Call `supabase.auth.signInWithPassword({ email, password })`.
- Handle invalid credentials and network errors with clear messages; disable form during loading.
- On success, persist session and route to main app.

## Password Recovery
- “Forgot password” triggers `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
- Add `password-reset.html` view to handle the magic link: collect new password and call `supabase.auth.updateUser({ password })`.

## Session Management
- Initialize Supabase using `window.SUPABASE_CONFIG`.
- Listen to `supabase.auth.onAuthStateChange` for login/logout/refresh events.
- Persist session via Supabase; gate initial UI based on session presence.
- Add Sign Out that calls `supabase.auth.signOut()` and returns to login.

## App Flow 
- Initial screen is login; only show app views when a session exists.
- After login, navigate to dashboard/markets using existing functions (`showDashboard()` / `navigateTo('markets')`).

## Error Handling 
- Centralize Supabase error mapping to user-friendly messages.
- Show per-form error banners and field-level invalid states.
- Provide loading spinners and disabled states while requests are in flight.

## Security
- Do not log secrets; only expose Supabase anon key client-side.
- Validate inputs client-side; never store passwords locally.
- Ensure HTTPS in production; set proper CORS if needed.

## Testing
- E2E tests (Playwright) covering:
  - Signup with invalid/valid inputs; email verification prompt.
  - Login success/failure; error and loading states.
  - Password reset flow; setting new password.
  - Session persistence across reload and logout.
- Unit tests (Vitest/Jest) for validation helpers and session gating.
- Responsive and accessibility checks: tab order, focus states, contrast.

## Deliverables
- Login/Signup/Password-reset views/components with Tailwind styling.
- Supabase client init bound to the existing SAMSA project.
- Config endpoint; session management; routing gate.
- Test suite and scripts to run locally.

## Confirmation
- If you prefer embedding auth as a view inside `index.html` rather than a separate `login.html`, I’ll implement that path. Otherwise I will create a dedicated `login.html` and a `password-reset.html` with seamless transitions into the main app.