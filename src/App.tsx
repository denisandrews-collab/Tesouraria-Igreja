import React, { useState, useEffect, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { jsPDF } from "jspdf";
import { 
  PlusCircle, 
  History, 
  Send, 
  Calendar, 
  User, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Calculator,
  RotateCcw,
  LayoutDashboard,
  Coins,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Download,
  X,
  Trash2,
  PieChart as PieChartIcon,
  BarChart3,
  Pencil,
  LineChart as LineChartIcon,
  Shield,
  Lock,
  Unlock,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Bell,
  Info,
  AlertTriangle,
  XCircle,
  Users,
  FileText,
  Home,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  Clock,
  Baby,
  QrCode,
  Printer,
  Heart,
  Smile,
  Frown,
  Meh,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Check,
  Mail,
  ChevronRight,
  LogOut,
  Edit,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import autoTable from "jspdf-autotable";
import JsBarcode from 'jsbarcode';
import { db, auth, isFirebaseEnabled } from "./firebase"; // Import Firestore db and status
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  orderBy, 
  updateDoc, 
  doc,
  deleteDoc,
  Timestamp,
  onSnapshot,
  getDoc,
  setDoc
} from "firebase/firestore";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  signOut, 
  User as FirebaseUser 
} from "firebase/auth";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";

interface Entry {
  id: string | number;
  treasurer: string;
  date: string;
  period: string;
  type: "Dízimo" | "Oferta";
  amount: number;
  counts?: string; // JSON string of Record<number, string>
  notes?: string;
  is_reversed?: number;
  reversal_reason?: string;
  created_at: string;
}

interface Attendance {
  id: string | number;
  date: string;
  period: string;
  counts: Record<string, { men: number; women: number; children: number }>;
  responsible?: string;
  notes?: string;
  created_at: string;
}

interface Location {
  id: string | number;
  name: string;
  is_default: number;
  created_at: string;
}

interface Guardian {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photo?: string;
  isTeacher?: boolean;
  assignedRoomIds?: string[];
  created_at: string;
}

interface Child {
  id: string;
  name: string;
  birthDate: string;
  photo?: string;
  guardianId: string;
  allergies?: string;
  notes?: string;
  created_at: string;
}

interface KidsCheckIn {
  id: string;
  childId: string;
  guardianId: string;
  date: string;
  time: string;
  room: string;
  status: "checked-in" | "checked-out";
  checkoutTime?: string;
  checkedOutBy?: string;
  created_at: string;
}

interface Room {
  id: string;
  name: string;
  teacher?: string;
  capacity?: number;
  minAge?: number;
  maxAge?: number;
  created_at: string;
}

interface UserProfile {
  uid: string;
  email: string;
  role: "master" | "junior" | "user";
  name?: string;
}

interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  title?: string;
}

const DENOMINATIONS = [
  { label: "R$ 200", value: 200, type: "note" },
  { label: "R$ 100", value: 100, type: "note" },
  { label: "R$ 50", value: 50, type: "note" },
  { label: "R$ 20", value: 20, type: "note" },
  { label: "R$ 10", value: 10, type: "note" },
  { label: "R$ 5", value: 5, type: "note" },
  { label: "R$ 2", value: 2, type: "note" },
  { label: "R$ 1", value: 1, type: "coin" },
  { label: "R$ 0,50", value: 0.5, type: "coin" },
  { label: "R$ 0,25", value: 0.25, type: "coin" },
  { label: "R$ 0,10", value: 0.1, type: "coin" },
  { label: "R$ 0,05", value: 0.05, type: "coin" },
  { label: "R$ 0,01", value: 0.01, type: "coin" },
];

const evaluateMath = (str: string): number => {
  const sanitized = str.replace(/[^0-9+\-]/g, '');
  if (!sanitized) return 0;
  
  // Handle signs and split
  return sanitized
    .replace(/-/g, '+-')
    .split('+')
    .map(part => part.trim())
    .filter(part => part !== "" && part !== "-")
    .reduce((acc, part) => acc + (parseInt(part) || 0), 0);
};

interface LoginScreenProps {
  title: string;
  isFirebaseEnabled: boolean;
  loginEmail: string;
  setLoginEmail: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  handleLogin: (e: React.FormEvent) => void;
  handleRegister: (e: React.FormEvent) => void;
  handleForgotPassword: () => void;
  isLoggingIn: boolean;
  isProcessingRegister: boolean;
  isRegistering: boolean;
  setIsRegistering: (val: boolean) => void;
  setUser: (user: any) => void;
  addNotification: (type: "success" | "error" | "info" | "warning", message: string, title?: string) => void;
}

const LoginScreen = ({ 
  title, 
  isFirebaseEnabled, 
  loginEmail, 
  setLoginEmail, 
  loginPassword, 
  setLoginPassword, 
  handleLogin, 
  handleRegister,
  handleForgotPassword,
  isLoggingIn,
  isProcessingRegister,
  isRegistering,
  setIsRegistering,
  setUser,
  addNotification
}: LoginScreenProps) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{!isRegistering ? title : "Criar Conta"}</h2>
          <p className="text-slate-500 text-sm mt-2">
            {!isRegistering ? "Faça login para continuar" : "Preencha os dados para se cadastrar"}
          </p>
          {!isFirebaseEnabled && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-2">Modo de Demonstração</p>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail("admin@modeloalpha.com.br");
                  setLoginPassword("admin123");
                  // Trigger login manually
                  setUser({ email: "admin@modeloalpha.com.br", uid: "demo-user" } as any);
                  addNotification("success", "Acesso de demonstração liberado.");
                }}
                className="w-full py-2 bg-amber-200 text-amber-900 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-amber-300 transition-all"
              >
                Entrar como Convidado
              </button>
            </div>
          )}
        </div>

        <form onSubmit={!isRegistering ? handleLogin : handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          {!isRegistering && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn || isProcessingRegister}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {(isLoggingIn || isProcessingRegister) ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{!isRegistering ? "Entrar" : "Cadastrar"}</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            {!isRegistering 
              ? "Não tem uma conta? Cadastre-se agora" 
              : "Já tem uma conta? Faça login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const APP_VERSION = "1.2.0-kids-ministry";
  const [activeTab, setActiveTab] = useState<"dashboard" | "calculator" | "form" | "history" | "settings" | "attendance" | "kids">("dashboard");
  const [userRole, setUserRole] = useState<"master" | "junior" | "user">(() => (localStorage.getItem("userRole") as any) || "user");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [showReversalModal, setShowReversalModal] = useState(false);
  const [reversalReason, setReversalReason] = useState("");
  const [entryToReverse, setEntryToReverse] = useState<string | number | null>(null);
  const [showDeleteLocationConfirm, setShowDeleteLocationConfirm] = useState<string | number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<Attendance[]>([]);
  const [locations, setLocations] = useState<Location[]>([
    { id: 'initial-default', name: "Salão Principal", is_default: 1, created_at: new Date().toISOString() }
  ]);
  
  // Kids Ministry State
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [kidsCheckIns, setKidsCheckIns] = useState<KidsCheckIn[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [kidsTab, setKidsTab] = useState<"checkin" | "children" | "guardians" | "classrooms" | "reports" | "settings">("checkin");
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  useEffect(() => {
    if (userRole === "master" && auth) {
      const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
        setAllUsers(usersData);
      });
      return () => unsubscribe();
    }
  }, [userRole, db]);
  const [showAddGuardianModal, setShowAddGuardianModal] = useState(false);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showEditGuardianModal, setShowEditGuardianModal] = useState(false);
  const [showEditChildModal, setShowEditChildModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isProcessingRegister, setIsProcessingRegister] = useState(false);
  const [kidsSearchTerm, setKidsSearchTerm] = useState("");
  
  const [churchName, setChurchName] = useState(() => localStorage.getItem("churchName") || "Minha Igreja");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"Todos" | "Dízimo" | "Oferta">("Todos");
  const [periodFilter, setPeriodFilter] = useState<"all" | "currentMonth" | "prevMonth" | "currentYear">("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [historyTab, setHistoryTab] = useState<"finance" | "attendance">("finance");
  const [attendancePeriodFilter, setAttendancePeriodFilter] = useState<"Todos" | "Manhã" | "Tarde" | "Noite">("Todos");
  const [showValues, setShowValues] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isMobileCheckin, setIsMobileCheckin] = useState(false);
  const [isPublicRegistration, setIsPublicRegistration] = useState(false);
  const [isRoomLeader, setIsRoomLeader] = useState(false);
  const [selectedRoomForLeader, setSelectedRoomForLeader] = useState<Room | null>(null);
  const [mobilePhone, setMobilePhone] = useState("");
  const [mobileStep, setMobileStep] = useState<"phone" | "selection" | "success" | "registration-guardian" | "registration-children">("phone");
  const [registrationStep, setRegistrationStep] = useState<"guardian" | "children" | "success">("guardian");
  const [registrationGuardianId, setRegistrationGuardianId] = useState<string | null>(null);

  useEffect(() => {
    console.log("Firebase status:", isFirebaseEnabled ? "Enabled" : "Disabled");
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    
    // Parse hash-based path and parameters
    const hash = window.location.hash;
    const [hashPath, hashQuery] = hash.split('?');
    const hashParams = new URLSearchParams(hashQuery);
    
    // Extract church name from either query or hash
    const churchFromUrl = params.get("church") || hashParams.get("church");
    if (churchFromUrl) {
      setChurchName(decodeURIComponent(churchFromUrl));
    }

    if (mode === "mobile-checkin" || hashPath === "#responsaveis") {
      setIsMobileCheckin(true);
    } else if (mode === "registration" || hashPath === "#cadastro") {
      setIsPublicRegistration(true);
    } else if (mode === "room-leader" || hashPath === "#lider") {
      setIsRoomLeader(true);
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (profileDoc.exists()) {
            const profile = profileDoc.data() as UserProfile;
            setUserProfile(profile);
            // Sync userRole with profile role
            setUserRole(profile.role);
            localStorage.setItem("userRole", profile.role);
          } else {
            // Check if there's a pre-registered profile for this email
            const sanitizedEmail = (firebaseUser.email || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
            const preDoc = await getDoc(doc(db, "users", sanitizedEmail));
            
            if (preDoc.exists()) {
              const preData = preDoc.data();
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                role: preData.role || "user"
              };
              await setDoc(doc(db, "users", firebaseUser.uid), newProfile);
              await deleteDoc(doc(db, "users", sanitizedEmail)); // Clean up pre-doc
              setUserProfile(newProfile);
              setUserRole(newProfile.role);
              localStorage.setItem("userRole", newProfile.role);
            } else {
              const defaultProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                role: "user"
              };
              setUserProfile(defaultProfile);
              setUserRole("user");
              localStorage.setItem("userRole", "user");
              await setDoc(doc(db, "users", firebaseUser.uid), defaultProfile);
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
        setUserRole("user");
        localStorage.setItem("userRole", "user");
      }
    });
    return () => unsubscribe();
  }, [db]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fallback for demo/dev if Firebase is disabled
    if (!isFirebaseEnabled || !auth) {
      if (loginEmail === "admin@modeloalpha.com.br" && loginPassword === "admin123") {
        setUser({ email: loginEmail, uid: "demo-user" } as any);
        addNotification("success", "Login de demonstração realizado.");
        return;
      }
      addNotification("error", "Firebase não configurado. Use admin@modeloalpha.com.br / admin123 para demonstração.");
      return;
    }

    try {
      setIsLoggingIn(true);
      console.log("Tentando login para:", loginEmail);
      
      // Safety timeout
      const timeout = setTimeout(() => {
        setIsLoggingIn(false);
        addNotification("error", "O login está demorando muito. Verifique sua conexão ou se o domínio está autorizado no Firebase.");
      }, 15000);

      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      clearTimeout(timeout);
      addNotification("success", "Login realizado com sucesso.");
      setLoginEmail("");
      setLoginPassword("");
    } catch (error: any) {
      console.error("Login error:", error);
      let message = "Erro ao fazer login. Verifique suas credenciais.";
      if (error.code === "auth/unauthorized-domain") {
        message = "Este domínio não está autorizado no Firebase Console. Adicione '" + window.location.hostname + "' em Authentication > Settings > Authorized Domains.";
      } else if (error.code === "auth/configuration-not-found") {
        message = "O provedor de E-mail/Senha não está ativado no Firebase Console.";
      } else if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        message = "E-mail ou senha incorretos.";
      }
      addNotification("error", message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseEnabled || !auth) {
      addNotification("error", "Firebase não configurado para cadastro.");
      return;
    }

    try {
      setIsProcessingRegister(true);
      console.log("Tentando cadastro para:", loginEmail);

      // Safety timeout
      const timeout = setTimeout(() => {
        setIsProcessingRegister(false);
        addNotification("error", "O cadastro está demorando muito. Verifique sua conexão ou se o domínio está autorizado no Firebase.");
      }, 15000);

      await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      clearTimeout(timeout);
      addNotification("success", "Conta criada com sucesso!");
      setLoginEmail("");
      setLoginPassword("");
      setIsRegistering(false); // Switch back to login mode on success
    } catch (error: any) {
      console.error("Registration error:", error);
      let message = "Erro ao criar conta.";
      if (error.code === "auth/email-already-in-use") message = "Este e-mail já está em uso.";
      if (error.code === "auth/weak-password") message = "A senha é muito fraca (mínimo 6 caracteres).";
      if (error.code === "auth/unauthorized-domain") {
        message = "Este domínio não está autorizado no Firebase Console. Adicione '" + window.location.hostname + "' em Authentication > Settings > Authorized Domains.";
      }
      if (error.code === "auth/configuration-not-found") {
        message = "O provedor de E-mail/Senha não está ativado no Firebase Console. Por favor, ative-o em Authentication > Sign-in method.";
      }
      addNotification("error", message);
    } finally {
      setIsProcessingRegister(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail) {
      addNotification("warning", "Por favor, insira seu e-mail para recuperar a senha.");
      return;
    }
    if (!isFirebaseEnabled || !auth) {
      addNotification("error", "Firebase não configurado.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, loginEmail);
      addNotification("success", "E-mail de recuperação enviado!");
    } catch (error: any) {
      console.error("Reset password error:", error);
      let message = "Erro ao enviar e-mail de recuperação.";
      if (error.code === "auth/unauthorized-domain") {
        message = "Este domínio não está autorizado no Firebase Console. Adicione '" + window.location.hostname + "' em Authentication > Settings > Authorized Domains.";
      } else if (error.code === "auth/configuration-not-found") {
        message = "O provedor de E-mail/Senha não está ativado no Firebase Console. Por favor, ative-o em Authentication > Sign-in method.";
      } else if (error.code === "auth/user-not-found") {
        message = "Usuário não encontrado.";
      } else if (error.code === "auth/invalid-email") {
        message = "E-mail inválido.";
      }
      addNotification("error", message);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      addNotification("info", "Você saiu do sistema.");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auth) return;
    if (newPasswordInput.length < 6) {
      addNotification("warning", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setSubmitting(true);
      await updatePassword(user, newPasswordInput);
      addNotification("success", "Senha alterada com sucesso!");
      setShowChangePasswordModal(false);
      setNewPasswordInput("");
    } catch (error: any) {
      console.error("Change password error:", error);
      if (error.code === "auth/requires-recent-login") {
        addNotification("error", "Para sua segurança, você precisa fazer login novamente antes de alterar a senha.");
        await signOut(auth);
      } else {
        addNotification("error", "Erro ao alterar senha. Verifique os requisitos de senha.");
      }
    } finally {
      setSubmitting(false);
    }
  };
  const [serverFirebaseEnabled, setServerFirebaseEnabled] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<"online" | "offline" | "error">("offline");
  const [wsConnected, setWsConnected] = useState(false);
  const wsConnectedRef = React.useRef(false);
  const [historyLimit, setHistoryLimit] = useState(20);
  const [isDashboardReady, setIsDashboardReady] = useState(false);

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const findRoomForAge = (age: number) => {
    return rooms.find(r => (r.minAge ?? 0) <= age && (r.maxAge ?? 99) >= age);
  };

  const getCurrentPeriod = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return "Manhã";
    if (hour >= 12 && hour < 18) return "Tarde";
    return "Noite";
  };

  // Calculator state
  const [counts, setCounts] = useState<Record<number, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    treasurer: "",
    date: new Date().toISOString().split("T")[0],
    period: getCurrentPeriod() as "Manhã" | "Tarde" | "Noite",
    type: "Dízimo" as "Dízimo" | "Oferta",
    amount: "",
    notes: ""
  });

  // Attendance Form state
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split("T")[0],
    period: getCurrentPeriod() as "Manhã" | "Tarde" | "Noite",
    counts: {} as Record<string, { men: number; women: number; children: number }>,
    responsible: "",
    notes: ""
  });
  const [attendanceTempInputs, setAttendanceTempInputs] = useState<Record<string, string>>({});

  const [newLocationName, setNewLocationName] = useState("");
  const [editingLocation, setEditingLocation] = useState<{ id: string | number, name: string } | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"master" | "junior" | "user">("user");
  const [isAddingUser, setIsAddingUser] = useState(false);

  const calculatorTotal = useMemo(() => {
    return Object.entries(counts).reduce((acc, [val, count]) => {
      const n = evaluateMath(count as string);
      return acc + (parseFloat(val) * n);
    }, 0);
  }, [counts]);

  const stats = useMemo(() => {
    const activeEntries = entries.filter(e => !e.is_reversed);
    const total = activeEntries.reduce((acc, curr) => acc + curr.amount, 0);
    const dizimos = activeEntries.filter(e => e.type === "Dízimo").reduce((acc, curr) => acc + curr.amount, 0);
    const ofertas = activeEntries.filter(e => e.type === "Oferta").reduce((acc, curr) => acc + curr.amount, 0);
    
    // Chart data: Group by date (only active entries)
    const groupedByDate = activeEntries.reduce((acc: Record<string, any>, curr) => {
      // Safe date formatting for YYYY-MM-DD to avoid timezone shifts
      const [year, month, day] = curr.date.split("-");
      const dateLabel = `${day}/${month}`;
      
      if (!acc[dateLabel]) acc[dateLabel] = { name: dateLabel, dízimo: 0, oferta: 0, total: 0 };
      if (curr.type === "Dízimo") acc[dateLabel].dízimo += curr.amount;
      else acc[dateLabel].oferta += curr.amount;
      acc[dateLabel].total += curr.amount;
      return acc;
    }, {});

    const chartData = Object.values(groupedByDate).reverse().slice(-7); // Last 7 days with data

    const pieData = [
      { name: "Dízimo", value: dizimos, color: "#4f46e5" },
      { name: "Oferta", value: ofertas, color: "#f59e0b" }
    ];

    const uniqueTreasurers = Array.from(new Set(entries.map(e => e.treasurer)));

    // Growth calculation
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthTotal = activeEntries
      .filter(e => {
        const [y, m] = e.date.split("-");
        return parseInt(m) - 1 === currentMonth && parseInt(y) === currentYear;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const prevMonthTotal = activeEntries
      .filter(e => {
        const [y, m] = e.date.split("-");
        return parseInt(m) - 1 === prevMonth && parseInt(y) === prevYear;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);

    const growth = prevMonthTotal === 0 
      ? (currentMonthTotal > 0 ? 100 : 0) 
      : ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;

    // Attendance Chart Data
    const attendanceByDate = attendanceEntries.reduce((acc: Record<string, any>, curr) => {
      const [year, month, day] = curr.date.split("-");
      const dateLabel = `${day}/${month}`;
      
      if (!acc[dateLabel]) acc[dateLabel] = { name: dateLabel, total: 0 };
      
      const counts = typeof curr.counts === 'string' ? JSON.parse(curr.counts) : curr.counts;
      const entryTotal = Object.values(counts).reduce((sum: number, c: any) => {
        const count = c as { men?: number; women?: number; children?: number };
        return sum + (count.men || 0) + (count.women || 0) + (count.children || 0);
      }, 0);
      
      acc[dateLabel].total += entryTotal;
      return acc;
    }, {});

    const attendanceChartData = Object.values(attendanceByDate).reverse().slice(-7);

    // Attendance Stats
    const totalAttendanceToday = attendanceEntries
      .filter(e => e.date === new Date().toISOString().split("T")[0])
      .reduce((acc: number, curr) => {
        const counts = (typeof curr.counts === 'string' ? JSON.parse(curr.counts) : curr.counts) as Record<string, any>;
        const entryTotal = Object.values(counts).reduce((sum: number, c: any) => {
          const count = c as { men?: number; women?: number; children?: number };
          return sum + (Number(count.men) || 0) + (Number(count.women) || 0) + (Number(count.children) || 0);
        }, 0);
        return acc + entryTotal;
      }, 0);

    return { 
      total, 
      dizimos, 
      ofertas, 
      chartData, 
      pieData, 
      uniqueTreasurers, 
      growth, 
      currentMonthTotal,
      attendanceChartData,
      totalAttendanceToday
    };
  }, [entries, attendanceEntries]);

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    return entries.filter(entry => {
      const matchesSearch = entry.treasurer.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           entry.date.includes(searchTerm) ||
                           (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = filterType === "Todos" || entry.type === filterType;
      
      let matchesPeriod = true;
      if (periodFilter === "currentMonth") {
        const [y, m] = entry.date.split("-");
        matchesPeriod = parseInt(y) === currentYear && parseInt(m) - 1 === currentMonth;
      } else if (periodFilter === "prevMonth") {
        const [y, m] = entry.date.split("-");
        matchesPeriod = parseInt(y) === prevYear && parseInt(m) - 1 === prevMonth;
      } else if (periodFilter === "currentYear") {
        const [y] = entry.date.split("-");
        matchesPeriod = parseInt(y) === currentYear;
      }

      const matchesDateRange = (!dateRange.start || entry.date >= dateRange.start) &&
                               (!dateRange.end || entry.date <= dateRange.end);

      return matchesSearch && matchesFilter && matchesPeriod && matchesDateRange;
    });
  }, [entries, searchTerm, filterType, dateRange, periodFilter]);

  const filteredAttendanceEntries = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayStr = now.toISOString().split('T')[0];
    
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    return attendanceEntries.filter(entry => {
      // Restrição para usuários não-master: apenas histórico do dia atual
      if (userRole !== "master" && entry.date !== todayStr) {
        return false;
      }

      const matchesSearch = (entry.responsible && entry.responsible.toLowerCase().includes(searchTerm.toLowerCase())) || 
                           entry.date.includes(searchTerm) ||
                           (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchesPeriod = true;
      if (periodFilter === "currentMonth") {
        const [y, m] = entry.date.split("-");
        matchesPeriod = parseInt(y) === currentYear && parseInt(m) - 1 === currentMonth;
      } else if (periodFilter === "prevMonth") {
        const [y, m] = entry.date.split("-");
        matchesPeriod = parseInt(y) === prevYear && parseInt(m) - 1 === prevMonth;
      } else if (periodFilter === "currentYear") {
        const [y] = entry.date.split("-");
        matchesPeriod = parseInt(y) === currentYear;
      }

      const matchesDateRange = (!dateRange.start || entry.date >= dateRange.start) &&
                               (!dateRange.end || entry.date <= dateRange.end);

      const matchesAttendancePeriod = attendancePeriodFilter === "Todos" || entry.period === attendancePeriodFilter;

      return matchesSearch && matchesPeriod && matchesDateRange && matchesAttendancePeriod;
    });
  }, [attendanceEntries, searchTerm, dateRange, periodFilter, attendancePeriodFilter, userRole]);

  useEffect(() => {
    fetchEntries().catch(err => console.error("Initial fetch failed:", err));
    
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let pollInterval: NodeJS.Timeout;

    const connectWS = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}`;
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log("WebSocket connected");
          setWsConnected(true);
          wsConnectedRef.current = true;
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "NEW_ENTRY") {
              addNotification("info", `Novo lançamento de ${data.entry.treasurer}: R$ ${data.entry.amount.toLocaleString('pt-BR')}`, "Novo Registro");
              fetchEntries().catch(() => {});
            } else if (data.type === "ENTRY_REVERSED") {
              addNotification("warning", `Um lançamento foi estornado.`, "Estorno Realizado");
              fetchEntries().catch(() => {});
            } else if (data.type === "NEW_LOCATION" || data.type === "LOCATION_DELETED" || data.type === "NEW_ATTENDANCE" || data.type === "LOCATION_UPDATED") {
              if (data.type === "NEW_ATTENDANCE") {
                addNotification("success", "Nova contagem de pessoas registrada.", "Contagem");
              }
              fetchEntries().catch(() => {});
            }
          } catch (e) {
            // Silent catch for parsing errors
          }
        };

        socket.onclose = () => {
          if (wsConnectedRef.current) {
            console.log("WebSocket disconnected, retrying in 5s...");
          }
          setWsConnected(false);
          wsConnectedRef.current = false;
          reconnectTimeout = setTimeout(connectWS, 5000);
        };

        socket.onerror = (err) => {
          // Only log if we were previously connected to avoid spamming in serverless environments
          if (wsConnectedRef.current) {
            console.warn("WebSocket error:", err);
          }
          // Don't close if it's already closing or closed
          if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
            try {
              socket.close();
            } catch (e) {
              // Ignore close errors
            }
          }
        };
      } catch (e) {
        console.warn("Failed to initiate WebSocket connection:", e);
        reconnectTimeout = setTimeout(connectWS, 5000);
      }
    };

    connectWS();

    // Fallback polling every 10 seconds for mobile/unstable connections
    pollInterval = setInterval(() => {
      if (!wsConnectedRef.current) {
        fetchEntries().catch(() => {});
      }
    }, 10000);

    // Refresh data when window is focused (useful for mobile)
    const handleFocus = () => {
      console.log("Window focused, refreshing data...");
      fetchEntries().catch(() => {});
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.close();
        } catch (e) {}
      }
      clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "dashboard") {
      const timer = setTimeout(() => setIsDashboardReady(true), 1000);
      return () => {
        clearTimeout(timer);
        setIsDashboardReady(false);
      };
    }
  }, [activeTab]);

  const addNotification = (type: Notification["type"], message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const fetchEntries = async () => {
    try {
      // Check server config first with cache busting
      const configResponse = await fetch(`/api/config?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      let isServerFirebase = false;
      if (configResponse.ok) {
        const config = await configResponse.json();
        isServerFirebase = config.firebaseEnabled;
        setServerFirebaseEnabled(isServerFirebase);
      }

      // Try Firestore with timeout if db is available
      const fetchFromFirestore = async () => {
        if (!db || !isFirebaseEnabled) return null;
        try {
          const querySnapshot = await getDocs(collection(db, "entries"));
          const querySnapshotAtt = await getDocs(collection(db, "attendance"));
          const querySnapshotLoc = await getDocs(collection(db, "locations"));

          setFirebaseStatus("online");
          
          const entriesData = querySnapshot.empty ? [] : querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          })) as Entry[];
          entriesData.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

          const attendanceData = querySnapshotAtt.empty ? [] : querySnapshotAtt.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          })) as Attendance[];
          attendanceData.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

          const locationsData = querySnapshotLoc.empty ? [] : querySnapshotLoc.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          })) as Location[];
          locationsData.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));

          // If locations are empty, seed a default location in Firestore
          let finalLocations = locationsData;
          if (locationsData.length === 0) {
            console.log("Seeding default location to Firestore...");
            const defaultLoc = { name: "Salão Principal", is_default: 1, created_at: new Date().toISOString() };
            try {
              const docRef = await addDoc(collection(db, "locations"), defaultLoc);
              finalLocations = [{ id: docRef.id, ...defaultLoc }];
            } catch (err) {
              console.error("Error seeding default location:", err);
              finalLocations = [{ id: 'temp-default', ...defaultLoc }];
            }
          }

          return { entriesData, attendanceData, locationsData: finalLocations };
        } catch (e: any) {
          console.error("Firestore error details:", e);
          if (e.message?.includes("Database '(default)' not found")) {
            setFirebaseStatus("error");
            console.warn("Firestore Database not created in console.");
          } else if (e.message?.includes("permission-denied")) {
            setFirebaseStatus("error");
            console.warn("Firestore permission denied. Check security rules.");
          }
          throw e;
        }
      };

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );

      setLoading(true);
      try {
        const result = await Promise.race([fetchFromFirestore(), timeoutPromise]) as any;
        if (result) {
          console.log("Using Firestore data for state update");
          const uniqueEntries = Array.from(new Map(result.entriesData.map((e: Entry) => [e.id, e])).values()) as Entry[];
          setEntries(uniqueEntries);
          
          const sortedAttendance = (result.attendanceData || []).sort((a: Attendance, b: Attendance) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            const periodOrder: Record<string, number> = { "Noite": 3, "Tarde": 2, "Manhã": 1 };
            return (periodOrder[b.period] || 0) - (periodOrder[a.period] || 0);
          });
          const uniqueAttendance = Array.from(new Map(sortedAttendance.map((a: Attendance) => [a.id, a])).values()) as Attendance[];
          setAttendanceEntries(uniqueAttendance);
          
          const uniqueLocations = Array.from(new Map(result.locationsData.map((l: Location) => [l.id, l])).values()) as Location[];
          setLocations(uniqueLocations);

          // Fetch Kids Data
          const querySnapshotGuardians = await getDocs(collection(db, "guardians"));
          const guardiansData = querySnapshotGuardians.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Guardian[];
          setGuardians(guardiansData);

          const querySnapshotChildren = await getDocs(collection(db, "children"));
          const childrenData = querySnapshotChildren.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Child[];
          setChildren(childrenData);

          const querySnapshotKidsCheckIns = await getDocs(collection(db, "kids_checkins"));
          const kidsCheckInsData = querySnapshotKidsCheckIns.docs.map(doc => ({ id: doc.id, ...doc.data() })) as KidsCheckIn[];
          setKidsCheckIns(kidsCheckInsData);

          const querySnapshotRooms = await getDocs(collection(db, "rooms"));
          const roomsData = querySnapshotRooms.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Room[];
          setRooms(roomsData);
          
          setLoading(false);
          return;
        } else {
          console.warn("Firestore returned null (empty), falling back to API");
        }
      } catch (fsError) {
        console.error("Firestore fetch failed or timed out, falling back to local:", fsError);
      }

      const response = await fetch(`/api/entries?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setEntries(Array.from(new Map(data.map((e: Entry) => [e.id, e])).values()) as Entry[]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("API entries fetch failed:", errorData);
        if (response.status === 503) {
          throw new Error("Servidor em modo de manutenção ou Firebase não configurado.");
        }
      }

      const attResponse = await fetch(`/api/attendance?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (attResponse.ok) {
        const data = await attResponse.json();
        console.log(`Fetched from API: ${data.length} attendance entries`);
        if (Array.isArray(data)) {
          const sortedAttendance = data.sort((a: Attendance, b: Attendance) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            const periodOrder: Record<string, number> = { "Noite": 3, "Tarde": 2, "Manhã": 1 };
            return (periodOrder[b.period] || 0) - (periodOrder[a.period] || 0);
          });
          setAttendanceEntries(Array.from(new Map(sortedAttendance.map((a: Attendance) => [a.id, a])).values()) as Attendance[]);
        }
      }

      const locResponse = await fetch(`/api/locations?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (locResponse.ok) {
        const data = await locResponse.json();
        if (Array.isArray(data) && data.length > 0) {
          setLocations(Array.from(new Map(data.map((l: Location) => [l.id, l])).values()) as Location[]);
        } else if (locations.length === 0) {
          // Final fallback: if still no locations, set a default one locally
          setLocations([{ id: 'local-default', name: "Salão Principal", is_default: 1, created_at: new Date().toISOString() }]);
        }
      } else if (locations.length === 0) {
        setLocations([{ id: 'local-default', name: "Salão Principal", is_default: 1, created_at: new Date().toISOString() }]);
      }

      // Kids Ministry Fallbacks
      const guardiansRes = await fetch(`/api/guardians?t=${Date.now()}`);
      if (guardiansRes.ok) {
        const data = await guardiansRes.json();
        if (Array.isArray(data)) setGuardians(data);
      }

      const childrenRes = await fetch(`/api/children?t=${Date.now()}`);
      if (childrenRes.ok) {
        const data = await childrenRes.json();
        if (Array.isArray(data)) setChildren(data);
      }

      const roomsRes = await fetch(`/api/rooms?t=${Date.now()}`);
      if (roomsRes.ok) {
        const data = await roomsRes.json();
        if (Array.isArray(data)) setRooms(data);
      }

      const checkinsRes = await fetch(`/api/kids_checkins?t=${Date.now()}`);
      if (checkinsRes.ok) {
        const data = await checkinsRes.json();
        if (Array.isArray(data)) setKidsCheckIns(data);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      if (locations.length === 0) {
        setLocations([{ id: 'error-default', name: "Salão Principal", is_default: 1, created_at: new Date().toISOString() }]);
      }
      const isVercel = window.location.hostname.includes("vercel.app");
      const message = isVercel && !serverFirebaseEnabled 
        ? "Erro de conexão. No Vercel, o Firebase precisa estar configurado."
        : (error.message || "Erro ao sincronizar dados com o servidor.");
      addNotification("error", message, "Erro de Conexão");
    } finally {
      setLoading(false);
      // Final safety check: ensure we have at least one location
      setLocations(prev => {
        if (prev.length === 0) {
          return [{ id: 'final-fallback', name: "Salão Principal", is_default: 1, created_at: new Date().toISOString() }];
        }
        return prev;
      });
    }
  };

  useEffect(() => {
    setAttendanceForm(prev => {
      const updatedCounts: Record<string, { men: number; women: number; children: number }> = {};
      locations.forEach(loc => {
        updatedCounts[loc.name] = prev.counts[loc.name] || { men: 0, women: 0, children: 0 };
      });
      // Only update if counts actually changed to avoid infinite loops
      if (JSON.stringify(updatedCounts) !== JSON.stringify(prev.counts)) {
        return { ...prev, counts: updatedCounts };
      }
      return prev;
    });
  }, [locations]);

  const reverseEntry = async (id: string | number) => {
    setEntryToReverse(id);
    setReversalReason("");
    setShowReversalModal(true);
  };

  const confirmReversal = async () => {
    if (!entryToReverse) return;
    if (!reversalReason || reversalReason.trim() === "") {
      addNotification("warning", "O motivo do estorno é obrigatório.", "Campo Obrigatório");
      return;
    }
    
    const id = entryToReverse;
    const reason = reversalReason;

    try {
      setSubmitting(true);
      // Try Firestore first if ID is string and db is available
      if (typeof id === "string" && db && isFirebaseEnabled) {
        try {
          const entryRef = doc(db, "entries", id);
          await updateDoc(entryRef, {
            is_reversed: 1,
            reversal_reason: reason
          });
          fetchEntries();
          setSelectedEntry(null);
          setShowReversalModal(false);
          addNotification("success", "O lançamento foi estornado com sucesso no Firebase.", "Estorno Realizado");
          return;
        } catch (fsError) {
          console.error("Firestore updateDoc failed, falling back to API:", fsError);
        }
      }

      // Fallback to local API
      const response = await fetch(`/api/entries/${id}/reverse`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      if (response.ok) {
        fetchEntries();
        setSelectedEntry(null);
        setShowReversalModal(false);
        addNotification("success", "O lançamento foi estornado com sucesso localmente.", "Estorno Realizado");
      } else {
        const errorData = await response.json();
        addNotification("error", errorData.error || "Não foi possível realizar o estorno.", "Erro");
      }
    } catch (error) {
      console.error("Error reversing entry:", error);
      addNotification("error", "Não foi possível realizar o estorno.", "Erro no Servidor");
    } finally {
      setSubmitting(false);
    }
  };

  const updateUserRole = async (uid: string, newRole: "master" | "junior" | "user") => {
    if (userRole !== "master") return;
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      addNotification("success", "Permissão atualizada com sucesso!");
    } catch (error) {
      console.error("Error updating user role:", error);
      addNotification("error", "Erro ao atualizar permissão.");
    }
  };

  const inviteUser = async () => {
    if (!newUserEmail || userRole !== "master") return;
    try {
      setIsAddingUser(true);
      const q = query(collection(db, "users"), where("email", "==", newUserEmail.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, "users", userDoc.id), { role: newUserRole });
        addNotification("success", `O usuário ${newUserEmail} já existia e teve seu poder atualizado para ${newUserRole}.`);
      } else {
        // Create a document with the email as the ID (sanitized)
        const sanitizedEmail = newUserEmail.toLowerCase().replace(/[^a-z0-9]/g, "_");
        await setDoc(doc(db, "users", sanitizedEmail), {
          email: newUserEmail.toLowerCase(),
          role: newUserRole,
          is_pending: true
        });
        addNotification("success", `Usuário ${newUserEmail} pré-cadastrado como ${newUserRole}. Peça para ele se cadastrar com este e-mail.`);
      }
      setNewUserEmail("");
    } catch (error) {
      console.error("Error inviting user:", error);
      addNotification("error", "Erro ao cadastrar usuário.");
    } finally {
      setIsAddingUser(false);
    }
  };

  const deleteUser = async (uid: string) => {
    if (userRole !== "master") return;
    if (uid === user?.uid) {
      addNotification("warning", "Você não pode se auto-excluir.");
      return;
    }
    try {
      await deleteDoc(doc(db, "users", uid));
      addNotification("success", "Usuário removido com sucesso!");
    } catch (error) {
      console.error("Error deleting user:", error);
      addNotification("error", "Erro ao remover usuário.");
    }
  };

  const addLocation = async () => {
    if (!newLocationName.trim()) return;
    try {
      const locationData = {
        name: newLocationName,
        is_default: 0,
        created_at: new Date().toISOString()
      };

      // Try Firestore first for Vercel/Serverless compatibility
      if (db && isFirebaseEnabled) {
        try {
          await addDoc(collection(db, "locations"), locationData);
          setNewLocationName("");
          fetchEntries();
          addNotification("success", "Local adicionado com sucesso no Firebase.", "Sucesso");
          return;
        } catch (fsError) {
          console.error("Firestore addLocation failed, falling back to API:", fsError);
        }
      }

      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLocationName })
      });
      if (response.ok) {
        setNewLocationName("");
        fetchEntries();
        addNotification("success", "Local adicionado com sucesso.", "Sucesso");
      } else {
        const errorData = await response.json().catch(() => ({ error: "Erro de comunicação com o servidor." }));
        addNotification("error", errorData.error || "Erro ao adicionar local.", "Erro");
      }
    } catch (error) {
      console.error("Error adding location:", error);
      addNotification("error", "Erro ao adicionar local. Verifique sua conexão.", "Erro");
    }
  };

  // Kids Ministry Logic
  const handleAddGuardian = async (guardianData: Omit<Guardian, "id" | "created_at">) => {
    try {
      setSubmitting(true);
      const id = Math.random().toString(36).substring(2, 15);
      const newGuardian = {
        ...guardianData,
        id,
        created_at: new Date().toISOString()
      };
      if (db && isFirebaseEnabled) {
        try {
          const docRef = await addDoc(collection(db, "guardians"), newGuardian);
          fetchEntries();
          setShowAddGuardianModal(false);
          addNotification("success", "Responsável adicionado com sucesso.");
          return docRef.id;
        } catch (fsError) {
          console.error("Firestore addGuardian failed, falling back to API:", fsError);
        }
      }

      const response = await fetch("/api/guardians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGuardian)
      });
      if (response.ok) {
        fetchEntries();
        setShowAddGuardianModal(false);
        addNotification("success", "Responsável adicionado com sucesso.");
        return id;
      }
    } catch (error) {
      console.error("Error adding guardian:", error);
      addNotification("error", "Erro ao adicionar responsável.");
    } finally {
      setSubmitting(false);
    }
    return null;
  };

  const handleAddChild = async (childData: Omit<Child, "id" | "created_at">) => {
    try {
      setSubmitting(true);
      const id = Math.random().toString(36).substring(2, 15);
      const newChild = {
        ...childData,
        id,
        created_at: new Date().toISOString()
      };
      if (db && isFirebaseEnabled) {
        try {
          const docRef = await addDoc(collection(db, "children"), newChild);
          fetchEntries();
          setShowAddChildModal(false);
          addNotification("success", "Criança adicionada com sucesso.");
          return docRef.id;
        } catch (fsError) {
          console.error("Firestore addChild failed, falling back to API:", fsError);
        }
      }

      const response = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newChild)
      });
      if (response.ok) {
        fetchEntries();
        setShowAddChildModal(false);
        addNotification("success", "Criança adicionada com sucesso.");
        return id;
      }
    } catch (error) {
      console.error("Error adding child:", error);
      addNotification("error", "Erro ao adicionar criança.");
    } finally {
      setSubmitting(false);
    }
    return null;
  };

  const handleCheckOut = async (checkInId: string) => {
    try {
      setSubmitting(true);
      const checkoutData = {
        status: "checked-out",
        checkoutTime: new Date().toISOString(),
        checkedOutBy: "Room Leader"
      };

      if (db && isFirebaseEnabled) {
        try {
          await updateDoc(doc(db, "kids_checkins", checkInId), checkoutData);
          fetchEntries();
          addNotification("success", "Check-out realizado com sucesso.");
          return;
        } catch (fsError) {
          console.error("Firestore checkOut failed, falling back to API:", fsError);
        }
      }

      const response = await fetch(`/api/kids_checkins/${checkInId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutData)
      });
      if (response.ok) {
        fetchEntries();
        addNotification("success", "Check-out realizado com sucesso.");
      }
    } catch (error) {
      console.error("Error checking out:", error);
      addNotification("error", "Erro ao realizar check-out.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRoom = async (roomData: Omit<Room, "id" | "created_at">) => {
    try {
      setSubmitting(true);
      const id = Math.random().toString(36).substring(2, 15);
      const newRoom = {
        ...roomData,
        id,
        created_at: new Date().toISOString()
      };
      if (db && isFirebaseEnabled) {
        try {
          await addDoc(collection(db, "rooms"), newRoom);
          fetchEntries();
          setShowAddRoomModal(false);
          addNotification("success", "Sala adicionada com sucesso.");
          return;
        } catch (fsError) {
          console.error("Firestore addRoom failed, falling back to API:", fsError);
        }
      }

      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRoom)
      });
      if (response.ok) {
        fetchEntries();
        setShowAddRoomModal(false);
        addNotification("success", "Sala adicionada com sucesso.");
      }
    } catch (error) {
      console.error("Error adding room:", error);
      addNotification("error", "Erro ao adicionar sala.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateGuardian = async (id: string, guardianData: Partial<Guardian>) => {
    try {
      setSubmitting(true);
      if (db && isFirebaseEnabled) {
        try {
          await updateDoc(doc(db, "guardians", id), guardianData);
          fetchEntries();
          setShowEditGuardianModal(false);
          setEditingGuardian(null);
          addNotification("success", "Responsável atualizado com sucesso.");
          return;
        } catch (fsError) {
          console.error("Firestore updateGuardian failed, falling back to API:", fsError);
        }
      }

      const response = await fetch(`/api/guardians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guardianData)
      });
      if (response.ok) {
        fetchEntries();
        setShowEditGuardianModal(false);
        setEditingGuardian(null);
        addNotification("success", "Responsável atualizado com sucesso.");
      }
    } catch (error) {
      console.error("Error updating guardian:", error);
      addNotification("error", "Erro ao atualizar responsável.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateChild = async (id: string, childData: Partial<Child>) => {
    try {
      setSubmitting(true);
      if (db && isFirebaseEnabled) {
        try {
          await updateDoc(doc(db, "children", id), childData);
          fetchEntries();
          setShowEditChildModal(false);
          setEditingChild(null);
          addNotification("success", "Criança atualizada com sucesso.");
          return;
        } catch (fsError) {
          console.error("Firestore updateChild failed, falling back to API:", fsError);
        }
      }

      const response = await fetch(`/api/children/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(childData)
      });
      if (response.ok) {
        fetchEntries();
        setShowEditChildModal(false);
        setEditingChild(null);
        addNotification("success", "Criança atualizada com sucesso.");
      }
    } catch (error) {
      console.error("Error updating child:", error);
      addNotification("error", "Erro ao atualizar criança.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRoom = async (id: string, roomData: Partial<Room>) => {
    try {
      setSubmitting(true);
      if (db && isFirebaseEnabled) {
        try {
          await updateDoc(doc(db, "rooms", id), roomData);
          fetchEntries();
          setShowEditRoomModal(false);
          setEditingRoom(null);
          addNotification("success", "Sala atualizada com sucesso.");
          return;
        } catch (fsError) {
          console.error("Firestore updateRoom failed, falling back to API:", fsError);
        }
      }

      const response = await fetch(`/api/rooms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomData)
      });
      if (response.ok) {
        fetchEntries();
        setShowEditRoomModal(false);
        setEditingRoom(null);
        addNotification("success", "Sala atualizada com sucesso.");
      }
    } catch (error) {
      console.error("Error updating room:", error);
      addNotification("error", "Erro ao atualizar sala.");
    } finally {
      setSubmitting(false);
    }
  };

  const printLabels = (guardian: Guardian, selectedChildrenList: Child[], roomName: string, checkInId?: string) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [80, 50] // Typical label size
    });

    const securityCode = Math.random().toString(36).substring(2, 6).toUpperCase();

    // 1. Print Child Labels (one for each child)
    selectedChildrenList.forEach((child, index) => {
      if (index > 0) doc.addPage([80, 50], 'landscape');
      
      // Header
      doc.setFillColor(79, 70, 229); // Indigo-600
      doc.rect(0, 0, 80, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("CRIANÇA", 40, 8, { align: "center" });
      
      // Security Code
      doc.setTextColor(79, 70, 229);
      doc.setFontSize(24);
      doc.text(securityCode, 75, 25, { align: "right" });
      
      // Child Info
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.setFontSize(16);
      doc.text(child.name.toUpperCase(), 5, 22);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`Responsável: ${guardian.name}`, 5, 32);
      doc.text(`Sala: ${roomName}`, 5, 37);
      
      // Barcode for checkout
      if (checkInId) {
        try {
          const canvas = document.createElement("canvas");
          JsBarcode(canvas, checkInId, {
            format: "CODE128",
            width: 1,
            height: 30,
            displayValue: false,
            margin: 0
          });
          const barcodeData = canvas.toDataURL("image/png");
          doc.addImage(barcodeData, 'PNG', 5, 39, 40, 8);
        } catch (err) {
          console.error("Error generating barcode:", err);
        }
      }

      if (child.allergies) {
        doc.setFillColor(254, 226, 226); // Rose-100
        doc.rect(45, 32, 30, 14, 'F');
        doc.setTextColor(225, 29, 72); // Rose-600
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(`⚠️ ALERGIA:`, 47, 36);
        doc.setFontSize(7);
        doc.text(child.allergies.toUpperCase(), 47, 40, { maxWidth: 26 });
      }
      
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`${churchName} - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 5, 48);
    });

    // 2. Print Guardian Label (one for all children)
    doc.addPage([80, 50], 'landscape');
    
    // Header
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, 80, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("COMPROVANTE RESPONSÁVEL", 40, 8, { align: "center" });
    
    // Security Code
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(24);
    doc.text(securityCode, 75, 25, { align: "right" });
    
    // Guardian Info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text(guardian.name.toUpperCase(), 5, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Criança(s) sob cuidado:`, 5, 32);
    doc.text(`Sala: ${roomName}`, 40, 32);
    
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    selectedChildrenList.forEach((c, i) => {
      if (i < 3) { // Limit to 3 children on label to avoid overflow
        doc.text(`• ${c.name}`, 8, 38 + (i * 4));
      } else if (i === 3) {
        doc.text(`• e mais ${selectedChildrenList.length - 3}...`, 8, 38 + (i * 4));
      }
    });
    
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text(`APRESENTE ESTA ETIQUETA PARA RETIRADA`, 40, 48, { align: "center" });

    doc.autoPrint();
    const pdfOutput = doc.output('bloburl');
    window.open(pdfOutput, '_blank');
  };

  const handleCheckIn = async () => {
    if (!selectedGuardian || selectedChildren.length === 0) {
      addNotification("warning", "Selecione o responsável e pelo menos uma criança.");
      return;
    }

    try {
      setSubmitting(true);
      const date = new Date().toISOString().split("T")[0];
      const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      const selectedChildrenData = children.filter(c => selectedChildren.includes(c.id));
      
      for (const child of selectedChildrenData) {
        // Automatic room assignment based on age
        const age = calculateAge(child.birthDate);
        const autoRoom = findRoomForAge(age);
        const roomId = selectedRoomId || autoRoom?.id;
        const room = rooms.find(r => r.id === roomId);
        const roomName = room ? room.name : "Sala Geral";

        const checkInData: Omit<KidsCheckIn, "id"> = {
          childId: child.id,
          guardianId: selectedGuardian.id,
          date,
          time,
          room: roomName,
          status: "checked-in",
          created_at: new Date().toISOString()
        };
        let checkInId = Math.random().toString(36).substring(2, 15);
        
        if (db && isFirebaseEnabled) {
          try {
            const docRef = await addDoc(collection(db, "kids_checkins"), checkInData);
            checkInId = docRef.id;
          } catch (fsError) {
            console.error("Firestore checkIn failed, falling back to API:", fsError);
          }
        }
        
        // Always try to save to API as fallback or if Firebase failed
        await fetch("/api/kids_checkins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: checkInId, ...checkInData, roomId: roomId || "general" })
        });
        
        // Print label for this specific child and its room
        printLabels(selectedGuardian, [child], roomName, checkInId);
      }

      fetchEntries();
      setSelectedChildren([]);
      setSelectedGuardian(null);
      if (isMobileCheckin) setMobileStep("success");
      addNotification("success", "Check-in realizado com sucesso!");
    } catch (error) {
      console.error("Error during check-in:", error);
      addNotification("error", "Erro ao realizar check-in.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteLocation = async (id: string | number) => {
    try {
      // Try Firestore first
      if (typeof id === "string" && db && isFirebaseEnabled) {
        try {
          await deleteDoc(doc(db, "locations", id));
          fetchEntries();
          addNotification("success", "Local excluído com sucesso no Firebase.", "Sucesso");
          setShowDeleteLocationConfirm(null);
          return;
        } catch (fsError) {
          console.error("Firestore deleteLocation failed, falling back to API:", fsError);
        }
      }

      const response = await fetch(`/api/locations/${id}`, { method: "DELETE" });
      if (response.ok) {
        fetchEntries();
        addNotification("success", "Local excluído com sucesso.", "Sucesso");
        setShowDeleteLocationConfirm(null);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Erro de comunicação com o servidor." }));
        addNotification("error", errorData.error || "Erro ao excluir local.", "Erro");
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      addNotification("error", "Erro ao excluir local.", "Erro");
    }
  };

  const editLocation = async () => {
    if (!editingLocation || !editingLocation.name.trim()) return;
    try {
      const id = editingLocation.id;
      const name = editingLocation.name;

      // Try Firestore first
      if (typeof id === "string" && db && isFirebaseEnabled) {
        try {
          await updateDoc(doc(db, "locations", id), { name });
          setEditingLocation(null);
          fetchEntries();
          addNotification("success", "Local atualizado com sucesso no Firebase.", "Sucesso");
          return;
        } catch (fsError) {
          console.error("Firestore editLocation failed, falling back to API:", fsError);
        }
      }

      const response = await fetch(`/api/locations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (response.ok) {
        setEditingLocation(null);
        fetchEntries();
        addNotification("success", "Local atualizado com sucesso.", "Sucesso");
      } else {
        const errorData = await response.json().catch(() => ({ error: "Erro de comunicação com o servidor." }));
        addNotification("error", errorData.error || "Erro ao atualizar local.", "Erro");
      }
    } catch (error) {
      console.error("Error updating location:", error);
      addNotification("error", "Erro ao atualizar local.", "Erro");
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const title = `Relatório de Tesouraria - ${churchName}`;
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

    const tableData = filteredEntries.map(e => [
      e.date.split("-").reverse().join("/"),
      e.period,
      e.treasurer,
      e.type,
      `R$ ${e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      e.is_reversed ? "Sim" : "Não"
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Data", "Período", "Tesoureiro", "Tipo", "Valor", "Estornado"]],
      body: tableData,
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    doc.save(`relatorio-tesouraria-${new Date().toISOString().split('T')[0]}.pdf`);
    addNotification("success", "PDF gerado com sucesso!", "Exportar");
  };

  const exportCSV = () => {
    const headers = ["ID", "Data", "Período", "Tesoureiro", "Tipo", "Valor", "Observações", "Estornado", "Motivo Estorno"];
    const rows = filteredEntries.map(e => [
      e.id,
      (() => {
        const [y, m, d] = e.date.split("-");
        return `${d}/${m}/${y}`;
      })(),
      e.period || "Manhã",
      e.treasurer,
      e.type,
      e.amount.toFixed(2).replace('.', ','), // Use comma for decimal in Excel-friendly format
      (e.notes || "").replace(/;/g, ' '), // Remove semicolons from notes to avoid breaking columns
      e.is_reversed ? "Sim" : "Não",
      (e.reversal_reason || "").replace(/;/g, ' ')
    ]);

    // Use semicolon as separator for better Excel compatibility in many regions
    const csvContent = [
      headers.join(";"),
      ...rows.map(r => r.join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `tesouraria_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addNotification("success", "A planilha foi gerada e baixada com sucesso.", "Exportação Concluída");
  };

  const printReport = () => {
    window.print();
  };

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const attendanceData = {
        date: attendanceForm.date,
        period: attendanceForm.period,
        counts: attendanceForm.counts,
        responsible: attendanceForm.responsible,
        notes: attendanceForm.notes,
        created_at: new Date().toISOString()
      };

      // Try Firestore first
      let saved = false;
      if (db && isFirebaseEnabled) {
        try {
          await addDoc(collection(db, "attendance"), attendanceData);
          addNotification("success", "Contagem registrada com sucesso no Firebase.", "Sucesso");
          saved = true;
        } catch (fsError) {
          console.error("Firestore save attendance failed, falling back to API:", fsError);
        }
      }

      if (!saved) {
        try {
          const response = await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(attendanceData)
          });
          if (!response.ok) throw new Error("Falha ao salvar contagem");
          addNotification("success", "Contagem registrada com sucesso.", "Sucesso");
        } catch (error) {
          console.error("Error saving attendance:", error);
          addNotification("error", "Erro ao salvar contagem no servidor.", "Erro");
          throw error;
        }
      }

      // Reset counts to 0 for all locations
      const resetCounts: Record<string, { men: number; women: number; children: number }> = {};
      locations.forEach(loc => {
        resetCounts[loc.name] = { men: 0, women: 0, children: 0 };
      });

      setAttendanceForm({
        ...attendanceForm,
        counts: resetCounts,
        responsible: "",
        notes: "",
        period: getCurrentPeriod()
      });
      fetchEntries();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      console.error("Error saving attendance:", error);
      addNotification("error", "Erro ao salvar contagem. Verifique sua conexão.", "Erro");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      console.log("Botão Salvar clicado");
      
      if (!formData.treasurer.trim()) {
        addNotification("warning", "Por favor, informe o nome do tesoureiro.", "Campo Obrigatório");
        return;
      }
      
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        addNotification("warning", "Por favor, informe um valor válido maior que zero.", "Valor Inválido");
        return;
      }

      const entryData = {
        ...formData,
        amount: parseFloat(formData.amount),
        counts: Object.keys(counts).length > 0 ? JSON.stringify(counts) : null,
        is_reversed: 0,
        reversal_reason: null,
        created_at: new Date().toISOString()
      };

      setSubmitting(true);
      console.log("Iniciando salvamento...", entryData);
      
      // Try Firestore first for Vercel/Serverless compatibility
      let saved = false;
      if (db && isFirebaseEnabled) {
        try {
          await addDoc(collection(db, "entries"), entryData);
          saved = true;
          setSuccess(true);
          addNotification("success", "O lançamento foi registrado com sucesso no Firebase.", "Lançamento Salvo");
          setFormData({
            ...formData,
            amount: "",
            notes: "",
            period: getCurrentPeriod()
          });
          setCounts({});
          fetchEntries();
          setTimeout(() => {
            setSuccess(false);
            setActiveTab(userRole === "master" ? "history" : "dashboard");
          }, 2000);
        } catch (fsError) {
          console.error("Firestore save entry failed, falling back to API:", fsError);
        }
      }

      if (!saved) {
        try {
          const response = await fetch("/api/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entryData)
          });

          if (response.ok) {
            setSuccess(true);
            addNotification("success", "O lançamento foi registrado com sucesso.", "Lançamento Salvo");
            setFormData({
              ...formData,
              amount: "",
              notes: "",
              period: getCurrentPeriod()
            });
            setCounts({});
            fetchEntries();
            setTimeout(() => {
              setSuccess(false);
              setActiveTab(userRole === "master" ? "history" : "dashboard");
            }, 2000);
          } else {
            const errorData = await response.json().catch(() => ({ error: "Erro de comunicação com o servidor." }));
            addNotification("error", errorData.error || "Erro ao salvar o lançamento.", "Falha no Registro");
          }
        } catch (error) {
          console.error("Error saving entry:", error);
          addNotification("error", "Ocorreu um erro inesperado ao salvar no servidor.", "Erro Crítico");
        } finally {
          setSubmitting(false);
        }
      } else {
        setSubmitting(false);
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    }
  };

  const useCalculatorTotal = () => {
    setFormData({ ...formData, amount: calculatorTotal.toFixed(2) });
    setActiveTab("form");
    addNotification("info", "O valor foi aplicado ao formulário. Complete os dados para salvar.", "Valor Aplicado");
  };

  const formatWhatsAppMessage = (entry: Entry) => {
    const [year, month, day] = entry.date.split("-");
    const formattedDate = `${day}/${month}/${year}`;
    
    let message = `*Comprovante de Lançamento*\n\n` +
      `👤 *Tesoureiro:* ${entry.treasurer}\n` +
      `📅 *Data:* ${formattedDate}\n` +
      `🕒 *Período:* ${entry.period || "Manhã"}\n` +
      `🏷️ *Tipo:* ${entry.type}\n` +
      `💰 *Valor:* R$ ${entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    
    if (entry.notes) {
      message += `📝 *Observação:* ${entry.notes}\n`;
    }

    message += `\n_Gerado via Tesouraria Digital_`;
    
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const sendWhatsApp = (entry: Entry) => {
    window.open(formatWhatsAppMessage(entry), "_blank");
  };

  const updateChurchName = (name: string) => {
    setChurchName(name);
    localStorage.setItem("churchName", name);
  };

  const handlePinInput = (val: string) => {
    const newPin = pinInput + val;
    if (newPin.length <= 4) {
      setPinInput(newPin);
      if (newPin.length === 4) {
        if (newPin === "1234") {
          setUserRole("master");
          localStorage.setItem("userRole", "master");
          setShowPinModal(false);
          setPinInput("");
          setPinError(false);
        } else if (newPin === "4321") {
          setUserRole("junior");
          localStorage.setItem("userRole", "junior");
          setShowPinModal(false);
          setPinInput("");
          setPinError(false);
        } else {
          setPinError(true);
          addNotification("error", "O PIN informado está incorreto. Tente novamente.", "Acesso Negado");
          setTimeout(() => {
            setPinInput("");
            setPinError(false);
          }, 1000);
        }
      }
    }
  };

  const formatCurrency = (value: number) => {
    if (!showValues) return "R$ ••••";
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const handleLogoutMaster = () => {
    setUserRole("user");
    localStorage.setItem("userRole", "user");
    setActiveTab("dashboard");
  };

  if (isRoomLeader) {
    if (!user) {
      return (
        <LoginScreen 
          title="App do Líder" 
          isFirebaseEnabled={isFirebaseEnabled}
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          handleLogin={handleLogin}
          handleRegister={handleRegister}
          handleForgotPassword={handleForgotPassword}
          isLoggingIn={isLoggingIn}
          isProcessingRegister={isProcessingRegister}
          isRegistering={isRegistering}
          setIsRegistering={setIsRegistering}
          setUser={setUser}
          addNotification={addNotification}
        />
      );
    }

    const activeCheckins = kidsCheckIns.filter(c => c.status === "checked-in" && (!selectedRoomForLeader || c.room === selectedRoomForLeader.name));
    
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl overflow-hidden mt-8">
          <div className="bg-indigo-600 p-8 text-white text-center relative">
            <button 
              onClick={handleLogout}
              className="absolute top-4 right-4 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">Líder de Sala</h1>
            <p className="text-indigo-100 text-sm mt-2">Gerenciamento de sala e checkout</p>
          </div>

          <div className="p-8">
            {!selectedRoomForLeader ? (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-slate-800">Selecione sua Sala</h2>
                <div className="grid grid-cols-1 gap-4">
                  {rooms.map(room => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoomForLeader(room)}
                      className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-left hover:border-indigo-500 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-bold text-slate-800 group-hover:text-indigo-600">{room.name}</p>
                          <p className="text-xs text-slate-400">
                            {room.minAge}-{room.maxAge} anos
                            {room.teacher && ` • Prof: ${room.teacher}`}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <button 
                      onClick={() => setSelectedRoomForLeader(null)}
                      className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1"
                    >
                      <ChevronRight className="w-3 h-3 rotate-180" />
                      Trocar Sala
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">{selectedRoomForLeader.name}</h2>
                    {selectedRoomForLeader.teacher && (
                      <p className="text-xs text-slate-500">Professor(a): {selectedRoomForLeader.teacher}</p>
                    )}
                    <p className="text-xs text-slate-400">{activeCheckins.length} crianças presentes</p>
                  </div>
                  <button onClick={() => setSelectedRoomForLeader(null)} className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Trocar Sala</button>
                </div>

                <div className="space-y-4">
                  {activeCheckins.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">Nenhuma criança na sala no momento.</p>
                    </div>
                  ) : (
                    activeCheckins.map(checkin => {
                      const child = children.find(c => c.id === checkin.childId);
                      const guardian = guardians.find(g => g.id === checkin.guardianId);
                      return (
                        <div key={checkin.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{child?.name}</p>
                            <p className="text-[10px] text-slate-400">Responsável: {guardian?.name}</p>
                          </div>
                          <button
                            onClick={() => handleCheckOut(checkin.id)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
                          >
                            Checkout
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button 
                    onClick={() => {
                      // Logic to open camera and scan QR code for checkout
                      // For now, we'll just show a notification that it's coming soon
                      addNotification("info", "Funcionalidade de leitura de QR Code para checkout em breve.");
                    }}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all"
                  >
                    <QrCode className="w-5 h-5" />
                    Ler QR Code para Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isPublicRegistration) {
    if (!user) {
      return (
        <LoginScreen 
          title="Cadastro Kids" 
          isFirebaseEnabled={isFirebaseEnabled}
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          handleLogin={handleLogin}
          handleRegister={handleRegister}
          handleForgotPassword={handleForgotPassword}
          isLoggingIn={isLoggingIn}
          isProcessingRegister={isProcessingRegister}
          isRegistering={isRegistering}
          setIsRegistering={setIsRegistering}
          setUser={setUser}
          addNotification={addNotification}
        />
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl overflow-hidden mt-8">
          <div className="bg-indigo-600 p-8 text-white text-center relative">
            <button 
              onClick={handleLogout}
              className="absolute top-4 right-4 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <UserPlus className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">Cadastro Kids</h1>
            <p className="text-indigo-100 text-sm mt-2">Registre sua família para o ministério infantil</p>
          </div>

          <div className="p-8">
            {registrationStep === "guardian" && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const guardianId = await handleAddGuardian({
                  name: formData.get('name') as string,
                  phone: formData.get('phone') as string,
                  email: formData.get('email') as string,
                });
                if (guardianId) {
                  setRegistrationGuardianId(guardianId);
                  setRegistrationStep("children");
                }
              }} className="space-y-6">
                <h2 className="text-lg font-bold text-slate-800">Passo 1: Responsável</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                    <input name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Telefone (WhatsApp)</label>
                    <input name="phone" required type="tel" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">E-mail (Opcional)</label>
                    <input name="email" type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" />
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {submitting ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Próximo Passo"}
                </button>
              </form>
            )}

            {registrationStep === "children" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800">Passo 2: Crianças</h2>
                  <button onClick={() => setRegistrationStep("success")} className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Finalizar</button>
                </div>
                
                <div className="space-y-4">
                  {children.filter(c => c.guardianId === registrationGuardianId).map(child => (
                    <div key={child.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{child.name}</p>
                        <p className="text-[10px] text-slate-400">{new Date(child.birthDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  await handleAddChild({
                    name: formData.get('name') as string,
                    birthDate: formData.get('birthDate') as string,
                    guardianId: registrationGuardianId!,
                    allergies: formData.get('allergies') as string,
                    notes: formData.get('notes') as string,
                  });
                  e.currentTarget.reset();
                }} className="space-y-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adicionar Criança</p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome da Criança</label>
                    <input name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Data de Nascimento</label>
                    <input name="birthDate" required type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Alergias / Observações</label>
                    <input name="allergies" placeholder="Ex: Alergia a amendoim" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-bold uppercase tracking-widest hover:bg-indigo-50 transition-all disabled:opacity-50">
                    {submitting ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Adicionar Criança"}
                  </button>
                </form>
              </div>
            )}

            {registrationStep === "success" && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Cadastro Concluído!</h2>
                <p className="text-slate-500 mb-8">Sua família já está cadastrada. Agora você pode realizar o check-in no balcão ou pelo QR Code.</p>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  Voltar ao Início
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isMobileCheckin) {
    if (!user) {
      return (
        <LoginScreen 
          title="Check-in Mobile" 
          isFirebaseEnabled={isFirebaseEnabled}
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          handleLogin={handleLogin}
          handleRegister={handleRegister}
          handleForgotPassword={handleForgotPassword}
          isLoggingIn={isLoggingIn}
          isProcessingRegister={isProcessingRegister}
          isRegistering={isRegistering}
          setIsRegistering={setIsRegistering}
          setUser={setUser}
          addNotification={addNotification}
        />
      );
    }

    const filteredGuardians = guardians.filter(g => g.phone.includes(mobilePhone));
    const guardian = filteredGuardians.length === 1 ? filteredGuardians[0] : null;

    return (
      <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center font-sans relative">
        <button 
          onClick={handleLogout}
          className="absolute top-4 right-4 p-2 bg-white rounded-xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <LogOut className="w-5 h-5 text-slate-400" />
        </button>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl shadow-indigo-100 overflow-hidden border border-slate-100 p-8 space-y-8"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Baby className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{churchName}</h1>
              <p className="text-sm text-slate-500 font-medium">Check-in Kids Ministry</p>
            </div>
          </div>

          {mobileStep === "phone" && (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <p className="text-sm text-slate-600">Digite seu telefone para começar</p>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-lg font-bold"
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                />
              </div>
              <button
                onClick={() => {
                  if (guardian) {
                    setSelectedGuardian(guardian);
                    setMobileStep("selection");
                  } else {
                    setMobileStep("registration-guardian");
                  }
                }}
                disabled={!mobilePhone}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                {guardian ? "Continuar" : "Não encontrei meu cadastro. Cadastrar agora!"}
              </button>
            </div>
          )}

          {mobileStep === "registration-guardian" && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const guardianId = await handleAddGuardian({
                name: formData.get('name') as string,
                phone: formData.get('phone') as string,
                email: formData.get('email') as string,
              });
              if (guardianId) {
                const newGuardian = guardians.find(g => g.id === guardianId) || {
                  id: guardianId,
                  name: formData.get('name') as string,
                  phone: formData.get('phone') as string,
                  email: formData.get('email') as string,
                  created_at: new Date().toISOString()
                };
                setSelectedGuardian(newGuardian);
                setMobileStep("registration-children");
              }
            }} className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-800">Novo Cadastro</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Passo 1: Responsável</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                  <input name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Telefone (WhatsApp)</label>
                  <input name="phone" required type="tel" defaultValue={mobilePhone} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">E-mail (Opcional)</label>
                  <input name="email" type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => setMobileStep("phone")}
                  className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {submitting ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Próximo Passo"}
                </button>
              </div>
            </form>
          )}

          {mobileStep === "registration-children" && selectedGuardian && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setMobileStep("registration-guardian")}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="text-center flex-1 pr-8">
                  <h2 className="text-xl font-bold text-slate-800">Novo Cadastro</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Passo 2: Crianças</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {children.filter(c => c.guardianId === selectedGuardian.id).map(child => (
                  <div key={child.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{child.name}</p>
                      <p className="text-[10px] text-slate-400">{new Date(child.birthDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await handleAddChild({
                  name: formData.get('name') as string,
                  birthDate: formData.get('birthDate') as string,
                  guardianId: selectedGuardian.id,
                  allergies: formData.get('allergies') as string,
                  notes: formData.get('notes') as string,
                });
                e.currentTarget.reset();
              }} className="space-y-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adicionar Criança</p>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome da Criança</label>
                  <input name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Data de Nascimento</label>
                  <input name="birthDate" required type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Alergias / Observações</label>
                  <input name="allergies" placeholder="Ex: Alergia a amendoim" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" />
                </div>
                <button type="submit" disabled={submitting} className="w-full py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-bold uppercase tracking-widest hover:bg-indigo-50 transition-all disabled:opacity-50">
                  {submitting ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Adicionar Criança"}
                </button>
              </form>

              <button 
                onClick={() => setMobileStep("selection")}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all"
              >
                Finalizar e Ir para Check-in
              </button>
            </div>
          )}

          {mobileStep === "selection" && selectedGuardian && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                  {selectedGuardian.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{selectedGuardian.name}</p>
                  <p className="text-xs text-indigo-600 font-medium">{selectedGuardian.phone}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Selecione a Sala:</p>
                <div className="grid grid-cols-2 gap-2">
                  {rooms.map(room => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`px-3 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${
                        selectedRoomId === room.id
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                          : "bg-white text-slate-500 border-slate-200"
                      }`}
                    >
                      {room.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Selecione as crianças:</p>
                <div className="space-y-2">
                  {children
                    .filter(c => c.guardianId === selectedGuardian.id)
                    .map(child => (
                      <button
                        key={child.id}
                        onClick={() => {
                          if (selectedChildren.includes(child.id)) {
                            setSelectedChildren(selectedChildren.filter(id => id !== child.id));
                          } else {
                            setSelectedChildren([...selectedChildren, child.id]);
                          }
                        }}
                        className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center gap-3 ${
                          selectedChildren.includes(child.id)
                            ? "bg-white border-indigo-600 shadow-md ring-2 ring-indigo-600/10"
                            : "bg-white/50 border-slate-200"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          selectedChildren.includes(child.id) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                        }`}>
                          <Baby className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${selectedChildren.includes(child.id) ? "text-indigo-600" : "text-slate-700"}`}>
                            {child.name}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <button
                onClick={async () => {
                  await handleCheckIn();
                  setMobileStep("success");
                }}
                disabled={selectedChildren.length === 0 || !selectedRoomId || submitting}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Confirmar Check-in"}
              </button>
            </div>
          )}

          {mobileStep === "success" && (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Check-in Realizado!</h2>
                <p className="text-sm text-slate-500">As etiquetas estão sendo impressas na recepção.</p>
                {rooms.find(r => r.id === selectedRoomId) && (
                  <div className="mt-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Sala Designada:</p>
                    <p className="text-lg font-bold text-slate-900">{rooms.find(r => r.id === selectedRoomId)?.name}</p>
                    {rooms.find(r => r.id === selectedRoomId)?.teacher && (
                      <p className="text-sm text-slate-600 mt-1">Professor(a): {rooms.find(r => r.id === selectedRoomId)?.teacher}</p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setMobileStep("phone");
                  setMobilePhone("");
                  setSelectedGuardian(null);
                  setSelectedChildren([]);
                  setSelectedRoomId("");
                }}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                Fazer outro Check-in
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen 
        title={churchName} 
        isFirebaseEnabled={isFirebaseEnabled}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
        handleForgotPassword={handleForgotPassword}
        isLoggingIn={isLoggingIn}
        isProcessingRegister={isProcessingRegister}
        isRegistering={isRegistering}
        setIsRegistering={setIsRegistering}
        setUser={setUser}
        addNotification={addNotification}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar / Navigation Rail */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8 print:p-0 print:m-0 print:max-w-none">
        {/* Print Header */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-6 mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{churchName}</h1>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mt-1">Relatório de Movimentação Financeira</p>
          <div className="flex justify-between mt-4 text-xs font-medium text-slate-600">
            <p>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
            <p>Período: {dateRange.start ? new Date(dateRange.start).toLocaleDateString('pt-BR') : 'Início'} até {dateRange.end ? new Date(dateRange.end).toLocaleDateString('pt-BR') : 'Hoje'}</p>
          </div>
        </div>

        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Wallet className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                {churchName} <span className="text-indigo-600">Digital</span>
              </h1>
              {firebaseStatus === "error" && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[9px] font-bold uppercase tracking-wider animate-pulse">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Nuvem Offline
                </div>
              )}
              {firebaseStatus === "online" && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Conectado
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-10 md:ml-13">
              <p className="text-xs md:text-sm text-slate-500 font-medium">Gestão da Igreja</p>
              <div className="w-1 h-1 bg-slate-300 rounded-full" />
              <p className="text-xs md:text-sm text-slate-400 font-medium">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(userRole === "master" || userRole === "junior") && (
              <button
                onClick={() => setShowValues(!showValues)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
              >
                {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="text-[10px] font-bold uppercase tracking-widest">{showValues ? "Ocultar" : "Mostrar"}</span>
              </button>
            )}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-500">
              <Clock className="w-4 h-4" />
              <span className="text-[10px] font-bold tabular-nums">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </header>

        {/* Summary Stats - Bento Grid Style */}
        {(userRole === "master" || userRole === "junior") ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 print:grid-cols-3 print:gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2 bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-indigo-100 flex flex-col justify-between relative overflow-hidden group print:shadow-none print:border print:border-slate-200 print:bg-white print:text-slate-900 print:rounded-xl"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-indigo-500/20 transition-colors print:hidden" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8 print:mb-4">
                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md print:bg-slate-100 print:text-slate-900">
                    <Wallet className="w-6 h-6 text-indigo-300 print:text-slate-600" />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/20 print:border-slate-200 print:text-slate-600">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">+{stats.growth.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-slate-500">Patrimônio Total Acumulado</p>
                  <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight tabular-nums print:text-slate-900 print:text-3xl">
                    <span className="text-indigo-400 text-xl md:text-2xl mr-2 print:text-slate-400">R$</span>
                    {showValues ? stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "••••"}
                  </h2>
                </div>
              </div>
              <div className="relative z-10 mt-8 flex items-center gap-4 print:hidden">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                      <img src={`https://picsum.photos/seed/user${i}/32/32`} alt="user" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Monitorado por {stats.uniqueTreasurers.length} tesoureiros</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:border-indigo-200 transition-colors print:rounded-xl print:shadow-none"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform print:bg-slate-50 print:text-slate-600">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dízimos</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 tabular-nums print:text-xl">
                  {formatCurrency(stats.dizimos)}
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden print:hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full" 
                    style={{ width: `${(stats.dizimos / (stats.total || 1)) * 100}%` }} 
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:border-amber-200 transition-colors print:rounded-xl print:shadow-none"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform print:bg-slate-50 print:text-slate-600">
                  <ArrowDownRight className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ofertas</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 tabular-nums print:text-xl">
                  {formatCurrency(stats.ofertas)}
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden print:hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full" 
                    style={{ width: `${(stats.ofertas / (stats.total || 1)) * 100}%` }} 
                  />
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Acesso Restrito</h2>
                <p className="text-sm text-slate-500">Saldos e gráficos estão disponíveis apenas para usuários Master.</p>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button 
                onClick={() => setActiveTab("form")}
                className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100"
              >
                Novo Registro
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 pb-24 md:pb-0 print:space-y-8"
            >
              {userRole === "master" || userRole === "junior" ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-1">
                    {/* Trend Chart */}
                    <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60 print:shadow-none print:border-slate-200 print:rounded-xl">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-indigo-600" />
                          <h3 className="font-bold text-slate-900">Tendência de Arrecadação</h3>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg">
                          <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Diário</span>
                        </div>
                      </div>
                      <div className="h-[300px] w-full print:h-[200px] relative min-h-[300px] min-w-0">
                        {stats.chartData.length > 0 && isDashboardReady ? (
                          <ResponsiveContainer key={`trend-${isDashboardReady}`} width="100%" height={300}>
                            <AreaChart data={stats.chartData}>
                              <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} 
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                                tickFormatter={(value) => `R$ ${value}`}
                              />
                              <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Total']}
                              />
                              <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-bold uppercase tracking-widest">
                            Sem dados para exibir
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats - Attendance */}
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                            <Users className="w-5 h-5" />
                          </div>
                          <h3 className="text-sm font-bold text-slate-900">Pessoas Hoje</h3>
                        </div>
                        <div className="flex items-end justify-between">
                          <p className="text-3xl font-bold text-slate-900 tabular-nums">
                            {stats.totalAttendanceToday}
                          </p>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Média Semanal</p>
                            <p className="text-xs font-bold text-slate-600">
                              {Math.round(stats.attendanceChartData.reduce((acc: number, curr: any) => acc + curr.total, 0) / (stats.attendanceChartData.length || 1))}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Attendance Chart */}
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Frequência</h3>
                        </div>
                        <div className="h-[140px] w-full min-h-[140px] min-w-0">
                          {stats.attendanceChartData.length > 0 && isDashboardReady ? (
                            <ResponsiveContainer key={`attendance-${isDashboardReady}`} width="100%" height={140}>
                              <BarChart data={stats.attendanceChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 8, fontWeight: 600, fill: '#94a3b8' }} 
                                />
                                <Tooltip 
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                                />
                                <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-widest">
                              Sem dados
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
                    {/* Distribution Chart */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60 print:shadow-none print:border-slate-200 print:rounded-xl">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <PieChartIcon className="w-5 h-5 text-indigo-600" />
                          <h3 className="font-bold text-slate-900">Distribuição por Categoria</h3>
                        </div>
                      </div>
                      <div className="h-[300px] w-full flex flex-col md:flex-row items-center print:h-[200px] relative min-h-[300px] min-w-0">
                        <div className="w-full h-full flex-1 min-w-0 min-h-[300px]">
                          {isDashboardReady ? (
                            <ResponsiveContainer key={`dist-${isDashboardReady}`} width="100%" height={300}>
                              <PieChart>
                                <Pie
                                  data={stats.pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {stats.pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                  formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-row md:flex-col gap-4 mt-4 md:mt-0 md:ml-4 flex-shrink-0">
                          {stats.pieData.map((item) => (
                            <div key={item.name} className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
                      <motion.button 
                        onClick={() => setActiveTab("form")}
                        whileTap={{ scale: 0.95 }}
                        className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:border-emerald-200 transition-all group text-center"
                      >
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform">
                          <PlusCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Novo Registro</p>
                      </motion.button>
                      <motion.button 
                        onClick={() => setActiveTab("attendance")}
                        whileTap={{ scale: 0.95 }}
                        className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:border-amber-200 transition-all group text-center"
                      >
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform">
                          <Users className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Pessoas</p>
                      </motion.button>
                    </div>
                  </div>

                  {/* Recent Activity Mini List */}
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60 print:shadow-none print:border-slate-200 print:rounded-xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-900">Atividade Recente</h3>
                        {wsConnected ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-bold uppercase tracking-widest">
                            <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                            Live
                          </span>
                        ) : (
                          <button 
                            onClick={() => fetchEntries()}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[8px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                          >
                            <RefreshCw className={`w-2 h-2 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                          </button>
                        )}
                      </div>
                      <button 
                        onClick={() => setActiveTab("history")}
                        className="text-xs font-bold text-indigo-600 uppercase tracking-widest hover:underline print:hidden"
                      >
                        Ver Tudo
                      </button>
                    </div>
                    <div className="space-y-4">
                      {entries.length === 0 ? (
                        <div className="py-12 text-center opacity-30">
                          <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma atividade</p>
                        </div>
                      ) : (
                        filteredEntries.slice(0, 5).map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200 print:rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                entry.is_reversed 
                                  ? "bg-slate-100 text-slate-400"
                                  : entry.type === "Dízimo" ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"
                              }`}>
                                {entry.type === "Dízimo" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                              </div>
                              <div className={entry.is_reversed ? 'opacity-50' : ''}>
                                <p className={`text-sm font-bold text-slate-800 ${entry.is_reversed ? 'line-through' : ''}`}>
                                  {entry.treasurer}
                                  {entry.is_reversed === 1 && <span className="ml-2 text-[8px] text-rose-500 font-bold uppercase">Estornado</span>}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {(() => {
                                    const [y, m, d] = entry.date.split("-");
                                    return `${d}/${m}/${y}`;
                                  })()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-bold tabular-nums ${entry.is_reversed ? 'text-slate-300 line-through' : 'text-slate-900'}`}>
                                {formatCurrency(entry.amount)}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{entry.type}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recent Attendance Mini List */}
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60 print:shadow-none print:border-slate-200 print:rounded-xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-900">Contagem Recente</h3>
                        {!wsConnected && (
                          <button 
                            onClick={() => fetchEntries()}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[8px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                          >
                            <RefreshCw className={`w-2 h-2 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                          </button>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          setActiveTab("history");
                          setHistoryTab("attendance");
                        }}
                        className="text-xs font-bold text-indigo-600 uppercase tracking-widest hover:underline print:hidden"
                      >
                        Ver Tudo
                      </button>
                    </div>
                    <div className="space-y-4">
                      {filteredAttendanceEntries.length === 0 ? (
                        <div className="py-12 text-center opacity-30">
                          <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma contagem</p>
                        </div>
                      ) : (
                        filteredAttendanceEntries.slice(0, 3).map((att) => {
                          const rawCounts = att.counts || {};
                          let countsObj: Record<string, any> = {};
                          try {
                            countsObj = typeof rawCounts === 'string' ? JSON.parse(rawCounts) : rawCounts;
                          } catch (e) {
                            console.error("Error parsing counts:", e);
                          }
                          
                          const total = Object.values(countsObj).reduce((acc: number, curr: any) => {
                            const c = curr as { men: number; women: number; children: number };
                            return acc + (c.men || 0) + (c.women || 0) + (c.children || 0);
                          }, 0);
                          return (
                            <div key={att.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200 print:rounded-lg">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                                  <Users className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">
                                    {att.period}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {(() => {
                                      const [y, m, d] = att.date.split("-");
                                      return `${d}/${m}/${y}`;
                                    })()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-slate-900 tabular-nums">
                                  {total}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pessoas</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24 md:pb-0">
                  <motion.button 
                    onClick={() => setActiveTab("form")}
                    whileTap={{ scale: 0.95 }}
                    className="p-8 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm hover:border-emerald-200 transition-all group text-left"
                  >
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <PlusCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Novo Registro</h3>
                    <p className="text-sm text-slate-500 leading-relaxed text-balance">Lance dízimos e ofertas diretamente no sistema para gerar comprovantes.</p>
                  </motion.button>
                  <motion.button 
                    onClick={() => setActiveTab("attendance")}
                    whileTap={{ scale: 0.95 }}
                    className="p-8 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm hover:border-amber-200 transition-all group text-left"
                  >
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Users className="w-8 h-8 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Contagem de Pessoas</h3>
                    <p className="text-sm text-slate-500 leading-relaxed text-balance">Registre a frequência de homens, mulheres e crianças nos cultos.</p>
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "calculator" && (
            <motion.div
              key="calculator-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-4xl mx-auto w-full"
            >
              <section className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200/60">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setActiveTab("dashboard")}
                      className="p-2 -ml-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg md:text-xl font-bold text-slate-900">Contagem de Caixa</h2>
                      </div>
                      <p className="text-xs md:text-sm text-slate-400 font-medium">Contabilize notas e moedas fisicamente</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setCounts({})}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    title="Limpar Calculadora"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-4 md:gap-y-5">
                  {DENOMINATIONS.map((den) => (
                    <div key={den.value} className="space-y-1.5 md:space-y-2 group">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {den.label}
                        </label>
                        {den.type === "note" ? <DollarSign className="w-3 h-3 text-slate-300" /> : <Coins className="w-3 h-3 text-slate-300" />}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const current = (counts[den.value] || "").toString();
                            if (!current || current === "0") {
                              setCounts({ ...counts, [den.value]: "-" });
                            } else if (!current.endsWith('+') && !current.endsWith('-')) {
                              setCounts({ ...counts, [den.value]: current + "-" });
                            }
                          }}
                          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all active:scale-90"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-semibold text-slate-700 group-hover:bg-white text-center"
                          value={counts[den.value] || ""}
                          onFocus={(e) => {
                            const val = e.target.value;
                            if (val && val !== "0") {
                              if (!val.endsWith('+') && !val.endsWith('-')) {
                                const newVal = val + "+";
                                setCounts(prev => ({ ...prev, [den.value]: newVal }));
                                // Move cursor to end
                                setTimeout(() => {
                                  e.target.setSelectionRange(newVal.length, newVal.length);
                                }, 0);
                              } else {
                                setTimeout(() => {
                                  e.target.setSelectionRange(val.length, val.length);
                                }, 0);
                              }
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^[0-9+\-]*$/.test(val)) {
                              setCounts({ ...counts, [den.value]: val });
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val.includes('+') || val.includes('-')) {
                              const evaluated = evaluateMath(val);
                              setCounts({ ...counts, [den.value]: evaluated === 0 ? "" : evaluated.toString() });
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const current = (counts[den.value] || "").toString();
                            if (!current || current === "0") {
                              setCounts({ ...counts, [den.value]: "+" });
                            } else if (!current.endsWith('+') && !current.endsWith('-')) {
                              setCounts({ ...counts, [den.value]: current + "+" });
                            }
                          }}
                          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-emerald-500 hover:border-emerald-200 transition-all active:scale-90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 md:mt-10 p-6 md:p-8 bg-slate-900 rounded-[1.25rem] md:rounded-[1.5rem] shadow-xl shadow-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6">
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Total em Espécie</p>
                    <p className="text-3xl md:text-4xl font-bold text-white tabular-nums">
                      <span className="text-indigo-400 text-xl md:text-2xl mr-1">R$</span>
                      {calculatorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <button
                    onClick={useCalculatorTotal}
                    className="w-full sm:w-auto px-6 md:px-8 py-3.5 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-5 h-5" />
                    Aplicar ao Lançamento
                  </button>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === "form" && (
            <motion.div
              key="form-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-2xl mx-auto w-full"
            >
              <section className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200/60">
                <div className="flex items-center gap-4 mb-6 md:mb-8">
                  <button 
                    onClick={() => setActiveTab("dashboard")}
                    className="p-2 -ml-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg md:text-xl font-bold text-slate-900">Efetuar Registro</h2>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                      Responsável (Tesoureiro)
                    </label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input
                        required
                        type="text"
                        list="treasurers"
                        placeholder="Nome completo"
                        className="w-full pl-11 pr-4 py-3 md:py-3.5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                        value={formData.treasurer}
                        onChange={(e) => setFormData({ ...formData, treasurer: e.target.value })}
                      />
                      <datalist id="treasurers">
                        {stats.uniqueTreasurers.filter(Boolean).map(t => <option key={t} value={t} />)}
                      </datalist>
                    </div>
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                      Data do Evento
                    </label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input
                        required
                        type="date"
                        className="w-full pl-11 pr-4 py-3 md:py-3.5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                      Período do Evento
                    </label>
                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                      {(["Manhã", "Tarde", "Noite"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFormData({ ...formData, period: p })}
                          className={`py-2.5 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all border-2 ${
                            formData.period === p 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" 
                              : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                      Observações
                    </label>
                    <textarea
                      placeholder="Adicione detalhes adicionais aqui..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium min-h-[80px] resize-none"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                      Categoria
                    </label>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: "Dízimo" })}
                        className={`py-3 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                          formData.type === "Dízimo" 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" 
                            : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <TrendingUp className="w-4 h-4" />
                        Dízimo
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: "Oferta" })}
                        className={`py-3 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                          formData.type === "Oferta" 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" 
                            : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <TrendingDown className="w-4 h-4" />
                        Oferta
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Valor Consolidado
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveTab("calculator")}
                        className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        Usar Calculadora de Espécie
                      </button>
                    </div>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-indigo-500">R$</div>
                      <input
                        required
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0,00"
                        className="w-full pl-11 pr-4 py-3.5 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-lg md:text-xl font-bold text-slate-900"
                        value={formData.amount}
                        onFocus={(e) => {
                          e.target.select();
                          setTimeout(() => e.target.select(), 50);
                        }}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                  </div>

                  <button
                    disabled={submitting}
                    type="submit"
                    className="w-full py-4 md:py-4.5 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-bold text-xs md:text-sm uppercase tracking-widest hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4 shadow-xl shadow-indigo-100"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : success ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                        Sucesso!
                      </>
                    ) : (
                      "Salvar Lançamento"
                    )}
                  </button>
                </form>
              </section>
            </motion.div>
          )}

          {activeTab === "history" && (userRole === "master" || userRole === "junior") && (
            <motion.div
              key="history-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* History Type Toggle */}
              <div className="flex p-1 bg-slate-100 rounded-2xl w-fit mx-auto md:mx-0">
                <button
                  onClick={() => setHistoryTab("finance")}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                    historyTab === "finance" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Financeiro
                </button>
                <button
                  onClick={() => setHistoryTab("attendance")}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                    historyTab === "attendance" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Pessoas
                </button>
              </div>

              {historyTab === "finance" ? (
                <section className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden">
                {/* History Header & Filters */}
                <div className="p-5 md:p-8 border-b border-slate-100 space-y-4 md:space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <History className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
                      <h2 className="text-lg md:text-xl font-bold text-slate-900">Histórico de Lançamentos</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {userRole === "master" && (
                        <>
                          <button 
                            onClick={printReport}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all print:hidden" 
                            title="Imprimir Relatório"
                          >
                            <BarChart3 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={exportCSV}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all print:hidden" 
                            title="Exportar CSV"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={exportPDF}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all print:hidden" 
                            title="Exportar PDF"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
                    <div className="relative md:col-span-2">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por tesoureiro, data ou notas..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 print:hidden">
                    <div className="flex flex-wrap gap-2">
                      {(["Todos", "Dízimo", "Oferta"] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                              filterType === type 
                                ? "bg-indigo-600 text-white shadow-sm" 
                                : "bg-slate-50 text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                    </div>
                    <div className="w-px h-6 bg-slate-200 hidden md:block" />
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "all", label: "Tudo" },
                        { id: "currentMonth", label: "Mês Atual" },
                        { id: "prevMonth", label: "Mês Anterior" },
                        { id: "currentYear", label: "Ano Atual" }
                      ].map((period) => (
                        <button
                          key={period.id}
                          onClick={() => setPeriodFilter(period.id as any)}
                          className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                            periodFilter === period.id 
                              ? "bg-slate-800 text-white shadow-sm" 
                              : "bg-slate-50 text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>
                    {(filterType !== "Todos" || periodFilter !== "all" || dateRange.start || dateRange.end || searchTerm) && (
                      <button
                        onClick={() => {
                          setFilterType("Todos");
                          setPeriodFilter("all");
                          setDateRange({ start: "", end: "" });
                          setSearchTerm("");
                        }}
                        className="px-3 py-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-widest hover:bg-rose-50 rounded-lg transition-all flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Limpar
                      </button>
                    )}
                  </div>

                    {filteredEntries.length > 0 && (
                      <div className="flex items-center gap-4 px-4 py-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Total Filtrado</p>
                          <p className="text-lg font-bold text-indigo-900 tabular-nums">
                            {formatCurrency(filteredEntries.reduce((acc, curr) => acc + (curr.is_reversed ? 0 : curr.amount), 0))}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-indigo-200/50" />
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Lançamentos</p>
                          <p className="text-lg font-bold text-indigo-900 tabular-nums">{filteredEntries.length}</p>
                        </div>
                      </div>
                    )}
                  </div>

                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="py-24 text-center">
                      <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                    </div>
                  ) : filteredEntries.length === 0 ? (
                    <div className="py-24 text-center opacity-30">
                      <Search className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Nenhum registro encontrado</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Período</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tesoureiro</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Valor</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center print:hidden">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredEntries.slice(0, historyLimit).map((entry) => (
                          <tr 
                            key={entry.id} 
                            className={`group hover:bg-slate-50/50 transition-colors ${entry.is_reversed ? 'bg-rose-50/10' : ''}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm font-bold text-slate-900">
                                {(() => {
                                  const [y, m, d] = entry.date.split("-");
                                  return `${d}/${m}/${y}`;
                                })()}
                              </p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {entry.period || "Manhã"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                  <User className="w-4 h-4" />
                                </div>
                                <div className={entry.is_reversed ? 'opacity-50' : ''}>
                                  <p className={`text-sm font-bold text-slate-800 ${entry.is_reversed ? 'line-through' : ''}`}>
                                    {entry.treasurer}
                                  </p>
                                  {entry.notes && <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{entry.notes}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                                entry.type === "Dízimo" ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                              }`}>
                                {entry.type}
                              </span>
                              {entry.is_reversed === 1 && (
                                <span className="ml-2 px-2 py-1 bg-rose-50 text-rose-600 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                  Estornado
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <p className={`text-sm font-bold tabular-nums ${entry.is_reversed ? 'text-slate-300 line-through' : 'text-slate-900'}`}>
                                {formatCurrency(entry.amount)}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-center print:hidden">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => setSelectedEntry(entry)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Ver Detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => sendWhatsApp(entry)}
                                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  title="Enviar Comprovante"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                                {userRole === "master" && !entry.is_reversed && (
                                  <button 
                                    onClick={() => reverseEntry(entry.id)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                    title="Estornar"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {filteredEntries.length > historyLimit && (
                    <div className="p-8 text-center border-t border-slate-100">
                      <button 
                        onClick={() => setHistoryLimit(prev => prev + 20)}
                        className="px-8 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all"
                      >
                        Carregar Mais
                      </button>
                    </div>
                  )}
                </div>
              </section>
            ) : (
                <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      <h2 className="text-lg md:text-xl font-bold text-slate-900">Histórico de Contagem</h2>
                    </div>
                  </div>

                  <div className="space-y-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
                      <div className="relative md:col-span-2">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar por responsável, data ou notas..."
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                          value={dateRange.start}
                          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        />
                      </div>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                          value={dateRange.end}
                          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 print:hidden">
                      <div className="flex flex-wrap gap-2">
                        {(["Todos", "Manhã", "Tarde", "Noite"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setAttendancePeriodFilter(p)}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                              attendancePeriodFilter === p 
                                ? "bg-indigo-600 text-white shadow-sm" 
                                : "bg-slate-50 text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <div className="w-px h-6 bg-slate-200 hidden md:block" />
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "all", label: "Tudo" },
                          { id: "currentMonth", label: "Mês Atual" },
                          { id: "prevMonth", label: "Mês Anterior" },
                          { id: "currentYear", label: "Ano Atual" }
                        ].map((period) => (
                          <button
                            key={period.id}
                            onClick={() => setPeriodFilter(period.id as any)}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                              periodFilter === period.id 
                                ? "bg-slate-800 text-white shadow-sm" 
                                : "bg-slate-50 text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {period.label}
                          </button>
                        ))}
                      </div>
                      {(attendancePeriodFilter !== "Todos" || periodFilter !== "all" || dateRange.start || dateRange.end || searchTerm) && (
                        <button
                          onClick={() => {
                            setAttendancePeriodFilter("Todos");
                            setPeriodFilter("all");
                            setDateRange({ start: "", end: "" });
                            setSearchTerm("");
                          }}
                          className="px-3 py-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-widest hover:bg-rose-50 rounded-lg transition-all flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Limpar
                        </button>
                      )}
                    </div>

                    {filteredAttendanceEntries.length > 0 && (
                      <div className="flex items-center gap-4 px-4 py-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Total de Pessoas</p>
                          <p className="text-lg font-bold text-indigo-900 tabular-nums">
                            {filteredAttendanceEntries.reduce((acc, curr) => {
                              const counts = typeof curr.counts === 'string' ? JSON.parse(curr.counts) : curr.counts;
                              const entryTotal = Object.values(counts).reduce<number>((sum, c: any) => {
                                const count = c as { men?: number; women?: number; children?: number };
                                return sum + (count.men || 0) + (count.women || 0) + (count.children || 0);
                              }, 0);
                              return acc + entryTotal;
                            }, 0)}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-indigo-200/50" />
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Contagens</p>
                          <p className="text-lg font-bold text-indigo-900 tabular-nums">{filteredAttendanceEntries.length}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto -mx-6 md:-mx-8">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data/Período</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalhes por Local</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredAttendanceEntries.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-12 text-center opacity-30">
                              <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                              <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Nenhuma contagem encontrada</p>
                            </td>
                          </tr>
                        ) : (
                          (() => {
                            const grouped: Record<string, Attendance[]> = {};
                            filteredAttendanceEntries.forEach(att => {
                              const key = `${att.date}_${att.period}`;
                              if (!grouped[key]) grouped[key] = [];
                              grouped[key].push(att);
                            });

                            // Sort keys by date descending, then period (Noite > Tarde > Manhã)
                            const sortedKeys = Object.keys(grouped).sort((a, b) => {
                              const [dateA, periodA] = a.split("_");
                              const [dateB, periodB] = b.split("_");
                              if (dateA !== dateB) return dateB.localeCompare(dateA);
                              
                              const periodOrder: Record<string, number> = { "Noite": 3, "Tarde": 2, "Manhã": 1 };
                              return (periodOrder[periodB] || 0) - (periodOrder[periodA] || 0);
                            });

                            return sortedKeys.map((key) => {
                              const entries = grouped[key];
                              const [date, period] = key.split("_");
                              const groupTotals: Record<string, { men: number; women: number; children: number }> = {};
                              entries.forEach(entry => {
                                const rawCounts = entry.counts || {};
                                let countsObj: Record<string, any> = {};
                                try {
                                  countsObj = typeof rawCounts === 'string' ? JSON.parse(rawCounts) : rawCounts;
                                } catch (e) {
                                  console.error("Error parsing counts:", e);
                                }
                                
                                Object.entries(countsObj).forEach(([locName, counts]) => {
                                  if (!groupTotals[locName]) groupTotals[locName] = { men: 0, women: 0, children: 0 };
                                  const c = counts as { men: number; women: number; children: number };
                                  groupTotals[locName].men += c.men || 0;
                                  groupTotals[locName].women += c.women || 0;
                                  groupTotals[locName].children += c.children || 0;
                                });
                              });

                              const grandTotal = Object.values(groupTotals).reduce((acc, curr) => acc + curr.men + curr.women + curr.children, 0);

                              return (
                                <tr key={key} className="group hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-6 align-top">
                                    <p className="text-sm font-bold text-slate-900">
                                      {(() => {
                                        const [y, m, d] = date.split("-");
                                        return `${d}/${m}/${y}`;
                                      })()}
                                    </p>
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">{period}</p>
                                  </td>
                                  <td className="px-6 py-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      {Object.entries(groupTotals).map(([locName, totals]) => (
                                        <div key={locName} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">{locName}</p>
                                          <div className="flex gap-4">
                                            <div className="text-center">
                                              <p className="text-[8px] font-bold text-slate-400 uppercase">H</p>
                                              <p className="text-xs font-bold text-slate-700">{totals.men}</p>
                                            </div>
                                            <div className="text-center">
                                              <p className="text-[8px] font-bold text-slate-400 uppercase">M</p>
                                              <p className="text-xs font-bold text-slate-700">{totals.women}</p>
                                            </div>
                                            <div className="text-center">
                                              <p className="text-[8px] font-bold text-slate-400 uppercase">C</p>
                                              <p className="text-xs font-bold text-slate-700">{totals.children}</p>
                                            </div>
                                            <div className="ml-auto text-right">
                                              <p className="text-[8px] font-bold text-indigo-400 uppercase">Total</p>
                                              <p className="text-xs font-bold text-indigo-600">{totals.men + totals.women + totals.children}</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-6 py-6 text-right align-top">
                                    <p className="text-xl font-bold text-slate-900 tabular-nums">{grandTotal}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pessoas</p>
                                  </td>
                                </tr>
                              );
                            });
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {activeTab === "attendance" && (
            <motion.div
              key="attendance-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-4xl mx-auto w-full space-y-6"
            >
              {/* Attendance Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200/60 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Hoje</p>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">
                    {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      const todayEntries = attendanceEntries.filter(a => a.date === today);
                      return todayEntries.reduce((acc, curr) => {
                        return acc + Object.values(curr.counts || {}).reduce((a, c) => {
                          const val = c as { men: number; women: number; children: number };
                          return a + val.men + val.women + val.children;
                        }, 0);
                      }, 0);
                    })()}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200/60 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Média por Culto</p>
                  <p className="text-2xl font-bold text-indigo-600 tabular-nums">
                    {attendanceEntries.length > 0 
                      ? Math.round(attendanceEntries.reduce((acc, curr) => {
                          return acc + Object.values(curr.counts || {}).reduce((a, c) => {
                            const val = c as { men: number; women: number; children: number };
                            return a + val.men + val.women + val.children;
                          }, 0);
                        }, 0) / attendanceEntries.length)
                      : 0}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200/60 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Registros</p>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{attendanceEntries.length}</p>
                </div>
              </div>

              <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60">
                <div className="flex items-center gap-2 mb-8">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg md:text-xl font-bold text-slate-900">Contagem de Pessoas</h2>
                </div>

                <form onSubmit={handleSubmitAttendance} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Data</label>
                      <input
                        type="date"
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                        value={attendanceForm.date}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Período</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["Manhã", "Tarde", "Noite"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setAttendanceForm({ ...attendanceForm, period: p })}
                            className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border-2 ${
                              attendanceForm.period === p 
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" 
                                : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Responsável pela Contagem</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Nome de quem realizou a contagem"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                        value={attendanceForm.responsible}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, responsible: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    {locations.length === 0 ? (
                      <div className="p-12 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">Nenhum local de contagem configurado.</p>
                        <p className="text-xs text-slate-400 mt-1">Adicione locais na aba de Ajustes.</p>
                      </div>
                    ) : (
                      locations.map((loc) => (
                        <div key={loc.id} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
                          <div className="flex items-center gap-2 text-slate-900 font-bold">
                            {loc.is_default ? (loc.name === "Salão Principal" ? <Home className="w-4 h-4" /> : <MapPin className="w-4 h-4" />) : <LayoutDashboard className="w-4 h-4" />}
                            <span className="text-sm uppercase tracking-wider">{loc.name}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              { id: "men", label: "Homens" },
                              { id: "women", label: "Mulheres" },
                              { id: "children", label: "Crianças" }
                            ].map((cat) => (
                              <div key={cat.id} className="space-y-2">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{cat.label}</label>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = (attendanceTempInputs[`${loc.name}_${cat.id}`] ?? (attendanceForm.counts[loc.name]?.[cat.id as "men" | "women" | "children"] || "0")).toString();
                                      if (!current || current === "0") {
                                        setAttendanceTempInputs(prev => ({ ...prev, [`${loc.name}_${cat.id}`]: "-" }));
                                      } else if (!current.endsWith('+') && !current.endsWith('-')) {
                                        setAttendanceTempInputs(prev => ({ ...prev, [`${loc.name}_${cat.id}`]: current + "-" }));
                                      }
                                    }}
                                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all active:scale-90"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700 text-center"
                                    value={attendanceTempInputs[`${loc.name}_${cat.id}`] ?? (attendanceForm.counts[loc.name]?.[cat.id as "men" | "women" | "children"] === 0 ? "" : attendanceForm.counts[loc.name]?.[cat.id as "men" | "women" | "children"] ?? "")}
                                    onFocus={(e) => {
                                      const val = e.target.value;
                                      if (val && val !== "0") {
                                        if (!val.endsWith('+') && !val.endsWith('-')) {
                                          const newVal = val + "+";
                                          setAttendanceTempInputs(prev => ({ ...prev, [`${loc.name}_${cat.id}`]: newVal }));
                                          setTimeout(() => {
                                            e.target.setSelectionRange(newVal.length, newVal.length);
                                          }, 0);
                                        } else {
                                          setTimeout(() => {
                                            e.target.setSelectionRange(val.length, val.length);
                                          }, 0);
                                        }
                                      }
                                    }}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      // Only allow digits, plus and minus signs
                                      if (/^[0-9+\-]*$/.test(val)) {
                                        setAttendanceTempInputs(prev => ({ ...prev, [`${loc.name}_${cat.id}`]: val }));
                                        
                                        // If it's just a number, update the main form too so totals update
                                        if (/^\d+$/.test(val)) {
                                          const num = parseInt(val) || 0;
                                          setAttendanceForm(prev => ({
                                            ...prev,
                                            counts: {
                                              ...prev.counts,
                                              [loc.name]: {
                                                ...(prev.counts[loc.name] || { men: 0, women: 0, children: 0 }),
                                                [cat.id]: num
                                              }
                                            }
                                          }));
                                        }
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const val = e.target.value;
                                      if (!val) return;
                                      
                                      // Evaluate expression (additions and subtractions)
                                      const evaluated = evaluateMath(val);
                                      
                                      setAttendanceForm(prev => ({
                                        ...prev,
                                        counts: {
                                          ...prev.counts,
                                          [loc.name]: {
                                            ...(prev.counts[loc.name] || { men: 0, women: 0, children: 0 }),
                                            [cat.id]: evaluated
                                          }
                                        }
                                      }));
                                      
                                      // Clear temp input so it shows the evaluated number
                                      setAttendanceTempInputs(prev => {
                                        const next = { ...prev };
                                        delete next[`${loc.name}_${cat.id}`];
                                        return next;
                                      });
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = (attendanceTempInputs[`${loc.name}_${cat.id}`] ?? (attendanceForm.counts[loc.name]?.[cat.id as "men" | "women" | "children"] || "0")).toString();
                                      if (!current || current === "0") {
                                        setAttendanceTempInputs(prev => ({ ...prev, [`${loc.name}_${cat.id}`]: "+" }));
                                      } else if (!current.endsWith('+') && !current.endsWith('-')) {
                                        setAttendanceTempInputs(prev => ({ ...prev, [`${loc.name}_${cat.id}`]: current + "+" }));
                                      }
                                    }}
                                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-emerald-500 hover:border-emerald-200 transition-all active:scale-90"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Observações</label>
                    <textarea
                      placeholder="Alguma observação sobre a contagem?"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium min-h-[80px] resize-none"
                      value={attendanceForm.notes}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Salvar Contagem
                      </>
                    )}
                  </button>
                </form>
              </section>

              {attendanceEntries.length > 0 && (
                <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-indigo-600" />
                      <h2 className="text-lg md:text-xl font-bold text-slate-900">Histórico de Contagem</h2>
                    </div>
                  </div>

                  <div className="space-y-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
                      <div className="relative md:col-span-2">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar por responsável, data ou notas..."
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                          value={dateRange.start}
                          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        />
                      </div>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                          value={dateRange.end}
                          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 print:hidden">
                      <div className="flex flex-wrap gap-2">
                        {(["Todos", "Manhã", "Tarde", "Noite"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setAttendancePeriodFilter(p)}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                              attendancePeriodFilter === p 
                                ? "bg-indigo-600 text-white shadow-sm" 
                                : "bg-slate-50 text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <div className="w-px h-6 bg-slate-200 hidden md:block" />
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "all", label: "Tudo" },
                          { id: "currentMonth", label: "Mês Atual" },
                          { id: "prevMonth", label: "Mês Anterior" },
                          { id: "currentYear", label: "Ano Atual" }
                        ].map((period) => (
                          <button
                            key={period.id}
                            onClick={() => setPeriodFilter(period.id as any)}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                              periodFilter === period.id 
                                ? "bg-slate-800 text-white shadow-sm" 
                                : "bg-slate-50 text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {period.label}
                          </button>
                        ))}
                      </div>
                      {(attendancePeriodFilter !== "Todos" || periodFilter !== "all" || dateRange.start || dateRange.end || searchTerm) && (
                        <button
                          onClick={() => {
                            setAttendancePeriodFilter("Todos");
                            setPeriodFilter("all");
                            setDateRange({ start: "", end: "" });
                            setSearchTerm("");
                          }}
                          className="px-3 py-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-widest hover:bg-rose-50 rounded-lg transition-all flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Limpar
                        </button>
                      )}
                    </div>

                    {filteredAttendanceEntries.length > 0 && (
                      <div className="flex items-center gap-4 px-4 py-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Total de Pessoas</p>
                          <p className="text-lg font-bold text-indigo-900 tabular-nums">
                            {filteredAttendanceEntries.reduce((acc, curr) => {
                              const counts = typeof curr.counts === 'string' ? JSON.parse(curr.counts) : curr.counts;
                              const entryTotal = Object.values(counts).reduce<number>((sum, c: any) => {
                                const count = c as { men?: number; women?: number; children?: number };
                                return sum + (count.men || 0) + (count.women || 0) + (count.children || 0);
                              }, 0);
                              return acc + entryTotal;
                            }, 0)}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-indigo-200/50" />
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Contagens</p>
                          <p className="text-lg font-bold text-indigo-900 tabular-nums">{filteredAttendanceEntries.length}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto -mx-6 md:-mx-8">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data/Período</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalhes por Local</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(() => {
                          // Group by date and period for totalizer
                          const grouped: Record<string, Attendance[]> = {};
                          filteredAttendanceEntries.forEach(att => {
                            const key = `${att.date}_${att.period}`;
                            if (!grouped[key]) grouped[key] = [];
                            grouped[key].push(att);
                          });

                          // Sort keys by date descending, then period
                          const sortedKeys = Object.keys(grouped).sort((a, b) => {
                            const [dateA, periodA] = a.split("_");
                            const [dateB, periodB] = b.split("_");
                            if (dateA !== dateB) return dateB.localeCompare(dateA);
                            
                            const periodOrder: Record<string, number> = { "Noite": 3, "Tarde": 2, "Manhã": 1 };
                            return (periodOrder[periodB] || 0) - (periodOrder[periodA] || 0);
                          });

                          return sortedKeys.map((key) => {
                            const entries = grouped[key];
                            const [date, period] = key.split("_");
                            
                            // Calculate totals for this group
                            const groupTotals: Record<string, { men: number; women: number; children: number }> = {};
                            entries.forEach(entry => {
                              const rawCounts = entry.counts || {};
                              const countsObj = typeof rawCounts === 'string' ? JSON.parse(rawCounts) : rawCounts;
                              
                              Object.entries(countsObj).forEach(([locName, counts]) => {
                                const c = counts as { men: number; women: number; children: number };
                                if (!groupTotals[locName]) groupTotals[locName] = { men: 0, women: 0, children: 0 };
                                groupTotals[locName].men += c.men || 0;
                                groupTotals[locName].women += c.women || 0;
                                groupTotals[locName].children += c.children || 0;
                              });
                            });

                            const grandTotal = Object.values(groupTotals).reduce((acc, curr) => acc + curr.men + curr.women + curr.children, 0);

                            return (
                              <React.Fragment key={key}>
                                {/* Totalizer Row */}
                                {entries.length > 1 && (
                                  <tr className="bg-indigo-50/30">
                                    <td className="px-6 py-4 align-top">
                                      <div className="flex items-center gap-2">
                                        <Calculator className="w-3 h-3 text-indigo-600" />
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Total do Período</span>
                                      </div>
                                      <p className="text-[10px] font-bold text-slate-400">
                                        {(() => {
                                          const [y, m, d] = date.split("-");
                                          return `${d}/${m}/${y}`;
                                        })()} - {period}
                                      </p>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="space-y-3">
                                        {Object.entries(groupTotals).map(([locName, counts]) => (
                                          <div key={locName} className="flex flex-col gap-0.5">
                                            <span className="text-xs font-black text-indigo-700">{locName}: {counts.men + counts.women + counts.children}</span>
                                            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-tighter">H:{counts.men} M:{counts.women} C:{counts.children}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-right align-top">
                                      <span className="text-sm font-black text-indigo-600 tabular-nums">{grandTotal}</span>
                                    </td>
                                  </tr>
                                )}

                                {/* Individual Entries */}
                                {entries.map((att) => {
                                  const rawCounts = att.counts || {};
                                  let countsObj: Record<string, any> = {};
                                  try {
                                    countsObj = typeof rawCounts === 'string' ? JSON.parse(rawCounts) : rawCounts;
                                  } catch (e) {
                                    console.error("Error parsing counts:", e);
                                  }
                                  
                                  const entryTotal = Object.values(countsObj).reduce((acc: number, curr: any) => {
                                    const c = curr as { men: number; women: number; children: number };
                                    return acc + (c.men || 0) + (c.women || 0) + (c.children || 0);
                                  }, 0);

                                  return (
                                    <tr key={att.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-6 py-4 align-top">
                                        <p className="text-sm font-bold text-slate-900">
                                          {(() => {
                                            const [y, m, d] = att.date.split("-");
                                            return `${d}/${m}/${y}`;
                                          })()}
                                        </p>
                                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{att.period}</p>
                                        {att.responsible && (
                                          <div className="flex items-center gap-1 mt-1">
                                            <User className="w-2.5 h-2.5 text-slate-400" />
                                            <span className="text-[9px] font-medium text-slate-500">{att.responsible}</span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-6 py-4">
                                        <div className="space-y-3">
                                          {Object.entries(countsObj).map(([locName, counts]) => {
                                            const c = counts as { men: number; women: number; children: number };
                                            return (
                                              <div key={locName} className="flex flex-col gap-0.5">
                                                <span className="text-xs font-bold text-slate-700">{locName}: {(c.men || 0) + (c.women || 0) + (c.children || 0)}</span>
                                                <span className="text-[9px] text-slate-400 uppercase tracking-tighter">H:{c.men || 0} M:{c.women || 0} C:{c.children || 0}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-right align-top">
                                        <span className="text-sm font-black text-indigo-600 tabular-nums">{entryTotal}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {activeTab === "kids" && (
            <motion.div
              key="kids-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Kids Sub-tabs */}
              <div className="flex bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200/60 overflow-x-auto no-scrollbar">
                {[
                  { id: 'checkin', label: 'Check-in', icon: QrCode },
                  { id: 'children', label: 'Crianças', icon: Baby },
                  { id: 'guardians', label: 'Responsáveis', icon: Users },
                  { id: 'classrooms', label: 'Salas', icon: Home },
                  { id: 'reports', label: 'Relatórios', icon: FileText },
                  { id: 'settings', label: 'Configurações', icon: Settings }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setKidsTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                      kidsTab === tab.id 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                        : "text-slate-500 hover:bg-white hover:text-indigo-600"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Kids Tab Content */}
              {kidsTab === 'checkin' && (
                <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Left: QR Scanner / Selection */}
                    <div className="flex-1 space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <QrCode className="w-5 h-5 text-indigo-600" />
                          Realizar Check-in
                        </h3>
                        <p className="text-sm text-slate-500">Selecione o responsável ou escaneie o QR Code do app.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar responsável por nome ou telefone..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                            value={kidsSearchTerm}
                            onChange={(e) => setKidsSearchTerm(e.target.value)}
                          />
                        </div>

                        {kidsSearchTerm && (
                          <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
                            {guardians
                              .filter(g => g.name.toLowerCase().includes(kidsSearchTerm.toLowerCase()) || g.phone.includes(kidsSearchTerm))
                              .map(g => (
                                <button
                                  key={g.id}
                                  onClick={() => {
                                    setSelectedGuardian(g);
                                    setKidsSearchTerm("");
                                    setSelectedChildren([]);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0 flex items-center gap-3"
                                >
                                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                                    {g.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900">{g.name}</p>
                                    <p className="text-[10px] text-slate-500">{g.phone}</p>
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>

                      {selectedGuardian && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-6"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200">
                                {selectedGuardian.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{selectedGuardian.name}</p>
                                <p className="text-xs text-indigo-600 font-medium">{selectedGuardian.phone}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setSelectedGuardian(null)}
                              className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecione a Sala:</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {rooms.map(room => (
                                <button
                                  key={room.id}
                                  onClick={() => setSelectedRoomId(room.id)}
                                  className={`px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                                    selectedRoomId === room.id
                                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                      : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
                                  }`}
                                >
                                  {room.name}
                                </button>
                              ))}
                              {rooms.length === 0 && (
                                <p className="col-span-full text-[10px] text-rose-500 font-bold italic">Nenhuma sala cadastrada. Cadastre na aba "Salas".</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecione as crianças:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {children
                                .filter(c => c.guardianId === selectedGuardian.id)
                                .map(child => (
                                  <button
                                    key={child.id}
                                    onClick={() => {
                                      if (selectedChildren.includes(child.id)) {
                                        setSelectedChildren(selectedChildren.filter(id => id !== child.id));
                                      } else {
                                        setSelectedChildren([...selectedChildren, child.id]);
                                      }
                                    }}
                                    className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3 ${
                                      selectedChildren.includes(child.id)
                                        ? "bg-white border-indigo-600 shadow-md ring-2 ring-indigo-600/10"
                                        : "bg-white/50 border-slate-200 hover:border-indigo-300"
                                    }`}
                                  >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                      selectedChildren.includes(child.id) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                                    }`}>
                                      <Baby className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className={`text-sm font-bold ${selectedChildren.includes(child.id) ? "text-indigo-600" : "text-slate-700"}`}>
                                        {child.name}
                                      </p>
                                      {child.allergies && (
                                        <p className="text-[9px] text-rose-500 font-bold uppercase tracking-tighter mt-0.5">⚠️ {child.allergies}</p>
                                      )}
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </div>

                          <button
                            onClick={handleCheckIn}
                            disabled={selectedChildren.length === 0 || !selectedRoomId || submitting}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                          >
                            {submitting ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <Printer className="w-5 h-5" />
                                {selectedRoomId ? "Confirmar Check-in e Imprimir" : "Selecione uma Sala"}
                              </>
                            )}
                          </button>
                        </motion.div>
                      )}
                    </div>

                    {/* Right: QR Code for App */}
                    <div className="w-full md:w-64 flex flex-col items-center justify-center p-8 bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                      <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                        <QRCodeCanvas 
                          value={`${window.location.origin}/#responsaveis?church=${encodeURIComponent(churchName)}`}
                          size={160}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">QR Code para Check-in via App</p>
                      <p className="text-[9px] text-slate-400 mt-2 text-center">Escaneie para fazer o check-in do seu celular</p>
                    </div>
                  </div>
                </section>
              )}

              {kidsTab === 'children' && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Gerenciar Crianças</h3>
                    <button
                      onClick={() => setShowAddChildModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Nova Criança
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {children.map(child => (
                      <div key={child.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
                        {userRole === "master" && (
                          <button
                            onClick={() => {
                              setEditingChild(child);
                              setShowEditChildModal(true);
                            }}
                            className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 rounded-xl opacity-0 group-hover:opacity-100 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Baby className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{child.name}</h4>
                            <p className="text-xs text-slate-500">Nasc: {new Date(child.birthDate).toLocaleDateString('pt-BR')}</p>
                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1">
                              Resp: {guardians.find(g => g.id === child.guardianId)?.name || 'N/A'}
                            </p>
                          </div>
                        </div>
                        {child.allergies && (
                          <div className="mt-4 p-3 bg-rose-50 rounded-xl border border-rose-100">
                            <p className="text-[10px] text-rose-600 font-bold uppercase tracking-widest flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Alergias
                            </p>
                            <p className="text-xs text-rose-700 mt-1">{child.allergies}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {kidsTab === 'guardians' && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Gerenciar Responsáveis</h3>
                    <button
                      onClick={() => setShowAddGuardianModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Novo Responsável
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {guardians.map(guardian => (
                      <div key={guardian.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative group">
                        {userRole === "master" && (
                          <button
                            onClick={() => {
                              setEditingGuardian(guardian);
                              setShowEditGuardianModal(true);
                            }}
                            className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 rounded-xl opacity-0 group-hover:opacity-100 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                            <User className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{guardian.name}</h4>
                            <p className="text-xs text-slate-500">{guardian.phone}</p>
                            {guardian.isTeacher && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded-full uppercase tracking-widest">Professor(a)</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {children.filter(c => c.guardianId === guardian.id).length} Criança(s)
                          </span>
                          <button className="text-indigo-600 hover:text-indigo-700 text-xs font-bold uppercase tracking-widest">Ver Detalhes</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {kidsTab === 'classrooms' && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Gerenciar Salas</h3>
                    <button
                      onClick={() => setShowAddRoomModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Nova Sala
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map(room => {
                      const childrenInRoom = kidsCheckIns.filter(ci => ci.room === room.name && ci.status === 'checked-in').length;
                      return (
                        <div key={room.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Home className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">{room.name}</h4>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                                  {room.minAge !== undefined && room.maxAge !== undefined 
                                    ? `${room.minAge}-${room.maxAge} anos` 
                                    : 'Faixa etária não definida'}
                                  {room.teacher && ` • Prof: ${room.teacher}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-black text-indigo-600">{childrenInRoom}</span>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Crianças</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${childrenInRoom >= (room.capacity || 20) ? 'bg-rose-500' : 'bg-indigo-500'}`}
                                style={{ width: `${Math.min(100, (childrenInRoom / (room.capacity || 20)) * 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              <span>Capacidade: {room.capacity || 20}</span>
                              <span>{Math.round((childrenInRoom / (room.capacity || 20)) * 100)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {kidsTab === 'reports' && (
                <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold text-slate-900">Histórico de Check-ins</h3>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data/Hora</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Criança</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Responsável</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sala</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kidsCheckIns.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(checkin => {
                          const child = children.find(c => c.id === checkin.childId);
                          const guardian = guardians.find(g => g.id === checkin.guardianId);
                          return (
                            <tr key={checkin.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-4">
                                <p className="text-sm font-bold text-slate-900">{new Date(checkin.date).toLocaleDateString('pt-BR')}</p>
                                <p className="text-[10px] text-slate-500">{checkin.time}</p>
                              </td>
                              <td className="px-4 py-4">
                                <p className="text-sm font-medium text-slate-700">{child?.name || 'N/A'}</p>
                              </td>
                              <td className="px-4 py-4">
                                <p className="text-sm font-medium text-slate-700">{guardian?.name || 'N/A'}</p>
                              </td>
                              <td className="px-4 py-4">
                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase">{checkin.room}</span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-bold uppercase">Presente</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {kidsTab === 'settings' && (
                <section className="space-y-6">
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60">
                    <div className="flex items-center gap-2 mb-6">
                      <Settings className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-bold text-slate-900">Configurações do Kids</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Quick Links */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acesso Rápido</h4>
                        <div className="grid grid-cols-1 gap-2">
                          <button 
                            onClick={() => setKidsTab('guardians')}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                <Users className="w-5 h-5" />
                              </div>
                              <span className="text-sm font-bold text-slate-700">Gerenciar Responsáveis</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                          </button>
                          
                          <button 
                            onClick={() => setIsRoomLeader(true)}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                <Shield className="w-5 h-5" />
                              </div>
                              <span className="text-sm font-bold text-slate-700">Modo Líder de Sala</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                          </button>
                        </div>
                      </div>

                      {/* Users List */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Usuários e Permissões</h4>
                          <span className="text-[10px] font-bold text-slate-400">{allUsers.length} Total</span>
                        </div>
                        
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                          <input 
                            type="text"
                            placeholder="Buscar usuário..."
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] outline-none focus:border-indigo-500 transition-all"
                            onChange={(e) => setKidsSearchTerm(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar pr-1">
                          {allUsers
                            .filter(u => u.email.toLowerCase().includes(kidsSearchTerm.toLowerCase()))
                            .map(u => (
                            <div key={u.uid} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                                  u.role === "master" ? "bg-indigo-600" : 
                                  u.role === "junior" ? "bg-emerald-600" : "bg-slate-400"
                                }`}>
                                  {u.email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{u.email}</p>
                                  <select 
                                    className="text-[10px] text-slate-400 uppercase font-bold bg-transparent outline-none focus:text-indigo-600 transition-colors"
                                    value={u.role}
                                    onChange={async (e) => {
                                      if (userRole !== "master") return;
                                      const newRole = e.target.value as "master" | "junior" | "user";
                                      try {
                                        await updateDoc(doc(db, "users", u.uid), { role: newRole });
                                        addNotification("success", `Cargo de ${u.email} atualizado para ${newRole}`);
                                      } catch (error) {
                                        console.error("Error updating role:", error);
                                        addNotification("error", "Erro ao atualizar cargo.");
                                      }
                                    }}
                                    disabled={userRole !== "master"}
                                  >
                                    <option value="master">Master</option>
                                    <option value="junior">Junior</option>
                                    <option value="user">User</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                          {allUsers.length === 0 && (
                            <p className="text-xs text-slate-400 italic">Nenhum usuário encontrado.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Permissions / Access Control */}
                    <div className="mt-8 pt-8 border-t border-slate-100 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Controle de Acesso</h4>
                          <p className="text-xs text-slate-500">Defina o que cada nível de usuário pode acessar no Kids.</p>
                        </div>
                        <Lock className="w-5 h-5 text-slate-300" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { role: 'parent', label: 'Responsável', permissions: ['Check-in Próprio', 'Ver Próprias Crianças'] },
                          { role: 'leader', label: 'Líder de Sala', permissions: ['Check-in Geral', 'Ver Todas Crianças', 'Relatórios'] },
                          { role: 'master', label: 'Administrador', permissions: ['Acesso Total', 'Configurações', 'Editar Dados'] }
                        ].map(perm => (
                          <div key={perm.role} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{perm.label}</span>
                              <div className="w-2 h-2 rounded-full bg-indigo-600" />
                            </div>
                            <ul className="space-y-1">
                              {perm.permissions.map((p, i) => (
                                <li key={i} className="text-[10px] text-slate-600 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-2xl mx-auto w-full"
            >
              <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60">
                <div className="flex items-center gap-2 mb-8">
                  <RotateCcw className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg md:text-xl font-bold text-slate-900">Configurações</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome da Instituição</label>
                    <input
                      type="text"
                      disabled={userRole !== "master"}
                      className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium ${userRole !== "master" ? "opacity-50 cursor-not-allowed" : ""}`}
                      value={churchName}
                      onChange={(e) => updateChurchName(e.target.value)}
                      placeholder="Ex: Igreja Central"
                    />
                    {userRole !== "master" && (
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">Apenas usuários Master podem alterar o nome.</p>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">Dados do Sistema</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total de Registros</p>
                        <p className="text-xl font-bold text-slate-900">{entries.length}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Última Sincronização</p>
                        <p className="text-sm font-bold text-slate-900">{new Date().toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                      As configurações de nome são salvas localmente no seu navegador. Os dados financeiros são armazenados de forma segura no servidor.
                    </p>
                  </div>

                  {userRole === "master" && (
                    <div className="pt-6 border-t border-slate-100 space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Gerenciar Usuários e Poderes</h4>
                        <Users className="w-4 h-4 text-slate-400" />
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cadastrar Novo Usuário</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="email"
                            placeholder="E-mail da pessoa"
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <select
                              className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                              value={newUserRole}
                              onChange={(e) => setNewUserRole(e.target.value as any)}
                            >
                              <option value="user">Usuário (Básico)</option>
                              <option value="junior">Junior (Visualizador)</option>
                              <option value="master">Master (Total)</option>
                            </select>
                            <button
                              onClick={inviteUser}
                              disabled={isAddingUser || !newUserEmail}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                            >
                              {isAddingUser ? "..." : "Adicionar"}
                            </button>
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-tight">
                          * Se a pessoa já tiver conta, o poder será atualizado. Se não tiver, ela deve se cadastrar com este e-mail para receber o acesso.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Usuários Ativos</p>
                        {allUsers.map(u => (
                          <div key={u.uid || u.email} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                u.role === "master" ? "bg-emerald-100 text-emerald-600" : 
                                u.role === "junior" ? "bg-indigo-100 text-indigo-600" : 
                                "bg-slate-100 text-slate-600"
                              }`}>
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{u.name || "Usuário sem nome"}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <select
                                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border outline-none transition-all ${
                                  u.role === "master" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : 
                                  u.role === "junior" ? "bg-indigo-50 border-indigo-100 text-indigo-600" : 
                                  "bg-slate-50 border-slate-200 text-slate-600"
                                }`}
                                value={u.role}
                                onChange={(e) => updateUserRole(u.uid, e.target.value as any)}
                                disabled={u.uid === user?.uid}
                              >
                                <option value="user">User</option>
                                <option value="junior">Junior</option>
                                <option value="master">Master</option>
                              </select>
                              
                              {u.uid !== user?.uid && (
                                <button
                                  onClick={() => deleteUser(u.uid)}
                                  className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                                  title="Remover Acesso"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {userRole === "master" && (
                    <div className="pt-6 border-t border-slate-100 space-y-4">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Gerenciar Locais de Contagem</h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ex: Sala 7-10 anos"
                          className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                          value={newLocationName}
                          onChange={(e) => setNewLocationName(e.target.value)}
                        />
                        <button
                          onClick={addLocation}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all"
                        >
                          Adicionar
                        </button>
                      </div>
                      <div className="space-y-2">
                        {locations.map(loc => (
                          <div key={loc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            {editingLocation?.id === loc.id ? (
                              <div className="flex items-center gap-2 w-full">
                                <input
                                  type="text"
                                  className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                                  value={editingLocation.name}
                                  onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") editLocation();
                                    if (e.key === "Escape") setEditingLocation(null);
                                  }}
                                />
                                <button
                                  onClick={editLocation}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingLocation(null)}
                                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm font-medium text-slate-700">{loc.name}</span>
                                <div className="flex items-center gap-1">
                                  {showDeleteLocationConfirm === loc.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => deleteLocation(loc.id)}
                                        className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-rose-700 transition-all"
                                      >
                                        Confirmar
                                      </button>
                                      <button
                                        onClick={() => setShowDeleteLocationConfirm(null)}
                                        className="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-lg hover:bg-slate-300 transition-all"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setEditingLocation({ id: loc.id, name: loc.name })}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      {!loc.is_default && (
                                        <button
                                          onClick={() => setShowDeleteLocationConfirm(loc.id)}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Segurança e Acesso</h4>
                    <div className="space-y-4">
                      <button 
                        onClick={() => setShowChangePasswordModal(true)}
                        className="w-full bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-indigo-200 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                            <RefreshCw className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-900">Alterar Minha Senha</p>
                            <p className="text-[10px] text-slate-400 font-medium">Atualize sua senha de acesso.</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1" />
                      </button>

                      {userRole === "master" || userRole === "junior" ? (
                        <div className={`p-4 rounded-2xl border flex items-center justify-between ${userRole === "master" ? "bg-emerald-50 border-emerald-100" : "bg-indigo-50 border-indigo-100"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${userRole === "master" ? "bg-emerald-100" : "bg-indigo-100"}`}>
                              {userRole === "master" ? <Unlock className="w-5 h-5 text-emerald-600" /> : <Shield className="w-5 h-5 text-indigo-600" />}
                            </div>
                            <div>
                              <p className={`text-sm font-bold ${userRole === "master" ? "text-emerald-900" : "text-indigo-900"}`}>Modo {userRole === "master" ? "Master" : "Junior"} Ativo</p>
                              <p className={`text-[10px] font-medium ${userRole === "master" ? "text-emerald-600" : "text-indigo-600"}`}>
                                {userRole === "master" ? "Você tem acesso total ao sistema." : "Você pode visualizar saldos e histórico."}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleLogoutMaster}
                            className={`px-4 py-2 bg-white border rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${userRole === "master" ? "text-emerald-600 border-emerald-200 hover:bg-emerald-100" : "text-indigo-600 border-indigo-200 hover:bg-indigo-100"}`}
                          >
                            Sair
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setShowPinModal(true)}
                          className="w-full bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-indigo-200 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                              <Lock className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-900">Ativar Modo Master</p>
                              <p className="text-[10px] text-slate-400 font-medium">Libera saldos, gráficos e histórico.</p>
                            </div>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Version and System Info */}
              <section className="mt-8 pt-8 border-t border-slate-100">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Versão do Sistema</p>
                    <p className="text-sm font-bold text-slate-900">{APP_VERSION}</p>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Guardian Modal */}
      <AnimatePresence>
        {showAddGuardianModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddGuardianModal(false)}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Novo Responsável</h3>
                <button onClick={() => setShowAddGuardianModal(false)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const assignedRoomIds = Array.from(formData.getAll('assignedRooms')) as string[];
                handleAddGuardian({
                  name: formData.get('name') as string,
                  phone: formData.get('phone') as string,
                  email: formData.get('email') as string,
                  isTeacher: formData.get('isTeacher') === 'on',
                  assignedRoomIds: assignedRoomIds,
                });
              }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                  <input
                    name="name"
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Telefone / WhatsApp</label>
                  <input
                    name="phone"
                    required
                    type="tel"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">E-mail (Opcional)</label>
                  <input
                    name="email"
                    type="email"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    placeholder="email@exemplo.com"
                  />
                </div>

                {userRole === "master" && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Designar como Professor(a)</p>
                          <p className="text-[10px] text-slate-400 font-medium">Permite vincular a turmas específicas</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="isTeacher" className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Vincular a Turmas</label>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                        {rooms.map(room => (
                          <label key={room.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                            <input type="checkbox" name="assignedRooms" value={room.id} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                            <span className="text-xs font-medium text-slate-700">{room.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  disabled={submitting}
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Salvar Responsável"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Child Modal */}
      <AnimatePresence>
        {showAddRoomModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddRoomModal(false)}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Nova Sala</h3>
                <button onClick={() => setShowAddRoomModal(false)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddRoom({
                  name: formData.get('name') as string,
                  teacher: formData.get('teacher') as string,
                  capacity: parseInt(formData.get('capacity') as string) || 0,
                  minAge: parseInt(formData.get('minAge') as string) || 0,
                  maxAge: parseInt(formData.get('maxAge') as string) || 0,
                });
              }} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome da Sala</label>
                    <input
                      name="name"
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                      placeholder="Ex: Berçário"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Professor(a)</label>
                    <input
                      name="teacher"
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                      placeholder="Nome do professor"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Capacidade</label>
                    <input
                      name="capacity"
                      type="number"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Idade Mín.</label>
                    <input
                      name="minAge"
                      type="number"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Idade Máx.</label>
                    <input
                      name="maxAge"
                      type="number"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                      placeholder="12"
                    />
                  </div>
                </div>
                <button
                  disabled={submitting}
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Salvar Sala"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showAddChildModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddChildModal(false)}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Nova Criança</h3>
                <button onClick={() => setShowAddChildModal(false)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddChild({
                  name: formData.get('name') as string,
                  birthDate: formData.get('birthDate') as string,
                  guardianId: formData.get('guardianId') as string,
                  allergies: formData.get('allergies') as string,
                  notes: formData.get('notes') as string,
                });
              }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome da Criança</label>
                  <input
                    name="name"
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Data de Nascimento</label>
                    <input
                      name="birthDate"
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Responsável</label>
                    <select
                      name="guardianId"
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    >
                      <option value="">Selecione...</option>
                      {guardians.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Alergias / Restrições</label>
                  <input
                    name="allergies"
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    placeholder="Nenhuma"
                  />
                </div>
                <button
                  disabled={submitting}
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Salvar Criança"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {showEditGuardianModal && editingGuardian && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditGuardianModal(false)}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Editar Responsável</h3>
                <button onClick={() => setShowEditGuardianModal(false)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const assignedRoomIds = Array.from(formData.getAll('assignedRooms')) as string[];
                handleUpdateGuardian(editingGuardian.id, {
                  name: formData.get('name') as string,
                  phone: formData.get('phone') as string,
                  email: formData.get('email') as string,
                  isTeacher: formData.get('isTeacher') === 'on',
                  assignedRoomIds: assignedRoomIds,
                });
              }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingGuardian.name}
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Telefone</label>
                    <input
                      name="phone"
                      required
                      defaultValue={editingGuardian.phone}
                      type="tel"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">E-mail</label>
                    <input
                      name="email"
                      defaultValue={editingGuardian.email}
                      type="email"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Designar como Professor(a)</p>
                        <p className="text-[10px] text-slate-400 font-medium">Permite vincular a turmas específicas</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="isTeacher" 
                        className="sr-only peer" 
                        defaultChecked={editingGuardian.isTeacher}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Vincular a Turmas</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {rooms.map(room => (
                        <label key={room.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                          <input 
                            type="checkbox" 
                            name="assignedRooms" 
                            value={room.id} 
                            defaultChecked={editingGuardian.assignedRoomIds?.includes(room.id)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" 
                          />
                          <span className="text-xs font-medium text-slate-700">{room.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  disabled={submitting}
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Atualizar Responsável"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showEditChildModal && editingChild && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditChildModal(false)}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Editar Criança</h3>
                <button onClick={() => setShowEditChildModal(false)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateChild(editingChild.id, {
                  name: formData.get('name') as string,
                  birthDate: formData.get('birthDate') as string,
                  guardianId: formData.get('guardianId') as string,
                  allergies: formData.get('allergies') as string,
                  notes: formData.get('notes') as string,
                });
              }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome da Criança</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingChild.name}
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Data de Nascimento</label>
                    <input
                      name="birthDate"
                      required
                      defaultValue={editingChild.birthDate}
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Responsável</label>
                    <select
                      name="guardianId"
                      required
                      defaultValue={editingChild.guardianId}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    >
                      {guardians.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Alergias / Restrições</label>
                  <input
                    name="allergies"
                    defaultValue={editingChild.allergies}
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <button
                  disabled={submitting}
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Atualizar Criança"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showEditRoomModal && editingRoom && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditRoomModal(false)}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Editar Sala</h3>
                <button onClick={() => setShowEditRoomModal(false)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateRoom(editingRoom.id, {
                  name: formData.get('name') as string,
                  teacher: formData.get('teacher') as string,
                  capacity: parseInt(formData.get('capacity') as string) || 0,
                  minAge: parseInt(formData.get('minAge') as string) || 0,
                  maxAge: parseInt(formData.get('maxAge') as string) || 0,
                });
              }} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome da Sala</label>
                    <input
                      name="name"
                      required
                      defaultValue={editingRoom.name}
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Professor(a)</label>
                    <input
                      name="teacher"
                      defaultValue={editingRoom.teacher}
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Capacidade</label>
                    <input
                      name="capacity"
                      type="number"
                      defaultValue={editingRoom.capacity}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Idade Mín.</label>
                    <input
                      name="minAge"
                      type="number"
                      defaultValue={editingRoom.minAge}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Idade Máx.</label>
                    <input
                      name="maxAge"
                      type="number"
                      defaultValue={editingRoom.maxAge}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>
                <button
                  disabled={submitting}
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Atualizar Sala"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

      {/* PIN Modal with Visual Keypad */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPinModal(false)}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xs bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Acesso Restrito</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Insira seu PIN</p>
              </div>

              <div className="flex justify-center gap-3 mb-8">
                {[0, 1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                      pinInput.length > i 
                        ? "bg-indigo-600 border-indigo-600 scale-110" 
                        : "border-slate-200"
                    }`} 
                  />
                ))}
              </div>

              {pinError && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-rose-500 text-[10px] font-bold uppercase tracking-widest mb-4"
                >
                  PIN Incorreto
                </motion.p>
              )}

              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinInput(num.toString())}
                    className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-600 font-bold text-xl hover:bg-indigo-50 hover:text-indigo-600 active:scale-90 transition-all flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => setPinInput("")}
                  className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 font-bold text-xs flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"
                >
                  Limpar
                </button>
                <button
                  onClick={() => handlePinInput("0")}
                  className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-600 font-bold text-xl hover:bg-indigo-50 hover:text-indigo-600 active:scale-90 transition-all flex items-center justify-center"
                >
                  0
                </button>
                <button
                  onClick={() => setShowPinModal(false)}
                  className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200/60 z-50 print:hidden">
        <div className="relative">
          {/* Visual hints for scrolling */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/90 to-transparent z-10 pointer-events-none md:hidden" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/90 to-transparent z-10 pointer-events-none md:hidden" />
          
          <div className="flex items-center justify-start md:justify-center overflow-x-auto no-scrollbar gap-8 px-8 py-3 snap-x touch-pan-x">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center gap-1 transition-all duration-200 flex-shrink-0 snap-center ${
              activeTab === "dashboard" ? "text-indigo-600 scale-110" : "text-slate-400"
            }`}
          >
            <LayoutDashboard className={`w-6 h-6 ${activeTab === "dashboard" ? "fill-indigo-50" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Início</span>
          </button>

          <button
            onClick={() => setActiveTab("form")}
            className={`flex flex-col items-center gap-1 transition-all duration-200 flex-shrink-0 snap-center ${
              activeTab === "form" ? "text-indigo-600 scale-110" : "text-slate-400"
            }`}
          >
            <PlusCircle className={`w-6 h-6 ${activeTab === "form" ? "fill-indigo-50" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Registro</span>
          </button>
          
          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center gap-1 transition-all duration-200 flex-shrink-0 snap-center ${
              activeTab === "history" ? "text-indigo-600 scale-110" : "text-slate-400"
            }`}
          >
            <History className={`w-6 h-6 ${activeTab === "history" ? "fill-indigo-50" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Histórico</span>
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex flex-col items-center gap-1 transition-all duration-200 flex-shrink-0 snap-center ${
              activeTab === "attendance" ? "text-indigo-600 scale-110" : "text-slate-400"
            }`}
          >
            <Users className={`w-6 h-6 ${activeTab === "attendance" ? "fill-indigo-50" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Pessoas</span>
          </button>

          <button
            onClick={() => setActiveTab("kids")}
            className={`flex flex-col items-center gap-1 transition-all duration-200 flex-shrink-0 snap-center ${
              activeTab === "kids" ? "text-indigo-600 scale-110" : "text-slate-400"
            }`}
          >
            <Baby className={`w-6 h-6 ${activeTab === "kids" ? "fill-indigo-50" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Kids</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-1 transition-all duration-200 flex-shrink-0 snap-center ${
              activeTab === "settings" ? "text-indigo-600 scale-110" : "text-slate-400"
            }`}
          >
            <RotateCcw className={`w-6 h-6 ${activeTab === "settings" ? "fill-indigo-50" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Ajustes</span>
          </button>
        </div>
      </div>
    </div>

      {/* Padding for bottom nav */}
      <div className="h-24 md:hidden" />

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 pointer-events-none w-full max-w-sm px-4">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex gap-4 items-start group relative overflow-hidden"
            >
              <div className={`p-2 rounded-xl shrink-0 ${
                n.type === "success" ? "bg-emerald-50 text-emerald-600" :
                n.type === "error" ? "bg-rose-50 text-rose-600" :
                n.type === "warning" ? "bg-amber-50 text-amber-600" :
                "bg-indigo-50 text-indigo-600"
              }`}>
                {n.type === "success" ? <CheckCircle2 className="w-5 h-5" /> :
                 n.type === "error" ? <XCircle className="w-5 h-5" /> :
                 n.type === "warning" ? <AlertTriangle className="w-5 h-5" /> :
                 <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0 pr-6">
                {n.title && <h4 className="text-sm font-bold text-slate-900 mb-0.5">{n.title}</h4>}
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{n.message}</p>
              </div>
              <button 
                onClick={() => removeNotification(n.id)}
                className="absolute top-2 right-2 p-1 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
                className={`absolute bottom-0 left-0 h-1 ${
                  n.type === "success" ? "bg-emerald-500" :
                  n.type === "error" ? "bg-rose-500" :
                  n.type === "warning" ? "bg-amber-500" :
                  "bg-indigo-500"
                }`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Entry Details Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedEntry(null)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden my-8"
              >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedEntry.type === "Dízimo" ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"
                  }`}>
                    {selectedEntry.type === "Dízimo" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Detalhes do Lançamento</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: #{selectedEntry.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEntry(null)}
                  className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tesoureiro</p>
                    <p className="font-bold text-slate-800">{selectedEntry.treasurer}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data</p>
                    <p className="font-bold text-slate-800">
                      {(() => {
                        const [y, m, d] = selectedEntry.date.split("-");
                        return `${d}/${m}/${y}`;
                      })()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Composição do Valor</p>
                  <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                    {selectedEntry.counts ? (
                      <div className="divide-y divide-slate-100">
                        {(() => {
                          try {
                            const parsedCounts = (typeof selectedEntry.counts === 'string' 
                              ? JSON.parse(selectedEntry.counts) 
                              : selectedEntry.counts) as Record<string, number | string>;
                            
                            return Object.entries(parsedCounts)
                              .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
                              .map(([val, count]) => {
                                const denomination = DENOMINATIONS.find(d => d.value === parseFloat(val));
                                const subtotal = parseFloat(val) * (typeof count === 'string' ? parseInt(count) : count);
                                if (parseInt(count as string) === 0) return null;
                                return (
                                  <div key={val} className="flex items-center justify-between p-3 px-4">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-bold text-slate-500 w-16">{denomination?.label}</span>
                                      <span className="text-xs text-slate-300">×</span>
                                      <span className="text-sm font-bold text-indigo-600">{count as React.ReactNode}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 tabular-nums">
                                      R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                );
                              });
                          } catch (e) {
                            return <div className="p-4 text-center text-xs text-slate-400">Erro ao carregar detalhes da contagem.</div>;
                          }
                        })()}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-sm text-slate-400 font-medium italic">Nenhum detalhe de contagem disponível para este registro.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl flex items-center justify-between">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Valor Total</p>
                  <p className="text-2xl font-bold text-white tabular-nums">
                    <span className="text-indigo-400 text-sm mr-1">R$</span>
                    {selectedEntry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {selectedEntry.notes && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Observações</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{selectedEntry.notes}</p>
                  </div>
                )}

                {selectedEntry.is_reversed === 1 && (
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Motivo do Estorno</p>
                    <p className="text-sm text-rose-700 font-medium">{selectedEntry.reversal_reason}</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                {!selectedEntry.is_reversed && (
                  <button
                    onClick={() => reverseEntry(selectedEntry.id)}
                    className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                    title="Estornar Registro"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => sendWhatsApp(selectedEntry)}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                >
                  <Send className="w-4 h-4" />
                  Enviar Comprovante
                </button>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
      {/* Reversal Modal */}
      <AnimatePresence>
        {showReversalModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowReversalModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Estornar Lançamento</h2>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Ação Irreversível</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReversalModal(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                    Motivo do Estorno (Obrigatório)
                  </label>
                  <textarea
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    placeholder="Descreva o motivo deste estorno..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium min-h-[120px] resize-none"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    Esta ação marcará o lançamento como estornado e não poderá ser desfeita. O valor continuará no histórico, mas não será contabilizado nos totais.
                  </p>
                </div>
              </div>

              <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => setShowReversalModal(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmReversal}
                  disabled={submitting || !reversalReason.trim()}
                  className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    "Confirmar Estorno"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showChangePasswordModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowChangePasswordModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Alterar Senha</h2>
                </div>
                <button
                  onClick={() => setShowChangePasswordModal(false)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowChangePasswordModal(false)}
                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || newPasswordInput.length < 6}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      "Salvar Nova Senha"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
