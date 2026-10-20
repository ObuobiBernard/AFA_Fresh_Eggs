import React from 'react';
import { SaleItem } from '../types';
import { gh, parseDate, localDateStr } from '../constants';

interface WeeklySalesChartProps {
  sales: SaleItem[];
  startDate: string;
}

export const WeeklySalesChart: React.FC<WeeklySalesChartProps> = ({ sales, startDate }) => {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const baseDate = parseDate(startDate);
  const dailyData = dayNames.map((day, idx) => {
    const cur = new Date(baseDate);
    cur.setDate(baseDate.getDate() + idx);
    const dateStr = localDateStr(cur);

    const daySales = sales.filter(s => s.date === dateStr);
    const crates = daySales.reduce((acc, s) => acc + s.qty, 0);
    const revenue = daySales.reduce((acc, s) => acc + s.qty * s.price, 0);

    return { day, dateStr, crates, revenue };
  });

  const maxCrates = Math.max(...dailyData.map(d => d.crates), 1);

  return (
    <div style={{ marginTop: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px', padding: '10px 4px 0' }}>
        {dailyData.map((d, i) => {
          const heightPct = Math.round((d.crates / maxCrates) * 100);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end'
              }}
            >
              <span style={{ fontSize: '10px', color: 'var(--tx)', fontWeight: 600, marginBottom: '4px' }}>
                {d.crates > 0 ? d.crates : ''}
              </span>
              <div
                style={{
                  width: '100%',
                  height: `${Math.max(heightPct, 6)}%`,
                  background: d.crates > 0 ? 'var(--g)' : 'var(--bd)',
                  borderRadius: '6px 6px 2px 2px',
                  transition: 'height 0.3s ease',
                  opacity: d.crates > 0 ? 0.9 : 0.4
                }}
                title={`${d.day} (${d.dateStr}): ${d.crates} crates (${gh(d.revenue)})`}
              />
              <span style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '6px' }}>
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
