import React, { useState, useEffect } from 'react';
import { 
  Fuel as FuelIcon, 
  MapPin, 
  User, 
  Plus, 
  Edit, 
  Trash2, 
  KeyRound, 
  LogOut, 
  Database, 
  Activity, 
  Clock, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  RefreshCw, 
  MapIcon, 
  Layers, 
  Sliders, 
  UserPlus
} from 'lucide-react';
import { Station, Fuel, User as SystemUser, LoginResponse } from './types';
import ApiDocumentation from './components/ApiDocumentation';
import OverviewStats from './components/OverviewStats';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'stations' | 'fuels' | 'users' | 'apiDocs' | 'auditLogs' | 'transactions'>('stations');

  // Application Data States
  const [stations, setStations] = useState<Station[]>([]);
  const [fuels, setFuels] = useState<Fuel[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Search & Filters
  const [stationSearch, setStationSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [fuelFilter, setFuelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pageFilter, setPageFilter] = useState(1);
  const [limitFilter, setLimitFilter] = useState(10);
  const [sortByFilter, setSortByFilter] = useState('name');

  // Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('fuel_jwt_token'));
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
    const saved = localStorage.getItem('fuel_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Auth form states
  const [usernameInput, setUsernameInput] = useState('admin');
  const [passwordInput, setPasswordInput] = useState('admin123');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Local purchase/filling transaction form states
  const [activeTxStationId, setActiveTxStationId] = useState<string | null>(null);
  const [txFuelId, setTxFuelId] = useState<string>('');
  const [txLiters, setTxLiters] = useState<number>(30);
  const [txBuyerName, setTxBuyerName] = useState<string>('Marian Kowal');
  const [txStatusMessage, setTxStatusMessage] = useState<string | null>(null);
  const [txSuccessMessage, setTxSuccessMessage] = useState<string | null>(null);

  // New Sales Panel specific states (Polish localized)
  const [salesStationId, setSalesStationId] = useState<string>('');
  const [salesFuelId, setSalesFuelId] = useState<string>('');
  const [salesCalcType, setSalesCalcType] = useState<'liters' | 'price'>('liters');
  const [salesLiters, setSalesLiters] = useState<number>(10);
  const [salesAmountPLN, setSalesAmountPLN] = useState<number>(50);
  const [salesWorker, setSalesWorker] = useState<string>('Pracownik 1');
  const [salesPaymentMethod, setSalesPaymentMethod] = useState<string>('Gotówka');
  const [salesStatus, setSalesStatus] = useState<'opłacona' | 'nieudana'>('opłacona');
  const [salesBuyerName, setSalesBuyerName] = useState<string>('Klient Indywidualny');
  const [salesTabMode, setSalesTabMode] = useState<'list' | 'panel'>('panel');
  const [salesError, setSalesError] = useState<string | null>(null);
  const [salesSuccess, setSalesSuccess] = useState<string | null>(null);

  // Operational states (Modals & Form editing state)
  const [showStationModal, setShowStationModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [stationForm, setStationForm] = useState({
    name: '',
    address: '',
    city: '',
    workingHours: '24/7',
    status: 'czynna' as 'czynna' | 'nieczynna',
    fuels: [] as { fuelId: string; pricePerLiter: number; availableQuantity: number }[]
  });

  const [showFuelModal, setShowFuelModal] = useState(false);
  const [editingFuel, setEditingFuel] = useState<Fuel | null>(null);
  const [fuelForm, setFuelForm] = useState({
    name: '',
    type: 'benzyna' as 'benzyna' | 'diesel' | 'LPG' | 'inne',
    pricePerLiter: 6.45,
    availableQuantity: 10000
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    email: '',
    fullName: '',
    role: 'operator' as 'admin' | 'manager' | 'operator'
  });

  // Global notice states
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load backend data
  const fetchData = async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      // Build dynamic stations endpoint URL with paging, sorting, and filtering options
      let stUrl = '/stations?';
      if (cityFilter && cityFilter !== 'all') stUrl += `city=${encodeURIComponent(cityFilter)}&`;
      if (statusFilter && statusFilter !== 'all') stUrl += `status=${encodeURIComponent(statusFilter)}&`;
      if (fuelFilter && fuelFilter !== 'all') stUrl += `fuelId=${encodeURIComponent(fuelFilter)}&`;
      if (sortByFilter) stUrl += `sortBy=${encodeURIComponent(sortByFilter)}&`;
      stUrl += `page=${pageFilter}&limit=${limitFilter}`;

      const stResponse = await fetch(stUrl);
      if (stResponse.ok) {
        const stData = await stResponse.json();
        setStations(stData);
        if (stData && stData.length > 0) {
          setSalesStationId(prev => {
            if (prev) return prev;
            return stData[0].id;
          });
          if (stData[0].fuels && stData[0].fuels.length > 0) {
            setSalesFuelId(prevVal => {
              if (prevVal) return prevVal;
              return stData[0].fuels[0].fuelId;
            });
          }
        }
      } else {
        let errMsg = 'Błąd pobierania stacji paliw';
        try {
          const errJson = await stResponse.json();
          if (errJson && errJson.error) {
            errMsg += `: ${errJson.error}`;
          }
        } catch {
          try {
            const errText = await stResponse.text();
            if (errText) {
              errMsg += `: ${errText.substring(0, 100)}`;
            }
          } catch {}
        }
        throw new Error(`${errMsg} (status: ${stResponse.status})`);
      }

      // Fuels catalogue
      const flResponse = await fetch('/fuels');
      if (flResponse.ok) {
        const flData = await flResponse.json();
        setFuels(flData);
      }

      // Users register
      const usResponse = await fetch('/users');
      if (usResponse.ok) {
        const usData = await usResponse.json();
        setUsers(usData);
      }

      // Audit logs
      const logResponse = await fetch('/api/logs');
      if (logResponse.ok) {
        const logData = await logResponse.json();
        setAuditLogs(logData);
      }

      // Fuel transactions
      const txResponse = await fetch('/transactions');
      if (txResponse.ok) {
        const txData = await txResponse.json();
        setTransactions(txData);
      }

    } catch (err: any) {
      setErrorNotice(`Błąd połączenia z serwerem: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [cityFilter, statusFilter, fuelFilter, sortByFilter, pageFilter, limitFilter]);

  // Synchronize fuel selection when Sales Panel station changes
  useEffect(() => {
    if (salesStationId && stations.length > 0) {
      const selectedStation = stations.find(s => s.id === salesStationId);
      if (selectedStation && selectedStation.fuels && selectedStation.fuels.length > 0) {
        const hasFuel = selectedStation.fuels.some(sf => sf.fuelId === salesFuelId);
        if (!hasFuel) {
          setSalesFuelId(selectedStation.fuels[0].fuelId);
        }
      }
    }
  }, [salesStationId, stations, salesFuelId]);

  // Quick preset authentication helper (One-Click)
  const handleQuickLogin = async (usr: string, psw: string) => {
    setErrorNotice(null);
    setSuccessNotice(null);
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: usr, password: psw })
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || 'Błąd logowania');
      }

      const lResponse: LoginResponse = await response.json();
      setToken(lResponse.token);
      setCurrentUser(lResponse.user);
      localStorage.setItem('fuel_jwt_token', lResponse.token);
      localStorage.setItem('fuel_current_user', JSON.stringify(lResponse.user));
      setSuccessNotice(`Zalogowano jako ${lResponse.user.fullName} (${lResponse.user.role})`);
      setShowLoginModal(false);
      fetchData(); // Reload logs
    } catch (err: any) {
      setErrorNotice(err.message);
    }
  };

  // Manual Login handle
  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleQuickLogin(usernameInput, passwordInput);
    setUsernameInput('');
    setPasswordInput('');
  };

  // Logout handle
  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('fuel_jwt_token');
    localStorage.removeItem('fuel_current_user');
    setSuccessNotice('Wylogowano pomyślnie z sesji admina');
    fetchData();
  };

  // -------------------------------------------------------------
  // STATION OPERATIONS (POST / PUT / DELETE)
  // -------------------------------------------------------------
  const handleAddFuelToStationForm = (fuelId: string) => {
    if (stationForm.fuels.some(f => f.fuelId === fuelId)) return;
    const templateFuel = fuels.find(f => f.id === fuelId);
    setStationForm(prev => ({
      ...prev,
      fuels: [
        ...prev.fuels,
        {
          fuelId,
          pricePerLiter: templateFuel?.pricePerLiter || 6.50,
          availableQuantity: 5000
        }
      ]
    }));
  };

  const handleRemoveFuelFromStationForm = (fuelId: string) => {
    setStationForm(prev => ({
      ...prev,
      fuels: prev.fuels.filter(f => f.fuelId !== fuelId)
    }));
  };

  const handleUpdateFuelInStationForm = (fuelId: string, fields: Partial<{ pricePerLiter: number; availableQuantity: number }>) => {
    setStationForm(prev => ({
      ...prev,
      fuels: prev.fuels.map(f => {
        if (f.fuelId === fuelId) {
          return { ...f, ...fields };
        }
        return f;
      })
    }));
  };

  const handleOpenCreateStation = () => {
    setEditingStation(null);
    setStationForm({
      name: '',
      address: '',
      city: '',
      workingHours: '24/7',
      status: 'czynna',
      fuels: []
    });
    setShowStationModal(true);
  };

  const handleOpenEditStation = (st: Station) => {
    setEditingStation(st);
    setStationForm({
      name: st.name,
      address: st.address,
      city: st.city,
      workingHours: st.workingHours,
      status: st.status || 'czynna',
      fuels: [...st.fuels]
    });
    setShowStationModal(true);
  };

  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    setSuccessNotice(null);

    if (!stationForm.name || !stationForm.address || !stationForm.city) {
      setErrorNotice('Błąd: Wszystkie pola adresowe i nazwa są wymagane.');
      return;
    }

    const payload = {
      name: stationForm.name,
      address: stationForm.address,
      city: stationForm.city,
      workingHours: stationForm.workingHours,
      status: stationForm.status,
      fuels: stationForm.fuels
    };

    const isEditing = !!editingStation;
    const url = isEditing ? `/stations/${editingStation.id}` : '/stations';
    const method = isEditing ? 'PUT' : 'POST';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd zapisu stacji');
      }

      setSuccessNotice(isEditing ? 'Stacja paliw została zaktualizowana' : 'Dodano nową stację paliw pomyślnie');
      setShowStationModal(false);
      fetchData();
    } catch (err: any) {
      setErrorNotice(`Wyjątek zapisu REST: ${err.message}`);
    }
  };

  const handleDeleteStation = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę stację paliw?')) return;
    setErrorNotice(null);
    setSuccessNotice(null);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`/stations/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || `Kod błędu: ${response.status}`);
      }

      setSuccessNotice('Stacja została pomyślnie usunięta z bazy danych');
      fetchData();
    } catch (err: any) {
      setErrorNotice(`Błąd usuwania stacji: ${err.message}`);
    }
  };

  const handlePurchaseFuel = async (stationId: string) => {
    setTxStatusMessage(null);
    setTxSuccessMessage(null);

    if (!txFuelId) {
      setTxStatusMessage('Błąd: wybierz rodzaj paliwa z asortymentu stacji.');
      return;
    }

    if (txLiters <= 0) {
      setTxStatusMessage('Błąd: ilość litrów musi być większa niż zero.');
      return;
    }

    try {
      const payload = {
        fuelId: txFuelId,
        liters: Number(txLiters),
        buyerName: txBuyerName || 'Anonimowy Marian Kowal'
      };

      const response = await fetch(`/stations/${stationId}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();

      if (!response.ok) {
        throw new Error(resJson.error || 'Napotkano niespodziewany błąd serwera');
      }

      setTxSuccessMessage(`Tankowanie zakończone sukcesem! Zakupiono ${txLiters}L paliwa za łączną kwotę ${resJson.totalPrice.toFixed(2)} zł.`);
      
      // Refresh database records
      setTimeout(() => {
        setActiveTxStationId(null);
        setTxStatusMessage(null);
        setTxSuccessMessage(null);
        fetchData();
      }, 3500);

    } catch (err: any) {
      setTxStatusMessage(err.message);
    }
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalesError(null);
    setSalesSuccess(null);

    if (!salesStationId) {
      setSalesError('Błąd: Wybierz stację paliw.');
      return;
    }

    if (!salesFuelId) {
      setSalesError('Błąd: Wybierz rodzaj paliwa z asortymentu.');
      return;
    }

    try {
      const payload: any = {
        fuelId: salesFuelId,
        buyerName: salesBuyerName || 'Klient Indywidualny',
        worker: salesWorker,
        paymentMethod: salesPaymentMethod,
        status: salesStatus,
        calcType: salesCalcType,
      };

      if (salesCalcType === 'liters') {
        if (Number(salesLiters) <= 0) {
          setSalesError('Błąd: Ilość litrów musi być większa od zera.');
          return;
        }
        payload.liters = Number(salesLiters);
      } else {
        if (Number(salesAmountPLN) <= 0) {
          setSalesError('Błąd: Kwota musi być większa od zera.');
          return;
        }
        payload.amountPLN = Number(salesAmountPLN);
      }

      const response = await fetch(`/stations/${salesStationId}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();

      if (!response.ok) {
        throw new Error(resJson.error || 'Napotkano błąd podczas realizacji sprzedaży');
      }

      const ltrsText = resJson.liters ? `${resJson.liters.toFixed(2)} L` : '';
      setSalesSuccess(`Sprzedaż zarejestrowana pomyślnie! (${ltrsText} za ${resJson.totalPrice.toFixed(2)} zł, status: ${salesStatus === 'opłacona' ? 'OPŁACONA' : 'NIEUDANA'}).`);
      
      if (salesStatus === 'opłacona') {
        setSuccessNotice('Sprzedaż zrealizowana. Paliwo zostało pobrane ze stanu stacji!');
      } else {
        setErrorNotice('Zarejestrowano transakcję nieopłaconą. Stan paliw nie uległ zmianie.');
      }

      fetchData();
    } catch (err: any) {
      setSalesError(err.message);
    }
  };

  // -------------------------------------------------------------
  // FUEL CATALOGUE OPERATIONS (POST / PUT / DELETE)
  // -------------------------------------------------------------
  const handleOpenCreateFuel = () => {
    setEditingFuel(null);
    setFuelForm({
      name: '',
      type: 'benzyna',
      pricePerLiter: 6.50,
      availableQuantity: 10000
    });
    setShowFuelModal(true);
  };

  const handleOpenEditFuel = (fuel: Fuel) => {
    setEditingFuel(fuel);
    setFuelForm({
      name: fuel.name,
      type: fuel.type,
      pricePerLiter: fuel.pricePerLiter,
      availableQuantity: fuel.availableQuantity
    });
    setShowFuelModal(true);
  };

  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    setSuccessNotice(null);

    if (!fuelForm.name) {
      setErrorNotice('Nazwa paliwa jest wymagana');
      return;
    }

    const payload = {
      name: fuelForm.name,
      type: fuelForm.type,
      pricePerLiter: fuelForm.pricePerLiter,
      availableQuantity: fuelForm.availableQuantity
    };

    const isEditing = !!editingFuel;
    const url = isEditing ? `/fuels/${editingFuel.id}` : '/fuels';
    const method = isEditing ? 'PUT' : 'POST';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || 'Błąd zapisu paliwa');
      }

      setSuccessNotice(isEditing ? 'Paliwo w katalogu zostało pomyślnie zaktualizowane' : 'Dodano pomyślnie nowe paliwo do katalogu');
      setShowFuelModal(false);
      fetchData();
    } catch (err: any) {
      setErrorNotice(`Błąd zapisu paliwa: ${err.message}`);
    }
  };

  const handleDeleteFuel = async (id: string) => {
    if (!confirm('Czy chcesz usunąć ten rodzaj paliwa? Zostanie odpięty ze wszystkich stacji.')) return;
    setErrorNotice(null);
    setSuccessNotice(null);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`/fuels/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || 'Błąd usuwania paliwa');
      }

      setSuccessNotice('Paliwo zostało usunięte z katalogu oraz stacji');
      fetchData();
    } catch (err: any) {
      setErrorNotice(`Wyjątek serwera: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // USER CREATION / REGISTRATION (POST /users)
  // -------------------------------------------------------------
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    setSuccessNotice(null);

    if (!userForm.username || !userForm.password || !userForm.email || !userForm.fullName) {
      setErrorNotice('Wszystkie pola są wymagane do rejestracji użytkownika');
      return;
    }

    try {
      const response = await fetch('/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userForm)
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || 'Błąd rejestracji');
      }

      setSuccessNotice(`Pomyślnie utworzono profil użytkownika '${userForm.username}'`);
      setShowUserModal(false);
      setUserForm({
        username: '',
        password: '',
        email: '',
        fullName: '',
        role: 'operator'
      });
      fetchData();
    } catch (err: any) {
      setErrorNotice(`Wystąpił wyjątek: ${err.message}`);
    }
  };

  const handleDeleteUserRef = async (id: string, username: string) => {
    if (!confirm(`Czy na pewno usunąć konto użytkownika ${username}?`)) return;
    setErrorNotice(null);
    setSuccessNotice(null);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`/users/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || 'Nie udało się usunąć użytkownika');
      }

      setSuccessNotice(`Usunięto konto użytkownika ${username}`);
      fetchData();
    } catch (err: any) {
      setErrorNotice(`Problem z serwerem: ${err.message}`);
    }
  };

  // Filter listings
  const filteredStations = stations.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(stationSearch.toLowerCase()) || 
                          st.city.toLowerCase().includes(stationSearch.toLowerCase()) || 
                          st.address.toLowerCase().includes(stationSearch.toLowerCase());
    
    const matchesCity = cityFilter === 'all' || st.city === cityFilter;
    const matchesFuel = fuelFilter === 'all' || st.fuels.some(sf => sf.fuelId === fuelFilter);

    return matchesSearch && matchesCity && matchesFuel;
  });

  // Extract cities list for filters
  const cities = Array.from(new Set(stations.map(s => s.city))) as string[];

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-[#e1e1e3] selection:bg-white selection:text-black">
      
      {/* 1. TOP HEADER NAVIGATION BLOCK */}
      <header className="h-20 border-b border-subtle px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 bg-[#0c0c0e]/80 backdrop-blur-md">
        <div className="max-w-7xl w-full mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white flex items-center justify-center rounded-sm shrink-0">
              <div className="w-5 h-5 border border-black rotate-45 flex items-center justify-center">
                <FuelIcon className="w-3.5 h-3.5 text-black -rotate-45" />
              </div>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase text-white">
                FUELREST <span className="text-zinc-500 font-normal">SYSTEM</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest leading-none mt-0.5">Management Console</p>
            </div>
          </div>

          {/* Authorization Display & Quick Controls */}
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-zinc-900/60 p-2 rounded-sm border border-subtle">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm">
                  <span className="status-dot-glow status-dot bg-emerald-500 w-2 h-2 rounded-full inline-block"></span>
                  <span className="text-[9px] uppercase font-bold text-emerald-500 tracking-tighter">Authorized ({currentUser.role})</span>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-[11px] font-medium text-white block leading-none">{currentUser.fullName}</span>
                  <span className="text-[9px] text-zinc-500 font-mono">{currentUser.email}</span>
                </div>
                <button
                  id="btn-logout"
                  onClick={handleLogout}
                  className="p-1.5 rounded hover:bg-zinc-800 text-rose-400 hover:text-rose-300 cursor-pointer"
                  title="Wyloguj ze stacji"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-bold text-zinc-500 hidden lg:flex items-center gap-1.5 tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> API: Tryb Gościa
                </span>
                
                {/* Micro Quick Login Buttons */}
                <div className="bg-zinc-900 border border-subtle rounded-sm p-1 flex gap-1 items-center">
                  <button 
                    id="btn-quick-admin"
                    onClick={() => handleQuickLogin('admin', 'admin123')}
                    className="text-[9px] bg-zinc-950 hover:bg-white hover:text-black border border-subtle hover:border-transparent text-zinc-400 font-bold px-2 py-1 rounded-sm uppercase tracking-wider transition-all duration-150"
                    title="Konto admin123"
                  >
                    + Admin
                  </button>
                  <button 
                    id="btn-quick-manager"
                    onClick={() => handleQuickLogin('manager', 'manager123')}
                    className="text-[9px] bg-zinc-950 hover:bg-white hover:text-black border border-subtle hover:border-transparent text-zinc-400 font-bold px-2 py-1 rounded-sm uppercase tracking-wider transition-all duration-150"
                    title="Konto manager123"
                  >
                    + Kierownik
                  </button>
                  <button 
                    id="btn-quick-operator"
                    onClick={() => handleQuickLogin('operator', 'operator123')}
                    className="text-[9px] bg-zinc-950 hover:bg-white hover:text-black border border-subtle hover:border-transparent text-zinc-400 font-bold px-2 py-1 rounded-sm uppercase tracking-wider transition-all duration-150"
                    title="Konto operator123"
                  >
                    + Op
                  </button>
                </div>

                <button
                  id="btn-trigger-login"
                  onClick={() => setShowLoginModal(true)}
                  className="text-[10px] px-3.5 py-1.5 border border-subtle hover:bg-white hover:text-black text-[#e1e1e3] transition-colors uppercase font-bold tracking-wider rounded-sm cursor-pointer"
                >
                  Zaloguj
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. SUB-NOTIFICATIONS (DISPLAYS LOGICAL SUCCESSES OR REST EXCEPTIONS) */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        {errorNotice && (
          <div id="error-notice-banner" className="bg-[#1c1112] border border-[#f43f5e]/25 text-rose-300 rounded-sm p-4 flex items-start gap-3 animate-slide-up">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-[10px] uppercase tracking-wider">Zapytanie odrzucone przez backend:</span>
              <p className="text-xs mt-1 text-zinc-400">{errorNotice}</p>
            </div>
            <button onClick={() => setErrorNotice(null)} className="text-zinc-500 hover:text-white text-xs font-bold px-2">✕</button>
          </div>
        )}

        {successNotice && (
          <div id="success-notice-banner" className="bg-[#101915] border border-emerald-500/20 text-emerald-300 rounded-sm p-4 flex items-start gap-3 animate-slide-up">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-[10px] uppercase tracking-wider">Sukces operacji REST:</span>
              <p className="text-xs mt-1 text-zinc-400">{successNotice}</p>
            </div>
            <button onClick={() => setSuccessNotice(null)} className="text-zinc-500 hover:text-white text-xs font-bold px-2">✕</button>
          </div>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        
        {/* 3. DYNAMIC STATS WIDGETS */}
        <OverviewStats stations={stations} fuels={fuels} currentUser={currentUser} />

        {/* 4. ACTIVE SUBTAB NAVIGATION SWITCH */}
        <div className="flex border-b border-subtle mb-8 overflow-x-auto gap-2 no-scrollbar">
          <button
            id="tab-stations"
            onClick={() => setActiveTab('stations')}
            className={`px-5 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all duration-150 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'stations' 
                ? 'border-white text-white bg-zinc-900/40' 
                : 'border-transparent text-zinc-500 hover:text-white hover:bg-zinc-900/20'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Stacje Paliw
          </button>
          <button
            id="tab-fuels"
            onClick={() => setActiveTab('fuels')}
            className={`px-5 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all duration-150 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'fuels' 
                ? 'border-white text-white bg-zinc-900/40' 
                : 'border-transparent text-zinc-500 hover:text-white hover:bg-zinc-900/20'
            }`}
          >
            <FuelIcon className="w-3.5 h-3.5" />
            Katalog Paliw
          </button>
          <button
            id="tab-users"
            onClick={() => setActiveTab('users')}
            className={`px-5 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all duration-150 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'users' 
                ? 'border-white text-white bg-zinc-900/40' 
                : 'border-transparent text-zinc-500 hover:text-white hover:bg-zinc-900/20'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Operatorzy
          </button>
          <button
            id="tab-api-docs"
            onClick={() => setActiveTab('apiDocs')}
            className={`px-5 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all duration-150 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'apiDocs' 
                ? 'border-white text-white bg-zinc-900/40' 
                : 'border-transparent text-zinc-500 hover:text-white hover:bg-zinc-900/20'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Interaktywne API
          </button>
          <button
            id="tab-audit-logs"
            onClick={() => setActiveTab('auditLogs')}
            className={`px-5 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all duration-150 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'auditLogs' 
                ? 'border-white text-white bg-zinc-900/40' 
                : 'border-transparent text-zinc-500 hover:text-white hover:bg-zinc-900/20'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Rejestr REST
          </button>

          <button
            id="tab-transactions"
            onClick={() => setActiveTab('transactions')}
            className={`px-5 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all duration-150 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'transactions' 
                ? 'border-white text-white bg-zinc-900/40' 
                : 'border-transparent text-zinc-500 hover:text-white hover:bg-zinc-900/20'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Rejestr Sprzedaży
          </button>
          
          <button
            onClick={fetchData}
            title="Odśwież dane"
            className="ml-auto px-4 text-zinc-500 hover:text-white border-b-2 border-transparent hover:bg-zinc-900/20 cursor-pointer flex items-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-white' : ''}`} />
          </button>
        </div>

        {/* -------------------------------------------------------------
            TAB CONTENT: STATIONS LIST & OPERATIONS
            ------------------------------------------------------------- */}
        {activeTab === 'stations' && (
          <div className="space-y-6">
            
            {/* Search filtering box with dynamic backend filters */}
            <div className="glass-card p-6 rounded-md flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="station-search-field"
                    type="text"
                    value={stationSearch}
                    onChange={(e) => setStationSearch(e.target.value)}
                    placeholder="Filtruj lokalnie po nazwie/adresie..."
                    className="w-full bg-zinc-950 text-xs text-zinc-300 pl-9 pr-4 py-2.5 border border-subtle rounded-sm focus:border-white focus:outline-none placeholder-zinc-700 font-sans"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    id="filter-city-select"
                    value={cityFilter}
                    onChange={(e) => { setCityFilter(e.target.value); setPageFilter(1); }}
                    className="bg-zinc-950 text-xs text-zinc-400 border border-subtle rounded-sm px-3 py-2.5 focus:border-white focus:outline-none"
                  >
                    <option value="all">Wszystkie Miasta</option>
                    <option value="Warszawa">Warszawa</option>
                    <option value="Kraków">Kraków</option>
                    <option value="Gdańsk">Gdańsk</option>
                    <option value="Poznań">Poznań</option>
                    <option value="Wrocław">Wrocław</option>
                    {cities.filter(c => !['Warszawa', 'Kraków', 'Gdańsk', 'Poznań', 'Wrocław'].includes(c)).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    id="filter-status-select"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPageFilter(1); }}
                    className="bg-zinc-950 text-xs text-zinc-400 border border-subtle rounded-sm px-3 py-2.5 focus:border-white focus:outline-none"
                  >
                    <option value="all">Wszystkie Statusy</option>
                    <option value="czynna">czynna</option>
                    <option value="nieczynna">nieczynna</option>
                  </select>

                  <select
                    id="filter-fuel-select"
                    value={fuelFilter}
                    onChange={(e) => { setFuelFilter(e.target.value); setPageFilter(1); }}
                    className="bg-zinc-950 text-xs text-zinc-400 border border-subtle rounded-sm px-3 py-2.5 focus:border-white focus:outline-none"
                  >
                    <option value="all">Wszelkie paliwa</option>
                    {fuels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>

                  <select
                    id="sort-by-select"
                    value={sortByFilter}
                    onChange={(e) => { setSortByFilter(e.target.value); setPageFilter(1); }}
                    className="bg-zinc-950 text-xs text-zinc-400 border border-subtle rounded-sm px-3 py-2.5 focus:border-white focus:outline-none"
                  >
                    <option value="name">Sortowanie: Nazwa A-Z</option>
                    <option value="city">Sortowanie: Miasto A-Z</option>
                    <option value="createdAt">Sortowanie: Data dodania</option>
                  </select>
                </div>
              </div>

              {/* Action trigger button */}
              <button
                id="btn-add-station"
                onClick={handleOpenCreateStation}
                className="bg-white hover:bg-zinc-200 text-black border border-transparent rounded-sm text-[10px] uppercase font-bold tracking-wider px-4 py-2.5 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Dodaj Stację
              </button>
            </div>

            {/* Empty stats screen */}
            {filteredStations.length === 0 ? (
              <div className="text-center py-20 glass-card rounded-md">
                <p className="text-xs uppercase tracking-widest text-zinc-400">Brak stacji paliw spełniających kryteria.</p>
              </div>
            ) : (
              <>
                <div id="stations-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStations.map(station => {
                  return (
                    <div 
                      key={station.id} 
                      className="glass-card rounded-md overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-all duration-300"
                    >
                      {/* Card main parameters */}
                      <div className="p-6 space-y-5">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h4 className="font-sans font-semibold text-sm uppercase tracking-wide text-white flex flex-wrap items-center gap-1.5">
                              <span>{station.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-bold font-mono ${
                                station.status === 'nieczynna' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {station.status || 'czynna'}
                              </span>
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1.5">
                              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>{station.address}, {station.city}</span>
                            </div>
                          </div>

                          <div className="bg-zinc-900 px-2.5 py-1 rounded-sm text-right shrink-0 border border-subtle">
                            <span className="block text-[8px] text-zinc-500 uppercase tracking-widest font-mono font-bold">Hours</span>
                            <span className="text-[10px] font-mono font-bold text-zinc-300 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                              {station.workingHours}
                            </span>
                          </div>
                        </div>

                        {/* Station fuel prices list */}
                        <div className="space-y-3 pt-3 border-t border-subtle">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500 block font-mono">Asortyment &amp; Ceny:</span>
                          {station.fuels.length === 0 ? (
                            <p className="text-xs text-zinc-500 italic">Brak przypisanych paliw na tej stacji.</p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2.5">
                              {station.fuels.map(sf => {
                                const matchedFuel = fuels.find(f => f.id === sf.fuelId);
                                const isLowStock = sf.availableQuantity < 2000;

                                return (
                                  <div key={sf.fuelId} className="bg-zinc-950/40 p-3 rounded-sm flex items-center justify-between border border-subtle">
                                    <div>
                                      <span className="text-xs font-bold text-[#e1e1e3] tracking-wide block">
                                        {matchedFuel?.name || sf.fuelId}
                                      </span>
                                      <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-tight mt-0.5 block">
                                        Typ: {matchedFuel?.type || 'inne'}
                                      </span>
                                    </div>

                                    <div className="text-right">
                                      <span className="font-mono text-xs font-bold text-white block">
                                        {sf.pricePerLiter.toFixed(2)} zł/L
                                      </span>
                                      <span className={`font-mono text-[9px] mt-0.5 block ${isLowStock ? 'text-rose-400 font-bold' : 'text-zinc-500'}`}>
                                        Zapas: {sf.availableQuantity.toLocaleString('pl-PL')} L
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Interactive fuel filling/purchase trigger section */}
                        {station.fuels.length > 0 && (
                          <div className="pt-4 border-t border-subtle">
                            {activeTxStationId === station.id ? (
                              <div className="bg-zinc-950 p-4 rounded-sm border border-zinc-800 space-y-3 text-xs">
                                <span className="block text-[9px] uppercase tracking-wider text-zinc-300 font-bold">Panel Tankowania Paliwa</span>
                                
                                <div>
                                  <label className="block text-[8px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Wybierz Paliwo:</label>
                                  <select
                                    value={txFuelId}
                                    onChange={(e) => setTxFuelId(e.target.value)}
                                    className="w-full bg-zinc-900 text-zinc-300 border border-subtle rounded-sm p-1.5 text-xs focus:border-white focus:outline-none"
                                  >
                                    <option value="">-- wybierz --</option>
                                    {station.fuels.map(sf => {
                                      const matchedFuel = fuels.find(f => f.id === sf.fuelId);
                                      return (
                                        <option key={sf.fuelId} value={sf.fuelId}>
                                          {matchedFuel?.name || sf.fuelId} - {sf.pricePerLiter.toFixed(2)} zł/L
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[8px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Litry (L):</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={txLiters}
                                      onChange={(e) => setTxLiters(Math.max(1, parseInt(e.target.value, 10) || 0))}
                                      className="w-full bg-zinc-900 text-zinc-300 border border-subtle rounded-sm p-1.5 text-xs font-mono focus:border-white focus:outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[8px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Suma PLN:</label>
                                    <div className="w-full h-[32px] bg-zinc-900 text-white font-mono p-1.5 border border-subtle rounded-sm flex items-center font-bold">
                                      {(() => {
                                        const selectedFuel = station.fuels.find(sf => sf.fuelId === txFuelId);
                                        return selectedFuel ? (selectedFuel.pricePerLiter * txLiters).toFixed(2) : '0.00';
                                      })()} zł
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[8px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Nabywca:</label>
                                  <input
                                    type="text"
                                    value={txBuyerName}
                                    onChange={(e) => setTxBuyerName(e.target.value)}
                                    placeholder="Nazwisko klienta"
                                    className="w-full bg-zinc-900 text-zinc-300 border border-subtle rounded-sm p-1.5 text-xs focus:border-white focus:outline-none"
                                  />
                                </div>

                                {txStatusMessage && (
                                  <div className="p-2 border border-rose-500/20 bg-rose-950/40 text-rose-300 text-[10px] uppercase font-bold tracking-wider rounded-sm text-center">
                                    {txStatusMessage}
                                  </div>
                                )}

                                {txSuccessMessage && (
                                  <div className="p-2 border border-emerald-500/20 bg-emerald-950/40 text-emerald-300 text-[10px] uppercase font-bold tracking-wider rounded-sm text-center">
                                    {txSuccessMessage}
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setActiveTxStationId(null);
                                      setTxStatusMessage(null);
                                      setTxSuccessMessage(null);
                                    }}
                                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 py-1.5 font-mono uppercase font-bold text-[9px] border border-subtle rounded-sm"
                                  >
                                    Anuluj
                                  </button>
                                  <button
                                    onClick={() => handlePurchaseFuel(station.id)}
                                    className="flex-1 bg-white hover:bg-zinc-300 text-black py-1.5 font-mono uppercase font-bold text-[9px] rounded-sm"
                                  >
                                    Potwierdź
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveTxStationId(station.id);
                                  setTxFuelId(station.fuels[0]?.fuelId || '');
                                  setTxLiters(30);
                                  setTxStatusMessage(null);
                                  setTxSuccessMessage(null);
                                }}
                                className="w-full py-2 bg-zinc-900 hover:bg-white hover:text-black border border-subtle text-[9px] uppercase font-bold tracking-widest text-zinc-400 rounded-sm text-center transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                Symuluj tankowanie paliwa
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Station actions bar (Require proper scope tokens optionally) */}
                      <div className="bg-zinc-950 px-6 py-4 border-t border-subtle flex justify-between items-center">
                        <span className="text-[10px] text-zinc-500 font-mono">ID: {station.id}</span>
                        
                        <div className="flex gap-2">
                          <button
                            id={`btn-edit-station-${station.id}`}
                            onClick={() => handleOpenEditStation(station)}
                            className="bg-zinc-900 hover:bg-white hover:text-black border border-subtle text-[10px] uppercase font-bold tracking-wider text-zinc-300 px-3 py-1.5 rounded-sm transition-all duration-150 cursor-pointer flex items-center gap-1"
                            title="Zarządzaj cenami i stanami paliw"
                          >
                            <Edit className="w-3 h-3" /> Edytuj
                          </button>
                          
                          <button
                            id={`btn-delete-station-${station.id}`}
                            onClick={() => handleDeleteStation(station.id)}
                            className="bg-[#241214] hover:bg-rose-955 hover:text-white border border-[#f43f5e]/25 text-rose-400 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded-sm cursor-pointer transition-all duration-150"
                            title="Usuń stację z systemu"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Robust pagination controls at the bottom of the grid */}
              <div className="flex flex-wrap justify-between items-center bg-zinc-950 p-4 border border-subtle rounded-md gap-4">
                <span className="text-[11px] font-mono text-zinc-500">
                  Strona {pageFilter} — Wyświetlono {filteredStations.length} stacji
                </span>
                <div className="flex gap-2">
                  <button 
                    id="btn-prev-page"
                    disabled={pageFilter <= 1}
                    onClick={() => setPageFilter(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 bg-zinc-900 border border-subtle hover:bg-white hover:text-black text-xs font-bold uppercase rounded-sm disabled:opacity-45 cursor-pointer flex items-center select-none"
                  >
                    « Poprzednia
                  </button>
                  <button 
                    id="btn-next-page"
                    disabled={filteredStations.length < limitFilter}
                    onClick={() => setPageFilter(prev => prev + 1)}
                    className="px-3 py-1.5 bg-zinc-900 border border-subtle hover:bg-white hover:text-black text-xs font-bold uppercase rounded-sm disabled:opacity-45 cursor-pointer flex items-center select-none"
                  >
                    Następna »
                  </button>
                </div>
              </div>
              </>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB CONTENT: FUELS CATALOGUE MANAGER
            ------------------------------------------------------------- */}
        {activeTab === 'fuels' && (
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="glass-card p-6 rounded-md flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-white">Centralny Magazyn i Katalog Paliw</h3>
              </div>

              <button
                id="btn-add-fuel"
                onClick={handleOpenCreateFuel}
                className="bg-white hover:bg-zinc-200 text-black border border-transparent rounded-sm text-[10px] uppercase font-bold tracking-wider px-4 py-2.5 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Nowe Paliwo
              </button>
            </div>

            {/* List fuels */}
            <div className="glass-card border-subtle rounded-md overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-900 border-b border-subtle text-zinc-500 font-mono uppercase tracking-widest text-[9px] font-bold">
                    <th className="px-6 py-4">Kod / Identyfikator</th>
                    <th className="px-6 py-4">Nazwa Paliwa</th>
                    <th className="px-6 py-4">Typ</th>
                    <th className="px-6 py-4">Sugerowana Cena</th>
                    <th className="px-6 py-4">Rezerwa Globalna</th>
                    <th className="px-6 py-4 text-right">Opcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                  {fuels.map(f => (
                    <tr key={f.id} className="hover:bg-zinc-900/20 font-sans">
                      <td className="px-6 py-4 font-mono text-zinc-500 text-[11px]">{f.id}</td>
                      <td className="px-6 py-4 text-white font-semibold text-xs">{f.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-sm text-[9px] font-mono uppercase border font-bold ${
                          f.type === 'benzyna' ? 'bg-[#10b981]/10 text-emerald-400 border-emerald-500/10' :
                          f.type === 'diesel' ? 'bg-[#6366f1]/10 text-indigo-400 border-indigo-500/10' :
                          f.type === 'LPG' ? 'bg-[#f59e0b]/10 text-amber-400 border-amber-500/10' :
                          'bg-zinc-900 text-zinc-300 border-subtle'
                        }`}>
                          {f.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-white font-medium text-xs">{f.pricePerLiter.toFixed(2)} zł</td>
                      <td className="px-6 py-4 font-mono text-zinc-400 text-xs">{f.availableQuantity.toLocaleString('pl-PL')} L</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          id={`btn-edit-fuel-${f.id}`}
                          onClick={() => handleOpenEditFuel(f)}
                          className="bg-zinc-900 hover:bg-white hover:text-black border border-subtle text-[10px] uppercase font-bold tracking-wider text-zinc-300 px-3 py-1.5 rounded-sm transition-all duration-150 cursor-pointer"
                        >
                          Zmień
                        </button>
                        <button
                          id={`btn-delete-fuel-${f.id}`}
                          onClick={() => handleDeleteFuel(f.id)}
                          className="bg-[#241214] hover:bg-rose-955 hover:text-white border border-[#f43f5e]/25 text-rose-400 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-sm cursor-pointer transition-all duration-150"
                        >
                          Usuń
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* -------------------------------------------------------------
            TAB CONTENT: USERS AND AUTH CREDENTIALS MANAGER
            ------------------------------------------------------------- */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            
            {/* Header section with register trigger */}
            <div className="glass-card p-6 rounded-md flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-white">Zarządzanie Operatorami i Uprawnieniami ról</h3>
              </div>

              <button
                id="btn-register-user"
                onClick={() => setShowUserModal(true)}
                className="bg-white hover:bg-zinc-200 text-black border border-transparent rounded-sm text-[10px] uppercase font-bold tracking-wider px-4 py-2.5 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" /> Rejestruj Konto
              </button>
            </div>

            {/* Users grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map(u => (
                <div key={u.id} className="glass-card rounded-md p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-zinc-500 font-mono">ID: {u.id}</span>
                      <span className={`text-[9px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded-sm border ${
                        u.role === 'admin' ? 'bg-[#ef4444]/10 text-rose-400 border-[#ef4444]/20' :
                        u.role === 'manager' ? 'bg-[#6366f1]/10 text-indigo-400 border-[#6366f1]/20' :
                        'bg-[#f59e0b]/10 text-amber-400 border-[#f59e0b]/20'
                      }`}>
                        {u.role}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-white text-sm uppercase tracking-wide leading-tight">{u.fullName}</h4>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{u.username}</p>
                    </div>

                    <div className="text-xs text-zinc-400 pt-3 border-t border-subtle font-sans space-y-1">
                      <span className="block font-mono text-[10px]">Email: {u.email}</span>
                      <span className="block text-zinc-500 text-[10px]">Skonfigurowano: {new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-subtle text-right">
                    <button
                      id={`btn-delete-user-${u.id}`}
                      onClick={() => handleDeleteUserRef(u.id, u.username)}
                      className="bg-[#241214] hover:bg-rose-955 hover:text-white border border-[#f43f5e]/25 text-rose-400 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-sm cursor-pointer transition-all duration-150"
                    >
                      Usuń konto
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* -------------------------------------------------------------
            TAB CONTENT: INTERACTIVE SWAGGER API DOCUMENTATION
            ------------------------------------------------------------- */}
        {activeTab === 'apiDocs' && (
          <div className="space-y-4">
            <div className="glass-card p-6 rounded-md">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white">Interaktywny Klient &amp; Dokumentacja REST OpenAPI</h3>
            </div>

            <ApiDocumentation token={token} />
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB CONTENT: AUDIT LOGS VIEW
            ------------------------------------------------------------- */}
        {activeTab === 'auditLogs' && (
          <div className="space-y-4">
            <div className="glass-card p-6 rounded-md flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-white">Logowanie Operacji REST &amp; Aktywności</h3>
              </div>
              <button
                onClick={fetchData}
                className="bg-zinc-900 hover:bg-white hover:text-black border border-subtle text-[10px] uppercase font-bold tracking-wider text-zinc-300 px-3.5 py-2 rounded-sm transition-all duration-150 cursor-pointer"
              >
                Odśwież Rejestr
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-zinc-500 text-xs uppercase tracking-widest py-16 text-center glass-card rounded-md">Brak dotychczasowych logów.</p>
            ) : (
              <div id="logs-container" className="glass-card border-subtle rounded-md p-6 overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto space-y-2.5 font-mono text-[11px] pr-2 scrollbar-thin">
                  {auditLogs.map((log) => {
                    return (
                      <div key={log.id} className="p-3.5 rounded-sm bg-zinc-950/40 border border-subtle flex flex-wrap justify-between items-start gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-bold">[{log.user}]</span>
                            <span className="bg-[#6366f1]/10 border border-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-sm text-[9px] uppercase font-bold tracking-wider">
                              {log.action}
                            </span>
                            <span className="text-zinc-300">{log.details}</span>
                          </div>
                          <span className="text-zinc-500 block text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <span className="text-zinc-600 text-[10px]">ID: {log.id}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB CONTENT: TRANSACTIONS LIST (REJESTR SPRZEDAŻY)
            ------------------------------------------------------------- */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-md flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-white">Rejestr Sprzedaży &amp; Kasa Cyfrowa</h3>
              </div>
              <button
                onClick={fetchData}
                className="bg-white hover:bg-zinc-200 text-black border border-transparent text-[10px] uppercase font-bold tracking-wider px-3.5 py-2 rounded-sm transition-colors cursor-pointer"
              >
                Sync Dane Silnika
              </button>
            </div>

            {/* Sales Sub-Tabs Navigations */}
            <div className="flex gap-2 border-b border-subtle pb-4">
              <button
                id="btn-sales-panel-toggle"
                onClick={() => setSalesTabMode('panel')}
                className={`px-5 py-2.5 text-[10px] uppercase font-bold tracking-wider rounded-sm transition-all duration-150 cursor-pointer ${
                  salesTabMode === 'panel'
                    ? 'bg-white text-black font-extrabold shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-subtle'
                }`}
              >
                🛒 Kasa i Nowa Sprzedaż
              </button>
              <button
                id="btn-sales-list-toggle"
                onClick={() => setSalesTabMode('list')}
                className={`px-5 py-2.5 text-[10px] uppercase font-bold tracking-wider rounded-sm transition-all duration-150 cursor-pointer ${
                  salesTabMode === 'list'
                    ? 'bg-white text-black font-extrabold shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-subtle'
                }`}
              >
                📋 Rejestr / Historia ({transactions.length})
              </button>
            </div>

            {/* PANEL: POS DIGITAL CASH FORM */}
            {salesTabMode === 'panel' && (
              <div id="sales-register-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Form configuration - 7 cols */}
                <div className="lg:col-span-7 glass-card p-6 rounded-md space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-1.5">
                      🛒 PANEL KASJERA — TRANZAKCJA SPRZEDAŻY
                    </h3>
                  </div>

                  <form onSubmit={handleCreateSale} className="space-y-4">
                    {/* Select Station */}
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5">1. Lokalizacja (Stacja):</label>
                      <select
                        id="sales-station-select"
                        value={salesStationId}
                        onChange={(e) => {
                          setSalesStationId(e.target.value);
                          setSalesError(null);
                          setSalesSuccess(null);
                        }}
                        className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none font-sans"
                      >
                        <option value="">-- wybierz stację --</option>
                        {stations.map(st => (
                          <option key={st.id} value={st.id}>{st.name} — {st.city}</option>
                        ))}
                      </select>
                    </div>

                    {/* Select Fuel (filtered based on Station) */}
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5">2. Asortyment i Stan paliwa:</label>
                      {(() => {
                        const stationObj = stations.find(s => s.id === salesStationId);
                        const availableFuels = stationObj ? stationObj.fuels : [];

                        return (
                          <div className="space-y-2">
                            <select
                              id="sales-fuel-select"
                              value={salesFuelId}
                              onChange={(e) => {
                                setSalesFuelId(e.target.value);
                                setSalesError(null);
                                setSalesSuccess(null);
                              }}
                              disabled={availableFuels.length === 0}
                              className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none focus:border-zinc-500 font-sans disabled:opacity-50"
                            >
                              <option value="">-- wybierz paliwo --</option>
                              {availableFuels.map(sf => {
                                const matchedFuel = fuels.find(f => f.id === sf.fuelId);
                                return (
                                  <option key={sf.fuelId} value={sf.fuelId}>
                                    {matchedFuel?.name || sf.fuelId} ({matchedFuel?.type}) — {sf.pricePerLiter.toFixed(2)} zł/L
                                  </option>
                                );
                              })}
                            </select>

                            {/* Stock and Price details */}
                            {salesFuelId && stationObj && (
                              (() => {
                                const sfObj = availableFuels.find(f => f.fuelId === salesFuelId);
                                if (sfObj) {
                                  const isLowStock = sfObj.availableQuantity < 1000;
                                  return (
                                    <div className="p-2.5 bg-zinc-950 border border-subtle rounded-sm flex justify-between items-center text-[10px] font-mono">
                                      <span className="text-zinc-500">Cena paliwa: <strong className="text-white font-bold">{sfObj.pricePerLiter.toFixed(2)} zł/L</strong></span>
                                      <span className={isLowStock ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                                        Aktualny zapas: <strong className="font-bold underline">{sfObj.availableQuantity.toLocaleString('pl-PL')} L</strong>
                                      </span>
                                    </div>
                                  );
                                }
                                return null;
                              })()
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Mode configuration: Liters vs PLN sum */}
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5">3. Sposób rozliczenia (Podaj litry lub za kwotę):</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSalesCalcType('liters')}
                          className={`py-2 px-3 text-[9px] uppercase font-bold tracking-wider rounded-sm transition-all border ${
                            salesCalcType === 'liters'
                              ? 'bg-zinc-800 text-white border-zinc-400 font-black'
                              : 'bg-zinc-950 text-zinc-500 border-subtle hover:text-white'
                          }`}
                        >
                        Litry (Tylko litraż)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSalesCalcType('price')}
                          className={`py-2 px-3 text-[9px] uppercase font-bold tracking-wider rounded-sm transition-all border ${
                            salesCalcType === 'price'
                              ? 'bg-zinc-800 text-white border-zinc-400 font-black'
                              : 'bg-zinc-950 text-zinc-500 border-subtle hover:text-white'
                          }`}
                        >
                          Kwota (Za określoną sumę)
                        </button>
                      </div>
                    </div>

                    {/* Quantity Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {salesCalcType === 'liters' ? (
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Litry do zatankowania (L):</label>
                          <input
                            type="number"
                            id="sales-liters-input"
                            min="0.1"
                            step="any"
                            required
                            value={salesLiters}
                            onChange={(e) => setSalesLiters(parseFloat(e.target.value) || 0)}
                            className="w-full bg-zinc-950 text-xs text-white border border-subtle rounded-sm p-3 focus:outline-none focus:border-white font-mono"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Żądana kwota (PLN):</label>
                          <input
                            type="number"
                            id="sales-amount-input"
                            min="1"
                            step="any"
                            required
                            value={salesAmountPLN}
                            onChange={(e) => setSalesAmountPLN(parseFloat(e.target.value) || 0)}
                            className="w-full bg-zinc-950 text-xs text-white border border-subtle rounded-sm p-3 focus:outline-none focus:border-white font-mono"
                          />
                        </div>
                      )}

                      {/* Display live values */}
                      <div className="bg-zinc-950 border border-subtle p-3 rounded-sm flex flex-col justify-center">
                        <span className="block text-[8px] text-zinc-500 uppercase tracking-widest font-bold font-mono">Ewidencja i Rozliczenie</span>
                        {(() => {
                          const stationObj = stations.find(s => s.id === salesStationId);
                          const sfObj = stationObj?.fuels.find(f => f.fuelId === salesFuelId);
                          if (sfObj) {
                            const price = sfObj.pricePerLiter;
                            if (salesCalcType === 'liters') {
                              const total = parseFloat((salesLiters * price).toFixed(2));
                              return (
                                <span className="text-[11px] font-mono text-emerald-400 mt-1 font-bold">
                                  {total.toFixed(2)} PLN
                                </span>
                              );
                            } else {
                              const estLiters = parseFloat((salesAmountPLN / price).toFixed(2));
                              return (
                                <span className="text-[11px] font-mono text-emerald-400 mt-1 font-bold">
                                  Ilość: {estLiters} Litra
                                </span>
                              );
                            }
                          }
                          return <span className="text-[10px] text-zinc-600 mt-1 font-mono">—</span>;
                        })()}
                      </div>
                    </div>

                    {/* Worker Selector & Buyer field */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Nabywca / Pojazd:</label>
                        <input
                          type="text"
                          id="sales-buyer-input"
                          value={salesBuyerName}
                          onChange={(e) => setSalesBuyerName(e.target.value)}
                          placeholder="Klient Indywidualny"
                          className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Pracownik obsługujący (1/2/3):</label>
                        <select
                          id="sales-worker-select"
                          value={salesWorker}
                          onChange={(e) => setSalesWorker(e.target.value)}
                          className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none"
                        >
                          <option value="Pracownik 1">Pracownik 1</option>
                          <option value="Pracownik 2">Pracownik 2</option>
                          <option value="Pracownik 3">Pracownik 3</option>
                        </select>
                      </div>
                    </div>

                    {/* Payment methods & Payment Result Toggler */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Metoda płatności:</label>
                        <select
                          id="sales-payment-select"
                          value={salesPaymentMethod}
                          onChange={(e) => setSalesPaymentMethod(e.target.value)}
                          className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none font-sans"
                        >
                          <option value="Gotówka">Gotówka (Cash)</option>
                          <option value="Karta">Karta Płatnicza (Card)</option>
                          <option value="Przelew">Przelew bankowy (Transfer)</option>
                          <option value="BLIK">BLIK (Mobile)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Próba autoryzacji platności:</label>
                        <select
                          id="sales-status-select"
                          value={salesStatus}
                          onChange={(e) => setSalesStatus(e.target.value as 'opłacona' | 'nieudana')}
                          className="w-full bg-zinc-950 text-xs border rounded-sm p-3 focus:outline-none font-sans font-bold"
                          style={{
                            borderColor: salesStatus === 'opłacona' ? '#10b981' : '#f43f5e',
                            color: salesStatus === 'opłacona' ? '#10b981' : '#f43f5e'
                          }}
                        >
                          <option value="opłacona" style={{ color: '#10b981', background: '#09090b' }}>Opłacona (Aktualizacja zapasów)</option>
                          <option value="nieudana" style={{ color: '#f43f5e', background: '#09090b' }}>Nieudana (Błąd transakcji)</option>
                        </select>
                      </div>
                    </div>

                    {salesError && (
                      <div className="p-3 bg-rose-950/40 border border-rose-500/20 text-rose-300 text-xs font-sans rounded-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{salesError}</span>
                      </div>
                    )}

                    {salesSuccess && (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-xs font-sans rounded-sm flex items-center gap-2 animate-pulse-subtle">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{salesSuccess}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      id="btn-sales-submit"
                      className="w-full bg-white hover:bg-zinc-200 text-black uppercase font-bold text-[10px] tracking-widest py-3.5 rounded-sm transition-all duration-150 cursor-pointer text-center block"
                    >
                    Zarejestruj transakcję
                    </button>
                  </form>
                </div>

                {/* Live mock receipt preview - 5 cols */}
                <div className="lg:col-span-5 flex flex-col items-center justify-start">
                  <span className="block text-[8px] text-zinc-500 uppercase tracking-widest font-mono font-bold mb-3">Paragon Kasowy (Live Preview)</span>
                  
                  <div className="w-full bg-neutral-900 border border-dashed border-zinc-700 p-6 rounded-md shadow-2xl space-y-4 font-mono text-[11px] text-zinc-300 leading-relaxed max-w-[340px]">
                    <div className="text-center space-y-1">
                      <h4 className="font-extrabold text-white text-[12px] tracking-wider uppercase">FUELREST SYSTEM</h4>
                      <p className="text-[9px] text-zinc-500">Kasa</p>
                      <p className="text-[10px] text-zinc-300 uppercase font-sans font-bold mt-2">
                        {(() => {
                          const matchedS = stations.find(s => s.id === salesStationId);
                          return matchedS ? matchedS.name : 'WYBIERZ STACJĘ';
                        })()}
                      </p>
                      <p className="text-[9px] text-zinc-500">
                        {(() => {
                          const matchedS = stations.find(s => s.id === salesStationId);
                          return matchedS ? `${matchedS.address}, ${matchedS.city}` : 'Lokalizacja';
                        })()}
                      </p>
                    </div>

                    <div className="border-t border-zinc-800 border-dashed pt-3.5 space-y-1 text-[9px]">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">KIEROWNIK KASY:</span>
                        <span className="text-zinc-100 uppercase font-bold">{salesWorker}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">PŁATNOŚĆ:</span>
                        <span className="text-zinc-100 uppercase font-bold">{salesPaymentMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">ODBIORCA:</span>
                        <span className="text-zinc-100 font-sans font-bold">{salesBuyerName || 'Klient Anonimowy'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">DATA I CZAS:</span>
                        <span className="text-zinc-400">{new Date().toLocaleString('pl-PL')}</span>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 border-dashed pt-3.5 space-y-1">
                      <div className="flex justify-between text-zinc-500 text-[9px] font-bold">
                        <span>POZYCJA / DETALE</span>
                        <span>SUMA</span>
                      </div>
                      <div className="flex justify-between text-white font-extrabold text-xs">
                        <span>
                          {(() => {
                            const activeFuel = fuels.find(f => f.id === salesFuelId);
                            return activeFuel ? activeFuel.name : 'PALIWO';
                          })()}
                        </span>
                        <span>
                          {(() => {
                            const stationObj = stations.find(s => s.id === salesStationId);
                            const sfObj = stationObj?.fuels.find(f => f.fuelId === salesFuelId);
                            if (sfObj) {
                              const price = sfObj.pricePerLiter;
                              if (salesCalcType === 'liters') {
                                return (salesLiters * price).toFixed(2);
                              } else {
                                return salesAmountPLN.toFixed(2);
                              }
                            }
                            return '0.00';
                          })()} PLN
                        </span>
                      </div>
                      <div className="text-[9px] text-zinc-500 flex justify-between pl-2">
                        <span>Mnożnik:</span>
                        <span>
                          {(() => {
                            const stationObj = stations.find(s => s.id === salesStationId);
                            const sfObj = stationObj?.fuels.find(f => f.fuelId === salesFuelId);
                            if (sfObj) {
                              const price = sfObj.pricePerLiter;
                              if (salesCalcType === 'liters') {
                                return `${salesLiters.toLocaleString('pl-PL')} L × ${price.toFixed(2)} zł`;
                              } else {
                                const estLiters = parseFloat((salesAmountPLN / price).toFixed(2));
                                return `${estLiters.toLocaleString('pl-PL')} L × ${price.toFixed(2)} zł`;
                              }
                            }
                            return '0 L × 0.00 zł';
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="border-t border-zinc-800 border-dashed pt-3 flex justify-between items-center text-xs">
                      <span className="text-white font-bold uppercase">RAZEM DO ZAPŁATY:</span>
                      <span className="text-base font-black text-emerald-400">
                        {(() => {
                          const stationObj = stations.find(s => s.id === salesStationId);
                          const sfObj = stationObj?.fuels.find(f => f.fuelId === salesFuelId);
                          if (sfObj) {
                            const price = sfObj.pricePerLiter;
                            if (salesCalcType === 'liters') {
                              return (salesLiters * price).toFixed(2);
                            } else {
                              return salesAmountPLN.toFixed(2);
                            }
                          }
                          return '0.00';
                        })()} zł
                      </span>
                    </div>

                    {/* Physical status stamp */}
                    <div className="py-2.5 flex justify-center">
                      {salesStatus === 'opłacona' ? (
                        <div className="border border-emerald-500/40 text-emerald-400 bg-emerald-500/5 rotate-[-2deg] px-3 py-1 font-mono uppercase tracking-wider text-[9px] font-extrabold text-center rounded-sm">
                        OPŁACONO
                        </div>
                      ) : (
                        <div className="border border-rose-500/40 text-rose-400 bg-rose-500/5 rotate-[-2deg] px-3 py-1 font-mono uppercase tracking-wider text-[9px] font-extrabold text-center rounded-sm">
                          PŁATNOŚĆ ODRZUCONA
                        </div>
                      )}
                    </div>

                    {/* CSS Barcode */}
                    <div className="flex flex-col items-center justify-center pt-3 border-t border-zinc-800 border-dashed">
                      <div className="flex h-7 gap-[2px] items-center">
                        <div className="w-[1px] h-full bg-zinc-600"></div>
                        <div className="w-[2px] h-full bg-zinc-600"></div>
                        <div className="w-[1px] h-full bg-zinc-600"></div>
                        <div className="w-[3px] h-full bg-zinc-600"></div>
                        <div className="w-[1px] h-full bg-zinc-600"></div>
                        <div className="w-[2px] h-full bg-zinc-600"></div>
                        <div className="w-[4px] h-full bg-zinc-600"></div>
                        <div className="w-[1px] h-full bg-zinc-600"></div>
                        <div className="w-[2px] h-full bg-zinc-600"></div>
                        <div className="w-[1px] h-full bg-zinc-600"></div>
                      </div>
                      <span className="text-[8px] tracking-[3px] mt-1 text-zinc-600 font-mono"></span>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* PANEL: POS RECORDIRG LIST / TRANSACTION HISTORY */}
            {salesTabMode === 'list' && (
              <>
                {transactions.length === 0 ? (
                  <p className="text-zinc-500 text-xs uppercase tracking-widest py-16 text-center glass-card rounded-md">Brak dotychczasowych transakcji tankowania.</p>
                ) : (
                  <div id="transactions-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...transactions].reverse().map((tx) => {
                      const matchedStation = stations.find(s => s.id === tx.stationId);
                      const matchedFuel = fuels.find(f => f.id === tx.fuelId);
                      const paymentMethod = tx.paymentMethod || 'Karta/Flota';
                      const worker = tx.worker || 'System';
                      const isPaid = tx.status !== 'nieudana';

                      return (
                        <div 
                          key={tx.id} 
                          className="glass-card rounded-md p-6 space-y-4 hover:border-zinc-700 transition-all duration-300 relative overflow-hidden"
                          style={{
                            borderLeft: isPaid ? '2px solid rgba(16, 185, 129, 0.3)' : '2px solid rgba(244, 63, 94, 0.4)'
                          }}
                        >
                          {/* Corner status stamp */}
                          <div className="absolute right-0 top-0 pr-6 pt-6">
                            {isPaid ? (
                              <span className="bg-emerald-500/10 border border-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-sm text-[8px] uppercase tracking-wider font-extrabold font-mono">
                                OPŁACONA
                              </span>
                            ) : (
                              <span className="bg-rose-500/10 border border-rose-500/10 text-rose-400 px-2.5 py-1 rounded-sm text-[8px] uppercase tracking-wider font-extrabold font-mono">
                                ANULOWANA
                              </span>
                            )}
                          </div>

                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Kwit Tankowania</span>
                              <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-white mt-1 pt-0.5">
                                {matchedStation ? matchedStation.name : `Stacja ID: ${tx.stationId}`}
                              </h4>
                              <span className="text-[10px] text-zinc-400 font-mono block mt-1">
                                Klient / Kierowca: <strong className="text-zinc-200">{tx.buyerName}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-subtle pt-3.5 space-y-2 text-xs text-zinc-400">
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Paliwo:</span>
                              <span className="text-white font-mono font-bold">{matchedFuel ? matchedFuel.name : tx.fuelName || tx.fuelId}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Metraż (Ilość litrów):</span>
                              <span className="text-white font-mono font-bold">{(tx.liters || 0).toLocaleString('pl-PL')} L</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Wartość:</span>
                              <span className="text-emerald-400 font-mono font-bold font-extrabold">{(tx.totalPrice || 0).toFixed(2)} zł</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Sposób zapłaty:</span>
                              <span className="text-zinc-300 font-bold uppercase tracking-wider text-[9px]">{paymentMethod}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-zinc-950/40">
                              <span className="text-zinc-500">Kasjer / Operator:</span>
                              <span className="text-zinc-400 font-mono font-bold text-[10px]">{worker}</span>
                            </div>
                          </div>

                          <div className="border-t border-subtle pt-3 text-[10px] text-zinc-500 flex justify-between items-center font-mono">
                            <span>ID: {tx.id.substring(0, 8)}...</span>
                            <span>{new Date(tx.timestamp || tx.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

          </div>
        )}

      </main>

      {/* =============================================================
          MODAL: LOGIN POPUP
          ============================================================= */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c0c0e] border border-subtle rounded-sm p-8 w-full max-w-sm space-y-6 relative shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-subtle">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-400" /> Autoryzacja REST JWT
              </h3>
              <button onClick={() => setShowLoginModal(false)} className="text-zinc-500 hover:text-white transition-colors text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5">Nazwa użytkownika (login)</label>
                <input
                  id="login-username-input"
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="np. admin lub operator"
                  className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none placeholder-zinc-700 font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5">Hasło</label>
                <input
                  id="login-password-input"
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="np. admin123"
                  className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none placeholder-zinc-700 font-sans"
                />
              </div>

              <div className="pt-2">
                <button
                  id="btn-login-submit"
                  type="submit"
                  className="w-full bg-white hover:bg-zinc-200 text-black border border-transparent rounded-sm text-[10px] uppercase font-bold tracking-wider py-3 transition-colors cursor-pointer"
                >
                  Zaloguj się
                </button>
              </div>
            </form>

            <div className="text-center pt-4 border-t border-subtle">
              <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 block">Domyślne konta testowe:</span>
              <span className="text-[10px] font-mono text-zinc-300 block mt-1">admin / admin123</span>
              <span className="text-[10px] font-mono text-zinc-400 block">manager / manager123</span>
            </div>
          </div>
        </div>
      )}


      {/* =============================================================
          MODAL: FUEL STATION DETAIL / EDIT POPUP
          ============================================================= */}
      {showStationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#0c0c0e] border border-subtle rounded-sm p-8 w-full max-w-lg space-y-6 my-8 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-subtle">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">
                {editingStation ? `Zarządzanie Stacją : ${editingStation.name}` : 'Dodaj Nową Stację Paliw'}
              </h3>
              <button onClick={() => setShowStationModal(false)} className="text-zinc-500 hover:text-white transition-colors text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveStation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5">Nazwa stacji</label>
                  <input
                    id="form-station-name"
                    type="text"
                    required
                    value={stationForm.name}
                    onChange={(e) => setStationForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="np. Orlen Warszawa"
                    className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-2.5 focus:border-white focus:outline-none placeholder-zinc-755 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5">Ulica i numer</label>
                  <input
                    id="form-station-address"
                    type="text"
                    required
                    value={stationForm.address}
                    onChange={(e) => setStationForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="np. ul. Mozaikowa 142"
                    className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-2.5 focus:border-white focus:outline-none placeholder-zinc-755 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5">Miasto</label>
                  <input
                    id="form-station-city"
                    type="text"
                    required
                    value={stationForm.city}
                    onChange={(e) => setStationForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="np. Warszawa"
                    className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-2.5 focus:border-white focus:outline-none placeholder-zinc-755 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5">Godziny Otwarcia</label>
                  <input
                    id="form-station-hours"
                    type="text"
                    required
                    value={stationForm.workingHours}
                    onChange={(e) => setStationForm(prev => ({ ...prev, workingHours: e.target.value }))}
                    placeholder="np. 24/7 lub 06:00 - 22:00"
                    className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-2.5 focus:border-white focus:outline-none placeholder-zinc-755 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5">Status stacji</label>
                  <select
                    id="form-station-status"
                    value={stationForm.status}
                    onChange={(e) => setStationForm(prev => ({ ...prev, status: e.target.value as 'czynna' | 'nieczynna' }))}
                    className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-2.5 focus:border-white focus:outline-none font-sans"
                  >
                    <option value="czynna">czynna</option>
                    <option value="nieczynna">nieczynna</option>
                  </select>
                </div>
              </div>

              {/* Sub-section: Assign fuels and edit stations parameters */}
              <div className="pt-4 border-t border-subtle space-y-4">
                <span className="block text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Dostępne paliwa, ceny i zapasy:</span>
                
                {/* Micro selector */}
                <div className="bg-zinc-950/40 p-4 rounded-sm border border-subtle space-y-2.5">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono font-bold">Dołącz paliwo z katalogu centralnego dla tej stacji:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {fuels.map(f => {
                      const isAssigned = stationForm.fuels.some(asf => asf.fuelId === f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          disabled={isAssigned}
                          onClick={() => handleAddFuelToStationForm(f.id)}
                          className={`text-[9px] tracking-wider uppercase font-bold px-3 py-1.5 rounded-sm transition-all cursor-pointer ${
                            isAssigned 
                              ? 'bg-zinc-900 border border-zinc-800 text-zinc-650' 
                              : 'bg-zinc-950 hover:bg-white hover:text-black text-zinc-300 border border-subtle'
                          }`}
                        >
                          + {f.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-Form active fuels pricing inputs */}
                {stationForm.fuels.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic text-center py-2">Nie wybrano żadnego rodzaju paliwa.</p>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                    {stationForm.fuels.map((sf) => {
                      const matFuel = fuels.find(f => f.id === sf.fuelId);
                      return (
                        <div key={sf.fuelId} className="bg-zinc-950 p-3 rounded-sm border border-subtle flex items-center justify-between gap-3 text-xs">
                          <div className="w-[100px]">
                            <span className="font-bold text-white block text-xs">{matFuel?.name || sf.fuelId}</span>
                            <span className="text-[9px] text-zinc-500 uppercase tracking-tight font-mono mt-0.5 block">{matFuel?.type || 'inne'}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div>
                              <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono font-bold mb-1">Cena zł/L</span>
                              <input
                                type="number"
                                step="0.01"
                                required
                                value={sf.pricePerLiter}
                                onChange={(e) => handleUpdateFuelInStationForm(sf.fuelId, { pricePerLiter: parseFloat(e.target.value) || 0 })}
                                className="w-[80px] bg-zinc-900 text-xs text-zinc-300 border border-subtle rounded-sm p-1.5 focus:border-white focus:outline-none"
                              />
                            </div>

                            <div>
                              <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono font-bold mb-1">Pojemność L</span>
                              <input
                                type="number"
                                step="100"
                                required
                                value={sf.availableQuantity}
                                onChange={(e) => handleUpdateFuelInStationForm(sf.fuelId, { availableQuantity: parseInt(e.target.value) || 0 })}
                                className="w-[95px] bg-zinc-900 text-xs text-zinc-300 border border-subtle rounded-sm p-1.5 focus:border-white focus:outline-none"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFuelFromStationForm(sf.fuelId)}
                            className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
                            title="Usuń"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-subtle flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStationModal(false)}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-subtle text-zinc-400 text-[10px] uppercase font-bold tracking-wider px-4 py-2 rounded-sm transition-colors cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  id="btn-save-station-form"
                  type="submit"
                  className="bg-white hover:bg-zinc-200 text-black border border-transparent text-[10px] uppercase font-bold tracking-wider px-5 py-2 rounded-sm transition-colors cursor-pointer"
                >
                  {editingStation ? 'Zapisz Zmiany' : 'Utwórz Stację'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* =============================================================
          MODAL: ADD/EDIT FUEL IN CATALOGUE
          ============================================================= */}
      {showFuelModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c0c0e] border border-subtle rounded-sm p-8 w-full max-w-md space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-subtle">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">
                {editingFuel ? `Modyfikuj paliwo: ${editingFuel.name}` : 'Nowy rodzaj paliwa w katalogu'}
              </h3>
              <button onClick={() => setShowFuelModal(false)} className="text-zinc-500 hover:text-white transition-colors text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveFuel} className="space-y-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 font-sans">Nazwa paliwa</label>
                <input
                  id="form-fuel-name"
                  type="text"
                  required
                  disabled={!!editingFuel}
                  value={fuelForm.name}
                  onChange={(e) => setFuelForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="np. Pb95 Super, Ekodiesel, LPG Pro"
                  className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none placeholder-[#3f3f46] disabled:opacity-40 font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 font-sans">Typ</label>
                <select
                  id="form-fuel-type"
                  value={fuelForm.type}
                  onChange={(e) => setFuelForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none font-sans"
                >
                  <option value="benzyna">Benzyna</option>
                  <option value="diesel">Diesel (ON)</option>
                  <option value="LPG">LPG</option>
                  <option value="inne">Inne (AdBlue, wodór itp.)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 font-sans">Sugerowana cena (zł/L)</label>
                  <input
                    id="form-fuel-price"
                    type="number"
                    step="0.01"
                    required
                    value={fuelForm.pricePerLiter}
                    onChange={(e) => setFuelForm(prev => ({ ...prev, pricePerLiter: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 font-sans">Zapas rezerwowy (L)</label>
                  <input
                    id="form-fuel-qty"
                    type="number"
                    step="500"
                    required
                    value={fuelForm.availableQuantity}
                    onChange={(e) => setFuelForm(prev => ({ ...prev, availableQuantity: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none font-sans"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-subtle flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFuelModal(false)}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-subtle text-zinc-400 text-[10px] uppercase font-bold tracking-wider px-4 py-2 rounded-sm transition-colors cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  id="btn-save-fuel-form"
                  type="submit"
                  className="bg-white hover:bg-zinc-200 text-black border border-transparent text-[10px] uppercase font-bold tracking-wider px-5 py-2 rounded-sm transition-colors cursor-pointer"
                >
                  Zapisz Paliwo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* =============================================================
          MODAL: CREATE OPERATOR / REGISTER USER (POST /users)
          ============================================================= */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c0c0e] border border-subtle rounded-sm p-8 w-full max-w-md space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-subtle">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">Rejestracja nowego operatora</h3>
              <button onClick={() => setShowUserModal(false)} className="text-zinc-500 hover:text-white transition-colors text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 font-sans">Nazwa użytkownika (login)</label>
                <input
                  id="form-user-username"
                  type="text"
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="np. mariusz_op"
                  className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none placeholder-[#3f3f46] font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 font-sans">Hasło dostępu (minimum 6 znaków)</label>
                <input
                  id="form-user-password"
                  type="password"
                  required
                  value={userForm.password}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Utwórz bezpieczne hasło"
                  className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none placeholder-[#3f3f46] font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 font-sans">Adres E-mail</label>
                <input
                  id="form-user-email"
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="np. operator@vizja.pl"
                  className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none placeholder-[#3f3f46] font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 font-sans">Imię i Nazwisko</label>
                <input
                  id="form-user-fullname"
                  type="text"
                  required
                  value={userForm.fullName}
                  onChange={(e) => setUserForm(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="np. Mariusz Kowal"
                  className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none placeholder-[#3f3f46] font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 font-sans">Rola zabezpieczeń wejściowych</label>
                <select
                  id="form-user-role"
                  value={userForm.role}
                  onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full bg-zinc-950 text-xs text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none font-sans"
                >
                  <option value="operator">Operator (podgląd i zmiana asortymentu stacji)</option>
                  <option value="manager">Kierownik (paliwa, stacje i operatorzy)</option>
                  <option value="admin">Administrator (pełne uprawnienia systemu)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-subtle flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-subtle text-zinc-400 text-[10px] uppercase font-bold tracking-wider px-4 py-2 rounded-sm transition-colors cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  id="btn-save-user-form"
                  type="submit"
                  className="bg-white hover:bg-zinc-200 text-black border border-transparent text-[10px] uppercase font-bold tracking-wider px-5 py-2 rounded-sm transition-colors cursor-pointer"
                >
                  Utwórz Użytkownika
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
