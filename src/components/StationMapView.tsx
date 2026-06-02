import React, { useEffect, useRef, useState } from 'react';
import { Station, Fuel } from '../types';

interface Props {
  stations: Station[];
  fuels: Fuel[];
  onEditStation: (station: Station) => void;
}

// Leaflet types shim – loaded dynamically from CDN
declare global {
  interface Window {
    L: any;
  }
}

// Warsaw bounding box fallback coordinates for stations without GPS
const WARSAW_CENTER: [number, number] = [52.2297, 21.0122];

// Rough geocode lookup by common Warsaw addresses (offline fallback)
const GEOCODE_HINTS: Record<string, [number, number]> = {
  'al. 3 maja': [52.2346, 21.0361],
  'polna': [52.2143, 21.0202],
  'sanguszki': [52.2567, 21.0072],
  'prymasa tysiąclecia': [52.2241, 20.9572],
  'wołoska': [52.1873, 21.0027],
  'markowska': [52.2546, 21.0424],
  'bennetta': [52.1679, 20.9789],
  'stawki': [52.2507, 20.9821],
  'pileckiego': [52.1453, 21.0366],
  'odrowąża': [52.2747, 21.0300],
  'potockiej': [52.1540, 21.0708],
  'modlińska': [52.3202, 20.9714],
  'puławska 274': [52.1521, 21.0168],
  'puławska 86': [52.1985, 21.0236],
  'kondratowicza': [52.2925, 21.0508],
  'grochowska': [52.2374, 21.1190],
  'górczewska': [52.2415, 20.9275],
};

function hashJitter(id: string, spread = 0.08): [number, number] {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const unit = (hash % 10_000) / 10_000;
  const unit2 = ((hash / 10_000) % 10_000) / 10_000;
  return [
    WARSAW_CENTER[0] + (unit - 0.5) * spread,
    WARSAW_CENTER[1] + (unit2 - 0.5) * spread,
  ];
}

function guessCoords(station: Station): [number, number] | null {
  if (station.lat != null && station.lng != null) {
    return [station.lat, station.lng];
  }
  const addr = (station.address + ' ' + station.city).toLowerCase();
  for (const [key, coords] of Object.entries(GEOCODE_HINTS)) {
    if (addr.includes(key)) return coords;
  }
  return hashJitter(station.id);
}

function getFuelColor(station: Station, fuels: Fuel[]): string {
  if (station.status === 'nieczynna') return '#ef4444';
  const types = station.fuels.map(sf => fuels.find(f => f.id === sf.fuelId)?.type);
  if (types.includes('LPG')) return '#f59e0b';
  if (types.includes('diesel')) return '#6366f1';
  return '#10b981';
}

export default function StationMapView({ stations, fuels, onEditStation }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [leafletReady, setLeafletReady] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'czynna' | 'nieczynna'>('all');
  const [filterFuelType, setFilterFuelType] = useState<string>('all');
  const [mapStyle, setMapStyle] = useState<'dark' | 'osm'>('dark');

  // Load Leaflet CSS + JS from CDN
  useEffect(() => {
    if (window.L) { setLeafletReady(true); return; }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  // Init map once Leaflet is ready
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;

    const map = L.map(mapRef.current, {
      center: WARSAW_CENTER,
      zoom: 12,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const darkTile = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }
    );
    const osmTile = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap contributors', maxZoom: 19 }
    );

    darkTile.addTo(map);
    mapInstanceRef.current = { map, darkTile, osmTile, currentTile: 'dark' };
  }, [leafletReady]);

  // Toggle tile layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const { map, darkTile, osmTile, currentTile } = mapInstanceRef.current;
    if (mapStyle === 'dark' && currentTile !== 'dark') {
      map.removeLayer(osmTile);
      darkTile.addTo(map);
      mapInstanceRef.current.currentTile = 'dark';
    } else if (mapStyle === 'osm' && currentTile !== 'osm') {
      map.removeLayer(darkTile);
      osmTile.addTo(map);
      mapInstanceRef.current.currentTile = 'osm';
    }
  }, [mapStyle]);

  // Re-render markers when stations/filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const { map } = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const filtered = stations.filter(st => {
      if (filterStatus !== 'all' && st.status !== filterStatus) return false;
      if (filterFuelType !== 'all') {
        const hasFuel = st.fuels.some(sf => {
          const fuel = fuels.find(f => f.id === sf.fuelId);
          return fuel?.type === filterFuelType;
        });
        if (!hasFuel) return false;
      }
      return true;
    });

    filtered.forEach(station => {
      const coords = guessCoords(station);
      if (!coords) return;

      const color = getFuelColor(station, fuels);
      const isActive = station.status !== 'nieczynna';

      const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <defs>
            <filter id="shadow-${station.id.slice(0,8)}" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.5)"/>
            </filter>
          </defs>
          <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24S32 28 32 16C32 7.163 24.837 0 16 0z"
            fill="${color}" filter="url(#shadow-${station.id.slice(0,8)})"
            opacity="${isActive ? '1' : '0.5'}"/>
          <circle cx="16" cy="16" r="8" fill="rgba(0,0,0,0.35)"/>
          <text x="16" y="20" text-anchor="middle" font-size="10" font-family="monospace" font-weight="bold" fill="white">
            ${isActive ? '⛽' : '✕'}
          </text>
        </svg>`;

      const icon = L.divIcon({
        html: svgIcon,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40],
        className: ''
      });

      const marker = L.marker(coords, { icon })
        .addTo(map)
        .on('click', () => setSelectedStation(station));

      // Tooltip on hover
      const fuelList = station.fuels.map(sf => {
        const fuel = fuels.find(f => f.id === sf.fuelId);
        return fuel ? `${fuel.name}: ${sf.pricePerLiter.toFixed(2)} zł/L` : sf.fuelId;
      }).join('<br>');

      marker.bindTooltip(`
        <div style="font-family:monospace;font-size:11px;min-width:160px">
          <strong style="font-size:12px">${station.name}</strong><br>
          <span style="color:#aaa">${station.address}</span><br>
          <span style="color:#aaa">${station.workingHours}</span><br>
          <hr style="border-color:#444;margin:4px 0">
          ${fuelList || '<span style="color:#888">brak paliw</span>'}
        </div>
      `, {
        direction: 'top',
        className: 'leaflet-tooltip-dark'
      });

      markersRef.current.push(marker);
    });
  }, [stations, fuels, leafletReady, filterStatus, filterFuelType]);

  // Fix map size on first load
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    setTimeout(() => mapInstanceRef.current?.map?.invalidateSize(), 200);
  }, [leafletReady]);

  const fuelTypes = Array.from(new Set(fuels.map(f => f.type)));

  const filteredForList = stations.filter(st => {
    if (filterStatus !== 'all' && st.status !== filterStatus) return false;
    if (filterFuelType !== 'all') {
      const hasFuel = st.fuels.some(sf => {
        const fuel = fuels.find(f => f.id === sf.fuelId);
        return fuel?.type === filterFuelType;
      });
      if (!hasFuel) return false;
    }
    return true;
  });

  const focusStation = (station: Station) => {
    if (!mapInstanceRef.current) return;
    const coords = guessCoords(station);
    if (coords) {
      mapInstanceRef.current.map.flyTo(coords, 15, { duration: 0.8 });
    }
    setSelectedStation(station);
  };

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="glass-card p-4 rounded-md flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="bg-zinc-950 text-xs text-zinc-400 border border-subtle rounded-sm px-3 py-2 focus:border-white focus:outline-none"
          >
            <option value="all">Wszystkie statusy</option>
            <option value="czynna">Czynne</option>
            <option value="nieczynna">Nieczynne</option>
          </select>
          <select
            value={filterFuelType}
            onChange={e => setFilterFuelType(e.target.value)}
            className="bg-zinc-950 text-xs text-zinc-400 border border-subtle rounded-sm px-3 py-2 focus:border-white focus:outline-none"
          >
            <option value="all">Wszelkie paliwa</option>
            {fuelTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex rounded-sm border border-subtle overflow-hidden">
            <button
              onClick={() => setMapStyle('dark')}
              className={`px-3 py-2 text-[9px] uppercase font-bold tracking-wider transition-colors ${mapStyle === 'dark' ? 'bg-white text-black' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}
            >
              Ciemna
            </button>
            <button
              onClick={() => setMapStyle('osm')}
              className={`px-3 py-2 text-[9px] uppercase font-bold tracking-wider transition-colors ${mapStyle === 'osm' ? 'bg-white text-black' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}
            >
              OSM
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Benzyna</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span> Diesel</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> LPG</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Nieczynna</span>
        </div>
      </div>

      {/* Map + sidebar layout */}
      <div className="flex gap-4" style={{ height: '560px' }}>

        {/* Sidebar – station list */}
        <div className="w-64 flex-shrink-0 glass-card rounded-md overflow-y-auto flex flex-col">
          <div className="px-4 py-3 border-b border-subtle sticky top-0 bg-zinc-950/90 backdrop-blur-sm z-10">
            <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500">
              {filteredForList.length} stacji
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredForList.map(st => {
              const color = getFuelColor(st, fuels);
              const isSelected = selectedStation?.id === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => focusStation(st)}
                  className={`w-full text-left px-4 py-3 border-b border-subtle transition-colors hover:bg-zinc-800/40 ${isSelected ? 'bg-zinc-800/60' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }}></span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">{st.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{st.address}</p>
                      <p className="text-[9px] font-mono text-zinc-600 mt-0.5">{st.workingHours}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Map container */}
        <div className="flex-1 relative rounded-md overflow-hidden border border-subtle">
          {!leafletReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
              <p className="text-xs text-zinc-500 uppercase tracking-widest animate-pulse">Ładowanie mapy...</p>
            </div>
          )}
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

          {/* Station detail overlay */}
          {selectedStation && (
            <div className="absolute top-3 right-3 w-72 bg-zinc-950/95 border border-subtle rounded-md p-4 z-[500] backdrop-blur-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">{selectedStation.name}</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{selectedStation.address}, {selectedStation.city}</p>
                </div>
                <button
                  onClick={() => setSelectedStation(null)}
                  className="text-zinc-600 hover:text-white text-xs ml-2 flex-shrink-0"
                >✕</button>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-sm border ${
                  selectedStation.status === 'czynna'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>{selectedStation.status}</span>
                <span className="text-[9px] text-zinc-500 font-mono">{selectedStation.workingHours}</span>
              </div>

              {selectedStation.fuels.length > 0 && (
                <div className="space-y-1.5 border-t border-subtle pt-2">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-600 font-bold block font-mono">Paliwa i ceny:</span>
                  {selectedStation.fuels.map(sf => {
                    const fuel = fuels.find(f => f.id === sf.fuelId);
                    const isLow = sf.availableQuantity < 2000;
                    return (
                      <div key={sf.fuelId} className="flex justify-between items-center text-[10px]">
                        <span className="text-zinc-300 font-medium">{fuel?.name || sf.fuelId}</span>
                        <div className="text-right">
                          <span className="text-white font-mono font-bold">{sf.pricePerLiter.toFixed(2)} zł/L</span>
                          <span className={`block text-[9px] font-mono ${isLow ? 'text-rose-400' : 'text-zinc-600'}`}>
                            {sf.availableQuantity.toLocaleString('pl-PL')} L
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedStation.lat && selectedStation.lng && (
                <p className="text-[9px] font-mono text-zinc-600">
                  GPS: {selectedStation.lat.toFixed(4)}, {selectedStation.lng.toFixed(4)}
                </p>
              )}

              <button
                onClick={() => onEditStation(selectedStation)}
                className="w-full text-center text-[9px] uppercase font-bold tracking-wider py-1.5 bg-zinc-900 hover:bg-white hover:text-black border border-subtle rounded-sm transition-colors"
              >
                Edytuj stację
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CSS override for Leaflet tooltip dark theme */}
      <style>{`
        .leaflet-tooltip-dark {
          background: rgba(12,12,14,0.95) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          color: #e1e1e3 !important;
          border-radius: 4px !important;
          padding: 8px 10px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
          font-family: monospace;
        }
        .leaflet-tooltip-dark::before {
          border-top-color: rgba(255,255,255,0.08) !important;
        }
        .leaflet-container {
          background: #0c0c0e !important;
        }
        .leaflet-control-zoom a {
          background: rgba(12,12,14,0.9) !important;
          color: #e1e1e3 !important;
          border-color: rgba(255,255,255,0.08) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-attribution {
          background: rgba(12,12,14,0.7) !important;
          color: #555 !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: #666 !important; }
      `}</style>
    </div>
  );
}
