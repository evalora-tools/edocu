interface VdoCipherPlayerProps {
  otp: string;
  playbackInfo: string;
  titulo?: string;
  onClose?: () => void;
}

export default function VdoCipherPlayer({ otp, playbackInfo, titulo, onClose }: VdoCipherPlayerProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-white/20">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h4 className="text-xl font-semibold text-gray-900">
            {titulo || 'Reproductor de Video'}
          </h4>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="p-0 relative">
          <div style={{ paddingTop: '56.25%', position: 'relative' }}>
            <iframe
              src={`https://player.vdocipher.com/v2/?otp=${encodeURIComponent(otp)}&playbackInfo=${encodeURIComponent(playbackInfo)}`}
              style={{
                border: 0,
                maxWidth: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
              }}
              allowFullScreen={true}
              allow="encrypted-media"
              title={titulo || 'Video Player'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
