import { useState, useEffect } from 'react';

export interface ServicePartner {
  servicePartnerId: number;
  partnerName: string;
  [key: string]: any;
}

export function useServicePartners() {
  const [servicePartners, setServicePartners] = useState<ServicePartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch from API when available
    setServicePartners([]);
  }, []);

  return { servicePartners, loading, error };
}
