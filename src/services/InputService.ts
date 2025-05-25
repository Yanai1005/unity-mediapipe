import type { InputDirection, KeyStates } from '../types/input';

export class InputService {
    private keyStates: KeyStates = {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        KeyW: false,
        KeyA: false,
        KeyS: false,
        KeyD: false
    };

    private onDirectionChange: (direction: InputDirection) => void = () => { };

    public setDirectionChangeCallback(callback: (direction: InputDirection) => void): void {
        this.onDirectionChange = callback;
    }

    public updateKeyState(key: string, isPressed: boolean): void {
        if (key in this.keyStates) {
            this.keyStates[key as keyof KeyStates] = isPressed;
            this.calculateDirection();
        }
    }

    private calculateDirection(): void {
        let x = 0;
        let y = 0;

        // 水平方向
        if (this.keyStates.ArrowLeft || this.keyStates.KeyA) x -= 1;
        if (this.keyStates.ArrowRight || this.keyStates.KeyD) x += 1;

        // 垂直方向
        if (this.keyStates.ArrowDown || this.keyStates.KeyS) y -= 1;
        if (this.keyStates.ArrowUp || this.keyStates.KeyW) y += 1;

        this.onDirectionChange({ x, y });
    }

    public getKeyStates(): KeyStates {
        return { ...this.keyStates };
    }
}
