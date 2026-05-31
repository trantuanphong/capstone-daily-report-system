# Daily Capstone Report System

Consolidated, real-time progress monitoring dashboard system tailored for managing **40 students**, **7 capstone project teams**, and their reviewers/administrators. Built with **React (Vite)**, **TypeScript**, **Tailwind CSS**, and **Firebase (Auth & Firestore)**.

---

## 📂 Core Folder Structure Reference

```text
/
├── firestore.rules          # Harden production security policy (ABAC constraints)
├── security_spec.md         # Data invariants & adversarial threat payload specs
├── firebase-blueprint.json  # Abstract JSON Schema intermediate blueprint
├── package.json             # App packaging manifest and dependencies
├── index.html               # Main visual template
├── tsconfig.json            # Strict TypeScript configuration
├── metadata.json            # AI Studio App configuration
└── src/
    ├── types.ts             # TypeScript Interfaces (User, Team, Report)
    ├── firebase.ts          # Safe Firestore error handlers & Auth configurations
    ├── firebase-applet-config.json # Target connection parameters for client SDK
    ├── App.tsx              # Main routing, layout rendering, and controllers
    ├── index.css            # Tailwind global import configurations
    ├── main.tsx             # DOM entry point
    └── components/
        ├── Sidebar.tsx      # Sidebar layout (slide out responsive mobile drawer)
        ├── ReportForm.tsx   # Student submission mechanics (duplicity check filters)
        ├── ReportCard.tsx   # Visual status badge display (reviews decision console)
        ├── StatsGrid.tsx    # Responsive custom SVG metrics bar charts & gauges
        ├── CSVExport.tsx    # On-click report parsing of filtered logs down to .csv file
        ├── DarkToggle.tsx   # Dark/light theme mode context manager
        └── SeedDataButton.tsx # On-click in-app database structure seeder
```

---

## 🗄️ Firestore Database Schema Definition

### 1. User Profile Document (`/users/{userId}`)
```typescript
interface UserProfile {
  uid: string;                 // Matches user Auth UID exactly
  name: string;                // User's display name
  email: string;               // Authenticated Google address string
  teamId: string;              // Assigned Team ID (empty string if unassigned)
  role: 'student' | 'reviewer' | 'admin'; // Authorization privilege tier
}
```

### 2. Capstone Team Document (`/teams/{teamId}`)
```typescript
interface Team {
  id: string;                  // System team identification key
  name: string;                // Printed project or team name
}
```

### 3. Progress Report Document (`/reports/{reportId}`)
*   *Note: Document ID is calculated dynamically on submit as: `{student_uid}_{report_date_YYYY-MM-DD}` to enforce exactly one report per student per day.*
```typescript
interface Report {
  id: string;                  // Formulated ID (userId_date)
  userId: string;              // UID of submitting student
  teamId: string;              // Team ID at time of submission (matches user teamId)
  date: string;                // Local date string format (YYYY-MM-DD)
  todayWork: string;           // Work accomplishments description (length <= 5000)
  blockers: string;            // Impediment issues description (length <= 5000)
  tomorrowPlan: string;        // Future planning target description (length <= 5000)
  status: 'pending' | 'approved' | 'rejected'; // Approval review state
  reviewComment: string;       // Reviewer feedback comments (length <= 2000)
  reviewedBy: string;          // UID of reviewer who decided status
  reviewedAt: Timestamp | null;// Firestore Server Timestamp of decision 
  createdAt: Timestamp;        // Firestore Server Timestamp of submission
}
```

---

## 🔒 Attribute-Based Access Control (ABAC) Security Rules

Our production-grade `firestore.rules` enforces strict Zero-Trust boundaries directly on database operations:
1.  **Strict Write Schema Enforcements**: Report submissions require complete fields matching `isValidReport()` constraints with length-safety bounds (`<= 5000` chars) to avoid resource exhaust attacks.
2.  **Immutability**: Once a report progresses beyond a `pending` status, its text contents are permanently locked and cannot be modified by students. Immutable keys (like `date`, `userId`, `teamId`, `createdAt`) cannot be edited.
3.  **Encapsulated Peer Views**: Students can ONLY view progress reports belonging to students assigned to their identical `teamId`. Reviewers can ONLY read and write reports matching their assigned `teamId`.
4.  **Google-Verified Accounts Only**: Standard users must show `request.auth.token.email_verified == true`. Direct role modification inside metadata payloads is blocked for non-admins to prevent privilege escalation.

---

## ⚡ Quick Start: Zero-Click Seed Data Script

To make testing instant after installing credentials:
1.  Navigate to the **Sidebar Navigation** and click **Manage Teams** (visible when logged in as an `admin`).
2.  Review the **Seed Database Engine** component card.
3.  Click the **Seed Mock Data & Teams** button.
    *   This automatically populates Firestore with **7 teams**, **15 seed user profiles** (students, reviewers, and admins on different teams), and historical **demonstration progress reports** (including pending, approved, and rejected records).
4.  Switch roles or assign players using the dynamic grid on the **User Management** screen to alternate between viewing the student forms, reviewing pending submissions, and reading analytics charts.

---

## 🚀 Production Deployment Instructions

### Step 1: Initialize Firebase Local CLI
In your local command terminal, authenticate and prepare for hosting:
```bash
# Login to Firebase Developer Account
firebase login

# Initialize project references in workspace
firebase init
```
During initialization, select:
1.  `Firestore: Configure security rules and indexes`
2.  `Hosting: Configure files for Firebase Hosting`
3.  Select your desired active project or configure a new Spark tier container instance.

### Step 2: Configure Client Credentials
Obtain your unique client keys from your [Firebase Console](https://console.firebase.google.com/) web application settings. Update `/src/firebase-applet-config.json` by inserting those keys:
```json
{
  "apiKey": "YOUR_ACTUAL_API_KEY",
  "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT_ID.appspot.com",
  "messagingSenderId": "YOUR_SENDER_ID",
  "appId": "YOUR_APP_ID",
  "firestoreDatabaseId": "(default)"
}
```

### Step 3: Trigger Production Uploads
To upload your validated security rules and compile your static responsive React client files to the Firebase Global CDN, execute these commands:
```bash
# Compile and build minified production static bundle
npm run build

# Deploy assets, index.html, and secure database rules
firebase deploy --only firestore:rules,hosting
```
Once completed, the CLI will output your live public production URL (e.g. `https://your-project-id.web.app`) to share and view!
