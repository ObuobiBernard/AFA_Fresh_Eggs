import React from 'react';
import { useApp } from '../context/AppContext';
import { td, wkRange, parseDate, localDateStr } from '../constants';

interface WeekNavigatorProps {
  label?: string;
  showPresets?: boolean;
  compact?: boolean;
}

export const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  label = 'Select Week',
  showPresets = true,
  compact = false
}) => {
  const { selDate, setSelDate, shiftWeek } = useApp();

  const activeDate = selDate || td();
  const week = wkRange(activeDate);
  const currentWeek = wkRange(td());
  const isCurrentWeek = week.start === currentWeek.start;

  // Calculate human friendly relative distance
  const currentMonday = parseDate(currentWeek.start);
  const selectedMonday = parseDate(week.start);
  const diffWeeks = Math.round(
    (currentMonday.getTime() - selectedMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  let relativeLabel = 'This Week';
  if (diffWeeks === 1) relativeLabel = 'Last Week';
  else if (diffWeeks > 1) relativeLabel = `${diffWeeks} weeks ago`;
  else if (diffWeeks === -1) relativeLabel = 'Next Week';
  else if (diffWeeks < -1) relativeLabel = `In ${Math.abs(diffWeeks)} weeks`;

  // Format nice readable dates e.g. "19 Oct – 25 Oct 2026"
  const formatDatePretty = (isoStr: string) => {
    const d = parseDate(isoStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const startPretty = formatDatePretty(week.start);
  const endPretty = formatDatePretty(week.end);
  const yearStr = week.end.split('-')[0];

  const handlePreset = (weeksAgo: number) => {
    const d = parseDate(currentWeek.start);
    d.setDate(d.getDate() - weeksAgo * 7);
    setSelDate(localDateStr(d));
  };

  return (
    <div
      style={{
        background: 'var(--cd)',
        border: '1px solid var(--bd)',
        borderRadius: '14px',
        padding: compact ? '8px 12px' : '12px 14px',
        marginBottom: '14px'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ fontSize: '15px' }}>📅</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <b style={{ fontSize: '13px', color: 'var(--tx)' }}>
                {startPretty} – {endPretty}, {yearStr}
              </b>
              <span
                className="sync-pill"
                style={{
                  background: isCurrentWeek ? 'rgba(37, 211, 102, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: isCurrentWeek ? 'var(--g)' : '#b45309',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}
              >
                {relativeLabel}
              </span>
            </div>
            {!compact && (
              <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>
                Mon {week.start} to Sun {week.end} · {label}
              </small>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="s"
            onClick={() => shiftWeek(-7)}
            aria-label="Previous Week"
            title="Go to previous week"
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: 600,
              minHeight: 'auto',
              background: 'var(--bg)',
              border: '1px solid var(--bd)'
            }}
          >
            ◀ Prev Week
          </button>

          {!isCurrentWeek && (
            <button
              type="button"
              className="s"
              onClick={() => setSelDate(td())}
              title="Return to this week"
              style={{
                padding: '5px 8px',
                fontSize: '11px',
                minHeight: 'auto',
                background: 'var(--g)',
                color: '#ffffff',
                fontWeight: 600
              }}
            >
              Today ↺
            </button>
          )}

          <button
            type="button"
            className="s"
            onClick={() => shiftWeek(7)}
            aria-label="Next Week"
            title="Go to next week"
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: 600,
              minHeight: 'auto',
              background: 'var(--bg)',
              border: '1px solid var(--bd)'
            }}
          >
            Next Week ▶
          </button>
        </div>
      </div>

      {/* Quick presets & date jumper */}
      {showPresets && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid var(--bd)',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--mu)', marginRight: '4px' }}>Quick Jump:</span>
            {[
              { label: 'This Week', weeks: 0 },
              { label: 'Last Week', weeks: 1 },
              { label: '2 Wks Ago', weeks: 2 },
              { label: '3 Wks Ago', weeks: 3 },
              { label: '4 Wks Ago', weeks: 4 }
            ].map(p => {
              const isSelected = diffWeeks === p.weeks;
              return (
                <button
                  key={p.weeks}
                  type="button"
                  className="s"
                  onClick={() => handlePreset(p.weeks)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    minHeight: 'auto',
                    background: isSelected ? 'var(--tx)' : 'var(--bg)',
                    color: isSelected ? 'var(--cd)' : 'var(--tx)',
                    borderColor: isSelected ? 'var(--tx)' : 'var(--bd)',
                    fontWeight: isSelected ? 700 : 500
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Jump to specific date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ margin: 0, fontSize: '11px', color: 'var(--mu)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Jump to date:
              <input
                type="date"
                value={activeDate}
                onChange={e => {
                  if (e.target.value) setSelDate(e.target.value);
                }}
                style={{
                  margin: 0,
                  padding: '3px 6px',
                  fontSize: '11px',
                  height: '28px',
                  width: 'auto'
                }}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
