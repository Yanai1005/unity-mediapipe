import './App.css';

import Unity, { UnityContext } from "react-unity-webgl";

const unityContext = new UnityContext({
  loaderUrl: "Build/Build.loader.js",
  dataUrl: "Build/Build.data",
  frameworkUrl: "Build/Build.framework.js",
  codeUrl: "Build/Build.wasm",
});

function App() {
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
  return (
    <div>
      <button onClick={moveRight}>MoveRight</button>
      <button onClick={moveLeft}>MoveLeft</button>
      <button onClick={moveUp}>MoveUp</button>
      <button onClick={moveDown}>MoveDown</button>
      <Unity unityContext={unityContext}
        style={{
          width: "1000px",
          height: "300px", // ← ここを固定値に変更
          border: "2px solid black",
          background: "grey",
        }} />

    </div>
  );
}
export default App;
