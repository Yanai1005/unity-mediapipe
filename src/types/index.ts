// src/types/index.ts
// 入力関連の型
export type { InputDirection, KeyStates } from './input';

// Unity関連の型
export type { UnityInstance, UnityWrapperState } from './unity';
import type { UnityInstance } from './unity';

// ポーズ検出関連の型
export type { CalibrationPose, PoseDetectorProps, Keypoint, Pose } from './pose';

// グローバル型定義
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
