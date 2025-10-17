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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
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

type AttendanceTrendChartProps = {
  records: AttendanceRecord[]
  selectedDate: string
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

export function AttendanceTrendChart({ records, selectedDate, loading = false }: AttendanceTrendChartProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Tạo danh sách tất cả các ngày trong tháng
  const monthDays = useMemo(() => {
    if (!selectedDate) return []
    
    const date = new Date(selectedDate)
    const year = date.getFullYear()
    const month = date.getMonth()
    
    // Lấy số ngày trong tháng
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    // Tạo mảng tất cả các ngày trong tháng
    const days = []
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day)
      const dateString = dayDate.toISOString().split('T')[0] // Format: YYYY-MM-DD
      days.push({
        date: dateString,
        day: day,
        dayName: dayDate.toLocaleDateString('vi-VN', { weekday: 'short' })
      })
    }
    
    return days
  }, [selectedDate])

  // Xử lý dữ liệu cho line chart
  const chartData = useMemo(() => {
    if (!records.length || !monthDays.length) return { data: [], statuses: [] }

    // Lọc dữ liệu theo tháng được chọn
    const selectedDateObj = new Date(selectedDate)
    const selectedYear = selectedDateObj.getFullYear()
    const selectedMonth = selectedDateObj.getMonth()

    // Nhóm dữ liệu theo ngày và trạng thái
    const dailyData: Record<string, Record<string, number>> = {}
    const allStatuses = new Set<string>()

    records.forEach(record => {
      if (!record.TimeKeepingDate || !record.statusname) return

      const recordDate = new Date(record.TimeKeepingDate)
      const recordYear = recordDate.getFullYear()
      const recordMonth = recordDate.getMonth()

      // Debug: Log một vài record để kiểm tra
      if (Math.random() < 0.01) { // Chỉ log 1% để không spam console
        console.log('Record debug:', {
          TimeKeepingDate: record.TimeKeepingDate,
          recordDate: recordDate.toISOString(),
          recordYear,
          recordMonth,
          selectedYear,
          selectedMonth,
          statusname: record.statusname
        })
      }

      // Chỉ lấy dữ liệu của tháng được chọn
      if (recordYear !== selectedYear || recordMonth !== selectedMonth) {
        return
      }

      const date = record.TimeKeepingDate
      const status = record.statusname

      if (!dailyData[date]) {
        dailyData[date] = {}
      }

      if (!dailyData[date][status]) {
        dailyData[date][status] = 0
      }

      dailyData[date][status]++
      allStatuses.add(status)
    })

    // Tạo dữ liệu cho chart với tất cả các ngày trong tháng
    const data = monthDays.map(({ date, day, dayName }) => {
      const dayData: Record<string, any> = { 
        date: date,
        day: day,
        dayName: dayName,
        display: `${day}/${monthDays[0]?.date.split('-')[1]}`
      }
      
      allStatuses.forEach(status => {
        dayData[status] = dailyData[date]?.[status] || 0
      })

      return dayData
    })

    console.log('TrendChart Debug:', {
      selectedDate,
      selectedYear,
      selectedMonth,
      recordsLength: records.length,
      monthDaysLength: monthDays.length,
      allStatuses: Array.from(allStatuses),
      dailyData,
      data: data.slice(0, 5) // Chỉ log 5 ngày đầu
    })

    return {
      data,
      statuses: Array.from(allStatuses).sort()
    }
  }, [records, monthDays, selectedDate])

  // Tạo config cho chart với màu sắc động
  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {}
    
    chartData.statuses.forEach((status, index) => {
      const color = STATUS_COLORS[status] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
      config[status] = {
        label: status,
        color: color
      }
    })

    return config
  }, [chartData.statuses])

  // Lấy thông tin tháng hiện tại
  const currentMonth = useMemo(() => {
    if (!selectedDate) return ''
    const date = new Date(selectedDate)
    return date.toLocaleDateString('vi-VN', { 
      year: 'numeric', 
      month: 'long' 
    })
  }, [selectedDate])

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Biểu đồ xu hướng chấm công - {currentMonth}
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

  if (!selectedDate || !records.length || !chartData.data.length) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Biểu đồ xu hướng chấm công
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
              {!selectedDate ? 'Vui lòng chọn ngày để xem biểu đồ' : 'Không có dữ liệu chấm công'}
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
          Biểu đồ xu hướng chấm công - {currentMonth}
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
          <div className="h-96 w-full">
            <ChartContainer config={chartConfig} className="h-full">
              <LineChart data={chartData.data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="display" 
                  className="text-xs"
                  interval="preserveStartEnd"
                />
                <YAxis className="text-xs" />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0]) {
                      const dayData = payload[0].payload
                      return `${dayData.dayName}, ngày ${dayData.day}`
                    }
                    return value
                  }}
                />
                <ChartLegend content={<ChartLegendContent />} />
                
                {chartData.statuses.map((status, index) => {
                  const color = STATUS_COLORS[status] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                  return (
                    <Line
                      key={status}
                      type="monotone"
                      dataKey={status}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: color }}
                      activeDot={{ r: 5, fill: color }}
                      connectNulls={false}
                    />
                  )
                })}
              </LineChart>
            </ChartContainer>
          </div>
          
          {/* Thống kê tổng quan tháng */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {chartData.statuses.map((status, index) => {
              const total = chartData.data.reduce((sum, day) => sum + (day[status] || 0), 0)
              const daysWithData = chartData.data.filter(day => (day[status] || 0) > 0).length
              const avg = daysWithData > 0 ? (total / daysWithData).toFixed(1) : '0'
              
              return (
                <div key={status} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[status] || DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{status}</span>
                  </div>
                  <div className="text-lg font-bold">{total}</div>
                  <div className="text-xs text-muted-foreground">
                    TB: {avg}/ngày ({daysWithData} ngày)
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
