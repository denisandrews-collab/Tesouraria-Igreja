import React, { useState, useEffect, useMemo } from "react";
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
  Sparkles,
  FileText,
  Home,
  MapPin,
  Minus,
  Plus,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { GoogleGenAI } from "@google/genai";
import Markdown from "react-markdown";
import { db, isFirebaseEnabled } from "./firebase"; // Import Firestore db and status
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  updateDoc, 
  doc,
  deleteDoc,
  Timestamp
} from "firebase/firestore";
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

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "calculator" | "form" | "history" | "settings" | "attendance">("dashboard");
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
  const [locations, setLocations] = useState<Location[]>([]);
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
  const [showValues, setShowValues] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDashboardReady, setIsDashboardReady] = useState(false);
  const [serverFirebaseEnabled, setServerFirebaseEnabled] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<"online" | "offline" | "error">("offline");
  const [wsConnected, setWsConnected] = useState(false);
  const wsConnectedRef = React.useRef(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(20);

  // Calculator state
  const [counts, setCounts] = useState<Record<number, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    treasurer: "",
    date: new Date().toISOString().split("T")[0],
    period: "Manhã" as "Manhã" | "Tarde" | "Noite",
    type: "Dízimo" as "Dízimo" | "Oferta",
    amount: "",
    notes: ""
  });

  // Attendance Form state
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split("T")[0],
    period: "Manhã" as "Manhã" | "Tarde" | "Noite",
    counts: {} as Record<string, { men: number; women: number; children: number }>,
    responsible: "",
    notes: ""
  });

  const [newLocationName, setNewLocationName] = useState("");
  const [editingLocation, setEditingLocation] = useState<{ id: string | number, name: string } | null>(null);

  const calculatorTotal = useMemo(() => {
    return Object.entries(counts).reduce((acc, [val, count]) => {
      const n = parseInt(count as string) || 0;
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

    return { total, dizimos, ofertas, chartData, pieData, uniqueTreasurers, growth, currentMonthTotal };
  }, [entries]);

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
    
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    return attendanceEntries.filter(entry => {
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

      return matchesSearch && matchesPeriod && matchesDateRange;
    });
  }, [attendanceEntries, searchTerm, dateRange, periodFilter]);

  useEffect(() => {
    fetchEntries();
    
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let pollInterval: NodeJS.Timeout;

    const connectWS = () => {
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
            fetchEntries();
          } else if (data.type === "ENTRY_REVERSED") {
            addNotification("warning", `Um lançamento foi estornado.`, "Estorno Realizado");
            fetchEntries();
          } else if (data.type === "NEW_LOCATION" || data.type === "LOCATION_DELETED" || data.type === "NEW_ATTENDANCE" || data.type === "LOCATION_UPDATED") {
            if (data.type === "NEW_ATTENDANCE") {
              addNotification("success", "Nova contagem de pessoas registrada.", "Contagem");
            }
            fetchEntries();
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
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          try {
            socket.close();
          } catch (e) {
            // Ignore close errors
          }
        }
      };
    };

    connectWS();

    // Fallback polling every 10 seconds for mobile/unstable connections
    pollInterval = setInterval(() => {
      if (!wsConnectedRef.current) {
        fetchEntries();
      }
    }, 10000);

    // Refresh data when window is focused (useful for mobile)
    const handleFocus = () => {
      console.log("Window focused, refreshing data...");
      fetchEntries();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "dashboard") {
      const timer = setTimeout(() => setIsDashboardReady(true), 500);
      return () => {
        clearTimeout(timer);
        setIsDashboardReady(false);
      };
    }
  }, [activeTab]);

  useEffect(() => {
    if (locations.length > 0) {
      const initialCounts: Record<string, { men: number; women: number; children: number }> = {};
      locations.forEach(loc => {
        if (!attendanceForm.counts[loc.name]) {
          initialCounts[loc.name] = { men: 0, women: 0, children: 0 };
        } else {
          initialCounts[loc.name] = attendanceForm.counts[loc.name];
        }
      });
      setAttendanceForm(prev => ({
        ...prev,
        counts: initialCounts
      }));
    }
  }, [locations]);

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

      // Try Firestore with timeout if db is available and server says it's enabled
      const fetchFromFirestore = async () => {
        if (!db || !isFirebaseEnabled || !isServerFirebase) return null;
        try {
          const q = query(collection(db, "entries"), orderBy("created_at", "desc"));
          const querySnapshot = await getDocs(q);

          const qAtt = query(collection(db, "attendance"), orderBy("created_at", "desc"));
          const querySnapshotAtt = await getDocs(qAtt);

          const qLoc = query(collection(db, "locations"), orderBy("created_at", "asc"));
          const querySnapshotLoc = await getDocs(qLoc);

          setFirebaseStatus("online");
          
          const entriesData = querySnapshot.empty ? [] : querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          })) as Entry[];

          const attendanceData = querySnapshotAtt.empty ? [] : querySnapshotAtt.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          })) as Attendance[];

          const locationsData = querySnapshotLoc.empty ? [] : querySnapshotLoc.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          })) as Location[];

          // If locations are empty, return null to fallback to API which handles defaults
          if (locationsData.length === 0) return null;

          return { entriesData, attendanceData, locationsData };
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
        setTimeout(() => reject(new Error("Timeout")), 5000)
      );

      setLoading(true);
      try {
        const result = await Promise.race([fetchFromFirestore(), timeoutPromise]) as any;
        if (result) {
          setEntries(Array.from(new Map(result.entriesData.map((e: Entry) => [e.id, e])).values()) as Entry[]);
          setAttendanceEntries(Array.from(new Map(result.attendanceData.map((a: Attendance) => [a.id, a])).values()) as Attendance[]);
          setLocations(Array.from(new Map(result.locationsData.map((l: Location) => [l.id, l])).values()) as Location[]);
          setLoading(false);
          return;
        }
      } catch (fsError) {
        console.error("Firestore fetch failed, falling back to local:", fsError);
      }

      const response = await fetch(`/api/entries?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (response.ok) {
        const data = await response.json();
        setEntries(Array.from(new Map(data.map((e: Entry) => [e.id, e])).values()) as Entry[]);
      }

      const attResponse = await fetch(`/api/attendance?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (attResponse.ok) {
        const data = await attResponse.json();
        setAttendanceEntries(Array.from(new Map(data.map((a: Attendance) => [a.id, a])).values()) as Attendance[]);
      }

      const locResponse = await fetch(`/api/locations?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (locResponse.ok) {
        const data = await locResponse.json();
        setLocations(Array.from(new Map(data.map((l: Location) => [l.id, l])).values()) as Location[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      addNotification("error", "Erro ao sincronizar dados com o servidor.", "Erro de Conexão");
    } finally {
      setLoading(false);
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

  const generateInsights = async () => {
    if (entries.length === 0) {
      addNotification("info", "Não há dados suficientes para gerar insights.", "IA Insights");
      return;
    }
    setGeneratingInsights(true);
    setShowAiModal(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const activeEntries = entries.filter(e => !e.is_reversed);
      const dataSummary = activeEntries.map(e => ({
        data: e.date,
        tipo: e.type,
        valor: e.amount,
        tesoureiro: e.treasurer
      }));

      const prompt = `Como um consultor financeiro especializado em tesouraria de igrejas, analise os seguintes lançamentos da igreja "${churchName}":
      ${JSON.stringify(dataSummary)}
      
      Forneça um resumo executivo com:
      1. Tendências de arrecadação (Dízimos vs Ofertas).
      2. Destaques positivos.
      3. Recomendações para a gestão financeira.
      4. Uma frase de encorajamento baseada em princípios de mordomia cristã.
      
      Responda em Markdown, de forma profissional e acolhedora. Use emojis para tornar a leitura agradável.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });

      setAiInsights(response.text);
      addNotification("success", "Insights gerados com sucesso!", "IA Insights");
    } catch (error) {
      console.error("Error generating insights:", error);
      addNotification("error", "Erro ao gerar insights com IA.", "Erro");
      setShowAiModal(false);
    } finally {
      setGeneratingInsights(false);
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
        notes: ""
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
            period: "Manhã"
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
              period: "Manhã"
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
                  Nuvem Offline (Banco não criado)
                </div>
              )}
              {firebaseStatus === "online" && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Nuvem Conectada
                </div>
              )}
              {wsConnected && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-[9px] font-bold uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                  Tempo Real Ativo
                </div>
              )}
            </div>
            <p className="text-xs md:text-sm text-slate-500 font-medium ml-10 md:ml-13">Gestão Financeira Eclesiástica</p>
          </div>
          {(userRole === "master" || userRole === "junior") && (
            <button
              onClick={() => setShowValues(!showValues)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
            >
              {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="text-[10px] font-bold uppercase tracking-widest">{showValues ? "Ocultar" : "Mostrar"} Valores</span>
            </button>
          )}
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
                onClick={() => setActiveTab("calculator")}
                className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100"
              >
                Calculadora
              </button>
              <button 
                onClick={() => setActiveTab("form")}
                className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest"
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
                    {/* Trend Chart */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60 print:shadow-none print:border-slate-200 print:rounded-xl">
                      <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-900">Tendência de Arrecadação</h3>
                      </div>
                      <div className="h-[300px] w-full print:h-[200px] relative">
                        {stats.chartData.length > 0 && isDashboardReady ? (
                          <ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={1} debounce={100}>
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

                    {/* Distribution Chart */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60 print:shadow-none print:border-slate-200 print:rounded-xl">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <PieChartIcon className="w-5 h-5 text-indigo-600" />
                          <h3 className="font-bold text-slate-900">Distribuição por Categoria</h3>
                        </div>
                        <button 
                          onClick={generateInsights}
                          disabled={generatingInsights}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50"
                        >
                          <Sparkles className={`w-3 h-3 ${generatingInsights ? 'animate-pulse' : ''}`} />
                          IA Insights
                        </button>
                      </div>
                      <div className="h-[300px] w-full flex flex-col md:flex-row items-center print:h-[200px] relative">
                        <div className="w-full h-full flex-1 min-w-0">
                          {isDashboardReady ? (
                            <ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={1} debounce={100}>
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
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
                    <motion.button 
                      onClick={() => setActiveTab("calculator")}
                      whileTap={{ scale: 0.95 }}
                      className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:border-indigo-200 transition-all group text-center"
                    >
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform">
                        <Calculator className="w-5 h-5 text-indigo-600" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Calculadora</p>
                    </motion.button>
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
                    <motion.button 
                      onClick={generateInsights}
                      whileTap={{ scale: 0.95 }}
                      className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:border-violet-200 transition-all group text-center"
                    >
                      <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform">
                        <Sparkles className="w-5 h-5 text-violet-600" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">IA Insights</p>
                    </motion.button>
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
                        entries.slice(0, 5).map((entry) => (
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
                      {attendanceEntries.length === 0 ? (
                        <div className="py-12 text-center opacity-30">
                          <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma contagem</p>
                        </div>
                      ) : (
                        attendanceEntries.slice(0, 3).map((att) => {
                          const total = Object.values(att.counts || {}).reduce((acc, curr) => {
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-24 md:pb-0">
                  <motion.button 
                    onClick={() => setActiveTab("calculator")}
                    whileTap={{ scale: 0.95 }}
                    className="p-8 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm hover:border-indigo-200 transition-all group text-left"
                  >
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Calculator className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Calculadora de Caixa</h3>
                    <p className="text-sm text-slate-500 leading-relaxed text-balance">Contabilize notas e moedas fisicamente antes de registrar o valor total.</p>
                  </motion.button>
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
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        placeholder="0"
                        className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-semibold text-slate-700 group-hover:bg-white"
                        value={counts[den.value] || ""}
                        onChange={(e) => setCounts({ ...counts, [den.value]: e.target.value })}
                      />
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
                        className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                      >
                        <Calculator className="w-3 h-3" />
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
                        {attendanceEntries.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-12 text-center opacity-30">
                              <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                              <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Nenhuma contagem registrada</p>
                            </td>
                          </tr>
                        ) : (
                          (() => {
                            const grouped: Record<string, Attendance[]> = {};
                            attendanceEntries.forEach(att => {
                              const key = `${att.date}_${att.period}`;
                              if (!grouped[key]) grouped[key] = [];
                              grouped[key].push(att);
                            });

                            return Object.entries(grouped).map(([key, entries]) => {
                              const [date, period] = key.split("_");
                              const groupTotals: Record<string, { men: number; women: number; children: number }> = {};
                              entries.forEach(entry => {
                                Object.entries(entry.counts || {}).forEach(([locName, counts]) => {
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
                                      const current = attendanceForm.counts[loc.name]?.[cat.id as "men" | "women" | "children"] || 0;
                                      if (current > 0) {
                                        setAttendanceForm({
                                          ...attendanceForm,
                                          counts: {
                                            ...attendanceForm.counts,
                                            [loc.name]: {
                                              ...attendanceForm.counts[loc.name],
                                              [cat.id]: current - 1
                                            }
                                          }
                                        });
                                      }
                                    }}
                                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all active:scale-90"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700 text-center"
                                    value={attendanceForm.counts[loc.name]?.[cat.id as "men" | "women" | "children"] || ""}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      setAttendanceForm({
                                        ...attendanceForm,
                                        counts: {
                                          ...attendanceForm.counts,
                                          [loc.name]: {
                                            ...attendanceForm.counts[loc.name],
                                            [cat.id]: val
                                          }
                                        }
                                      });
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = attendanceForm.counts[loc.name]?.[cat.id as "men" | "women" | "children"] || 0;
                                      setAttendanceForm({
                                        ...attendanceForm,
                                        counts: {
                                          ...attendanceForm.counts,
                                          [loc.name]: {
                                            ...attendanceForm.counts[loc.name],
                                            [cat.id]: current + 1
                                          }
                                        }
                                      });
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
                      {(periodFilter !== "all" || dateRange.start || dateRange.end || searchTerm) && (
                        <button
                          onClick={() => {
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

                          return Object.entries(grouped).map(([key, entries]) => {
                            const [date, period] = key.split("_");
                            
                            // Calculate totals for this group
                            const groupTotals: Record<string, { men: number; women: number; children: number }> = {};
                            entries.forEach(entry => {
                              Object.entries(entry.counts || {}).forEach(([locName, counts]) => {
                                const c = counts as { men: number; women: number; children: number };
                                if (!groupTotals[locName]) groupTotals[locName] = { men: 0, women: 0, children: 0 };
                                groupTotals[locName].men += c.men;
                                groupTotals[locName].women += c.women;
                                groupTotals[locName].children += c.children;
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
                                  const entryTotal = Object.values(att.counts || {}).reduce((acc, curr) => {
                                    const c = curr as { men: number; women: number; children: number };
                                    return acc + c.men + c.women + c.children;
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
                                          {Object.entries(att.counts || {}).map(([locName, counts]) => {
                                            const c = counts as { men: number; women: number; children: number };
                                            return (
                                              <div key={locName} className="flex flex-col gap-0.5">
                                                <span className="text-xs font-bold text-slate-700">{locName}: {c.men + c.women + c.children}</span>
                                                <span className="text-[9px] text-slate-400 uppercase tracking-tighter">H:{c.men} M:{c.women} C:{c.children}</span>
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
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200/60 px-6 py-3 z-50 print:hidden">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center gap-1 transition-all duration-200 ${
              activeTab === "dashboard" ? "text-indigo-600 scale-110" : "text-slate-400"
            }`}
          >
            <LayoutDashboard className={`w-6 h-6 ${activeTab === "dashboard" ? "fill-indigo-50" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Início</span>
          </button>

          <button
            onClick={() => setActiveTab("calculator")}
            className={`flex flex-col items-center gap-1 transition-all duration-200 ${
              activeTab === "calculator" ? "text-indigo-600 scale-110" : "text-slate-400"
            }`}
          >
            <Calculator className={`w-6 h-6 ${activeTab === "calculator" ? "fill-indigo-50" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Cálculo</span>
          </button>
          
          <button
            onClick={() => setActiveTab("form")}
            className={`flex flex-col items-center gap-1 transition-all duration-200 ${
              activeTab === "form" ? "text-indigo-600 scale-110" : "text-slate-400"
            }`}
          >
            <PlusCircle className={`w-6 h-6 ${activeTab === "form" ? "fill-indigo-50" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Registro</span>
          </button>
          
          {(userRole === "master" || userRole === "junior") && (
            <button
              onClick={() => setActiveTab("history")}
              className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                activeTab === "history" ? "text-indigo-600 scale-110" : "text-slate-400"
              }`}
            >
              <History className={`w-6 h-6 ${activeTab === "history" ? "fill-indigo-50" : ""}`} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Histórico</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex flex-col items-center gap-1 transition-all duration-200 ${
              activeTab === "attendance" ? "text-indigo-600 scale-110" : "text-slate-400"
            }`}
          >
            <Users className={`w-6 h-6 ${activeTab === "attendance" ? "fill-indigo-50" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Pessoas</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-1 transition-all duration-200 ${
              activeTab === "settings" ? "text-indigo-600 scale-110" : "text-slate-400"
            }`}
          >
            <RotateCcw className={`w-6 h-6 ${activeTab === "settings" ? "fill-indigo-50" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Ajustes</span>
          </button>
        </div>
      </div>

      {/* Padding for bottom nav */}
      <div className="h-20" />

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

      {/* AI Insights Modal */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !generatingInsights && setShowAiModal(false)}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">IA Insights</h3>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Consultoria Financeira Inteligente</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAiModal(false)}
                  disabled={generatingInsights}
                  className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 disabled:opacity-0"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                {generatingInsights ? (
                  <div className="py-20 text-center space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                      <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-600 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-bold text-slate-900">Analisando dados...</p>
                      <p className="text-sm text-slate-400 font-medium">O Gemini está processando seus lançamentos financeiros.</p>
                    </div>
                  </div>
                ) : aiInsights ? (
                  <div className="prose prose-slate max-w-none prose-sm prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-slate-600 prose-p:leading-relaxed prose-strong:text-indigo-600">
                    <Markdown>{aiInsights as string}</Markdown>
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <p className="text-slate-400 font-medium">Nenhum insight gerado ainda.</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowAiModal(false)}
                  className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-[200] md:hidden bg-white/80 backdrop-blur-lg border-t border-slate-200 px-6 py-3 pb-8 flex items-center justify-between">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === "dashboard" ? "text-indigo-600" : "text-slate-400"}`}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Início</span>
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab("form")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === "form" ? "text-indigo-600" : "text-slate-400"}`}
        >
          <PlusCircle className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Novo</span>
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab("calculator")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === "calculator" ? "text-indigo-600" : "text-slate-400"}`}
        >
          <Calculator className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Caixa</span>
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === "history" ? "text-indigo-600" : "text-slate-400"}`}
        >
          <History className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Histórico</span>
        </motion.button>
      </div>
    </div>
  );
}
