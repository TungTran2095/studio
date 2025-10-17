'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

type PivotTableProps = {
  records: AttendanceRecord[]
  loading?: boolean
}

type SortConfig = {
  key: string
  direction: 'asc' | 'desc' | null
}

export function PivotTable({ records, loading = false }: PivotTableProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null })

  // Tạo dữ liệu pivot
  const pivotData = useMemo(() => {
    if (!records.length) return { offices: [], statuses: [], data: {} }

    // Lấy danh sách các trạng thái duy nhất
    const statuses = Array.from(new Set(
      records.map(r => r.statusname).filter(Boolean)
    )).sort()

    // Lấy danh sách các đơn vị duy nhất
    const offices = Array.from(new Set(
      records.map(r => r.OfficeName).filter(Boolean)
    )).sort((a, b) => a?.localeCompare(b || '', 'vi') || 0)

    // Tạo ma trận dữ liệu
    const data: Record<string, Record<string, number>> = {}
    
    offices.forEach(office => {
      data[office || ''] = {}
      statuses.forEach(status => {
        const count = records.filter(r => 
          r.OfficeName === office && r.statusname === status
        ).length
        data[office || ''][status] = count
      })
    })

    return { offices, statuses, data }
  }, [records])

  // Tính tổng theo cột
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    pivotData.statuses.forEach(status => {
      totals[status] = pivotData.offices.reduce((sum, office) => 
        sum + (pivotData.data[office || '']?.[status] || 0), 0
      )
    })
    return totals
  }, [pivotData])

  // Tính tổng theo dòng
  const rowTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    pivotData.offices.forEach(office => {
      totals[office || ''] = pivotData.statuses.reduce((sum, status) => 
        sum + (pivotData.data[office || '']?.[status] || 0), 0
      )
    })
    return totals
  }, [pivotData])

  // Sắp xếp dữ liệu
  const sortedOffices = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return pivotData.offices
    }

    return [...pivotData.offices].sort((a, b) => {
      let aValue: number
      let bValue: number

      if (sortConfig.key === 'office') {
        aValue = rowTotals[a || ''] || 0
        bValue = rowTotals[b || ''] || 0
      } else {
        aValue = pivotData.data[a || '']?.[sortConfig.key] || 0
        bValue = pivotData.data[b || '']?.[sortConfig.key] || 0
      }

      if (sortConfig.direction === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
  }, [pivotData.offices, pivotData.data, rowTotals, sortConfig])

  // Sắp xếp cột status
  const sortedStatuses = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction || sortConfig.key === 'office') {
      return pivotData.statuses
    }

    return [...pivotData.statuses].sort((a, b) => {
      const aValue = columnTotals[a] || 0
      const bValue = columnTotals[b] || 0

      if (sortConfig.direction === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
  }, [pivotData.statuses, columnTotals, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' }
        if (prev.direction === 'desc') return { key, direction: null }
        return { key, direction: 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3" />
    if (sortConfig.direction === 'asc') return <ArrowUp className="w-3 h-3" />
    if (sortConfig.direction === 'desc') return <ArrowDown className="w-3 h-3" />
    return <ArrowUpDown className="w-3 h-3" />
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Báo cáo chấm công theo đơn vị
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

  if (!records.length) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Báo cáo chấm công theo đơn vị
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
          Báo cáo chấm công theo đơn vị
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
          <div className="overflow-x-auto">
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold border-r border-b min-w-32">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('office')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        <span className="flex items-center gap-1">
                          Đơn vị
                          {getSortIcon('office')}
                        </span>
                      </Button>
                    </th>
                    {sortedStatuses.map(status => (
                      <th key={status} className="px-3 py-2 text-center font-semibold border-r border-b min-w-20">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort(status)}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          <span className="flex items-center gap-1">
                            {status}
                            {getSortIcon(status)}
                          </span>
                        </Button>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-semibold border-b bg-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('office')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        <span className="flex items-center gap-1">
                          Tổng cộng
                          {getSortIcon('office')}
                        </span>
                      </Button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOffices.map(office => (
                    <tr key={office} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border-r border-b font-medium">
                        {office}
                      </td>
                      {sortedStatuses.map(status => (
                        <td key={status} className="px-3 py-2 text-center border-r border-b">
                          {pivotData.data[office || '']?.[status] || 0}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center border-b bg-gray-50 font-semibold">
                        {rowTotals[office || ''] || 0}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold">
                    <td className="px-3 py-2 border-r border-b">
                      Tổng cộng
                    </td>
                    {sortedStatuses.map(status => (
                      <td key={status} className="px-3 py-2 text-center border-r border-b">
                        {columnTotals[status] || 0}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center border-b">
                      {Object.values(columnTotals).reduce((sum, val) => sum + val, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
