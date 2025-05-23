import { UnityContext } from "react-unity-webgl";

export class UnityService {
    private unityContext: UnityContext;
    private isReady: boolean = false;

    constructor(unityContext: UnityContext) {
        this.unityContext = unityContext;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.unityContext.on("loaded", () => {
            this.isReady = true;
            console.log("Unity読み込み完了");
        });
    }

    public sendMovement(direction: { x: number; y: number }): void {
        if (!this.isReady) return;

        try {
            const movementData = JSON.stringify(direction);
            this.unityContext.send("Player", "SetMovementDirection", movementData);
        } catch (error) {
            console.error("Unity通信エラー:", error);
        }
    }

    public getUnityContext(): UnityContext {
        return this.unityContext;
    }

    public getIsReady(): boolean {
        return this.isReady;
    }
}

export const createUnityService = (): UnityService => {
    const unityContext = new UnityContext({
        loaderUrl: "/Build/Build.loader.js",
        dataUrl: "/Build/Build.data",
        frameworkUrl: "/Build/Build.framework.js",
        codeUrl: "/Build/Build.wasm",
    });

    return new UnityService(unityContext);
};
