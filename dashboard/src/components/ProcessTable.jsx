const STATE_TEXT = {
  RUNNING: 'border-green-900 bg-green-500/10 text-green-300',
  READY: 'border-yellow-900 bg-yellow-500/10 text-yellow-300',
  BLOCKED: 'border-red-900 bg-red-500/10 text-red-300',
  TERMINATED: 'border-gray-700 bg-gray-800 text-gray-400',
  NEW: 'border-blue-900 bg-blue-500/10 text-blue-300',
};

export default function ProcessTable({ processes, selectedPid, onSelect }) {
  const procs = Object.values(processes).sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.pid - b.pid;
  });

  if (procs.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No hay procesos. Usa <code className="text-gray-400">run</code> en miniOS para lanzar uno.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400">
            <th className="w-6 px-2 py-2 text-left"></th>
            <th className="px-2 py-2 text-left">PID</th>
            <th className="px-2 py-2 text-left">Nombre</th>
            <th className="px-2 py-2 text-left">Estado</th>
            <th className="px-2 py-2 text-right">CPU (ms)</th>
            <th className="px-2 py-2 text-right">Switches</th>
          </tr>
        </thead>
        <tbody>
          {procs.map(proc => (
            <tr
              key={proc.pid}
              className={`cursor-pointer border-b border-gray-800 transition-colors hover:bg-gray-800 ${
                selectedPid === proc.pid ? 'bg-gray-800' : ''
              }`}
              onClick={() => onSelect(proc.pid)}
            >
              <td className="px-2 py-2">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: proc.color || '#6b7280' }}
                ></span>
              </td>
              <td className="px-2 py-2 font-mono">{proc.pid}</td>
              <td className="max-w-48 truncate px-2 py-2">{proc.name}</td>
              <td className="px-2 py-2">
                <span className={`inline-flex min-w-24 justify-center rounded border px-2 py-0.5 text-xs font-semibold ${STATE_TEXT[proc.state] || 'border-gray-700 text-gray-400'}`}>
                  {proc.state}
                </span>
              </td>
              <td className="px-2 py-2 text-right font-mono">{(proc.cpuTime || 0).toFixed(1)}</td>
              <td className="px-2 py-2 text-right font-mono">{proc.switches || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
