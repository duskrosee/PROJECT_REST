/**
 * Types representing the data model for the fuel station management system.
 */

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface UserWithPasswordHash extends User {
  passwordHash: string;
}

export interface Fuel {
  id: string;
  name: string; // e.g. Pb95, Pb98, ON, LPG
  type: 'benzyna' | 'diesel' | 'LPG' | 'inne';
  pricePerLiter: number; // default global price
  availableQuantity: number; // total global backup stock references
}

export interface StationFuel {
  fuelId: string;
  pricePerLiter: number;
  availableQuantity: number;
  priceSource?: string | null;
  priceUpdatedAt?: string | null;
  priceCurrency?: string | null;
  priceVolumeUnit?: string | null;
  externalFuelType?: string | null;
  isEstimated?: boolean;
}

export interface Station {
  id: string;
  name: string;
  address: string;
  city: string;
  workingHours: string;
  status: 'czynna' | 'nieczynna';
  lat?: number | null;
  lng?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  brand?: string | null;
  externalProvider?: string | null;
  externalFuelPriceId?: string | null;
  fuels: StationFuel[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  stationId: string;
  fuelId: string;
  fuelName: string;
  liters: number;
  pricePerLiter: number;
  totalPrice: number;
  buyerName: string;
  timestamp: string;
  worker?: string | null;
  paymentMethod?: string | null;
  status?: string;
  calcType?: string;
  originalPrice?: number | null;
  discountApplied?: number | null;
  couponCode?: string | null;
  checkoutToken?: string | null;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface DbSchema {
  users: UserWithPasswordHash[];
  fuels: Fuel[];
  stations: Station[];
}
