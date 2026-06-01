import { Station, Fuel } from '../types';
import { Fuel as FuelIcon, MapPin, Gauge, PackageOpen } from 'lucide-react';

interface StatsProps {
  stations: Station[];
  fuels: Fuel[];
  currentUser: { username: string; isAdmin: boolean; fullName: string } | null;
}

export default function OverviewStats({ stations, fuels, currentUser }: StatsProps) {
  // Calculations
  const totalStations = stations.length;
  const totalFuelTypes = fuels.length;
  
  // Total fuel volume in stock across all stations
  let totalStockLiters = 0;
  stations.forEach(st => {
    st.fuels.forEach(f => {
      totalStockLiters += f.availableQuantity;
    });
  });

  const accountTypeLabel = (isAdmin: boolean) =>
    isAdmin ? 'Administrator' : 'Użytkownik';

  return (
    <div id="overview-widgets" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Station count widget */}
      <div className="glass-card p-6 rounded-lg flex items-center justify-between transition-all duration-300 hover:border-zinc-700">
        <div>
          <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Baza stacji</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-light text-white tracking-tight">{totalStations}</span>
            <span className="text-[10px] text-emerald-500 font-mono tracking-tighter uppercase">aktywne</span>
          </div>
          <span className="block text-[10px] text-zinc-400 mt-1">aktywne punkty sprzedaży</span>
        </div>
        <div className="p-3 rounded-md bg-zinc-900 border border-subtle text-zinc-400">
          <MapPin className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Fuel count widget */}
      <div className="glass-card p-6 rounded-lg flex items-center justify-between transition-all duration-300 hover:border-zinc-700">
        <div>
          <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Katalog paliw</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-light text-white tracking-tight">{totalFuelTypes}</span>
            <span className="text-xs text-zinc-400 font-mono uppercase">rodzaje</span>
          </div>
          <span className="block text-[10px] text-zinc-400 mt-1">unikalne typy w ofercie</span>
        </div>
        <div className="p-3 rounded-md bg-zinc-900 border border-subtle text-zinc-400">
          <FuelIcon className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Total inventory widget */}
      <div className="glass-card p-6 rounded-lg flex items-center justify-between transition-all duration-300 hover:border-zinc-700">
        <div>
          <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Łączny zapas</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-light text-white tracking-tight">
              {(totalStockLiters / 1000).toFixed(1)}
            </span>
            <span className="text-xs text-zinc-400 font-mono uppercase">k/L</span>
          </div>
          <span className="block text-[10px] text-zinc-400 mt-1">{(totalStockLiters).toLocaleString('pl-PL')} litrów</span>
        </div>
        <div className="p-3 rounded-md bg-zinc-900 border border-subtle text-zinc-400">
          <Gauge className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* User profile widget */}
      <div className="glass-card p-6 rounded-lg flex items-center justify-between transition-all duration-300 hover:border-zinc-700">
        <div>
          <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Użytkownik</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-white truncate block max-w-[170px]">
              {currentUser ? currentUser.fullName : 'Gość'}
            </span>
            <span className="text-[10px] text-emerald-500 font-mono tracking-wider uppercase font-semibold">
               {currentUser ? accountTypeLabel(currentUser.isAdmin) : 'Niezalogowany'}
            </span>
          </div>
        </div>
        <div className="p-3 rounded-md bg-zinc-900 border border-subtle text-zinc-400">
          <PackageOpen className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
