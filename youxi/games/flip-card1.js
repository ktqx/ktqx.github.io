// games/flip-card.js - 终极全端自适应+美化版组件
(function() {
  const stage = document.getElementById('game-stage');

  // 1. 注入自适应布局样式（完美解决微信、电脑溢出，重玩按钮被遮挡问题）
  stage.innerHTML = `
    <style>
      :root {
        --big-prize:       #ff4d4f;
        --mid-prize:       #faad14;
        --small-prize:     #52c41a;
      }
      
      /* 弹性盒布局：把整个游戏容器高度锁死在金框剩余空间内 */
      .flip-game-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
      }
      
      .stats { 
        margin: 0 auto 10px; font-size: 0.9rem; display: flex; justify-content: center; 
        gap: 20px; color: var(--text-secondary); background: rgba(0, 0, 0, 0.4); 
        padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03); 
      }
      .stat-val { color: var(--accent-gold); font-weight: bold; font-size: 1.1rem; }
      
      /* 核心修复：限制最大高度，确保在电脑和微信上都不会挤出外壳 */
      .card-grid { 
        display: grid; 
        grid-template-columns: repeat(3, 1fr); 
        gap: 8px; 
        padding: 2px; 
        width: 100%; 
        max-width: 420px;
        margin: 0 auto;
        flex: 1;
      }
      
      .card { 
        width: 100%; 
        aspect-ratio: 0.82; /* 稍微扁平一点，给底部留足空间 */
        cursor: pointer; 
        position: relative; 
        transition: transform 0.2s; 
        transform-style: flat; 
      }
      .card:hover:not(.flipped) { transform: translateY(-2px); }
      .card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
      .card.flipped .card-inner { transform: rotateY(180deg); }
      .card-front, .card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-weight: bold; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4); top: 0; left: 0; }
      
      /* 🔮 升级：精美卡面背面图案（纯CSS编织的暗纹+星芒几何图腾） */
      .card-front { 
        background: radial-gradient(circle at center, #161e3d 0%, #060a1c 100%);
        color: #ffd700; 
        font-size: 1.8rem; 
        border: 2px solid rgba(255, 215, 0, 0.4); 
        text-shadow: 0 0 8px rgba(255, 235, 120, 0.6);
        overflow: hidden;
      }
      /* 用伪元素在问号后面画一个科技感发光十字星芒图案 */
      .card-front::before {
        content: ''; position: absolute; width: 60px; height: 60px;
        background: radial-gradient(rgba(255,215,0,0.15) 0%, transparent 60%);
        z-index: 1;
      }
      .card-front::after {
        content: '✦'; position: absolute; font-size: 0.8rem; color: rgba(255,215,0,0.3);
        top: 8px; right: 8px;
      }
      
      .card-back { background: linear-gradient(135deg, #ffd700, #ffb300, #ff8f00); color: #4a2600; transform: rotateY(180deg); flex-direction: column; gap: 2px; border: 1px solid rgba(247, 184, 1, 0.3); }
      .card-amount { font-size: 1rem; font-weight: bold; }
      .card-label { font-size: 0.65rem; opacity: 0.9; background: rgba(0, 0, 0, 0.2); padding: 1px 4px; border-radius: 3px; }
      .card-back.big-prize { background: linear-gradient(135deg, #ff4d4f, #cf1322); color: #fff; }
      .card-back.mid-prize { background: linear-gradient(135deg, #2b1055, #511281); color: #f7b801; }
      .card-back.small-prize { background: linear-gradient(135deg, #52c41a, #389e0d); color: #fff; }
      .card.dimmed { opacity: 0.35; filter: grayscale(50%); }
      
      .btn-container { min-height: 45px; display: flex; align-items: center; justify-content: center; margin-top: 10px; }
      .btn-spin { 
        width: 140px; padding: 8px 16px; 
        background: linear-gradient(135deg, var(--primary-color), #ff8c42); 
        color: #fff; border: none; border-radius: 50px; font-size: 0.9rem; 
        font-weight: 800; cursor: pointer; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.25); 
        transition: all 0.2s;
      }
      .btn-spin:hover { transform: scale(1.05); }

      /* 🏆 战报遮罩层：解决遮挡问题，让界面瞬间变得极其高端 */
      .game-overlay {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(10, 14, 25, 0.65); backdrop-filter: blur(4px);
        z-index: 80; opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
        border-radius: 12px;
      }
      .game-overlay.active { opacity: 1; pointer-events: auto; }
    </style>

    <div class="flip-game-container">
      <div id="gameMask" class="game-overlay"></div>

      <div class="stats">
        <div>剩余机会: <span id="shellRemainingFlips" class="stat-val">3</span> 次</div>
        <div>已揽总额: ￥<span id="shellWonAmount" class="stat-val">0.00</span></div>
      </div>
      
      <div id="cardGrid" class="card-grid"></div>
      
      <div class="btn-container">
        <button id="shellRestartBtn" class="btn-spin" style="display:none">再玩一次</button>
      </div>
    </div>
  `;

  // ===== 🔊 模块化内置音效引擎 =====
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;

    if (type === 'flip') {
      const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.frequency.setValueAtTime(f, now + i * 0.06);
        g.gain.setValueAtTime(0.08, now + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.25);
        o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.25);
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
    document.getElementById('gameMask').classList.remove('active');

    let pool = [2.0, 5.0, 1.5, 6.6, 12.0, 3.5, 0.8, 8.8, 16.8];
    prizes = pool.sort(() => Math.random() - 0.5);

    const grid = document.getElementById('cardGrid');
    grid.innerHTML = '';
    prizes.forEach((prize, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.id = `card-${index}`;
      card.onclick = () => runFlipLogic(index, card);
      
      let pLevel = prize >= 10 ? 'big-prize' : (prize >= 5 ? 'mid-prize' : 'small-prize');
      card.innerHTML = `
        <div class="card-inner">
          <div class="card-front"><span style="position:relative; z-index:2;">?</span></div>
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
    
    playSound('flip');
    cardElement.classList.add('flipped');
    remaining--;
    won += prizes[index];

    document.getElementById('shellRemainingFlips').innerText = remaining;
    document.getElementById('shellWonAmount').innerText = won.toFixed(2);

    setTimeout(() => {
      lock = false;
      if (remaining === 0) {
        playSound('win');

        // 激活暗色背景遮罩，突显中奖战报
        document.getElementById('gameMask').classList.add('active');

        let evaluation = won >= 20 ? "神级非酋逆袭!!" : (won >= 10 ? "运气超赞!" : "小试身手!");
        window.GameUI.showLedger("翻牌大捷！", `￥${won.toFixed(2)}`, evaluation, () => {
          // 战报关闭后：移除暗色遮罩，浮现再玩一次按钮
          document.getElementById('gameMask').classList.remove('active');
          document.getElementById('shellRestartBtn').style.display = 'block';
        });

        // 自动揭晓未翻开的牌
        prizes.forEach((_, idx) => {
          const el = document.getElementById(`card-${idx}`);
          if (!el.classList.contains('flipped')) el.classList.add('flipped', 'dimmed');
        });
      }
    }, 400);
  }

  document.getElementById('shellRestartBtn').onclick = initGame;
  initGame();

  window.currentGameDestroy = function() {
    console.log("全端自适应大翻牌组件已安全卸载。");
  };
})();
