# 阻止屏幕变暗技术方案

## 问题背景

在 iPad 等移动设备上播放乐谱时，用户不会频繁触摸屏幕，导致设备自动息屏。需要一种方案在播放期间阻止屏幕变暗。

## 踩坑记录

### 方案 1：Screen Wake Lock API（单独使用）- 失败

```typescript
const wakeLock = await navigator.wakeLock.request('screen');
```

**问题：**
- Safari 要求必须在**用户交互事件**（click/touch）的回调中调用，不能在 `useEffect` 或异步回调中调用
- 即使在 click 回调中调用成功，某些浏览器（如 Edge）仍可能因系统策略释放锁
- 页面切换标签页后锁会自动释放，返回页面时不会自动恢复

### 方案 2：Canvas requestAnimationFrame 动画 - 失败

```typescript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
function animate() {
  ctx.clearRect(0, 0, 1, 1);
  requestAnimationFrame(animate);
}
animate();
```

**问题：**
- 现代浏览器已优化，后台动画不再阻止屏幕休眠
- iOS Safari 完全忽略此方案

### 方案 3：AudioContext 静音音频 - 失败

```typescript
const audioCtx = new AudioContext();
const oscillator = audioCtx.createOscillator();
oscillator.connect(audioCtx.destination);
oscillator.start();
```

**问题：**
- 大多数浏览器要求音频上下文必须在用户交互中创建
- 静音振荡器可能被浏览器优化掉
- 部分浏览器会显示音频播放指示器

## 最终方案：nosleep.js

### 原理

[nosleep.js](https://github.com/nickclaw/nosleep.js) 内部实现了双重保障：

1. **Screen Wake Lock API**：现代浏览器优先使用原生 API
2. **静音视频播放**：在不支持 Wake Lock API 的浏览器中，播放一个内联的静音视频（WebM/MP4），浏览器会认为正在播放媒体而阻止息屏

### 实现

```typescript
// useScreenWakeLock.ts
import NoSleep from 'nosleep.js';

export function useScreenWakeLock() {
  const noSleepRef = useRef<NoSleep | null>(null);
  const shouldBeActiveRef = useRef(false);

  useEffect(() => {
    noSleepRef.current = new NoSleep();

    // 处理页面可见性变化：返回页面时自动恢复
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldBeActiveRef.current) {
        noSleepRef.current?.enable();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      noSleepRef.current?.disable();
    };
  }, []);

  const request = useCallback(async () => {
    shouldBeActiveRef.current = true;
    noSleepRef.current?.enable();
  }, []);

  const release = useCallback(() => {
    shouldBeActiveRef.current = false;
    noSleepRef.current?.disable();
  }, []);

  return { request, release };
}
```

### 关键注意事项

1. **必须在用户交互事件中调用 `request()`**：nosleep.js 的 `enable()` 内部会调用 `navigator.wakeLock.request()` 或播放视频，两者都需要用户交互触发。因此 `request` 必须在 click/touch 回调中调用，不能在 `useEffect` 中。

2. **处理 visibilitychange 事件**：Screen Wake Lock 在页面不可见时会自动释放，需要在页面重新可见时重新启用。使用 `shouldBeActiveRef` 记录"应该保持唤醒"的意图。

3. **播放停止时释放**：不再需要阻止息屏时应调用 `release()`，避免不必要的资源消耗。

### 调用方式

```tsx
// 在播放按钮的 click 回调中调用
function PageControls({ onStart, onStartWakeLock }) {
  const handlePlayPause = () => {
    if (!isRunning) {
      onStart();
      onStartWakeLock?.(); // 在用户交互中启用
    }
  };
}

// 在 ScoreReader 中连接
function ScoreReader() {
  const { request: requestWakeLock, release: releaseWakeLock } = useScreenWakeLock();

  useEffect(() => {
    if (!autoPageTurn.isRunning) {
      releaseWakeLock();
    }
  }, [autoPageTurn.isRunning]);
}
```

## 浏览器兼容性

| 浏览器 | Screen Wake Lock API | nosleep.js 视频方案 | 最终效果 |
|--------|---------------------|-------------------|---------|
| Safari 16.4+ | 支持 | 支持 | Wake Lock API |
| Safari < 16.4 | 不支持 | 支持 | 视频播放 |
| Chrome 84+ | 支持 | 支持 | Wake Lock API |
| Edge 84+ | 支持 | 支持 | Wake Lock API |
| Firefox | 不支持 | 支持 | 视频播放 |

## 安装

```bash
npm install nosleep.js
```

## 参考

- [Screen Wake Lock API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
- [nosleep.js - GitHub](https://github.com/nickclaw/nosleep.js)
