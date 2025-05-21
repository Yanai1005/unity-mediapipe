import './App.css';
import { useState, useEffect, useCallback } from 'react';
import Unity, { UnityContext } from "react-unity-webgl";
import PoseDetector from './components/PoseDetector';

const unityContext = new UnityContext({
  loaderUrl: "Build/Build.loader.js",
  dataUrl: "Build/Build.data",
  frameworkUrl: "Build/Build.framework.js",
  codeUrl: "Build/Build.wasm",
});

function App() {
  const [isUnityReady, setIsUnityReady] = useState(false);
  const [useBodyControls, setUseBodyControls] = useState(false);
  const [lastDirection, setLastDirection] = useState({ x: 0, y: 0 });
  const [isUnityInitialized, setIsUnityInitialized] = useState(false);

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

  function moveRight() {
    unityContext.send("Player", "MoveRight", 1);
  }

  function moveLeft() {
    unityContext.send("Player", "MoveLeft", 1);
  }

  function moveUp() {
    unityContext.send("Player", "MoveUp", 1);
  }

  function moveDown() {
    unityContext.send("Player", "MoveDown", 1);
  }

  const handlePoseDetected = (direction: { x: number; y: number }) => {
    if (!isUnityReady) return;

    // 前回の方向と異なる場合のみ処理
    if (direction.x !== lastDirection.x || direction.y !== lastDirection.y) {
      setLastDirection(direction);

      // 水平方向の移動
      if (direction.x > 0) {
        moveRight();
      } else if (direction.x < 0) {
        moveLeft();
      }

      // 垂直方向の移動
      if (direction.y > 0) {
        moveDown();
      } else if (direction.y < 0) {
        moveUp();
      }
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Unity体の傾き制御</h1>
        {!isUnityInitialized ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>画面をクリックしてUnityを初期化してください</p>
          </div>
        ) : (
          <>
            <button
              onClick={() => setUseBodyControls(!useBodyControls)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                margin: '10px'
              }}
            >
              {useBodyControls ? 'ボタン操作に切り替え' : '体の傾き操作に切り替え'}
            </button>

            <main>
              {useBodyControls ? (
                <PoseDetector onPoseDetected={handlePoseDetected} />
              ) : (
                <div className="control-buttons" style={{ margin: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={moveUp} style={{ margin: '5px', padding: '10px 20px' }}>上へ移動</button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={moveLeft} style={{ margin: '5px', padding: '10px 20px' }}>左へ移動</button>
                    <button onClick={moveDown} style={{ margin: '5px', padding: '10px 20px' }}>下へ移動</button>
                    <button onClick={moveRight} style={{ margin: '5px', padding: '10px 20px' }}>右へ移動</button>
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
