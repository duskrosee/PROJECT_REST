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
  pricePerLiter: number; // Station-specific current price
  availableQuantity: number; // Station-specific stock level in liters
}

export interface Station {
  id: string;
  name: string;
  address: string;
  city: string;
  workingHours: string; // e.g. "06:00 - 22:00" or "24/7"
  status: 'czynna' | 'nieczynna';
  lat?: number | null;  // GPS latitude
  lng?: number | null;  // GPS longitude
  fuels: StationFuel[]; // Associated fuels at this station
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
