import React from 'react';
import { cn } from '../../lib/utils';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, colorClass }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-slate-800">{value}</h4>
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colorClass)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && trendValue && (
        <div className="mt-4 flex items-center text-sm">
          <span className={cn(
            "font-semibold",
            trend === 'up' ? "text-green-600" : "text-red-600"
          )}>
            {trend === 'up' ? '+' : '-'}{trendValue}
          </span>
          <span className="text-slate-500 ml-2">from last month</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
