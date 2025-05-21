declare module "react-unity-webgl" {
    export class UnityContext {
        constructor(options: {
            loaderUrl: string;
            dataUrl: string;
            frameworkUrl: string;
            codeUrl: string;
            companyName?: string;
            productName?: string;
            productVersion?: string;
            webglContextAttributes?: {
                preserveDrawingBuffer?: boolean;
                powerPreference?: "default" | "high-performance" | "low-power";
            };
        });

        // イベントリスナーのオーバーロード
        on(eventName: "loaded", callback: () => void): void;
        on(eventName: "progress", callback: (progress: number) => void): void;
        on(eventName: "error", callback: (message: string) => void): void;
        on(eventName: "quitted", callback: () => void): void;
        on(eventName: string, callback: (...args: any[]) => void): void;

        // メソッド
        send(gameObjectName: string, methodName: string, value?: any): void;
        sendMessage(gameObjectName: string, methodName: string, value?: any): void;
        setFullscreen(fullscreen: boolean): void;
        requestFullscreen(fullscreen: boolean): void;
        quit(): Promise<void>;
        takeScreenshot(dataType?: string, quality?: number): string | null;
    }

    export interface UnityProps {
        unityContext: UnityContext;
        style?: React.CSSProperties;
        className?: string;
        devicePixelRatio?: number;
        tabIndex?: number;
        disableContextMenu?: boolean;
        disableInputCapture?: boolean;
        matchWebGLToCanvasSize?: boolean;
    }

    export default function Unity(props: UnityProps): JSX.Element;
}
