# Privacy Policy — HarvestPro NZ
**Effective date:** 21 March 2026  
**Last updated:** 21 March 2026  
**Version:** 1.0

> This Privacy Policy is written in compliance with the **New Zealand Privacy Act 2020** and its 13 Information Privacy Principles (IPPs). It also addresses obligations relevant to the **Recognised Seasonal Employer (RSE) Scheme** and **GDPR** where applicable.

---

## 1. Who We Are

HarvestPro NZ ("we", "us", "our") is a New Zealand-based software company providing workforce management technology for the horticulture industry.

**Contact:**
- Email: privacy@harvestpro.nz
- Postal: [Your registered NZ address]
- Privacy Officer: [Name of Privacy Officer]

---

## 2. Information We Collect

### 2.1 Orchard Manager / Admin Users
- Full name and email address (for account creation)
- Business name and orchard details
- Role and permissions within your organisation
- Login history and session data

### 2.2 Harvest Workers (Pickers, Team Leaders, Runners)
- Full name
- Internal worker ID (picker_id)
- Work status and check-in/check-out times
- Bucket/bin counts and productivity data
- Safety verification status
- Row assignment and team assignment
- Wage calculations (derived from attendance and piece rate data)

### 2.3 Technical Data
- Device type and browser information
- IP address (logged by Supabase infrastructure)
- Error logs and performance data (via Sentry — anonymised after session)
- Usage analytics (via PostHog — anonymised where possible)

---

## 3. How We Use Your Information

We use collected information solely to:

| Purpose | Legal Basis (NZ Privacy Act IPP 10) |
|---|---|
| Provide workforce management services | Contractual necessity |
| Calculate wages and payroll compliance | Legal obligation (Employment Relations Act 2000) |
| Check compliance with NZ labour law | Legal obligation |
| Record keeping for audit purposes | Legal obligation |
| Send push notifications about work status | Consent |
| Improve app performance and fix bugs | Legitimate interest |

We **do not** sell personal information to third parties. We **do not** use worker data for marketing purposes.

---

## 4. RSE Scheme Workers

We recognise that many seasonal harvest workers in New Zealand come under the Recognised Seasonal Employer (RSE) scheme. For RSE workers:

- We collect only the minimum data necessary to manage their employment
- Worker data is not shared with immigration authorities unless legally required
- RSE workers have the right to access and correct their personal information
- Biometric data is **never** collected (no fingerprints, facial recognition, etc.)

---

## 5. Data Storage and Location

Your data is stored with Supabase (www.supabase.com) infrastructure.

> **Current region:** Amazon Web Services (AWS)  
> **Important notice:** We are in the process of migrating data storage to the **AWS Sydney (ap-southeast-2)** region to better serve New Zealand customers and comply with data residency preferences under the NZ Privacy Act 2020.

Data is encrypted:
- **In transit:** TLS 1.3
- **At rest:** AES-256 (Supabase managed)
- **Offline (on device):** AES-256-GCM (device-side encryption for locally cached data)

---

## 6. How Long We Keep Your Data

| Data Type | Retention Period |
|---|---|
| Worker attendance records | 7 years (Employment Relations Act requirement) |
| Payroll calculations | 7 years |
| Audit logs | 3 years |
| User account data | Until account deletion + 90 days |
| Session replay data (Sentry) | 30 days |
| Analytics data (PostHog) | 12 months |

---

## 7. Access and Correction Rights (IPP 6 & 7)

Under the NZ Privacy Act 2020, you have the right to:

- **Access** personal information we hold about you
- **Correct** inaccurate personal information
- **Request deletion** of your personal information (subject to legal retention requirements)
- **Object** to certain types of processing

**To exercise these rights:** Contact privacy@harvestpro.nz with the subject "Privacy Request". We will respond within 20 working days as required by the Privacy Act.

---

## 8. Security Measures

We implement the following security controls:

- Role-based access control (RBAC) — managers see only their orchard's data
- Two-factor authentication available for all admin accounts
- Row-level security policies on all database tables
- Automatic session expiry after inactivity
- All API endpoints authenticated and rate-limited
- Regular security scanning via automated tools

---

## 9. Disclosure to Third Parties

We share data only with:

| Party | Purpose | Data Shared |
|---|---|---|
| Supabase Inc | Database and authentication hosting | All data (as processor) |
| Sentry (Functional Software Inc) | Error monitoring | Anonymised error data (no worker PII) |
| PostHog Inc | Usage analytics | Anonymised usage events |

All third parties are bound by Data Processing Agreements and are required to maintain appropriate security standards.

---

## 10. Complaints

If you have concerns about how we handle your personal information, you can:

1. Contact our Privacy Officer: privacy@harvestpro.nz
2. Lodge a complaint with the **Office of the New Zealand Privacy Commissioner**: www.privacy.org.nz | 0800 803 909

---

## 11. Changes to This Policy

We will notify active users by email at least 14 days before material changes to this policy take effect. Continued use of the service after that date constitutes acceptance of the updated policy.

---

*This Privacy Policy was drafted in accordance with the New Zealand Privacy Act 2020 and its 13 Information Privacy Principles. Version 1.0 — seek legal review before first commercial use.*
