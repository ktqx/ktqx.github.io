// games/dart-wheel.js - 注入式全栈促销飞镖大轮盘核心引擎
(function() {
  // --- 1. 初始化核心游戏参数（若无云端注入，则使用默认的这套账目） ---
  let config = {
    min: 0.2,          // 默认保底金额
    max: 10.0,         // 默认大奖上限
    grid: 6,           // 轮盘扇区总数（飞镖转盘推荐 6 或 8）
    flips: 3           // 默认每局可投掷飞镖次数
  };

  // 🧠 核心注入拦截点：检查 index.html 网页里有没有从 Cloudflare D1 拿回来的商户参数
  if (window.CURRENT_MERCHANT_CONFIG_JSON) {
    try {
      const customSettings = JSON.parse(window.CURRENT_MERCHANT_CONFIG_JSON);
      config.min = parseFloat(customSettings.min) || config.min;
      config.max = parseFloat(customSettings.max) || config.max;
      config.grid = parseInt(customSettings.grid) || config.grid;
      config.flips = parseInt(customSettings.flips) || config.flips;
      console.log("🎯 dart-wheel 大脑已成功融汇贯通商家云端奖池:", config);
    } catch (e) {
      console.error("解析商户定制 JSON 失败，降级为默认公共池:", e);
    }
  }

  // --- 2. 游戏内部状态寄存器 ---
  let remainingDarts = config.flips;
  let wonAmount = 0.00;
  let isLocked = false;
  let prizeMatrix = [];
  let currentRotation = 0; // 记录轮盘当前旋转角度

  // 动态生成本局的随机扇区奖池矩阵（基于活动方设置的最小/最大值）
  for (let i = 0; i < config.grid; i++) {
    let rand = Math.random() * (config.max - config.min) + config.min;
    prizeMatrix.push(parseFloat(rand.toFixed(2)));
  }

  // --- 3. 挂载游戏舞台 HTML 结构与精美黑金 CSS ---
  const stage = document.getElementById('game-stage');
  if (!stage) return;

  // 动态计算扇区角度
  const segmentDegrees = 360 / config.grid;
  let wheelSlicesHtml = '';
  
  // 动态生成轮盘扇区与文本
  prizeMatrix.forEach((prize, index) => {
    const angle = index * segmentDegrees;
    wheelSlicesHtml += `
      <div class="wheel-slice" style="transform: rotate(${angle}deg) skewY(${90 - segmentDegrees}deg); background: ${index % 2 === 0 ? 'rgba(247,184,1,0.1)' : 'rgba(255,107,53,0.05)'};">
        <div class="slice-content" style="transform: skewY(-${90 - segmentDegrees}deg) rotate(${segmentDegrees / 2}deg);">
          <b>￥${prize}</b>
        </div>
      </div>
    `;
  });

  stage.innerHTML = `
    <style>
      .dart-status-bar { display: flex; justify-content: space-around; margin: 15px 0; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; font-weight: bold; border: 1px solid rgba(255,255,255,0.05); }
      .dart-status-bar span { color: var(--accent-gold); font-size: 1.1rem; }
      
      /* 轮盘舞台与定位 */
      .wheel-stage { position: relative; width: 320px; height: 320px; margin: 30px auto; display: flex; justify-content: center; align-items: center; }
      
      /* 外围发光边框 */
      .wheel-outer-ring { width: 100%; height: 100%; border-radius: 50%; border: 6px solid var(--accent-gold); position: absolute; box-shadow: 0 0 25px rgba(247,184,1,0.3), inset 0 0 15px rgba(0,0,0,0.5); z-index: 1; }
      
      /* 真正的旋转轮盘大底盘 */
      .wheel-body { width: 96%; height: 96%; border-radius: 50%; position: relative; overflow: hidden; transform: rotate(0deg); transition: transform 4s cubic-bezier(0.1, 0.8, 0.25, 1); background: #151a22; border: 2px solid var(--primary-color); }
      
      /* 扇区切片基本样式 */
      .wheel-slice { position: absolute; top: 0; right: 0; width: 50%; height: 50%; transform-origin: 0% 100%; overflow: hidden; border-left: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); }
      .slice-content { position: absolute; left: -100%; bottom: -100%; width: 200%; height: 200%; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 35px; color: #fff; font-size: 0.9rem; text-align: center; }
      .slice-content b { color: var(--accent-gold); font-size: 1.1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.8); }
      
      /* 顶部的中心投掷飞镖按钮 / 指针 */
      .dart-pointer-btn { width: 75px; height: 75px; background: linear-gradient(135deg, var(--primary-color) 0%, #ff8c42 100%); border: 3px solid #fff; border-radius: 50%; position: absolute; z-index: 10; cursor: pointer; box-shadow: 0 5px 15px rgba(255,107,53,0.5); display: flex; flex-direction: column; justify-content: center; align-items: center; font-weight: bold; color: #fff; font-size: 0.85rem; transition: transform 0.1s ease; }
      .dart-pointer-btn::after { content: ''; position: absolute; top: -15px; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 18px solid var(--primary-color); }
      .dart-pointer-btn:active { transform: scale(0.95); }
      .dart-pointer-btn.disabled { background: #4a5568 !important; border-color: #718096 !important; cursor: not-allowed; box-shadow: none; }
    </style>

    <div class="dart-status-bar">
      <div>剩余飞镖: <span id="d-darts">${remainingDarts}</span> 支</div>
      <div>累计中奖: <span id="d-won">￥${wonAmount.toFixed(2)}</span></div>
    </div>

    <div class="wheel-stage">
      <div class="wheel-outer-ring"></div>
      
      <div class="wheel-body" id="wheelBodyEl">
        ${wheelSlicesHtml}
      </div>
      
      <div class="dart-pointer-btn" id="launchDartBtn">
        <span>🎯</span>
        <span style="font-size:0.7rem; margin-top:1px;">发射飞镖</span>
      </div>
    </div>
  `;

  // --- 4. 绑定核心飞镖旋转及概率运算交互逻辑 ---
  const wheelBodyEl = document.getElementById('wheelBodyEl');
  const launchDartBtn = document.getElementById('launchDartBtn');

  launchDartBtn.onclick = () => {
    if (isLocked || remainingDarts <= 0) return;

    // 1. 锁死交互，开始投掷动作
    isLocked = true;
    remainingDarts--;
    document.getElementById('d-darts').innerText = remainingDarts;
    launchDartBtn.classList.add('disabled');

    // 2. 精准数学模拟：随机抽取中奖扇区索引索引
    const targetIndex = Math.floor(Math.random() * config.grid);
    const prizeMoney = prizeMatrix[targetIndex];

    // 3. 计算旋转物理轨迹角度：
    // 指针在正上方（0度），转盘是顺时针转，所以目标扇区需要转到正上方
    // 基础圈数 (4-6圈防穿帮) + 抵消落点偏移
    const baseCircles = 360 * (4 + Math.floor(Math.random() * 2));
    const targetDegrees = 360 - (targetIndex * segmentDegrees + (segmentDegrees / 2));
    
    // 累加总旋转度数，保证顺滑不会往回倒退转
    currentRotation = baseCircles + targetDegrees + (360 * Math.floor(currentRotation / 360));
    wheelBodyEl.style.transform = `rotate(${currentRotation}deg)`;

    // 4. 等待 4 秒大轮盘平稳停止下来（与 CSS transition: transform 4s 强力同步）
    setTimeout(() => {
      // 累加累计总金额
      wonAmount += prizeMoney;
      document.getElementById('d-won').innerText = `￥${wonAmount.toFixed(2)}`;

      // 5. 局终判定或重激活飞镖按钮
      if (remainingDarts === 0) {
        setTimeout(() => {
          let evaluation = "再接再厉";
          if (wonAmount > (config.max * config.flips) * 0.7) evaluation = "惊世天路！";
          else if (wonAmount > (config.max * config.flips) * 0.4) evaluation = "百步穿杨";

          // 🧠 直接调用 index.html 注入在大厅里的 LED 结算弹窗
          window.GameUI.showLedger(
            "百步穿杨！", 
            `￥${wonAmount.toFixed(2)}`, 
            evaluation, 
            () => {
              // 结算被点击关闭后的重置保底动作
              console.log("游戏局结束。");
            }
          );
        }, 500);
      } else {
        // 还有多余飞镖，解锁允许玩家投掷下一支
        isLocked = false;
        launchDartBtn.classList.remove('disabled');
      }
    }, 4000);
  };

  // --- 5. 注册优雅的单页应用大厅垃圾回收机制，防止切哈希时内存泄漏 ---
  window.currentGameDestroy = () => {
    console.log("🧹 飞镖大轮盘正在被大厅引擎深度回收内存...");
    wheelBodyEl.innerHTML = "";
    launchDartBtn.onclick = null;
  };

})();
