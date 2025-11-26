import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomDropdown({ 
    options, 
    value, 
    onChange, 
    placeholder = "Select an option", 
    label, 
    icon: Icon,
    disabled = false,
    className = ""
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">
                    {label}
                </label>
            )}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-3.5 text-left focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all flex justify-between items-center group ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800/80 cursor-pointer'
                }`}
            >
                <div className="flex items-center truncate">
                    {Icon && <Icon size={18} className="mr-2 text-gray-400 group-hover:text-blue-400 transition-colors" />}
                    <span className={`truncate ${selectedOption ? 'text-gray-100' : 'text-gray-500'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown 
                    className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                    size={20} 
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full bg-gray-800/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 slide-in-from-top-2 origin-top">
                    <div className="p-2 space-y-1">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-all group ${
                                    value === option.value 
                                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' 
                                        : 'hover:bg-gray-700/50 text-gray-300 hover:text-white border border-transparent'
                                }`}
                            >
                                <span className="font-medium truncate">{option.label}</span>
                                {value === option.value && (
                                    <Check size={16} className="text-blue-400" />
                                )}
                            </button>
                        ))}
                        {options.length === 0 && (
                            <div className="px-4 py-3 text-gray-500 text-center text-sm">
                                No options available
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
