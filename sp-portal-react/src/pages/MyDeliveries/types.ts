export type StopType = 'DEL' | 'PU';

export interface DeliveryStop {
  id: number;
  postcode: string;
  address: string;
  customer: string;
  type: StopType;
  pre12: boolean;
  asr: boolean;
  dsr: boolean;
  pieces: number;
}
