import React from 'react';
import type { OrderStatus, LatLng } from '@logistics/shared-types';
import { formatNaira, toGeoJsonPoint } from '@logistics/shared-types';

export interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  pending: {
    label: 'Order Placed',
    bg: '#fef3c7',
    text: '#92400e',
    border: '#fde68a',
  },
  searching_rider: {
    label: 'Finding Dispatch Rider...',
    bg: '#e0e7ff',
    text: '#3730a3',
    border: '#c7d2fe',
  },
  rider_assigned: {
    label: 'Rider Assigned',
    bg: '#dbeafe',
    text: '#1e40af',
    border: '#bfdbfe',
  },
  arrived_pickup: {
    label: 'Rider at Pickup',
    bg: '#fef9c3',
    text: '#854d0e',
    border: '#fef08a',
  },
  in_transit: {
    label: 'In Transit',
    bg: '#ffedd5',
    text: '#9a3412',
    border: '#fed7aa',
  },
  arrived_dropoff: {
    label: 'Rider at Drop-off',
    bg: '#fef9c3',
    text: '#854d0e',
    border: '#fef08a',
  },
  delivered: {
    label: 'Delivered',
    bg: '#dcfce7',
    text: '#166534',
    border: '#bbf7d0',
  },
  cancelled: {
    label: 'Cancelled',
    bg: '#fee2e2',
    text: '#991b1b',
    border: '#fecaca',
  },
  disputed: {
    label: 'In Dispute',
    bg: '#f3e8ff',
    text: '#6b21a8',
    border: '#e9d5ff',
  },
};

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.text,
          marginRight: '6px',
          display: 'inline-block',
        }}
      />
      {config.label}
    </span>
  );
};

export interface CoordinateDisplayProps {
  coords: LatLng;
  showGeoJsonCoordinates?: boolean;
}

export const CoordinateDisplay: React.FC<CoordinateDisplayProps> = ({
  coords,
  showGeoJsonCoordinates = false,
}) => {
  const geoPoint = toGeoJsonPoint(coords);
  return (
    <div
      style={{
        fontFamily: 'monospace',
        fontSize: '0.85rem',
        padding: '0.5rem 0.75rem',
        backgroundColor: '#0f172a',
        color: '#38bdf8',
        borderRadius: '0.375rem',
        display: 'inline-block',
      }}
    >
      <div>
        <strong>UI (Lat, Lng):</strong> {coords.lat.toFixed(5)},{' '}
        {coords.lng.toFixed(5)}
      </div>
      {showGeoJsonCoordinates && (
        <div style={{ color: '#34d399', marginTop: '0.25rem' }}>
          <strong>GeoJSON [Lng, Lat]:</strong> [{geoPoint.coordinates[0].toFixed(5)},{' '}
          {geoPoint.coordinates[1].toFixed(5)}]
        </div>
      )}
    </div>
  );
};

export interface NairaAmountProps {
  kobo: number;
  className?: string;
}

export const NairaAmount: React.FC<NairaAmountProps> = ({
  kobo,
  className = '',
}) => {
  return (
    <span className={`font-semibold tabular-nums ${className}`}>
      {formatNaira(kobo)}
    </span>
  );
};
