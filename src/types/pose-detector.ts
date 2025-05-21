export interface PoseDetectorProps {
    onPoseDetected: (direction: { x: number; y: number }) => void;
}

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
