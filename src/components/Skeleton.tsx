import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse'
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'rounded h-4';
      case 'circular':
        return 'rounded-full';
      case 'rounded':
        return 'rounded-lg';
      default:
        return 'rounded';
    }
  };

  const getAnimationClasses = () => {
    return animation === 'pulse' ? 'animate-pulse' : 'animate-shimmer';
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 ${getVariantClasses()} ${getAnimationClasses()} ${className}`}
      style={style}
    />
  );
};

// Budget Overview Card Skeleton
export const BudgetCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton width="60%" height={16} className="mb-2" />
          <Skeleton width="40%" height={32} />
        </div>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
    </div>
  );
};

// Budget Category Skeleton
export const BudgetCategorySkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton variant="rounded" width={40} height={40} />
            <div>
              <Skeleton width={150} height={24} className="mb-2" />
              <Skeleton width={100} height={16} />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <Skeleton width={60} height={16} className="mb-1" />
              <Skeleton width={80} height={20} />
            </div>
            <div>
              <Skeleton width={60} height={16} className="mb-1" />
              <Skeleton width={80} height={20} />
            </div>
            <div>
              <Skeleton width={60} height={16} className="mb-1" />
              <Skeleton width={80} height={20} />
            </div>
          </div>
        </div>
        <Skeleton height={10} className="rounded-full" />
      </div>
    </div>
  );
};

// Chart Skeleton
export const ChartSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <Skeleton width={200} height={24} />
        <Skeleton width={80} height={24} className="rounded-full" />
      </div>
      <Skeleton width="100%" height={300} className="rounded-lg" />
    </div>
  );
};
