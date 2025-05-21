import React from 'react';
import './App.css';
import MediaPipePoseTracker from './components/MediaPipePoseTracker';

const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>GreenDMe - 体の動きで操作</h1>
      </header>
      <main>
        <MediaPipePoseTracker />
      </main>
      <footer>
        <p>体を傾けて動きをコントロールします。最適な結果を得るには、まず「ポジションを調整」ボタンを押してください。</p>
      </footer>
    </div>
  );
}

export default App;
