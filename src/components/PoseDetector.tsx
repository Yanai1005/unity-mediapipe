import React, { useEffect, useRef, useState } from 'react';
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

    // TensorFlow.jsの初期化
    useEffect(() => {
        const initializeTensorFlow = async () => {
            try {
                // WebGLバックエンドを明示的に設定
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
            // クリーンアップ
            if (detector) {
                detector.dispose?.();
            }
        };
    }, []);

    // MediaPipeのポーズ検出モデルを初期化
    useEffect(() => {
        const initializeDetector = async () => {
            if (!isInitialized) return;

            try {
                const detectorConfig = {
                    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                    enableSmoothing: true
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
    const toggleDetection = () => {
        setIsDetecting(prev => !prev);
    };

    // キャリブレーション機能
    const calibrate = async () => {
        if (!detector || !webcamRef.current) return;

        const video = webcamRef.current.video;
        if (video && video.readyState === 4) {
            const poses = await detector.estimatePoses(video);

            if (poses && poses.length > 0) {
                const keypoints = poses[0].keypoints;
                const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
                const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
                const nose = keypoints.find(kp => kp.name === 'nose');

                if (leftShoulder && rightShoulder && nose) {
                    setCalibrationPose({
                        shoulderWidth: Math.abs(rightShoulder.x - leftShoulder.x),
                        shoulderCenter: {
                            x: (leftShoulder.x + rightShoulder.x) / 2,
                            y: (leftShoulder.y + rightShoulder.y) / 2
                        },
                        nosePosition: { x: nose.x, y: nose.y }
                    });

                    // キャリブレーション後に検出を開始
                    setIsDetecting(true);
                }
            }
        }
    };

    // ポーズ検出のメインループ
    useEffect(() => {
        let animationFrameId: number;

        const detectPose = async () => {
            if (!detector || !webcamRef.current || !isDetecting) return;

            const video = webcamRef.current.video;
            if (video && video.readyState === 4) {
                const poses = await detector.estimatePoses(video);

                if (poses && poses.length > 0) {
                    processPose(poses[0]);
                }
            }

            animationFrameId = requestAnimationFrame(detectPose);
        };

        // 検出されたポーズを処理し、Unityに入力を送信する
        const processPose = (pose: poseDetection.Pose) => {
            const keypoints = pose.keypoints;

            // 肩と鼻を使って傾きを計算
            const leftShoulder = keypoints.find((kp: poseDetection.Keypoint) => kp.name === 'left_shoulder');
            const rightShoulder = keypoints.find((kp: poseDetection.Keypoint) => kp.name === 'right_shoulder');
            const nose = keypoints.find((kp: poseDetection.Keypoint) => kp.name === 'nose');

            if (leftShoulder && rightShoulder && nose && calibrationPose) {
                // 水平方向の傾き（左右）を計算
                const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
                const noseOffsetX = nose.x - shoulderMidX;
                const calibNoseOffsetX = calibrationPose.nosePosition.x - calibrationPose.shoulderCenter.x;

                // 垂直方向の傾き（上下）を計算
                const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
                const noseOffsetY = nose.y - shoulderMidY;
                const calibNoseOffsetY = calibrationPose.nosePosition.y - calibrationPose.shoulderCenter.y;

                // キャリブレーションからの相対的な傾きを計算
                const horizontalTilt = (noseOffsetX - calibNoseOffsetX) / calibrationPose.shoulderWidth;
                const verticalTilt = (noseOffsetY - calibNoseOffsetY) / calibrationPose.shoulderWidth;

                // しきい値を適用してノイズを除去
                const threshold = 0.15;
                let moveDirection = { x: 0, y: 0 };

                if (Math.abs(horizontalTilt) > threshold) {
                    moveDirection.x = Math.sign(horizontalTilt);
                }

                if (Math.abs(verticalTilt) > threshold) {
                    moveDirection.y = Math.sign(verticalTilt);
                }

                // 親コンポーネントに結果を通知
                onPoseDetected(moveDirection);
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
    }, [detector, webcamRef, isDetecting, calibrationPose, onPoseDetected]);

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
                            style={{
                                padding: '8px 16px',
                                backgroundColor: isDetecting ? '#f44336' : '#4caf50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {isDetecting ? '検出停止' : '検出開始'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default PoseDetector;
