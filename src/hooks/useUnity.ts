import { useState, useCallback, useRef } from 'react';
import { UnityService, createUnityService } from '../services/UnityService';
import type { InputDirection } from '../types/input';

export const useUnity = () => {
    const [isUnityReady, setIsUnityReady] = useState(false);
    const [isUnityInitialized, setIsUnityInitialized] = useState(false);
    const unityServiceRef = useRef<UnityService | null>(null);
    const movementStateRef = useRef<InputDirection>({ x: 0, y: 0 });

    const initializeUnity = useCallback(() => {
        if (!isUnityInitialized) {
            setIsUnityInitialized(true);
            unityServiceRef.current = createUnityService();

            // Unity読み込み完了の監視
            const checkUnityReady = () => {
                if (unityServiceRef.current?.getIsReady()) {
                    setIsUnityReady(true);
                } else {
                    setTimeout(checkUnityReady, 100);
                }
            };
            checkUnityReady();
        }
    }, [isUnityInitialized]);

    const sendMovementToUnity = useCallback((direction: InputDirection) => {
        if (!isUnityReady || !unityServiceRef.current) return;

        const deltaThreshold = 0.05;
        if (Math.abs(direction.x - movementStateRef.current.x) > deltaThreshold ||
            Math.abs(direction.y - movementStateRef.current.y) > deltaThreshold) {
            movementStateRef.current = direction;
            unityServiceRef.current.sendMovement(direction);
        }
    }, [isUnityReady]);

    const stopMovement = useCallback(() => {
        if (isUnityReady && unityServiceRef.current) {
            const stopDirection = { x: 0, y: 0 };
            unityServiceRef.current.sendMovement(stopDirection);
            movementStateRef.current = stopDirection;
        }
    }, [isUnityReady]);

    const getUnityContext = useCallback(() => {
        return unityServiceRef.current?.getUnityContext() || null;
    }, []);

    return {
        isUnityReady,
        isUnityInitialized,
        initializeUnity,
        sendMovementToUnity,
        stopMovement,
        getUnityContext,
        currentMovement: movementStateRef.current
    };
};
