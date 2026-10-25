// Re-export từ framework — nguồn duy nhất của toán học/noise là web/src/framework/math.js.
// Giữ file này để mọi import cũ '../core/utils.js' tiếp tục hoạt động không đổi.
export { TAU, clamp, lerp, damp, angleWrap, angleDamp, randRange, dist2D,
  mulberry32, makeNoise2D, formatTime, esc } from '../framework/math.js';
