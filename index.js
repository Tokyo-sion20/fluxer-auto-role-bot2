const axios = require('axios');
const WebSocket = require('ws');

// ご提示いただいた設定情報
const CONFIG = {
    botName: "BUT-BOT",
    appId: "1565722077435015169",
    clientSecret: "bZGZjjgwhklqU5vP9kaMTQo3VpHNZeRMT_bZHz7ndiU",
    token: "1565722077435015169.UsiqIHjtCjE0cCTCXfWUn-65BQ225yQ6gaov3rBHIhc",
    // 💡 運用に合わせて書き換えてください
    targetRoleId: "1565699730271383552", 
    targetServerId: "1565697362616127490"
};

// 指定したユーザーにロールを付与する関数
async function assignRole(serverId, userId) {
    const url = `https://api.fluxer.app/v1/guilds/${serverId}/members/${userId}/roles/${CONFIG.targetRoleId}`;
    
    try {
        const response = await axios.put(url, {}, {
            headers: {
                "Authorization": `Bot ${CONFIG.token}`,
                "Content-Type": "application/json"
            }
        });
        
        if (response.status === 200 || response.status === 204) {
            console.log(`[成功] ユーザー (${userId}) にロールを付与しました。`);
        }
    } catch (error) {
        console.error(`[失敗] ロール付与エラー:`, error.response?.data || error.message);
    }
}

// 接続先のGateway URLを取得してボットを起動するメイン処理
async function startBot() {
    try {
        console.log(`${CONFIG.botName} を起動しています...`);
        
        const discovery = await axios.get('https://fluxer.app/.well-known/fluxer').catch(() => null);
        const gatewayUrl = discovery?.data?.endpoints?.gateway || 'wss://gateway.fluxer.app';

        const ws = new WebSocket(gatewayUrl);

        ws.on('open', () => {
            console.log('Gatewayに接続中...');
            ws.send(JSON.stringify({
                op: 2, // Identify
                d: {
                    token: CONFIG.token,
                    properties: { os: "node", browser: "fluxer-bot", device: "fluxer-bot" }
                }
            }));
        });

        ws.on('message', async (data) => {
            const packet = JSON.parse(data.toString());
            const { t: eventName, d: eventData } = packet;

            // ユーザーがサーバーに参加したイベントを検知
            if (eventName === 'GUILD_MEMBER_ADD') {
                if (eventData.guild_id === CONFIG.targetServerId) {
                    console.log(`新しいメンバーが参加しました: ${eventData.user.username}`);
                    await assignRole(eventData.guild_id, eventData.user.id);
                }
            }
        });

        ws.on('close', (code, reason) => {
            console.log(`接続が切断されました (Code: ${code}). 5秒後に再接続します...`);
            setTimeout(startBot, 5000);
        });

    } catch (e) {
        console.error("起動エラー:", e.message);
        setTimeout(startBot, 10000);
    }
}

startBot();
