// src/types/index.ts

// MediaPipe姿勢検出の型定義
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

// Unity通信用の型定義
export interface UnityInstance {
    send: (gameObjectName: string, methodName: string, parameter?: any) => void;
    Quit: () => void;
}

// MediaPipeから送信する入力データの型定義
export interface InputData {
    horizontal: number;
    vertical: number;
}

// 肩の位置キャリブレーション用の型定義
export interface ShoulderPosition {
    x: number;
    y: number;
}

// PoseDetectorコンポーネントのprops
export interface PoseDetectorProps {
    unityContext: UnityInstance | null;
}

// UnityWrapperコンポーネントのstate
export interface UnityWrapperState {
    unityInstance: UnityInstance | null;
    isLoaded: boolean;
}

// グローバルWindowオブジェクトの拡張
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
