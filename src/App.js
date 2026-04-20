import './App.css';
import './responsive.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import "bootstrap/dist/css/bootstrap.min.css";
import { createContext, useEffect, useState } from 'react';
import Login from './pages/Login';
import FakeLogin from './pages/FakeLogin';
import ForgotPassword from './pages/ForgotPassword';
import Signup from './pages/Signup';
import StudentList from './pages/StudentList';
import Homepage from './pages/Homepage/Homepage';
import Homeheader from './components/Homeheader';
import Staff from './pages/Staff';
import StudentSidebar from './components/Studentsidebar';
import StuDashboard from './pages/Studashboard/studentdash';
import StudentProfile from './pages/Studentprofile';
import AcademicRecords from './pages/Academicrecords';
import DocumentRequests from './pages/Documentrequest';
import RequestDocument from './pages/Requestdocument';
import RegistrarDashboard from './pages/Registrardashboard';
import RegistrarSidebar from './components/Regsidebar';
import FinanceDashboard from './pages/Financedashboard';
import FinanceSidebar from './components/Finsidebar';
import Enrollment from './pages/Enrollment';
import StudentCourses from './pages/StudentCourse';
import NotFound from './pages/NotFound';
import ProgramHeadSidebar from './components/Phsidebar';
import ProgramHeadDashboard from './pages/Phdashboard';
import AssignCourses from './pages/Phcourses';
import StudentBalance from './components/Finstudentbalance';
import InstructorSidebar from './components/Inssidebar';
import InstructorDashboard from './pages/Instructordashboard';
import InstructorSchedule from './pages/Insschedule';
import ClassManagement from './pages/Insclassmanage';
import InstructorGrades from './pages/Insgrading';
import RegistrarEnrollment from './pages/Regenrollment';
import StudentPayment from './pages/Studentpayment';
import TuitionManagement from './pages/Tuitionfeemanage';
import PaymentVerification from './pages/Paymentverification';
import CounterPayment from './pages/CounterPayment';
import PaymentHistory from './pages/PaymentHistory';
import FinanceDocumentRequests from './pages/FinanceDocumentRequests';
import ProgramStudentList from './pages/ProgramStudentList';
import ProgramManagement from './pages/ProgramManagement';
import DeanDashboard from './pages/Deandashboard';
import StudentGrades from './pages/StudentGrades';
import DeanSidebar from './components/Deansidebar';
import ProgramHeadTorEvaluation from './pages/ProgramHeadTorEvaluation';
import RegistrarCreditTransfer from './pages/RegistrarCreditTransfer';
import AdminAccountManagement from './pages/AdminAccountManagement';
import StudentAccountsManagement from './pages/StudentAccountsManagement';
import InitialAdminCreation from './pages/InitialAdminCreation';
import AnnouncementsPanel from './pages/AnnouncementsPanel';

const MyContext = createContext();

function App() {
  // eslint-disable-next-line
  const [isToggleSidebar, setIsToggleSidebar] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [isHideComponents, setIsHideComponents] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isOpenNav, setIsOpenNav] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [role, setRole] = useState(localStorage.getItem('role') || null);
  const INACTIVITY_LIMIT_MS = 20 * 60 * 1000;

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('isLogin');
    localStorage.removeItem('lastActivityAt');
    setToken(null);
    setRole(null);
    setUser(null);
    setIsLogin(false);
    const currentPath = window.location.pathname;
    const redirectPath = currentPath === '/stafflogin' ? '/stafflogin' : '/login';
    window.location.href = redirectPath;
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    setRole(localStorage.getItem('role'));
    setUser(JSON.parse(localStorage.getItem('user')));
  }, [token]);

  // Add this useEffect to ensure authentication state is loaded on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedRole && storedUser) {
      setToken(storedToken);
      setRole(storedRole);
      setUser(JSON.parse(storedUser));
      localStorage.setItem('lastActivityAt', String(Date.now()));
    }
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    const updateActivity = () => {
      localStorage.setItem('lastActivityAt', String(Date.now()));
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, updateActivity));

    const interval = setInterval(() => {
      const lastActivityAt = Number(localStorage.getItem('lastActivityAt') || Date.now());
      if (Date.now() - lastActivityAt > INACTIVITY_LIMIT_MS) {
        logout();
      }
    }, 60_000);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, updateActivity));
      clearInterval(interval);
    };
  }, [token]);

  useEffect(() => {
    document.title = "OLSHCOnnect";
  }, []);


  const openNav = () => {
    setIsOpenNav(true);
  };

  const values = {
    isToggleSidebar,
    setIsToggleSidebar,
    isLogin,
    setIsLogin,
    isHideComponents,
    setIsHideComponents,
    windowWidth,
    openNav,
    isOpenNav,
    setIsOpenNav,
    user,
    setUser,  // To set user data
    token,     // To store the token
    setToken,
    role,
    setRole,
    logout,
  };

  useEffect(() => {
    // App state updated
  }, [token, role, user]);

  const ProtectedRoute = ({ element, requiredRole, redirectTo }) => {
    if (!token) {
      return <Navigate to={redirectTo} />;
    }

    // Handle both string and array roles
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (requiredRole && !allowedRoles.includes(role)) {
      return <Navigate to={redirectTo} />;
    }

    return element;
  };

  return (
    <BrowserRouter>
      <MyContext.Provider value={values}>
        <Routes>
          <Route
            path="/homepage"
            element={<Homeheader />}
          />
          <Route
            path="*"
            element={isHideComponents !== true && !window.location.pathname.includes('/initial-admin-creation') && <Header />}
          />
        </Routes>

        <div className='main d-flex'>
          {!["/stafflogin", "/login", "/forgot-password", "/initial-admin-creation"].includes(window.location.pathname) && isHideComponents !== true && (
            <>
              <div className={`sidebarOverlay d-none ${isOpenNav === true && 'show'}`} onClick={() => setIsOpenNav(false)}></div>
              <div className={`sidebarWrapper ${isToggleSidebar === true ? 'toggle' : ''} ${isOpenNav === true ? 'open' : ''}`}>
              {role === 'student' ? (
                  <StudentSidebar />
                ) : role === 'registrar' ? (
                  <RegistrarSidebar />
                ) : role === 'finance' ? (
                  <FinanceSidebar />
                ) : role === 'program head' ? (
                  <ProgramHeadSidebar />
                ) : role === 'instructor' ? (
                  <InstructorSidebar />
                ) : role === 'dean' ? (
                  <DeanSidebar />
                ) : role === 'admin' ? (
                  <Sidebar />
                ) : (
                  <Sidebar />
                )}
              </div>
            </>
          )}

          <div className={`content ${isHideComponents === true && 'full'} ${isToggleSidebar === true && !window.location.pathname.includes('/initial-admin-creation') ? 'toggle' : ''}`} onClick={() => { if (isOpenNav) { setIsOpenNav(false); } }}>
            <Routes>
              <Route path="/notfound" element={<NotFound />} />
              <Route path="/" element={<Navigate to="/homepage" />} />
              <Route path="/homepage" exact={true} element={<Homepage />} />
              <Route path="/dashboard" exact={true} element={<ProtectedRoute element={<Dashboard />} requiredRole="admin" redirectTo="/stafflogin" />} />
              <Route path="/program-management" exact={true} element={<ProtectedRoute element={<ProgramManagement />} requiredRole="admin" redirectTo="/stafflogin" />} />
              <Route path="/admin-account-management" exact={true} element={<ProtectedRoute element={<AdminAccountManagement />} requiredRole="admin" redirectTo="/stafflogin" />} />
              <Route path="/student-accounts-management" exact={true} element={<ProtectedRoute element={<StudentAccountsManagement />} requiredRole="admin" redirectTo="/stafflogin" />} />
              <Route path="/login" exact={true} element={<Login />} />
              <Route path="/forgot-password" exact={true} element={<ForgotPassword />} />
              <Route path="/logIn" exact={true} element={<FakeLogin />} />
              <Route path="/stafflogin" exact={true} element={<Signup />} />
              <Route path="/studentlist" exact={true} element={<ProtectedRoute element={<StudentList />} requiredRole={['registrar', 'admin', 'finance', 'instructor']} redirectTo="/stafflogin" />} />
              <Route path="/staffs" exact={true} element={<ProtectedRoute element={<Staff />} requiredRole={['registrar', 'admin', 'finance', 'instructor', 'program head']} redirectTo="/stafflogin" />} />
              <Route path="/document-request" exact={true} element={<ProtectedRoute element={<DocumentRequests />} requiredRole={['registrar', 'admin']} redirectTo="/stafflogin" />} />
              <Route path="/student-dashboard" exact={true} element={<ProtectedRoute element={<StuDashboard />} requiredRole="student" redirectTo="/login" />} />
              <Route path="/student-profile" exact={true} element={<ProtectedRoute element={<StudentProfile />} requiredRole="student" redirectTo="/login" />} />
              <Route path="/student-courses" exact={true} element={<ProtectedRoute element={<StudentCourses/>} requiredRole="student" redirectTo="/login" />} />
              <Route path="/student-payment" exact={true} element={<ProtectedRoute element={<StudentPayment/>} requiredRole="student" redirectTo="/login" />} />
              <Route path="/academic-records" exact={true} element={<ProtectedRoute element={<AcademicRecords />} requiredRole="student" redirectTo="/login" />} />
              <Route path="/request-document" exact={true} element={<ProtectedRoute element={<RequestDocument />} requiredRole="student" redirectTo="/login" />} />
              <Route path="/student-grades" exact={true} element={<ProtectedRoute element={<StudentGrades />} requiredRole="student" redirectTo="/login" />} />
              <Route path="/registrar-dashboard" exact={true} element={<ProtectedRoute element={<RegistrarDashboard />} requiredRole="registrar" redirectTo="/stafflogin" />} />
              <Route path="/registrar-enrollment" exact={true} element={<ProtectedRoute element={<Enrollment />} requiredRole="registrar" redirectTo="/stafflogin" />} />
              <Route path="/registrar-enrollmentt" exact={true} element={<ProtectedRoute element={<RegistrarEnrollment />} requiredRole="registrar" redirectTo="/stafflogin" />} />
              <Route path="/registrar-credit-transfer" exact={true} element={<ProtectedRoute element={<RegistrarCreditTransfer />} requiredRole="registrar" redirectTo="/stafflogin" />} />
              <Route path="/finance-dashboard" exact={true} element={<ProtectedRoute element={<FinanceDashboard />} requiredRole="finance" redirectTo="/stafflogin" />} />
              <Route path="/student-balance" exact={true} element={<ProtectedRoute element={<StudentBalance />} requiredRole="finance" redirectTo="/stafflogin" />} />
              <Route path="/counter-payment" exact={true} element={<ProtectedRoute element={<CounterPayment />} requiredRole="finance" redirectTo="/stafflogin" />} />
              <Route path="/payment-history" exact={true} element={<ProtectedRoute element={<PaymentHistory />} requiredRole="finance" redirectTo="/stafflogin" />} />
              <Route path="/tuition-management" exact={true} element={<ProtectedRoute element={<TuitionManagement />} requiredRole="finance" redirectTo="/stafflogin" />} />
              <Route path="/payment-verification" exact={true} element={<ProtectedRoute element={<PaymentVerification />} requiredRole="finance" redirectTo="/stafflogin" />} />
              <Route path="/finance-document-requests" exact={true} element={<ProtectedRoute element={<FinanceDocumentRequests />} requiredRole="finance" redirectTo="/stafflogin" />} />
              <Route path="/programhead-dashboard" exact={true} element={<ProtectedRoute element={<ProgramHeadDashboard />} requiredRole="program head" redirectTo="/stafflogin" />} />
              <Route path="/program-studentlist" exact={true} element={<ProtectedRoute element={<ProgramStudentList />} requiredRole="program head" redirectTo="/stafflogin" />} />
              <Route path="/course-assignments" exact={true} element={<ProtectedRoute element={<AssignCourses />} requiredRole="program head" redirectTo="/stafflogin" />} />
              <Route path="/program-head-tor-evaluation" exact={true} element={<ProtectedRoute element={<ProgramHeadTorEvaluation />} requiredRole="program head" redirectTo="/stafflogin" />} />
              <Route path="/instructor-dashboard" exact={true} element={<ProtectedRoute element={<InstructorDashboard />} requiredRole="instructor" redirectTo="/stafflogin" />} />
              <Route path="/instructor-schedule" exact={true} element={<ProtectedRoute element={<InstructorSchedule />} requiredRole="instructor" redirectTo="/stafflogin" />} />
              <Route path="/instructor-classes" exact={true} element={<ProtectedRoute element={<ClassManagement />} requiredRole="instructor" redirectTo="/stafflogin" />} />
              <Route path="/instructor-classes/grades" exact={true} element={<ProtectedRoute element={<InstructorGrades />} requiredRole="instructor" redirectTo="/stafflogin" />} />
              <Route path="/dean-dashboard" exact={true} element={<ProtectedRoute element={<DeanDashboard />} requiredRole="dean" redirectTo="/stafflogin" />} />
              <Route path="/announcements-panel" exact={true} element={<ProtectedRoute element={<AnnouncementsPanel />} requiredRole={['admin', 'dean', 'registrar', 'finance']} redirectTo="/stafflogin" />} />
              {/* Initial Admin Creation - No authentication required, only available when no admins exist */}
              <Route path="/initial-admin-creation" exact={true} element={<InitialAdminCreation />} />
              {/* Catch-all route for unmatched paths - should be last */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </MyContext.Provider>
    </BrowserRouter>
  );
}

export default App;
export { MyContext };
