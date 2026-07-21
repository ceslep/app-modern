# Fix thiings.co icons not visible

**Root cause**: El proyecto no usa Tailwind CSS. Las clases `w-5 h-5 object-contain drop-shadow-sm` no existen en el CSS del proyecto. Las imágenes PNG (1080×1080) se renderizan a tamaño nativo, rompiendo el layout.

**Fix**: Reemplazar clases Tailwind falsas por inline styles + HTML attributes `width`/`height`.

## Files to edit

### 1. `src/modules/control_estudiantes.js` — 10 img tags

**Pattern**: Replace `class="w-X h-Y object-contain drop-shadow-sm"` with inline styles + width/height attrs.

| Line(s) | Old classes | New inline |
|---------|-----------|------------|
| 246, 250, 254, 258 (step rail) | `class="w-5 h-5 object-contain drop-shadow-sm"` | `width="20" height="20" style="width:20px;height:20px;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15))"` |
| 269, 365, 433, 527 (section headers) | `class="w-6 h-6 object-contain drop-shadow-sm"` | `width="24" height="24" style="width:24px;height:24px;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15))"` |
| 473, 497 (Padre/Madre) | `class="w-5 h-5 object-contain drop-shadow-sm"` | `width="20" height="20" style="width:20px;height:20px;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15))"` |

**Search for each occurrence and replace class attribute with inline style + width/height HTML attributes. Keep `loading="lazy"` and `alt=""`.**

### 2. `src/modules/dashboard/sections/stats.js` — 1 template

**Line 91**: Replace `class="w-6 h-6 object-contain drop-shadow-sm"` with `width="24" height="24" style="width:24px;height:24px;object-fit:contain;"`

### 3. `src/modules/dashboard/sections/quick-actions.js` — 1 template

**Line 30**: Replace `class="w-7 h-7 object-contain drop-shadow-sm lead"` with `width="28" height="28" style="width:28px;height:28px;object-fit:contain;" class="lead"`

### 4. `src/modules/dashboard/sections/profile.js` — 3 img tags

**Line 25** (section title): Replace `class="w-4 h-4 object-contain drop-shadow-sm"` with `width="16" height="16" style="width:16px;height:16px;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15))"`

**Lines 44, 52** (clipboard copy): Same replacement as line 25.

### 5. `src/modules/dashboard/sections/activity.js` — 3 img tags

**Line 26** (section title): Replace `class="w-4 h-4 object-contain drop-shadow-sm"` with `width="16" height="16" style="width:16px;height:16px;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15))"`

**Line 30** (hourglass loading): Replace `class="w-6 h-6 object-contain mx-auto mb-1 opacity-40"` with `width="24" height="24" style="width:24px;height:24px;object-fit:contain;display:block;margin:0 auto 0.25rem;opacity:0.4"`

**Line 52** (bell-slash empty): Same replacement as line 30.

### 6. `src/modules/dashboard/sections/greeting.js` — 1 img tag

**Line 31**: Replace `class="w-4 h-4 object-contain drop-shadow-sm align-middle" style="opacity:0.5"` with `width="16" height="16" style="width:16px;height:16px;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15));opacity:0.5;vertical-align:middle"`

## Verification

After changes, open the student info modal on dev server and confirm:
- Step rail icons visible (20px each in .estu-step-ic container)
- Section headers show icons next to titles
- Padre/Madre subsection icons visible
- Dashboard stats, quick actions, profile, activity all show their thiings icons

No CSP changes needed — Vercel Blob already returns `Access-Control-Allow-Origin: *`.
