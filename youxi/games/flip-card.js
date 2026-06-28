// games/flip-card.js - 多商户高并发动态注入核心游戏引擎

// 声明游戏内部全局核心变量
let gameSettings = { min: 0.1, max: 5.0, grid: 9, flips: 3 }; 
let remainingFlips = 3;
let totalWonAmount = 0.00;
let isGameLocked = false;
let prizeMatrix = [];

/**
 * 🧠 引擎入口函数：由 index.html 远程获取数据后调用注入
 * @param {string|null} cloudJsonString 云端取出的商家专属加密配置字符串
 */
function initGame(cloudJsonString) {
    // 1. 如果商家在控制台设置了专属游戏参数，则动态重写本地默认奖池
    if (cloudJsonString) {
        try {
            const custom = JSON.parse(cloudJsonString);
            gameSettings.min = parseFloat(custom.min) || 0.1;
            gameSettings.max = parseFloat(custom.max) || 5.0;
            gameSettings.grid = parseInt(custom.grid) || 9;
            gameSettings.flips = parseInt(custom.flips) || 3;
            console.log("✅ 游戏大脑已成功注入商家专属奖池配置: ", gameSettings);
        } catch (e) {
            console.error("解析商家专属游戏参数失败，采用默认系统池:", e);
        }
    }

    // 2. 初始化重置游戏数据计数器
    remainingFlips = gameSettings.flips;
    totalWonAmount = 0.00;
    isGameLocked = false;
    prizeMatrix = [];

    // 3. 根据商户后台定制的“小/大金额范围”以及“九宫格总数”，动态使用随机数学期望算法生成这一局的奖池矩阵
    for (let i = 0; i < gameSettings.grid; i++) {
        let randomPrize = Math.random() * (gameSettings.max - gameSettings.min) + gameSettings.min;
        prizeMatrix.push(parseFloat(randomPrize.toFixed(2)));
    }

    // 4. 将生成的机制渲染到前端 HTML 界面上
    renderFlipCardStage();
}

/**
 * 前端九宫格卡牌舞台绘制渲染器
 */
function renderFlipCardStage() {
    const container = document.getElementById('game-container');
    if (!container) return;

    // 动态构建带有商户参数的状态数据展示面板
    let html = `
        <style>
            .status-panel { display: flex; justify-content: space-around; margin-bottom: 20px; font-weight: bold; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; }
            .status-val { color: #f7b801; font-size: 1.2rem; }
            .card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0 auto; max-width: 360px; }
            .card-item { height: 110px; position: relative; perspective: 1000px; cursor: pointer; }
            .card-inner { width: 100%; height: 100%; position: absolute; transform-style: preserve-3d; transition: transform 0.6s ease; }
            .card-item.flipped .card-inner { transform: rotateY(180deg); }
            .card-face { width: 100%; height: 100%; position: absolute; backface-visibility: hidden; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 8px rgba(0,0,0,0.3); }
            .card-front { background: linear-gradient(135deg, #f7b801 0%, #ff6b35 100%); border: 2px solid #fff; color: #fff; font-size: 1.5rem; }
            .card-back { background: #222; border: 2px solid #f7b801; color: #f7b801; transform: rotateY(180deg); flex-direction: column; }
            .prize-tag { font-size: 1.3rem; margin-bottom: 2px; }
            .curr-tag { font-size: 0.65rem; background: #ff6b35; color: #fff; padding: 2px 5px; border-radius: 4px; }
        </style>
        
        <div class="status-panel">
            <div>剩余翻牌机会: <span id="uiFlips" class="status-val">${remainingFlips}</span> 次</div>
            <div>累计斩获福利: <span id="uiWon" class="status-val">￥${totalWonAmount.toFixed(2)}</span></div>
        </div>
        <div class="card-grid" id="cardGridStage">
    `;

    // 按照商户设置的格子总数（例如 9 宫格、6 宫格或 12 宫格），动态循环吐出卡牌
    for (let i = 0; i < gameSettings.grid; i++) {
        html += `
            <div class="card-item" onclick="executeCardFlip(this, ${i})">
                <div class="card-inner">
                    <div class="card-face card-front">❓</div>
                    <div class="card-face card-back" id="back-p-${i}">
                        <span class="prize-tag">￥${prizeMatrix[i]}</span>
                        <span class="curr-tag">现金红包</span>
                    </div>
                </div>
            </div>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * 核心翻牌交互中奖判断控制器
 */
function executeCardFlip(cardElement, index) {
    // 状态安全锁：如果已经翻过、没有次数或游戏锁定，直接拦截
    if (isGameLocked || cardElement.classList.contains('flipped') || remainingFlips <= 0) return;

    // 1. 扣减翻牌机会，并更新界面显示
    remainingFlips--;
    document.getElementById('uiFlips').innerText = remainingFlips;

    // 2. 累加本次翻牌中得的现金金额
    const prize = prizeMatrix[index];
    totalWonAmount += prize;
    document.getElementById('uiWon').innerText = `￥${totalWonAmount.toFixed(2)}`;

    // 3. 触发 CSS 3D 翻转动效
    cardElement.classList.add('flipped');

    // 4. 判断这局游戏是否结束
    if (remainingFlips === 0) {
        isGameLocked = true; // 锁定舞台防止玩家继续点
        
        // 延迟 1 秒弹框，给玩家看最后一张牌翻开的动画时间
        setTimeout(() => {
            // 🧠 极致高并发优化设置：翻牌过程中绝不发请求，只有在最后弹窗结算这一刻，才向云端写入单次流水日志（如果有的话）
            alert(`🎉 恭喜发财！本局游戏结束。\n您最终成功赢得了 ${gameSettings.flips} 个定制红包，累计斩获福利现金：￥${totalWonAmount.toFixed(2)} 元！\n请下拉查看活动方专属兑奖规则与领奖微信二维码。`);
            
            // 自动化展示全盘答案（把所有没翻开的牌也强行翻过来让玩家心服口服）
            document.querySelectorAll('.card-item').forEach(card => card.classList.add('flipped'));
        }, 1000);
    }
}
