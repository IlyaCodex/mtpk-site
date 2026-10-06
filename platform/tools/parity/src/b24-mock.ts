/**
 * Имитация входящего вебхука Битрикс24 для проверки сервиса заявок без CRM.
 * Запуск: npx tsx tools/parity/src/b24-mock.ts (порт 4199), в .env:
 *   B24_WEBHOOK=http://127.0.0.1:4199/rest/1/test/
 * Каждый вызов печатается разобранным (как его увидит PHP $_POST).
 */
import http from 'node:http';

let nextId = 1000;
http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const method = req.url?.split('/').pop()?.replace(/\.json$/, '');
      const params = Object.fromEntries(new URLSearchParams(body));
      console.log(JSON.stringify({ method, params }, null, 1));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result: method === 'crm.lead.add' ? ++nextId : 555 }));
    });
  })
  .listen(4199, '127.0.0.1', () => console.log('b24-mock: http://127.0.0.1:4199/rest/1/test/'));
