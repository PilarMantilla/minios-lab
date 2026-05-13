export default function MetricsPanel({ processes, events, currentSlice, connected }) {
  const procs = Object.values(processes);
  const active = procs.filter(p => p.state !== 'TERMINATED').length;
  const terminated = procs.filter(p => p.state === 'TERMINATED').length;
  const totalCpu = procs.reduce((sum, p) => sum + (p.cpuTime || 0), 0);
  const totalSwitches = procs.reduce((sum, p) => sum + (p.switches || 0), 0);
  const createdEvents = events.filter(e => e.type === 'PROCESS_CREATED').length;
  const switchEvents = events.filter(e => e.type === 'CONTEXT_SWITCH').length;
  const terminatedEvents = events.filter(e => e.type === 'PROCESS_TERMINATED').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        <span className={connected ? 'text-green-400' : 'text-red-400'}>
          {connected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Activos" value={active} color="text-green-400" />
        <MetricCard label="Terminados" value={terminated} color="text-gray-400" />
        <MetricCard label="Time Slice" value={`${currentSlice}ms`} color="text-blue-400" />
        <MetricCard label="Switches" value={totalSwitches} color="text-yellow-400" />
        <MetricCard label="CPU Total" value={`${totalCpu.toFixed(0)}ms`} color="text-purple-400" />
        <MetricCard label="Eventos" value={events.length} color="text-cyan-400" />
        <MetricCard label="Creados" value={createdEvents} color="text-emerald-400" />
        <MetricCard label="CS Events" value={switchEvents} color="text-amber-400" />
        <MetricCard label="Finalizados" value={terminatedEvents} color="text-rose-400" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div className="rounded-md bg-gray-800 p-3">
      <div className="text-gray-500 text-xs">{label}</div>
      <div className={`text-lg font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}
