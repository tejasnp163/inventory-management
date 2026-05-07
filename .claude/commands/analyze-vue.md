---
description: Analyze Vue component structure and suggest performance and code-reuse optimizations
---

Analyze Vue components in this codebase for performance issues and code-reuse opportunities.

## Target

If the user passed an argument (a file path or directory), analyze only that target.
Otherwise analyze all `.vue` files under `client/src/`.

## Step 1 — Inventory

Use grep and file reads to collect the full list of `.vue` files in scope. For each file, read its complete contents before proceeding.

## Step 2 — Performance Analysis

For each component, check for:

**Computed vs method misuse**
- Template calls to methods that derive values from reactive data → should be `computed` (methods re-run on every render; computed properties are cached)
- Expensive calculations inside `v-for` loops (e.g., scanning an array inside a per-item method call) → extract a pre-computed lookup or sorted/filtered array

**Render efficiency**
- `v-if` used on elements that toggle frequently → suggest `v-show` instead
- Missing `:key` on `v-for`, or index used as key → flag and suggest a stable unique id
- Deeply nested reactive objects in `ref()` that could be `shallowRef()` to avoid deep observation cost

**Reactivity pitfalls**
- Direct mutation of props
- Array mutations that bypass Vue reactivity (e.g., `arr[i] = x` instead of `arr.splice` or reassignment)
- `watch` without `{ immediate: true }` where initial load should also trigger

**Data loading**
- Redundant API calls: same endpoint called multiple times without caching, or called on every filter change without debounce
- Missing `loading` / `error` state guards

## Step 3 — Code Reuse Analysis

**Duplicated logic across files**
- Number/currency formatting implemented more than once → suggest a shared composable or utility function
- Date formatting repeated across components
- Status-badge class logic (e.g., `getStatusClass`) duplicated

**Extractable composables**
- Any `setup()` block > ~100 lines that handles a self-contained concern (data loading, filtering, pagination) → suggest a composable
- State + methods that are shared across two or more views → already a composable candidate

**Component patterns that could be abstracted**
- Modal components that share the same overlay/transition/header/footer shell → suggest a `BaseModal.vue` wrapper
- Repeated table structures with the same column pattern → suggest a generic table component
- Stat cards with the same layout repeated inline in templates → suggest a `StatCard.vue`

**API coupling**
- Components calling `axios` directly instead of going through `api.js` → consolidate

**API/Options inconsistency**
- Components using Options API (`data()`, `methods`, `mounted`) while the rest of the codebase uses Composition API → flag for migration

## Step 4 — Output

Produce a structured report with three sections:

### Performance Issues
For each issue: file path + line number(s), description of the problem, and the specific fix to apply.

### Code Reuse Opportunities
For each opportunity: which files are involved, what the duplication or abstraction is, and the recommended refactor (e.g., "extract `useNumberFormat` composable used by Reports.vue and Dashboard.vue").

### Priority Recommendations
A ranked list (High / Medium / Low) of the top changes to make, considering both impact and effort. High = easy win or significant render-path improvement. Low = nice-to-have cleanup.

Be specific: always include file paths and line numbers. Avoid generic advice — every suggestion should be actionable against the actual code you read.
