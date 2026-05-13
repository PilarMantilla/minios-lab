export default function RegisterView({ processes, selectedPid, events }) {
  if (!selectedPid) {
    return (
      <div className="py-8 text-center text-gray-500">
        Selecciona un proceso en la tabla para ver sus detalles.
      </div>
    );
  }

  const proc = processes[selectedPid];
  if (!proc) {
    return (
      <div className="py-8 text-center text-gray-500">
        Proceso {selectedPid} no encontrado.
      </div>
    );
  }

  const regEvents = events.filter(e => e.type === 'REGISTERS' && e.pid === selectedPid);
  const lastRegs = regEvents.length > 0 ? regEvents[regEvents.length - 1] : null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 font-semibold text-white">
          PID {proc.pid} - {proc.name}
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-400">Estado:</div>
          <div className="text-white">{proc.state}</div>
          <div className="text-gray-400">CPU Time:</div>
          <div className="font-mono text-white">{(proc.cpuTime || 0).toFixed(1)} ms</div>
          <div className="text-gray-400">Switches:</div>
          <div className="font-mono text-white">{proc.switches || 0}</div>
        </div>
      </div>

      <div>
        <h4 className="mb-2 font-semibold text-gray-300">Registros</h4>
        {lastRegs ? (
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-green-400">PC:</span>
              <span className="truncate text-white">{lastRegs.pc}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-blue-400">SP:</span>
              <span className="truncate text-white">{lastRegs.sp}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-600">
            No disponible. Los registros se muestran cuando la plataforma los expone.
          </div>
        )}
      </div>
    </div>
  );
}
