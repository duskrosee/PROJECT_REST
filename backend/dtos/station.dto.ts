export interface StationFuelInput {
  fuelId: string;
  pricePerLiter: number;
  availableQuantity: number;
}

export interface CreateStationDto {
  name: string;
  address: string;
  city: string;
  workingHours: string;
  status?: string; // czynna, nieczynna
  lat?: number | null;
  lng?: number | null;
  externalProvider?: string;
  externalFuelPriceId?: string;
  latitude?: number;
  longitude?: number;
  brand?: string;
  fuels?: StationFuelInput[];
}

export interface UpdateStationDto {
  name?: string;
  address?: string;
  city?: string;
  workingHours?: string;
  status?: string; // czynna, nieczynna
  lat?: number | null;
  lng?: number | null;
  externalProvider?: string;
  externalFuelPriceId?: string;
  latitude?: number;
  longitude?: number;
  brand?: string;
  fuels?: StationFuelInput[];
}
