import { useState } from 'react';
import { Send, KeyRound, Database, RefreshCw, Layers } from 'lucide-react';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  requiresAuth: string;
  requestBodyExample?: string;
  responseCodes: { code: number; desc: string }[];
}

export default function ApiDocumentation({ token }: { token: string | null }) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<number | null>(null);
  const [customBody, setCustomBody] = useState<string>('');
  const [customParam, setCustomParam] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<{ status: number; data: any } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const endpoints: Endpoint[] = [
    {
      method: 'POST',
      path: '/auth/login',
      description: 'Logowanie do systemu. Zwraca token JWT oraz dane zalogowanego użytkownika.',
      requiresAuth: 'Brak',
      requestBodyExample: JSON.stringify({ username: 'admin', password: 'admin123' }, null, 2),
      responseCodes: [
        { code: 200, desc: 'Zalogowano pomyślnie. Zwraca token JWT.' },
        { code: 400, desc: 'Brak wymaganych parametrów (username/password).' },
        { code: 401, desc: 'Błędny login lub hasło.' }
      ]
    },
    {
      method: 'GET',
      path: '/stations',
      description: 'Pobiera listę wszystkich stacji paliw. Obsługuje opcjonalne parametry filtrowania/stronicowania (city, status, fuelId, page, limit, sortBy).',
      requiresAuth: 'Brak',
      responseCodes: [
        { code: 200, desc: 'Lista stacji pobrana pomyślnie.' }
      ]
    },
    {
      method: 'GET',
      path: '/stations/:id',
      description: 'Pobiera szczegółowe informacje o wybranej stacji paliw podając jej ID.',
      requiresAuth: 'Brak',
      responseCodes: [
        { code: 200, desc: 'Informacje o stacji pobrane pomyślnie.' },
        { code: 404, desc: 'Stacja o podanym ID nie istnieje.' }
      ]
    },
    {
      method: 'POST',
      path: '/stations',
      description: 'Dodaje nową stację paliw do systemu (tylko administrator).',
      requiresAuth: 'Tylko Admin (isAdmin)',
      requestBodyExample: JSON.stringify({
        name: 'MOL Gdańsk Oliwa',
        address: 'ul. Grunwaldzka 400',
        city: 'Gdańsk',
        workingHours: '24/7',
        status: 'czynna',
        fuels: [
          { fuelId: 'fuel_pb95', pricePerLiter: 6.43, availableQuantity: 8500 },
          { fuelId: 'fuel_on', pricePerLiter: 6.52, availableQuantity: 9000 }
        ]
      }, null, 2),
      responseCodes: [
        { code: 201, desc: 'Stacja dodana pomyślnie.' },
        { code: 400, desc: 'Błąd walidacji pól wejściowych.' },
        { code: 401, desc: 'Brak autoryzacji / nieprawidłowy token JWT.' },
        { code: 403, desc: 'Brak uprawnień administratora.' }
      ]
    },
    {
      method: 'PUT',
      path: '/stations/:id',
      description: 'Modyfikuje dane stacji, aktualizuje ceny, status ("czynna" lub "nieczynna") lub zasoby paliw (tylko administrator).',
      requiresAuth: 'Tylko Admin (isAdmin)',
      requestBodyExample: JSON.stringify({
        workingHours: '05:00 - 23:00',
        status: 'nieczynna',
        fuels: [
          { fuelId: 'fuel_pb95', pricePerLiter: 6.48, availableQuantity: 12000 }
        ]
      }, null, 2),
      responseCodes: [
        { code: 200, desc: 'Dane stacji zaktualizowane.' },
        { code: 400, desc: 'Błędne wartości cen lub ilości.' },
        { code: 404, desc: 'Nie znaleziono stacji.' }
      ]
    },
    {
      method: 'DELETE',
      path: '/stations/:id',
      description: 'Usuwa stację paliw o podanym identyfikatorze (Tylko dla administratora).',
      requiresAuth: 'Tylko Admin (isAdmin)',
      responseCodes: [
        { code: 204, desc: 'Stacja usunięta pomyślnie (brak zawartości odpowiedzi).' },
        { code: 404, desc: 'Stacja o podanym ID nie istnieje.' }
      ]
    },
    {
      method: 'GET',
      path: '/fuels',
      description: 'Pobiera listę wszystkich predefiniowanych rodzajów paliw w katalogu.',
      requiresAuth: 'Brak',
      responseCodes: [
        { code: 200, desc: 'Dane pobrane pomyślnie.' }
      ]
    },
    {
      method: 'POST',
      path: '/fuels',
      description: 'Dodaje nowy rodzaj paliwa do globalnego katalogu.',
      requiresAuth: 'Tylko Admin (isAdmin)',
      requestBodyExample: JSON.stringify({
        name: 'AdBlue Premium',
        type: 'inne',
        pricePerLiter: 3.85,
        availableQuantity: 4000
      }, null, 2),
      responseCodes: [
        { code: 201, desc: 'Nowe paliwo utworzone pomyślnie.' },
        { code: 400, desc: 'Nazwa już istnieje lub nieprawidłowe dane.' }
      ]
    },
    {
      method: 'POST',
      path: '/stations/:id/transactions',
      description: 'Realizuje transakcję zakupu/tankowania paliwa dla wskazanej stacji. Odejmuje ilość litrów od dostępnego zasobu stacji.',
      requiresAuth: 'JWT (dowolny zalogowany użytkownik)',
      requestBodyExample: JSON.stringify({
        fuelId: 'fuel_pb95',
        liters: 35,
        buyerName: 'Marian Kowal'
      }, null, 2),
      responseCodes: [
        { code: 210, desc: 'Transakcja zrealizowana pomyślnie (zwraca paragon).' },
        { code: 400, desc: 'Brak wystarczającej ilości paliwa lub stacja jest nieczynna.' },
        { code: 404, desc: 'Nieznana stacja lub nieobsługiwany typ paliwa.' }
      ]
    },
    {
      method: 'GET',
      path: '/stations/:id/transactions',
      description: 'Zwraca historię transakcji (tankowań) dla wybranej stacji benzynowej.',
      requiresAuth: 'Brak',
      responseCodes: [
        { code: 200, desc: 'Historia tankowań dla stacji pobrana.' }
      ]
    },
    {
      method: 'GET',
      path: '/transactions',
      description: 'Pobiera kompletną listę wszystkich operacji tankowania zrealizowanych na wszystkich stacjach w systemie.',
      requiresAuth: 'Brak',
      responseCodes: [
        { code: 200, desc: 'Zwraca pełny rejestr sprzedaży.' }
      ]
    },
    {
      method: 'GET',
      path: '/api/logs',
      description: 'Zwraca pełny rejestr operacji nadzorczych (audit logs) systemu, np. logowanie, dodanie stacji, usunięcie.',
      requiresAuth: 'Tylko Admin (isAdmin)',
      responseCodes: [
        { code: 200, desc: 'Zwraca listę audit logów.' }
      ]
    },
    {
      method: 'GET',
      path: '/users',
      description: 'Zwraca listę zarejestrowanych użytkowników w systemie (brak haseł).',
      requiresAuth: 'Tylko Admin (isAdmin)',
      responseCodes: [
        { code: 200, desc: 'Lista pobrana pomyślnie.' }
      ]
    },
    {
      method: 'POST',
      path: '/users',
      description: 'Rejestruje nowego użytkownika w systemie.',
      requiresAuth: 'Tylko Admin (isAdmin)',
      requestBodyExample: JSON.stringify({
        username: 'nowyUser',
        password: 'haslo123',
        email: 'user@vizja.pl',
        fullName: 'Krzysztof Kowal',
        isAdmin: false
      }, null, 2),
      responseCodes: [
        { code: 201, desc: 'Konto utworzone pomyślnie.' },
        { code: 400, desc: 'Login/E-mail zajęty lub niepełna walidacja.' }
      ]
    }
  ];

  const handleSelect = (idx: number) => {
    setSelectedEndpoint(idx);
    setApiResponse(null);
    setCustomBody(endpoints[idx].requestBodyExample || '');
    // Auto-fill path param if needed
    if (endpoints[idx].path.includes(':id')) {
      if (endpoints[idx].path.startsWith('/stations')) {
        setCustomParam('st_warszawa');
      } else if (endpoints[idx].path.startsWith('/fuels')) {
        setCustomParam('fuel_pb95');
      } else if (endpoints[idx].path.startsWith('/users')) {
        setCustomParam('usr_operator');
      }
    } else {
      setCustomParam('');
    }
  };

  const handleTryIt = async (endpoint: Endpoint) => {
    setLoading(true);
    setApiResponse(null);

    // Build URL path
    let targetPath = endpoint.path;
    if (targetPath.includes(':id')) {
      targetPath = targetPath.replace(':id', customParam || 'st_warszawa');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method: endpoint.method,
      headers
    };

    if (['POST', 'PUT'].includes(endpoint.method) && customBody) {
      options.body = customBody;
    }

    try {
      const response = await fetch(targetPath, options);
      const status = response.status;
      let data = null;

      if (status !== 204) {
        try {
          data = await response.json();
        } catch {
          data = { message: 'Brak danych JSON w odpowiedzi' };
        }
      } else {
        data = { message: 'Sukces - Kod 204 No Content (Brak zawartości)' };
      }

      setApiResponse({ status, data });
    } catch (err: any) {
      setApiResponse({ status: 500, data: { error: 'Network Error', message: err.message } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="api-doc-view" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Endpoints sidebar navigation */}
      <div className="lg:col-span-4 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#e1e1e3] mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-zinc-400" />
          Katalog Endpointów REST API
        </h3>
        
        <div className="max-h-[550px] overflow-y-auto space-y-2.5 pr-2">
          {endpoints.map((ep, idx) => {
            const isSelected = selectedEndpoint === idx;
            const methodBg = 
              ep.method === 'GET' ? 'bg-[#10b981]/10 text-emerald-400 border-emerald-500/10' :
              ep.method === 'POST' ? 'bg-[#6366f1]/10 text-indigo-400 border-indigo-500/10' :
              ep.method === 'PUT' ? 'bg-[#f59e0b]/10 text-amber-400 border-amber-500/10' :
              'bg-[#f43f5e]/10 text-rose-400 border-rose-500/10';

            return (
              <button
                id={`endpoint-btn-${idx}`}
                key={idx}
                onClick={() => handleSelect(idx)}
                className={`w-full text-left p-4 rounded-md border transition-all duration-200 block ${
                  isSelected 
                    ? 'bg-zinc-900 border-white text-white' 
                    : 'glass-card border-subtle text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border font-bold ${methodBg}`}>
                    {ep.method}
                  </span>
                  <span className={`font-mono text-xs font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                    {ep.path}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-1">{ep.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Endpoint detailed preview & dynamic console */}
      <div className="lg:col-span-8">
        {selectedEndpoint === null ? (
          <div className="glass-card rounded-md p-10 text-center flex flex-col items-center justify-center h-[400px]">
            <Layers className="w-10 h-10 text-zinc-600 mb-4 animate-pulse" />
            <p className="text-xs text-zinc-400 max-w-md uppercase tracking-wider leading-relaxed">
              Wybierz dowolny endpoint REST API z panelu bocznego, aby zobaczyć szczegóły, zapoznać się ze strukturą DTO i przetestować działanie na żywo!
            </p>
          </div>
        ) : (
          <div className="glass-card rounded-md p-6 space-y-6">
            {/* Title / Action Header */}
            <div className="pb-5 border-b border-subtle flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className={`text-[10px] uppercase tracking-wider font-mono font-bold px-2.5 py-1 rounded-sm border ${
                    endpoints[selectedEndpoint].method === 'GET' ? 'bg-[#10b981]/10 text-emerald-400 border-emerald-500/10' :
                    endpoints[selectedEndpoint].method === 'POST' ? 'bg-[#6366f1]/10 text-indigo-400 border-indigo-500/10' :
                    endpoints[selectedEndpoint].method === 'PUT' ? 'bg-[#f59e0b]/10 text-amber-400 border-amber-500/10' :
                    'bg-[#f43f5e]/10 text-rose-400 border-rose-500/10'
                  }`}>
                    {endpoints[selectedEndpoint].method}
                  </span>
                  <h4 className="font-mono text-sm font-semibold tracking-wide text-white">
                    {endpoints[selectedEndpoint].path}
                  </h4>
                </div>
                <p className="text-xs text-zinc-400">
                  {endpoints[selectedEndpoint].description}
                </p>
              </div>

              <div className="text-right text-[10px] uppercase font-bold tracking-wider">
                <span className="text-zinc-500 block mb-1">Dostęp</span>
                <span className="text-zinc-300 flex items-center gap-1.5 justify-end bg-zinc-900 border border-subtle px-2 py-0.5 rounded-sm">
                  <KeyRound className="w-3 h-3 text-zinc-400" />
                  {endpoints[selectedEndpoint].requiresAuth}
                </span>
              </div>
            </div>

            {/* Path parameter input if applies */}
            {endpoints[selectedEndpoint].path.includes(':id') && (
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1.5 tracking-wider">
                  Parametr :id w ścieżce
                </label>
                <input
                  id="api-param-input"
                  type="text"
                  value={customParam}
                  onChange={(e) => setCustomParam(e.target.value)}
                  placeholder="Dowolny identyfikator, np. st_warszawa"
                  className="w-full bg-zinc-950 text-xs font-mono text-zinc-300 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none placeholder-zinc-700"
                />
              </div>
            )}

            {/* Request Body Editor if POST or PUT */}
            {['POST', 'PUT'].includes(endpoints[selectedEndpoint].method) && (
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1.5 flex justify-between tracking-wider">
                  <span>Struktura JSON żądania (DTO)</span>
                  <span className="text-[10px] text-zinc-600 font-mono italic">edytowalny JSON</span>
                </label>
                <textarea
                  id="api-body-textarea"
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  rows={6}
                  className="w-full bg-zinc-950 text-xs font-mono text-emerald-400 border border-subtle rounded-sm p-3 focus:border-white focus:outline-none"
                />
              </div>
            )}

            {/* Expected Status Codes */}
            <div>
              <span className="block text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-2">Kody i format komunikacji:</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {endpoints[selectedEndpoint].responseCodes.map((rc, rcIdx) => (
                  <div key={rcIdx} className="bg-zinc-950 p-2.5 rounded-sm border border-subtle text-left">
                    <span className={`font-mono text-xs font-bold mr-1.5 ${
                      rc.code >= 200 && rc.code < 300 ? 'text-emerald-400' :
                      rc.code >= 400 && rc.code < 500 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {rc.code}
                    </span>
                    <span className="text-[10px] text-zinc-400">{rc.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trigger Button & Security Warning */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-subtle">
              <div className="text-[10px] uppercase font-bold tracking-wider">
                {token ? (
                  <span className="text-emerald-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] status-dot-glow"></span>
                    Autoryzowano tokenem JWT
                  </span>
                ) : (
                  <span className="text-amber-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Bezutoryzacyjne (Tylko odczyt)
                  </span>
                )}
              </div>

              <button
                id="btn-trigger-api"
                onClick={() => handleTryIt(endpoints[selectedEndpoint!])}
                disabled={loading}
                className="bg-white hover:bg-zinc-200 text-black px-4 py-2 border border-transparent rounded-sm text-[10px] uppercase font-bold tracking-wider transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Wyślij (Try It)
              </button>
            </div>

            {/* Client Console Output Panel */}
            {apiResponse && (
              <div id="api-console-response" className="border-t border-subtle pt-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-zinc-500 flex items-center gap-1.5 tracking-wider uppercase">
                    <Database className="w-3.5 h-3.5 text-zinc-500" />
                    Konsola deweloperska - odpowiedź API
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border ${
                    apiResponse.status >= 200 && apiResponse.status < 300 
                      ? 'bg-zinc-950 text-emerald-400 border-emerald-500/10' 
                      : 'bg-zinc-950 text-rose-400 border-rose-500/10'
                  }`}>
                    HTTP {apiResponse.status}
                  </span>
                </div>
                <pre className="max-h-[220px] overflow-y-auto text-xs font-mono bg-zinc-950 text-emerald-400 p-4 rounded-sm border border-subtle leading-relaxed">
                  {JSON.stringify(apiResponse.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
