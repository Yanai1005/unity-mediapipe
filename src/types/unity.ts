// src/types/unity.ts
export interface UnityInstance {
    send: (gameObjectName: string, methodName: string, parameter?: any) => void;
    Quit: () => void;
}

export interface UnityWrapperState {
    unityInstance: UnityInstance | null;
    isLoaded: boolean;
}
