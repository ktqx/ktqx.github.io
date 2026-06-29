/**
 * 翻翻乐游戏核心积木组件
 * @param {HTMLElement} container - 外壳提供的承载容器插槽
 * @param {Object} settings - 商家在后台自定义的游戏配置
 * @param {Function} onGameOver - 游戏结束后的全局通知回调
 */
export function init(container, settings, onGameOver) {
  // 1. 获取商家的具体参数范围（比如最低获得 1 元，最高 10 元现金）
  const minAmount = parseFloat(settings?.minAmount) || 0.5;
  const maxAmount = parseFloat(settings?.maxAmount) || 5.0;
  const maxFlips = parseInt(settings?.maxFlips) || 3; // 允许翻牌次数

  // 2. 注入翻翻乐的核心布局
  container.innerHTML = `
    <style>
      .flip-game-box { padding: 20px; color: #fff; text-align: center; }
      .stats-panel { display: flex; justify-content: space-around; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; margin-bottom: 20px; }
      .grid-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 360px; margin: 0 auto; }
      .card { height: 110px; perspective: 1000px; cursor: pointer; }
      .card-inner { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
      .card.flipped .card-inner { transform: rotateY(180deg); }
      .card-front, .card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: bold; }
      .card-front { background: linear-gradient(135deg, #d946ef, #8b5cf6); border: 2px solid #f472b6; font-size: 1.5rem; box-shadow: 0 4px 10px rgba(217,70,239,0.3); }
      .card-back { background: #1e293b; border: 2px solid #3b82f6; transform: rotateY(180deg); color: #f59e0b; }
      .card.dimmed { opacity: 0.6; pointer-events: none; }
      #flipHint { margin-top: 15px; font-weight: bold; color: #a7f3d0; }
    </style>

    <div class="flip-game-box">
      <div class="stats-panel">
        <div>剩余翻牌机会: <span id="remFlips" style="color:#d946ef;font-weight:bold;">${maxFlips}</span> 次</div>
        <div>累计奖励: <span id="accumulated" style="color:#f59e0b;font-weight:bold;">0.00</span></div>
      </div>
      <div class="grid-container" id="cardGrid"></div>
      <div id="flipHint">请点击上方任意卡片进行翻牌</div>
    </div>
  `;

  const cardGrid = document.getElementById('cardGrid');
  const remFlipsEl = document.getElementById('remFlips');
  const accumulatedEl = document.getElementById('accumulated');
  const flipHint = document.getElementById('flipHint');

  let gameState = {
    remainingFlips: maxFlips,
    wonAmount: 0,
    isProcessing: false,
    prizes: []
  };

  // 3. 生成随机奖池数据矩阵（9张牌）
  function generatePrizes() {
    gameState.prizes = Array.from({ length: 9 }, () => {
      const amt = minAmount + Math.random() * (maxAmount - minAmount);
      return `￥${amt.toFixed(2)}`;
    });
  }

  // 4. 渲染牌面
  function renderCards() {
    cardGrid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const card = document.createElement('div');
      card.className = 'card';
      card.id = `card-${i}`;
      card.innerHTML = `
        <div class="card-inner">
          <div class="card-front">🎁</div>
          <div class="card-back">?</div>
        </div>
      `;
      card.onclick = () => handleCardClick(i);
      cardGrid.appendChild(card);
    }
  }

  // 5. 点击翻牌核心交互
  function handleCardClick(index) {
    if (gameState.isProcessing || gameState.remainingFlips <= 0) return;
    const cardEl = document.getElementById(`card-${index}`);
    if (cardEl.classList.contains('flipped')) return;

    gameState.isProcessing = true;
    gameState.remainingFlips--;
    remFlipsEl.innerText = gameState.remainingFlips;

    // 获取当前卡片中预埋的奖励金额
    const prizeStr = gameState.prizes[index];
    const prizeValue = parseFloat(prizeStr.replace('￥', ''));
    gameState.wonAmount += prizeValue;

    // 翻转动画表现
    cardEl.querySelector('.card-back').innerText = prizeStr;
    cardEl.classList.add('flipped');

    setTimeout(() => {
      accumulatedEl.innerText = gameState.wonAmount.toFixed(2);
      gameState.isProcessing = false;

      // 如果机会用尽，判定游戏结束
      if (gameState.remainingFlips === 0) {
        endGame();
      }
    }, 400);
  }

  // 6. 翻牌结束结算
  function endGame() {
    gameState.isProcessing = true;
    flipHint.innerHTML = `<span style="color:#ef4444">机会已用尽！最终获得: ￥${gameState.wonAmount.toFixed(2)}</span>`;

    // 将其他未翻开的卡片作变暗处理并翻开致谢
    gameState.prizes.forEach((val, i) => {
      const el = document.getElementById(`card-${i}`);
      if (!el.classList.contains('flipped')) {
        el.querySelector('.card-back').innerText = val;
        el.classList.add('flipped', 'dimmed');
      }
    });

    // 【最核心】：将最终合并结算的战报结果，通知抛给外壳 index.html
    if (typeof onGameOver === 'function') {
      onGameOver(`翻翻乐累计斩获 ￥${gameState.wonAmount.toFixed(2)}`);
    }
  }

  // 启动运行
  generatePrizes();
  renderCards();
}
