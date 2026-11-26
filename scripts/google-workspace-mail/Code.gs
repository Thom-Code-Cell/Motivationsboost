const sender = 'motivationsboost@th-analytica.com';
const testRecipient = /^thhullin(?:\+mb-[a-z0-9-]{1,32})?@gmail\.com$/i;
const messageKeyPrefix = 'mail:';
const retentionMs = 48 * 60 * 60 * 1000;

function result(status) {
  return ContentService.createTextOutput(JSON.stringify({ status })).setMimeType(ContentService.MimeType.JSON);
}

function signatureFor(timestamp, payload, key) {
  return Utilities.computeHmacSha256Signature(timestamp + '.' + payload, key)
    .map(byte => ((byte + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function matchesSignature(expected, supplied) {
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return difference === 0;
}

function decodeMessage(event, key, now) {
  const content = event && event.postData && event.postData.contents;
  if (!content || content.length > 26000 || !key || !/^[a-f0-9]{64}$/i.test(key)) return null;
  const envelope = JSON.parse(content);
  if (!envelope || !Number.isSafeInteger(envelope.timestamp) || Math.abs(now - envelope.timestamp) > 120000 ||
      typeof envelope.payload !== 'string' || !/^[A-Za-z0-9_-]+$/.test(envelope.payload) ||
      typeof envelope.signature !== 'string' || !/^[a-f0-9]{64}$/.test(envelope.signature) ||
      !matchesSignature(signatureFor(envelope.timestamp, envelope.payload, key), envelope.signature)) return null;
  const bytes = Utilities.base64DecodeWebSafe(envelope.payload.padEnd(Math.ceil(envelope.payload.length / 4) * 4, '='));
  const message = JSON.parse(Utilities.newBlob(bytes).getDataAsString('UTF-8'));
  if (!message || !/^[a-f0-9]{64}$/.test(message.id || '') ||
      typeof message.to !== 'string' || message.to.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(message.to) ||
      typeof message.subject !== 'string' || !message.subject || message.subject.length > 180 || /[\r\n]/.test(message.subject) ||
      typeof message.text !== 'string' || !message.text || message.text.length > 14000) return null;
  return message;
}

function mimeFor(message) {
  const encode = value => '=?UTF-8?B?' + Utilities.base64Encode(value, Utilities.Charset.UTF_8) + '?=';
  const words = [];
  let chunk = '';
  for (const character of message.subject) {
    if (Utilities.newBlob(chunk + character).getBytes().length > 42) {
      words.push(encode(chunk));
      chunk = '';
    }
    chunk += character;
  }
  words.push(encode(chunk));
  const subject = words.join('\r\n ');
  const body = Utilities.base64Encode(message.text, Utilities.Charset.UTF_8).match(/.{1,76}/g).join('\r\n');
  const mime = [
    'From: Motivationsboost <' + sender + '>', 'Reply-To: ' + sender, 'To: ' + message.to, 'Subject: ' + subject,
    'Message-ID: <' + message.id + '@th-analytica.com>', 'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', body,
  ].join('\r\n');
  return Utilities.base64EncodeWebSafe(mime, Utilities.Charset.UTF_8);
}

function doPost(event) {
  const properties = PropertiesService.getScriptProperties();
  const now = Date.now();
  let message;
  try {
    message = decodeMessage(event, properties.getProperty('MAIL_RELAY_SECRET'), now);
  } catch {
    return result('denied');
  }
  if (!message) return result('denied');
  const mode = properties.getProperty('MAIL_RELAY_MODE');
  if (mode !== 'production' && (mode !== 'preview' || !testRecipient.test(message.to))) return result('denied');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(4000)) return result('unavailable');
  try {
    const key = messageKeyPrefix + message.id;
    const previous = properties.getProperty(key);
    if (previous && now - Number(previous.split(':')[1]) < retentionMs) {
      return result(previous.startsWith('sent:') ? 'duplicate' : 'uncertain');
    }
    const day = Utilities.formatDate(new Date(now), 'Europe/Zurich', 'yyyy-MM-dd');
    if (properties.getProperty('mailDay') !== day) {
      const saved = properties.getProperties();
      for (const name in saved) {
        if (name.startsWith(messageKeyPrefix) && now - Number(saved[name].split(':')[1]) >= retentionMs) {
          properties.deleteProperty(name);
        }
      }
      properties.setProperties({ mailDay: day, mailCount: '0' });
    }
    const count = Number(properties.getProperty('mailCount') || '0');
    if (!Number.isSafeInteger(count) || count >= (mode === 'preview' ? 30 : 250)) return result('limited');
    properties.setProperty('mailCount', String(count + 1));
    properties.setProperty(key, 'pending:' + now);
    Gmail.Users.Messages.send({ raw: mimeFor(message) }, 'me');
    properties.setProperty(key, 'sent:' + now);
    return result('sent');
  } catch {
    return result('uncertain');
  } finally {
    lock.releaseLock();
  }
}
