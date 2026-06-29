/**
 * 🎰 幸运大翻牌 - 核心游戏逻辑
 */

// 初始化 Web Audio API 实例
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/**
 * 衍生纯合成音效播放器
 * @param {string} type - 音效类型 ('flip' | 'end')
 */
function playSound(type) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const now = audioCtx.currentTime;

  if (type === 'flip') {
    // 1. 卡牌翻转的摩擦白噪音
    const bufferSize = audioCtx.sampleRate * 0.12; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass'; 
    noiseFilter.frequency.setValueAtTime(1200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(3000, now + 0.1);
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);

    // 2. 翻转时带来的低频空气震动感
    const oscNode = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    oscNode.type = 'triangle';
    oscNode.frequency.setValueAtTime(180, now);
    oscNode.frequency.exponentialRampToValueAtTime(60, now + 0.08);
    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    oscNode.connect(oscGain);
    oscGain.connect(audioCtx.destination);

    noiseNode.start(now);
    noiseNode.stop(now + 0.12);
    oscNode.start(now);
    oscNode.stop(now + 0.08);

  } else if (type === 'end') {
    // 游戏结束胜利琶音
    const freqs = [523.25, 659.25, 783.99, 1046.50]; 
    freqs.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }
}

// 维护游戏全局状态
let gameState = {
  prizes: [],
  remainingFlips: 0,
  wonAmount: 0,
  isProcessing: false,
  maxAmount: 0,
  minAmount: 0
};

let rainTimer = null;

/**
 * 切换配置面板的显示状态
 */
function toggleSettings() {
  document.getElementById('configPanel').classList.toggle('active');
  document.getElementById('configOverlay').classList.toggle('active');
}

/**
 * 开启彩带/金币雨特效
 */
function startGoldRain() {
  const container = document.getElementById('goldRainContainer');
  container.innerHTML = '';
  const pool = ['🪙', '💰', '✨', '🃏', '💎', '★'];
  rainTimer = setInterval(() => {
    const drop = document.createElement('div');
    drop.className = 'rain-drop';
    drop.textContent = pool[Math.floor(Math.random() * pool.length)];
    drop.style.left = Math.random() * 100 + 'vw';
    drop.style.fontSize = Math.random() * 16 + 14 + 'px';
    const duration = Math.random() * 2 + 1.5;
    drop.style.animationDuration = duration + 's';
    container.appendChild(drop);
    setTimeout(() => drop.remove(), duration * 1000);
  }, 140);
}

/**
 * 停止金币雨特效
 */
function stopGoldRain() {
  if (rainTimer) clearInterval(rainTimer);
  document.getElementById('goldRainContainer').innerHTML = '';
}

/**
 * 核心红包/奖金随机分配算法
 */
function distributePrizes(count, total, min, max) {
  if (count * min > total) {
    showToast("❌ 失败：总额不足以支撑当前最小金额设定");
    return null;
  }
  if (count * max < total) {
    showToast("❌ 失败：总额超出了最大金额设定的上限");
    return null;
  }
  let result = [];
  let remaining = total;
  for (let i = 0; i < count - 1; i++) {
    let currentMax = Math.min(max, remaining - (count - 1 - i) * min);
    let currentMin = Math.max(min, remaining - (count - 1 - i) * max);
    let amount = Math.random() * (currentMax - currentMin) + currentMin;
    amount = Math.round(amount * 100) / 100;
    result.push(amount);
    remaining -= amount;
  }
  result.push(Math.round(remaining * 100) / 100);
  
  // 洗牌算法打乱奖金顺序
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 计算卡牌对应的视觉档位级
 */
function getPrizeLevel(amount, minAmount, maxAmount) {
  const range = maxAmount - minAmount;
  if (range <= 0) return 'mid-prize';
  const thresholdBig = minAmount + range * 0.66;
  const thresholdMid = minAmount + range * 0.33;
  if (amount >= thresholdBig) return 'big-prize';
  if (amount >= thresholdMid) return 'mid-prize';
  return 'small-prize';
}

/**
 * 获取档位对应的文字标签
 */
function getPrizeLevelText(level) {
  switch(level) {
    case 'big-prize': return '💎 豪礼';
    case 'mid-prize': return '✨ 大礼';
    case 'small-prize': return '🎈 好礼';
    default: return '奖励';
  }
}

/**
 * 初始化游戏阶段，生成卡牌
 */
function initGame() {
  stopGoldRain();

  // 重置控制UI面板
  document.getElementById('configPanel').classList.remove('active');
  document.getElementById('configOverlay').classList.remove('active');
  document.getElementById('marqueeReportPanel').classList.remove('active');

  // 读取配置项
  const cardCount = parseInt(document.getElementById('cardCount').value) || 9;
  const totalAmount = parseFloat(document.getElementById('totalAmount').value) || 50;
  const minAmount = parseFloat(document.getElementById('minAmount').value) || 2;
  const maxAmount = parseFloat(document.getElementById('maxAmount').value) || 10;
  const limitCount = parseInt(document.getElementById('limitCount').value) || 3;

  const grid = document.getElementById('cardGrid');
  grid.style.gridTemplateColumns = 'repeat(3, 1fr)';

  // 分配奖金池
  const prizes = distributePrizes(cardCount, totalAmount, minAmount, maxAmount);
  if (!prizes) return;

  // 更新局部状态机
  gameState.prizes = prizes;
  gameState.remainingFlips = Math.min(limitCount, cardCount);
  gameState.wonAmount = 0;
  gameState.isProcessing = false;
  gameState.maxAmount = maxAmount;
  gameState.minAmount = minAmount;

  updateStats();
  renderCards();
}

/**
 * 渲染卡牌 DOM 骨架
 */
function renderCards() {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = '';
  gameState.prizes.forEach((prize, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = `card-${index}`;
    card.onclick = () => flipCard(index, card);
    const prizeLevel = getPrizeLevel(prize, gameState.minAmount, gameState.maxAmount);
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-front">?</div>
        <div class="card-back ${prizeLevel}">
          <div class="card-amount">￥${prize.toFixed(2)}</div>
          <div class="card-label">${getPrizeLevelText(prizeLevel)}</div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/**
 * 点击卡牌翻牌操作
 */
function flipCard(index, cardElement) {
  if (gameState.remainingFlips <= 0 || gameState.isProcessing) return;
  if (cardElement.classList.contains('flipped')) return;

  gameState.isProcessing = true;
  playSound('flip');
  cardElement.classList.add('flipped');
  
  gameState.remainingFlips--;
  gameState.wonAmount += gameState.prizes[index];
  updateStats();
  
  setTimeout(() => {
    gameState.isProcessing = false;
    if (gameState.remainingFlips === 0) {
      endGameAndRevealOthers();
    }
  }, 250);
}

/**
 * 游戏结束处理，揭晓剩余卡牌
 */
function endGameAndRevealOthers() {
  gameState.isProcessing = true;
  playSound('end');

  const limitCount = parseInt(document.getElementById('limitCount').value) || 3;
  const avgWin = gameState.wonAmount / limitCount;
  let evaluation = '运气平平';
  if (avgWin >= gameState.minAmount + (gameState.maxAmount - gameState.minAmount) * 0.6) {
    evaluation = '欧皇附体🔥';
  } else if (avgWin >= gameState.minAmount + (gameState.maxAmount - gameState.minAmount) * 0.3) {
    evaluation = '手气极佳✨';
  }

  document.getElementById('ledTotal').textContent = `￥${gameState.wonAmount.toFixed(2)}`;
  document.getElementById('ledEval').textContent = evaluation;
  
  document.getElementById('marqueeReportPanel').classList.add('active');
  startGoldRain();

  document.getElementById('restartBtn').style.display = 'block';

  // 翻开所有其余卡牌并变暗
  gameState.prizes.forEach((_, index) => {
    const cardEl = document.getElementById(`card-${index}`);
    if (!cardEl.classList.contains('flipped')) {
      cardEl.classList.add('flipped', 'dimmed'); 
      cardEl.onclick = null; 
    }
  });
}

/**
 * 刷新计分板统计数据
 */
function updateStats() {
  document.getElementById('remainingFlips').innerText = gameState.remainingFlips;
  document.getElementById('wonAmount').innerText = gameState.wonAmount.toFixed(2);
}

/**
 * 轻量全局提示弹窗
 */
function showToast(msg) {
  alert(msg);
}

// 页面加载完成后自动触发初始化
window.onload = initGame;
