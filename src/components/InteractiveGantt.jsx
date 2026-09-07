import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar, Clock, CheckCircle2, AlertTriangle, ZoomIn, ZoomOut,
  ChevronDown, ChevronRight, CheckSquare, Square, Layers, Flame,
  Printer, ArrowLeft, ArrowRight, Sparkles, Filter, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { PROJECT_PHASES } from '../utils/constants';
import { fmtDate, todayISO } from '../utils/helpers';

export default function InteractiveGantt({ project, onUpdate }) {
  // Zoom level: 'days' | 'weeks' | 'months'
  const [zoom, setZoom] = useState('weeks');
  // View mode: 'tree' (hierarchical) | 'phases' (summary)
  const [viewMode, setViewMode] = useState('tree');
  // Expanded phases map
  const [expandedPhases, setExpandedPhases] = useState({
    phase1: true,
    phase2: true,
    phase3: true,
    phase4: true,
  });
  // Critical path highlight toggle
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  // Filter status: 'all' | 'delayed' | 'in_progress' | 'pending' | 'done'
  const [statusFilter, setStatusFilter] = useState('all');

  const scrollContainerRef = useRef(null);

  // Parse project timeline
  const projectStartStr = project.startDate || todayISO();
  const projectStart = useMemo(() => new Date(projectStartStr), [projectStartStr]);

  // Merge phase data
  const phases = useMemo(() => {
    const saved = project.phasesData || {};
    let runningDate = new Date(projectStart);

    return PROJECT_PHASES.map((ph, idx) => {
      const phSaved = saved[ph.id] || {};
      const durationDays = ph.durationDays || 15;

      let startD = phSaved.startDate ? new Date(phSaved.startDate) : new Date(runningDate);
      let endD = phSaved.endDate
        ? new Date(phSaved.endDate)
        : new Date(startD.getTime() + durationDays * 86400000);

      // Advance running date for next phase
      runningDate = new Date(endD);

      const items = ph.items.map((item, itemIdx) => {
        const itemSaved = phSaved.items?.[item.id] || {};
        const isDone = itemSaved.done || false;
        const itemDuration = itemSaved.durationDays || Math.max(2, Math.round(durationDays / ph.items.length));
        
        // Approximate item start & end
        const itemStart = itemSaved.startDate
          ? new Date(itemSaved.startDate)
          : new Date(startD.getTime() + (itemIdx * (durationDays / ph.items.length)) * 86400000);
        const itemEnd = itemSaved.endDate
          ? new Date(itemSaved.endDate)
          : new Date(itemStart.getTime() + itemDuration * 86400000);

        return {
          ...item,
          done: isDone,
          startDate: itemSaved.startDate || itemStart.toISOString().slice(0, 10),
          endDate: itemSaved.endDate || itemEnd.toISOString().slice(0, 10),
          durationDays: itemDuration,
          startD: itemStart,
          endD: itemEnd,
        };
      });

      const doneItems = items.filter((i) => i.done).length;
      const pct = Math.round((doneItems / items.length) * 100);

      // Determine phase status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let status = 'pending';
      if (pct === 100) status = 'done';
      else if (endD < today && pct < 100) status = 'delayed';
      else if (pct > 0 || (startD <= today && endD >= today)) status = 'in_progress';

      return {
        ...ph,
        startDate: phSaved.startDate || startD.toISOString().slice(0, 10),
        endDate: phSaved.endDate || endD.toISOString().slice(0, 10),
        durationDays,
        startD,
        endD,
        pct,
        status,
        items,
        isCritical: idx >= 0, // All main sequential finishing phases form the critical path chain
      };
    });
  }, [project.phasesData, projectStart]);

  // Calculate overall timeline bounds
  const { minDate, maxDate, totalTimelineDays } = useMemo(() => {
    let min = new Date(projectStart);
    let max = new Date(projectStart);

    phases.forEach((ph) => {
      if (ph.startD < min) min = new Date(ph.startD);
      if (ph.endD > max) max = new Date(ph.endD);
      ph.items.forEach((item) => {
        if (item.startD < min) min = new Date(item.startD);
        if (item.endD > max) max = new Date(item.endD);
      });
    });

    // Add margin of 3 days
    min.setDate(min.getDate() - 2);
    max.setDate(max.getDate() + 5);

    const diff = Math.max(14, Math.ceil((max - min) / (1000 * 60 * 60 * 24)));
    return { minDate: min, maxDate: max, totalTimelineDays: diff };
  }, [phases, projectStart]);

  // Today calculations
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayOffsetDays = Math.round((today - minDate) / (1000 * 60 * 60 * 24));
  const todayPercent = Math.max(0, Math.min(100, (todayOffsetDays / totalTimelineDays) * 100));

  // Time header units
  const timeUnits = useMemo(() => {
    const units = [];
    if (zoom === 'days') {
      for (let i = 0; i < totalTimelineDays; i++) {
        const d = new Date(minDate);
        d.setDate(d.getDate() + i);
        const dayNum = d.getDate();
        const monthNum = d.getMonth() + 1;
        const isFriday = d.getDay() === 5;
        const isToday = d.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);

        units.push({
          label: `${dayNum}/${monthNum}`,
          subLabel: d.toLocaleDateString('ar-EG', { weekday: 'narrow' }),
          offsetPct: (i / totalTimelineDays) * 100,
          widthPct: (1 / totalTimelineDays) * 100,
          isFriday,
          isToday,
        });
      }
    } else if (zoom === 'weeks') {
      const weekCount = Math.ceil(totalTimelineDays / 7);
      for (let w = 0; w < weekCount; w++) {
        const d = new Date(minDate);
        d.setDate(d.getDate() + w * 7);
        const endW = new Date(d);
        endW.setDate(endW.getDate() + 6);

        units.push({
          label: `أسبوع ${w + 1}`,
          subLabel: `${d.getDate()}/${d.getMonth() + 1} - ${endW.getDate()}/${endW.getMonth() + 1}`,
          offsetPct: ((w * 7) / totalTimelineDays) * 100,
          widthPct: (7 / totalTimelineDays) * 100,
        });
      }
    } else {
      // Months
      const monthCount = Math.ceil(totalTimelineDays / 30);
      for (let m = 0; m < monthCount; m++) {
        const d = new Date(minDate);
        d.setDate(d.getDate() + m * 30);

        units.push({
          label: d.toLocaleDateString('ar-EG', { month: 'long' }),
          subLabel: `${d.getFullYear()}`,
          offsetPct: ((m * 30) / totalTimelineDays) * 100,
          widthPct: (30 / totalTimelineDays) * 100,
        });
      }
    }
    return units;
  }, [minDate, totalTimelineDays, zoom, today]);

  // Handlers for updating phase & item data
  const handlePhaseChange = (phaseId, field, value) => {
    const saved = project.phasesData || {};
    const phData = saved[phaseId] || {};
    onUpdate({
      phasesData: {
        ...saved,
        [phaseId]: { ...phData, [field]: value },
      },
    });
  };

  const handleItemToggle = (phaseId, itemId) => {
    const saved = project.phasesData || {};
    const phData = saved[phaseId] || {};
    const items = phData.items || {};
    const currentDone = items[itemId]?.done || false;
    onUpdate({
      phasesData: {
        ...saved,
        [phaseId]: {
          ...phData,
          items: {
            ...items,
            [itemId]: { ...items[itemId], done: !currentDone },
          },
        },
      },
    });
  };

  const togglePhaseExpand = (phaseId) => {
    setExpandedPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const scrollToToday = () => {
    if (scrollContainerRef.current) {
      const scrollWidth = scrollContainerRef.current.scrollWidth;
      const clientWidth = scrollContainerRef.current.clientWidth;
      const scrollPos = (todayPercent / 100) * scrollWidth - clientWidth / 2;
      scrollContainerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  };

  // Helper to convert date to bar position percentage
  const getBarPosition = (startD, endD) => {
    const startOffset = Math.max(0, Math.round((startD - minDate) / (1000 * 60 * 60 * 24)));
    const duration = Math.max(1, Math.round((endD - startD) / (1000 * 60 * 60 * 24)));
    const leftPct = (startOffset / totalTimelineDays) * 100;
    const widthPct = Math.max(1.5, (duration / totalTimelineDays) * 100);
    return { leftPct, widthPct, duration };
  };

  // Summary Metrics
  const totalTasks = phases.reduce((acc, ph) => acc + ph.items.length, 0);
  const completedTasks = phases.reduce((acc, ph) => acc + ph.items.filter((i) => i.done).length, 0);
  const overallProgress = Math.round((completedTasks / (totalTasks || 1)) * 100);
  const delayedPhasesCount = phases.filter((ph) => ph.status === 'delayed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Top Controls Toolbar */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Left Side: Title & Key Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#0F172A',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>
                مخطط جانت الزمني التفاعلي
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                إجمالي المدة: <strong style={{ color: 'var(--ink)' }}>{totalTimelineDays} يوم</strong> • نسبة الإنجاز:{' '}
                <strong style={{ color: 'var(--teal)' }}>{overallProgress}%</strong>
              </div>
            </div>
          </div>

          {delayedPhasesCount > 0 && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 10,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AlertTriangle size={14} />
              {delayedPhasesCount} مراحل متأخرة عن الجدول
            </div>
          )}
        </div>

        {/* Right Side: Zoom Controls, Critical Path, and View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Zoom Buttons */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.04)',
              borderRadius: 10,
              padding: 3,
              border: '1px solid var(--border)',
            }}
          >
            {[
              { key: 'days', label: 'أيام' },
              { key: 'weeks', label: 'أسابيع' },
              { key: 'months', label: 'شهور' },
            ].map((z) => (
              <button
                key={z.key}
                type="button"
                onClick={() => setZoom(z.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: zoom === z.key ? 800 : 600,
                  background: zoom === z.key ? 'var(--card)' : 'transparent',
                  color: zoom === z.key ? 'var(--ink)' : 'var(--muted)',
                  cursor: 'pointer',
                  boxShadow: zoom === z.key ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {z.label}
              </button>
            ))}
          </div>

          {/* Jump to Today */}
          <button
            type="button"
            onClick={scrollToToday}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--ink)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Clock size={14} color="#EF4444" />
            تاريخ اليوم
          </button>

          {/* Critical Path Toggle */}
          <button
            type="button"
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              border: `1.5px solid ${showCriticalPath ? '#DC2626' : 'var(--border)'}`,
              background: showCriticalPath ? 'rgba(239, 68, 68, 0.08)' : 'var(--card)',
              color: showCriticalPath ? '#DC2626' : 'var(--muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Flame size={15} color={showCriticalPath ? '#DC2626' : 'var(--muted)'} />
            المسار الحرج
          </button>

          {/* View Mode Toggle */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'tree' ? 'phases' : 'tree')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--ink)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Layers size={14} />
            {viewMode === 'tree' ? 'المراحل الرئيسية فقط' : 'عرض شجري تفصيلي'}
          </button>
        </div>
      </div>

      {/* Main Gantt Canvas Panel */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Scrollable Timeline Area */}
        <div
          ref={scrollContainerRef}
          style={{
            overflowX: 'auto',
            position: 'relative',
            width: '100%',
            minHeight: 460,
          }}
        >
          <div
            style={{
              minWidth: zoom === 'days' ? Math.max(1200, totalTimelineDays * 42) : 900,
              position: 'relative',
            }}
          >
            {/* Header: Timeline Grid Legend */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1.5px solid var(--border)',
                background: 'rgba(0,0,0,0.03)',
                position: 'sticky',
                top: 0,
                zIndex: 20,
              }}
            >
              {/* Fixed Left Column for Task/Phase Names */}
              <div
                style={{
                  width: 280,
                  flexShrink: 0,
                  padding: '12px 18px',
                  fontWeight: 800,
                  fontSize: 13,
                  color: 'var(--ink)',
                  borderLeft: '1.5px solid var(--border)',
                  background: 'var(--card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>المرحلة / البند التنفيذي</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                  المدة / الإنجاز
                </span>
              </div>

              {/* Time Scale Bar */}
              <div style={{ flex: 1, position: 'relative', height: 50, display: 'flex' }}>
                {timeUnits.map((u, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${u.offsetPct}%`,
                      width: `${u.widthPct}%`,
                      height: '100%',
                      borderRight: '1px solid var(--border)',
                      padding: '6px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      background: u.isFriday
                        ? 'rgba(0,0,0,0.04)'
                        : u.isToday
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: u.isToday ? 900 : 700,
                        color: u.isToday ? '#EF4444' : 'var(--ink)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.label}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: u.isToday ? '#EF4444' : 'var(--muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.subLabel}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Today Line Indicator */}
            {todayOffsetDays >= 0 && todayOffsetDays <= totalTimelineDays && (
              <div
                style={{
                  position: 'absolute',
                  left: `calc(280px + (100% - 280px) * ${todayPercent / 100})`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: '#EF4444',
                  zIndex: 15,
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: -18,
                    background: '#EF4444',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                  }}
                >
                  اليوم
                </div>
              </div>
            )}

            {/* Gantt Rows */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {phases.map((ph, pi) => {
                const { leftPct, widthPct, duration } = getBarPosition(ph.startD, ph.endD);
                const isExpanded = expandedPhases[ph.id];
                const isDelayed = ph.status === 'delayed';

                return (
                  <React.Fragment key={ph.id}>
                    {/* Phase Summary Row */}
                    <div
                      style={{
                        display: 'flex',
                        borderBottom: '1px solid var(--border)',
                        background: isExpanded ? `${ph.color}08` : 'transparent',
                        transition: 'background 0.2s',
                        minHeight: 52,
                      }}
                    >
                      {/* Name Column */}
                      <div
                        style={{
                          width: 280,
                          flexShrink: 0,
                          padding: '10px 16px',
                          borderLeft: '1.5px solid var(--border)',
                          background: 'var(--card)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        {viewMode === 'tree' && (
                          <button
                            type="button"
                            onClick={() => togglePhaseExpand(ph.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--muted)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: 2,
                            }}
                          >
                            {isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                          </button>
                        )}

                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            background: ph.color,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {pi + 1}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 13,
                              color: 'var(--ink)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span style={{ truncate: true }}>{ph.name}</span>
                            {showCriticalPath && ph.isCritical && (
                              <Flame size={12} color="#EF4444" title="مسار حرج" />
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: ph.color, fontWeight: 600 }}>
                            {ph.pct}% مكتمل • {duration} يوم
                          </div>
                        </div>
                      </div>

                      {/* Bar Track Area */}
                      <div
                        style={{
                          flex: 1,
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 8px',
                        }}
                      >
                        {/* Grid lines background */}
                        {timeUnits.map((u, i) => (
                          <div
                            key={i}
                            style={{
                              position: 'absolute',
                              left: `${u.offsetPct}%`,
                              top: 0,
                              bottom: 0,
                              width: 1,
                              background: 'var(--border)',
                              opacity: 0.35,
                            }}
                          />
                        ))}

                        {/* Phase Bar */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            height: 32,
                            borderRadius: 8,
                            background: ph.color,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 12px',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            overflow: 'hidden',
                            border: isDelayed ? '2px solid #EF4444' : 'none',
                            zIndex: 5,
                          }}
                        >
                          {/* Inner Progress Fill */}
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: `${ph.pct}%`,
                              background: 'rgba(255,255,255,0.22)',
                              borderTopRightRadius: 6,
                              borderBottomRightRadius: 6,
                            }}
                          />

                          <span style={{ position: 'relative', zIndex: 2, whiteSpace: 'nowrap' }}>
                            {ph.name} ({duration}ي)
                          </span>
                          <span
                            style={{
                              position: 'relative',
                              zIndex: 2,
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            {ph.pct}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Sub-items Rows (Tree Mode) */}
                    {viewMode === 'tree' &&
                      isExpanded &&
                      ph.items.map((item) => {
                        const itemPos = getBarPosition(item.startD, item.endD);
                        const isItemDelayed = !item.done && item.endD < today;

                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              borderBottom: '1px dashed var(--border)',
                              background: item.done ? 'rgba(16, 185, 129, 0.03)' : 'transparent',
                              minHeight: 40,
                            }}
                          >
                            {/* Item Name Column */}
                            <div
                              style={{
                                width: 280,
                                flexShrink: 0,
                                padding: '8px 16px 8px 36px',
                                borderLeft: '1.5px solid var(--border)',
                                background: 'var(--card)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleItemToggle(ph.id, item.id)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  color: item.done ? 'var(--teal)' : 'var(--muted)',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                {item.done ? (
                                  <CheckSquare size={17} color="var(--teal)" />
                                ) : (
                                  <Square size={17} />
                                )}
                              </button>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: item.done ? 600 : 700,
                                    color: item.done ? 'var(--muted)' : 'var(--ink)',
                                    textDecoration: item.done ? 'line-through' : 'none',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                  title={item.label}
                                >
                                  {item.label}
                                </div>
                              </div>
                            </div>

                            {/* Item Bar Area */}
                            <div
                              style={{
                                flex: 1,
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              {/* Item Bar */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${itemPos.leftPct}%`,
                                  width: `${itemPos.widthPct}%`,
                                  height: 20,
                                  borderRadius: 5,
                                  background: item.done
                                    ? '#10B981'
                                    : isItemDelayed
                                    ? '#EF4444'
                                    : `${ph.color}99`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '0 8px',
                                  color: '#fff',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {item.done ? '✅ مكتمل' : `${item.durationDays} يوم`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Legend & Quick Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            background: 'rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            fontSize: 12,
          }}
        >
          {/* Legend Items */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: '#10B981',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: 'var(--muted)' }}>بند مكتمل</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: '#F59E0B',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: 'var(--muted)' }}>جاري التنفيذ</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: '#EF4444',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: 'var(--muted)' }}>متأخر عن الموعد</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flame size={14} color="#EF4444" />
              <span style={{ color: 'var(--muted)' }}>مسار حرج متسلسل</span>
            </div>
          </div>

          <div style={{ color: 'var(--muted)', fontSize: 11 }}>
            💡 انقر على بنود المرحلة لتحديث حالة الإنجاز مباشرة
          </div>
        </div>
      </div>
    </div>
  );
}
