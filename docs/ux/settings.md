# Settings

**Route:** `/settings`
**Primary action:** Save profile changes (display name)
**Entry points:** Avatar dropdown in nav bar (all pages), direct URL

---

## 1. Overview

### Role

The settings page is a utility screen -- not a destination. Users visit rarely, configure once, and forget about it. It handles identity (profile), environment (theme, language), and account lifecycle (logout, deletion). Mental model: the "gear icon" in creative tools like Figma, Notion, or VS Code.

### JTBD

"When I'm setting up my writing workspace, I want to quickly update my preferences and identity so I can focus on my story instead of fiddling with the tool."

### Design Rationale

- **Single scrollable page, not tabs or sidebar nav.** The total content is 3 short sections (profile, preferences, account). Splitting into tabs would violate Hick's Law (adds navigation decisions for minimal content) and slow the user's core goal of "in and out in 30 seconds." (Cognitive Load: show only what's needed)
- **Sections ordered by frequency of use.** Profile first (most common on first visit), preferences second (occasional), account management last (rarely needed, highest stakes). (Serial Position Effect: most important first and last)
- **No auto-save for profile fields.** Unlike workspace config (auto-save on debounce), profile changes require explicit "Save Changes" button. Rationale: display name changes propagate app-wide. Explicit save gives the user control and prevents accidental identity changes. (Forgiveness: confirm before committing)
- **Direct avatar upload (not URL input).** Profile images are uploaded via clickable avatar with hover overlay. Files are stored on Cloudflare R2 (S3-compatible). This avoids the UX friction of asking non-technical users for a URL and prevents broken images from invalid URLs. (Affordance: clickable avatar is a familiar pattern from Slack, Discord, Figma)
- **Auto-apply for preferences (theme, language).** These are low-risk, instantly reversible, and users expect immediate feedback. Optimistic UI with server sync in background. (Doherty Threshold: <400ms response; Optimistic UI pattern)

---

## 2. Navigation Entry Point -- Avatar Dropdown

The avatar dropdown appears on every page with a top header bar (dashboard, workspace). It is the single entry point to settings and quick logout.

### Current State (Dashboard)

The dashboard already has an avatar button + dropdown with user name, email, and "Log out." This spec extends it with a "Settings" link.

### Avatar Dropdown Wireframe

```
                                          [avatar]
                                             |
                              +------------------------------+
                              | Ji-yeon Kim                  |
                              | jiyeon@gmail.com             |
                              |------------------------------|
                              | [gear]  Settings             |
                              |------------------------------|
                              | [door]  Log out              |
                              +------------------------------+
```

### Avatar Dropdown Spec

| Property | Value |
|----------|-------|
| Trigger | Click on avatar button (44x44 tap target) |
| Position | `absolute right-0 top-full mt-1`, origin top-right |
| Width | `w-56` (224px) |
| Background | `bg-surface-raised` |
| Border | `border border-border-default rounded-lg` |
| Shadow | `shadow-xl shadow-black/30` |
| Animation | `animate-scale-in origin-top-right` (200ms ease-out). Reduced motion: instant. |
| Dismiss | Click outside, Escape key, or re-click avatar |
| z-index | 50 |

### Dropdown Content

1. **User info block** (`px-3 py-2`): Display name (`.text-sm.font-medium.text-fg.truncate`) + email (`.text-xs.text-fg-muted.truncate`).
2. **Separator** (`h-px bg-border-default mx-2 my-1`).
3. **Settings link**: Icon (gear) + "Settings" label. Full-width button style, navigates to `/settings`.
4. **Separator**.
5. **Log out button**: Icon (door/exit) + "Log out" label. Full-width button style, executes logout.

### Dropdown Interaction

| Action | Result |
|--------|--------|
| Click "Settings" | Close dropdown, navigate to `/settings` |
| Click "Log out" | Close dropdown, clear tokens, redirect to login page |
| Click outside | Close dropdown |
| Press Escape | Close dropdown, return focus to avatar button |
| Press Tab | Move focus through items; Tab past last item closes dropdown |
| Press ArrowDown/ArrowUp | Move focus between menu items |

### Accessibility

- Avatar button: `aria-haspopup="menu"`, `aria-expanded="true/false"`
- Dropdown: `role="menu"`
- Items: `role="menuitem"`, keyboard arrow navigation
- Focus: on open, focus moves to first menu item. On close, focus returns to avatar button.

### Changes to Existing Code

The dashboard already has an avatar dropdown. Required changes:
1. Add "Settings" menu item (with gear icon) between the user info block and "Log out"
2. Add a separator between "Settings" and "Log out"
3. Add `role="menu"` and `role="menuitem"` attributes
4. Add arrow key navigation
5. Replicate the same dropdown in the workspace header

---

## 3. Settings Page Layout

### Desktop Wireframe (>=768px)

```
+---------------------------------------------------------------+
| [<] Narrex                                      [avatar]      |
+---------------------------------------------------------------+
|                                                               |
|           Settings                                            |
|                                                               |
|           +-----------------------------------------------+   |
|           | PROFILE                                       |   |
|           |                                               |   |
|           |  +------+                                     |   |
|           |  | Img  |  Display Name                       |   |
|           |  | click|  [moonlight_writer           ]      |   |
|           |  +------+                                     |   |
|           |                                               |   |
|           |            Email                              |   |
|           |            jiyeon@gmail.com (read-only)       |   |
|           |                                               |   |
|           |                          [Save Changes]       |   |
|           +-----------------------------------------------+   |
|                                                               |
|           +-----------------------------------------------+   |
|           | PREFERENCES                                   |   |
|           |                                               |   |
|           |  Theme                                        |   |
|           |  [ System | Light | Dark ]                    |   |
|           |                                               |   |
|           |  Language                                     |   |
|           |  [ ko 한국어 | en English ]                   |   |
|           |                                               |   |
|           +-----------------------------------------------+   |
|                                                               |
|           +-----------------------------------------------+   |
|           | ACCOUNT                                       |   |
|           |                                               |   |
|           |  Log out                                      |   |
|           |  Sign out of your current session.            |   |
|           |                                     [Log out] |   |
|           |                                               |   |
|           |  -------------------------------------------- |   |
|           |                                               |   |
|           |  Delete Account                               |   |
|           |  Permanently delete your account and all      |   |
|           |  data.                                        |   |
|           |                            [Delete Account]   |   |
|           +-----------------------------------------------+   |
|                                                               |
+---------------------------------------------------------------+
```

### Layout Spec

| Property | Value |
|----------|-------|
| Page background | `bg-canvas` |
| Content width | `max-w-xl` (576px) centered. Optimal for form readability at ~60ch line length. (Ergonomics: content width cap for reading) |
| Top padding | `py-10` (40px) |
| Horizontal padding | `px-6` (24px) |
| Page title | "Settings" -- `text-2xl font-display font-semibold text-fg` |
| Section gap | `space-y-8` (32px between sections) |

### Section Card Spec

Each section is a card container:

| Property | Value |
|----------|-------|
| Background | `bg-surface` |
| Border | `border border-border-default rounded-xl` |
| Padding | `p-6` |
| Section label | `text-xs font-semibold text-fg-muted uppercase tracking-wide mb-6` |

### Header Bar

The settings page uses the same top bar as the dashboard:
- Left: back navigation (`[<] Narrex` or `[<] Settings title`)
- Right: avatar dropdown (same component as dashboard)
- Height: 56px (`h-14`), same as dashboard

Back navigation: clicking the logo or back arrow returns to the previous page (browser history) or dashboard as fallback. Uses standard `Link` to `/` with browser back as primary behavior.

---

## 4. Component Specs

### 4.1 Profile Section

#### Avatar with Upload

```
+------+
| Img  |  <- 64x64px, rounded-full, border border-border-default, clickable
+------+
  hover: dark overlay with "Change" text
  uploading: dark overlay with spinner
```

- Shows user's profile image if available (stored on Cloudflare R2)
- Falls back to initial-based avatar: first character of display name, centered in a circle with `bg-accent text-canvas font-display font-semibold text-xl`
- **Clickable** — opens native file picker on click
- Hover state: dark overlay (`bg-black/50`) with "Change" / "변경" text
- Uploading state: dark overlay (`bg-black/60`) with spinner animation
- Accepted formats: JPEG, PNG, WebP
- Max file size: 2MB
- Upload is immediate (no Save button needed) — avatar changes are atomic and low-risk
- Error states: invalid file type, file too large, upload failure — shown as inline text below the avatar

#### Display Name Field

| Property | Value |
|----------|-------|
| Label | "Display Name" / "표시 이름" |
| Input | `TextInput` component, `maxLength={50}` |
| Placeholder | `e.g., moonlight_writer` / `예: moonlight_writer` |
| Validation | Min 1 char, max 50 chars. Validate on blur. |
| Error (empty) | "Display name cannot be empty." / "표시 이름을 입력해주세요." |
| Error (too long) | "Display name must be 50 characters or fewer." / "표시 이름은 50자 이하여야 합니다." |
| Helper text | None (field is self-explanatory) |

#### Email Field

| Property | Value |
|----------|-------|
| Label | "Email" / "이메일" |
| Display | Read-only text (not an input field). `text-sm text-fg-secondary`. |
| Helper text | Small muted text below: "Managed by your Google account" / "Google 계정에서 관리됩니다" |
| Rationale | Read-only because email comes from Google OAuth. Showing it as plain text (not a disabled input) communicates "this isn't editable" more clearly than a grayed-out input. (Cognitive Load: reduce false affordances) |

#### Save Changes Button

| Property | Value |
|----------|-------|
| Label | "Save Changes" / "변경사항 저장" |
| Variant | `primary` |
| Position | Right-aligned at bottom of profile section |
| Enabled | Only when form is dirty (changes detected) AND valid |
| Disabled state | `opacity-50 cursor-not-allowed` when form is pristine or invalid |
| Loading state | Spinner replaces label text, button disabled |
| Success | Button briefly shows checkmark + "Saved" / "저장됨" for 2s, then reverts to "Save Changes" |
| Error | Inline error below button: "Couldn't save your changes. Check your connection and try again." / "변경사항을 저장하지 못했습니다. 연결을 확인하고 다시 시도하세요." + button re-enables |

**Rationale for explicit save (not auto-save):** Display name propagates to all UI surfaces. Unlike workspace preferences (auto-save, low risk), profile changes are identity-level and benefit from explicit confirmation. Avatar upload is separate — it applies immediately since it uses a controlled file picker with validation. (Forgiveness principle)

### 4.2 Preferences Section

#### Theme Toggle Group

A 3-option segmented control (not radio buttons, not dropdown). Segmented controls are the standard pattern for 2-4 mutually exclusive options in creative tools. (Jakob's Law)

```
[ System | Light | Dark ]
```

| Property | Value |
|----------|-------|
| Label | "Theme" / "테마" |
| Component | Segmented control / toggle group |
| Options | System / Light / Dark |
| Default | System |
| Selected state | `bg-accent text-canvas` pill within the group |
| Unselected state | `text-fg-secondary hover:text-fg` |
| Container | `bg-surface-raised rounded-lg p-1` |
| Behavior | Click applies immediately (optimistic UI). No save button needed. |
| Server sync | PATCH to `/api/users/me` in background. If fails, revert + toast error. |
| System behavior | When "System" is selected, app follows `prefers-color-scheme` media query and updates in real-time when OS setting changes. |

#### Language Toggle Group

A 2-option segmented control matching the theme toggle style.

```
[ 한국어 | English ]
```

| Property | Value |
|----------|-------|
| Label | "Language" / "언어" |
| Component | Segmented control / toggle group |
| Options | 한국어 (ko) / English (en) |
| Default | 한국어 |
| Selected state | Same as theme toggle |
| Behavior | Click applies immediately. All UI text on the current page updates without reload (REQ-S05). |
| Server sync | Same as theme -- background PATCH, revert on failure. |
| Important detail | When user switches language, the settings page labels themselves update (including this toggle's label "Language" / "언어"). This is correct and expected behavior. |

**Accessibility for toggle groups:**
- Container: `role="radiogroup"`, `aria-label="Theme"` or `aria-label="Language"`
- Each option: `role="radio"`, `aria-checked="true/false"`
- Keyboard: ArrowLeft/ArrowRight to move selection, change fires immediately
- Focus ring: `focus-visible` ring on the focused option

### 4.3 Account Section

#### Logout Row

```
Log out
Sign out of your current session.              [Log out]
```

| Property | Value |
|----------|-------|
| Title | "Log out" / "로그아웃" -- `text-base font-medium text-fg` |
| Description | "Sign out of your current session." / "현재 세션에서 로그아웃합니다." -- `text-sm text-fg-muted` |
| Button | `variant="secondary"`, label "Log out" / "로그아웃" |
| Action | Clear tokens, redirect to login page. No confirmation dialog (logout is non-destructive and reversible by re-login). (Anti-pattern check: no confirmation for reversible actions) |

#### Separator

`h-px bg-border-default my-4` between logout and delete sections.

#### Delete Account Row

```
Delete Account
Permanently delete your account and all data.  [Delete Account]
```

| Property | Value |
|----------|-------|
| Title | "Delete Account" / "계정 삭제" -- `text-base font-medium text-fg` |
| Description | "Permanently delete your account and all data." / "계정과 모든 데이터가 영구적으로 삭제됩니다." -- `text-sm text-fg-muted` |
| Button | `variant="danger"`, label "Delete Account" / "계정 삭제" |
| Action | Opens account deletion confirmation dialog (see section 7) |

---

## 5. States

### 5.1 Loading

Initial page load while fetching user profile and preferences from the server.

```
+-----------------------------------------------+
| PROFILE                                       |
|                                               |
|  +------+                                     |
|  |[shim]|  [============================]     |
|  |      |  [================]                 |
|  +------+                                     |
|                                               |
|            [============================]     |
|            [==============]                   |
|                                               |
+-----------------------------------------------+
```

- Skeleton shimmer matching the form layout
- Duration: <1s expected (single API call: `GET /api/users/me`)
- No spinner -- skeleton screens match the final layout to prevent layout shift. (Loading pattern: <1s = skeleton optional, but consistent with dashboard convention)

### 5.2 Loaded (Default)

All fields populated with user data. Form is pristine (Save Changes button disabled). Preferences reflect current selections.

### 5.3 Saving (Profile)

After clicking "Save Changes":
- Button shows spinner + disabled state
- Form fields remain visible but non-interactive
- Duration: <1s expected

### 5.4 Save Success

- Button briefly shows "Saved" / "저장됨" with checkmark icon for 2 seconds
- Navigation bar avatar/name updates immediately (optimistic)
- Form resets to pristine state (Save Changes disabled again)

### 5.5 Save Error

- Inline error message appears below the Save Changes button
- Button re-enables for retry
- Form fields retain user's input (never clear on error)
- Error message: "Couldn't save your changes. Check your connection and try again." + [Retry] built into the Save Changes button re-enabling

### 5.6 Preference Update Error

If a theme or language PATCH fails in background:
- Revert the toggle to previous value
- Toast notification at bottom: "Couldn't update your preference. Please try again." / "환경설정을 업데이트하지 못했습니다. 다시 시도해주세요."
- Toast auto-dismiss after 5s

### 5.7 Offline

- Banner at top of settings page: "You're offline. Changes will sync when you reconnect." / "오프라인 상태입니다. 다시 연결되면 변경사항이 동기화됩니다."
- Profile save button disabled (server required for identity changes)
- Theme toggle still works (can apply locally via CSS)
- Language toggle still works (can apply locally via i18n store)
- Logout button disabled (server-side session invalidation required)
- Delete Account button disabled

### 5.8 Partial (N/A)

Settings page loads all data from a single endpoint. Partial state is not applicable -- it either loads or errors.

### 5.9 Error (Full Page)

If the initial `GET /api/users/me` fails:

```
+-----------------------------------------------+
|                                               |
|   Couldn't load your settings.                |
|   Check your connection and try again.        |
|                                               |
|              [Retry]                          |
|                                               |
+-----------------------------------------------+
```

Centered, uses same pattern as dashboard error state. (Consistency: Jakob's Law)

---

## 6. Interaction Details

### 6.1 Profile Form

| Action | Response |
|--------|----------|
| Edit display name | Form becomes dirty, Save Changes button enables |
| Click avatar | File picker opens. Selected file uploads immediately. Avatar updates on success; error shown on failure. |
| Clear display name, blur | Inline error appears below field |
| Click Save Changes | Button shows spinner -> API call -> success feedback or error |
| Press Enter in any field | Triggers Save Changes (form submit behavior) |
| Navigate away with unsaved changes | No blocking dialog. Changes are lost. Rationale: the form has 2 fields maximum -- the cost of re-entry is trivial. Blocking navigation for trivial data loss is an anti-pattern. |

### 6.2 Theme Toggle

| Action | Response |
|--------|----------|
| Click "System" | Pill slides to System position (150ms ease-out). Theme immediately follows OS preference. Background PATCH. |
| Click "Light" | Pill slides. Page transitions to light mode (200ms cross-fade on `color-scheme` and CSS variables). |
| Click "Dark" | Pill slides. Page transitions to dark mode. |
| PATCH fails | Pill reverts to previous position (150ms). Toast error. |

### 6.3 Language Toggle

| Action | Response |
|--------|----------|
| Click "English" | Pill slides. All text on the settings page updates in place (no reload). Background PATCH. |
| Click "한국어" | Same behavior. |
| PATCH fails | Pill reverts. Toast error. |

### 6.4 Logout

| Action | Response |
|--------|----------|
| Click "Log out" | Immediately clear tokens. Redirect to login page. No loading state needed (local operation + redirect). |

### 6.5 Delete Account

See section 7 for full flow.

### 6.6 Micro-Interactions

| Element | Interaction | Animation |
|---------|-------------|-----------|
| Save Changes button | Press | Scale down to 95%, 100ms |
| Save Changes button | Success | Checkmark icon fades in, 200ms |
| Toggle pill | Switch | Translate X with 150ms ease-out |
| Theme change | Apply | CSS variables crossfade 200ms |
| Avatar | Hover | Dark overlay fades in 150ms with "Change" text |
| Avatar | Upload complete | New image fades in 200ms |
| Avatar | Upload spinner | Spinner overlay fades in 150ms |
| Inline error | Appear | Slide down + fade in 150ms |
| Inline error | Disappear | Fade out 100ms |

All animations respect `prefers-reduced-motion: reduce` (instant cuts).

---

## 7. Account Deletion Flow

This is the highest-stakes interaction on the settings page. Friction is intentional and appropriate for an irreversible, destructive action. (Forgiveness: confirm before irreversible)

### Flow

```
Settings Page                    Deletion Dialog
     |                                |
     +-- Click [Delete Account] ---> Dialog opens
                                      |
                                      +-- Shows data summary
                                      |   (3 projects, 47 scenes, 32 drafts)
                                      |
                                      +-- Confirmation phrase input
                                      |   (disabled Delete button)
                                      |
                                      +-- User types phrase correctly
                                      |   (Delete button enables)
                                      |
                                      +-- Click [Delete Account]
                                      |   (button shows spinner)
                                      |
                                      +-- Success: redirect to login
                                      |   with "Account deleted" message
                                      |
                                      +-- Error: show error in dialog,
                                          re-enable button for retry
```

### Deletion Dialog Wireframe

```
+---------------------------------------------------+
|                                                   |
|  Delete your account?                             |
|                                                   |
|  This will permanently delete:                    |
|  - 3 projects                                     |
|  - 47 scenes                                      |
|  - 32 drafts                                      |
|                                                   |
|  This cannot be undone.                           |
|                                                   |
|  Type "delete my account" to confirm:             |
|  +-----------------------------------------------+|
|  |                                               ||
|  +-----------------------------------------------+|
|                                                   |
|  [Cancel]                      [Delete Account]   |
|                                (disabled)          |
+---------------------------------------------------+
```

### Deletion Dialog Spec

| Property | Value |
|----------|-------|
| Component | `Dialog` (existing shared component) |
| Width | `max-w-md` (448px) |
| Title | "Delete your account?" / "계정을 삭제하시겠습니까?" |
| Data summary | Fetched from API or pre-loaded. Shows project count, scene count, draft count. `text-sm text-fg-secondary`, bulleted list. |
| Warning | "This cannot be undone." / "이 작업은 되돌릴 수 없습니다." -- `text-sm font-medium text-danger` |
| Confirmation label | "Type \"{phrase}\" to confirm:" / "\"{phrase}\"을(를) 입력하세요:" |
| Confirmation phrase | `"delete my account"` (en) / `"계정 삭제"` (ko) -- uses current language setting |
| Confirmation input | `TextInput`, `autocomplete="off"`, `spellcheck={false}` |
| Match logic | Case-insensitive, trimmed. Enables delete button when phrase matches exactly. |
| Cancel button | `variant="secondary"`, label "Cancel" / "취소". Always enabled. |
| Delete button | `variant="danger"`, label "Delete Account" / "계정 삭제". Disabled until phrase matches. |
| Delete loading | Button shows spinner, both buttons disabled, input disabled |
| Delete success | Dialog closes. Redirect to login page. Toast on login page: "Your account has been deleted." / "계정이 삭제되었습니다." |
| Delete error | Error message in dialog: "Couldn't delete your account. Please try again or contact support." / "계정을 삭제하지 못했습니다. 다시 시도하거나 지원팀에 문의하세요." Delete button re-enables. |

### Focus Management

1. Dialog opens: focus moves to the confirmation text input (not the title or close button). Rationale: the input is the required action. (Fitts's Law: reduce distance to primary interaction)
2. Dialog closes (cancel): focus returns to the "Delete Account" button on the settings page.
3. Tab order in dialog: input -> Cancel -> Delete Account.
4. Escape: closes dialog (same as Cancel).

---

## 8. Responsive Behavior

Settings is a content-focused form page. Responsive behavior is straightforward.

| Viewport | Layout |
|----------|--------|
| >= 1280px | Content at `max-w-xl` (576px), centered. Generous whitespace. |
| 768-1279px | Same layout. `max-w-xl` still fits comfortably. Side padding reduces to `px-4`. |
| < 768px | Same as workspace: show message "Narrex is designed for desktop." (Consistency with workspace-layout.md responsive rule) |

### Within Sections

- Profile section: avatar and form stack vertically on all widths (already single-column at 576px max-width)
- Toggle groups: full width within section. 3-option and 2-option segmented controls work at any width >= 320px.
- Buttons: full width on smaller viewports, right-aligned on larger viewports.

---

## 9. Accessibility

### Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| Tab | Page | Move focus: header -> page title -> avatar upload button -> display name input -> Save Changes -> theme toggle group -> language toggle group -> Log out button -> Delete Account button |
| Enter | In form field | Submit profile form (Save Changes) |
| Enter/Space | On button | Activate button |
| ArrowLeft/ArrowRight | In toggle group | Switch selected option |
| Escape | In deletion dialog | Close dialog |
| Escape | In avatar dropdown | Close dropdown |

### ARIA

| Element | Attributes |
|---------|------------|
| Page | `<main>` landmark, `<h1>` "Settings" |
| Profile section | `<section aria-labelledby="profile-heading">`, `<h2 id="profile-heading">` |
| Preferences section | `<section aria-labelledby="preferences-heading">`, `<h2 id="preferences-heading">` |
| Account section | `<section aria-labelledby="account-heading">`, `<h2 id="account-heading">` |
| Email (read-only) | Not a form field. Plain text with `aria-label` on the label element. |
| Theme toggle | `role="radiogroup"`, `aria-label="Theme preference"`, each option `role="radio"`, `aria-checked` |
| Language toggle | `role="radiogroup"`, `aria-label="Language preference"`, each option `role="radio"`, `aria-checked` |
| Save button (loading) | `aria-busy="true"`, `aria-label="Saving..."` |
| Save button (success) | `aria-live="polite"` region announces "Changes saved" |
| Deletion dialog | `role="alertdialog"`, `aria-labelledby` pointing to dialog title, `aria-describedby` pointing to data summary |
| Confirmation input | `aria-describedby` pointing to the "Type X to confirm" label |

### Screen Reader Announcements

| Event | Announcement (via `aria-live`) |
|-------|-------------------------------|
| Profile saved | "Changes saved" / "변경사항 저장됨" |
| Profile save failed | "Couldn't save changes" / "변경사항 저장 실패" |
| Theme changed | "Theme changed to [option]" / "테마가 [option](으)로 변경됨" |
| Language changed | "Language changed to [option]" / "언어가 [option](으)로 변경됨" |

### Contrast and Sizing

- All text meets 4.5:1 contrast ratio (uses design system tokens which are pre-validated)
- All interactive elements meet 3:1 contrast against adjacent colors
- Touch/click targets: all buttons >= 44x44px tap area
- Focus ring: `2px solid var(--color-focus-ring)`, `outline-offset: 2px`
- Read-only email does not look like a disabled input (avoids low-contrast disabled styling)

---

## 10. i18n Labels

### New Keys Required

| Key | ko | en |
|-----|----|----|
| `nav.settings` | 설정 | Settings |
| `settings.title` | 설정 | Settings |
| `settings.profile` | 프로필 | Profile |
| `settings.preferences` | 환경설정 | Preferences |
| `settings.account` | 계정 관리 | Account |
| `settings.displayName` | 표시 이름 | Display Name |
| `settings.displayName.placeholder` | 예: moonlight_writer | e.g., moonlight_writer |
| `settings.email` | 이메일 | Email |
| `settings.email.helper` | Google 계정에서 관리됩니다 | Managed by your Google account |
| `settings.avatar.upload` | 프로필 사진 업로드 | Upload profile photo |
| `settings.avatar.change` | 변경 | Change |
| `settings.avatar.invalidType` | JPG, PNG, WebP 파일만 지원됩니다. | Only JPG, PNG, and WebP files are supported. |
| `settings.avatar.tooLarge` | 파일 크기는 2MB 이하여야 합니다. | File must be 2MB or smaller. |
| `settings.avatar.error` | 이미지를 업로드하지 못했습니다. 다시 시도해주세요. | Couldn't upload image. Please try again. |
| `settings.displayName.errorEmpty` | 표시 이름을 입력해주세요. | Display name cannot be empty. |
| `settings.displayName.errorLong` | 표시 이름은 50자 이하여야 합니다. | Display name must be 50 characters or fewer. |
| `settings.save` | 변경사항 저장 | Save Changes |
| `settings.saved` | 저장됨 | Saved |
| `settings.saveError` | 변경사항을 저장하지 못했습니다. 연결을 확인하고 다시 시도하세요. | Couldn't save your changes. Check your connection and try again. |
| `settings.theme` | 테마 | Theme |
| `settings.theme.system` | 시스템 | System |
| `settings.theme.light` | 라이트 | Light |
| `settings.theme.dark` | 다크 | Dark |
| `settings.language` | 언어 | Language |
| `settings.language.ko` | 한국어 | 한국어 |
| `settings.language.en` | English | English |
| `settings.logout` | 로그아웃 | Log out |
| `settings.logoutDescription` | 현재 세션에서 로그아웃합니다. | Sign out of your current session. |
| `settings.deleteAccount` | 계정 삭제 | Delete Account |
| `settings.deleteDescription` | 계정과 모든 데이터가 영구적으로 삭제됩니다. | Permanently delete your account and all data. |
| `settings.deleteConfirmTitle` | 계정을 삭제하시겠습니까? | Delete your account? |
| `settings.deleteConfirmBody` | 다음 데이터가 영구적으로 삭제됩니다: | This will permanently delete: |
| `settings.deleteConfirmProjects` | {count}개 프로젝트 | {count} projects |
| `settings.deleteConfirmScenes` | {count}개 장면 | {count} scenes |
| `settings.deleteConfirmDrafts` | {count}개 초고 | {count} drafts |
| `settings.deleteConfirmWarning` | 이 작업은 되돌릴 수 없습니다. | This cannot be undone. |
| `settings.deleteConfirmLabel` | 확인하려면 "{phrase}"을(를) 입력하세요: | Type "{phrase}" to confirm: |
| `settings.deleteConfirmPhrase` | 계정 삭제 | delete my account |
| `settings.deleteConfirmPlaceholder` | 여기에 입력 | Type here |
| `settings.deleteConfirmButton` | 계정 삭제 | Delete Account |
| `settings.deleteSuccess` | 계정이 삭제되었습니다. | Your account has been deleted. |
| `settings.deleteError` | 계정을 삭제하지 못했습니다. 다시 시도하거나 지원팀에 문의하세요. | Couldn't delete your account. Please try again or contact support. |
| `settings.offline` | 오프라인 상태입니다. 다시 연결되면 변경사항이 동기화됩니다. | You're offline. Changes will sync when you reconnect. |
| `settings.preferenceError` | 환경설정을 업데이트하지 못했습니다. 다시 시도해주세요. | Couldn't update your preference. Please try again. |
| `settings.loadError` | 설정을 불러오지 못했습니다. 연결을 확인하고 다시 시도하세요. | Couldn't load your settings. Check your connection and try again. |
| `common.retry` | 다시 시도 | Retry |
| `common.cancel` | 취소 | Cancel |

### Notes on Existing Keys

Several `settings.*` keys already exist in i18n.tsx. The table above is the authoritative list. Keys that already exist should be updated to match these values where they differ (e.g., `settings.save` changes from "저장" to "변경사항 저장" for specificity per UX writing verb rule). The key `settings.deleteConfirmDescription` uses interpolation `{projects}`, `{scenes}`, `{drafts}` -- this spec replaces it with separate keys for the bulleted list format.

---

## 11. Usability Risk Assessment

| # | Risk | Severity | Likelihood | Mitigation |
|---|------|----------|------------|------------|
| 1 | User can't find settings (avatar dropdown not discoverable) | Minor | Low | Standard pattern (Jakob's Law). Avatar in top-right is ubiquitous. If <40% of users visit settings in first week (per PRD metric), add tooltip on first visit. |
| 2 | Korean confirmation phrase input friction (Hangul IME composition) | Major | Medium | Phrase is short: "계정 삭제" (4 chars). Case-insensitive, trimmed comparison. Test with Korean IME during development. If usability testing shows >20% failure on first attempt, consider a checkbox confirmation fallback. |
| 3 | Avatar upload fails silently or confuses users | Minor | Low | Clear error messages for invalid type, size, and upload failure. Hover overlay with "Change" text signals clickability. Spinner provides feedback during upload. Familiar pattern from Slack/Discord/Figma. |
| 4 | User accidentally logs out when intending to go to settings (adjacent dropdown items) | Minor | Low | Separator between "Settings" and "Log out". Logout has no confirmation (reversible). Different icon + label distinguish the actions. |
| 5 | Theme/language toggle revert (server sync failure) is jarring | Minor | Low | Revert animation is smooth (150ms). Toast explains the failure. User can retry immediately. |
| 6 | User navigates away from settings with unsaved profile changes | Minor | Medium | Intentional design decision: no blocking dialog. Profile form has at most 2 fields. Re-entry cost is near zero. If analytics show frequent incomplete saves, reconsider. |
| 7 | Delete button visible on first visit could alarm new users | Minor | Low | Delete section is at the bottom of the page (Serial Position: users scan top-first). Separated by visual hierarchy. Red danger styling signals "be careful" without being aggressive. No user has been accidentally deleted by a visible delete button they chose not to click. |

---

## 12. Design Rationale Summary

| Decision | Principle | Reference |
|----------|-----------|-----------|
| Single scrollable page (not tabs) | Cognitive Load: fewer navigation decisions for 3 short sections | `cognitive-principles.md` |
| Sections ordered: Profile, Preferences, Account | Serial Position Effect: most-used first, highest-stakes last | `cognitive-principles.md` |
| Explicit save for profile, auto-apply for preferences | Forgiveness (profile: identity-level, confirm first) + Doherty Threshold (preferences: immediate feedback) | `SKILL.md`, `cognitive-principles.md` |
| Segmented control for theme/language (not dropdown) | Jakob's Law: standard pattern in creative tools; Fitts's Law: all options visible and reachable in one click | `cognitive-principles.md` |
| No confirmation for logout | Anti-pattern: confirmation for reversible actions. Logout is reversible via re-login. | `SKILL.md` |
| Confirmation phrase for account deletion | Forgiveness: maximum friction for irreversible, high-stakes action | `interaction-patterns.md` |
| Read-only email as plain text (not disabled input) | Cognitive Load: avoid false affordance of editable-looking disabled field | `cognitive-principles.md` |
| No "unsaved changes" blocking dialog | Anti-pattern removal: trivial re-entry cost does not justify navigation interruption | `design-process.md` (Removal Test) |
| Avatar dropdown with role="menu" | Jakob's Law: standard web menu pattern; Accessibility: ARIA menu role for screen readers | `ergonomics.md` |
| Content width max-w-xl (576px) | Ergonomics: optimal line length for form readability (~60ch) | `ergonomics.md` |
