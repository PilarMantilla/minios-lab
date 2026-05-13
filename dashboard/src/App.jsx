import { useState } from 'react';
import useSchedulerEvents from './hooks/useSchedulerEvents';
import ProcessTable from './components/ProcessTable';
import GanttChart from './components/GanttChart';
import RegisterView from './components/RegisterView';
import MetricsPanel from './components/MetricsPanel';
import CaptureControls from './components/CaptureControls';

export default function App() {
  const {
    processes,
    events,
    connected,
    currentSlice,
    isCapturing,
    getRelativeTime,
    startCapture,
    stopCapture,
    resetCapture,
  } = useSchedulerEvents();
  const [selectedPid, setSelectedPid] = useState(null);

  const renderEvent = (event, index) => {
    const details = [];

    if (event.type === 'CONTEXT_SWITCH') {
      details.push(`${event.from} -> ${event.to}`);
      details.push(`${event.slice_ms}ms`);
    } else if (event.type === 'PROCESS_CREATED') {
      details.push(`PID ${event.pid}`);
      if (event.name) details.push(event.name);
    } else if (event.type === 'PROCESS_TERMINATED') {
      details.push(`PID ${event.pid}`);
      if (typeof event.cpu_ms === 'number') details.push(`${event.cpu_ms.toFixed(0)}ms CPU`);
    } else if (event.type === 'SLICE_CHANGED') {
      details.push(`${event.old_ms}ms -> ${event.new_ms}ms`);
    } else if (event.pid) {
      details.push(`PID ${event.pid}`);
    }

    return (
      <div key={`${event.ts || index}-${index}`} className="flex items-center gap-2 rounded-md bg-gray-950/70 px-2 py-1.5">
        <span className="shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-[11px] font-semibold text-gray-300">
          {event.type}
        </span>
        <span className="min-w-0 truncate text-gray-500">
          {details.join(' | ')}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 text-gray-200">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">miniOS Dashboard</h1>
        <p className="text-sm text-gray-500">Simulador de Context Switching - Observabilidad en tiempo real</p>
      </div>

      <div className="mb-4">
        <CaptureControls
          isCapturing={isCapturing}
          onStart={startCapture}
          onStop={stopCapture}
          onReset={resetCapture}
          getRelativeTime={getRelativeTime}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-3">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-400">Gantt Chart - Uso de CPU</h2>
            <GanttChart processes={processes} getRelativeTime={getRelativeTime} />
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-400">Process Table</h2>
            <ProcessTable
              processes={processes}
              selectedPid={selectedPid}
              onSelect={setSelectedPid}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-400">Metricas</h2>
            <MetricsPanel
              processes={processes}
              events={events}
              currentSlice={currentSlice}
              connected={connected}
            />
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-400">Detalle del Proceso</h2>
            <RegisterView
              processes={processes}
              selectedPid={selectedPid}
              events={events}
            />
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-400">
              Event Log ({events.length})
            </h2>
            <div className="max-h-56 space-y-1 overflow-y-auto text-xs font-mono">
              {events.slice(-24).reverse().map(renderEvent)}
              {events.length === 0 && (
                <div className="text-gray-600">
                  {isCapturing ? 'Esperando eventos...' : 'Captura pausada'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
