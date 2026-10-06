import React, { useEffect, useRef, useState } from 'react';
import { Camera, CircleAlert, LoaderCircle, X } from 'lucide-react';
import { Button } from './Button';

const IdentityCameraCapture = ({ side, onCapture, onClose }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not available in this browser. Choose a photo file instead.');
        return;
      }

      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' } },
          });
        } catch (error) {
          if (error.name === 'NotFoundError' || error.name === 'NotAllowedError' || error.name === 'SecurityError') {
            throw error;
          }
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        }

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (active) setCameraReady(true);
      } catch (error) {
        if (!active) return;
        const message = error.name === 'NotAllowedError' || error.name === 'SecurityError'
          ? 'Camera permission was denied. Allow camera access in your browser settings or choose a photo file.'
          : error.name === 'NotFoundError'
            ? 'No camera was found. Connect a camera or choose a photo file.'
            : `Could not start the camera: ${error.message || 'Please try again or choose a photo file.'}`;
        setCameraError(message);
      }
    };

    startCamera();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('The camera is not ready yet. Wait a moment and try again.');
      return;
    }

    setCapturing(true);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCapturing(false);
      setCameraError('Could not prepare the photo capture. Please try again.');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      setCapturing(false);
      if (!blob) {
        setCameraError('Could not capture the photo. Please try again.');
        return;
      }

      onCapture(new File([blob], `fayda-${side}-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      onClose();
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="identity-camera-title" className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 id="identity-camera-title" className="text-lg font-bold capitalize text-brand-navy">Take photo of {side} of Fayda ID</h2>
            <p className="mt-1 text-sm text-slate-600">Position the full ID inside the camera view.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close camera" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-hidden rounded-xl bg-slate-950">
          {cameraError ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-6 py-8 text-center text-white">
              <CircleAlert size={28} />
              <p role="alert" className="text-sm leading-6">{cameraError}</p>
            </div>
          ) : (
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline muted className="aspect-[4/3] max-h-[60vh] w-full object-contain" />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/80 text-sm text-white">
                  <LoaderCircle size={18} className="animate-spin" />Starting camera...
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="gap-2"><X size={16} />Cancel</Button>
          {!cameraError && (
            <Button type="button" onClick={capturePhoto} disabled={!cameraReady || capturing} className="gap-2">
              {capturing ? <LoaderCircle size={16} className="animate-spin" /> : <Camera size={16} />}
              {capturing ? 'Capturing...' : 'Take photo'}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};

export default IdentityCameraCapture;
