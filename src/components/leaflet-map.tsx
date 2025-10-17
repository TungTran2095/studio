'use client'

import { useEffect, useRef } from 'react'

type LatLng = { lat: number; lng: number }

type Point = {
  id: string | number
  when?: string
  pos: LatLng
  fullName?: string
  officeName?: string
  address?: string
  status?: string
}

type LeafletMapProps = {
  center: LatLng
  points: Point[]
  onPointClick?: (point: Point) => void
  selectedPointId?: string | number
}

export function LeafletMap({ center, points, onPointClick, selectedPointId }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any | null>(null)
  const markersRef = useRef<any[]>([])
  const LRef = useRef<any | null>(null)

  useEffect(() => {
    let canceled = false
    const init = async () => {
      if (!containerRef.current) return
      if (!LRef.current) {
        const mod = await import('leaflet')
        if (canceled) return
        LRef.current = mod
      }
      const L = LRef.current
      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current).setView([center.lat, center.lng], 12)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current)
      } else {
        mapRef.current.setView([center.lat, center.lng])
      }
    }
    init()

    return () => {
      canceled = true
      // Cleanup đầy đủ khi unmount
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [center.lat, center.lng])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !LRef.current) return
    const L = LRef.current
    // Xoá markers cũ
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Thêm markers mới
    points.forEach(p => {
      const isSelected = selectedPointId === p.id
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:${isSelected ? '#dc2626' : '#2563eb'};width:${isSelected ? '16' : '12'}px;height:${isSelected ? '16' : '12'}px;border-radius:9999px;border:2px solid white;box-shadow:0 0 0 2px rgba(${isSelected ? '220,38,38' : '37,99,235'},0.3)"></div>`,
        iconSize: [isSelected ? 16 : 12, isSelected ? 16 : 12],
        iconAnchor: [isSelected ? 8 : 6, isSelected ? 8 : 6],
      })
      
      const m = L.marker([p.pos.lat, p.pos.lng], { icon }).addTo(map)
      
      // Thêm click event thay vì popup
      m.on('click', () => {
        if (onPointClick) {
          onPointClick(p)
        }
      })
      
      // Vẫn giữ popup đơn giản cho hover
      const popup = `<div class="text-xs">
        <div><strong>${p.fullName ?? 'N/A'}</strong></div>
        <div>${p.status ?? 'N/A'}</div>
        <div class="text-gray-500">Click để xem chi tiết</div>
      </div>`
      m.bindPopup(popup)
      
      markersRef.current.push(m)
    })

    // Fit bounds nếu có nhiều điểm
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current)
      map.fitBounds(group.getBounds().pad(0.2))
    } else {
      map.setView([center.lat, center.lng], 12)
    }
  }, [points])

  return <div ref={containerRef} style={{ height: '100%', width: '100%', zIndex: 0 }} />
}


