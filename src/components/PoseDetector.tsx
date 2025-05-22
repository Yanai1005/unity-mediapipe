import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import Webcam from 'react-webcam';
import type { PoseDetectorProps, CalibrationPose } from '../types/pose-detector';

const PoseDetector: React.FC<PoseDetectorProps> = ({ onPoseDetected }) => {
    const webcamRef = useRef<Webcam>(null);
    const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [calibrationPose, setCalibrationPose] = useState<CalibrationPose | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [detectionStats, setDetectionStats] = useState({
        fps: 0,
        lastDetectionTime: 0,
        frameCount: 0
    });

    // スムージング用の参照
    const lastMovementRef = useRef({ horizontal: 0, vertical: 0 });

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

        return () => {
            if (detector) {
                detector.dispose?.();
            }
        };
    }, [detector]);

    // MediaPipeのポーズ検出モデルを初期化
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
    }, [isInitialized]);

    // ポーズ検出の開始/停止
    const toggleDetection = useCallback(() => {
        setIsDetecting(prev => !prev);
    }, []);

    // キャリブレーション機能
    const calibrate = useCallback(async () => {
        if (!detector || !webcamRef.current) return;

        const video = webcamRef.current.video;
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
                } else {
                    console.warn('キャリブレーション失敗: キーポイントの信頼度が低すぎます');
                }
            }
        }
    }, [detector]);

    // FPS計算
    const updateFPS = useCallback(() => {
        const now = performance.now();
        setDetectionStats(prev => {
            const timeDiff = now - prev.lastDetectionTime;
            const newFrameCount = prev.frameCount + 1;

            // 1秒ごとにFPSを更新
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

    // ポーズ検出のメインループ
    useEffect(() => {
        let animationFrameId: number;

        const detectPose = async () => {
            if (!detector || !webcamRef.current || !isDetecting || !calibrationPose) {
                animationFrameId = requestAnimationFrame(detectPose);
                return;
            }

            const video = webcamRef.current.video;
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

            animationFrameId = requestAnimationFrame(detectPose);
        };

        // 検出されたポーズを処理し、より滑らかな移動を計算
        const processPose = (pose: poseDetection.Pose) => {
            const keypoints = pose.keypoints;

            const leftShoulder = keypoints.find((kp: poseDetection.Keypoint) => kp.name === 'left_shoulder');
            const rightShoulder = keypoints.find((kp: poseDetection.Keypoint) => kp.name === 'right_shoulder');
            const nose = keypoints.find((kp: poseDetection.Keypoint) => kp.name === 'nose');

            if (leftShoulder && rightShoulder && nose && calibrationPose &&
                (leftShoulder.score ?? 0) > 0.3 && (rightShoulder.score ?? 0) > 0.3 && (nose.score ?? 0) > 0.3) {

                // より精密な傾き計算
                const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
                const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;

                const noseOffsetX = nose.x - shoulderMidX;
                const noseOffsetY = nose.y - shoulderMidY;

                const calibNoseOffsetX = calibrationPose.nosePosition.x - calibrationPose.shoulderCenter.x;
                const calibNoseOffsetY = calibrationPose.nosePosition.y - calibrationPose.shoulderCenter.y;

                // 正規化された傾き（-1.0 から 1.0）
                let horizontalTilt = (noseOffsetX - calibNoseOffsetX) / calibrationPose.shoulderWidth;
                let verticalTilt = (noseOffsetY - calibNoseOffsetY) / calibrationPose.shoulderWidth;

                // スムージング（指数移動平均）
                const smoothingFactor = 0.3;

                horizontalTilt = lastMovementRef.current.horizontal * (1 - smoothingFactor) + horizontalTilt * smoothingFactor;
                verticalTilt = lastMovementRef.current.vertical * (1 - smoothingFactor) + verticalTilt * smoothingFactor;

                lastMovementRef.current.horizontal = horizontalTilt;
                lastMovementRef.current.vertical = verticalTilt;

                // デッドゾーンの適用（より細かい制御）
                const deadZone = 0.08;
                const sensitivity = 2.0;

                let moveX = 0;
                let moveY = 0;

                if (Math.abs(horizontalTilt) > deadZone) {
                    moveX = Math.sign(horizontalTilt) * Math.min(Math.abs(horizontalTilt) * sensitivity, 1.0);
                }

                if (Math.abs(verticalTilt) > deadZone) {
                    moveY = Math.sign(verticalTilt) * Math.min(Math.abs(verticalTilt) * sensitivity, 1.0);
                }

                // 親コンポーネントに結果を通知
                onPoseDetected({ x: moveX, y: moveY });
            }
        };

        if (isDetecting) {
            detectPose();
        }

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [detector, webcamRef, isDetecting, calibrationPose, onPoseDetected, updateFPS]);

    return (
        <div className="pose-detector">
            {!isInitialized ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p>TensorFlow.jsを初期化中...</p>
                </div>
            ) : (
                <>
                    <div className="webcam-container" style={{ position: 'relative', margin: '0 auto', width: '320px' }}>
                        <Webcam
                            ref={webcamRef}
                            mirrored={true}
                            width={320}
                            height={240}
                            style={{
                                borderRadius: '8px',
                                border: '2px solid #ccc'
                            }}
                        />
                        {/* ステータス表示 */}
                        <div style={{
                            position: 'absolute',
                            top: '5px',
                            left: '5px',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '5px',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}>
                            {isDetecting ? `検出中 (${detectionStats.fps} FPS)` : '待機中'}
                        </div>
                    </div>
                    <div className="controls" style={{ margin: '10px auto', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button
                            onClick={calibrate}
                            disabled={isDetecting && calibrationPose !== null}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: calibrationPose ? '#4caf50' : '#2196f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                opacity: (isDetecting && calibrationPose !== null) ? 0.7 : 1
                            }}
                        >
                            {calibrationPose ? 'キャリブレーション完了' : 'キャリブレーション'}
                        </button>
                        <button
                            onClick={toggleDetection}
                            disabled={!calibrationPose}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: !calibrationPose ? '#ccc' : (isDetecting ? '#f44336' : '#4caf50'),
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: calibrationPose ? 'pointer' : 'not-allowed'
                            }}
                        >
                            {isDetecting ? '検出停止' : '検出開始'}
                        </button>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '14px', color: '#666', marginTop: '10px' }}>
                        <p>体を少し前後左右に傾けてキャラクターを操作してください</p>
                        {calibrationPose && (
                            <p>キャリブレーション済み - 検出精度: {detectionStats.fps} FPS</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default PoseDetector;
