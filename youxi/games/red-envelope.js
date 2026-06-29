// games/red-envelope.js - 注入式全栈促销红包雨核心引擎
(function() {
  // --- 1. 初始化核心游戏参数（若无云端注入，则使用默认的这套账目） ---
  let config = {
    cost: 20,           // 每次启动游戏消耗的金币
    duration: 15,       // 游戏持续时间（秒）
    normalMin: 10,      // 普通红包最低奖励
    normalMax: 30,      // 普通红包最高奖励
    superMin: 100,      // 超级福袋最低奖励
    superMax: 200,      // 超级福袋最高奖励
    superChance: 8      // 超级福袋爆率百分比 (0-100)
  };

  // 🧠 核心注入拦截点：检查 index.html 网页里有没有从 Cloudflare D1 拿回来的商户参数
  if (window.CURRENT_MERCHANT_CONFIG_JSON) {
    try {
      const customSettings = JSON.parse(window.CURRENT_MERCHANT_CONFIG_JSON);
      config.cost = parseInt(customSettings.cost) || config.cost;
      config.duration = parseInt(customSettings.duration) || config.duration;
      config.normalMin = parseInt(customSettings.normalMin) || config.normalMin;
      config.normalMax = parseInt(customSettings.normalMax) || config.normalMax;
      config.superMin = parseInt(customSettings.superMin) || config.superMin;
      config.superMax = parseInt(customSettings.superMax) || config.superMax;
      config.superChance = parseInt(customSettings.superChance) || config.superChance;
      console.log("🎯 red-envelope 大脑已成功融汇贯通商家云端奖池与爆率:", config);
    } catch (e) {
      console.error("解析商户定制 JSON 失败，降级为默认公共池:", e);
    }
  }

  // --- 2. 游戏内部状态寄存器 ---
  const STORAGE_KEY = 'game_hub_user_coins';
  let userCoins = parseInt(localStorage.getItem(STORAGE_KEY)) || 1000;
  let isPlaying = false;
  let score = 0;
  let gameTimer = null;
  let spawnTimer = null;
  let timeLeft = 0;

  // --- 3. 挂载游戏舞台 HTML 结构与精美 CSS 视觉样式 ---
  const stage = document.getElementById('game-stage');
  if (!stage) return;

  stage.innerHTML = `
    <style>
      .env-panel { background: rgba(30, 10, 10, 0.6); border: 2px solid rgba(239, 68, 68, 0.2); border-radius: 24px; padding: 25px 15px; text-align: center; backdrop-filter: blur(20px); box-shadow: 0 20px 50px rgba(0,0,0,0.3); margin-bottom: 20px; }
      .env-title { font-size: 2.2rem; font-weight: 900; margin-bottom: 8px; background: linear-gradient(135deg, #f43f5e, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 20px rgba(239, 68, 68, 0.2); }
      .env-desc { font-size: 0.9rem; color: #fca5a5; margin-bottom: 20px; line-height: 1.4; }
      
      .env-status-bar { display: flex; justify-content: space-around; background: rgba(0, 0, 0, 0.3); padding: 12px; border-radius: 16px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05); }
      .env-status-item { display: flex; flex-direction: column; align-items: center; }
      .env-status-label { font-size: 0.8rem; color: #fca5a5; margin-bottom: 4px; }
      .env-status-value { font-size: 1.4rem; font-weight: 800; color: #fde047; }
      
      .env-btn-start { padding: 14px 30px; font-size: 1.05rem; font-weight: 700; border: none; border-radius: 14px; cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; box-shadow: 0 5px 15px rgba(0,0,0,0.2); width: 85%; max-width: 320px; margin: 0 auto; display: block; }
      .env-btn-start:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4); }
      .env-btn-start:disabled { background: #4a5568; color: #a0aec0; cursor: not-allowed; box-shadow: none; transform: none; }
      
      /* 红包雨画布落区 */
      .env-canvas { position: relative; width: 100%; height: 460px; background: rgba(0, 0, 0, 0.4); border-radius: 20px; border: 2px solid rgba(239, 68, 68, 0.2); overflow: hidden; backdrop-filter: blur(5px); margin-top: 15px; }
      
      .env-countdown-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; font-size: 5rem; font-weight: 900; color: #fde047; z-index: 100; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
      .env-countdown-overlay.show { opacity: 1; }
      
      /* 红包实体样式 */
      .envelope-item { position: absolute; width: 52px; height: 70px; background: linear-gradient(145deg, #ef4444, #991b1b); border: 2px solid #fde047; border-radius: 8px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 6px 12px rgba(0,0,0,0.4); user-select: none; transform-origin: center; transition: transform 0.1s ease; }
      .envelope-item::before { content: '🧧'; font-size: 1.4rem; }
      
      @keyframes env-burst { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); color: #fde047; } 100% { transform: scale(0); opacity: 0; } }
      .envelope-item.clicked { animation: env-burst 0.2s ease-out forwards; pointer-events: none; }
      
      /* 飘字特效 */
      .env-floating-text { position: absolute; font-size: 1.1rem; font-weight: 900; color: #fde047; text-shadow: 0 2px 8px rgba(0,0,0,0.5); pointer-events: none; animation: env-floatUp 0.6s ease-out forwards; z-index: 150; white-space: nowrap; }
      @keyframes env-floatUp { 0% { transform: translateY(0) scale(0.8); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(-40px) scale(1.2); opacity: 0; } }
      
      .env-tip { margin-top: 15px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 10px; text-align: center; font-size: 0.8rem; color: #fca5a5; }
      @media (max-width: 480px) { .env-title { font-size: 1.7rem; } .env-canvas { height: 380px; } .envelope-item { width: 44px; height: 60px; } .envelope-item::before { font-size: 1.1rem; } }
    </style>

    <div class="env-panel">
      <h1 class="env-title">疯狂抢红包</h1>
      <p class="env-desc">手速大对决！每次入场消耗 ${config.cost} 金币，漫天红包雨从天而降，快施展你的无影手吧！</p>
      
      <div class="env-status-bar">
        <div class="env-status-item">
          <span class="env-status-label">倒计时</span>
          <span class="env-status-value" id="e-timer">00s</span>
        </div>
        <div class="env-status-item">
          <span class="env-status-label">本轮斩获</span>
          <span class="env-status-value" id="e-score">0</span>
        </div>
        <div class="env-status-item">
          <span class="env-status-label">我的资产</span>
          <span class="env-status-value" id="e-balance" style="color: #f59e0b;">1000</span>
        </div>
      </div>

      <button class="env-btn-start" id="e-start-btn">消耗 ${config.cost}🪙 开启红包雨</button>
      
      <div class="env-canvas" id="envCanvasBox">
        <div class="env-countdown-overlay" id="envCountdownLayer">3</div>
      </div>

      <div class="env-tip">
        🧧 秘籍：红包内含普通包（+${config.normalMin}~${config.normalMax}🪙），更有高达 ${config.superChance}% 概率天降超级福袋（爆出 +${config.superMin}~${config.superMax}🪙 大奖）！
      </div>
    </div>
  `;

  // --- 4. 核心逻辑引擎绑定 ---
  const startBtn = document.getElementById('e-start-btn');
  const timerVal = document.getElementById('e-timer');
  const scoreVal = document.getElementById('e-score');
  const balanceVal = document.getElementById('e-balance');
  const canvasBox = document.getElementById('envCanvasBox');
  const countdownLayer = document.getElementById('envCountdownLayer');

  // 初始化钱包资产数显示
  function syncWalletUI() {
    userCoins = parseInt(localStorage.getItem(STORAGE_KEY)) || 1000;
    balanceVal.textContent = userCoins;
    const globalCoinSpan = document.getElementById('global-coins');
    if (globalCoinSpan) globalCoinSpan.textContent = userCoins;
  }
  syncWalletUI();

  // 资产账目中心增减更新
  function updateWallet(amount) {
    userCoins += amount;
    localStorage.setItem(STORAGE_KEY, userCoins);
    balanceVal.textContent = userCoins;
    const globalCoinSpan = document.getElementById('global-coins');
    if (globalCoinSpan) globalCoinSpan.textContent = userCoins;
  }

  startBtn.onclick = () => {
    if (isPlaying) return;
    
    // 重新校准最新资产
    userCoins = parseInt(localStorage.getItem(STORAGE_KEY)) || 1000;
    if (userCoins < config.cost) {
      alert(`您的金币不足 ${config.cost} 枚，无法开启红包雨！请重置资产后再战。`);
      return;
    }

    // 扣除入场费并锁定按钮
    updateWallet(-config.cost);
    startBtn.disabled = true;
    score = 0;
    scoreVal.textContent = '0';
    
    runCountdown();
  };

  // 3-2-1 震撼开场倒计时
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
        startRainLoop();
      }
    }, 800);
  }

  // 启动主循环函数
  function startRainLoop() {
    isPlaying = true;
    timeLeft = config.duration;
    timerVal.textContent = timeLeft + 's';

    // 1. 倒计时总计时器
    gameTimer = setInterval(() => {
      timeLeft--;
      timerVal.textContent = timeLeft + 's';
      if (timeLeft <= 0) {
        stopRainLoop();
      }
    }, 1000);

    // 2. 红包雨高频生产定时器（每320毫秒暴雨式掉落一个）
    spawnTimer = setInterval(() => {
      generateSingleEnvelope();
    }, 320);
  }

  // 生产单个红包
  function generateSingleEnvelope() {
    if (!isPlaying || !canvasBox) return;

    const env = document.createElement('div');
    env.className = 'envelope-item';

    // 随机计算横向跑道落点
    const stageWidth = canvasBox.clientWidth;
    const startX = Math.random() * (stageWidth - 55); 
    env.style.left = startX + 'px';
    env.style.top = '-80px'; // 隐藏于顶部画布边缘外

    // 引入无规则下落时长与旋转微摇摆，规避视觉死板
    const duration = Math.random() * 1.8 + 1.7; // 1.7s ~ 3.5s 落地
    const rotation = Math.random() * 36 - 18;     // -18deg ~ 18deg 左右微侧

    env.style.transform = `rotate(${rotation}deg)`;
    canvasBox.appendChild(env);

    // 🧠 核心动画层：采用原生高性能高级 Web Animations API 渲染物理自由落体
    const dropAnimation = env.animate([
      { top: '-80px' },
      { top: canvasBox.clientHeight + 'px' }
    ], {
      duration: duration * 1000,
      easing: 'linear'
    });

    // 绑定点击捕获机制
    env.onclick = () => {
      if (env.classList.contains('clicked')) return;
      env.classList.add('clicked');
      
      let reward = 0;
      const roll = Math.random() * 100;
      
      if (roll >= config.superChance) {
        // 斩获普通红包
        reward = Math.floor(Math.random() * (config.normalMax - config.normalMin + 1)) + config.normalMin;
      } else {
        // 斩获超级福袋
        reward = Math.floor(Math.random() * (config.superMax - config.superMin + 1)) + config.superMin;
        triggerFloatingText(env.offsetLeft + 15, env.offsetTop - 15, '👑 超级福袋!');
      }

      score += reward;
      scoreVal.textContent = score;
      updateWallet(reward);

      // 实时追加爆币数字震荡特效
      triggerFloatingText(env.offsetLeft + 10, env.offsetTop + 10, `+${reward}🪙`);

      // 待爆炸渐隐效果播放完成后从主网格中剥离
      setTimeout(() => env.remove(), 200);
    };

    // 漏接的红包在越过大厅底边防线后自动消亡，防内存堆积死锁
    dropAnimation.onfinish = () => {
      env.remove();
    };
  }

  // 绘制飘字反馈动画
  function triggerFloatingText(x, y, text) {
    if (!canvasBox) return;
    const ft = document.createElement('div');
    ft.className = 'env-floating-text';
    ft.style.left = x + 'px';
    ft.style.top = y + 'px';
    ft.textContent = text;
    canvasBox.appendChild(ft);
    setTimeout(() => ft.remove(), 600);
  }

  // 终盘结算核心函数
  function stopRainLoop() {
    isPlaying = false;
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    
    // 清理网格内滞留和处于坠落态的全部残余红包
    if (canvasBox) {
      const leftovers = canvasBox.querySelectorAll('.envelope-item');
      leftovers.forEach(e => e.remove());
    }

    // 计算玩家运气权重评价
    let evaluation = "非气弥漫";
    const possibleMax = (config.normalMax * (config.duration * 3)); // 概算理论中值
    if (score > possibleMax * 0.85) evaluation = "大吉大利，欧皇现世！";
    else if (score > possibleMax * 0.5) evaluation = "财源滚滚，手速惊人";
    else if (score > possibleMax * 0.25) evaluation = "收获颇丰";

    // 🧠 核心架构对接点：调用 index.html 网页大厅中统一的公用高级 LED 战报弹窗组件
    window.GameUI.showLedger(
      "红包雨收官！", 
      `+ ${score} 金币`, 
      evaluation, 
      () => {
        startBtn.disabled = false;
        syncWalletUI();
      }
    );
  }

  // --- 5. 注册大厅垃圾回收机制，防止路由频繁切游戏导致计时器泄漏跑崩浏览器 ---
  window.currentGameDestroy = () => {
    console.log("🧹 红包雨游戏大脑正在被大厅调度回收内存中...");
    isPlaying = false;
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    if (canvasBox) canvasBox.innerHTML = "";
  };

})();
