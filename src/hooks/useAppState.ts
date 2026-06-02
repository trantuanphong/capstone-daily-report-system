/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
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
  onSnapshot,
  Timestamp,
  query,
  orderBy,
  where,
  serverTimestamp
} from 'firebase/firestore';

import { 
  db, 
  auth, 
  signInWithGooglePopup, 
  logOut, 
  handleFirestoreError, 
  OperationType,
  getCachedAccessToken
} from '../firebase';
import { UserProfile, Team, Report } from '../types';
import { sendGmailNotification } from '../gmailSender';

export function useAppState() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  // App UI State
  const [currentTab, setCurrentTab] = useState<string>('student-dash');
  const [loading, setLoading] = useState<boolean>(true);
  const [teamNameMap, setTeamNameMap] = useState<Record<string, string>>({});
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});
  const [isPlaceholderConfig, setIsPlaceholderConfig] = useState<boolean>(false);

  // System Configuration & Sweeper States
  const [sysStartTime, setSysStartTime] = useState<string>('08:00');
  const [sysEndTime, setSysEndTime] = useState<string>('22:00');
  const [sysReminderTime, setSysReminderTime] = useState<string>('21:00');

  // Custom SMTP Configurations
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPass, setSmtpPass] = useState<string>('');
  const [smtpHost, setSmtpHost] = useState<string>('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState<number>(465);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [gmailConnected, setGmailConnected] = useState<boolean>(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  // Whitelist & Admin Feedback States
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [adminUserEditMessage, setAdminUserEditMessage] = useState<string | null>(null);

  // Check if Config is placeholder
  useEffect(() => {
    const envApiKey = (import.meta as any).env.VITE_FIREBASE_API_KEY;
    setIsPlaceholderConfig(!envApiKey || envApiKey === 'PLACEHOLDER_API_KEY');
  }, []);

  // 1. Authenticated User Listeners
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
          setAuthErrorMessage(`Địa chỉ Gmail "${email}" chưa được ủy quyền trên hệ thống đồ án này. Vui lòng liên hệ với Quản trị viên nhóm để đăng ký trước email của bạn vào danh sách Whitelist.`);
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
            // Self-register user based on whitelist defaults
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

  // Real-time admin whitelist snapshots
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

  // Real-time teams mapping
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

  // Real-time system configurations
  useEffect(() => {
    if (!currentUser) return;
    const docRef = doc(db, 'teams', 'sys_config_time');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.startTime) setSysStartTime(data.startTime);
        if (data.endTime) setSysEndTime(data.endTime);
        if (data.reminderTime) setSysReminderTime(data.reminderTime);
      }
    }, (error) => {
      console.warn("Failed to listen to system configuration:", error);
    });
    return () => unsub();
  }, [currentUser]);

  // Real-time custom SMTP configuration
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    if (userProfile.role !== 'admin' && userProfile.role !== 'reviewer') return;
    const unsub = onSnapshot(doc(db, 'email_config', 'smtp'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.user) setSmtpUser(data.user);
        if (data.pass) setSmtpPass(data.pass);
        if (data.host) setSmtpHost(data.host);
        if (data.port) setSmtpPort(data.port);
      }
    }, (error) => {
      console.warn("Failed to listen to email configuration:", error);
    });
    return () => unsub();
  }, [currentUser, userProfile]);

  // Real-time student SMTP simulation notifications
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

  // Real-time users directory
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

  // Real-time reports ledger secure subscription
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    let q;
    const reportsColl = collection(db, 'reports');

    if (userProfile.role === 'admin') {
      q = query(reportsColl, orderBy('createdAt', 'desc'));
    } else {
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
    });

    return () => unsub();
  }, [currentUser, userProfile]);

  // Authentication Handlers
  const handleSignIn = async () => {
    try {
      setAuthErrorMessage(null);
      const res = await signInWithGooglePopup();
      if (res && res.accessToken) {
        setGmailConnected(true);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        setAuthErrorMessage(
          'Đăng nhập đã bị hủy hoặc cửa sổ đóng lại. Lưu ý quan trọng: Nếu ứng dụng Firebase của bạn đang ở trạng thái Kiểm thử (OAuth Testing Mode), Google sẽ chặn và trả về lỗi 403 Access Denied trừ khi địa chỉ Email của bạn được thêm trực tiếp vào danh sách "Test users" trong Google Cloud Console.'
        );
      } else {
        setAuthErrorMessage(`Đăng nhập thất bại: ${err.message || 'Lỗi xác nhận liên kết Google'}`);
      }
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

  // Student Report Creation/Update Action
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

  // Review System Configuration Actions
  const handleSaveSystemConfig = async (startTime: string, endTime: string, reminderTime: string) => {
    try {
      const docRef = doc(db, 'teams', 'sys_config_time');
      const parsedHour = parseInt(reminderTime.split(':')[0], 10) || 21;
      await setDoc(docRef, {
        id: 'sys_config_time',
        name: 'Cấu hình Thời gian nộp báo cáo',
        startTime,
        endTime,
        reminderHour: parsedHour,
        reminderTime,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert('Đã lưu cấu hình thời gian nộp báo cáo và thời điểm quét nhắc nhở đồ án thành công!');
    } catch (err: any) {
      console.error(err);
      alert('Lỗi lưu cấu hình: ' + err.message);
    }
  };

  // Reviewer Decision Actions
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

      const reportSnap = await getDoc(docRef);
      if (reportSnap.exists()) {
        const rData = reportSnap.data();
        const studentUid = rData.userId;
        const studentProfile = allUsers.find(u => u.uid === studentUid);
        const studentEmail = studentProfile?.email || '';
        const studentName = studentProfile?.name || 'Sinh viên';
        
        const teacherEmail = userProfile?.email || 'phongtt35@fpt.edu.vn';
        const teacherName = userProfile?.name || 'Giáo viên hướng dẫn';
        
        const statusTextVn = status === 'approved' ? 'ĐÃ ĐƯỢC PHÊ DUYÊT' : 'KHÔNG ĐƯỢC DUYÊT / YÊU CẦU CHỈNH SỬA';
        const mailSubject = `[Capstone Report] Kết quả đánh giá báo cáo ngày ${rData.date}`;
        const mailBody = `Thành viên gửi: ${studentName} (${studentEmail})
Dự án Nhóm: ${teamNameMap[rData.teamId] || 'Nhóm Đồ án'}

Giáo viên hướng dẫn (${teacherName} - ${teacherEmail}) đã đánh giá báo cáo ngày ${rData.date} của bạn:

Trở về trạng thái: ${statusTextVn}

Nội dung nhận xét/phản hồi từ Giáo viên:
"${comment || 'Giáo viên phê duyệt báo cáo thành công.'}"

Vui lòng kiểm tra lại báo cáo trên cổng thông tin Capstone Report.

Trân trọng,
Hệ thống báo cáo tiến độ Đồ án Tốt nghiệp Capstone`;

        let gmailSentResult = false;
        let errorMessage = '';

        // Retrieve SMTP config securely from email_config collection
        let smtpConfigToUse: any = null;
        try {
          const smtpSnap = await getDoc(doc(db, 'email_config', 'smtp'));
          if (smtpSnap.exists()) {
            smtpConfigToUse = smtpSnap.data();
          }
        } catch (smtpErr) {
          console.error("Failed to read secure SMTP configuration from firestore:", smtpErr);
        }

        if (smtpConfigToUse && smtpConfigToUse.user && smtpConfigToUse.pass) {
          try {
            const apiRes = await fetch('/api/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                smtpUser: smtpConfigToUse.user,
                smtpPass: smtpConfigToUse.pass,
                smtpHost: smtpConfigToUse.host || 'smtp.gmail.com',
                smtpPort: smtpConfigToUse.port || 465,
                to: studentEmail,
                subject: mailSubject,
                body: mailBody
              })
            });

            if (apiRes.ok) {
              gmailSentResult = true;
            } else {
              const errData = await apiRes.json();
              errorMessage = errData.error || 'Lỗi không xác định khi gọi API gửi email.';
            }
          } catch (apiErr: any) {
            errorMessage = apiErr.message || String(apiErr);
          }
        } else {
          errorMessage = 'Chưa cấu hình tài khoản Email gửi thư chuyên dùng (SMTP App Password) trong phần quản trị / Cấu hình email.';
        }

        const notifId = `email_${Date.now()}_${studentUid}`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientUid: studentUid,
          recipientEmail: studentEmail,
          senderEmail: teacherEmail,
          senderName: teacherName,
          subject: mailSubject,
          body: mailBody,
          createdAt: serverTimestamp(),
          read: false,
          reportId: reportId,
          reportDate: rData.date,
          status: status,
          gmailSent: gmailSentResult,
          gmailError: errorMessage || null
        });

        if (gmailSentResult) {
          alert(`Đã phê duyệt báo cáo và gửi email thông báo tự động (qua email dedicated): ${studentEmail}`);
        } else if (studentEmail) {
          alert(`Đã lưu phê duyệt báo cáo thành công, tuy nhiên xảy ra lỗi gửi email từ SMTP: ${errorMessage}`);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  // Save customized dedicated SMTP email configs
  const handleSaveEmailConfig = async (user: string, pass: string, host: string, port: number) => {
    try {
      const docRef = doc(db, 'email_config', 'smtp');
      await setDoc(docRef, {
        user: user.trim(),
        pass: pass.trim(),
        host: host.trim(),
        port: Number(port),
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert('Đã cấu hình thông tin Email SMTP gửi báo cáo thành công!');
    } catch (err: any) {
      console.error(err);
      alert('Lỗi lưu cấu hình: ' + err.message);
    }
  };

  // Team Admin Actions
  const handleCreateTeam = async (name: string) => {
    const teamId = 'team-' + name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    await setDoc(doc(db, 'teams', teamId), {
      id: teamId,
      name: name.trim(),
      createdAt: serverTimestamp()
    });
  };

  const handleUpdateTeam = async (id: string, name: string) => {
    await updateDoc(doc(db, 'teams', id), {
      name: name.trim()
    });
    alert('Cập nhật tên nhóm đồ án thành công!');
  };

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

  // User Admin Actions
  const handleSaveUserByAdmin = async (userId: string, assignedTeamId: string, role: 'student' | 'reviewer' | 'admin') => {
    setAdminUserEditMessage(null);
    const userRef = doc(db, 'users', userId);

    try {
      await updateDoc(userRef, {
        teamId: assignedTeamId,
        role: role,
      });
      setAdminUserEditMessage("Cập nhật thông tin tài khoản thành công.");
      setTimeout(() => setAdminUserEditMessage(null), 3500);
    } catch (err: any) {
      console.error(err);
      setAdminUserEditMessage(`Lỗi: ${err.message || 'Kiểm tra Firestore console.'}`);
    }
  };

  const handleAddWhitelist = async (email: string, name: string, role: 'student' | 'reviewer' | 'admin', teamId: string) => {
    try {
      const wlRef = doc(db, 'whitelist', email);
      await setDoc(wlRef, {
        email,
        name,
        role,
        teamId,
        createdAt: Timestamp.now(),
      });

      const existingUser = allUsers.find((u) => u.email.toLowerCase() === email);
      if (existingUser) {
        const userRef = doc(db, 'users', existingUser.uid);
        await updateDoc(userRef, {
          role,
          teamId,
        });
      }

      setAdminUserEditMessage(`"${email}" đã được đăng ký Whitelist thành công.`);
      setTimeout(() => setAdminUserEditMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteWhitelist = async (emailKey: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy ủy quyền và xóa "${emailKey}" khỏi danh sách Whitelist?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'whitelist', emailKey.toLowerCase()));
      setAdminUserEditMessage(`đã xóa "${emailKey}" khỏi Whitelist.`);
      setTimeout(() => setAdminUserEditMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setAdminUserEditMessage(`Lỗi xóa whitelist: ${err.message}`);
    }
  };

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

  // Hydrate reports mapping
  const hydratedReports: Report[] = reports.map((report) => ({
    ...report,
    userName: userNamesMap[report.userId] || report.userId,
    teamName: teamNameMap[report.teamId] || report.teamId,
    reviewedByName: userNamesMap[report.reviewedBy] || report.reviewedBy
  }));

  return {
    currentUser,
    userProfile,
    teams,
    reports,
    allUsers,
    currentTab,
    setCurrentTab,
    loading,
    teamNameMap,
    userNamesMap,
    isPlaceholderConfig,
    sysStartTime,
    sysEndTime,
    sysReminderTime,
    smtpUser,
    smtpPass,
    smtpHost,
    smtpPort,
    notifications,
    gmailConnected,
    authErrorMessage,
    whitelist,
    adminUserEditMessage,
    handleSignIn,
    handleSignOut,
    handleConnectGmail,
    handleSaveReport,
    handleSaveSystemConfig,
    handleSaveEmailConfig,
    handleReviewDecision,
    handleCreateTeam,
    handleUpdateTeam,
    handleDeleteTeam,
    handleSaveUserByAdmin,
    handleAddWhitelist,
    handleDeleteWhitelist,
    isWithinTimeRange,
    hydratedReports
  };
}
