import './App.css';
import { useState, useEffect, useCallback, useRef } from 'react';
import Unity, { UnityContext } from "react-unity-webgl";
import PoseDetector from './components/PoseDetector';

const unityContext = new UnityContext({
  loaderUrl: "/Build/Build.loader.js",
  dataUrl: "/Build/Build.data",
  frameworkUrl: "/Build/Build.framework.js",
  codeUrl: "/Build/Build.wasm",
});

function App() {
  const [isUnityReady, setIsUnityReady] = useState(false);
  const [useBodyControls, setUseBodyControls] = useState(false);
  const [currentDirection, setCurrentDirection] = useState({ x: 0, y: 0 });
  const [isUnityInitialized, setIsUnityInitialized] = useState(false);

  // 移動状態を管理するref
  const movementStateRef = useRef({ x: 0, y: 0 });
  const keyStatesRef = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false
  });

  const initializeUnity = useCallback(() => {
    if (!isUnityInitialized) {
      setIsUnityInitialized(true);
      unityContext.on("loaded", () => {
        setIsUnityReady(true);
        console.log("Unity読み込み完了");
      });
    }
  }, [isUnityInitialized]);

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

  // スムーズな移動を送信する関数
  const sendMovementToUnity = useCallback((direction: { x: number; y: number }) => {
    if (!isUnityReady) return;

    try {
      const movementData = JSON.stringify(direction);
      unityContext.send("Player", "SetMovementDirection", movementData);
    } catch (error) {
      console.error("Unity通信エラー:", error);
    }
  }, [isUnityReady]);

  // キーボード入力の処理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isUnityReady || useBodyControls) return;

      const key = event.code;
      if (key in keyStatesRef.current) {
        keyStatesRef.current[key as keyof typeof keyStatesRef.current] = true;
        updateMovementFromKeys();
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isUnityReady || useBodyControls) return;

      const key = event.code;
      if (key in keyStatesRef.current) {
        keyStatesRef.current[key as keyof typeof keyStatesRef.current] = false;
        updateMovementFromKeys();
        event.preventDefault();
      }
    };

    const updateMovementFromKeys = () => {
      let x = 0;
      let y = 0;

      // 水平方向
      if (keyStatesRef.current.ArrowLeft || keyStatesRef.current.KeyA) x -= 1;
      if (keyStatesRef.current.ArrowRight || keyStatesRef.current.KeyD) x += 1;

      // 垂直方向
      if (keyStatesRef.current.ArrowDown || keyStatesRef.current.KeyS) y -= 1;
      if (keyStatesRef.current.ArrowUp || keyStatesRef.current.KeyW) y += 1;

      const newDirection = { x, y };
      if (newDirection.x !== movementStateRef.current.x || newDirection.y !== movementStateRef.current.y) {
        movementStateRef.current = newDirection;
        setCurrentDirection(newDirection);
        sendMovementToUnity(newDirection);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isUnityReady, useBodyControls, sendMovementToUnity]);

  // ポーズ検出からの入力処理
  const handlePoseDetected = useCallback((direction: { x: number; y: number }) => {
    if (!isUnityReady) return;

    // より滑らかな制御のためにしきい値を調整
    const threshold = 0.1;
    const sensitivity = 1.5; // 感度調整

    let x = 0;
    let y = 0;

    if (Math.abs(direction.x) > threshold) {
      x = Math.sign(direction.x) * Math.min(Math.abs(direction.x) * sensitivity, 1);
    }

    if (Math.abs(direction.y) > threshold) {
      y = Math.sign(direction.y) * Math.min(Math.abs(direction.y) * sensitivity, 1);
    }

    const newDirection = { x, y };

    // より頻繁に更新するために、小さな変化でも送信
    const deltaThreshold = 0.05;
    if (Math.abs(newDirection.x - movementStateRef.current.x) > deltaThreshold ||
      Math.abs(newDirection.y - movementStateRef.current.y) > deltaThreshold) {
      movementStateRef.current = newDirection;
      setCurrentDirection(newDirection);
      sendMovementToUnity(newDirection);
    }
  }, [isUnityReady, sendMovementToUnity]);

  // 操作モード切り替え時の移動停止
  useEffect(() => {
    if (isUnityReady) {
      sendMovementToUnity({ x: 0, y: 0 });
      setCurrentDirection({ x: 0, y: 0 });
      movementStateRef.current = { x: 0, y: 0 };
    }
  }, [useBodyControls, isUnityReady, sendMovementToUnity]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Unity体の傾き制御（改良版）</h1>
        {!isUnityInitialized ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>画面をクリックしてUnityを初期化してください</p>
          </div>
        ) : (
          <>
            <div style={{ margin: '10px', display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
              <button
                onClick={() => setUseBodyControls(!useBodyControls)}
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

              {/* 現在の移動方向を表示 */}
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
                <PoseDetector onPoseDetected={handlePoseDetected} />
              ) : (
                <div className="control-info" style={{ margin: '20px', textAlign: 'center' }}>
                  <h3>キーボード操作</h3>
                  <p>WASD キーまたは矢印キーで移動</p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 60px)',
                    gap: '5px',
                    justifyContent: 'center',
                    margin: '10px 0'
                  }}>
                    <div></div>
                    <div style={{
                      padding: '10px',
                      backgroundColor: keyStatesRef.current.ArrowUp || keyStatesRef.current.KeyW ? '#4CAF50' : '#ddd',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>W/↑</div>
                    <div></div>
                    <div style={{
                      padding: '10px',
                      backgroundColor: keyStatesRef.current.ArrowLeft || keyStatesRef.current.KeyA ? '#4CAF50' : '#ddd',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>A/←</div>
                    <div style={{
                      padding: '10px',
                      backgroundColor: keyStatesRef.current.ArrowDown || keyStatesRef.current.KeyS ? '#4CAF50' : '#ddd',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>S/↓</div>
                    <div style={{
                      padding: '10px',
                      backgroundColor: keyStatesRef.current.ArrowRight || keyStatesRef.current.KeyD ? '#4CAF50' : '#ddd',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>D/→</div>
                  </div>
                </div>
              )}

              <div className="unity-container">
                <Unity
                  unityContext={unityContext}
                  style={{
                    width: "1000px",
                    height: "300px",
                    border: "2px solid black",
                    background: "grey",
                    marginTop: "20px"
                  }}
                />
              </div>
            </main>
          </>
        )}
      </header>
    </div>
  );
}

export default App;
