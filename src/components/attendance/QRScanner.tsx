import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure?: (error: string) => void;
    fps?: number;
    qrbox?: number | { width: number; height: number };
    aspectRatio?: number;
    disableFlip?: boolean;
    enabled?: boolean;
}

export const QRScanner = ({
    onScanSuccess,
    onScanFailure,
    fps = 10,
    qrbox = 250,
    aspectRatio = 1.0,
    disableFlip = false,
    enabled = true,
}: QRScannerProps) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (!enabled) {
            if (scannerRef.current) {
                scannerRef.current.clear().catch((error) => {
                    console.error("Failed to clear html5QrcodeScanner. ", error);
                });
                scannerRef.current = null;
            }
            return;
        }

        // Initialize the scanner
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            {
                fps,
                qrbox,
                aspectRatio,
                disableFlip,
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                // Let html5-qrcode handle camera selection dynamically
                // (Setting videoConstraints directly often breaks Mobile Safari/Chrome)
                supportedScanTypes: [0] // 0 = Camera only
            },
      /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                onScanSuccess(decodedText);
            },
            (error) => {
                if (onScanFailure) {
                    onScanFailure(error);
                }
            }
        );

        scannerRef.current = scanner;

        // Cleanup on unmount
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch((error) => {
                    console.error("Failed to clear html5QrcodeScanner. ", error);
                });
            }
        };
    }, [onScanSuccess, onScanFailure, fps, qrbox, aspectRatio, disableFlip, enabled]);

    return (
        <div className="w-full max-w-lg mx-auto overflow-hidden rounded-xl border border-border bg-black">
            <div id="qr-reader" className="w-full" />
        </div>
    );
};
