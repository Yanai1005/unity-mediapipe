import React, { useRef, useEffect, useState } from 'react';
import Unity from "react-unity-webgl";
import { UnityContext } from "react-unity-webgl";
import '@mediapipe/pose';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';
import type { Pose, Keypoint } from '../types';

// Unity Contextの作成をコンポーネント内に移動
const MediaPipePoseTracker: React.FC = () => {
    const unityContext = new UnityContext({
        loaderUrl: "Build/Build.loader.js",
        dataUrl: "Build/Build.data",
        frameworkUrl: "Build/Build.framework.js",
        codeUrl: "Build/Build.wasm",
        companyName: "GreenDMe",
        productName: "GreenDMe WebGL",
        productVersion: "1.0.0",
        webglContextAttributes: {
            preserveDrawingBuffer: true,
            powerPreference: "high-performance"
        }
    });

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isUnityLoaded, setIsUnityLoaded] = useState<boolean>(false);
    const [loadingProgress, setLoadingProgress] = useState<number>(0);
    const [calibrating, setCalibrating] = useState<boolean>(false);
    const [calibrationPose, setCalibrationPose] = useState<Pose | null>(null);
    const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);

    // MediaPipeのポーズ検出を初期化
    useEffect(() => {
        async function initPoseDetection() {
            try {
                // TensorFlow.jsのバックエンドを初期化
                await tf.setBackend('webgl');
                await tf.ready();
                console.log('TensorFlow.js backend:', tf.getBackend());

                const model = poseDetection.SupportedModels.BlazePose;
                const detectorConfig = {
                    runtime: 'tfjs',
                    modelType: 'full',
                    enableSmoothing: true
                };

                const detector = await poseDetection.createDetector(model, detectorConfig);
                setDetector(detector);
            } catch (error) {
                console.error('ポーズ検出の初期化に失敗しました:', error);
            }
        }

        initPoseDetection();

        // Unityのロードイベントをリッスン
        unityContext.on("loaded", function () {
            console.log("Unityがロードされました");
            setIsUnityLoaded(true);
        });

        // プログレスイベントを監視
        // @ts-ignore - ライブラリの型定義と実際の動作が異なるため型エラーを無視
        unityContext.on("progress", function (progress: number) {
            console.log("Unity読み込み進捗:", progress);
            setLoadingProgress(progress);
        });

        // エラーイベントの監視を追加
        // @ts-ignore - ライブラリの型定義と実際の動作が異なるため型エラーを無視
        unityContext.on("error", function (message: string) {
            console.error("Unityエラー:", message);
        });

        // カメラのセットアップ
        setupCamera();

        return () => {
            // クリーンアップ
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    // カメラのセットアップ
    const setupCamera = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('お使いのブラウザはカメラへのアクセスをサポートしていません');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                },
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('カメラにアクセスできませんでした', error);
            alert('カメラにアクセスできませんでした: ' + (error as Error).message);
        }
    };

    // ビデオがロードされた時の処理
    const handleVideoLoaded = () => {
        if (videoRef.current && canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
        }
        detectPose();
    };

    // ニュートラルポジションの調整
    const calibratePosition = () => {
        setCalibrating(true);
        setTimeout(() => {
            setCalibrating(false);
        }, 3000); // ニュートラルポーズを取るための3秒間
    };

    // テスト用の関数：簡単な動きの送信
    const testUnityConnection = () => {
        if (isUnityLoaded) {
            console.log("テスト: 左に移動");
            unityContext.send("Player", "SetHorizontalMovement", -0.5);

            setTimeout(() => {
                console.log("テスト: 右に移動");
                unityContext.send("Player", "SetHorizontalMovement", 0.5);

                setTimeout(() => {
                    console.log("テスト: 停止");
                    unityContext.send("Player", "ResetExternalInput");
                }, 2000);
            }, 2000);
        } else {
            alert("Unityがまだ読み込まれていません");
        }
    };

    // ポーズを検出してUnityに移動データを送信
    const detectPose = async () => {
        if (!detector || !videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const detectAndSendData = async () => {
            if (video.readyState < 2) {
                requestAnimationFrame(detectAndSendData);
                return;
            }

            try {
                // ビデオフレームからポーズを取得
                const poses = await detector.estimatePoses(video);

                if (poses.length > 0) {
                    const pose = poses[0] as Pose;

                    // キャリブレーションポーズを保存
                    if (calibrating) {
                        setCalibrationPose(pose);
                        setCalibrating(false);
                        console.log("キャリブレーションポーズを保存しました");
                    }

                    // 肩の位置に基づいて傾きを計算
                    if (isUnityLoaded && pose.keypoints) {
                        const leftShoulder = pose.keypoints.find((kp: Keypoint) => kp.name === 'left_shoulder');
                        const rightShoulder = pose.keypoints.find((kp: Keypoint) => kp.name === 'right_shoulder');
                        const nose = pose.keypoints.find((kp: Keypoint) => kp.name === 'nose');

                        if (leftShoulder && rightShoulder && nose) {
                            // 肩の差に基づいて水平方向の傾きを計算
                            const shoulderDiff = rightShoulder.x - leftShoulder.x;
                            const shoulderY = (rightShoulder.y + leftShoulder.y) / 2;

                            // Unityの移動用に値を-1〜1の範囲に正規化
                            let horizontalTilt = 0;
                            let verticalTilt = 0;

                            // キャリブレーションポーズがある場合は、それとの差分を計算
                            if (calibrationPose) {
                                const calibLeftShoulder = calibrationPose.keypoints.find((kp: Keypoint) => kp.name === 'left_shoulder');
                                const calibRightShoulder = calibrationPose.keypoints.find((kp: Keypoint) => kp.name === 'right_shoulder');
                                const calibNose = calibrationPose.keypoints.find((kp: Keypoint) => kp.name === 'nose');

                                if (calibLeftShoulder && calibRightShoulder && calibNose) {
                                    // キャリブレーション時の肩幅を基準に計算
                                    const calibShoulderDiff = calibRightShoulder.x - calibLeftShoulder.x;
                                    const calibShoulderY = (calibRightShoulder.y + calibLeftShoulder.y) / 2;

                                    // 水平移動: キャリブレーションとの差分に基づいて計算
                                    horizontalTilt = (shoulderDiff - calibShoulderDiff) / 100;
                                    horizontalTilt = Math.max(-1, Math.min(1, horizontalTilt));

                                    // 垂直移動: キャリブレーションとの差分に基づいて計算
                                    const noseShoulderDiff = shoulderY - nose.y;
                                    const calibNoseShoulderDiff = calibShoulderY - calibNose.y;
                                    verticalTilt = (noseShoulderDiff - calibNoseShoulderDiff) / 50;
                                    verticalTilt = Math.max(-1, Math.min(1, verticalTilt));
                                }
                            } else {
                                // キャリブレーションポーズがない場合は、固定値を使用
                                const neutralWidth = 200;
                                horizontalTilt = (shoulderDiff - neutralWidth) / 100;
                                horizontalTilt = Math.max(-1, Math.min(1, horizontalTilt));

                                const noseShoulderDiff = shoulderY - nose.y;
                                const neutralHeight = 100;
                                verticalTilt = (noseShoulderDiff - neutralHeight) / 50;
                                verticalTilt = Math.max(-1, Math.min(1, verticalTilt));
                            }

                            // 小さな動きを避けるためのデッドゾーンを適用
                            const deadZone = 0.1; // デッドゾーンを小さくして感度を上げる
                            horizontalTilt = Math.abs(horizontalTilt) < deadZone ? 0 : horizontalTilt;
                            verticalTilt = Math.abs(verticalTilt) < deadZone ? 0 : verticalTilt;

                            // デバッグ情報
                            console.log(`水平傾き: ${horizontalTilt.toFixed(2)}, 垂直傾き: ${verticalTilt.toFixed(2)}`);

                            // Unityに送信
                            if (isUnityLoaded) {
                                console.log("Unityに送信:", {
                                    horizontal: horizontalTilt,
                                    vertical: verticalTilt
                                });
                                unityContext.send("Player", "SetHorizontalMovement", horizontalTilt);
                                unityContext.send("Player", "SetVerticalMovement", verticalTilt);
                            }
                        } else {
                            console.log("必要なキーポイントが見つかりません");
                        }
                    }

                    // デバッグ用にキャンバスにポーズを描画
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // キーポイントを描画
                    pose.keypoints.forEach((keypoint: Keypoint) => {
                        if (keypoint.score && keypoint.score > 0.3) {
                            ctx.beginPath();
                            ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                            ctx.fillStyle = 'red';
                            ctx.fill();

                            // 主要なキーポイントには名前を表示
                            if (keypoint.name && ['nose', 'left_shoulder', 'right_shoulder'].includes(keypoint.name)) {
                                ctx.fillStyle = 'white';
                                ctx.font = '12px Arial';
                                ctx.fillText(keypoint.name, keypoint.x + 10, keypoint.y);
                            }
                        }
                    });
                }
            } catch (error) {
                console.error("ポーズ検出中にエラーが発生しました:", error);
            }

            requestAnimationFrame(detectAndSendData);
        };

        detectAndSendData();
    };

    // キーボードコントロールに戻る
    const useKeyboardControls = () => {
        if (isUnityLoaded) {
            unityContext.send("Player", "ResetExternalInput");
        }
    };

    return (
        <div className="pose-detector-container">
            <div className="controls">
                <button onClick={calibratePosition} disabled={calibrating}>
                    {calibrating ? 'キャリブレーション中...' : 'ポジションを調整'}
                </button>
                <button onClick={useKeyboardControls}>
                    キーボード操作に切り替え
                </button>
                <button onClick={testUnityConnection}>
                    接続テスト
                </button>
            </div>

            <div className="video-container">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    onLoadedData={handleVideoLoaded}
                    style={{ display: 'none' }} // 処理用にビデオを非表示にする
                />
                <canvas
                    ref={canvasRef}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '320px',
                        height: '240px'
                    }}
                />
            </div>

            <div className="unity-container">
                {/* ローディングプログレスの表示 */}
                {!isUnityLoaded && (
                    <div className="loading-overlay">
                        <p>Unityアプリケーションを読み込み中: {Math.round(loadingProgress * 100)}%</p>
                    </div>
                )}

                <Unity
                    unityContext={unityContext}
                    style={{
                        width: '800px',
                        height: '600px',
                        border: '2px solid black',
                        background: 'grey',
                    }}
                />
            </div>
        </div>
    );
};

export default MediaPipePoseTracker;
