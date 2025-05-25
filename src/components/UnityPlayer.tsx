import Unity, { UnityContext } from "react-unity-webgl";

type UnityPlayerProps = {
    unityContext: UnityContext | null;
};

const UnityPlayer = ({ unityContext }: UnityPlayerProps) => {
    if (!unityContext) {
        return (
            <div style={{
                width: "1000px",
                height: "1080px",
                border: "2px solid black",
                background: "grey",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px'
            }}>
                Unityを初期化中...
            </div>
        );
    }

    return (
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
    );
};

export default UnityPlayer;
