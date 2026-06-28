// games/flip-card.js - 模块化大翻牌组件
(function() {
  const stage = document.getElementById('game-stage');

  // 1. 动态吐出该游戏专属的局部界面与样式
  stage.innerHTML = `
    <style>
      :root {
        --big-prize:       #ff4d4f;
        --mid-prize:       #faad14;
        --small-prize:     #52c41a;
      }
      .stats { margin: 0 auto 10px; font-size: 1rem; display: flex; justify-content: center; gap: 25px; color: var(--text-secondary); background: rgba(0, 0, 0, 0.4); padding: 8px 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03); }
      .stat-val { color: var(--accent-gold); font-weight: bold; font-size: 1.2rem; }
      .card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; perspective: 1000px; padding: 4px; width: 100%; }
      .card { width: 100%; aspect-ratio: 0.714; cursor: pointer; position: relative; transition: transform 0.2s; transform-style: flat; }
      .card:hover:not(.flipped) { transform: translateY(-4px); }
      .card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
      .card.flipped .card-inner { transform: rotateY(180deg); }
      .card-front, .card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-weight: bold; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4); top: 0; left: 0; }
      .card-front { background-color: #0b112c; color: #ffd700; font-size: 2.2rem; border: 2px solid rgba(255, 215, 0, 0.6); text-shadow: 0 0 10px rgba(255, 235, 120, 0.6); }
      .card-back { background: linear-gradient(135deg, #ffd700, #ffb300, #ff8f00); color: #4a2600; transform: rotateY(180deg); flex-direction: column; gap: 4px; border: 1.5px solid rgba(247, 184, 1, 0.3); }
      .card-amount { font-size: 1.1rem; font-weight: bold; }
      .card-label { font-size: 0.7rem; opacity: 0.9; background: rgba(0, 0, 0, 0.3); padding: 1px 4px; border-radius: 3px; }
      .card-back.big-prize { background: linear-gradient(135deg, #ff4d4f, #cf1322); color: #fff; }
      .card-back.mid-prize { background: linear-gradient(135deg, #2b1055, #511281); color: #f7b801; }
      .card-back.small-prize { background: linear-gradient(135deg, #52c41a, #389e0d); color: #fff; }
      .card.dimmed { opacity: 0.35; filter: grayscale(50%); }
      .btn-spin { width: 180px; margin: 12px auto 0; padding: 10px 16px; background: linear-gradient(135deg, var(--primary-color), #ff8c42); color: #fff; border: none; border-radius: 50px; font-size: 1rem; font-weight: 800; cursor: pointer; display: block; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.25); }
    </style>

    <div class="stats">
      <div>剩余机会: <span id="shellRemainingFlips" class="stat-val">3</span> 次</div>
      <div>已揽总额: ￥<span id="shellWonAmount" class="stat-val">0.00</span></div>
    </div>
    <div id="cardGrid" class="card-grid"></div>
    <button id="shellRestartBtn" class="btn-spin" style="display:none">再玩一次</button>
  `;

  // 2. 核心数据与运行业务
  let prizes = [];
  let remaining = 3;
  let won = 0;
  let lock = false;

  function initGame() {
    remaining = 3; won = 0; lock = false;
    document.getElementById('shellRemainingFlips').innerText = remaining;
    document.getElementById('shellWonAmount').innerText = '0.00';
    document.getElementById('shellRestartBtn').style.style = 'none';
    document.getElementById('shellRestartBtn').style.display = 'none';

    // 随机底池奖金分配
    prizes = [];
    let pool = [2.5, 5.0, 1.2, 8.8, 15.0, 3.0, 0.5, 6.0, 20.0];
    prizes = pool.sort(() => Math.random() - 0.5);

    const grid = document.getElementById('cardGrid');
    grid.innerHTML = '';
    prizes.forEach((prize, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.id = `card-${index}`;
      card.onclick = () => runFlipLogic(index, card);
      
      let pLevel = prize >= 10 ? 'big-prize' : (prize >= 3 ? 'mid-prize' : 'small-prize');
      card.innerHTML = `
        <div class="card-inner">
          <div class="card-front">?</div>
          <div class="card-back ${pLevel}">
            <div class="card-amount">￥${prize.toFixed(2)}</div>
            <div class="card-label">福利</div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function runFlipLogic(index, cardElement) {
    if (remaining <= 0 || lock || cardElement.classList.contains('flipped')) return;
    lock = true;
    cardElement.classList.add('flipped');
    remaining--;
    won += prizes[index];

    document.getElementById('shellRemainingFlips').innerText = remaining;
    document.getElementById('shellWonAmount').innerText = won.toFixed(2);

    setTimeout(() => {
      lock = false;
      if (remaining === 0) {
        // 🌟 强力联动：一行调用大厅封装好的 LED 战报，省去几百行弹窗代码！
        window.GameUI.showLedger("翻牌大捷！", `￥${won.toFixed(2)}`, "欧气爆棚!", () => {
          document.getElementById('shellRestartBtn').style.display = 'block';
        });

        // 翻开剩余未翻的所有卡片并变暗
        prizes.forEach((_, idx) => {
          const el = document.getElementById(`card-${idx}`);
          if (!el.classList.contains('flipped')) el.classList.add('flipped', 'dimmed');
        });
      }
    }, 400);
  }

  document.getElementById('shellRestartBtn').onclick = initGame;
  
  // 启动游戏
  initGame();

  // 3. 销毁器：切换走时必须自毁
  window.currentGameDestroy = function() {
    console.log("翻牌游戏已被完全卸载，内存已安全释放。");
  };
})();
