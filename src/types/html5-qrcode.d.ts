declare module 'html5-qrcode' {
    export class Html5QrcodeScanner {
        constructor(
            elementId: string,
            config: {
                fps: number;
                qrbox?: number | { width: number; height: number };
                aspectRatio?: number;
                disableFlip?: boolean;
                videoConstraints?: MediaTrackConstraints;
                showTorchButtonIfSupported?: boolean;
            },
            verbose?: boolean
        );
        render(
            onScanSuccess: (decodedText: string, decodedResult: { decodedText: string; result: { text: string } }) => void,
            onScanFailure?: (errorMessage: string) => void
        ): void;
        clear(): Promise<void>;
    }
}
