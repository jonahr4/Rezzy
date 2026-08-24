import React, { useState, useEffect } from 'react';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Generate years from current year + 5 down to 1980
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear + 5 - 1980 + 1 }, (_, i) => currentYear + 5 - i);

interface MonthYearPickerProps {
  value: string;
  onChange: (val: string) => void;
  allowPresent?: boolean;
}

export default function MonthYearPicker({ value, onChange, allowPresent }: MonthYearPickerProps) {
  const [isPresent, setIsPresent] = useState(value === 'Present');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Parse initial value (runs only when 'value' changes externally or on mount)
  useEffect(() => {
    if (value === 'Present') {
      setIsPresent(true);
      setMonth('');
      setYear('');
    } else if (value) {
      setIsPresent(false);
      // Try to parse "Aug 2024" or similar
      const parts = value.trim().split(/\s+/);
      if (parts.length >= 2) {
        // match month part
        const m = MONTHS.find(m => parts[0].toLowerCase().startsWith(m.toLowerCase()));
        if (m) setMonth(m);
        // match year part
        const y = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(y) && y >= 1980 && y <= currentYear + 5) {
          setYear(y.toString());
        }
      }
    } else {
      setIsPresent(false);
      setMonth('');
      setYear('');
    }
  }, [value]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const m = e.target.value;
    setMonth(m);
    if (m && year) {
      onChange(`${m} ${year}`);
    } else {
      onChange(''); // invalid until both selected
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const y = e.target.value;
    setYear(y);
    if (month && y) {
      onChange(`${month} ${y}`);
    } else {
      onChange('');
    }
  };

  const handlePresentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsPresent(checked);
    if (checked) {
      onChange('Present');
    } else {
      if (month && year) {
        onChange(`${month} ${year}`);
      } else {
        onChange('');
      }
    }
  };

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <select 
        className="input-field" 
        style={{ flex: 1, padding: '6px 4px', cursor: isPresent ? 'not-allowed' : 'pointer', opacity: isPresent ? 0.6 : 1, minWidth: 0, textOverflow: 'ellipsis' }}
        value={month}
        onChange={handleMonthChange}
        disabled={isPresent}
      >
        <option value="" disabled>Month</option>
        {MONTHS.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <select 
        className="input-field" 
        style={{ flex: 1, padding: '6px 4px', cursor: isPresent ? 'not-allowed' : 'pointer', opacity: isPresent ? 0.6 : 1, minWidth: 0, textOverflow: 'ellipsis' }}
        value={year}
        onChange={handleYearChange}
        disabled={isPresent}
      >
        <option value="" disabled>Year</option>
        {YEARS.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {allowPresent && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
          <input 
            type="checkbox" 
            checked={isPresent}
            onChange={handlePresentChange}
            style={{ cursor: 'pointer', margin: 0 }}
          />
          Present
        </label>
      )}
    </div>
  );
}
