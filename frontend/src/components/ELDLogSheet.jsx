import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material'

const WIDTH = 1100
const HEIGHT = 460
const LEFT_PAD = 120
const RIGHT_PAD = 90
const TOP_PAD = 50
const BOTTOM_PAD = 40
const MINUTES_PER_DAY = 1440

// Remarks layout constants
const REMARKS_GAP = 14       // gap between grid bottom and remarks box top
const REMARKS_BOX_H = 22     // height of the tick-mark strip (the box itself)
const BRACKET_HANG = 20      // how far the U-bracket hangs below the box bottom
const LABEL_AREA_H = 200     // vertical space reserved below bracket for labels

const STATUSES = [
  { key: 'OFF_DUTY', label: 'Off Duty' },
  { key: 'SLEEPER', label: 'Sleeper Berth' },
  { key: 'DRIVING', label: 'Driving' },
  { key: 'ON_DUTY_NOT_DRIVING', label: 'On Duty (Not Driving)' },
]

const STATUS_INDEX = {
  OFF_DUTY: 0,
  SLEEPER: 1,
  DRIVING: 2,
  ON_DUTY_NOT_DRIVING: 3,
}

function clampMinute(value) {
  const minute = Number(value)
  if (!Number.isFinite(minute)) return 0
  return Math.max(0, Math.min(1440, minute))
}

function normalizeStatus(status) {
  const s = String(status ?? '').trim().toUpperCase().replace(/\s+/g, '_')
  if (s === 'OFF_DUTY' || s === 'OFF' || s === 'OFFDUTY') return 'OFF_DUTY'
  if (s === 'SLEEPER' || s === 'SLEEPER_BERTH' || s === 'SB') return 'SLEEPER'
  if (s === 'DRIVING' || s === 'DRIVE') return 'DRIVING'
  if (s === 'ON_DUTY_NOT_DRIVING' || s === 'ON_DUTY' || s === 'ONDUTY') return 'ON_DUTY_NOT_DRIVING'
  return 'ON_DUTY_NOT_DRIVING'
}

function hourLabel(hour) {
  if (hour === 0) return 'Midnight'
  if (hour === 12) return 'Noon'
  if (hour === 24) return ''
  return String(hour)
}

function stopTypeFromRemark(remark) {
  const rawStopType = String(remark?.stop_type ?? '').trim().toLowerCase()
  if (rawStopType) return rawStopType
  const rawReason = String(remark?.reason ?? '').trim().toLowerCase()
  if (rawReason.includes('pick')) return 'pickup'
  if (rawReason.includes('drop') || rawReason.includes('post')) return 'dropoff'
  if (rawReason.includes('fuel')) return 'fuel'
  if (rawReason.includes('break')) return 'break'
  return 'stop'
}

function reasonFromStopType(stopType, fallbackReason) {
  const r = String(fallbackReason ?? '').trim()
  if (r) return r

  if (stopType === 'pickup') return 'Pre-trip'
  if (stopType === 'break') return '30-min break'
  if (stopType === 'fuel') return 'Fuel'
  if (stopType === 'dropoff') return 'Post-trip'
  return 'Stop'
}

function coordKey(lng, lat) {
  const lngNum = Number(lng)
  const latNum = Number(lat)
  if (!Number.isFinite(lngNum) || !Number.isFinite(latNum)) return null
  return `${lngNum.toFixed(5)},${latNum.toFixed(5)}`
}

function parseCityState(features) {
  let city = ''
  let state = ''
  for (const feature of features || []) {
    const types = feature?.place_type || []
    if (!city && (types.includes('place') || types.includes('locality'))) {
      city = feature?.text || ''
    }
    if (!state && types.includes('region')) {
      const shortCode = String(feature?.properties?.short_code ?? '').toUpperCase()
      state = shortCode.includes('-') ? shortCode.split('-').pop() || '' : shortCode
    }
  }
  if (city && state) return `${city}, ${state}`
  if (city) return city
  if (state) return state
  return 'LOC'
}

async function reverseGeocodeLocationLabel(lng, lat, signal) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  if (!token) return 'LOC'
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`
  const params = new URLSearchParams({ types: 'place,locality,region', access_token: token })
  const response = await fetch(`${url}?${params.toString()}`, { signal })
  if (!response.ok) return 'LOC'
  const data = await response.json()
  return parseCityState(data?.features ?? [])
}

function ELDLogSheet({ day, events = [], remarks = [] }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const fontScale = isMobile ? 1.14 : 1
  const fs = (size) => Number((size * fontScale).toFixed(2))
  const plotWidth = WIDTH - LEFT_PAD - RIGHT_PAD
  const plotHeight = HEIGHT - TOP_PAD - BOTTOM_PAD
  const rowCount = 4
  const rowHeight = plotHeight / rowCount

  // x position for a given minute (unchanged)
  const x = (minute) => LEFT_PAD + (minute / MINUTES_PER_DAY) * plotWidth

  // Line runs through the CENTER of each row band (restored from original)
  const rowCenterY = (idx) => TOP_PAD + rowHeight * (idx + 0.5)

  // Remarks Y positions
  const gridBottom = TOP_PAD + plotHeight
  const remarksBoxTop = gridBottom + REMARKS_GAP
  const remarksBoxBottom = remarksBoxTop + REMARKS_BOX_H
  // Bracket hangs below the bottom of the remarks box
  const bracketTop = remarksBoxBottom           // bracket starts at box bottom
  const bracketBottom = bracketTop + BRACKET_HANG
  // Total SVG height accommodates labels below bracket
  const svgHeight = bracketBottom + LABEL_AREA_H

  const locationCacheRef = useRef({})
  const [locationLabels, setLocationLabels] = useState({})

  // ── Normalize events ──────────────────────────────────────────────────────
  const normalizedEvents = (Array.isArray(events) ? events : [])
    .map((event) => {
      const start = clampMinute(event?.start ?? event?.start_minute)
      const end = clampMinute(event?.end ?? event?.end_minute)
      if (end <= start) return null
      return { status: normalizeStatus(event?.status), start, end }
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start)

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalsByStatus = { OFF_DUTY: 0, SLEEPER: 0, DRIVING: 0, ON_DUTY_NOT_DRIVING: 0 }
  for (const ev of normalizedEvents) {
    if (Object.prototype.hasOwnProperty.call(totalsByStatus, ev.status)) {
      totalsByStatus[ev.status] += ev.end - ev.start
    }
  }

  // ── Build step-line path (original logic, unchanged) ──────────────────────
  let path = ''
  if (normalizedEvents.length > 0) {
    const first = normalizedEvents[0]
    path = `M ${x(first.start)} ${rowCenterY(STATUS_INDEX[first.status])}`

    for (let i = 0; i < normalizedEvents.length; i++) {
      const cur = normalizedEvents[i]
      const curY = rowCenterY(STATUS_INDEX[cur.status])
      const curEndX = x(cur.end)

      path += ` L ${curEndX} ${curY}`

      const next = normalizedEvents[i + 1]
      if (!next) continue

      const nextY = rowCenterY(STATUS_INDEX[next.status])
      const nextStartX = x(next.start)
      const isContiguous = next.start === cur.end

      if (isContiguous && nextY !== curY) {
        path += ` L ${curEndX} ${nextY}`
      }

      if (nextStartX !== curEndX || (!isContiguous && nextY !== curY)) {
        path += ` M ${nextStartX} ${nextY}`
      }
    }
  }

  // ── Normalize remarks ─────────────────────────────────────────────────────
  const normalizedRemarks = useMemo(
    () =>
      (Array.isArray(remarks) ? remarks : [])
        .map((remark) => {
          const stopType = stopTypeFromRemark(remark)
          const key = coordKey(remark?.lng, remark?.lat)
          const startMinute = clampMinute(remark?.start_minute ?? remark?.minute)
          const endMinute = clampMinute(remark?.end_minute ?? (startMinute + 30))
          return {
            minute: clampMinute(remark?.minute),
            startMinute,
            endMinute,
            stopType,
            reason: reasonFromStopType(stopType, remark?.reason),
            lng: remark?.lng,
            lat: remark?.lat,
            key,
          }
        })
        .sort((a, b) => a.minute - b.minute),
    [remarks],
  )

  // ── Reverse geocode ───────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController()
    const unresolved = normalizedRemarks.filter((r) => r.key && !locationCacheRef.current[r.key])

    if (unresolved.length === 0) {
      setLocationLabels({ ...locationCacheRef.current })
      return () => controller.abort()
    }

    const run = async () => {
      for (const remark of unresolved) {
        if (controller.signal.aborted) return
        const label = await reverseGeocodeLocationLabel(remark.lng, remark.lat, controller.signal)
        locationCacheRef.current[remark.key] = label
      }
      setLocationLabels({ ...locationCacheRef.current })
    }

    run()
    return () => controller.abort()
  }, [normalizedRemarks])

  // ── Stagger close remarks to avoid overlap ────────────────────────────────
  let prevRemarkX = null
  const renderedRemarks = normalizedRemarks.map((remark, idx) => {
    const xPos = x(remark.startMinute)
    const isClose = prevRemarkX !== null && Math.abs(xPos - prevRemarkX) < 55
    const level = isClose ? (idx % 2 === 0 ? 0 : 1) : 0
    prevRemarkX = xPos
    return { ...remark, xPos, level }
  })

  const strokeStrong = theme.palette.mode === 'dark' ? '#dbeafe' : '#0f172a'
  const strokeMajor = theme.palette.mode === 'dark' ? '#93c5fd' : '#334155'
  const strokeMinor = theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.55)' : '#cbd5e1'
  const textPrimary = theme.palette.text.primary
  const pathColor = theme.palette.primary.main

  return (
    <Box>
      <Typography
        variant="subtitle1"
        sx={{ mb: 1.25, letterSpacing: 0.2, fontSize: isMobile ? '1.05rem' : undefined }}
      >
        DRIVER&apos;S DAILY LOG (ONE CALENDAR DAY — 24 HOURS) — Day {day}
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${svgHeight}`}
          width="100%"
          style={{ display: 'block' }}
        >
          {/* ── Grid outer border ── */}
          <rect
            x={LEFT_PAD}
            y={TOP_PAD}
            width={plotWidth}
            height={plotHeight}
            fill="none"
            stroke={strokeStrong}
            strokeWidth="2.2"
          />

          {/* ── Vertical grid lines ── */}
          {Array.from({ length: 97 }).map((_, idx) => {
            const minute = idx * 15
            const lineX = x(minute)
            const isHour = minute % 60 === 0
            return (
              <line
                key={`tick-${minute}`}
                x1={lineX}
                y1={TOP_PAD}
                x2={lineX}
                y2={TOP_PAD + plotHeight}
                stroke={isHour ? strokeMajor : strokeMinor}
                strokeWidth={isHour ? 2 : 0.75}
              />
            )
          })}

          {/* ── Hour labels above grid ── */}
          {Array.from({ length: 25 }).map((_, hour) => (
            <text
              key={`hour-${hour}`}
              x={x(hour * 60)}
              y={TOP_PAD - 12}
              fontSize={fs(10)}
              textAnchor="middle"
              fill={textPrimary}
            >
              {hourLabel(hour)}
            </text>
          ))}

          {/* ── Row separators + status labels + totals ── */}
          {STATUSES.map((statusRow, idx) => {
            const lineY = TOP_PAD + rowHeight * idx
            const centerY = rowCenterY(idx)
            return (
              <g key={statusRow.key}>
                {idx > 0 && (
                  <line
                    x1={LEFT_PAD}
                    y1={lineY}
                    x2={LEFT_PAD + plotWidth}
                    y2={lineY}
                    stroke={strokeMajor}
                    strokeWidth="2.2"
                  />
                )}
                <text
                  x={LEFT_PAD - 10}
                  y={centerY + 4}
                  fontSize={fs(12)}
                  textAnchor="end"
                  fill={textPrimary}
                >
                  {statusRow.label}
                </text>
                <text
                  x={LEFT_PAD + plotWidth + 45}
                  y={centerY + 4}
                  fontSize={fs(13)}
                  textAnchor="middle"
                  fill={textPrimary}
                >
                  {(totalsByStatus[statusRow.key] / 60).toFixed(2)}
                </text>
              </g>
            )
          })}

          {/* ── Total hours column header ── */}
          <text
            x={LEFT_PAD + plotWidth + 45}
            y={TOP_PAD - 12}
            fontSize={fs(11)}
            textAnchor="middle"
            fill={textPrimary}
          >
            TOTAL HOURS
          </text>

          {/* ── Step line ── */}
          {path && (
            <path
              d={path}
              fill="none"
              stroke={pathColor}
              strokeWidth="6.5"
              strokeLinejoin="miter"
              strokeLinecap="butt"
            />
          )}

          {/* ════════════════════════════════════════════
              REMARKS SECTION
          ════════════════════════════════════════════ */}

          {/* "REMARKS" label — vertically centered to the box */}
          <text
            x={LEFT_PAD - 10}
            y={remarksBoxTop + REMARKS_BOX_H / 2 + 4}
            fontSize={fs(11)}
            fontWeight="700"
            textAnchor="end"
            fill={textPrimary}
          >
            REMARKS
          </text>

          {/* Remarks box outline */}
          <rect
            x={LEFT_PAD}
            y={remarksBoxTop}
            width={plotWidth}
            height={REMARKS_BOX_H}
            fill="none"
            stroke={strokeMajor}
            strokeWidth="1.8"
          />

          {/* Tick marks inside the remarks box (hang down from top) */}
          {Array.from({ length: 97 }).map((_, idx) => {
            const minute = idx * 15
            const lineX = x(minute)
            const isHour = minute % 60 === 0
            const tickLen = isHour ? REMARKS_BOX_H * 0.85 : REMARKS_BOX_H * 0.5
            return (
              <line
                key={`rtick-${minute}`}
                x1={lineX}
                y1={remarksBoxTop}
                x2={lineX}
                y2={remarksBoxTop + tickLen}
                stroke={isHour ? strokeMajor : strokeMinor}
                strokeWidth={isHour ? 2 : 0.9}
              />
            )
          })}

          {/* ── U-bracket markers + labels ── */}
          {renderedRemarks.map((remark, idx) => {
            const lx = x(remark.startMinute)
            const rxRaw = x(remark.endMinute)
            const rx = Math.max(rxRaw, lx + 18)
            const xMid = (lx + rx) / 2

            // Level offset: push staggered remarks further down so labels don't collide
            const lvlOff = remark.level * 22

            // Actual bracket extents for this remark
            const bTop = remarksBoxBottom + lvlOff
            const bBot = bTop + BRACKET_HANG

            // Small vertical pointer from bracket center to text anchors
            const pointerEndY = bBot + 12

            // Vertical text anchors (rotated -90, bottom-to-top)
            const reasonAnchorX = xMid - 7
            const locationAnchorX = xMid + 7
            const textAnchorY = pointerEndY + 44

            const locationLabel =
              (remark.key && locationLabels[remark.key]) || (remark.key ? 'LOC' : 'LOC')

            return (
              <g key={`remark-${idx}-${remark.minute}`}>
                {/* Left arm of U */}
                <line
                  x1={lx} y1={bTop}
                  x2={lx} y2={bBot}
                  stroke={pathColor} strokeWidth="3.3" strokeLinecap="square"
                />
                {/* Right arm of U */}
                <line
                  x1={rx} y1={bTop}
                  x2={rx} y2={bBot}
                  stroke={pathColor} strokeWidth="3.3" strokeLinecap="square"
                />
                {/* Bottom of U */}
                <line
                  x1={lx} y1={bBot}
                  x2={rx} y2={bBot}
                  stroke={pathColor} strokeWidth="3.3" strokeLinecap="square"
                />

                {/* Small vertical pointer from bracket center */}
                <line
                  x1={xMid}
                  y1={bBot}
                  x2={xMid}
                  y2={pointerEndY}
                  stroke={pathColor}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />

                {/* Reason label — vertical (bottom-to-top) */}
                <text
                  x={reasonAnchorX}
                  y={textAnchorY}
                  textAnchor="end"
                  fontSize={fs(10.5)}
                  fill={textPrimary}
                  transform={`rotate(-90 ${reasonAnchorX} ${textAnchorY})`}
                >
                  {remark.reason}
                </text>

                {/* Location label — vertical (bottom-to-top) */}
                <text
                  x={locationAnchorX}
                  y={textAnchorY}
                  fontSize={fs(11.5)}
                  fontWeight="600"
                  fill={textPrimary}
                  textAnchor="end"
                  transform={`rotate(-90 ${locationAnchorX} ${textAnchorY})`}
                >
                  {locationLabel}
                </text>
              </g>
            )
          })}
        </svg>
      </Box>
    </Box>
  )
}

export default ELDLogSheet
