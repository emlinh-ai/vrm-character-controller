# @emlinh/vrm-character-controller

Reusable VRM 3D Character Controller với animations, expressions, và lipsync cho các dự án React.

## Features

- ✅ Load và hiển thị VRM 3D models
- ✅ Animation system với FBX và VRMA support
- ✅ Auto idle animation rotation
- ✅ Expression management (emotions, visemes)
- ✅ Real-time lipsync từ audio streaming
- ✅ Natural blinking và look-at camera
- ✅ WebSocket integration cho TTS streaming

## Installation

```bash
# Trong dự án sử dụng
npm install @emlinh/vrm-character-controller

# Hoặc link local
npm link ../shared-packages/vrm-character-controller
```

## Peer Dependencies

```bash
npm install @pixiv/three-vrm @pixiv/three-vrm-animation @react-three/fiber @react-three/drei three
```

## Usage

### Basic VRM Character Display

```tsx
import { Canvas } from '@react-three/fiber';
import { VRMViewer } from '@emlinh/vrm-character-controller';

function CharacterScene() {
  return (
    <Canvas camera={{ position: [0, 0, 2], fov: 30 }}>
      <VRMViewer
        vrmUrl="/models/character.vrm"
        isAISpeaking={false}
      />
    </Canvas>
  );
}
```

### With Chat & TTS Integration

```tsx
import { Canvas } from '@react-three/fiber';
import { VRMViewer, useChatAudioWebSocket } from '@emlinh/vrm-character-controller';

function ChatCharacter() {
  const {
    isConnected,
    isPlaying,
    currentSentence,
    kiss,
    lipsClosed,
    jaw,
    sendMessage,
  } = useChatAudioWebSocket('ws://localhost:3009/ws/chat');

  return (
    <div>
      <Canvas camera={{ position: [0, 0, 2], fov: 30 }}>
        <VRMViewer
          vrmUrl="/models/character.vrm"
          isAISpeaking={isPlaying}
          kiss={kiss}
          lipsClosed={lipsClosed}
          jaw={jaw}
        />
      </Canvas>
      <input onKeyDown={(e) => e.key === 'Enter' && sendMessage(e.target.value)} />
    </div>
  );
}
```

## Components

| Component | Description |
|-----------|-------------|
| `VRMViewer` | Main component để render VRM character với lighting |
| `VRMModel` | Core VRM model component với animation controls |

## Hooks

| Hook | Description |
|------|-------------|
| `useVrmAnimationLoader` | Lazy load và cache animations |
| `useVrmAnimationPlayer` | Play animations với crossfade |
| `useVrmBlink` | Auto blinking effect |
| `useVrmLookAt` | Camera look-at behavior |
| `useVrmExpression` | Expression/emotion management |
| `useVrmLipsync` | Audio-driven lip sync |
| `useStreamingLipsync` | Real-time audio analysis for streaming |
| `useChatAudioWebSocket` | WebSocket connection for chat + TTS |
| `useIdleAnimationSelector` | Random idle animation rotation |
| `useTalkingAnimationSelector` | Random talking animation rotation |

## Animation Registry

Để thêm animations mới, cập nhật `constants/animation-registry.ts`:

```ts
import { registerAnimation } from '@emlinh/vrm-character-controller';

registerAnimation({
  id: 'myAnimation',
  name: 'My Animation',
  type: 'fbx',
  path: '/animations/my-animation.fbx',
  category: 'gesture',
  preload: true,
});
```

## License

MIT © Emlinh Team
