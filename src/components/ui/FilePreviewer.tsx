import { useState, useEffect } from 'react';

interface FilePreviewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  technicalFileName?: string; // Nombre técnico del archivo para detectar extensión
}

export default function FilePreviewer({ isOpen, onClose, fileUrl, fileName, technicalFileName }: FilePreviewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Timeout para evitar cargas infinitas
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setShowPreview(true);
      
      // Timeout de 10 segundos para cargas lentas
      const timer = setTimeout(() => {
        setIsLoading(false);
        setShowPreview(false);
      }, 10000);

      setTimeoutId(timer);

      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }
  }, [isOpen]);

  // Función para cancelar el timeout cuando se carga exitosamente
  const handleSuccessfulLoad = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsLoading(false);
  };

  // Función para manejar errores de carga
  const handleLoadError = (type: string) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsLoading(false);
    setShowPreview(false);
  };

  if (!isOpen) return null;

  // Detectar tipo de archivo por extensión
  const getFileType = () => {
    // Usar el nombre técnico si está disponible, sino el fileName
    const nameToCheck = technicalFileName || fileName;
    
    // Intentar detectar por nombre de archivo
    let extension = nameToCheck.split('.').pop()?.toLowerCase();
    
    // Si no hay extensión en el nombre, intentar detectar por URL
    if (!extension || extension === nameToCheck.toLowerCase()) {
      const urlParts = fileUrl.split('/');
      const fileNameFromUrl = urlParts[urlParts.length - 1];
      extension = fileNameFromUrl.split('.').pop()?.toLowerCase().split('?')[0]; // Quitar parámetros de query
    }
    
    if (extension === 'pdf') {
      return 'pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension || '')) {
      return 'image';
    } else {
      // Si aún no podemos detectar, pero el contenido es tipo 'apunte' o 'problema', asumir PDF
      return 'other';
    }
  };

  const renderContent = () => {
    const type = getFileType();

    if (!showPreview) {
      return (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center max-w-md">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Abrir archivo</h3>
            <p className="text-gray-600 mb-6">
              Haz clic en el botón para abrir el archivo en una nueva pestaña
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  window.open(fileUrl, '_blank');
                  onClose();
                }}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
              >
                Abrir {fileName}
              </button>
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'pdf') {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full border-0"
          onLoad={() => handleSuccessfulLoad()}
          onError={() => handleLoadError('PDF')}
          title={fileName}
        />
      );
    } else if (type === 'image') {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 p-4">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            onLoad={() => handleSuccessfulLoad()}
            onError={() => handleLoadError('imagen')}
          />
        </div>
      );
    } else {
      // Para otros tipos de archivo, mostrar directamente la opción de abrir
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
      setIsLoading(false);
      setShowPreview(false);
      return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{fileName}</h3>
              <p className="text-sm text-gray-500">
                Vista previa del archivo • Tipo: {getFileType()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.open(fileUrl, '_blank')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              title="Abrir en nueva pestaña"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative h-[calc(100%-4rem)]">
          {isLoading && showPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Cargando vista previa...</span>
              </div>
            </div>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}