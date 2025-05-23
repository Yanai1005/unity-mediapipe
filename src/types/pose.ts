// src/types/pose.ts
export interface CalibrationPose {
    shoulderWidth: number;
    shoulderCenter: {
        x: number;
        y: number;
    };
    nosePosition: {
        x: number;
        y: number;
    };
}

export interface PoseDetectorProps {
    onPoseDetected: (direction: { x: number; y: number }) => void;
}

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
