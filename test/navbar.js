// navbar.js
document.addEventListener("DOMContentLoaded", function() {
    // 1. 创建导航栏的 HTML 结构
    const navbar = document.createElement("nav");
    navbar.className = "navbar";
    navbar.innerHTML = `
        <a href="index.html" class="navbar-logo"><span>🎮</span> Game Hub</a>
        <div class="navbar-spacer"></div>
        <div class="navbar-nav">
          <a href="index.html" id="nav-index">首页</a>
          <a href="lucky-wheel.html" id="nav-lucky-wheel">🎡 大转盘</a>
          <a href="flip-card.html" id="nav-flip-card">🎰 幸运牌</a>
          <a href="dart-wheel.html" id="nav-dart-wheel">🎯 射击轮盘</a>
          <a href="golden-egg.html" id="nav-golden-egg">🥚 砸金蛋</a>
          <a href="red-envelope.html" id="nav-red-envelope">🧧 抢红包</a>
          <a href="dice-arena.html" id="nav-dice-arena">🎲 摇骰子</a>
        </div>
        <div class="wallet-container">
          <div class="wallet-item">🪙 <span id="global-coins">1000</span></div>
          <button class="btn-reset" id="reset-wallet-btn" title="充值/重置金币">🔄</button>
        </div>
    `;

    // 2. 将导航栏插入到 body 的最顶部
    document.body.insertBefore(navbar, document.body.firstChild);

    // 3. 自动高亮当前激活的菜单
    const currentPath = window.location.pathname.split("/").pop();
    if (currentPath === "index.html" || currentPath === "") {
        document.getElementById("nav-index")?.classList.add("active");
    } else {
        // 根据文件名自动匹配 id 高亮
        const pageName = currentPath.replace(".html", "");
        document.getElementById(`nav-${pageName}`)?.classList.add("active");
    }

    // 4. 绑定金币同步逻辑
    const STORAGE_KEY = 'game_hub_user_coins';
    const DEFAULT_COINS = 1000;

    function updateWalletDisplay() {
      let coins = localStorage.getItem(STORAGE_KEY);
      if (coins === null) {
        coins = DEFAULT_COINS;
        localStorage.setItem(STORAGE_KEY, coins);
      }
      const coinSpan = document.getElementById('global-coins');
      if (coinSpan) coinSpan.textContent = coins;
    }

    updateWalletDisplay();
    window.addEventListener('pageshow', updateWalletDisplay);

    document.getElementById('reset-wallet-btn')?.addEventListener('click', () => {
      if (confirm('是否要将账户资产重置为 1000 金币？')) {
        localStorage.setItem(STORAGE_KEY, DEFAULT_COINS);
        updateWalletDisplay();
        // 如果游戏页面有自己的更新余额函数，顺便触发它
        if (typeof initWallet === 'function') initWallet(); 
      }
    });
});
