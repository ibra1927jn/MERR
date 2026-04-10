/**
 * StoragePersistBanner — Banner de advertencia de almacenamiento no persistente.
 *
 * Se muestra cuando el navegador NO otorgó almacenamiento persistente al arrancar
 * (sessionStorage flag 'harvest_storage_risk'). Esto significa que el OS puede
 * borrar los datos offline (IndexedDB/Dexie) bajo presión de almacenamiento.
 *
 * Solo visible en web no-instalado. En Capacitor Android el storage siempre es
 * persistente y esta flag nunca se establece.
 *
 * Se descarta con el botón X — permanece descartado durante toda la sesión.
 */
import { useState } from 'react';

const RISK_FLAG = 'harvest_storage_risk';
const DISMISSED_FLAG = 'harvest_storage_risk_dismissed';

export function StoragePersistBanner() {
  const [visible, setVisible] = useState(() => {
    // Mostrar solo si hay riesgo Y no fue descartado en esta sesión
    return (
      sessionStorage.getItem(RISK_FLAG) === '1' &&
      sessionStorage.getItem(DISMISSED_FLAG) !== '1'
    );
  });

  if (!visible) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_FLAG, '1');
    setVisible(false);
  };

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm font-medium shadow-md"
    >
      <span>
        ⚠️ Almacenamiento no persistente: instala la app desde el navegador para proteger
        los datos offline.
      </span>
      <button
        onClick={handleDismiss}
        aria-label="Cerrar advertencia de almacenamiento"
        className="ml-4 rounded p-1 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-800"
      >
        ✕
      </button>
    </div>
  );
}
