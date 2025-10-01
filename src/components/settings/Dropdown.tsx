'use client';

interface DropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

const Dropdown = ({ label, value, options, onChange }: DropdownProps) => (
  <div className="flex items-center justify-between py-4 border-b">
    <span className="text-lg font-medium text-gray-800">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);

export default Dropdown;
