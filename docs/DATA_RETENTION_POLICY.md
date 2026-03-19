# Data Retention Policy — HarvestPro NZ

> Audit fix M-4: Documents data retention requirements per NZ legislation.

## Legal Requirements

| Data Type                   | Retention Period | Legal Basis                                       |
| --------------------------- | ---------------- | ------------------------------------------------- |
| **Payroll & wage records**  | 7 years          | Employment Relations Act 2000, s.130(2)           |
| **Tax-related records**     | 7 years          | Tax Administration Act 1994, s.22                 |
| **Attendance records**      | 6 years          | Holidays Act 2003                                 |
| **Health & safety records** | 10 years         | Health and Safety at Work Act 2015, s.56          |
| **Privacy consent logs**    | Indefinite       | NZ Privacy Act 2020, IPP 6-7 (proof of consent)   |
| **Audit logs**              | 7 years          | Best practice; aligns with financial record rules |
| **Bucket scan records**     | 7 years          | Linked to payroll calculations                    |

## Automatic Purge Schedule (Future Implementation)

A scheduled Edge Function should be implemented to:

1. **Run weekly** — Every Monday at 03:00 NZST
2. **Archive records** older than the retention period to cold storage (Supabase Storage bucket)
3. **Delete archived records** from the main database after confirming archive integrity
4. **Log every purge action** in the `audit_logs` table

### Recommended Implementation

```sql
-- Example: Archive attendance records older than 6 years
INSERT INTO attendance_archive
SELECT * FROM daily_attendance
WHERE check_in_time < NOW() - INTERVAL '6 years';

DELETE FROM daily_attendance
WHERE check_in_time < NOW() - INTERVAL '6 years';
```

## Data Subject Requests (IPP 6)

- Users can request data export via `dataExportService.downloadAsJSON(userId)`
- All export requests are logged in `audit_logs` for compliance tracking
- Export includes: profile, attendance, scans, consent history, message count

## Data Deletion Requests (IPP 7)

Right to erasure is limited by legal retention obligations:

- Personal data linked to payroll/tax **cannot** be deleted before 7 years
- Non-essential metadata (e.g., device fingerprints, analytics) **can** be deleted upon request
- Deletion requests should be logged even if partially denied (legal basis must be cited)

---

_Policy version: 1.0 — 19 March 2026_
