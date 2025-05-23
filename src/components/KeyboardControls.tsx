import type { KeyStates } from '../types/input';

type KeyboardControlsProps = {
    keyStates: KeyStates;
};

const KeyboardControls = ({ keyStates }: KeyboardControlsProps) => {
    return (
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
                    backgroundColor: keyStates.ArrowUp || keyStates.KeyW ? '#4CAF50' : '#ddd',
                    borderRadius: '4px',
                    fontSize: '12px'
                }}>W/↑</div>
                <div></div>
                <div style={{
                    padding: '10px',
                    backgroundColor: keyStates.ArrowLeft || keyStates.KeyA ? '#4CAF50' : '#ddd',
                    borderRadius: '4px',
                    fontSize: '12px'
                }}>A/←</div>
                <div style={{
                    padding: '10px',
                    backgroundColor: keyStates.ArrowDown || keyStates.KeyS ? '#4CAF50' : '#ddd',
                    borderRadius: '4px',
                    fontSize: '12px'
                }}>S/↓</div>
                <div style={{
                    padding: '10px',
                    backgroundColor: keyStates.ArrowRight || keyStates.KeyD ? '#4CAF50' : '#ddd',
                    borderRadius: '4px',
                    fontSize: '12px'
                }}>D/→</div>
            </div>
        </div>
    );
};

export default KeyboardControls;
