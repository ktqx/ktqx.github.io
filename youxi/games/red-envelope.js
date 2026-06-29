// games/red-envelope.js - 纯净游戏核心主体
(function() {
  // --- 1. 默认降级游戏参数（如果链接后面不带 ?m=商家，就用这套基础配置） ---
  let gameSettings = {
    cost: 20,           // 入场扣费
    duration: 15,       // 游戏时长
    normalMin: 10,      // 普通红包最低
    normalMax: 30,      // 普通红包最高
    superMin: 100,      // 福袋最低
    superMax: 200,      // 福袋最高
    superChance: 8      // 福袋爆率 (8%)
  };

  // 🧠 核心挂载点：如果壳子在上一阶段成功拿到了商家的定制参数，这里直接覆盖！
  if (window.CLOUD_GAME_CONFIG) {
    gameSettings = Object.assign({}, gameSettings, window.CLOUD_GAME_CONFIG);
    console.log("🎯 红包雨游戏主体成功承接商家云端专属概率与配置:", gameSettings);
  }

  // --- 2. 纯净游戏 DOM 结构渲染（把游戏面板直接灌进壳子留出的 game-viewport） ---
  const container = document.getElementById('envelope-game-core');
  if (!container) return;

  container.innerHTML = `
    <style>
      .inner-control-panel { background: rgba(30, 10, 10, 0.6); border: 2px solid rgba(239, 68, 68, 0.2); border-radius: 24px; padding: 25px; text-align: center; backdrop-filter: blur(20px); box-shadow: 0 20px 50px rgba(0,0,0,0.3); margin-bottom: 20px; }
      .inner-game-title { font-size: 2.3rem; font-weight: 900; margin-bottom: 8px; background: linear-gradient(135deg, #ef4444, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .inner-game-desc { font-size: 0.95rem; color: #fca5a5; margin-bottom: 20px; }
      .inner-status-bar { display: flex; justify-content: space-around; background: rgba(0, 0, 0, 0.3); padding: 12px; border-radius: 16px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05); }
      .inner-status-item { display: flex; flex-direction: column; align-items: center; }
      .inner-status-label { font-size: 0.8rem; color: #fca5a5; margin-bottom: 4px; }
      .inner-status-value { font-size: 1.4rem; font-weight: 800; color: #fde047; }
      .inner-btn-start { padding: 14px 35px; font-size: 1.1rem; font-weight: 700; border: none; border-radius: 14px; cursor: pointer; transition: all 0.3s; background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
      .inner-btn-start:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4); }
      .inner-btn-start:disabled { background: #4a5568; color: #a0aec0; cursor: not-allowed; transform: none; box-shadow: none; }
      
      /* 画布物理区域 */
      .inner-game-stage { position: relative; width: 100%; height: 480px; background: rgba(0, 0, 0, 0.4); border-radius: 24px; border: 2px solid rgba(239, 68, 68, 0.2); overflow: hidden; backdrop-filter: blur(5px); }
      .inner-countdown-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; font-size: 5.5rem; font-weight: 900; color: #fde047; z-index: 100; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
      .inner-countdown-overlay.show { opacity: 1; }
      
      /* 红包Dom元素 */
      .inner-envelope { position: absolute; width: 52px; height: 72px; background: linear-gradient(145deg, #ef4444, #991b1b); border: 2px solid #fde047; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(0,0,0,0.3); user-select: none; }
      .inner-envelope::before { content: '🧧'; font-size: 1.4rem; }
      @keyframes inner-burst { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); color: #fde047; } 100% { transform: scale(0); opacity: 0; } }
      .inner-envelope.clicked { animation: inner-burst 0.2s ease-out forwards; pointer-events: none; }
      
      /* 飘字 */
      .inner-floating-text { position: absolute; font-size: 1.1rem; font-weight: 900; color: #fde047; text-shadow: 0 2px 8px rgba(0,0,0,0.5); pointer-events: none; animation: inner-floatUp 0.6s ease-out forwards; z-index: 150; }
      @keyframes inner-floatUp { 0% { transform: translateY(0) scale(0.8); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(-40px) scale(1.2); opacity: 0; } }
      .inner-announcement { margin-top: 12px; font-size: 0.8rem; color: #fca5a5; text-align: center; }
      @media (max-width: 480px) { .inner-game-stage { height: 380px; } .inner-envelope { width: 44px; height: 60px; } .inner-envelope::before { font-size: 1.1rem; } }
    </style>

    <section class="inner-control-panel">
      <h1 class="inner-game-title">疯狂抢红包</h1>
      <p class="inner-game-desc">手速大对决！每次开启扣除 ${gameSettings.cost} 金币，疯狂点击落下的红包！</p>
      <div class="inner-status-bar">
        <div class="inner-status-item"><span class="inner-status-label">倒计时</span><span class="inner-status-value" id="ig-timer">00s</span></div>
        <div class="inner-status-item"><span class="inner-status-label">本轮斩获</span><span class="inner-status-value" id="ig-score">0</span></div>
        <div class="inner-status-item"><span class="inner-status-label">我的资产</span><span class="inner-status-value" id="ig-balance" style="color: #f59e0b;">1000</span></div>
      </div>
      <button class="inner-btn-start" id="ig-start-btn">消耗 ${gameSettings.cost}🪙 开启红包雨</button>
    </section>

    <div class="inner-game-stage" id="ig-stage">
      <div class="inner-countdown-overlay" id="ig-countdown">3</div>
    </div>
    <div class="inner-announcement">🧧 提示：内含普通红包与超级福袋，爆率和金额均由商户池云端实时托管调控。</div>
  `;

  // --- 3. 核心游戏引擎变量与控制 ---
  const STORAGE_KEY = 'game_hub_user_coins';
  let userCoins = parseInt(localStorage.getItem(STORAGE_KEY)) || 1000;
  let isPlaying = false;
  let score = 0;
  let gameTimer = null;
  let spawnTimer = null;
  let timeLeft = 0;

  const startBtn = document.getElementById('ig-start-btn');
  const timerVal = document.getElementById('ig-timer');
  const scoreVal = document.getElementById('ig-score');
  const balanceVal = document.getElementById('ig-balance');
  const gameStage = document.getElementById('ig-stage');
  const countdownLayer = document.getElementById('ig-countdown');

  function initWallet() {
    userCoins = parseInt(localStorage.getItem(STORAGE_KEY)) || 1000;
    balanceVal.textContent = userCoins;
  }
  initWallet();

  function updateWallet(amount) {
    userCoins += amount;
    localStorage.setItem(STORAGE_KEY, userCoins);
    balanceVal.textContent = userCoins;
  }

  startBtn.onclick = () => {
    if (isPlaying) return;
    if (userCoins < gameSettings.cost) {
      alert(`资产不足 ${gameSettings.cost} 枚金币，无法开启红包雨！`);
      return;
    }
    updateWallet(-gameSettings.cost);
    startBtn.disabled = true;
    score = 0;
    scoreVal.textContent = '0';
    runCountdown();
  };

  function runCountdown() {
    countdownLayer.classList.add('show');
    let count = 3;
    countdownLayer.textContent = count;
    const countInterval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownLayer.textContent = count;
      } else if (count === 0) {
        countdownLayer.textContent = "GO!";
      } else {
        clearInterval(countInterval);
        countdownLayer.classList.remove('show');
        startGameLoop();
      }
    }, 800);
  }

  function startGameLoop() {
    isPlaying = true;
    timeLeft = gameSettings.duration;
    timerVal.textContent = timeLeft + 's';

    gameTimer = setInterval(() => {
      timeLeft--;
      timerVal.textContent = timeLeft + 's';
      if (timeLeft <= 0) endGame();
    }, 1000);

    spawnTimer = setInterval(() => { createEnvelope(); }, 300);
  }

  function createEnvelope() {
    if (!isPlaying || !gameStage) return;
    const env = document.createElement('div');
    env.className = 'inner-envelope';

    const stageWidth = gameStage.clientWidth;
    const startX = Math.random() * (stageWidth - 55); 
    env.style.left = startX + 'px';
    env.style.top = '-80px';

    const duration = Math.random() * 2 + 1.8; 
    const rotation = Math.random() * 40 - 20; 
    env.style.transform = `rotate(${rotation}deg)`;
    gameStage.appendChild(env);

    const animation = env.animate([
      { top: '-80px' },
      { top: gameStage.clientHeight + 'px' }
    ], { duration: duration * 1000, easing: 'linear' });

    env.onclick = () => {
      if (env.classList.contains('clicked')) return;
      env.classList.add('clicked');
      
      let reward = 0;
      const roll = Math.random() * 100;
      if (roll >= gameSettings.superChance) {
        reward = Math.floor(Math.random() * (gameSettings.normalMax - gameSettings.normalMin + 1)) + gameSettings.normalMin;
      } else {
        reward = Math.floor(Math.random() * (gameSettings.superMax - gameSettings.superMin + 1)) + gameSettings.superMin;
        createFloatingText(env.offsetLeft + 15, env.offsetTop - 15, '👑 超级福袋!');
      }

      score += reward;
      scoreVal.textContent = score;
      updateWallet(reward);
      createFloatingText(env.offsetLeft + 10, env.offsetTop + 10, `+${reward}🪙`);
      setTimeout(() => env.remove(), 200);
    };

    animation.onfinish = () => { env.remove(); };
  }

  function createFloatingText(x, y, text) {
    if (!gameStage) return;
    const ft = document.createElement('div');
    ft.className = 'inner-floating-text';
    ft.style.left = x + 'px';
    ft.style.top = y + 'px';
    ft.textContent = text;
    gameStage.appendChild(ft);
    setTimeout(() => ft.remove(), 600);
  }

  function endGame() {
    isPlaying = false;
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    
    const remaining = gameStage.querySelectorAll('.inner-envelope');
    remaining.forEach(e => e.remove());

    // 🧠 核心块联动：游戏结束，直接向外调用“壳子”提供的统一 LED 战报弹窗组件
    window.ShellUI.showLedger(
      "红包雨完美收官！", 
      `+ ${score} 🪙`, 
      score > (gameSettings.normalMax * 8) ? "手速逆天，欧皇下凡！" : "满载而归，运气爆棚", 
      () => {
        startBtn.disabled = false;
        initWallet();
      }
    );
  }
})();
