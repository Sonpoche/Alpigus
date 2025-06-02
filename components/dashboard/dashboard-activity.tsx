// components/dashboard/activity-card.tsx
'use client'

import { Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDateToFrench } from '@/lib/date-utils'

interface ActivityCardProps {
  activity: {
    id: string
    type: 'order' | 'delivery' | 'message' | 'notification'
    title: string
    description: string
    date: Date
    status?: 'pending' | 'completed' | 'cancelled'
    link?: string
  }
  getActivityIcon: (type: string) => React.ReactNode
  getStatusBadgeVariant: (status?: string) => string
  getStatusTranslation: (status?: string) => string
}

export function ActivityCard({ 
  activity, 
  getActivityIcon, 
  getStatusBadgeVariant, 
  getStatusTranslation 
}: ActivityCardProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 border border-foreground/10 rounded-lg hover:bg-foreground/5 transition-colors">
      {/* Icône */}
      <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0 mt-0.5">
          {getActivityIcon(activity.type)}
        </div>
        
        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          {/* En-tête avec titre et badge */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              {activity.link ? (
                <Link 
                  href={activity.link} 
                  className="font-medium text-sm sm:text-base hover:text-custom-accent transition-colors line-clamp-2"
                >
                  {activity.title}
                </Link>
              ) : (
                <h3 className="font-medium text-sm sm:text-base line-clamp-2">
                  {activity.title}
                </h3>
              )}
            </div>
            
            {activity.status && (
              <Badge 
                variant={getStatusBadgeVariant(activity.status) as any}
                className="text-xs whitespace-nowrap"
              >
                {getStatusTranslation(activity.status)}
              </Badge>
            )}
          </div>
          
          {/* Description */}
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
            {activity.description}
          </p>
          
          {/* Date et lien d'action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {formatDateToFrench(activity.date)}
              </span>
            </div>
            
            {activity.link && (
              <Link 
                href={activity.link}
                className="text-xs text-custom-accent hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Voir détails</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}