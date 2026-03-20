# Data Processing Agreement — HarvestPro NZ
**Effective date:** 21 March 2026  
**Version:** 1.0

This Data Processing Agreement ("DPA") forms part of the Terms of Service between HarvestPro NZ ("Processor") and the Customer ("Controller"). It sets out the terms under which HarvestPro NZ processes personal data on behalf of the Customer.

---

## 1. Definitions

- **"Controller"**: The Customer organisation that determines the purposes and means of processing personal data (the orchard/employer).
- **"Processor"**: HarvestPro NZ, which processes personal data on behalf of the Controller.
- **"Personal Data"**: Any information relating to an identified or identifiable natural person (harvest workers, managers).
- **"Processing"**: Any operation performed on personal data (collection, storage, retrieval, use, disclosure).
- **"NZ Privacy Act"**: New Zealand Privacy Act 2020.
- **"Data Subject"**: The harvest worker or individual whose personal data is processed.

---

## 2. Scope and Nature of Processing

### 2.1 Categories of Personal Data Processed

| Category | Examples |
|---|---|
| Identification data | Worker name, internal ID (picker_id) |
| Employment data | Check-in/out times, row assignments, team assignments |
| Biometric-adjacent data | None — we do not collect biometric data |
| Productivity data | Bucket counts, hourly rates, earnings calculations |
| Safety data | Safety verification status |
| Contact data | Manager email addresses, notification tokens |

### 2.2 Categories of Data Subjects
- Seasonal harvest workers (pickers, runners, team leaders)
- Orchard management and administration staff

### 2.3 Purpose of Processing
Solely to provide the HarvestPro NZ workforce management service as described in the Terms of Service.

---

## 3. Controller Obligations

The Controller (Customer) agrees to:

3.1 Comply with the NZ Privacy Act 2020 when collecting personal data from workers.  
3.2 Ensure workers are informed their data is managed through the HarvestPro NZ platform.  
3.3 Obtain any necessary consents from workers, particularly for RSE scheme workers.  
3.4 Only submit accurate data to the platform.  
3.5 Notify HarvestPro NZ promptly if a data subject exercises their access/correction rights.

---

## 4. Processor Obligations

HarvestPro NZ agrees to:

4.1 Process personal data only on the documented instructions of the Controller.  
4.2 Ensure staff with access to personal data are bound by confidentiality obligations.  
4.3 Implement appropriate technical and organisational security measures (Article 32 GDPR / IPP 5 NZ Privacy Act).  
4.4 Not engage sub-processors without prior written consent, or provide general authorisation for the sub-processors listed in Schedule A.  
4.5 Assist the Controller in responding to data subject access requests within 20 working days.  
4.6 Notify the Controller within 72 hours of becoming aware of a personal data breach.  
4.7 Delete or return all personal data upon termination of the service agreement.  
4.8 Make available all information necessary to demonstrate compliance with this DPA.

---

## 5. Security Measures (Technical and Organisational)

| Measure | Implementation |
|---|---|
| Encryption at rest | AES-256 (Supabase managed) + AES-256-GCM for offline device data |
| Encryption in transit | TLS 1.3 for all data transmission |
| Access control | Role-based access control (RBAC) with Row-Level Security |
| Authentication | JWT-based sessions, optional 2FA for admin accounts |
| Audit logging | All data modifications logged with user ID and timestamp |
| Vulnerability management | Automated dependency scanning (npm audit, Semgrep, OWASP ZAP) |
| Data minimisation | Only data necessary for the service is collected |

---

## 6. Sub-processors (Schedule A)

The Controller provides general authorisation for the following sub-processors:

| Sub-processor | Location | Purpose | Data Transferred |
|---|---|---|---|
| Supabase Inc | USA (AWS) | Database hosting and authentication | All personal data |
| Amazon Web Services | USA / Australia | Cloud infrastructure | All personal data |
| Sentry (Functional Software Inc) | USA | Error monitoring | Anonymised error data only (no worker PII — maskAllText enabled) |
| PostHog Inc | USA / EU | Usage analytics | Anonymised usage events |

HarvestPro NZ will notify the Controller of any intended changes to sub-processors with at least 14 days notice.

---

## 7. Data Transfers

7.1 Data is currently stored in AWS infrastructure. We are migrating to AWS Sydney (ap-southeast-2) for NZ data residency.  
7.2 Where data is transferred outside New Zealand, we ensure adequate protections are in place (Standard Contractual Clauses or adequacy decisions).  
7.3 Sub-processors in the USA operate under the EU-US Data Privacy Framework or equivalent contractual protections.

---

## 8. Data Breach Notification

In the event of a personal data breach:

8.1 HarvestPro NZ will notify the Controller within 72 hours of discovery.  
8.2 Notification will include: nature of breach, categories of data affected, likely consequences, measures taken.  
8.3 The Controller is responsible for notifying affected data subjects and the Privacy Commissioner where required.  
8.4 Both parties will cooperate to contain the breach and prevent recurrence.

---

## 9. Term and Termination

9.1 This DPA remains in force for the duration of the Terms of Service.  
9.2 Upon termination, HarvestPro NZ will delete all personal data within 90 days, unless retention is required by NZ law.  
9.3 A data export in standard format (CSV/JSON) will be provided upon request within 30 days of termination.

---

## 10. Governing Law

This DPA is governed by New Zealand law, consistent with the NZ Privacy Act 2020.

---

*Draft version 1.0. This DPA should be reviewed by a New Zealand privacy lawyer before execution with any customer. The NZ Privacy Commissioner's guidance at privacy.org.nz is recommended reading.*
