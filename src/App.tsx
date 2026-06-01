/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, FormEvent } from 'react';
import { 
  db, 
  auth, 
  signInWithGooglePopup, 
  logOut, 
  handleFirestoreError, 
  OperationType,
  getCachedAccessToken
} from './firebase';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

import { UserProfile, Team, Report, DashboardStats } from './types';
import Sidebar from './components/Sidebar';
import DarkToggle from './components/DarkToggle';
import ReportForm from './components/ReportForm';
import ReportCard from './components/ReportCard';
import StatsGrid from './components/StatsGrid';
import CSVExport from './components/CSVExport';
import { sendGmailNotification } from './gmailSender';

import { 
  Briefcase, 
  CheckSquare, 
  Users, 
  AlertTriangle, 
  FileText, 
  UserCheck, 
  Search, 
  Calendar, 
  ShieldAlert,
  Menu,
  ChevronDown,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  UserPlus,
  Coffee,
  Lock,
  Mail,
  Save
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]); // Primarily for Admins
  
  // App UI State
  const [currentTab, setCurrentTab] = useState<string>('student-dash');
  const [loading, setLoading] = useState<boolean>(true);
  const [teamNameMap, setTeamNameMap] = useState<Record<string, string>>({});
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});
  const [isPlaceholderConfig, setIsPlaceholderConfig] = useState<boolean>(false);

  // Cấu hình Thời gian nộp báo cáo & nhắc nhở
  const [sysStartTime, setSysStartTime] = useState<string>('08:00');
  const [sysEndTime, setSysEndTime] = useState<string>('22:00');
  const [sysReminderHour, setSysReminderHour] = useState<number>(21);
  const [sysReminderTime, setSysReminderTime] = useState<string>('21:00');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [gmailConnected, setGmailConnected] = useState<boolean>(false);

  // Filters State
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Admin Creation Forms State
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [submittingTeam, setSubmittingTeam] = useState<boolean>(false);
  const [teamFormError, setTeamFormError] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState<string>('');
  const [adminUserEditMessage, setAdminUserEditMessage] = useState<string | null>(null);

  // Whitelist & Enrollment States
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [wlEmail, setWlEmail] = useState<string>('');
  const [wlName, setWlName] = useState<string>('');
  const [wlRole, setWlRole] = useState<'student' | 'reviewer' | 'admin'>('student');
  const [wlTeamId, setWlTeamId] = useState<string>('');
  const [wlErrorMessage, setWlErrorMessage] = useState<string | null>(null);

  // Check if Config is placeholder
  useEffect(() => {
    const envApiKey = (import.meta as any).env.VITE_FIREBASE_API_KEY;
    if (envApiKey) {
      setIsPlaceholderConfig(envApiKey === 'PLACEHOLDER_API_KEY');
    } else {
      import('./firebase-applet-config.json').then((config) => {
        if (config.apiKey === 'PLACEHOLDER_API_KEY') {
          setIsPlaceholderConfig(true);
        }
      });
    }
  }, []);

  // 1. Authenticated User Listeners
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setAuthErrorMessage(null);
      if (firebaseUser) {
        const email = firebaseUser.email?.toLowerCase();
        const isDefaultAdmin = email === 'phongtt35@fpt.edu.vn';
        
        let allowed = isDefaultAdmin;
        let wlData: any = null;

        if (!allowed && email) {
          try {
            const wlRef = doc(db, 'whitelist', email);
            const wlSnap = await getDoc(wlRef);
            if (wlSnap.exists()) {
              allowed = true;
              wlData = wlSnap.data();
            }
          } catch (err: any) {
            console.error("Whitelist check failed:", err);
          }
        }

        if (!allowed) {
          console.warn("Unauthorized access blocked for Gmail:", email);
          setAuthErrorMessage(`Your Gmail address "${email}" is not authorized on this Capstone Project system. Please contact the administrator to pre-register your account on the whitelist.`);
          setCurrentUser(null);
          setUserProfile(null);
          try {
            await logOut();
          } catch (logOutErr) {
            console.error("Silent logout failed:", logOutErr);
          }
          setLoading(false);
          return;
        }

        // User is authorized
        setCurrentUser(firebaseUser);
        
        const profileRef = doc(db, 'users', firebaseUser.uid);
        try {
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            const currentData = profileSnap.data() as UserProfile;
            const targetRole = isDefaultAdmin ? 'admin' : (wlData?.role || currentData.role);
            const targetTeamId = isDefaultAdmin ? '' : (wlData?.teamId !== undefined ? wlData.teamId : currentData.teamId);
            
            if (currentData.role !== targetRole || currentData.teamId !== targetTeamId) {
              const upgraded: UserProfile = { ...currentData, role: targetRole, teamId: targetTeamId };
              await setDoc(profileRef, upgraded);
              setUserProfile(upgraded);
            } else {
              setUserProfile(currentData);
            }
          } else {
            // Self-register standard user. Sync with whitelist setup on first login.
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || wlData?.name || 'Unnamed Student',
              email: firebaseUser.email || '',
              teamId: isDefaultAdmin ? '' : (wlData?.teamId || ''),
              role: isDefaultAdmin ? 'admin' : (wlData?.role || 'student'),
            };
            await setDoc(profileRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.error("Auth Register Profile query denied:", err);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setReports([]);
        setAllUsers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Set default tabs based on Role once profile gets loaded
  useEffect(() => {
    if (userProfile) {
      if (userProfile.role === 'admin') {
        setCurrentTab('stats');
      } else if (userProfile.role === 'reviewer') {
        setCurrentTab('reviewer-review');
      } else {
        setCurrentTab('student-dash');
      }
    }
  }, [userProfile]);

  useEffect(() => {
    setGmailConnected(!!getCachedAccessToken());
  }, [currentUser]);

  // 1.5 Fetch Whitelist snapshots for real-time admin sync
  useEffect(() => {
    if (!currentUser || !userProfile || userProfile.role !== 'admin') {
      setWhitelist([]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'whitelist'), (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((d) => {
        fetched.push(d.data());
      });
      setWhitelist(fetched);
    }, (error) => {
      console.warn("Snapshot on whitelist denied:", error);
    });
    return () => unsub();
  }, [currentUser, userProfile]);

  // 2. Fetch Teams (Any authenticated user can read list of teams to identify peers, excluding config document)
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(collection(db, 'teams'), (snapshot) => {
      const fetched: Team[] = [];
      const mapping: Record<string, string> = {};
      snapshot.forEach((d) => {
        if (d.id !== 'sys_config_time') {
          const teamObj = d.data() as Team;
          fetched.push(teamObj);
          mapping[teamObj.id] = teamObj.name;
        }
      });
      setTeams(fetched);
      setTeamNameMap(mapping);
    }, (error) => {
      console.warn("Snapshot on teams denied:", error);
    });
    return () => unsub();
  }, [currentUser]);

  // 2.5 Fetch Live System Configuration
  useEffect(() => {
    if (!currentUser) return;
    const docRef = doc(db, 'teams', 'sys_config_time');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.startTime) setSysStartTime(data.startTime);
        if (data.endTime) setSysEndTime(data.endTime);
        if (data.reminderHour !== undefined) setSysReminderHour(data.reminderHour);
        if (data.reminderTime) setSysReminderTime(data.reminderTime);
      }
    }, (error) => {
      console.warn("Failed to listen to system configuration:", error);
    });
    return () => unsub();
  }, [currentUser]);

  // 2.6 Fetch Student Notifications (Simulated SMTP emails)
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.recipientUid === currentUser.uid || (userProfile && userProfile.role === 'admin')) {
          fetched.push(data);
        }
      });
      fetched.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setNotifications(fetched);
    }, (error) => {
      console.warn("Snapshot on notifications failed:", error);
    });
    return () => unsub();
  }, [currentUser, userProfile]);

  // 3. Fetch User Profiles Mapping (To translate student userId into names)
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetched: UserProfile[] = [];
      const nameMapping: Record<string, string> = {};
      snapshot.forEach((d) => {
        const pObj = d.data() as UserProfile;
        fetched.push(pObj);
        nameMapping[pObj.uid] = pObj.name;
      });
      setAllUsers(fetched);
      setUserNamesMap(nameMapping);
    }, (error) => {
      console.warn("Snapshot user profiles list denied:", error);
    });
    return () => unsub();
  }, [currentUser]);

  // 4. Secure dynamic report subscriptions using rule-compliant filtered queries
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    let q;
    const reportsColl = collection(db, 'reports');

    // Formulation of secure reports query to align with firestore rules enforcements
    if (userProfile.role === 'admin') {
      // Admins are permitted to download any records across collections
      q = query(reportsColl, orderBy('createdAt', 'desc'));
    } else {
      // Students and Reviewers are strictly bound to their assigned teams:
      // If teamId is blank, they cannot see any records, else they can only list teamId matched reports!
      if (!userProfile.teamId) {
        setReports([]);
        return;
      }
      q = query(reportsColl, where('teamId', '==', userProfile.teamId), orderBy('createdAt', 'desc'));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedReports: Report[] = [];
      snapshot.forEach((d) => {
        fetchedReports.push(d.data() as Report);
      });
      setReports(fetchedReports);
    }, (err) => {
      console.error("Reports subscription query was rejected by Security Rules:", err);
      // Fallback
    });

    return () => unsub();
  }, [currentUser, userProfile]);



  // Authentication Sign in triggers
  const handleSignIn = async () => {
    try {
      setAuthErrorMessage(null);
      const res = await signInWithGooglePopup();
      if (res && res.accessToken) {
        setGmailConnected(true);
      }
    } catch (err: any) {
      console.error(err);
      setAuthErrorMessage(`Đăng nhập thất bại: ${err.message || 'Lỗi xác nhận liên kết Google'}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      setGmailConnected(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const res = await signInWithGooglePopup();
      if (res && res.accessToken) {
        setGmailConnected(true);
        alert('Tích hợp kết nối tài khoản Gmail thành công!');
      }
    } catch (err: any) {
      console.error(err);
      alert('Kết nối tài khoản Gmail thất bại: ' + err.message);
    }
  };

  // Student creation and update handler
  const handleSaveReport = async (reportData: {
    id?: string;
    date: string;
    todayWork: string;
    blockers: string;
    tomorrowPlan: string;
    isRestDay?: boolean;
    restReason?: string;
  }) => {
    if (!userProfile || !userProfile.teamId) {
      throw new Error("You must be assigned to an active capstone team by an administrator before reporting progress.");
    }

    const reportId = reportData.id || `${userProfile.uid}_${reportData.date}`;
    const docRef = doc(db, 'reports', reportId);

    const isRest = !!reportData.isRestDay;
    const pathText = `reports/${reportId}`;

    if (reportData.id) {
      // UPDATE ACTION
      try {
        await updateDoc(docRef, {
          todayWork: reportData.todayWork,
          blockers: reportData.blockers,
          tomorrowPlan: reportData.tomorrowPlan,
          isRestDay: isRest,
          restReason: reportData.restReason || '',
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, pathText);
      }
    } else {
      // CREATE ACTION
      const newReport: Report = {
        id: reportId,
        userId: userProfile.uid,
        teamId: userProfile.teamId,
        date: reportData.date,
        todayWork: reportData.todayWork,
        blockers: reportData.blockers,
        tomorrowPlan: reportData.tomorrowPlan,
        status: 'pending',
        reviewComment: '',
        reviewedBy: '',
        reviewedAt: null,
        createdAt: serverTimestamp(),
        isRestDay: isRest,
        restReason: reportData.restReason || '',
      };

      try {
        await setDoc(docRef, newReport);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, pathText);
      }
    }
  };

  // Saved configuration time range submission save helper
  const handleSaveSystemConfig = async () => {
    if (!sysStartTime || !sysEndTime || !sysReminderTime) {
      alert('Vui lòng nhập đầy đủ mốc thời gian bắt đầu, hạn nộp báo cáo và thời điểm quét nhắc nhở!');
      return;
    }
    try {
      const docRef = doc(db, 'teams', 'sys_config_time');
      const parsedHour = parseInt(sysReminderTime.split(':')[0], 10) || 21;
      await setDoc(docRef, {
        id: 'sys_config_time',
        name: 'Cấu hình Thời gian nộp báo cáo',
        startTime: sysStartTime,
        endTime: sysEndTime,
        reminderHour: parsedHour,
        reminderTime: sysReminderTime,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert('Đã lưu cấu hình thời gian nộp báo cáo và thời điểm quét nhắc nhở đồ án thành công!');
    } catch (err: any) {
      console.error(err);
      alert('Lỗi lưu cấu hình: ' + err.message);
    }
  };

  // Reviewer Review decision update
  const handleReviewDecision = async (reportId: string, status: 'approved' | 'rejected', comment: string) => {
    if (!currentUser) return;
    const docRef = doc(db, 'reports', reportId);

    try {
      await updateDoc(docRef, {
        status,
        reviewComment: comment,
        reviewedBy: currentUser.uid,
        reviewedAt: serverTimestamp(),
      });

      // Fetch dynamic student profile data for SMTP email simulation log
//       const reportSnap = await getDoc(docRef);
//       if (reportSnap.exists()) {
//         const rData = reportSnap.data();
//         const studentUid = rData.userId;
//         const studentProfile = allUsers.find(u => u.uid === studentUid);
//         const studentEmail = studentProfile?.email || '';
//         const studentName = studentProfile?.name || 'Sinh viên';
        
//         const teacherEmail = userProfile?.email || 'phongtt35@fpt.edu.vn';
//         const teacherName = userProfile?.name || 'Giáo viên hướng dẫn';
        
//         const statusTextVn = status === 'approved' ? 'ĐÃ ĐƯỢC PHÊ DUYỆT' : 'KHÔNG ĐƯỢC DUYỆT / YÊU CẦU CHỈNH SỬA';
//         const mailSubject = `[Capstone Report] Kết quả đánh giá báo cáo ngày ${rData.date}`;
//         const mailBody = `Thành viên gửi: ${studentName} (${studentEmail})
// Dự án Nhóm: ${teamNameMap[rData.teamId] || 'Nhóm Đồ án'}

// Giáo viên hướng dẫn (${teacherName} - ${teacherEmail}) đã đánh giá báo cáo ngày ${rData.date} của bạn:

// Trở về trạng thái: ${statusTextVn}

// Nội dung nhận xét/phản hồi từ Giáo viên:
// "${comment || 'Giáo viên phê duyệt báo cáo thành công.'}"

// Vui lòng kiểm tra lại báo cáo trên cổng thông tin Capstone Report.

// Trân trọng,
// Hệ thống báo cáo tiến độ Đồ án Tốt nghiệp Capstone`;

//         const accessToken = getCachedAccessToken();
//         let gmailSentResult = false;
//         let errorMessage = '';

//         if (accessToken && studentEmail) {
//           try {
//             await sendGmailNotification(accessToken, studentEmail, mailSubject, mailBody);
//             gmailSentResult = true;
//           } catch (gErr: any) {
//             console.error("Lỗi gửi Gmail:", gErr);
//             errorMessage = gErr.message || String(gErr);
//           }
//         }

//         const notifId = `email_${Date.now()}_${studentUid}`;
//         await setDoc(doc(db, 'notifications', notifId), {
//           id: notifId,
//           recipientUid: studentUid,
//           recipientEmail: studentEmail,
//           senderEmail: teacherEmail,
//           senderName: teacherName,
//           subject: mailSubject,
//           body: mailBody,
//           createdAt: serverTimestamp(),
//           read: false,
//           reportId: reportId,
//           reportDate: rData.date,
//           status: status,
//           gmailSent: gmailSentResult,
//           gmailError: errorMessage || null
//         });

//         if (gmailSentResult) {
//           alert(`Đã phê duyệt báo cáo và gửi email thông báo qua Gmail thành công tới: ${studentEmail}`);
//         } else if (studentEmail) {
//           if (!accessToken) {
//             alert(`Đã lưu phê duyệt báo cáo thành công! Lưu ý: Email chưa gửi được do tài khoản chưa kết nối tích hợp Gmail. Vui lòng nhấp vào biểu tượng kết nối Gmail ở góc màn hình để nhận quyền hỗ trợ gửi thư.`);
//           } else {
//             alert(`Đã lưu phê duyệt báo cáo thành công, tuy nhiên xảy ra lỗi từ API của Gmail: ${errorMessage}`);
//           }
//         }
//       }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  // Admin Team creation Form
  const handleCreateTeamSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTeamFormError(null);
    if (!newTeamName.trim()) {
      setTeamFormError('Team Name cannot be empty.');
      return;
    }

    const teamId = 'team-' + newTeamName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    setSubmittingTeam(true);

    try {
      await setDoc(doc(db, 'teams', teamId), {
        id: teamId,
        name: newTeamName.trim(),
        createdAt: Timestamp.now()
      });
      setNewTeamName('');
    } catch (err: any) {
      console.error(err);
      setTeamFormError(err.message || 'Error occurred during team registration in Firestore.');
    } finally {
      setSubmittingTeam(false);
    }
  };

  // Admin Update/Edit Team
  const handleEditTeamSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTeamFormError(null);
    if (!editingTeamId) return;
    if (!editingTeamName.trim()) {
      setTeamFormError('Tên nhóm không được để trống.');
      return;
    }
    setSubmittingTeam(true);
    try {
      await updateDoc(doc(db, 'teams', editingTeamId), {
        name: editingTeamName.trim()
      });
      setEditingTeamId(null);
      setEditingTeamName('');
      alert('Cập nhật tên nhóm đồ án thành công!');
    } catch (err: any) {
      console.error(err);
      setTeamFormError(err.message || 'Có lỗi xảy ra khi cập nhật nhóm đồ án.');
    } finally {
      setSubmittingTeam(false);
    }
  };

  // Admin Delete Team
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhóm "${teamName}"? Hành động này sẽ xóa vĩnh viễn nhóm.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'teams', teamId));
      alert(`Đã xóa nhóm "${teamName}" thành công khỏi hệ thống!`);
    } catch (err: any) {
      console.error(err);
      alert(`Có lỗi xảy ra khi xóa nhóm: ${err.message}`);
    }
  };

  // Admin select changes on user roles/teams
  const handleSaveUserByAdmin = async (userId: string, assignedTeamId: string, role: 'student' | 'reviewer' | 'admin') => {
    setAdminUserEditMessage(null);
    const userRef = doc(db, 'users', userId);

    try {
      await updateDoc(userRef, {
        teamId: assignedTeamId,
        role: role,
      });
      setAdminUserEditMessage("User profile successfully updated.");
      setTimeout(() => setAdminUserEditMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setAdminUserEditMessage(`Error: ${err.message || 'Check firestore console.'}`);
    }
  };

  // Add account to authorization whitelist
  const handleAddWhitelist = async (e: FormEvent) => {
    e.preventDefault();
    setWlErrorMessage(null);
    if (!wlEmail.trim()) {
      setWlErrorMessage("Gmail address is required.");
      return;
    }
    if (!wlEmail.trim().toLowerCase().includes('@')) {
      setWlErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!wlName.trim()) {
      setWlErrorMessage("Full Name registration index is required.");
      return;
    }
    
    const emailKey = wlEmail.trim().toLowerCase();
    
    try {
      const wlRef = doc(db, 'whitelist', emailKey);
      await setDoc(wlRef, {
        email: emailKey,
        name: wlName.trim(),
        role: wlRole,
        teamId: wlTeamId,
        createdAt: Timestamp.now(),
      });

      // Synchronize back if the user is already logged in
      const existingUser = allUsers.find((u) => u.email.toLowerCase() === emailKey);
      if (existingUser) {
        const userRef = doc(db, 'users', existingUser.uid);
        await updateDoc(userRef, {
          role: wlRole,
          teamId: wlTeamId,
        });
      }

      setWlEmail('');
      setWlName('');
      setWlRole('student');
      setWlTeamId('');
      setAdminUserEditMessage(`"${emailKey}" successfully added to authorized whitelist.`);
      setTimeout(() => setAdminUserEditMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setWlErrorMessage(err.message || "Failed to finalize whitelist setup in Firestore.");
    }
  };

  // Delete account from authorization whitelist
  const handleDeleteWhitelist = async (emailKey: string) => {
    if (!window.confirm(`Are you sure you want to revoke access and delete "${emailKey}" from pre-authorized whitelist?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'whitelist', emailKey.toLowerCase()));
      setAdminUserEditMessage(`"${emailKey}" removed from pre-authorized whitelist.`);
      setTimeout(() => setAdminUserEditMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setAdminUserEditMessage(`Error deleting entry: ${err.message}`);
    }
  };

  // Evaluate if current local hour falls inside the configured start and end hour range
  const getIsWithinTimeRange = () => {
    try {
      const now = new Date();
      const hr = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hr}:${min}`;
      return currentTime >= sysStartTime && currentTime <= sysEndTime;
    } catch (e) {
      return true;
    }
  };
  const isWithinTimeRange = getIsWithinTimeRange();

  // Hydrate reports with printable student names and team names from reactive lists
  const hydratedReports: Report[] = reports.map((report) => ({
    ...report,
    userName: userNamesMap[report.userId] || report.userId,
    teamName: teamNameMap[report.teamId] || report.teamId,
    reviewedByName: userNamesMap[report.reviewedBy] || report.reviewedBy
  }));

  // Perform search & filters matching
  const filteredReports = hydratedReports.filter((r) => {
    const matchesDate = !filterDate || r.date === filterDate;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesSearch = !searchTerm || 
      (r.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.todayWork || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.blockers || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.teamName || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesDate && matchesStatus && matchesSearch;
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <RefreshCw className="h-10 w-10 text-sky-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-gray-400">Đang khởi động hệ thống Báo cáo đồ án Capstone...</p>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!currentUser || !userProfile) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white dark:bg-gray-905 border border-gray-100 dark:border-gray-800 p-8 rounded-3xl shadow-xl flex flex-col gap-6 text-center animate-fade-in">
          <div className="mx-auto p-4 bg-sky-50 dark:bg-sky-950/40 rounded-2xl text-sky-500 shadow-inner">
            <CheckSquare className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Báo cáo Đồ án Capstone</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Cổng thông tin tổng hợp và giám sát tiến độ đồ án tốt nghiệp theo thời gian thực. Đăng nhập bằng tài khoản Google (Gmail giáo dục / whitelist) để hoàn thành báo cáo ngày và xem kết quả phê duyệt.
            </p>
          </div>

          {/* Authorization Whitelist Error Banner */}
          {authErrorMessage && (
            <div className="p-4 bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-400 text-xs rounded-2xl border border-red-200/50 dark:border-red-900/50 text-left space-y-1.5 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <Lock className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-red-900 dark:text-red-300">Không Có Quyền Truy Cập</strong>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    {authErrorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Configuration warning if config is using default placeholder values */}
          {isPlaceholderConfig && (
            <div className="p-4 bg-amber-50/50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 text-xs rounded-2xl border border-amber-200/50 dark:border-amber-900/50 text-left space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Chưa cấu hình Firebase</strong>
                  <p className="mt-1">
                    Vui lòng sử dụng UI Setup Firebase hoặc điền API Key thực tế vào `src/firebase-applet-config.json` để tiến hành lưu trữ dữ liệu.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            id="btn-google-login"
            onClick={handleSignIn}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl border border-gray-250 dark:border-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 font-bold text-sm text-slate-700 dark:text-white shadow-sm transition-all focus:ring-2 focus:ring-sky-500 select-none cursor-pointer"
          >
            {/* Google Logo representation */}
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Đăng nhập bằng Google Account
          </button>
        </div>
      </main>
    );
  }

  // RENDER MAIN APPLICATION INTERFACE
  const teamNameString = teamNameMap[userProfile.teamId] || '';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col lg:flex-row transition-colors">
      
      {/* Primary Sidebar Layout */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        userProfile={userProfile} 
        teamName={teamNameString} 
        onLogout={handleSignOut} 
      />

      {/* Main Content Pane */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        {/* Upper Control Bar */}
        <header className="h-16 px-6 lg:px-8 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between sticky top-0 z-10 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-extrabold tracking-wider text-sky-500 font-mono">
              ROLE: {userProfile.role}
            </span>
            {userProfile.teamId && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-xs text-slate-500 font-semibold truncate max-w-[200px]">
                  Team {teamNameString}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {userProfile.role !== 'student' && (
              <div className="flex items-center mr-1">
                {gmailConnected ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] uppercase font-bold tracking-wider rounded-xl border border-emerald-100 dark:border-emerald-900 select-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Tích hợp Gmail: ĐÃ BẬT</span>
                  </div>
                ) : (
                  <button 
                    onClick={handleConnectGmail}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900 border border-amber-200 dark:border-amber-900 text-[10px] uppercase font-bold tracking-wider rounded-xl transition-all cursor-pointer select-none"
                    title="Nhấp để xác thực tài khoản Gmail gửi thông báo tự động"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Kết nối Gmail</span>
                  </button>
                )}
              </div>
            )}
            <DarkToggle />
          </div>
        </header>

        {/* Dash Container */}
        <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
          
          {/* USER BANNER FOR UNASSIGNED MEMBERS */}
          {userProfile.role !== 'admin' && !userProfile.teamId && (
            <div className="p-5 bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 text-amber-800 dark:text-amber-400 rounded-3xl flex gap-4">
              <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Chưa được phân nhóm đồ án</h4>
                <p className="text-xs mt-1.5 leading-relaxed">
                  Hiện bạn chưa được phân khoa hoặc phân nhóm đồ án Capstone nào. Các tiện ích nộp báo cáo tiến trình hàng ngày cùng bảng tiến độ của đồng đội sẽ được mở khóa ngay khi Quản trị viên chỉ định bạn vào một nhóm phù hợp.
                </p>
              </div>
            </div>
          )}

          {/* TAB CONTENT 1: STUDENT DASHBOARD */}
          {currentTab === 'student-dash' && userProfile.role === 'student' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Submit Form Column */}
                <div className="lg:col-span-2 space-y-6">
                  <ReportForm 
                    userProfile={userProfile} 
                    existingReports={reports} 
                    startTime={sysStartTime}
                    endTime={sysEndTime}
                    isWithinTimeRange={isWithinTimeRange}
                    onSubmit={handleSaveReport} 
                  />
                </div>

                {/* Historic list Column */}
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm font-sans">
                    <h4 className="font-bold text-md text-slate-800 dark:text-white mb-4 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-sky-500" />
                      <span>Lịch sử báo cáo cá nhân</span>
                    </h4>

                    <div className="space-y-3 max-h-[480px] overflow-y-auto">
                      {hydratedReports
                        .filter((r) => r.userId === userProfile.uid)
                        .map((r) => (
                          <div 
                            key={r.id} 
                            className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-slate-800 dark:text-white">{r.date}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[150px]">{r.isRestDay ? `Nghỉ phép: ${r.restReason}` : r.todayWork}</p>
                            </div>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase shrink-0 ${
                              r.status === 'approved' 
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                : r.status === 'rejected' 
                                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' 
                                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                            }`}>
                              {r.status === 'approved' ? 'Đã duyệt' : r.status === 'rejected' ? 'Trả về' : 'Đang duyệt'}
                            </span>
                          </div>
                      ))}

                      {hydratedReports.filter((r) => r.userId === userProfile.uid).length === 0 && (
                        <p className="text-gray-400 dark:text-gray-500 text-xs italic text-center py-6">Chưa có dữ liệu báo cáo nào được ghi nhận.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT 2: TEAMMATE'S REPORTS LOG (STUDENT) */}
          {currentTab === 'student-teammates' && userProfile.role === 'student' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-sky-500" />
                    <span>Teammates' Reports Feed</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Review the log of accomplishments submitted by other members of {teamNameString}</p>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap gap-2.5 items-center">
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs dark:bg-gray-900 dark:text-white"
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs dark:bg-gray-900 dark:text-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredReports
                  .filter((r) => r.userId !== userProfile.uid) // Teammates only
                  .map((report) => (
                    <ReportCard 
                      key={report.id} 
                      report={report} 
                      userRole={userProfile.role} 
                      userTeamId={userProfile.teamId} 
                    />
                ))}

                {filteredReports.filter((r) => r.userId !== userProfile.uid).length === 0 && (
                  <div className="col-span-1 md:col-span-2 py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
                    No matching teammate records found for your current filter.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REVIEWER: TAB PENDING REVIEWS */}
          {currentTab === 'reviewer-review' && userProfile.role === 'reviewer' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-sky-500" />
                  <span>Pending Team Reviews</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Daily reports from {teamNameString} seeking verify checks. Add comment reviews promptly.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hydratedReports
                  .filter((r) => r.status === 'pending')
                  .map((report) => (
                    <ReportCard 
                      key={report.id} 
                      report={report} 
                      userRole={userProfile.role} 
                      userTeamId={userProfile.teamId} 
                      onReview={handleReviewDecision}
                    />
                ))}

                {hydratedReports.filter((r) => r.status === 'pending').length === 0 && (
                  <div className="col-span-1 md:col-span-2 py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
                    Amazing! No pending reviews awaiting actions. Your queue is clean!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REVIEWER: TAB ALL TEAM REPORTS LOG */}
          {currentTab === 'reviewer-team-reports' && userProfile.role === 'reviewer' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-sky-500" />
                    <span>Team Reports Archive</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Historical ledger of all submissions logged by the {teamNameString} members</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs dark:bg-gray-900 dark:text-white"
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs dark:bg-gray-900 dark:text-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredReports.map((report) => (
                  <ReportCard 
                    key={report.id} 
                    report={report} 
                    userRole={userProfile.role} 
                    userTeamId={userProfile.teamId} 
                    onReview={handleReviewDecision}
                  />
                ))}

                {filteredReports.length === 0 && (
                  <div className="col-span-1 md:col-span-2 py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
                    No report matching filters has been registered for your active team.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REVIEWER & ADMIN STATISTICS PAGE */}
          {(currentTab === 'reviewer-stats' || currentTab === 'stats') && (
            <div className="space-y-8 animate-fade-in animate-slide-down">
              <div>
                <h3 className="text-xl font-bold dark:text-white">
                  {currentTab === 'stats' ? 'Analytics Insights Master' : 'Team Analytics & Statistics'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Real-time status metrics and student report velocity visualizations</p>
              </div>

              <StatsGrid reports={reports} teams={teams} allUsers={allUsers} />
            </div>
          )}

          {/* BONUS FEATURE: WEEKLY SUMMARY LOG (STUDENTS & REVIEWERS) */}
          {currentTab === 'weekly-summary' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-sky-500" />
                  <span>Weekly Summary Accomplishments</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  A breakdown grouping teammate accomplishments of {teamNameString || 'Mocked Team'} to display weekly outputs.
                </p>
              </div>

              {/* Weekly aggregations list */}
              <div className="space-y-6">
                {allUsers
                  .filter((u) => u.teamId === userProfile.teamId && u.role === 'student')
                  .map((stud) => {
                    const studentReps = hydratedReports.filter((r) => r.userId === stud.uid);
                    return (
                      <div 
                        key={stud.uid} 
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                            {stud.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white">{stud.name}</h4>
                            <p className="text-[10px] text-gray-400 truncate">{stud.email}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {studentReps.map((rep) => (
                            <div 
                              key={rep.id} 
                              className="p-4 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex justify-between items-center gap-2 text-[10px] mb-2">
                                  <span className="font-mono bg-gray-105 px-1 py-0.5 rounded text-gray-500 dark:bg-gray-800">{rep.date}</span>
                                  <span className={`px-2 py-0.5 rounded-full font-extrabold uppercase scale-90 ${
                                    rep.status === 'approved' 
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                      : rep.status === 'rejected' 
                                        ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                                        : 'bg-amber-50 text-amber-600 border border-amber-200'
                                  }`}>
                                    {rep.status}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 italic">&ldquo;{rep.todayWork}&rdquo;</p>
                              </div>
                            </div>
                          ))}

                          {studentReps.length === 0 && (
                            <p className="text-xs italic text-gray-400 dark:text-gray-550 py-3 block col-span-3">No report submissions recorded this week.</p>
                          )}
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>
          )}

          {/* TAB CONTENT 1.5: STUDENT NOTIFICATIONS */}
          {currentTab === 'student-notifications' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                    <Mail className="h-5 w-5 text-sky-500 shrink-0" />
                    <span>Hộp thư Email và Thông báo từ Giáo viên</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Hộp thư giả lập các email thông báo phê duyệt hoặc từ chối được giáo viên hướng dẫn gửi tự động
                  </p>
                </div>
              </div>

              <div className="space-y-4 max-w-4xl">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-gray-150 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-800">
                    <Mail className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-700 dark:text-gray-300">Hộp thư của bạn đang trống</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-md mx-auto">Khi được phân nhóm, nộp bài báo cáo và nhận quyết định duyệt/từ chối kèm nhận xét từ Giáo viên hướng dẫn, thông báo email dạng thức đầy đủ sẽ hiện thực tại đây.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 hover:border-gray-250 dark:hover:border-gray-600 transition-all flex flex-col gap-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 dark:border-gray-700 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                            notif.status === 'approved' 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                          }`}>
                            {notif.status === 'approved' ? 'Đã phê duyệt' : 'Yêu cầu sửa'}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{notif.subject}</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Người gửi: <b>{notif.senderName} ({notif.senderEmail})</b> &bull; Đến: {notif.recipientEmail}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0 select-none font-mono">
                          {notif.reportDate ? `Ngày báo cáo: ${notif.reportDate}` : ''}
                        </span>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-sans border border-slate-100/40 dark:border-slate-800">
                        {notif.body}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ADMIN: TEAM CREATE PANEL */}
          {currentTab === 'admin-teams' && userProfile.role === 'admin' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Create Form and Settings column */}
                <div className="lg:col-span-1 space-y-8">
                  {/* Create / Edit Team Form Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    {editingTeamId ? (
                      <>
                        <div>
                          <h4 className="font-bold text-md dark:text-white text-emerald-600 dark:text-emerald-400">Cập nhật Nhóm Đồ án</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Chỉnh sửa tên nhóm của mã {editingTeamId}</p>
                        </div>

                        <form onSubmit={handleEditTeamSubmit} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Tên Nhóm / Tên Đề tài Đồ án</label>
                            <input
                              id="txt-admin-team-title-edit"
                              type="text"
                              value={editingTeamName}
                              onChange={(e) => setEditingTeamName(e.target.value)}
                              placeholder="Ví dụ: Đồ án IoT Y tế Thông minh"
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500"
                            />
                          </div>

                          {teamFormError && (
                            <div className="p-3 bg-red-50 text-red-700 text-[10px] rounded-lg border border-red-150 flex items-start gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span>{teamFormError}</span>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              id="btn-admin-team-cancel-edit"
                              type="button"
                              onClick={() => {
                                setEditingTeamId(null);
                                setEditingTeamName('');
                                setTeamFormError(null);
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-medium transition-all select-none cursor-pointer"
                            >
                              Hủy bỏ
                            </button>
                            <button
                              id="btn-admin-team-save-edit"
                              type="submit"
                              disabled={submittingTeam}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm select-none cursor-pointer"
                            >
                              <Save className="h-4 w-4" />
                              <span>Lưu</span>
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <>
                        <div>
                          <h4 className="font-bold text-md dark:text-white">Tạo mới Nhóm Đồ án</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Đăng ký thêm nhóm đồ án Capstone vào hệ thống</p>
                        </div>

                        <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Tên Nhóm / Tên Đề tài Đồ án</label>
                            <input
                              id="txt-admin-team-title"
                              type="text"
                              value={newTeamName}
                              onChange={(e) => setNewTeamName(e.target.value)}
                              placeholder="Ví dụ: Đồ án IoT Y tế Thông minh"
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500"
                            />
                          </div>

                          {teamFormError && (
                            <div className="p-3 bg-red-50 text-red-700 text-[10px] rounded-lg border border-red-150 flex items-start gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span>{teamFormError}</span>
                            </div>
                          )}

                          <button
                            id="btn-admin-team-create"
                            type="submit"
                            disabled={submittingTeam}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm select-none cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                            <span>{submittingTeam ? 'Đang tạo nhóm...' : 'Tạo nhóm mới'}</span>
                          </button>
                        </form>
                      </>
                    )}
                  </div>

                  {/* Cấu hình Giờ nộp Báo cáo Form Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 font-sans leading-none">
                    <div>
                      <h4 className="font-bold text-md dark:text-white">Cấu hình Hệ thống &amp; Quét nhắc nhở</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">Giới hạn thời gian nộp bài hàng ngày và thiếp lập quét báo cáo nhắc nhở tự động qua Gmail</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Giờ bắt đầu cho phép nộp (Ví dụ: 08:00)</label>
                        <input
                          id="txt-sys-start-time"
                          type="text"
                          value={sysStartTime}
                          onChange={(e) => setSysStartTime(e.target.value)}
                          placeholder="e.g. 08:00"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Giờ kết thúc / Hạn nộp báo cáo (Ví dụ: 22:00)</label>
                        <input
                          id="txt-sys-end-time"
                          type="text"
                          value={sysEndTime}
                          onChange={(e) => setSysEndTime(e.target.value)}
                          placeholder="e.g. 22:00"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Thời điểm hệ thống quét nhắc nhở (Ví dụ: 21:00)</label>
                        <input
                          id="txt-sys-reminder-time"
                          type="text"
                          value={sysReminderTime}
                          onChange={(e) => setSysReminderTime(e.target.value)}
                          placeholder="e.g. 21:00"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <button
                        id="btn-save-sys-config"
                        onClick={handleSaveSystemConfig}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer select-none"
                      >
                        <Save className="h-4 w-4" />
                        <span>Lưu cấu hình hệ thống</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Teams List column */}
                <div className="lg:col-span-2">
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm font-sans">
                    <h4 className="font-bold text-md dark:text-white mb-4">Các Nhóm Đồ án hiện hành ({teams.length})</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {teams.map((t) => (
                        <div 
                          key={t.id} 
                          className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/30 border border-gray-150 dark:border-gray-700 flex flex-col justify-between group transition-all"
                        >
                          <div className="flex justify-between items-start gap-2 w-full">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-mono font-bold text-indigo-500 tracking-wide">Mã định danh: {t.id}</span>
                              <h5 className="font-bold text-sm text-slate-800 dark:text-white mt-1 leading-snug">{t.name}</h5>
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingTeamId(t.id);
                                  setEditingTeamName(t.name);
                                  setTeamFormError(null);
                                }}
                                title="Chỉnh sửa tên nhóm"
                                className="p-1 px-1.5 rounded-lg text-gray-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 border border-transparent hover:border-sky-100 transition-all cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTeam(t.id, t.name)}
                                title="Xóa nhóm này"
                                className="p-1 px-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {teams.length === 0 && (
                        <p className="text-gray-400 dark:text-gray-500 italic text-center text-xs py-10 col-span-2">Chưa có nhóm đồ án nào được định nghĩa trên hệ thống.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN: USER ROLES & TEAM ASSIGNMENT PANEL */}
          {currentTab === 'admin-users' && userProfile.role === 'admin' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold dark:text-white">Security Authorization Control Panel</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Pre-authorize specific student and reviewer Gmail accounts. Unregistered users are blocked safely from logging in or reading any database records.
                  </p>
                </div>
              </div>

              {adminUserEditMessage && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 text-xs rounded-xl flex items-center gap-1.5 animate-fade-in">
                  <UserCheck className="h-4 w-4 text-indigo-500 animate-pulse" />
                  <span>{adminUserEditMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* COLUMN 1: PRE-AUTHORIZE / WHITELIST FORM */}
                <div className="xl:col-span-1 space-y-6">
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-indigo-500" />
                      <div>
                        <h4 className="font-bold text-sm dark:text-white">Register Whitelisted Gmail</h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Pre-authorize a Capstone Student or Reviewer</p>
                      </div>
                    </div>

                    <form onSubmit={handleAddWhitelist} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-705 dark:text-gray-300">Gmail Address (@fpt.edu.vn or @gmail.com)</label>
                        <input
                          id="txt-wl-email"
                          type="email"
                          value={wlEmail}
                          onChange={(e) => setWlEmail(e.target.value)}
                          placeholder="e.g. student35@fpt.edu.vn"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-705 dark:text-gray-300">Expected Full Name</label>
                        <input
                          id="txt-wl-name"
                          type="text"
                          value={wlName}
                          onChange={(e) => setWlName(e.target.value)}
                          placeholder="e.g. Nguyen Van A"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-gray-50/50 dark:bg-gray-900/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-705">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-mono font-black text-slate-600 dark:text-gray-400">Role</label>
                          <select
                            id="sel-wl-role"
                            value={wlRole}
                            onChange={(e) => setWlRole(e.target.value as 'student' | 'reviewer' | 'admin')}
                            className="w-full px-2 py-1 bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-700 rounded-lg text-xs dark:text-white focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="student">Student</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-mono font-black text-slate-600 dark:text-gray-400">Assign Team</label>
                          <select
                            id="sel-wl-team"
                            value={wlTeamId}
                            onChange={(e) => setWlTeamId(e.target.value)}
                            className="w-full px-2 py-1 bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-700 rounded-lg text-xs dark:text-white focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="">Unassigned</option>
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {wlErrorMessage && (
                        <div className="p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-450 text-[10px] rounded-lg flex items-start gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-rose-500" />
                          <span>{wlErrorMessage}</span>
                        </div>
                      )}

                      <button
                        id="btn-add-whitelist"
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm select-none cursor-pointer"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Authorize User</span>
                      </button>
                    </form>
                  </div>
                </div>

                {/* COLUMN 2 & 3: AUTHORIZATION WHITELIST & DIRECTORY */}
                <div className="xl:col-span-2 space-y-6">
                  {/* WHITELIST ROSTER TABLE */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/55 dark:bg-gray-950/25">
                      <div>
                        <h4 className="font-bold text-sm dark:text-white">Active Whitelisted Accounts ({whitelist.length})</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">Pre-authorized emails permitted to bypass login restricted bounds</p>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 font-bold bg-gray-50/20 dark:bg-gray-950/10">
                            <th className="p-3">Target Gmail Account</th>
                            <th className="p-3">Designated Profile</th>
                            <th className="p-3">Status Connection</th>
                            <th className="p-3 flex justify-end pr-5">Revoke</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {whitelist.map((item) => {
                            const isUserActive = allUsers.some((u) => u.email.toLowerCase() === item.email.toLowerCase());
                            return (
                              <tr key={item.email} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                                <td className="p-3">
                                  <span className="font-mono text-slate-800 dark:text-gray-200 block">{item.email}</span>
                                </td>
                                <td className="p-3 text-slate-600 dark:text-gray-300">
                                  <strong className="block text-xs font-bold text-slate-850 dark:text-white">{item.name}</strong>
                                  <div className="inline-flex gap-1.5 items-center mt-1">
                                    <span className="text-[9px] uppercase font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded font-black">
                                      {item.role}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                      {teamNameMap[item.teamId] || 'No Team Assigned'}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  {isUserActive ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/35 px-2 py-0.5 rounded-full">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                      Active Registered
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/25 px-2 py-0.5 rounded-full">
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                                      Invitation Pending
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right pr-5">
                                  <button
                                    id={`btn-del-wl-${item.email.replace(/[^a-z0-9]/g, '-')}`}
                                    onClick={() => handleDeleteWhitelist(item.email)}
                                    className="p-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-700 dark:bg-rose-950/30 dark:hover:bg-rose-950/55 dark:text-rose-400 transition-colors cursor-pointer"
                                    title="Revoke Pre-authorization"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {whitelist.length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-gray-400 dark:text-gray-500 italic">
                                No pre-authorized Student/Reviewer accounts present on the secure whitelist.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ACTIVE REGISTERED SIGNED-IN USER DIRECTORY VIEW */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/55 dark:bg-gray-950/25">
                      <h4 className="font-bold text-sm dark:text-white">Active Signed-in Users Roster ({allUsers.length})</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Accounts actively signed-in via Google credentials with current cached session uids</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 font-bold bg-gray-50/20 dark:bg-gray-950/10">
                            <th className="p-3">Verified Member Name</th>
                            <th className="p-3">Teammate Group Assignment</th>
                            <th className="p-3">Role Level Access</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {allUsers.map((user) => (
                            <tr key={user.uid} className="hover:bg-gray-50/40 dark:hover:bg-gray-850 transition-colors">
                              <td className="p-3">
                                <strong className="block text-slate-805 dark:text-white font-bold">{user.name}</strong>
                                <span className="text-gray-400 text-[10px] block font-mono">{user.email}</span>
                              </td>
                              <td className="p-3">
                                <select
                                  id={`sel-user-team-${user.uid}`}
                                  value={user.teamId || ''}
                                  onChange={(e) => handleSaveUserByAdmin(user.uid, e.target.value, user.role)}
                                  className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-705 rounded text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none dark:text-slate-200"
                                >
                                  <option value="">Unassigned</option>
                                  {teams.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-3">
                                <select
                                  id={`sel-user-role-${user.uid}`}
                                  value={user.role}
                                  onChange={(e) => handleSaveUserByAdmin(user.uid, user.teamId, e.target.value as 'student' | 'reviewer' | 'admin')}
                                  className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-705 rounded text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none dark:text-slate-200"
                                >
                                  <option value="student">Student</option>
                                  <option value="reviewer">Reviewer</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN: MASTER PROGRESS REPORTS LEDGER */}
          {currentTab === 'admin-reports' && userProfile.role === 'admin' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-sky-500" />
                    <span>Lynchpin Reports Log Ledger</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Audit, monitor and print overall student outputs directly utilizing the system filters</p>
                </div>

                {/* Filters & Export controls Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      id="txt-search-reports"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search reports text or authors..."
                      className="pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs dark:bg-gray-900 dark:text-white w-48 focus:w-64 transition-all focus:outline-none"
                    />
                  </div>
                  <input
                    id="date-filter-admin"
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs dark:bg-gray-900 dark:text-white focus:outline-none"
                  />
                  <select
                    id="status-filter-admin"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs dark:bg-gray-900 dark:text-white h-7.5"
                  >
                    <option value="all">Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <CSVExport reports={filteredReports} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredReports.map((report) => (
                  <ReportCard 
                    key={report.id} 
                    report={report} 
                    userRole={userProfile.role} 
                    userTeamId={userProfile.teamId} 
                    onReview={handleReviewDecision}
                  />
                ))}

                {filteredReports.length === 0 && (
                  <div className="col-span-1 md:col-span-2 py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
                    No reports match the provided filter. Try refreshing or seeding mock database sets.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
