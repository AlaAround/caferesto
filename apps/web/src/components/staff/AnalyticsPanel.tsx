import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { formatTND } from '@tableorder/shared';

interface Props {
  venueId: string;
}

interface Analytics {
  revenue: { total: number; orderCount: number; avgOrderValue: number };
  hourly: { hour: number; revenue: number; orders: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
  tables: { tableNumber: number; orders: number; revenue: number }[];
  categories: { name: string; revenue: number }[];
  security: { type: string; count: number }[];
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPanel({ venueId }: Props) {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch(`/api/staff/venues/${venueId}/analytics/today`)
      .then((r) => r.json())
      .then(setData);
  }, [venueId]);

  if (!data) {
    return <div className="p-6 text-gray-400">Loading analytics...</div>;
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Today's Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-3xl font-bold text-brand-600">{formatTND(data.revenue.total)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Orders</p>
          <p className="text-3xl font-bold">{data.revenue.orderCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Avg Order Value</p>
          <p className="text-3xl font-bold">{formatTND(data.revenue.avgOrderValue)}</p>
        </div>
      </div>

      {data.hourly.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold mb-4">Revenue by Hour</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.hourly}>
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
              <YAxis />
              <Tooltip formatter={(v: number) => formatTND(v)} />
              <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.topItems.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold mb-4">Top Items</h2>
            <div className="space-y-2">
              {data.topItems.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span>{i + 1}. {item.name}</span>
                  <span className="font-medium">{item.quantity} sold</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.categories.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold mb-4">Category Breakdown</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.categories}
                  dataKey="revenue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name }) => name}
                >
                  {data.categories.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatTND(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {data.security.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold mb-4">Security Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.security.map((s) => (
              <div key={s.type} className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-red-500">{s.count}</p>
                <p className="text-xs text-gray-500">{s.type.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
