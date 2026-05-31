export interface CreateFuelDto {
  name: string;
  type: string;
  pricePerLiter: number;
  availableQuantity: number;
}

export interface UpdateFuelDto {
  name?: string;
  type?: string;
  pricePerLiter?: number;
  availableQuantity?: number;
}
