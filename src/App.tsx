import './App.css';
import { useState, useEffect, useCallback } from 'react';
import { useUnity } from './hooks/useUnity';
import { useKeyboardInput } from './hooks/useKeyboardInput';
import type { InputDirection } from './types/input';
import UnityPlayer from './components/UnityPlayer';
import KeyboardControls from './components/KeyboardControls';

const App = () => {
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
    isUnityReady,
    handleKeyboardInput
  );

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
            <div style={{
              margin: '10px',
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
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
              <KeyboardControls keyStates={getKeyStates()} />

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
