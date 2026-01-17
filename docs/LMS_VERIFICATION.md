# LMS UX + Reporting Verification Checklist
# Last updated: 2026-01-17
# Status: VERIFIED

## LMS UX Components

### My Learning Dashboard (/app/lms/my-learning)
- [x] Shows assigned paths/courses/lessons
- [x] Sorting: required+overdue → required+upcoming → optional
- [x] Completed items visually de-emphasized (opacity-60, strikethrough)
- [x] Progress stats displayed
- [x] Due date and overdue badges

### Path Detail View (/app/lms/paths/:pathId)
- [x] Ordered course list with numbered steps
- [x] Path progress indicator (X of Y courses)
- [x] "Continue Learning" deep link to next incomplete course
- [x] Status badges per course
- [x] "Up Next" indicator

### Course Detail View (/app/lms/courses/:courseId)
- [x] Cover image display
- [x] Course description
- [x] Syllabus download button (when available)
- [x] Lessons list with status
- [x] "Start Learning" / "Continue" CTA
- [x] "Up Next" lesson indicator

### Lesson Detail View (/app/lms/lessons/:lessonId)
- [x] Content renders for:
  - [x] YouTube (youtube-nocookie embed)
  - [x] File asset (link to view)
  - [x] External link (link button)
  - [x] Rich text (lazy-loaded)
- [x] "Mark Complete" button
- [x] Progress status display
- [x] Estimated time display

### Quiz UX (via lms_quizzes)
- [x] Quiz stats in reporting (attempt count, pass/fail)
- [x] No answer exposure in reports
- [ ] Full quiz taking UI (out of scope - existing implementation)

## Reporting Components

### LMS Reports Overview (/app/lms/reports)
- [x] Admin-only access gate
- [x] Content counters (paths, courses, lessons)
- [x] Assignment stats (active, overdue)
- [x] Learner progress distribution
- [x] Recent assignments list with links

### Assignment Detail Report (/app/lms/reports/assignment/:id)
- [x] Shows learner table with status
- [x] Completion summary stats
- [x] Overdue indicators
- [x] Links to individual learner reports
- [x] Limited to company data (RLS)

### Learner Progress Report (/app/lms/reports/learner/:userId)
- [x] Shows individual's assigned content
- [x] Progress status per item
- [x] Access control: users see only own data, admins see all
- [x] Required/optional indicators

## Cross-Visibility

### CRM → LMS
- [x] CrmLearningPanel component created
- [x] Integrated in CrmDetailPage
- [x] Only shows when LMS module enabled
- [x] Shows linked learning content

### LMS → CRM
- [x] Ready via entity_links system
- [x] Graceful degradation when CRM disabled

## Permission & Capability Verification

- [x] Reports require canAdmin (Company/Site/Super Admin)
- [x] Learner report self-access allowed
- [x] useLmsPermissions hook enforces gates
- [x] Module toggle hides reports when LMS disabled

## Performance & Safety

- [x] Parallel queries in useLmsOverviewStats
- [x] List limits applied (100 rows max)
- [x] No N+1 in main list views
- [x] Progress calculations are client-side aggregations

## UX Consistency

- [x] Status badges: draft/published/archived
- [x] Required/optional indicators
- [x] Overdue badges with AlertTriangle icon
- [x] Consistent color coding across views

## Cleanup

- [x] AssignmentsPage "Coming Soon" replaced with actual list
- [x] No visible TODO sections
- [x] Debug output removed
