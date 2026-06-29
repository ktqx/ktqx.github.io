// games/golden-egg.js - 纯砸金蛋游戏主体逻辑
(function() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (type === 'smash') {
      const osc1 = audioCtx.createOscillator(); const gain1 = audioCtx.createGain();
      osc1.type = 'sine'; osc1.frequency.setValueAtTime(120, audioCtx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
      gain1.gain.setValueAtTime(0.6, audioCtx.currentTime); gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc1.connect(gain1); gain1.connect(audioCtx.destination); osc1.start(); osc1.stop(audioCtx.currentTime + 0.1);
      const bufferSize = audioCtx.sampleRate * 0.2; const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.05));
      const noise = audioCtx.createBufferSource(); noise.buffer = buffer; const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass'; filter.frequency.value = 2000; const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.3, audioCtx.currentTime); noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(audioCtx.destination); noise.start();
    } else if (type === 'end') {
      const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1); osc.frequency.setValueAtTime(900, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.4);
    }
  }

  // 1. 默认兜底配置参数（当链接没有商户信息时生效）
  let coreConfig = { totalAmount: 50, minAmount: 2, maxAmount: 10, eggCount: 9, limitCount: 3 };

  // 🧠 核心：自动抓取数据库中属于当前商家的独有参数进行完美覆盖
  if (window.MERCHANT_CUSTOM_SETTINGS) {
    coreConfig = Object.assign({}, coreConfig, window.MERCHANT_CUSTOM_SETTINGS);
    console.log("🎮 砸金蛋主体成功对接云端自定义商家参数:", coreConfig);
  }

  // 2. 将金蛋游戏特有的配置表单节点，精准打入到壳子预留的配置面板区中
  const mainBoard = document.getElementById('mainBoard');
  let originalConfigHTML = `
    <div class="config-group"><label class="config-label">促销总额 (元)</label><input type="number" id="totalAmount" class="config-input" value="${coreConfig.totalAmount}"></div>
    <div class="config-group"><label class="config-label">最小金额</label><input type="number" id="minAmount" class="config-input" value="${coreConfig.minAmount}"></div>
    <div class="config-group"><label class="config-label">最大金额</label><input type="number" id="maxAmount" class="config-input" value="${coreConfig.maxAmount}"></div>
    <div class="config-group"><label class="config-label">金蛋总数</label><input type="number" id="eggCount" class="config-input" value="${coreConfig.eggCount}"></div>
    <div class="config-group"><label class="config-label">可砸蛋数</label><input type="number" id="limitCount" class="config-input" value="${coreConfig.limitCount}"></div>
  `;
  mainBoard.innerHTML = originalConfigHTML;

  // 3. 将金蛋特有的控制按钮、剩余统计、以及金蛋网格，灌入到游戏视口舞台中
  const viewport = document.getElementById('game-stage-viewport');
  viewport.innerHTML = `
    <style>
      .btn-spin { width: 200px; margin: 20px auto; padding: 12px 20px; background: linear-gradient(135deg, #ff6b35, #ff8c42); color: #fff; border: none; border-radius: 50px; font-size: 1.1rem; font-weight: 800; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3); display: block; }
      .stats { margin: 15px 0; font-size: 1.1rem; display: flex; justify-content: center; gap: 40px; color: #b0b3c1; background: rgba(0, 0, 0, 0.2); padding: 10px; border-radius: 10px; }
      .stat-val { color: #f7b801; font-weight: bold; font-size: 1.4rem; }
      .egg-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; perspective: 1000px; margin: 25px auto; padding: 10px; justify-content: center; max-width: 600px; }
      .egg-container { width: 100%; aspect-ratio: 1; cursor: pointer; position: relative; display: flex; align-items: center; justify-content: center; }
      .egg { width: 85%; height: 100%; background: radial-gradient(circle at 35% 25%, #ffffff 0%, #fff4b3 15%, #fcd34d 35%, #d97706 70%, #78350f 100%); border-radius: 50% 50% 50% 50% / 68% 68% 32% 32%; box-shadow: inset -10px -20px 35px rgba(0,0,0,0.5), inset 6px 12px 18px rgba(255,255,255,0.8), 0 15px 25px rgba(0, 0, 0, 0.4); position: absolute; top: 0; left: 7.5%; border: 1px solid rgba(255, 255, 255, 0.3); }
      .egg-shadow { position: absolute; bottom: 5px; width: 80%; height: 12px; background: rgba(0, 0, 0, 0.6); border-radius: 50%; filter: blur(3px); z-index: 1; }
      .egg.broken { background: none; box-shadow: none; animation: crackDown 0.6s ease-out forwards; border: none; }
      @keyframes crackDown { 0% { transform: scale(1); opacity: 1; } 50% { transform: translateY(10px) scaleY(0.8); opacity: 1; } 100% { transform: translateY(20px) scaleY(0.6); opacity: 0; pointer-events: none; } }
      .prize-label { position: absolute; font-size: 1.3rem; font-weight: 800; color: #fff; background: linear-gradient(135deg, #ff4d4f, #cf1322); padding: 8px 12px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.4); top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0); z-index: 3; pointer-events: none; transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.4); }
      .egg-container.smashed .prize-label { transform: translate(-50%, -50%) scale(1); }
      .egg-container.dimmed .egg { opacity: 0.4; } .egg-container.dimmed .prize-label { background: rgba(220, 220, 220, 0.85); color: #2d3748; }
      .egg-fragment { position: absolute; pointer-events: none; z-index: 10; opacity: 0; }
      @keyframes fragment-fly { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(0.3); opacity: 0; } }
      .status-text { font-size: 1.1rem; font-weight: 700; color: #f7b801; text-align: center; min-height: 35px; margin-top: 15px; }
      @media (max-width: 768px) { .egg-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; } }
    </style>

    <button class="btn-spin" id="egg-restart-btn">重新开始</button>
    <div class="stats">
      <div>剩余机会: <span id="remainingSmashes" class="stat-val">0</span> 次</div>
      <div>已揽总额: ￥<span id="wonAmount" class="stat-val">0.00</span></div>
    </div>
    <div id="eggGrid" class="egg-grid"></div>
    <div class="status-text" id="statusText">请挑选并砸开您的幸运金蛋吧</div>
  `;

  // 4. 游戏内抽奖运作核心
  let gameState = { prizes: [], remainingSmashes: 0, wonAmount: 0, isProcessing: false };

  function distributePrizes(count, total, min, max) {
    if (count * min > total || count * max < total) { alert("❌ 配置冲突：金额范围无法完全分配"); return null; }
    let result = []; let remaining = total;
    for (let i = 0; i < count - 1; i++) {
      let currentMax = Math.min(max, remaining - (count - 1 - i) * min);
      let currentMin = Math.max(min, remaining - (count - 1 - i) * max);
      let amount = Math.round((Math.random() * (currentMax - currentMin) + currentMin) * 100) / 100;
      result.push(amount); remaining -= amount;
    }
    result.push(Math.round(remaining * 100) / 100);
    return result.sort(() => Math.random() - 0.5);
  }

  window.initGame = function() {
    // 调用外置壳子组件复原常态面板
    window.ShellCore.resetLEDReport(originalConfigHTML);

    const eggCount = parseInt(document.getElementById('eggCount').value) || 9;
    const totalAmount = parseFloat(document.getElementById('totalAmount').value) || 50;
    const minAmount = parseFloat(document.getElementById('minAmount').value) || 2;
    const maxAmount = parseFloat(document.getElementById('maxAmount').value) || 10;
    const limitCount = parseInt(document.getElementById('limitCount').value) || 3;

    const prizes = distributePrizes(eggCount, totalAmount, minAmount, maxAmount);
    if (!prizes) return;

    gameState.prizes = prizes;
    gameState.remainingSmashes = Math.min(limitCount, eggCount);
    gameState.wonAmount = 0;
    gameState.isProcessing = false;

    document.getElementById('remainingSmashes').innerText = gameState.remainingSmashes;
    document.getElementById('wonAmount').innerText = "0.00";
    document.getElementById('statusText').textContent = `游戏就绪！请挑选幸运金蛋 👇`;

    const grid = document.getElementById('eggGrid'); grid.innerHTML = '';
    gameState.prizes.forEach((prize, idx) => {
      const container = document.createElement('div'); container.className = 'egg-container';
      container.onclick = () => smashEgg(idx, container);
      container.innerHTML = `<div class="egg-shadow"></div><div class="egg"></div><div class="prize-label">￥${prize.toFixed(2)}</div>`;
      grid.appendChild(container);
    });
  };

  function smashEgg(index, container) {
    if (gameState.remainingSmashes <= 0 || gameState.isProcessing || container.classList.contains('smashed')) return;
    gameState.isProcessing = true; playSound('smash');
    
    const eggEl = container.querySelector('.egg'); eggEl.classList.add('broken'); container.classList.add('smashed');
    createFragments(eggEl);

    gameState.remainingSmashes--;
    gameState.wonAmount += gameState.prizes[index];
    document.getElementById('remainingSmashes').innerText = gameState.remainingSmashes;
    document.getElementById('wonAmount').innerText = gameState.wonAmount.toFixed(2);

    setTimeout(() => {
      gameState.isProcessing = false;
      if (gameState.remainingSmashes === 0) endGame();
    }, 300);
  }

  function createFragments(eggEl) {
    const rect = eggEl.getBoundingClientRect();
    for (let i = 0; i < 12; i++) {
      const frag = document.createElement('div'); frag.className = 'egg-fragment';
      const size = Math.random() * 12 + 5; frag.style.width = size + 'px'; frag.style.height = size + 'px';
      frag.style.background = 'radial-gradient(circle at 35% 30%, #fff380, #f7b801)';
      frag.style.left = (rect.left + rect.width / 2) + 'px'; frag.style.top = (rect.top + rect.height / 2) + 'px';
      frag.style.setProperty('--tx', `${(Math.random() - 0.5) * 300}px`); frag.style.setProperty('--ty', `${(Math.random() - 0.5) * 300}px`);
      frag.style.animation = `fragment-fly ${Math.random() * 0.4 + 0.4}s ease-out forwards`;
      document.body.appendChild(frag); setTimeout(() => frag.remove(), 800);
    }
  }

  function endGame() {
    playSound('end');
    document.getElementById('statusText').innerHTML = `🎉 砸蛋结束！共获得：<span style="color:#ff4d4f; font-size:1.4rem;">￥${gameState.wonAmount.toFixed(2)}</span> 元！`;
    
    // 🧠 核心：直接向外调用“壳子”封装的炫酷原地变形 LED 战报展示大屏接口
    window.ShellCore.triggerLEDReport(gameState.wonAmount);

    document.querySelectorAll('.egg-container').forEach((container, idx) => {
      if (!container.classList.contains('smashed')) {
        container.classList.add('smashed', 'dimmed'); container.onclick = null;
      }
    });
  }

  document.getElementById('egg-restart-btn').onclick = () => initGame();
  initGame();
})();
