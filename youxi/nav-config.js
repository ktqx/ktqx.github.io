// ⚙️ 动态全局菜单配置：以后有任何增删改，只需修改这里，所有网页同步生效！
const GAMES_CONFIG = [
  { name: "🎮 游戏中心", url: "index.html" },
  { name: "🎡 大转盘", url: "lucky-wheel.html" },
  { name: "🎯 射击轮盘", url: "dart-wheel.html" },
  { name: "🥚 砸金蛋", url: "golden-egg.html" },
  { name: "🧧 抢红包", url: "red-envelope.html" }
];

// 自动初始化、智能渲染和高亮导航栏
function initGlobalNavbar() {
  const navContainer = document.getElementById('navbarNav');
  if (!navContainer) return; // 如果页面上没有渲染容器，则不执行

  // 获取当前网页的文件名（例如 golden-egg.html）
  const currentFile = window.location.pathname.split('/').pop() || "index.html";
  const urlParams = window.location.search; // 保留当前 URL 的商户 ID（如 ?m=starbucks）

  let navHtml = "";
  GAMES_CONFIG.forEach(game => {
    // 智能判断当前页面是不是数组里的 url，是的话就高亮激活
    const isActive = currentFile === game.url ? "class='active'" : "";
    // 自动把当前的商户ID拼接到其他游戏链接后面，实现无缝带参跳转
    navHtml += `<a href="${game.url}${urlParams}" ${isActive}>${game.name}</a>`;
  });
  navContainer.innerHTML = navHtml;

  // 顺便把手机端的汉堡按钮事件也一起统一绑定了，省心！
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  if (mobileMenuBtn) {
    mobileMenuBtn.onclick = () => {
      mobileMenuBtn.classList.toggle('open');
      navContainer.classList.toggle('mobile-open');
    };
  }
}

// 当网页加载完毕后，自动执行渲染逻辑
document.addEventListener("DOMContentLoaded", initGlobalNavbar);
