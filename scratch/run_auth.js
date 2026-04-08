import { spawn } from 'child_process';
import path from 'path';

const serverPath = "c:/Users/SergeyRaihshtat/Desktop/sergey/BeautyOS AI v2/.loki/tools/notebooklm-mcp/dist/index.js";

console.log("🚀 Запуск процесса авторизации NotebookLM...");
console.log("⚠️  Внимание: Сейчас откроется окно браузера Chrome. Пожалуйста, войдите в свой Google-аккаунт.");

const server = spawn('node', [serverPath], { 
  stdio: ['pipe', 'pipe', 'inherit'],
  env: { ...process.env, HEADLESS: 'false' } // Убеждаемся, что браузер НЕ в фоновом режиме
});

const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "setup_auth",
    arguments: {}
  }
};

// Отправляем запрос на вызов инструмента setup_auth
server.stdin.write(JSON.stringify(request) + '\n');

server.stdout.on('data', (data) => {
  const response = data.toString();
  try {
    const json = JSON.parse(response);
    if (json.id === 1) {
        console.log("✅ Команда авторизации отправлена успешно.");
        console.log("Ожидание завершения входа в браузере...");
    }
    if (json.method === "notifications/progress") {
        console.log(`📊 Статус: ${json.params.message}`);
    }
  } catch (e) {
    // Не JSON вывод (например, баннер сервера)
    if (response.includes("✅")) {
        console.log(response.trim());
    }
  }
});

// Завершаем скрипт через 5 минут или по сигналу, так как браузер может быть открыт долго
setTimeout(() => {
  console.log("⏰ Время ожидания истекло. Если вы еще не вошли, попробуйте снова.");
  server.kill();
  process.exit(0);
}, 300000);
