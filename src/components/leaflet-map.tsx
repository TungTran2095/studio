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

export function LeafletMap({ center, points }: { center: LatLng; points: Point[] }) {
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
    const icon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background:#2563eb;width:12px;height:12px;border-radius:9999px;border:2px solid white;box-shadow:0 0 0 2px rgba(37,99,235,0.3)"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    })
    points.forEach(p => {
      const m = L.marker([p.pos.lat, p.pos.lng], { icon }).addTo(map)
      const popup = `<div class=\"text-sm space-y-1\">\n        <div><strong>Tên:</strong> ${p.fullName ?? ''}</div>\n        <div><strong>Đơn vị:</strong> ${p.officeName ?? ''}</div>\n        <div><strong>Địa chỉ:</strong> ${p.address ?? ''}</div>\n        <div><strong>Trạng thái:</strong> ${p.status ?? ''}</div>\n        ${p.when ? `<div><strong>Ngày:</strong> ${new Date(p.when).toLocaleString()}</div>` : ''}\n        <div><strong>Vị trí:</strong> ${p.pos.lat.toFixed(6)}, ${p.pos.lng.toFixed(6)}</div>\n      </div>`
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


