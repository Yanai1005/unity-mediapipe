import { useEffect, useRef, useCallback } from 'react';
import { InputService } from '../services/InputService';
import type { InputDirection, KeyStates } from '../types/input';

export const useKeyboardInput = (
    isEnabled: boolean,
    onDirectionChange: (direction: InputDirection) => void
) => {
    const inputServiceRef = useRef<InputService>(new InputService());
    const currentDirectionRef = useRef<InputDirection>({ x: 0, y: 0 });

    // 方向変更のコールバックを設定
    useEffect(() => {
        inputServiceRef.current.setDirectionChangeCallback((direction) => {
            // 方向が変わった場合のみ更新
            if (direction.x !== currentDirectionRef.current.x ||
                direction.y !== currentDirectionRef.current.y) {
                currentDirectionRef.current = direction;
                onDirectionChange(direction);
            }
        });
    }, [onDirectionChange]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!isEnabled) return;

        const key = event.code;
        inputServiceRef.current.updateKeyState(key, true);

        if (key in inputServiceRef.current.getKeyStates()) {
            event.preventDefault();
        }
    }, [isEnabled]);

    const handleKeyUp = useCallback((event: KeyboardEvent) => {
        if (!isEnabled) return;

        const key = event.code;
        inputServiceRef.current.updateKeyState(key, false);

        if (key in inputServiceRef.current.getKeyStates()) {
            event.preventDefault();
        }
    }, [isEnabled]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);

    const getKeyStates = useCallback((): KeyStates => {
        return inputServiceRef.current.getKeyStates();
    }, []);

    return {
        getCurrentDirection: () => currentDirectionRef.current,
        getKeyStates
    };
};
