
import React from 'react';

interface ToggleSwitchProps {
  label: string;
  option1: string;
  option2: string;
  isOption1Active: boolean;
  onToggle: (isOption1Active: boolean) => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, option1, option2, isOption1Active, onToggle }) => {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="relative inline-flex items-center cursor-pointer bg-slate-200 rounded-full p-1">
        <button
          onClick={() => onToggle(true)}
          className={`px-4 py-1 text-sm rounded-full transition-colors duration-300 ease-in-out ${
            isOption1Active ? 'bg-blue-600 text-white shadow' : 'text-slate-700'
          }`}
        >
          {option1}
        </button>
        <button
          onClick={() => onToggle(false)}
          className={`px-4 py-1 text-sm rounded-full transition-colors duration-300 ease-in-out ${
            !isOption1Active ? 'bg-blue-600 text-white shadow' : 'text-slate-700'
          }`}
        >
          {option2}
        </button>
      </div>
    </div>
  );
};
