import { useState } from 'react';

interface TimeMonitoringWarningProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  titulo?: string;
}

export default function TimeMonitoringWarning({ isOpen, onConfirm, onCancel, titulo }: TimeMonitoringWarningProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
        <div className="p-6">
          {/* Icono de advertencia */}
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          {/* Título */}
          <h3 className="text-xl font-semibold text-gray-900 text-center mb-4">
            Monitoreo de Tiempo de Visualización
          </h3>

          {/* Mensaje de advertencia */}
          <div className="text-gray-600 text-sm space-y-3 mb-6">
            <p>
              <strong>⚠️ Importante:</strong> El tiempo que mantengas abierto este reproductor será monitorizado y registrado en el sistema.
            </p>
            <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
              <p className="text-blue-800 font-medium">
                📺 Video: {titulo || 'Clase'}
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                El contador iniciará automáticamente al abrir el reproductor
              </li>
              {/* Eliminado: mensaje sobre cronómetro visible */}
              <li className="flex items-start">
                <span className="text-red-500 mr-2">⚠️</span>
                <strong>Cierra el reproductor al terminar</strong> 
              </li>
            </ul>
            <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-400 mt-4">
              <p className="text-red-800 text-xs">
                <strong>Nota:</strong> Dejar el reproductor abierto sin usar puede generar alertas de actividad sospechosa en tu cuenta.
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}