require('dotenv').config();
const { messagingApi, validateSignature } = require('@line/bot-sdk');

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

class LineClient {
  constructor() {
    this.client = new messagingApi.MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    });
    this.channelSecret = process.env.LINE_CHANNEL_SECRET;
    this.userId = process.env.LINE_USER_ID;
  }

  async replyMessage(replyToken, text) {
    return this.client.replyMessage({
      replyToken,
      messages: [{ type: 'text', text }],
    });
  }

  async replyMessages(replyToken, texts) {
    const messages = texts.slice(0, 5).map(text => ({ type: 'text', text }));
    return this.client.replyMessage({ replyToken, messages });
  }

  async pushMessage(text) {
    return this.client.pushMessage({
      to: this.userId,
      messages: [{ type: 'text', text }],
    });
  }

  async pushMessages(texts) {
    const chunks = [];
    for (let i = 0; i < texts.length; i += 5) {
      chunks.push(texts.slice(i, i + 5));
    }
    for (const chunk of chunks) {
      const messages = chunk.map(text => ({ type: 'text', text }));
      await this.client.pushMessage({ to: this.userId, messages });
    }
  }

  verifySignature(body, signature) {
    return validateSignature(body, this.channelSecret, signature);
  }
}

function formatCalendarEvents(events, dateLabel = '', rangeDays = 1) {
  // 複数日の場合は日付ごとにグループ化して表示
  if (rangeDays > 1) {
    if (!events || events.length === 0) {
      return `📅 ${dateLabel}\n予定はありません`;
    }
    // 日付ごとにグループ化
    const groups = {};
    for (const e of events) {
      const dateKey = (e.start || '').slice(0, 10);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    }
    const lines = [`📅 ${dateLabel}（${events.length}件）`, '━━━━━━━━━━'];
    for (const dateKey of Object.keys(groups).sort()) {
      lines.push(_dateLabel(dateKey));
      for (const e of groups[dateKey]) {
        const s = e.start ? _formatTime(e.start) : '';
        const en = e.end ? _formatTime(e.end) : '';
        const timeStr = s && en ? `  ${s}〜${en} ` : '  ';
        lines.push(`${timeStr}${e.title}`);
      }
    }
    return lines.join('\n');
  }

  // 1日分の通常表示
  if (!events || events.length === 0) {
    return `📅 ${dateLabel}\n予定はありません`;
  }
  const lines = [`📅 ${dateLabel}の予定（${events.length}件）`, '━━━━━━━━━━'];
  for (const e of events) {
    const start = e.start ? _formatTime(e.start) : '';
    const end = e.end ? _formatTime(e.end) : '';
    const timeStr = start && end ? `${start}〜${end} ` : '';
    lines.push(`${timeStr}${e.title}`);
  }
  return lines.join('\n');
}

function _formatTime(isoStr) {
  if (!isoStr || isoStr.length <= 10) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false });
}

function _dateLabel(isoStr) {
  const d = new Date(isoStr + 'T00:00:00+09:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const wd = WEEKDAY_JA[d.getDay()];
  return `${month}月${day}日（${wd}）`;
}

function formatGmailList(emails) {
  if (!emails || emails.length === 0) return '📧 未読メールはありません';

  const lines = [`📧 未読メール（${emails.length}件）`, '━━━━━━━━━━'];
  const nums = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
  emails.forEach((e, i) => {
    const sender = e.from.replace(/<.*>/, '').trim().replace(/"/g, '') || e.from;
    const dateStr = e.date ? _shortDate(e.date) : '';
    lines.push(`${nums[i] || `${i + 1}.`} ${sender}「${e.subject}」（${dateStr}）`);
  });
  return lines.join('\n');
}

function _shortDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric' }).replace('/', '/');
  } catch {
    return '';
  }
}

module.exports = { LineClient, formatCalendarEvents, formatGmailList };
