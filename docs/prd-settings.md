# Settings Page -- PRD

**Status:** Draft
**Author:** zzoo
**Last Updated:** 2026-03-09
**Full PRD:** docs/prd.md
**Phase:** 1 (Core Loop MVP)

---

## Table of Contents

- [1. Problem / Opportunity](#1-problem--opportunity)
- [2. Target Users & Use Cases](#2-target-users--use-cases)
- [3. Proposed Solution](#3-proposed-solution)
- [4. Goals & Success Metrics](#4-goals--success-metrics)
- [5. Functional Requirements](#5-functional-requirements)
- [6. User Journeys](#6-user-journeys)
- [7. Scope & Non-Goals](#7-scope--non-goals)
- [8. Assumptions, Constraints & Risks](#8-assumptions-constraints--risks)
- [9. Appendix](#9-appendix)

---

## 1. Problem / Opportunity

### The Problem

Narrex currently has no settings surface. Users who authenticate via Google OAuth have a display name and profile image URL stored in the database, but no way to view or update this information. The theme toggle exists in the UI but the preference is stored only in `localStorage` with no system preference option. Language preference defaults to Korean with no exposed way to switch to English. And critically, there is no way to log out or delete an account.

This matters for three reasons:

1. **Regulatory compliance.** GDPR and Korea's Personal Information Protection Act (PIPA) require that users can access, modify, and delete their personal data. Without account management, Narrex cannot legally serve users in the EU or properly comply with Korean data protection law.
2. **Basic user trust.** Users who see their Google profile information in the app but cannot control it feel a loss of agency. The same applies to users who cannot log out -- particularly on shared devices.
3. **Preference persistence.** The current theme and language controls are either incomplete (no system preference for theme) or hidden (no language toggle). Writers who work in multi-hour sessions need the app to behave the way they expect from the first interaction.

### Why Now

Settings is a Phase 1 requirement because:

- **Account deletion is a legal baseline.** Launching without it exposes the product to regulatory risk before any users arrive.
- **Logout must exist before beta launch.** Invite-only beta users (20-50 people per Phase 1 timeline) will use shared devices and test on multiple accounts.
- **Theme and language preferences are already implemented** in the frontend but lack proper UI surface and persistence. The infrastructure exists; the settings page is the missing wiring.

### Evidence Summary

- `user_account` table stores `display_name` and `profile_image_url` but no API endpoint exists to update them.
- Theme store (`shared/stores/theme.ts`) supports light/dark toggle via `localStorage`. No system preference option.
- i18n store (`shared/lib/i18n.tsx`) supports ko/en but defaults to ko with no persistent preference or user-facing language switch.
- UX design doc (docs/ux-design.md, line 28) explicitly states: "No settings page." This was a simplification decision that must be revisited now that account management requirements are clear.
- Information architecture (docs/ux-design.md, lines 94-96) already reserves a skeleton: Account Settings > Profile and Account Settings > Subscription/Billing [Phase 2].

---

## 2. Target Users & Use Cases

### Primary Persona: Ji-yeon (Aspiring Writer)

Same persona as the main PRD. Relevant context for settings: Ji-yeon uses her personal laptop. She signed in with Google, saw her Google profile name appear in the nav, and wants to change her display name to a pen name she uses on writing communities. She also prefers her laptop in dark mode with system preference follow-through, not a hardcoded theme.

**JTBD:** "When I'm setting up my writing workspace, I want the app to match my preferences (theme, language, display name) without me having to figure out where to change them, so I can focus on my story instead of fiddling with the tool."

### Secondary Persona: Min-ho (Struggling Serializer)

Uses a work laptop and a personal desktop. Needs to log out of Narrex on his work machine. If he ever stops using the product, he wants his data gone.

**JTBD:** "When I'm done using the app on a device, I want to log out and know my account is secure, and if I stop using the product entirely, I want to delete my account and all my data."

### Top Use Cases (ordered by importance)

1. **Logout.** User ends their session, especially on shared or secondary devices.
2. **Account deletion.** User permanently removes their account and all associated data.
3. **Update display name.** User changes from their Google name to a pen name.
4. **Theme preference.** User sets theme to system/light/dark with persistence.
5. **Language preference.** User switches between Korean and English.
6. **View profile information.** User sees their email, name, and profile image as the app knows them.

---

## 3. Proposed Solution

### Elevator Pitch

A single settings page accessible from the user's avatar in the navigation bar. Three sections: profile (view and edit identity), preferences (theme and language), and account management (logout, delete). Minimal, functional, and fast -- a user should be in and out in under 30 seconds.

### Core Value Propositions

1. **Control over identity.** Writers can present themselves with a pen name rather than their Google account name. (Solves: profile customization for a creative tool.)
2. **Workspace matches expectations.** Theme follows system preference by default; language is switchable. No surprises on first load. (Solves: preference persistence.)
3. **Trust through transparency.** Users can see what data the app holds, log out, and delete everything. (Solves: regulatory compliance and user trust.)

### Mental Model

Think of it as the "gear icon" in any creative tool (Figma, Notion, VS Code). Not a destination -- a utility. Users visit rarely, configure once, and forget about it. The settings page should be so simple that it never needs a tutorial.

---

## 4. Goals & Success Metrics

| Goal | Metric | Counter-metric | Target | Timeframe |
|------|--------|----------------|--------|-----------|
| Settings are findable | % of users who visit settings at least once within first 7 days | Time spent on settings page (should be low -- visit, configure, leave) | 60% of active users visit settings within first week | 4 weeks post-launch |
| Account deletion works | % of deletion requests that complete successfully (data fully purged) | False deletion rate (accidental deletions leading to support requests) | 100% completion, <2% accidental deletion | Ongoing |
| Preferences persist | % of users whose theme/language preference survives across sessions | N/A | 95%+ persistence rate | 4 weeks post-launch |

These are hygiene metrics, not growth metrics. Settings should work invisibly. If users are spending significant time on settings or contacting support about preference issues, something is wrong.

---

## 5. Functional Requirements

### 5.1 Profile

```
REQ-S01  User can view their profile information: display name, email address
         (read-only, sourced from Google OAuth), and profile image.

REQ-S02  User can update their display name. The updated name is reflected
         everywhere in the app (navigation bar, any future collaboration or
         export features). Display name has a minimum length of 1 character
         and a maximum of 50 characters.

REQ-S03  User can update their profile image by providing a URL. The app
         displays the image from the URL. No file upload in Phase 1.
         If the URL is invalid or unreachable, the app falls back to a
         generated initial-based avatar.
```

### 5.2 Preferences

```
REQ-S04  User can set their theme preference to one of three options: System
         (follows OS preference and responds to OS-level changes in real time),
         Light, or Dark. The preference persists across sessions. Default for
         new users: System.

REQ-S05  User can set their language preference to Korean or English.
         The preference persists across sessions. Changing language updates
         all UI text immediately without a page reload. Default for new
         users: Korean.

REQ-S06  Theme and language preferences are stored server-side (associated
         with the user account) so they persist across devices. On first load,
         server-side preference takes priority over any locally cached value.
```

### 5.3 Account Management

```
REQ-S07  User can log out. Logging out invalidates the current session
         (clears access token and refresh token) and redirects to the
         login page.

REQ-S08  User can request account deletion. The deletion process requires
         explicit confirmation: user must type a confirmation phrase (e.g.,
         "delete my account" / "계정 삭제") to proceed. Upon confirmation,
         the system permanently deletes the user account and all associated
         data (projects, scenes, characters, drafts, generation logs).
         Deletion is irreversible.

REQ-S09  Before account deletion executes, the system displays a summary of
         what will be deleted: number of projects, total scenes, and total
         drafts. This gives the user a clear understanding of the
         consequences.
```

### 5.4 Navigation

```
REQ-S10  Settings is accessible from the user's avatar or name in the
         navigation bar. Clicking the avatar opens a dropdown menu with
         at minimum: "Settings" and "Log out". The settings page is a
         full-page view (not a modal or panel), consistent with the
         information architecture in docs/ux-design.md.
```

---

## 6. User Journeys

### Journey 1: First-Time Preference Setup

1. User logs in with Google OAuth for the first time and lands on the dashboard.
2. User notices their Google display name in the navigation bar. They want to change it to a pen name.
3. User clicks their avatar in the nav bar. A dropdown appears with "Settings" and "Log out."
4. User clicks "Settings." The settings page loads with three sections: Profile, Preferences, Account.
5. User updates their display name from "Kim Ji-yeon" to "moonlight_writer."
   - If name is empty or exceeds 50 characters, inline validation prevents submission.
6. System saves the change. The navigation bar immediately reflects the new name.
7. User scrolls to Preferences. Theme is set to "System" (default). User's OS is in dark mode, so the app is already dark. User leaves it as-is.
8. User sees Language set to Korean. Leaves it as-is.
9. User navigates back to the dashboard (via nav bar or browser back). Total time on settings: under 30 seconds.

### Journey 2: Logout

1. User is on any page in the app.
2. User clicks their avatar in the nav bar. Dropdown appears.
3. User clicks "Log out."
4. System clears tokens and redirects to the login page.
5. If user navigates back (browser back button), they see the login page, not the app.

### Journey 3: Account Deletion

1. User opens Settings from the avatar dropdown.
2. User scrolls to the Account section at the bottom.
3. User clicks "Delete Account." A confirmation dialog appears.
4. Dialog shows: "This will permanently delete your account and all data: 3 projects, 47 scenes, 32 drafts. This cannot be undone."
5. User must type the confirmation phrase to enable the delete button.
   - If phrase does not match, the delete button remains disabled.
6. User types the phrase and clicks "Delete Account."
7. System deletes all user data, invalidates the session, and redirects to a confirmation page or the login page with a "Your account has been deleted" message.
8. If user tries to log in again with the same Google account, a new account is created (no ghost data from the deleted account).

**Drop-off risk:** Step 5 (confirmation phrase). Intentionally high friction -- this is a destructive, irreversible action. The friction is the feature.

### Journey 4: Language Switch

1. User opens Settings.
2. User changes language from Korean to English.
3. All UI labels, buttons, and text update immediately. The settings page itself updates in place.
4. User navigates to the workspace. All workspace text is now in English.
5. User logs out and logs back in on a different device. The app loads in English (server-side preference).

---

## 7. Scope & Non-Goals

### In Scope

- Profile viewing and editing (display name, profile image URL)
- Theme preference with system/light/dark options and server-side persistence
- Language preference with ko/en options and server-side persistence
- Logout with session invalidation
- Account deletion with data purge and confirmation flow
- Avatar dropdown menu in navigation bar

### Out of Scope

- **Profile image upload** (Phase 1 uses URL-based images; file upload requires object storage infrastructure that does not exist yet. Revisit when/if object storage is added for other features.)
- **Subscription and billing management** (Phase 2 per the main PRD and information architecture.)
- **Notification preferences** (No notification system exists or is planned for Phase 1-2.)
- **Password management** (Authentication is Google OAuth only. No password to manage.)
- **Linked accounts** (Single Google OAuth provider in Phase 1. Adding Kakao/Naver OAuth is a separate feature.)
- **Export/download personal data** (GDPR "data portability" right. Can be addressed with the Phase 2 export feature. Account deletion addresses the "right to erasure" in Phase 1.)
- **Session management** (viewing/revoking active sessions across devices). Single-device usage expected in Phase 1.

### What This Document Does NOT Cover

- UI/UX design, wireframes, interaction patterns, visual specs (to be defined in docs/ux/settings.md)
- API endpoint design (to be defined in the design doc or OpenAPI spec)
- Database migration details (covered in database design doc)

---

## 8. Assumptions, Constraints & Risks

### Assumptions

| Assumption | Validation Plan | Impact if Wrong |
|------------|-----------------|-----------------|
| Users will find settings via the avatar dropdown. This is a standard pattern in web apps. | Post-launch: track settings page visit rate. If below 40% in first week, add a first-time prompt. | Low. Settings are infrequently needed. Users who cannot find settings can still use the core product. |
| Storing preferences server-side (theme, language) is worth the added API complexity vs. localStorage-only. | Observe whether users access from multiple devices. If >80% use a single device, server-side sync adds little value. | Low. Can always fall back to localStorage. The API endpoints still serve account deletion and profile updates. |
| Google profile image URLs remain accessible after initial OAuth. If Google changes or expires the URL, the avatar breaks. | Monitor broken avatar images in error tracking. | Low. Fallback to initial-based avatar is specified in REQ-S03. |

### Constraints

- **No object storage.** Profile image must be URL-based (no upload). The design doc confirms no object storage in Phase 1.
- **Single auth provider.** Settings cannot show "connected accounts" or provider management. Google-only.
- **Single developer.** Settings implementation competes with core loop features for development time. Must be as minimal as possible.

### Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Account deletion fails to purge all data (orphaned records in generation_log or other tables) | High | Low | generation_log uses ON DELETE SET NULL for project_id and scene_id, but user_id is a FK. Deletion must cascade or explicitly purge generation_log rows. Write integration tests that verify zero rows remain for a deleted user across all tables. |
| Confirmation phrase for account deletion is frustrating in Korean (input method complexity) | Medium | Low | Keep the phrase short and common. Test with Korean input methods (Hangul IME) during development. Consider a simpler confirmation mechanism (checkbox + button) if user testing reveals friction. |
| Theme preference migration: existing users have localStorage preferences that may conflict with the new server-side default | Low | Medium | On first load after the migration, read localStorage preference, send it to the server as the initial value, then clear the localStorage key. Graceful one-time migration. |

---

## 9. Appendix

### Database Impact

New columns needed on `user_account`:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `theme_preference` | `TEXT CHECK (theme_preference IN ('system', 'light', 'dark'))` | `'system'` | Server-side theme preference |
| `language_preference` | `TEXT CHECK (language_preference IN ('ko', 'en'))` | `'ko'` | Server-side language preference |

Account deletion requires deletion across all tables with `user_id` FK:
- `project` (CASCADE handles tracks, scenes, characters, drafts, etc.)
- `generation_log` (must be explicitly deleted or SET NULL on user_id)

### API Endpoints (Indicative)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/users/me` | Retrieve current user profile and preferences |
| PATCH | `/api/users/me` | Update display name, profile image URL, theme, language |
| POST | `/api/auth/logout` | Invalidate session |
| DELETE | `/api/users/me` | Delete account and all data |

### Requirement Cross-Reference

These requirements (REQ-S01 through REQ-S10) are new. They do not exist in the main PRD (docs/prd.md). The main PRD and Phase 1 PRD should be updated to reference this feature PRD and include settings in the Phase 1 scope.

### Related Documents

- Full PRD: docs/prd.md
- Phase 1 PRD: docs/prd-phase-1.md
- UX Design: docs/ux-design.md
- Database Design: docs/database-design.md
- Design Document: docs/design-doc.md
