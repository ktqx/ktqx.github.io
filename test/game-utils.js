// game-utils.js - 游戏大厅通用工具模块
window.GameUtils = {
  // ===== 1. 统一音效管理器 =====
  audioCtx: null,
  
  initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },

  // 播放内置合成音效（不需要加载复杂的 MP3 文件，省带宽且极速）
  playNotificationSound(type) {
    this.initAudio();
    const now = this.audioCtx.currentTime;
    
    if (type === 'click' || type === 'flip') {
      // 咔哒声/翻牌声
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain); gain.connect(this.audioCtx.destination);
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } 
    else if (type === 'win' || type === 'success') {
      // 猜中/中奖的喜庆和弦声
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.frequency.setValueAtTime(freq, now + index * 0.08);
        gain.gain.setValueAtTime(0.1, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.08 + 0.3);
        osc.start(now + index * 0.08); osc.stop(now + index * 0.08 + 0.3);
      });
    }
    else if (type === 'lose') {
      // 失败/未中奖的降调声
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain); gain.connect(this.audioCtx.destination);
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    }
  },

  // ===== 2. 统一动态金币/文本飘字特效 =====
  // 只要传入点击事件的 e 或者指定的 X, Y 坐标，就能在屏幕上飘字
  showFloatingText(text, x, y, isBigPrize = false) {
    const ft = document.createElement('div');
    ft.style.position = 'absolute';
    ft.style.left = x + 'px';
    ft.style.top = y + 'px';
    ft.style.fontSize = isBigPrize ? '1.5rem' : '1.1rem';
    ft.style.fontWeight = '900';
    ft.style.color = isBigPrize ? '#ff4757' : '#fde047';
    ft.style.textShadow = '0 2px 8px rgba(0,0,0,0.6)';
    ft.style.pointerEvents = 'none';
    ft.style.zIndex = '2000';
    ft.style.transition = 'all 0.6s ease-out';
    ft.textContent = text;
    
    document.body.appendChild(ft);
    
    // 激活动画（向上飘散并变淡消失）
    requestAnimationFrame(() => {
      ft.style.transform = 'translateY(-50px) scale(1.2)';
      ft.style.opacity = '0';
    });
    
    setTimeout(() => ft.remove(), 600);
  }
};
