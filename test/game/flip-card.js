// 当宿主加载完此文件后，会自动调用此函数，并把商家的专属 game_config 传进来
function initSpecificGame(config) {
    const runtimeView = document.getElementById('game-runtime-view');
    
    // 1. 注入大翻牌专属的样式和 HTML 结构
    const style = document.createElement('style');
    style.innerHTML = `
        .card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top:15px; }
        .game-card { aspect-ratio: 0.714; background: #0b112c; border: 2px solid #ffd700; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: bold; color: #ffd700; cursor: pointer; transition: transform 0.3s; }
        .game-card.flipped { background: linear-gradient(135deg, #ff4d4f, #cf1322); color: white; font-size: 1rem; flex-direction: column; }
        .game-card.dimmed { opacity: 0.4; }
        .game-stats { font-size: 0.9rem; margin-bottom: 10px; color: #b0b3c1; }
    `;
    document.head.appendChild(style);

    runtimeView.innerHTML = `
        <div class="game-stats">剩余翻牌机会: <span id="localFlips" style="color:#f7b801; font-weight:bold;">0</span> 次</div>
        <div id="localGrid" class="card-grid"></div>
    `;

    // 2. 运行你原本提供的翻牌核心算法逻辑
    let remainingFlips = config.limitCount;
    let wonAmount = 0;
    let isProcessing = false;

    document.getElementById('localFlips').innerText = remainingFlips;

    // 算法分配奖池
    function distribute(count, total, min, max) {
        let result = []; let remaining = total;
        for (let i = 0; i < count - 1; i++) {
            let currentMax = Math.min(max, remaining - (count - 1 - i) * min);
            let currentMin = Math.max(min, remaining - (count - 1 - i) * max);
            let amount = Math.random() * (currentMax - currentMin) + currentMin;
            amount = Math.round(amount * 100) / 100;
            result.push(amount); remaining -= amount;
        }
        result.push(Math.round(remaining * 100) / 100);
        return result.sort(() => Math.random() - 0.5);
    }

    const prizes = distribute(config.cardCount, config.totalAmount, config.minAmount, config.maxAmount);
    const gridContainer = document.getElementById('localGrid');

    prizes.forEach((prize, idx) => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerText = '?';
        card.onclick = () => {
            if(remainingFlips <= 0 || isProcessing || card.classList.contains('flipped')) return;
            
            isProcessing = true;
            card.classList.add('flipped');
            card.innerHTML = `<div>￥${prize.toFixed(2)}</div><div style="font-size:0.6rem;background:rgba(0,0,0,0.2);padding:2px">奖励</div>`;
            
            remainingFlips--;
            wonAmount += prize;
            document.getElementById('localFlips').innerText = remainingFlips;

            setTimeout(() => {
                isProcessing = false;
                if(remainingFlips === 0) {
                    // 游戏结束，触发宿主框架的公共 LED战报与黄金雨
                    publicGameEnd(wonAmount);
                    // 把没翻开的牌变暗揭晓
                    Array.from(gridContainer.children).forEach((c, i) => {
                        if(!c.classList.contains('flipped')) {
                            c.classList.add('flipped', 'dimmed');
                            c.innerHTML = `<div>￥${prizes[i].toFixed(2)}</div>`;
                        }
                    });
                }
            }, 300);
        };
        gridContainer.appendChild(card);
    });
}
