# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-12-27

### Added
- Initial release of VRM Character Controller
- VRM model loading and rendering components
- Animation system with FBX and VRMA support
- Auto idle animation rotation
- Expression management (emotions, visemes)
- Real-time lipsync from audio streaming
- Natural blinking and look-at camera
- WebSocket integration for TTS streaming
- Animation registry system
- Mixamo animation remapping utilities
- TypeScript definitions

### Features
- `VRMViewer` - Main component for rendering VRM with lighting
- `VRMModel` - Core VRM model component with animation controls
- `useVrmAnimationLoader` - Lazy load and cache animations
- `useVrmAnimationPlayer` - Play animations with crossfade
- `useVrmBlink` - Auto blinking effect
- `useVrmLookAt` - Camera look-at behavior
- `useVrmExpression` - Expression/emotion management
- `useVrmLipsync` - Audio-driven lip sync
- `useStreamingLipsync` - Real-time audio analysis
- `useChatAudioWebSocket` - WebSocket connection for chat + TTS
- `useIdleAnimationSelector` - Random idle animation rotation
- `useTalkingAnimationSelector` - Random talking animation rotation
