// games/flip-card.js - 注入式全栈促销大翻牌核心引擎
(function() {
  // --- 1. 初始化核心游戏参数（若无云端注入，则使用默认的这套账目） ---
  let config = {
    min: 0.5,
    max: 5.0,
    grid: 9,
    flips: 3
  };

  // 🧠 核心注入拦截点：检查 index.html 网页里有没有从 Cloudflare D1 拿回来的商户参数
  if (window.CURRENT_MERCHANT_CONFIG_JSON) {
    try {
      const customSettings = JSON.parse(window.CURRENT_MERCHANT_CONFIG_JSON);
      config.min = parseFloat(customSettings.min) || config.min;
      config.max = parseFloat(customSettings.max) || config.max;
      config.grid = parseInt(customSettings.grid) || config.grid;
      config.flips = parseInt(customSettings.flips) || config.flips;
      console.log("🎯 flip-card 大脑已成功融汇贯通商家云端奖池:", config);
    } catch (e) {
      console.error("解析商户定制 JSON 失败，降级为默认公共池:", e);
    }
  }

  // --- 2. 游戏内部状态寄存器 ---
  let remainingFlips = config.flips;
  let wonAmount = 0.00;
  let isLocked = false;
  let prizeArray = [];

  // 动态生成本局的随机奖池浮动矩阵（基于活动方设置的最小/最大值）
  for (let i = 0; i < config.grid; i++) {
    let rand = Math.random() * (config.max - config.min) + config.min;
    prizeArray.push(parseFloat(rand.toFixed(2)));
  }

  // --- 3. 挂载游戏舞台 HTML 结构 ---
  const stage = document.getElementById('game-stage');
  if (!stage) return;

  let gridColumns = 3; // 默认3列九宫格
  if (config.grid <= 4) gridColumns = 2;
  if (config.grid > 9) gridColumns = 4;

  stage.innerHTML = `
    <style>
      .flip-status-bar { display: flex; justify-content: space-around; margin: 15px 0; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; font-weight: bold; border: 1px solid rgba(255,255,255,0.05); }
      .flip-status-bar span { color: var(--accent-gold); font-size: 1.1rem; }
      .flip-grid { display: grid; grid-template-columns: repeat(${gridColumns}, 1fr); gap: 10px; margin: 0 auto; max-width: 420px; padding: 5px; }
      .flip-card { height: 100px; position: relative; perspective: 1000px; cursor: pointer; }
      .flip-inner { width: 100%; height: 100%; position: absolute; transform-style: preserve-3d; transition: transform 0.5s ease; }
      .flip-card.is-flipped .flip-inner { transform: rotateY(180deg); }
      .flip-face { width: 100%; height: 100%; position: absolute; backface-visibility: hidden; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.4); }
      .flip-front { background: linear-gradient(135deg, #2c3e50 0%, #0f1419 100%); border: 2px solid var(--accent-gold); color: var(--accent-gold); font-size: 1.4rem; text-shadow: 0 0 8px rgba(247,184,1,0.5); }
      .flip-back { background: rgba(255, 107, 53, 0.1); border: 2px solid var(--primary-color); color: #fff; transform: rotateY(180deg); flex-direction: column; font-size: 0.75rem; }
      .flip-back b { font-size: 1.2rem; color: var(--accent-gold); margin-bottom: 2px; }
    </style>

    <div class="flip-status-bar">
      <div>剩余机会: <span id="f-flips">${remainingFlips}</span> 次</div>
      <div>累计中奖: <span id="f-won">￥${wonAmount.toFixed(2)}</span></div>
    </div>

    <div class="flip-grid" id="flipGridBox"></div>
  `;

  // 动态往舞台里塞入卡牌
  const gridBox = document.getElementById('flipGridBox');
  for (let i = 0; i < config.grid; i++) {
    const card = document.createElement('div');
    card.className = 'flip-card';
    card.innerHTML = `
      <div class="flip-inner">
        <div class="flip-face flip-front">★</div>
        <div class="flip-face flip-back">
          <b>￥${prizeArray[i]}</b>
          <span>现金红包</span>
        </div>
      </div>
    `;
    
    // 绑定翻牌交互事件
    card.onclick = () => {
      if (isLocked || card.classList.contains('is-flipped') || remainingFlips <= 0) return;

      remainingFlips--;
      document.getElementById('f-flips').innerText = remainingFlips;

      card.classList.add('is-flipped');
      wonAmount += prizeArray[i];
      document.getElementById('f-won').innerText = `￥${wonAmount.toFixed(2)}`;

      // 局终判定
      if (remainingFlips === 0) {
        isLocked = true;
        
        // 延迟1秒唤醒大厅外壳那套炫酷的 LED 战报弹窗机制
        setTimeout(() => {
          let evaluation = "非气满满";
          if (wonAmount > (config.max * config.flips) * 0.7) evaluation = "欧皇附体！";
          else if (wonAmount > (config.max * config.flips) * 0.4) evaluation = "运气爆棚";

          // 🧠 调用 index.html 里的公用 UI 组件弹窗
          window.GameUI.showLedger(
            "恭喜收官！", 
            `￥${wonAmount.toFixed(2)}`, 
            evaluation, 
            () => {
              // 弹窗被玩家点击关闭后的回调：全盘翻转曝光答案
              document.querySelectorAll('.flip-card').forEach(c => c.classList.add('is-flipped'));
            }
          );
        }, 800);
      }
    };
    gridBox.appendChild(card);
  }

  // --- 4. 注册优雅的内存回收机制，防止大厅高频换游戏时内存泄漏 ---
  window.currentGameDestroy = () => {
     console.log("🧹 大翻牌游戏正在被大厅调度回收...");
     gridBox.innerHTML = "";
  };

})();
