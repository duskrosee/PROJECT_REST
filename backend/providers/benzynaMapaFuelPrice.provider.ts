export interface BenzynaMapaFuelPrice {
  externalFuelType: 'pb95' | 'pb98' | 'on' | 'lpg';
  pricePerLiter: number;
  source: string;
  reportedAt?: Date;
}

export interface BenzynaMapaStation {
  id: string;
  name: string;
  brand?: string;
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
  region?: string;
  services?: string[];
  opening_hours?: string;
}

type BenzynaMapaPriceRow = {
  station_id: string;
  pb95: number | null;
  pb98: number | null;
  on: number | null;
  lpg: number | null;
  source?: string;
  reported_at?: string;
};

type BenzynaMapaResponse = {
  prices?: BenzynaMapaPriceRow[];
};

type BenzynaMapaStationsResponse = {
  stations?: BenzynaMapaStation[];
};

const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
const PRICES_CACHE_TTL_MS = 60_000;

export class BenzynaMapaFuelPriceProvider {
  readonly name = 'benzynamapa';
  private readonly pricesEndpoint = process.env.BENZYNAMAPA_PRICES_URL || 'https://benzynamapa.pl/data/prices_latest.json';
  private readonly stationsEndpoint = process.env.BENZYNAMAPA_STATIONS_URL || 'https://benzynamapa.pl/data/stations_latest.json';
  private readonly fetchTimeoutMs = readPositiveIntegerEnv('BENZYNAMAPA_FETCH_TIMEOUT_MS', DEFAULT_FETCH_TIMEOUT_MS);
  private pricesCache: { map: Map<string, BenzynaMapaFuelPrice[]>; fetchedAt: number } | null = null;

  isConfigured() {
    return isValidHttpUrl(this.pricesEndpoint) && isValidHttpUrl(this.stationsEndpoint);
  }

  getPricesEndpoint() {
    return this.pricesEndpoint;
  }

  getStationsEndpoint() {
    return this.stationsEndpoint;
  }

  async fetchPricesByStationId(stationId: string): Promise<BenzynaMapaFuelPrice[]> {
    const prices = await this.fetchPrices();
    return prices.get(stationId) || [];
  }

  async fetchPrices(): Promise<Map<string, BenzynaMapaFuelPrice[]>> {
    if (this.pricesCache && Date.now() - this.pricesCache.fetchedAt < PRICES_CACHE_TTL_MS) {
      return this.pricesCache.map;
    }

    const response = await fetchWithTimeout(this.pricesEndpoint, this.fetchTimeoutMs);
    if (!response.ok) {
      throw new Error(`BenzynaMAPA zwróciła HTTP ${response.status}: ${response.statusText}`);
    }

    const payload = await response.json() as BenzynaMapaResponse;
    const result = new Map<string, BenzynaMapaFuelPrice[]>();
    for (const row of payload.prices || []) {
      result.set(row.station_id, this.toFuelPrices(row));
    }

    this.pricesCache = { map: result, fetchedAt: Date.now() };
    return result;
  }

  async fetchStations(): Promise<BenzynaMapaStation[]> {
    const response = await fetchWithTimeout(this.stationsEndpoint, this.fetchTimeoutMs);
    if (!response.ok) {
      throw new Error(`BenzynaMAPA stations zwróciły HTTP ${response.status}: ${response.statusText}`);
    }

    const payload = await response.json() as BenzynaMapaStationsResponse;
    return payload.stations || [];
  }

  private toFuelPrices(row: BenzynaMapaPriceRow): BenzynaMapaFuelPrice[] {
    const reportedAt = this.parseDate(row.reported_at);
    const source = row.source || 'benzynamapa';
    const result: BenzynaMapaFuelPrice[] = [];

    for (const fuelType of ['pb95', 'pb98', 'on', 'lpg'] as const) {
      const pricePerLiter = row[fuelType];
      if (typeof pricePerLiter !== 'number' || !Number.isFinite(pricePerLiter)) {
        continue;
      }

      result.push({
        externalFuelType: fuelType,
        pricePerLiter,
        source,
        reportedAt
      });
    }

    return result;
  }

  private parseDate(value?: string) {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`Przekroczono limit czasu (${timeoutMs}ms) podczas pobierania ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function readPositiveIntegerEnv(name: string, defaultValue: number) {
  const parsed = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}
