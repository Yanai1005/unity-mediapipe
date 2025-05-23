import { useState, useEffect, useRef, useCallback } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import type { CalibrationPose } from '../types/pose';
import { InputService } from '../services/InputService';
import type { InputDirection } from '../types/input';

interface DetectionStats {
    fps: number;
    lastDetectionTime: number;
    frameCount: number;
}

export const usePoseDetection = (
    isEnabled: boolean,
    onPoseDetected: (direction: InputDirection) => void
) => {
    const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [calibrationPose, setCalibrationPose] = useState<CalibrationPose | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [detectionStats, setDetectionStats] = useState<DetectionStats>({
        fps: 0,
        lastDetectionTime: 0,
        frameCount: 0
    });

    const lastMovementRef = useRef({ horizontal: 0, vertical: 0 });
    const inputServiceRef = useRef<InputService>(new InputService());

    // TensorFlow.jsの初期化
    useEffect(() => {
        const initializeTensorFlow = async () => {
            try {
                await tf.setBackend('webgl');
                await tf.ready();
                console.log('TensorFlow.js初期化完了');
                setIsInitialized(true);
            } catch (error) {
                console.error('TensorFlow.js初期化エラー:', error);
            }
        };

        initializeTensorFlow();
    }, []);

    // ポーズ検出器の初期化
    useEffect(() => {
        const initializeDetector = async () => {
            if (!isInitialized) return;

            try {
                const detectorConfig = {
                    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                    enableSmoothing: true,
                    minPoseScore: 0.3,
                    minPartScore: 0.3
                };

                const detector = await poseDetection.createDetector(
                    poseDetection.SupportedModels.MoveNet,
                    detectorConfig
                );

                setDetector(detector);
                console.log('ポーズ検出器の初期化完了');
            } catch (error) {
                console.error('ポーズ検出器の初期化エラー:', error);
            }
        };

        initializeDetector();

        return () => {
            if (detector) {
                detector.dispose?.();
            }
        };
    }, [isInitialized]);

    const updateFPS = useCallback(() => {
        const now = performance.now();
        setDetectionStats(prev => {
            const timeDiff = now - prev.lastDetectionTime;
            const newFrameCount = prev.frameCount + 1;

            if (timeDiff > 1000) {
                return {
                    fps: Math.round((newFrameCount * 1000) / timeDiff),
                    lastDetectionTime: now,
                    frameCount: 0
                };
            }

            return {
                ...prev,
                frameCount: newFrameCount
            };
        });
    }, []);

    const processPose = useCallback((pose: poseDetection.Pose) => {
        if (!calibrationPose) return;

        const keypoints = pose.keypoints;
        const leftShoulder = keypoints.find((kp: poseDetection.Keypoint) => kp.name === 'left_shoulder');
        const rightShoulder = keypoints.find((kp: poseDetection.Keypoint) => kp.name === 'right_shoulder');
        const nose = keypoints.find((kp: poseDetection.Keypoint) => kp.name === 'nose');

        if (leftShoulder && rightShoulder && nose &&
            (leftShoulder.score ?? 0) > 0.3 && (rightShoulder.score ?? 0) > 0.3 && (nose.score ?? 0) > 0.3) {

            const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
            const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;

            const noseOffsetX = nose.x - shoulderMidX;
            const noseOffsetY = nose.y - shoulderMidY;

            const calibNoseOffsetX = calibrationPose.nosePosition.x - calibrationPose.shoulderCenter.x;
            const calibNoseOffsetY = calibrationPose.nosePosition.y - calibrationPose.shoulderCenter.y;

            let horizontalTilt = (noseOffsetX - calibNoseOffsetX) / calibrationPose.shoulderWidth;
            let verticalTilt = (noseOffsetY - calibNoseOffsetY) / calibrationPose.shoulderWidth;

            // スムージング
            const smoothingFactor = 0.3;
            horizontalTilt = lastMovementRef.current.horizontal * (1 - smoothingFactor) + horizontalTilt * smoothingFactor;
            verticalTilt = lastMovementRef.current.vertical * (1 - smoothingFactor) + verticalTilt * smoothingFactor;

            lastMovementRef.current.horizontal = horizontalTilt;
            lastMovementRef.current.vertical = verticalTilt;

            // 入力処理サービスを使用
            const rawDirection = { x: horizontalTilt, y: verticalTilt };
            const processedDirection = inputServiceRef.current.processPoseInput(rawDirection);

            onPoseDetected(processedDirection);
        }
    }, [calibrationPose, onPoseDetected]);

    const calibrate = useCallback(async (video: HTMLVideoElement) => {
        if (!detector) return false;

        if (video && video.readyState === 4) {
            const poses = await detector.estimatePoses(video);

            if (poses && poses.length > 0) {
                const keypoints = poses[0].keypoints;
                const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
                const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
                const nose = keypoints.find(kp => kp.name === 'nose');

                if (leftShoulder && rightShoulder && nose &&
                    (leftShoulder.score ?? 0) > 0.5 && (rightShoulder.score ?? 0) > 0.5 && (nose.score ?? 0) > 0.5) {

                    setCalibrationPose({
                        shoulderWidth: Math.abs(rightShoulder.x - leftShoulder.x),
                        shoulderCenter: {
                            x: (leftShoulder.x + rightShoulder.x) / 2,
                            y: (leftShoulder.y + rightShoulder.y) / 2
                        },
                        nosePosition: { x: nose.x, y: nose.y }
                    });

                    setIsDetecting(true);
                    console.log('キャリブレーション完了');
                    return true;
                } else {
                    console.warn('キャリブレーション失敗: キーポイントの信頼度が低すぎます');
                }
            }
        }
        return false;
    }, [detector]);

    const detect = useCallback(async (video: HTMLVideoElement) => {
        if (!detector || !isDetecting || !calibrationPose || !isEnabled) return;

        if (video && video.readyState === 4) {
            try {
                const poses = await detector.estimatePoses(video);
                if (poses && poses.length > 0) {
                    processPose(poses[0]);
                    updateFPS();
                }
            } catch (error) {
                console.error('ポーズ検出エラー:', error);
            }
        }
    }, [detector, isDetecting, calibrationPose, isEnabled, processPose, updateFPS]);

    const toggleDetection = useCallback(() => {
        setIsDetecting(prev => !prev);
    }, []);

    return {
        isInitialized,
        isDetecting,
        calibrationPose,
        detectionStats,
        calibrate,
        detect,
        toggleDetection
    };
};
