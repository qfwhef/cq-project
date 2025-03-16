
// 中间件：处理路由和权限验证

// 设置预期的 key 值：只有在 URL 的第一个 path segment 等于这个值时，才允许访问
const Key = "2421chouqian"; 

// 初始数据：包含四个组的名单和已抽取的人员空名单
const initialData = {
  group1: [
    '王田川', '罗梦然', '李伟恒', '王康磊', '高创',
    '刘晓阳', '韩锦鹏', '王浩', '潘豪', '闵宏皓'
  ],
  group2: [
    '孟想', '焦中伟', '王崔丽', '牛蒙蒙', '尹昊彬',
    '关世政', '曹锟', '赵辉', '王浩', '董梦丽',
    '麻婉君', '张靖喆'
  ],
  group3: [
    '王博涵', '胡鑫龙', '李梦奥', '郑一博', '赵雨洁',
    '张会敏', '孟奥琦', '任思奇', '邢勇', '朱龙威',
    '焦军星', '李增轩'
  ],
  group4: [
    '崔梦涵', '徐诺诺', '肖月', '郭晓玉', '赵佳慧',
    '刘雨乐', '王双双', '丁嘉怡', '朱盼盼', '汪鑫鑫',
    '管尚荣'
  ],
  drawnNames: []  // 已抽取的人员名单
};

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  // 将路径按照 "/" 分割，并过滤掉空字符（例如 ""）
  const parts = url.pathname.split("/").filter(part => part);

  // 校验第一个 path segment 是否与预期 key 匹配
  if (parts.length === 0 || parts[0] !== Key) {
    return new Response("不用怀疑，你的key就是错的！", {
      status: 403,
      headers: { "Content-Type": "text/plain;charset=UTF-8" }
    });
  }

  // 第一个 path segment 为 key 后，后面的部分视作应用的路由（例如 reset、draw 等）
  // 如果只输入 key 则 parts[1] 为 undefined，即作为首页页面
  const route = parts[1] || "";

  // 获取 KV 中的抽签状态数据
  let drawData = await getDrawData(context.env);

  if (request.method === 'GET') {
    if (route === "reset") {
      // 重置抽签状态
      drawData.drawnNames = [];
      await saveDrawData(context.env, drawData);
      return new Response(renderPage(drawData), {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    } else if (route === "draw") {
      // 执行抽签操作
      const result = drawName(drawData);
      await saveDrawData(context.env, drawData);
      return new Response(renderResultPage(result), {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    } else {
      // 默认返回主页
      return new Response(renderPage(drawData), {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }
  } else {
    return new Response('方法不被允许', { status: 405 });
  }
}

// 从 KV 命名空间中获取抽签状态数据
async function getDrawData(env) {
  try {
    const data = await env.DRAW_DATA.get('drawData');
    if (data) {
      return JSON.parse(data);
    } else {
      return initialData;
    }
  } catch (error) {
    console.error("获取数据出错:", error);
    return initialData;
  }
}

// 将抽签状态数据保存到 KV 命名空间中
async function saveDrawData(env, data) {
  await env.DRAW_DATA.put('drawData', JSON.stringify(data));
}

// 渲染主页页面，展示所有组别和人员名单
function renderPage(drawData) {
  const groupHtml = renderGroups(drawData);
  return `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>抽签</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f0f8ff; padding: 20px; }
    h1 { text-align: center; color: #333; }
    .groups { display: flex; flex-wrap: wrap; justify-content: center; }
    .group { margin: 10px; padding: 10px; background-color: #fff; border-radius: 8px; width: 220px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .group h2 { text-align: center; color: #555; }
    .name { list-style: none; padding: 0; }
    .name li { padding: 5px 0; }
    .drawn { color: red; text-decoration: none; }
    .buttons { text-align: center; margin-top: 20px; }
    .buttons button { border:2px solid black; border-radius: 4px;  padding: 10px 20px; font-size: 16px; margin: 0 10px; cursor: pointer; }
    .reset-btn {background-color: red; color: white; border:2px solid black; border-radius: 4px; padding: 10px 20px; font-size: 16px; margin: 0 10px; cursor: pointer;}
</style>

</head>
<body>
  <h1>抽签</h1>
  <div class="groups">
    ${groupHtml}
  </div>
  <div class="buttons">
    <a href="/${Key}/draw"><button>开始抽签</button></a>
    <a href="/${Key}/reset"><button class="reset-btn">重置抽取情况</button></a>
  </div>
</body>
</html>
  `;
}

// 辅助函数：根据名字判断其在哪一组
function getGroupByName(name) {
  if (initialData.group1.includes(name)) {
    return 1;
  } else if (initialData.group2.includes(name)) {
    return 2;
  } else if (initialData.group3.includes(name)) {
    return 3;
  } else if (initialData.group4.includes(name)) {
    return 4;
  }
  return '未知';
}

// 渲染所有组及其名单列表
function renderGroups(drawData) {
  let html = '';
  for (let i = 1; i <= 4; i++) {
    const groupName = `group${i}`;
    const names = drawData[groupName];
    html += `
      <div class="group">
        <h2>第${i}组</h2>
        <ul class="name">
          ${names.map(name => {
            const isDrawn = drawData.drawnNames.includes(name);
            return `<li class="${isDrawn ? 'drawn' : ''}">${name}${isDrawn ? '（已抽取）' : ''}</li>`;
          }).join('')}
        </ul>
      </div>
    `;
  }
  return html;
}

// 抽取一个未抽取的人员名称
function drawName(drawData) {
  const allNames = Object.values(drawData).slice(0, 4).flat();
  const undrawnNames = allNames.filter(name => !drawData.drawnNames.includes(name));
  if (undrawnNames.length === 0) {
    return null; // 所有人都已被抽取
  }
  const randomIndex = Math.floor(Math.random() * undrawnNames.length);
  const drawnName = undrawnNames[randomIndex];
  drawData.drawnNames.push(drawnName);
  return drawnName;
}

// 渲染抽签结果页面
function renderResultPage(name) {
  let message = '';
  if (name) {
    const groupNumber = getGroupByName(name);
    message = `<p>抽中的是第 <strong>${groupNumber}</strong> 组的是 <strong>${name}</strong>！</p>`;
  } else {
    message = `<p>所有人都已被抽取完毕！</p>`;
  }
  return `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>RESULT</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #fffaf0; padding: 20px; text-align: center; }
    h1 { color: #333; }
    p { font-size: 20px; }
    .buttons { margin-top: 30px; }
    .buttons button { padding: 10px 20px; font-size: 16px; cursor: pointer; margin: 0 10px; }
  </style>
</head>
<body>
  <h1>RESULT</h1>
  ${message}
  <div class="buttons">
    <a href="/${Key}"><button>返回首页</button></a>
    <a href="/${Key}/draw"><button>继续抽签</button></a>
  </div>
</body>
</html>
  `;
}
