let timer = null;

/**
 * 初始化 LED 滚动战报公共积木
 */
export function initLedBoard(apiUrl, activityId) {
  const ledStatus = document.getElementById('ledStatus');
  const ledPrize = document.getElementById('ledPrize');

  async function fetchLogs() {
    try {
      const res = await fetch(`${apiUrl}/api/get-logs?activityId=${activityId}`);
      const logs = await res.json();
      
      if (logs && logs.length > 0) {
        // 取最新的一条展示
        ledStatus.innerText = `🎉 恭喜 ${logs[0].user_name}`;
        ledPrize.innerText = logs[0].prize_name;
      } else {
        ledStatus.innerText = "🔥 现场火热";
        ledPrize.innerText = "大奖等你来拿！";
      }
    } catch (e) {
      console.error("加载实时战报失败:", e);
    }
  }

  // 首次加载
  fetchLogs();
  // 每隔 8 秒自动向 Cloudflare 刷新一次最新的幸运儿战报
  timer = setInterval(fetchLogs, 8000);
}

/**
 * 玩家自己中奖时，无需等轮询，直接本地插塞更新显示，提升即时爽感
 */
export function updateLed(prizeName) {
  const ledStatus = document.getElementById('ledStatus');
  const ledPrize = document.getElementById('ledPrize');
  ledStatus.innerText = "✨ 恭喜你刚刚斩获";
  ledPrize.innerText = prizeName;
}
