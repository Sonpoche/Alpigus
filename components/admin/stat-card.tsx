// components/admin/stat-card.tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  iconBgColor?: string
  iconColor?: string
  change?: number
  changeText?: string
  isLoading?: boolean
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-custom-accent/10',
  iconColor = 'text-custom-accent',
  change,
  changeText,
  isLoading = false,
  className
}: StatCardProps) {
  const isPositiveChange = change && change > 0
  const isNegativeChange = change && change < 0
  
  return (
    <div className={cn(
      "bg-background border border-foreground/10 rounded-lg p-6 shadow-sm", 
      className
    )}>
      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-foreground/5 rounded mb-2"></div>
          <div className="h-8 w-16 bg-foreground/10 rounded mb-2"></div>
          {subtitle && <div className="h-4 w-32 bg-foreground/5 rounded"></div>}
        </div>
      ) : (
        <>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <h3 className="text-2xl font-bold mt-1">{value}</h3>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            {icon && (
              <div className={`${iconBgColor} p-3 rounded-full`}>
                <div className={`${iconColor}`}>{icon}</div>
              </div>
            )}
          </div>
          
          {(change !== undefined || changeText) && (
            <div className="mt-4 flex items-center text-sm">
              {change !== undefined && (
                <span className={`font-medium ${
                  isPositiveChange ? 'text-green-500' : 
                  isNegativeChange ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  {isPositiveChange && '+'}
                  {change.toString()}%
                </span>
              )}
              {changeText && (
                <span className="text-muted-foreground ml-1">{changeText}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}