'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Edit2, Trash2, Gauge, Package } from 'lucide-react';

interface Vehicle {
  id: string;
  plate: string;
  type: 'van' | 'truck' | 'motorcycle';
  status: 'available' | 'maintenance' | 'inactive';
  capacity: number;
  currentLoad: number;
  model?: string;
  year?: number;
  lastMaintenance?: string;
}

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicleId: string) => void;
}

const statusConfig = {
  available: {
    label: 'Disponível',
    className: 'bg-green-900/30 text-green-200 border-green-800',
  },
  maintenance: {
    label: 'Manutenção',
    className: 'bg-yellow-900/30 text-yellow-200 border-yellow-800',
  },
  inactive: {
    label: 'Inativo',
    className: 'bg-gray-900/30 text-gray-200 border-gray-800',
  },
};

const typeLabels = {
  van: 'Van',
  truck: 'Caminhão',
  motorcycle: 'Moto',
};

export function VehicleCard({ vehicle, onEdit, onDelete }: VehicleCardProps) {
  const statusInfo = statusConfig[vehicle.status];
  const loadPercentage = (vehicle.currentLoad / vehicle.capacity) * 100;
  const isOverCapacity = loadPercentage > 100;

  return (
    <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-white font-mono">{vehicle.plate}</p>
            <p className="text-sm text-slate-400">{typeLabels[vehicle.type]}</p>
            {vehicle.model && (
              <p className="text-xs text-slate-500">{vehicle.model} {vehicle.year && `(${vehicle.year})`}</p>
            )}
          </div>
          <Badge variant="outline" className={statusInfo.className}>
            {statusInfo.label}
          </Badge>
        </div>

        {/* Capacity Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">Carga</span>
            </div>
            <span className={`text-sm font-semibold ${isOverCapacity ? 'text-red-400' : 'text-green-400'}`}>
              {vehicle.currentLoad} / {vehicle.capacity} kg
            </span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isOverCapacity ? 'bg-red-500' : loadPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(loadPercentage, 100)}%` }}
            />
          </div>
          {isOverCapacity && (
            <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
              <AlertCircle className="w-3 h-3" />
              Excesso de capacidade
            </div>
          )}
        </div>

        {/* Maintenance Info */}
        {vehicle.lastMaintenance && (
          <p className="text-xs text-slate-500 mb-4">
            Última manutenção: {vehicle.lastMaintenance}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {onEdit && (
            <Button
              onClick={() => onEdit(vehicle)}
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
              onClick={() => onDelete(vehicle.id)}
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
