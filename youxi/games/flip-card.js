// games/flip-card.js - 完美修复版大翻牌组件
(function() {
  const stage = document.getElementById('game-stage');

  // 1. 注入局部样式（修复了卡片超出边框的问题，调整了重玩按钮）
  stage.innerHTML = `
    <style>
      :root {
        --big-prize:       #ff4d4f;
        --mid-prize:       #faad14;
        --small-prize:     #52c41a;
      }
      .flip-game-container {
        display: flex; flex-direction: column; height: 100%; width: 100%; justify-content: space-between;
      }
      .stats { 
        margin: 0 auto 10px; font-size: 1rem; display: flex; justify-content: center; 
        gap: 25px; color: var(--text-secondary); background: rgba(0, 0, 0, 0.4); 
        padding: 8px 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03); 
      }
      .stat-val { color: var(--accent-gold); font-weight: bold; font-size: 1.2rem; }
      
      /* 修复超出：给九宫格最大高度限制，防止卡片无限撑高 */
      .card-grid { 
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; 
        padding: 5px; width: 100%; max-height: 340px; margin: 0 auto;
      }
      .card { 
        width: 100%; aspect-ratio: 0.85; cursor: pointer; position: relative; 
        transition: transform 0.2s; transform-style: flat; 
      }
      .card:hover:not(.flipped) { transform: translateY(-2px); }
      .card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
      .card.flipped .card-inner { transform: rotateY(180deg); }
      .card-front, .card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-weight: bold; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4); top: 0; left: 0; }
      
      .card-front { background-color: #0b112c; color: #ffd700; font-size: 1.8rem; border: 2px solid rgba(255, 215, 0, 0.5); text-shadow: 0 0 8px rgba(255, 235, 120, 0.5); }
      .card-back { background: linear-gradient(135deg, #ffd700, #ffb300, #ff8f00); color: #4a2600; transform: rotateY(180deg); flex-direction: column; gap: 2px; border: 1px solid rgba(247, 184, 1, 0.3); }
      
      .card-amount { font-size: 1rem; font-weight: bold; }
      .card-label { font-size: 0.65rem; opacity: 0.9; background: rgba(0, 0, 0, 0.2); padding: 1px 4px; border-radius: 3px; }
      .card-back.big-prize { background: linear-gradient(135deg, #ff4d4f, #cf1322); color: #fff; }
      .card-back.mid-prize { background: linear-gradient(135deg, #2b1055, #511281); color: #f7b801; }
      .card-back.small-prize { background: linear-gradient(135deg, #52c41a, #389e0d); color: #fff; }
      .card.dimmed { opacity: 0.35; filter: grayscale(50%); }
      
      /* 修复重玩按钮：确保样式正确展现并置底 */
      .btn-spin { 
        width: 160px; margin: 15px auto 5px; padding: 10px 16px; 
        background: linear-gradient(135deg, var(--primary-color), #ff8c42); 
        color: #fff; border: none; border-radius: 50px; font-size: 0.95rem; 
        font-weight: 800; cursor: pointer; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.25); 
        transition: all 0.2s;
      }
      .btn-spin:hover { transform: scale(1.05); }
    </style>

    <div class="flip-game-container">
      <div class="stats">
        <div>剩余机会: <span id="shellRemainingFlips" class="stat-val">3</span> 次</div>
        <div>已揽总额: ￥<span id="shellWonAmount" class="stat-val">0.00</span></div>
      </div>
      <div id="cardGrid" class="card-grid"></div>
      <div>
        <button id="shellRestartBtn" class="btn-spin" style="display:none">再玩一次</button>
      </div>
    </div>
  `;

  // ===== 🔊 模块化内置音效引擎 =====
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);

    if (type === 'flip') {
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'win') {
      // 喜庆的三和弦中奖音效
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.frequency.setValueAtTime(f, now + i * 0.08);
        g.gain.setValueAtTime(0.1, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);
        o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.2);
      });
    }
  }

  // ===== 游戏业务逻辑 =====
  let prizes = [];
  let remaining = 3;
  let won = 0;
  let lock = false;

  function initGame() {
    remaining = 3; won = 0; lock = false;
    document.getElementById('shellRemainingFlips').innerText = remaining;
    document.getElementById('shellWonAmount').innerText = '0.00';
    document.getElementById('shellRestartBtn').style.display = 'none';

    // 生成随机奖金池
    let pool = [2.5, 5.0, 1.2, 8.8, 12.0, 3.0, 0.5, 6.0, 18.0];
    prizes = pool.sort(() => Math.random() - 0.5);

    const grid = document.getElementById('cardGrid');
    grid.innerHTML = '';
    prizes.forEach((prize, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.id = `card-${index}`;
      card.onclick = () => runFlipLogic(index, card);
      
      let pLevel = prize >= 10 ? 'big-prize' : (prize >= 4 ? 'mid-prize' : 'small-prize');
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
    
    playSound('flip'); // 🔊 触发翻牌音效
    cardElement.classList.add('flipped');
    remaining--;
    won += prizes[index];

    document.getElementById('shellRemainingFlips').innerText = remaining;
    document.getElementById('shellWonAmount').innerText = won.toFixed(2);

    setTimeout(() => {
      lock = false;
      if (remaining === 0) {
        playSound('win'); // 🔊 触发中奖通关和弦音效

        // ✨ 完美对接：调用 index.html 的全局大厅 LED 弹窗，传递专属文案
        let evaluation = won >= 25 ? "欧皇附体!!" : (won >= 12 ? "运气爆棚!" : "再接再厉!");
        window.GameUI.showLedger("翻牌大捷！", `￥${won.toFixed(2)}`, evaluation, () => {
          // 弹窗关闭后的回调：让“再玩一次”按钮冒出来
          document.getElementById('shellRestartBtn').style.display = 'block';
        });

        // 自动翻开剩下的底牌并变暗
        prizes.forEach((_, idx) => {
          const el = document.getElementById(`card-${idx}`);
          if (!el.classList.contains('flipped')) el.classList.add('flipped', 'dimmed');
        });
      }
    }, 400);
  }

  // 绑定“再玩一次”按钮事件
  document.getElementById('shellRestartBtn').onclick = () => {
    initGame();
  };
  
  // 运行
  initGame();

  // 自毁钩子
  window.currentGameDestroy = function() {
    console.log("翻牌游戏组件已安全安全卸载。");
  };
})();
