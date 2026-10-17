import React from 'react';
import { SaleItem } from '../types';
import { parseDate, localDateStr, gh } from '../constants';

interface WeeklySalesChartProps {
  startDate: string; // Monday YYYY-MM-DD
  sales: SaleItem[];
}

export const WeeklySalesChart: React.FC<WeeklySalesChartProps> = ({ startDate, sales }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const weekDays = days.map((dayName, idx) => {
    const d = parseDate(startDate);
    d.setDate(d.getDate() + idx);
    const dateStr = localDateStr(d);
    const daySales = sales.filter(s => s.date === dateStr);
    const rev = daySales.reduce((acc, s) => acc + s.qty * s.price, 0);
    const crates = daySales.reduce((acc, s) => acc + s.qty, 0);
    return {
      dayName,
      dateStr,
      shortDate: `${d.getDate()}/${d.getMonth() + 1}`,
      rev,
      crates
    };
  });

  const maxRev = Math.max(...weekDays.map(w => w.rev), 100);

  return (
    <div className="c">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ margin: 0 }}>📊 Daily Sales Performance</h3>
        <small style={{ color: 'var(--mu)', fontSize: '11px' }}>Mon – Sun</small>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '6px',
          alignItems: 'flex-end',
          height: '130px',
          paddingBottom: '24px',
          position: 'relative'
        }}
      >
        {weekDays.map(d => {
          const heightPercent = Math.max(8, (d.rev / maxRev) * 100);
          const hasSales = d.rev > 0;

          return (
            <div
              key={d.dateStr}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                position: 'relative'
              }}
            >
              {hasSales && (
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: 'var(--g)',
                    marginBottom: '4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {d.crates}c
                </div>
              )}

              <div
                style={{
                  width: '100%',
                  maxWidth: '32px',
                  height: `${heightPercent}%`,
                  borderRadius: '6px 6px 2px 2px',
                  background: hasSales
                    ? 'linear-gradient(180deg, var(--g), #16462b)'
                    : 'rgba(20, 34, 25, 0.08)',
                  transition: 'height 0.4s ease, background 0.3s ease',
                  boxShadow: hasSales ? '0 2px 8px rgba(31, 94, 59, 0.25)' : 'none'
                }}
                title={`${d.dayName} (${d.dateStr}): ${d.crates} crates · ${gh(d.rev)}`}
              />

              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  fontSize: '11px',
                  fontWeight: hasSales ? 700 : 500,
                  color: hasSales ? 'var(--tx)' : 'var(--mu)',
                  textAlign: 'center'
                }}
              >
                {d.dayName}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
