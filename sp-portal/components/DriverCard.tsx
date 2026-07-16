'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Edit2, Trash2, Phone, MapPin } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive' | 'blocked';
  rating: number;
  completedDeliveries: number;
  avatar?: string;
  location?: string;
}

interface DriverCardProps {
  driver: Driver;
  onEdit?: (driver: Driver) => void;
  onDelete?: (driverId: string) => void;
  compact?: boolean;
}

const statusConfig = {
  active: {
    label: 'Ativo',
    className: 'bg-green-900/30 text-green-200 border-green-800',
  },
  inactive: {
    label: 'Inativo',
    className: 'bg-gray-900/30 text-gray-200 border-gray-800',
  },
  blocked: {
    label: 'Bloqueado',
    className: 'bg-red-900/30 text-red-200 border-red-800',
  },
};

export function DriverCard({ driver, onEdit, onDelete, compact = false }: DriverCardProps) {
  const statusInfo = statusConfig[driver.status];
  const initials = driver.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={driver.avatar} alt={driver.name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-white truncate">{driver.name}</p>
            <p className="text-xs text-slate-400 truncate">{driver.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className={statusInfo.className}>
            {statusInfo.label}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
      <CardContent className="pt-6">
        {/* Header with status */}
        <div className="flex items-start justify-between mb-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={driver.avatar} alt={driver.name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <Badge variant="outline" className={statusInfo.className}>
            {statusInfo.label}
          </Badge>
        </div>

        {/* Driver info */}
        <h3 className="font-semibold text-white mb-1">{driver.name}</h3>

        {/* Contact */}
        <div className="space-y-2 mb-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {driver.phone}
          </div>
          {driver.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {driver.location}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-slate-700/50 rounded-lg">
          <div>
            <p className="text-xs text-slate-400">Rating</p>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-white">{driver.rating.toFixed(1)}</span>
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400">Entregas</p>
            <p className="font-semibold text-white">{driver.completedDeliveries}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onEdit && (
            <Button
              onClick={() => onEdit(driver)}
              variant="outline"
              size="sm"
              className="flex-1 bg-slate-700 hover:bg-slate-600 border-slate-600"
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Editar
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={() => onDelete(driver.id)}
              variant="outline"
              size="sm"
              className="flex-1 bg-red-900/20 hover:bg-red-900/30 border-red-800 text-red-200"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Deletar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
