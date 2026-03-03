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
  XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
  id: number;
  treasurer: string;
  date: string;
  type: "Dízimo" | "Oferta";
  amount: number;
  counts?: string; // JSON string of Record<number, string>
  notes?: string;
  is_reversed?: number;
  reversal_reason?: string;
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "calculator" | "form" | "history" | "settings">("dashboard");
  const [userRole, setUserRole] = useState<"master" | "junior" | "user">(() => (localStorage.getItem("userRole") as any) || "user");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [churchName, setChurchName] = useState(() => localStorage.getItem("churchName") || "Minha Igreja");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"Todos" | "Dízimo" | "Oferta">("Todos");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showValues, setShowValues] = useState(true);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDashboardReady, setIsDashboardReady] = useState(false);

  // Calculator state
  const [counts, setCounts] = useState<Record<number, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    treasurer: "",
    date: new Date().toISOString().split("T")[0],
    type: "Dízimo" as "Dízimo" | "Oferta",
    amount: "",
    notes: ""
  });

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
    return entries.filter(entry => {
      const matchesSearch = entry.treasurer.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           entry.date.includes(searchTerm) ||
                           (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = filterType === "Todos" || entry.type === filterType;
      
      const matchesDateRange = (!dateRange.start || entry.date >= dateRange.start) &&
                               (!dateRange.end || entry.date <= dateRange.end);

      return matchesSearch && matchesFilter && matchesDateRange;
    });
  }, [entries, searchTerm, filterType, dateRange]);

  const consolidatedEntries = useMemo(() => {
    const groups: Record<string, { date: string, type: string, total: number, entries: Entry[] }> = {};
    
    filteredEntries.forEach(entry => {
      const key = `${entry.date}_${entry.type}`;
      if (!groups[key]) {
        groups[key] = { date: entry.date, type: entry.type, total: 0, entries: [] };
      }
      groups[key].total += entry.is_reversed ? 0 : entry.amount;
      groups[key].entries.push(entry);
    });

    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredEntries]);

  useEffect(() => {
    fetchEntries();
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
      const response = await fetch("/api/entries");
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error("Error fetching entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const reverseEntry = async (id: number) => {
    const reason = prompt("Por favor, informe o motivo do estorno (OBRIGATÓRIO):");
    if (!reason || reason.trim() === "") {
      alert("O motivo do estorno é obrigatório.");
      return;
    }
    
    try {
      const response = await fetch(`/api/entries/${id}/reverse`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      if (response.ok) {
        fetchEntries();
        setSelectedEntry(null);
        addNotification("success", "O lançamento foi estornado com sucesso.", "Estorno Realizado");
      }
    } catch (error) {
      console.error("Error reversing entry:", error);
      addNotification("error", "Não foi possível realizar o estorno.", "Erro no Servidor");
    }
  };

  const exportCSV = () => {
    const headers = ["ID", "Data", "Tesoureiro", "Tipo", "Valor", "Observações", "Estornado", "Motivo Estorno"];
    const rows = filteredEntries.map(e => [
      e.id,
      (() => {
        const [y, m, d] = e.date.split("-");
        return `${d}/${m}/${y}`;
      })(),
      e.treasurer,
      e.type,
      e.amount.toFixed(2),
      `"${(e.notes || "").replace(/"/g, '""')}"`,
      e.is_reversed ? "Sim" : "Não",
      `"${(e.reversal_reason || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
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
    addNotification("success", "O arquivo CSV foi gerado e baixado com sucesso.", "Exportação Concluída");
  };

  const printReport = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.treasurer.trim()) {
      addNotification("warning", "Por favor, informe o nome do tesoureiro.", "Campo Obrigatório");
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      addNotification("warning", "Por favor, informe um valor válido maior que zero.", "Valor Inválido");
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          counts: Object.keys(counts).length > 0 ? counts : null
        })
      });

      if (response.ok) {
        setSuccess(true);
        addNotification("success", "O lançamento foi registrado com sucesso no sistema.", "Lançamento Salvo");
        setFormData({
          ...formData,
          amount: "",
          notes: ""
        });
        setCounts({});
        fetchEntries();
        setTimeout(() => {
          setSuccess(false);
          setActiveTab(userRole === "master" ? "history" : "dashboard");
        }, 2000);
      } else {
        const errorData = await response.json();
        addNotification("error", errorData.error || "Erro ao salvar o lançamento.", "Falha no Registro");
      }
    } catch (error) {
      console.error("Error saving entry:", error);
      addNotification("error", "Não foi possível conectar ao servidor.", "Erro de Conexão");
    } finally {
      setSubmitting(false);
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

  const toggleDateExpansion = (dateKey: string) => {
    setExpandedDates(prev => 
      prev.includes(dateKey) ? prev.filter(d => d !== dateKey) : [...prev, dateKey]
    );
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
              className="space-y-6 print:space-y-8"
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
                      <div className="flex items-center gap-2 mb-6">
                        <PieChartIcon className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-900">Distribuição por Categoria</h3>
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

                  {/* Recent Activity Mini List */}
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200/60 print:shadow-none print:border-slate-200 print:rounded-xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-900">Atividade Recente</h3>
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
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button 
                    onClick={() => setActiveTab("calculator")}
                    className="p-8 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm hover:border-indigo-200 transition-all group text-left"
                  >
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Calculator className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Calculadora de Caixa</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">Contabilize notas e moedas fisicamente antes de registrar o valor total.</p>
                  </button>
                  <button 
                    onClick={() => setActiveTab("form")}
                    className="p-8 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm hover:border-emerald-200 transition-all group text-left"
                  >
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <PlusCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Novo Registro</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">Lance dízimos e ofertas diretamente no sistema para gerar comprovantes.</p>
                  </button>
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
                        {stats.uniqueTreasurers.map(t => <option key={t} value={t} />)}
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
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                      Valor Consolidado
                    </label>
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
              <section className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden">
                {/* History Header & Filters */}
                <div className="p-5 md:p-8 border-b border-slate-100 space-y-4 md:space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <History className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
                      <h2 className="text-lg md:text-xl font-bold text-slate-900">Histórico Consolidado</h2>
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

                  <div className="flex flex-wrap gap-2 print:hidden">
                    {(["Todos", "Dízimo", "Oferta"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                            filterType === type 
                              ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                <div className="divide-y divide-slate-100">
                  {loading ? (
                    <div className="py-24 text-center">
                      <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                    </div>
                  ) : consolidatedEntries.length === 0 ? (
                    <div className="py-24 text-center opacity-30">
                      <Search className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Nenhum registro</p>
                    </div>
                  ) : (
                    consolidatedEntries.map((group) => {
                      const dateKey = `${group.date}_${group.type}`;
                      const isExpanded = expandedDates.includes(dateKey);
                      return (
                        <div key={dateKey} className="group transition-colors">
                          <div 
                            onClick={() => toggleDateExpansion(dateKey)}
                            className="flex items-center justify-between p-5 md:p-6 cursor-pointer hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                group.type === "Dízimo" ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"
                              }`}>
                                {group.type === "Dízimo" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900">
                                  {(() => {
                                    const [y, m, d] = group.date.split("-");
                                    return `${d}/${m}/${y}`;
                                  })()}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.type} • {group.entries.length} lançamentos</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="text-lg font-bold tabular-nums text-slate-900">
                                {formatCurrency(group.total)}
                              </p>
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                            </div>
                          </div>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-slate-50/50"
                              >
                                <div className="p-4 md:p-6 space-y-3 border-t border-slate-100">
                                  {group.entries.map(entry => (
                                    <div 
                                      key={entry.id} 
                                      onClick={() => setSelectedEntry(entry)}
                                      className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer group/item"
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-colors">
                                          <User className="w-4 h-4" />
                                        </div>
                                        <div className={entry.is_reversed ? 'opacity-50' : ''}>
                                          <p className={`text-sm font-bold text-slate-800 ${entry.is_reversed ? 'line-through' : ''}`}>
                                            {entry.treasurer}
                                            {entry.is_reversed === 1 && <span className="ml-2 text-[8px] text-rose-500 font-bold uppercase">Estornado</span>}
                                          </p>
                                          {entry.notes && <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{entry.notes}</p>}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <p className={`text-sm font-bold tabular-nums ${entry.is_reversed ? 'text-slate-300 line-through' : 'text-slate-900'}`}>
                                          {formatCurrency(entry.amount)}
                                        </p>
                                        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover/item:text-indigo-400 transition-all" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
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
                            const parsedCounts = typeof selectedEntry.counts === 'string' 
                              ? JSON.parse(selectedEntry.counts) 
                              : selectedEntry.counts;
                            
                            return Object.entries(parsedCounts)
                              .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
                              .map(([val, count]) => {
                                const denomination = DENOMINATIONS.find(d => d.value === parseFloat(val));
                                const subtotal = parseFloat(val) * parseInt(count as string);
                                if (parseInt(count as string) === 0) return null;
                                return (
                                  <div key={val} className="flex items-center justify-between p-3 px-4">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-bold text-slate-500 w-16">{denomination?.label}</span>
                                      <span className="text-xs text-slate-300">×</span>
                                      <span className="text-sm font-bold text-indigo-600">{count}</span>
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
  </div>
);
}
