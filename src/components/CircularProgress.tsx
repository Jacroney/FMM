import React from 'react';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
  label?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 120,
  strokeWidth = 10,
  className = '',
  showPercentage = true,
  label,
  color = 'blue'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  // Determine color based on percentage or explicit color prop
  const getColor = () => {
    if (color !== 'blue') {
      const colorMap = {
        green: { stroke: '#10B981', gradient: ['#10B981', '#059669'] },
        yellow: { stroke: '#F59E0B', gradient: ['#F59E0B', '#D97706'] },
        red: { stroke: '#EF4444', gradient: ['#EF4444', '#DC2626'] },
        purple: { stroke: '#A855F7', gradient: ['#A855F7', '#9333EA'] },
        blue: { stroke: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] }
      };
      return colorMap[color];
    }

    // Auto color based on percentage - simplified to 3 states
    if (percentage > 100) return { stroke: '#EF4444', gradient: ['#EF4444', '#DC2626'] };
    if (percentage > 80) return { stroke: '#F59E0B', gradient: ['#F59E0B', '#D97706'] };
    return { stroke: '#10B981', gradient: ['#10B981', '#059669'] };
  };

  const colors = getColor();
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.gradient[0]} />
            <stop offset="100%" stopColor={colors.gradient[1]} />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-in-out"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.4))'
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span
            className="text-2xl font-bold transition-colors duration-300"
            style={{ color: colors.stroke }}
          >
            {Math.round(percentage)}%
          </span>
        )}
        {label && (
          <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center px-2">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

export default CircularProgress;
