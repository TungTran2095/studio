'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LeafletMap } from '@/components/leaflet-map'
import { PivotTable } from '@/components/pivot-table'
import { AttendanceDonutChart } from '@/components/attendance-donut-chart'
import { AttendanceTrendChart } from '@/components/attendance-trend-chart'

// CSS đã được import ở layout để tránh lỗi tại client component

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

type LatLng = { lat: number; lng: number }

function parseLocation(value: unknown): LatLng | null {
  if (!value) return null

  // Trường hợp GeoJSON { type: 'Point', coordinates: [lng, lat] }
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as any).type === 'Point' &&
    Array.isArray((value as any).coordinates)
  ) {
    const coords = (value as any).coordinates as any[]
    const lng = Number(coords[0])
    const lat = Number(coords[1])
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  }

  // Trường hợp mảng [lat, lng] hoặc [lng, lat]
  if (Array.isArray(value) && value.length >= 2) {
    const a = Number(value[0])
    const b = Number(value[1])
    // Ưu tiên hiểu là [lat, lng] nếu giá trị hợp lệ
    if (Number.isFinite(a) && Number.isFinite(b)) {
      // Heuristic: nếu |a|<=90 và |b|<=180 thì coi là [lat,lng]
      if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b }
      return { lat: b, lng: a }
    }
  }

  // Trường hợp chuỗi "lat,lng" hoặc "lng,lat" hoặc WKT "POINT(lng lat)"
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === ',' || trimmed === '' || trimmed === ', ') return null
    // Dữ liệu thực tế là "lng, lat"
    const parts = trimmed.split(',')
    if (parts.length >= 2) {
      const lng = Number(parts[0])
      const lat = Number(parts[1])
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    }
    const wktMatch = trimmed.match(/^POINT\s*\(([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\)$/i)
    if (wktMatch) {
      const lng = Number(wktMatch[1])
      const lat = Number(wktMatch[2])
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    }
  }

  return null
}

// Dùng Leaflet thuần để kiểm soát vòng đời map

export function AttendanceDashboard({ userId }: { userId: string }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [filterName, setFilterName] = useState<string>('')
  const [filterUserCode, setFilterUserCode] = useState<string>('')
  const [filterOffice, setFilterOffice] = useState<string>('')
  const [selectedPoint, setSelectedPoint] = useState<{
    id: string | number
    when?: string
    pos: LatLng
    fullName?: string
    officeName?: string
    address?: string
    status?: string
  } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let ignore = false
    const fetchData = async () => {
      setLoading(true)
      try {
        let query = supabase
          .from('Chamcong')
          .select('"Id", "TimeKeepingDate", "CheckInLocation", "FullName", "OfficeName", "CheckInAddress", "statusname", "UserCode"')
          .order('"TimeKeepingDate"', { ascending: false })

        if (selectedDate) {
          query = query.eq('"TimeKeepingDate"', selectedDate)
        }

        const { data, error } = await query
        if (error) throw new Error(error.message || 'Supabase query error')
        if (!ignore) setRecords(data ?? [])
      } catch (e) {
        console.error('Lỗi tải dữ liệu chấm công:', e)
        if (!ignore) setRecords([])
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    fetchData()
    return () => {
      ignore = true
    }
  }, [userId, selectedDate])

  const officeOptions = useMemo(() => {
    const set = new Set<string>()
    records.forEach(r => {
      const v = (r.OfficeName || '').trim()
      if (v) set.add(v)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [records])

  const filteredRecords = useMemo(() => {
    const name = filterName.trim().toLowerCase()
    const code = filterUserCode.trim().toLowerCase()
    const office = filterOffice.trim().toLowerCase()
    return records.filter(r => {
      if (name && !(r.FullName || '').toLowerCase().includes(name)) return false
      if (code && !(r.UserCode || '').toLowerCase().includes(code)) return false
      if (office && (r.OfficeName || '').toLowerCase() !== office) return false
      return true
    })
  }, [records, filterName, filterUserCode, filterOffice])

  const points = useMemo(() => {
    const parsed = filteredRecords.map(r => {
      const pos = parseLocation(r.CheckInLocation)
      return {
        id: r.Id,
        when: r.TimeKeepingDate as string | undefined,
        pos,
        fullName: r.FullName,
        officeName: r.OfficeName,
        address: r.CheckInAddress,
        status: r.statusname,
      }
    })
    const valid = parsed.filter(p => p.pos !== null) as {
      id: string | number
      when?: string
      pos: LatLng
      fullName?: string
      officeName?: string
      address?: string
      status?: string
    }[]
    return valid
  }, [filteredRecords])

  const center = useMemo<LatLng>(() => {
    if (points.length > 0) return points[0].pos
    // Trung tâm Việt Nam mặc định
    return { lat: 16.047, lng: 108.206 }
  }, [points])

  const handlePointClick = (point: {
    id: string | number
    when?: string
    pos: LatLng
    fullName?: string
    officeName?: string
    address?: string
    status?: string
  }) => {
    setSelectedPoint(point)
  }

  // Bảng tổng hợp đã được gỡ bỏ theo yêu cầu

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-3">
        <div className="text-sm text-muted-foreground">
          {loading ? 'Đang tải vị trí chấm công…' : `Có ${points.length} điểm chấm công`}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm">Lọc theo ngày:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
      </div>
      {/* Đã bỏ bảng tổng hợp */}
      <div className="w-full h-[600px] rounded-md overflow-hidden border relative">
        <div className="px-3 py-2 border-b font-semibold bg-white relative z-10">Bản đồ chấm công</div>
        <div className="p-3 flex flex-wrap gap-3 items-center border-b bg-gray-50 relative z-10">
          <input
            type="text"
            placeholder="Lọc theo tên (FullName)"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-56 bg-white"
          />
          <input
            type="text"
            placeholder="Lọc theo mã nhân viên (UserCode)"
            value={filterUserCode}
            onChange={(e) => setFilterUserCode(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-48 bg-white"
          />
          <select
            value={filterOffice}
            onChange={(e) => setFilterOffice(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-56 bg-white"
          >
            <option value="">Tất cả bộ phận</option>
            {officeOptions.map(o => (
              <option key={o} value={o.toLowerCase()}>{o}</option>
            ))}
          </select>
        </div>
        <div className="relative z-0" style={{ height: 'calc(100% - 120px)' }}>
          {mounted ? (
            <LeafletMap 
              center={center} 
              points={points} 
              onPointClick={handlePointClick}
              selectedPointId={selectedPoint?.id}
            />
          ) : null}
        </div>
      </div>
      
      {/* Thông tin chi tiết điểm được chọn */}
      {selectedPoint && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-blue-900">Thông tin chi tiết điểm chấm công</h3>
            <button
              onClick={() => setSelectedPoint(null)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ✕ Đóng
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded border">
              <div className="text-sm text-gray-600">Họ và tên</div>
              <div className="font-semibold">{selectedPoint.fullName || 'N/A'}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-sm text-gray-600">Đơn vị</div>
              <div className="font-semibold">{selectedPoint.officeName || 'N/A'}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-sm text-gray-600">Trạng thái</div>
              <div className="font-semibold text-blue-600">{selectedPoint.status || 'N/A'}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-sm text-gray-600">Ngày giờ</div>
              <div className="font-semibold">
                {selectedPoint.when ? new Date(selectedPoint.when).toLocaleString('vi-VN') : 'N/A'}
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-sm text-gray-600">Địa chỉ</div>
              <div className="font-semibold">{selectedPoint.address || 'N/A'}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-sm text-gray-600">Tọa độ</div>
              <div className="font-mono text-sm">
                {selectedPoint.pos.lat.toFixed(6)}, {selectedPoint.pos.lng.toFixed(6)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Pivot Table dưới map */}
      <div className="mt-6">
        <PivotTable records={records} loading={loading} />
      </div>

      {/* Donut Chart dưới Pivot Table */}
      <div className="mt-6">
        <AttendanceDonutChart records={records} loading={loading} />
      </div>

      {/* Trend Chart dưới Donut Chart */}
      <div className="mt-6">
        <AttendanceTrendChart records={records} selectedDate={selectedDate} loading={loading} />
      </div>
    </div>
  )
}


