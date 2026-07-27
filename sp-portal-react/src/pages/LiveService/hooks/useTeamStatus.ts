import { useState, useEffect } from 'react';
import { TeamMember } from '../types';
import { MOCK_DELIVERERS, MOCK_DELIVERIES } from '../mock-data';

export function useTeamStatus() {
  const [team, setTeam] = useState<TeamMember[]>(() =>
    MOCK_DELIVERERS.map(d => ({
      id: d.id,
      name: d.name,
      status: d.status,
      totalAssigned: d.assignedPackages,
      totalDelivered: d.deliveredPackages,
      batteryLevel: d.batteryLevel,
      avgTimePerStop: d.avgTimePerStop,
      location: { lat: d.latitude, lng: d.longitude },
    }))
  );
  const [isLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTeam(prev =>
        prev.map(m => {
          const deliverer = MOCK_DELIVERERS.find(d => d.id === m.id);
          return {
            ...m,
            batteryLevel: deliverer?.batteryLevel || m.batteryLevel,
            location: {
              lat: deliverer?.latitude || m.location.lat,
              lng: deliverer?.longitude || m.location.lng,
            },
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return { team, isLoading };
}
