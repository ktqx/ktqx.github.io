/**
 * 大转盘游戏核心积木组件
 * @param {HTMLElement} container - 外壳提供的承载容器插槽
 * @param {Object} settings - 商家在后台自定义的游戏配置(奖品、概率等)
 * @param {Function} onGameOver - 游戏结束后的全局通知回调（触发黄金雨、上报数据）
 */
export function init(container, settings, onGameOver) {
  // 1. 提取或使用默认商家配置
  const sectors = settings?.sectors || [
    { text: "一等奖 💰", color: "#ff6b35" },
    { text: "谢谢参与 ☕", color: "#004e89" },
    { text: "二等奖 🎁", color: "#f7b801" },
    { text: "再来一次 🍀", color: "#1a2332" },
    { text: "三等奖 🎫", color: "#d946ef" },
    { text: "未中奖 💔", color: "#6b7280" }
  ];

  // 2. 注入从原 HTML 剥离出来的核心游戏 HTML 结构与样式
  container.innerHTML = `
    <style>
      .wheel-game-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; color: #fff; }
      .wheel-wrapper { position: relative; width: 320px; height: 320px; margin: 20px auto; }
      #wheel { width: 100%; height: 100%; border-radius: 50%; border: 8px solid #f7b801; box-shadow: 0 0 20px rgba(247,184,1,0.5); }
      .needle { position: absolute; top: -15px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-top: 35px solid #ff4757; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); z-index: 10; }
      .ctrl-panel { width: 100%; max-width: 320px; text-align: center; margin-top: 15px; }
      .spin-btn { width: 100%; padding: 15px; font-size: 1.2rem; font-weight: 900; background: linear-gradient(135deg, #ff6b35, #ff4757); border: none; border-radius: 12px; color: #fff; box-shadow: 0 6px 20px rgba(255,107,53,0.4); cursor: pointer; }
      .spin-btn:disabled { background: #4b5563; box-shadow: none; }
      .power-bar-bg { width: 100%; height: 8px; background: #1e293b; border-radius: 4px; margin-top: 10px; overflow: hidden; }
      .power-bar-fill { width: 0%; height: 100%; background: linear-gradient(90deg, #34d399, #f59e0b, #ef4444); transition: width 0.05s linear; }
      #statusText { margin-top: 15px; font-size: 1.1rem; text-align: center; min-height: 24px; font-weight: bold; }
    </style>
    
    <div class="wheel-game-box">
      <div class="wheel-wrapper">
        <div class="needle"></div>
        <canvas id="wheel" width="320" height="320"></canvas>
      </div>
      <div class="ctrl-panel">
        <button id="spinBtn" class="spin-btn">长按蓄力 / 松开启动</button>
        <div class="power-bar-bg"><div id="powerBar" class="power-bar-fill"></div></div>
        <div id="statusText">准备就绪，请按住按钮</div>
      </div>
    </div>
  `;

  // 3. 游戏核心状态变量
  const canvas = document.getElementById('wheel');
  const ctx = canvas.getContext('2d');
  const spinBtn = document.getElementById('spinBtn');
  const powerBar = document.getElementById('powerBar');
  const statusText = document.getElementById('statusText');

  let gameState = {
    isSpinning: false,
    isCharging: false,
    chargeTime: 0,
    currentRotation: 0,
    maxCharge: 2000
  };

  // 4. 原生 Canvas 扇形盘面绘制逻辑
  function drawWheel() {
    const numSectors = sectors.length;
    const arcAngle = (2 * Math.PI) / numSectors;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sectors.forEach((sector, i) => {
      const angle = i * arcAngle;
      ctx.beginPath();
      ctx.fillStyle = sector.color;
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius, angle, angle + arcAngle);
      ctx.lineTo(radius, radius);
      ctx.fill();

      // 绘制文字
      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(angle + arcAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(sector.text, radius - 25, 5);
      ctx.restore();
    });
  }

  // 5. 蓄力与旋转物理动效控制
  let chargeInterval;
  function startCharging(e) {
    if (gameState.isSpinning) return;
    if(e.cancelable) e.preventDefault();
    gameState.isCharging = true;
    gameState.chargeTime = 0;
    statusText.innerText = "正在强力蓄力中...";
    
    chargeInterval = setInterval(() => {
      if (gameState.chargeTime < gameState.maxCharge) {
        gameState.chargeTime += 50;
        powerBar.style.width = `${(gameState.chargeTime / gameState.maxCharge) * 100}%`;
      }
    }, 50);
  }

  function stopCharging() {
    if (!gameState.isCharging) return;
    gameState.isCharging = false;
    clearInterval(chargeInterval);
    runSpin();
  }

  function runSpin() {
    gameState.isSpinning = true;
    spinBtn.disabled = true;
    statusText.innerText = "转盘疯狂旋转中...";

    // 依照蓄力时间计算初速度
    const chargeRatio = gameState.chargeTime / gameState.maxCharge;
    let speed = 15 + chargeRatio * 25; 
    const friction = 0.982; 

    function animate() {
      gameState.currentRotation += speed;
      canvas.style.transform = `rotate(${gameState.currentRotation}deg)`;
      speed *= friction;

      if (speed > 0.05) {
        requestAnimationFrame(animate);
      } else {
        finishSpin();
      }
    }
    requestAnimationFrame(animate);
  }

  function finishSpin() {
    gameState.isSpinning = false;
    spinBtn.disabled = false;
    powerBar.style.width = '0%';
    
    const n = sectors.length;
    const angleStep = 360 / n;
    // 计算指针落在哪一个扇形区
    const finalAngle = (360 - (gameState.currentRotation % 360)) % 360;
    const index = Math.floor(finalAngle / angleStep) % n;
    const result = sectors[index];

    statusText.innerHTML = `中奖结果: <span style="color:${result.color}">${result.text}</span>`;
    
    // 【最核心】：调用外壳传进来的通知函数，把结果送上去
    if (typeof onGameOver === 'function') {
      onGameOver(result.text); 
    }
  }

  // 6. 事件绑定（全面兼容移动端长按事件与PC端）
  spinBtn.addEventListener('touchstart', startCharging, { passive: false });
  spinBtn.addEventListener('touchend', stopCharging, { passive: false });
  spinBtn.addEventListener('mousedown', startCharging);
  window.addEventListener('mouseup', stopCharging);

  // 初始化首次绘制
  drawWheel();
}
