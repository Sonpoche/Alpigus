// components/admin/dashboard-chart.tsx
"use client"

import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts'

interface DashboardChartProps {
  id: string
  title: string
  data: any[]
  type: 'line' | 'bar' | 'pie'
  dataKey: string
  xAxisKey?: string
  nameKey?: string
  categoryKey?: string
  height?: number
  colors?: string[]
}

export default function DashboardChart({
  id,
  title,
  data,
  type,
  dataKey,
  xAxisKey = 'name',
  nameKey = 'name',
  categoryKey,
  height = 300,
  colors = ['#FF5A5F', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0']
}: DashboardChartProps) {
  // Pour s'assurer que le rendu se fait uniquement côté client
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  if (!isMounted) {
    return (
      <div 
        className="bg-background border border-foreground/10 rounded-lg p-4 shadow-sm"
        style={{ height: `${height + 50}px` }}
      >
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="animate-pulse bg-foreground/5 rounded-lg h-full"></div>
      </div>
    )
  }
  
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={colors[0]} 
                activeDot={{ r: 8 }} 
              />
              {categoryKey && data[0] && data[0][categoryKey] && 
                Object.keys(data[0][categoryKey]).map((key, index) => (
                  <Line 
                    key={key} 
                    type="monotone" 
                    dataKey={`${categoryKey}.${key}`}
                    name={key}
                    stroke={colors[(index + 1) % colors.length]} 
                  />
                ))
              }
            </LineChart>
          </ResponsiveContainer>
        )
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={dataKey} fill={colors[0]} />
              {categoryKey && data[0] && data[0][categoryKey] && 
                Object.keys(data[0][categoryKey]).map((key, index) => (
                  <Bar 
                    key={key} 
                    dataKey={`${categoryKey}.${key}`}
                    name={key}
                    fill={colors[(index + 1) % colors.length]} 
                  />
                ))
              }
            </BarChart>
          </ResponsiveContainer>
        )
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={120}
                fill="#8884d8"
                dataKey={dataKey}
                nameKey={nameKey}
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )
      
      default:
        return <div>Type de graphique non pris en charge</div>
    }
  }
  
  return (
    <div className="bg-background border border-foreground/10 rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {renderChart()}
    </div>
  )
}