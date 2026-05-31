/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'student' | 'reviewer' | 'admin';
export type ReportStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  teamId: string; // Empty string if not assigned
  role: UserRole;
  createdAt?: any;
}

export interface Team {
  id: string;
  name: string;
  createdAt?: any;
}

export interface Report {
  id: string;
  userId: string;
  userName?: string; // Hydrated for UI display convenience
  userEmail?: string; // Hydrated for UI
  teamId: string;
  teamName?: string; // Hydrated for UI
  date: string; // Format: YYYY-MM-DD
  todayWork: string;
  blockers: string;
  tomorrowPlan: string;
  status: ReportStatus;
  reviewComment: string;
  reviewedBy: string; // uid of reviewer
  reviewedByName?: string; // Name of reviewer
  reviewedAt: any | null; // Firestore Timestamp or null
  createdAt: any; // Firestore Timestamp
  isRestDay?: boolean;
  restReason?: string;
}

export interface WhitelistEntry {
  email: string; // Primary key (lowercase)
  name: string;
  role: UserRole;
  teamId: string; // empty if unassigned
  createdAt?: any;
}

export interface DashboardStats {
  totalReports: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  approvalRate: number; // approved / total
  missingReportsToday: number;
  reportsByTeam: { [teamId: string]: { teamName: string; count: number; approved: number } };
}
