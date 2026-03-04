import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, ScanText, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Tesseract from 'tesseract.js';

const CameraCapture = ({ onCapture, onClose, docType }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    // Define streamRef to keep a reference to stream for safe cleanup on unmount
    const streamRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [error, setError] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanMessage, setScanMessage] = useState("Position document in frame...");

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    // Auto-capture scanning logic
    useEffect(() => {
        let isActive = true;

        const scanLoop = async () => {
            if (!videoRef.current || !canvasRef.current || !stream || photo || (docType !== 'aadhaar' && docType !== 'birth')) return;

            setIsScanning(true);
            setScanMessage(`Auto-scanning for ${docType === 'aadhaar' ? 'Aadhaar' : 'Birth Certificate'}...`);

            while (isActive && !photo) {
                // Wait between scans to not overwhelm the browser
                await new Promise(resolve => setTimeout(resolve, 1500));

                if (!isActive || photo) break;

                const video = videoRef.current;
                const canvas = canvasRef.current;

                if (video && canvas && video.readyState === 4) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Lower quality for faster OCR processing
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

                    try {
                        const result = await Tesseract.recognize(dataUrl, 'eng');
                        const text = result.data.text.toLowerCase();

                        // Heuristic logic to detect Aadhaar
                        const isAadhaar = docType === 'aadhaar' && (
                            text.includes('aadhaar') ||
                            text.includes('government of india') ||
                            /\b\d{4}\s\d{4}\s\d{4}\b/.test(text) ||
                            /vid/i.test(text)
                        );

                        const isBirthCert = docType === 'birth' && (
                            text.includes('birth') ||
                            text.includes('certificate') ||
                            text.includes('registrar') ||
                            text.includes('date of birth') ||
                            text.includes('dob') ||
                            text.includes('municipality')
                        );

                        if ((isAadhaar || isBirthCert) && isActive) {
                            setScanMessage(`${docType === 'aadhaar' ? 'Aadhaar' : 'Birth Certificate'} Detected! Capturing...`);
                            // Capture High Res version
                            const hrDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                            setPhoto(hrDataUrl);
                            setIsScanning(false);
                            stopCamera();
                            // Optional: auto-confirm after 1s
                            break;
                        }
                    } catch (e) {
                        console.error("Auto scan error", e);
                    }
                }
            }
        };

        if (stream && (docType === 'aadhaar' || docType === 'birth') && !photo) {
            scanLoop();
        }

        return () => {
            isActive = false;
            setIsScanning(false);
        };
    }, [stream, photo, docType]);

    const startCamera = async () => {
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = mediaStream;
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Unable to access camera. Please ensure you have granted camera permissions.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setStream(null);
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setPhoto(dataUrl);
            stopCamera();
        }
    };

    const retakePhoto = () => {
        setPhoto(null);
        startCamera();
    };

    const confirmPhoto = () => {
        fetch(photo)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `document_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                onCapture(file, photo);
            });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl relative flex flex-col"
            >
                <div className="p-4 bg-india-navy text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2"><Camera className="w-5 h-5" /> Capture Document</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="relative bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center overflow-hidden">
                    {error ? (
                        <div className="text-white text-center p-6">
                            <p className="text-red-400 mb-4">{error}</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-white text-black rounded-lg font-bold"
                            >
                                Close
                            </button>
                        </div>
                    ) : photo ? (
                        <img src={photo} alt="Captured preview" className="w-full h-full object-contain" />
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    )}

                    {/* Capture guidelines/overlay */}
                    {!photo && !error && (
                        <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-xl pointer-events-none flex flex-col items-center justify-center">
                            {isScanning && (
                                <div className="bg-black/50 text-white px-4 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2 animate-pulse mt-auto mb-10">
                                    <ScanText className="w-4 h-4" />
                                    <span className="font-bold text-sm tracking-wide">{scanMessage}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Canvas (hidden) used for extracting image */}
                <canvas ref={canvasRef} className="hidden" />

                <div className="p-6 bg-gray-50 flex justify-center gap-4">
                    {photo ? (
                        <>
                            <button
                                type="button"
                                onClick={retakePhoto}
                                className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors"
                            >
                                <RefreshCw className="w-5 h-5" /> Retake
                            </button>
                            <button
                                type="button"
                                onClick={confirmPhoto}
                                className="flex-1 py-3 px-4 bg-india-green text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
                            >
                                <Check className="w-5 h-5" /> Use Photo
                            </button>
                        </>
                    ) : (
                        !error && (
                            <div className="flex flex-col items-center gap-2 w-full">
                                {isScanning ? (
                                    <div className="py-2 text-india-navy flex items-center gap-2 font-bold animate-pulse">
                                        <Loader2 className="w-5 h-5 animate-spin" /> Scanning Automatically...
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={capturePhoto}
                                        className="w-20 h-20 bg-india-saffron rounded-full border-4 border-white shadow-[0_0_0_4px_rgba(255,153,51,0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <Camera className="w-8 h-8 text-white" />
                                    </button>
                                )}
                            </div>
                        )
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default CameraCapture;
