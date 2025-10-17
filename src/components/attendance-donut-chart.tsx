'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'

type AttendanceRecord = {
  Id: string | number
  TimeKeepingDate?: string
  CheckInLocation: unknown
  FullName?: string
  OfficeName?: string
  CheckInAddress?: string
  statusname?: string
  UserCode?: string
}

type AttendanceDonutChartProps = {
  records: AttendanceRecord[]
  loading?: boolean
}

// Màu sắc cho các trạng thái - đa dạng và dễ phân biệt
const STATUS_COLORS: Record<string, string> = {
  'Đúng giờ': '#22c55e', // green-500 - màu xanh lá tươi
  'Muộn': '#f59e0b', // amber-500 - màu vàng cam
  'Sớm': '#3b82f6', // blue-500 - màu xanh dương
  'Vắng': '#ef4444', // red-500 - màu đỏ
  'Nghỉ phép': '#8b5cf6', // violet-500 - màu tím
  'Làm thêm giờ': '#06b6d4', // cyan-500 - màu cyan
  'Nghỉ ốm': '#f97316', // orange-500 - màu cam
  'Nghỉ có phép': '#84cc16', // lime-500 - màu xanh lá chanh
  'Đi muộn': '#eab308', // yellow-500 - màu vàng
  'Về sớm': '#14b8a6', // teal-500 - màu xanh ngọc
  'Khác': '#6b7280', // gray-500 - màu xám
}

// Màu sắc mặc định cho các trạng thái chưa được định nghĩa
const DEFAULT_COLORS = [
  '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', 
  '#06b6d4', '#f97316', '#84cc16', '#eab308', '#14b8a6',
  '#ec4899', '#6366f1', '#10b981', '#f59e0b', '#ef4444'
]

export function AttendanceDonutChart({ records, loading = false }: AttendanceDonutChartProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Xử lý dữ liệu cho donut chart
  const chartData = useMemo(() => {
    if (!records.length) return { data: [], total: 0 }

    // Đếm số lượng cho mỗi trạng thái
    const statusCounts: Record<string, number> = {}

    records.forEach(record => {
      if (!record.statusname) return

      const status = record.statusname
      if (!statusCounts[status]) {
        statusCounts[status] = 0
      }
      statusCounts[status]++
    })

    // Chuyển đổi thành format cho PieChart với màu sắc động
    const data = Object.entries(statusCounts)
      .map(([status, count], index) => ({
        status,
        count,
        percentage: ((count / records.length) * 100).toFixed(1),
        color: STATUS_COLORS[status] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
      }))
      .sort((a, b) => b.count - a.count)

    return {
      data,
      total: records.length
    }
  }, [records])

  // Tạo config cho chart
  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {}
    
    chartData.data.forEach(item => {
      config[item.status] = {
        label: item.status,
        color: item.color
      }
    })

    return config
  }, [chartData.data])

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Phân bố trạng thái chấm công
            <div className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Đang tải dữ liệu...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!records.length || !chartData.data.length) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Phân bố trạng thái chấm công
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-auto"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              Không có dữ liệu chấm công
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Phân bố trạng thái chấm công
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="h-80 w-full">
            <ChartContainer config={chartConfig} className="h-full">
              <PieChart>
                <Pie
                  data={chartData.data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="status"
                >
                  {chartData.data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                    />
                  ))}
                </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number, name: string, props: any) => [
                    `${value} (${props.payload.percentage}%)`,
                    name
                  ]}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </div>
          
          {/* Thống kê tổng quan */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {chartData.data.map(item => (
                <div key={item.status} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.status}</span>
                  </div>
                  <div className="text-lg font-bold">{item.count}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.percentage}%
                  </div>
                </div>
            ))}
          </div>
          
          {/* Tổng số bản ghi */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Tổng số bản ghi: <span className="font-semibold text-foreground">{chartData.total}</span>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
