import { useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { usePoseDetection } from '../hooks/usePoseDetection';
import type { InputDirection } from '../types/input';

type PoseDetectorProps = {
    isEnabled: boolean;
    onPoseDetected: (direction: InputDirection) => void;
};

const PoseDetectorRefactored = ({
    isEnabled,
    onPoseDetected
}: PoseDetectorProps) => {
    const webcamRef = useRef<Webcam>(null);

    const {
        isInitialized,
        isDetecting,
        calibrationPose,
        detectionStats,
        calibrate,
        detect,
        toggleDetection
    } = usePoseDetection(isEnabled, onPoseDetected);

    // 検出ループ
    useEffect(() => {
        let animationFrameId: number;

        const detectLoop = async () => {
            if (webcamRef.current?.video && isDetecting) {
                await detect(webcamRef.current.video);
            }
            animationFrameId = requestAnimationFrame(detectLoop);
        };

        if (isDetecting) {
            detectLoop();
        }

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [detect, isDetecting]);

    const handleCalibrate = async () => {
        if (webcamRef.current?.video) {
            await calibrate(webcamRef.current.video);
        }
    };

    if (!isInitialized) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <p>TensorFlow.jsを初期化中...</p>
            </div>
        );
    }

    return (
        <div className="pose-detector">
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
                    onClick={handleCalibrate}
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
        </div>
    );
};

export default PoseDetectorRefactored;
