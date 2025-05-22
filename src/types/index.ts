export interface Keypoint {
    x: number;
    y: number;
    z?: number;
    score: number;
    name?: string;
}

export interface Pose {
    keypoints: Keypoint[];
    score: number;
}

export interface UnityInstance {
    send: (gameObjectName: string, methodName: string, parameter?: any) => void;
    Quit: () => void;
}

export interface InputData {
    horizontal: number;
    vertical: number;
}

export interface ShoulderPosition {
    x: number;
    y: number;
}


export interface PoseDetectorProps {
    unityContext: UnityInstance | null;
}


export interface UnityWrapperState {
    unityInstance: UnityInstance | null;
    isLoaded: boolean;
}


declare global {
    interface Window {
        unityInstance: UnityInstance | null;
        unityReady: (instance: UnityInstance) => void;
        createUnityInstance: (
            canvas: HTMLCanvasElement,
            config: any,
            onProgress?: (progress: number) => void
        ) => Promise<UnityInstance>;
        unityBridge: {
            sendPoseDataToUnity: (horizontal: number, vertical: number) => void;
            toggleUnityInputSource: (useExternal: boolean) => void;
        };
    }
}
