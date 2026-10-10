/* 学习记录备份协议。只处理数据，不访问浏览器存储，不覆盖已有记录。 */
(function (root) {
  'use strict';
  const questions = typeof module !== 'undefined' ? require('./data/questions.js') : root.GardenQuestions;
  const knownQuestions = new Map(questions.topics.flatMap(topic =>
    questions.bank(topic.id).map(question => [question.id, topic.id])));
  const FORMAT = 'learning-garden-backup';
  const VERSION = 1;
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const MAX_RECORDS = 50000;
  const fail = message => { throw new Error(message); };
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const text = value => typeof value === 'string' && value.length > 0 && value.length <= 160;
  const integer = value => Number.isSafeInteger(value) && value >= 0;
  const attemptKey = attempt => JSON.stringify([attempt.session, attempt.question]);

  function wrongFromAttempts(attempts) {
    const wrong = new Set();
    for (const attempt of attempts) {
      if (!attempt.correct) wrong.add(attempt.question);
      else if (attempt.review) wrong.delete(attempt.question);
    }
    return [...wrong];
  }

  function validateState(value) {
    if (!object(value) || !['attempts', 'sessions', 'wrong'].every(name =>
      Array.isArray(value[name]) && value[name].length <= MAX_RECORDS)) {
      fail('学习记录结构不正确或记录过多。');
    }
    const seenAttempts = new Set();
    const groups = new Map();
    const attempts = value.attempts.map(a => {
      if (!object(a) || !text(a.session) || !text(a.topic) || !text(a.question) ||
          typeof a.correct !== 'boolean' || typeof a.review !== 'boolean' || !integer(a.time)) {
        fail('作答记录不完整或类型不正确。');
      }
      if (knownQuestions.get(a.question) !== a.topic) {
        fail('备份中的题目与当前题库版本不匹配，请使用支持该题库的版本恢复。');
      }
      const clean = {session:a.session, topic:a.topic, question:a.question, correct:a.correct, review:a.review, time:a.time};
      const id = attemptKey(clean);
      if (seenAttempts.has(id)) fail('备份中存在重复作答记录。');
      seenAttempts.add(id);
      if (!groups.has(clean.session)) groups.set(clean.session, []);
      groups.get(clean.session).push(clean);
      return clean;
    });
    for (const group of groups.values()) {
      if (group.length > 10 || group.some(a => a.review !== group[0].review) ||
          (!group[0].review && group.some(a => a.topic !== group[0].topic))) {
        fail('同一次练习的作答记录不一致。');
      }
    }
    const seenSessions = new Set();
    const sessions = value.sessions.map(s => {
      if (!object(s) || !text(s.id) || !integer(s.time) || !integer(s.total) ||
          s.total < 1 || s.total > 10 || !integer(s.correct) || s.correct > s.total ||
          typeof s.review !== 'boolean') fail('完整练习记录不正确。');
      if (!s.review && s.total !== 5 && s.total !== 10) fail('基础练习题数不正确。');
      if (seenSessions.has(s.id)) fail('备份中存在重复的完整练习。');
      seenSessions.add(s.id);
      const group = groups.get(s.id) || [];
      if (group.length !== s.total || group.filter(a => a.correct).length !== s.correct ||
          group.some(a => a.review !== s.review)) fail('练习总结与作答记录不一致。');
      return {id:s.id, time:s.time, total:s.total, correct:s.correct, review:s.review};
    });
    const wrong = value.wrong;
    if (wrong.some(id => !text(id) || !knownQuestions.has(id)) || new Set(wrong).size !== wrong.length) {
      fail('错题记录不正确或与当前题库不匹配。');
    }
    const derived = wrongFromAttempts(attempts);
    if (derived.length !== wrong.length || derived.some(id => !wrong.includes(id))) {
      fail('错题与作答记录不一致，备份可能已损坏。');
    }
    return {attempts, sessions, wrong:[...wrong]};
  }

  function createBackup(data) {
    return {format:FORMAT, version:VERSION, exportedAt:new Date().toISOString(), data:validateState(data)};
  }

  function parseBackup(source) {
    let value;
    try { value = JSON.parse(source); }
    catch { fail('文件不是有效的 JSON 备份，请选择“学习小乐园”导出的备份文件。'); }
    if (!object(value) || value.format !== FORMAT) fail('这不是“学习小乐园”的备份文件。');
    if (value.version !== VERSION) fail('暂不支持此备份版本，请使用导出该备份的版本恢复。');
    if (typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))) {
      fail('备份导出日期不正确。');
    }
    return validateState(value.data);
  }

  function merge(current, incoming) {
    const before = validateState(current);
    const imported = validateState(incoming);
    const attempts = new Map(before.attempts.map(a => [attemptKey(a), a]));
    const sessions = new Map(before.sessions.map(s => [s.id, s]));
    const add = (map, id, record) => {
      if (map.has(id) && JSON.stringify(map.get(id)) !== JSON.stringify(record)) {
        fail('备份与现有记录有冲突，未导入。请保留两份备份，避免覆盖。');
      }
      map.set(id, record);
    };
    for (const a of imported.attempts) add(attempts, attemptKey(a), a);
    for (const s of imported.sessions) add(sessions, s.id, s);
    // 合并全部首次作答事件。同一毫秒的复习答对最后处理，避免旧错题重新出现。
    const ordered = [...attempts.values()].sort((a,b) => a.time-b.time ||
      Number(a.review && a.correct)-Number(b.review && b.correct));
    const data = validateState({attempts:ordered, sessions:[...sessions.values()].sort((a,b)=>a.time-b.time), wrong:wrongFromAttempts(ordered)});
    return {data, addedAttempts:attempts.size-before.attempts.length, addedSessions:sessions.size-before.sessions.length};
  }

  const api = {FORMAT, VERSION, MAX_FILE_BYTES, createBackup, parseBackup, merge};
  root.GardenBackup = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
