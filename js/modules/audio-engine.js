let audioCtx = null;
let masterNode = null;

export function getAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

export function getMasterNode() {
  const ctx = getAudioContext();
  if (!masterNode) {
    masterNode = ctx.createDynamicsCompressor();
    masterNode.threshold.setValueAtTime(-6, ctx.currentTime);
    masterNode.knee.setValueAtTime(12, ctx.currentTime);
    masterNode.ratio.setValueAtTime(4, ctx.currentTime);
    masterNode.attack.setValueAtTime(0.003, ctx.currentTime);
    masterNode.release.setValueAtTime(0.05, ctx.currentTime);
    masterNode.connect(ctx.destination);
  }
  return masterNode;
}

export function resumeAudioContext() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

(function initAutoResume() {
  const handler = () => {
    resumeAudioContext();
    ['touchstart', 'click', 'keydown'].forEach(evt =>
      document.removeEventListener(evt, handler)
    );
  };
  ['touchstart', 'click', 'keydown'].forEach(evt =>
    document.addEventListener(evt, handler)
  );
})();
