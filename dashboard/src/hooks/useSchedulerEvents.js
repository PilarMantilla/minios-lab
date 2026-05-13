import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

// Palette of visually distinct colors for processes. Avoids gray (TERMINATED)
// and red (reserved for BLOCKED).
const PROCESS_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#f97316', // orange
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#8b5cf6', // violet
];

export default function useSchedulerEvents() {
  const [processes, setProcesses] = useState({});
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [currentSlice, setCurrentSlice] = useState(500);
  const [isCapturing, setIsCapturing] = useState(true);
  const startTimeRef = useRef(null);
  const colorIndexRef = useRef(0);
  const colorByPidRef = useRef({});
  const isCapturingRef = useRef(true);

  // Time-freezing: while paused, the "clock" stops advancing.
  // pausedAtRef = timestamp (ms) when pause started, null if capturing.
  // totalPausedMsRef = accumulated pause duration across all pauses.
  const pausedAtRef = useRef(null);
  const totalPausedMsRef = useRef(0);

  // Keep the ref in sync with state so the WebSocket handler can read it
  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  const getRelativeTime = useCallback(() => {
    if (!startTimeRef.current) return 0;
    // If currently paused, freeze time at the moment pause started
    const refNow = pausedAtRef.current ?? Date.now();
    return (refNow - startTimeRef.current - totalPausedMsRef.current) / 1000;
  }, []);

  const nextColor = useCallback((pid) => {
    if (colorByPidRef.current[pid]) return colorByPidRef.current[pid];

    const color = PROCESS_COLORS[colorIndexRef.current % PROCESS_COLORS.length];
    colorIndexRef.current++;
    colorByPidRef.current[pid] = color;
    return color;
  }, []);

  const createProcess = useCallback((pid, name = `pid-${pid}`) => ({
    pid,
    name,
    state: 'READY',
    cpuTime: 0,
    switches: 0,
    segments: [],
    createdAt: getRelativeTime(),
    color: nextColor(pid),
  }), [getRelativeTime, nextColor]);

  const closeOpenSegment = useCallback((proc, now, fallbackStart = null) => {
    const segments = proc.segments || [];
    const lastSeg = segments[segments.length - 1];

    if (!lastSeg && fallbackStart !== null) {
      const start = Math.max(0, Math.min(fallbackStart, now));
      const elapsedMs = Math.max(0, (now - start) * 1000);

      return {
        ...proc,
        cpuTime: (proc.cpuTime || 0) + elapsedMs,
        segments: [...segments, { start, end: now, state: 'RUNNING' }],
      };
    }

    if (!lastSeg || lastSeg.end !== null) {
      return { ...proc, segments };
    }

    const end = Math.max(now, lastSeg.start);
    const elapsedMs = Math.max(0, (end - lastSeg.start) * 1000);

    return {
      ...proc,
      cpuTime: (proc.cpuTime || 0) + elapsedMs,
      segments: [
        ...segments.slice(0, -1),
        { ...lastSeg, end },
      ],
    };
  }, []);

  const startCapture = useCallback(() => {
    // If we were paused, accumulate the paused duration
    if (pausedAtRef.current !== null) {
      totalPausedMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setIsCapturing(true);
    if (!startTimeRef.current) startTimeRef.current = Date.now();
  }, []);

  const stopCapture = useCallback(() => {
    if (pausedAtRef.current === null) {
      pausedAtRef.current = Date.now();
    }
    setIsCapturing(false);
  }, []);

  const resetCapture = useCallback(() => {
    setProcesses({});
    setEvents([]);
    startTimeRef.current = Date.now();
    colorIndexRef.current = 0;
    colorByPidRef.current = {};
    totalPausedMsRef.current = 0;
    // If currently paused, reset pause start to now so clock stays at 0
    if (pausedAtRef.current !== null) {
      pausedAtRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    let ws;
    let reconnectTimer;

    function connect() {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setConnected(true);
        if (!startTimeRef.current) startTimeRef.current = Date.now();
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onmessage = (msg) => {
        // Drop events while capture is paused
        if (!isCapturingRef.current) return;

        try {
          const event = JSON.parse(msg.data);
          setEvents(prev => [...prev.slice(-499), event]);

          switch (event.type) {
            case 'PROCESS_CREATED': {
              setProcesses(prev => ({
                ...prev,
                [event.pid]: {
                  ...(prev[event.pid] || createProcess(event.pid, event.name)),
                  name: event.name,
                  state: 'READY',
                }
              }));
              break;
            }

            case 'CONTEXT_SWITCH':
              setProcesses(prev => {
                const now = getRelativeTime();
                const updated = { ...prev };

                if (event.from !== undefined && event.from !== null) {
                  const existing = updated[event.from] || createProcess(event.from);
                  const fallbackStart = typeof event.slice_ms === 'number'
                    ? now - event.slice_ms / 1000
                    : existing.createdAt;
                  const proc = closeOpenSegment(existing, now, fallbackStart);
                  proc.state = proc.state === 'TERMINATED' ? 'TERMINATED' : 'READY';
                  proc.switches = (proc.switches || 0) + 1;
                  updated[event.from] = proc;
                }

                if (event.to !== undefined && event.to !== null) {
                  if (!updated[event.to]) {
                    updated[event.to] = createProcess(event.to);
                  }
                  const proc = { ...updated[event.to] };
                  const segments = proc.segments || [];
                  const lastSeg = segments[segments.length - 1];
                  proc.segments = lastSeg && lastSeg.end === null
                    ? segments
                    : [...segments, { start: now, end: null, state: 'RUNNING' }];
                  proc.state = 'RUNNING';
                  updated[event.to] = proc;
                }

                return updated;
              });
              if (typeof event.slice_ms === 'number') setCurrentSlice(event.slice_ms);
              break;

            case 'PROCESS_TERMINATED':
              setProcesses(prev => {
                const now = getRelativeTime();
                const existing = prev[event.pid] || createProcess(event.pid);
                const proc = closeOpenSegment(existing, now);
                proc.state = 'TERMINATED';
                if (typeof event.cpu_ms === 'number') {
                  proc.cpuTime = Math.max(proc.cpuTime || 0, event.cpu_ms);
                }
                if (typeof event.switches === 'number') {
                  proc.switches = Math.max(proc.switches || 0, event.switches);
                }
                return { ...prev, [event.pid]: proc };
              });
              break;

            case 'SLICE_CHANGED':
              setCurrentSlice(event.new_ms);
              break;
          }
        } catch (e) {
          console.error('Parse error:', e);
        }
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [closeOpenSegment, createProcess, getRelativeTime]);

  return {
    processes,
    events,
    connected,
    currentSlice,
    isCapturing,
    getRelativeTime,
    startCapture,
    stopCapture,
    resetCapture,
  };
}
