export type { InputDirection, KeyStates } from './input';

export type { UnityInstance, UnityWrapperState } from './unity';
import type { UnityInstance } from './unity';

export type { CalibrationPose, PoseDetectorProps, Keypoint, Pose } from './pose';

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
