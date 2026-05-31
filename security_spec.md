# Security Specification & Adversarial Test Outline

## 1. Data Invariants

1. **Self-Ownership Identity Security**: A user can read/write their own `/users/{userId}` profile document. They cannot modify their own `role` or `email` after registration (to prevent escalation and spoofing).
2. **Team Boundaries constraint**:
   - A **student** can read student reports from teammate records ONLY if their `teamId` matches the report's `teamId`.
   - A **student** is forbidden from updating reports with status set to `approved` or `rejected` (immutable terminal states).
   - A **student** can create or update reports ONLY if the report's `userId` matches the student's auth UID and the report's `status` is `pending`.
3. **Reviewer Boundary constraint**:
   - A **reviewer** can ONLY read and write reports belonging to teams they are assigned to.
   - Wait, since reviewers are assigned to teams, how is the assignment tracked? It is tracked in their `/users/{userId}` Profile `teamId`. A reviewer's `teamId` governs which team reports they can view, approve, reject, or comment.
4. **Admin Omnipotence check**: An admin profile can see and modify any document. Admin status is hardcoded or checked securely.
5. **Strict Timestamps**: Creation and update timestamps must be verified against server-time (`request.time`).

---

## 2. The "Dirty Dozen" Payloads

Here are twelve payloads designed to break our rules, and why they must fail:

### Payload 1: Privilege Escalation (Self-Promo)
*   **Target**: `/users/attacker_uid`
*   **Operation**: UPDATE
*   **Payload**: `{ role: "admin" }`
*   **Reason for failure**: Only Admins can modify the `role` field. Users cannot change their own role.

### Payload 2: Email Spoofing (Admin Impersonation)
*   **Target**: `/users/attacker_uid`
*   **Operation**: CREATE or UPDATE
*   **Payload**: `{ email: "phongtt35@fpt.edu.vn" }` (or any other user, bypassing Google Auth email verified checks)
*   **Reason for failure**: Security rules mandate that users can only register with their authentic, verified Google email: `request.auth.token.email_verified == true` and `request.auth.token.email == incoming().email`.

### Payload 3: Report Spoofing (Drafting reports for others)
*   **Target**: `/reports/victim_report_id`
*   **Operation**: CREATE
*   **Payload**: `{ userId: "victim_student_123", teamId: "tem_12", date: "2026-05-31", todayWork: "...", status: "pending" }`
*   **Reason for failure**: Security rules verify `incoming().userId == request.auth.uid`. A student cannot write a report on behalf of another student.

### Payload 4: Arbitrary Peer Access (Querying other team's reports)
*   **Target**: `/reports/other_team_doc`
*   **Operation**: GET / LIST
*   **Reason for failure**: Peer read rules require that `resource.data.teamId == getUserProfile(request.auth.uid).teamId`, preventing non-teammates from scraping data.

### Payload 5: Auto-Approval Bypass (Review state hacking)
*   **Target**: `/reports/attacker_uid_2026-05-31`
*   **Operation**: CREATE
*   **Payload**: `{ todayWork: "...", status: "approved" }`
*   **Reason for failure**: Validation helper enforces that initial status during creation can only be `pending`.

### Payload 6: Mutating Closed Reports (Terminal State Locking)
*   **Target**: `/reports/my_old_report` (which has been marked `approved` by reviewer)
*   **Operation**: UPDATE
*   **Payload**: `{ todayWork: "Faked accomplishments after approval" }`
*   **Reason for failure**: Update operations are blocked once status becomes `approved` or `rejected` for students: `existing().status == 'pending'`.

### Payload 7: Denial of Wallet ID Insertion (Resource Exhaustion)
*   **Target**: `/reports/A_COMPL_JUNK_ID_THAT_HAS_SIZE_OF_1000_CHARACTERS_...`
*   **Operation**: CREATE
*   **Reason for failure**: `isValidId` restricts path IDs to `<= 128` characters with matching standard regex limits.

### Payload 8: Reviewer Spoofing (Approving own report)
*   **Target**: `/reports/attacker_uid_2026-05-31`
*   **Operation**: UPDATE
*   **Payload**: `{ status: "approved", reviewComment: "Peerless self-review", reviewedBy: "attacker_uid" }`
*   **Reason for failure**: A student is blocked from modifying `status`. Only users with the role of `reviewer` or `admin` are allowed to approve/reject reports.

### Payload 9: Out of Boundary Spamming (Empty reports or huge values)
*   **Target**: `/reports/attacker_uid_2026-05-31`
*   **Operation**: CREATE
*   **Payload**: `{ todayWork: "" }` or `{ todayWork: "[A string with size > 10000 characters]" }`
*   **Reason for failure**: Size constraints (`size() > 0 && size() <= 5000`) block empty submissions and huge payloads.

### Payload 10: Relational Orphan Injection
*   **Target**: `/reports/attacker_uid_2026-05-31`
*   **Operation**: CREATE
*   **Payload**: `{ teamId: "NON_EXISTED_TEAM_ID_999" }`
*   **Reason for failure**: Rules verify that the referenced `teamId` document must exist using `exists(/databases/$(database)/documents/teams/$(incoming().teamId))`.

### Payload 11: Shadow Field Injection
*   **Target**: `/reports/attacker_uid_2026-05-31`
*   **Operation**: CREATE
*   **Payload**: `{ todayWork: "...", isSecretVerified: true }`
*   **Reason for failure**: Strict exact keys matching size rules on creation prevents shadow field injection.

### Payload 12: Timestamp Spoofing (Future/Past manipulation)
*   **Target**: `/reports/attacker_uid_2026-05-31`
*   **Operation**: CREATE
*   **Payload**: `{ createdAt: timestamp_from_1999_or_2099 }`
*   **Reason for failure**: Rules enforce strict server time equivalence: `incoming().createdAt == request.time`.
