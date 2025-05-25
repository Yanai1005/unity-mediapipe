import './App.css';
import { useState, useEffect, useCallback } from 'react';
import { useUnity } from './hooks/useUnity';
import { useKeyboardInput } from './hooks/useKeyboardInput';
import type { InputDirection } from './types/input';
import UnityPlayer from './components/UnityPlayer';
import KeyboardControls from './components/KeyboardControls';
import PoseDetectorRefactored from './components/PoseDetectorRefactored';

const App = () => {
  const [useBodyControls, setUseBodyControls] = useState(false);
  const [currentDirection, setCurrentDirection] = useState<InputDirection>({ x: 0, y: 0 });

  const {
    isUnityReady,
    isUnityInitialized,
    initializeUnity,
    sendMovementToUnity,
    stopMovement,
    getUnityContext
  } = useUnity();

  // キーボード入力の処理
  const handleKeyboardInput = useCallback((direction: InputDirection) => {
    setCurrentDirection(direction);
    sendMovementToUnity(direction);
  }, [sendMovementToUnity]);

  const { getKeyStates } = useKeyboardInput(
    !useBodyControls && isUnityReady,
    handleKeyboardInput
  );

  // ポーズ検出からの入力処理
  const handlePoseInput = useCallback((direction: InputDirection) => {
    setCurrentDirection(direction);
    sendMovementToUnity(direction);
  }, [sendMovementToUnity]);

  // Unity初期化のためのユーザー操作監視
  useEffect(() => {
    const handleUserInteraction = () => {
      initializeUnity();
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [initializeUnity]);

  // 操作モード切り替え時の移動停止
  useEffect(() => {
    if (isUnityReady) {
      stopMovement();
      setCurrentDirection({ x: 0, y: 0 });
    }
  }, [useBodyControls, isUnityReady, stopMovement]);

  const toggleControlMode = useCallback(() => {
    setUseBodyControls(prev => !prev);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>問題を解決しよう</h1>
        {!isUnityInitialized ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>画面をクリックしてUnityを初期化してください</p>
          </div>
        ) : (
          <>
            <div style={{ margin: '10px', display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
              <button
                onClick={toggleControlMode}
                style={{
                  padding: '10px 20px',
                  backgroundColor: useBodyControls ? '#ff9800' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {useBodyControls ? 'キーボード操作に切り替え' : '体の傾き操作に切り替え'}
              </button>

              <div style={{
                padding: '5px 10px',
                backgroundColor: '#333',
                color: 'white',
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                移動: X={currentDirection.x.toFixed(2)}, Y={currentDirection.y.toFixed(2)}
              </div>
            </div>

            <main>
              {useBodyControls ? (
                <PoseDetectorRefactored
                  isEnabled={useBodyControls}
                  onPoseDetected={handlePoseInput}
                />
              ) : (
                <KeyboardControls keyStates={getKeyStates()} />
              )}

              <div className="unity-container">
                <UnityPlayer unityContext={getUnityContext()} />
              </div>
            </main>
          </>
        )}
      </header>
    </div>
  );
};

export default App;
