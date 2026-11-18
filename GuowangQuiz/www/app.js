(function () {
  'use strict';

  var BANK = window.QUESTION_BANK || [];
  var byId = {};
  BANK.forEach(function (q) { byId[q.id] = q; });

  var TYPES = ['single', 'multi', 'judge'];
  var TYPE_NAME = { single: '单选', multi: '多选', judge: '判断' };
  var PARTS = ['形势政策', '企业文化', '公司战略', '新型电力系统', '品牌建设'];
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------------- 存储 ---------------- */
  var K = { settings: 'gw_settings_v1', wrong: 'gw_wrong_v1', stats: 'gw_stats_v1', filter: 'gw_filter_v1' };

  function load(key, def) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : def;
    } catch (e) { return def; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  var settings = Object.assign({ shuffle: true, instant: true, autoRemove: true }, load(K.settings, {}));

  function newStats() {
    return {
      answered: 0, correct: 0, sessions: 0,
      single: { ok: 0, bad: 0 },
      multi: { full: 0, short: 0, wrong: 0 },
      judge: { ok: 0, bad: 0 }
    };
  }
  var stats = load(K.stats, null) || newStats();
  if (!stats.single) stats = newStats();
  var wrongBook = load(K.wrong, {}) || {};

  /* ---------------- 工具 ---------------- */
  function shuffleArr(a) {
    var arr = a.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1900);
  }

  function askConfirm(msg, cb) {
    var layer = document.createElement('div');
    layer.className = 'dialog-layer';
    layer.innerHTML = '<div class="dialog"><p>' + msg + '</p>' +
      '<div class="row-2"><button class="ghost" data-act="no">取消</button>' +
      '<button class="primary" data-act="yes">确定</button></div></div>';
    document.body.appendChild(layer);
    layer.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) { if (e.target === layer) close(); return; }
      var yes = b.dataset.act === 'yes';
      close();
      if (yes && cb) cb();
    });
    function close() { if (layer.parentNode) layer.parentNode.removeChild(layer); }
  }

  function wrongCount() { return Object.keys(wrongBook).length; }

  /* ---------------- 首页组卷 ---------------- */
  var filter = Object.assign(
    { types: ['single', 'multi', 'judge'], count: 20, parts: ['__all__'] },
    load(K.filter, {})
  );
  if (!filter.types || !filter.types.length) filter.types = ['single', 'multi', 'judge'];

  function renderTypeChips() {
    $('#typeChips').innerHTML = TYPES.map(function (t) {
      var n = BANK.filter(function (q) { return q.type === t; }).length;
      return '<button class="chip ' + (filter.types.indexOf(t) >= 0 ? 'active' : '') + '" data-type="' + t + '">' +
        TYPE_NAME[t] + '<small>' + n + '</small></button>';
    }).join('');
  }

  var COUNT_OPTIONS = [10, 20, 30, 50, 100, 'all'];
  function renderCountChips() {
    $('#countChips').innerHTML = COUNT_OPTIONS.map(function (c) {
      var label = c === 'all' ? '全部' : c + ' 题';
      return '<button class="chip ' + (filter.count === c ? 'active' : '') + '" data-count="' + c + '">' + label + '</button>';
    }).join('');
  }

  function syncCountInput() {
    var el = $('#countCustom');
    if (!el) return;
    el.value = filter.count === 'all' ? '' : String(filter.count);
    el.max = String(BANK.length);
    el.placeholder = '1～' + BANK.length;
  }

  function applyCustomCount(raw) {
    var v = String(raw).trim();
    if (v === '') return false;
    var n = Math.floor(Number(v));
    if (!isFinite(n) || n < 1) return false;
    n = Math.min(n, BANK.length);
    filter.count = n;
    renderCountChips();
    renderPool();
    return true;
  }

  function renderPartChips() {
    var html = '<button class="chip ' + (filter.parts.indexOf('__all__') >= 0 ? 'active' : '') + '" data-part="__all__">全部章节</button>';
    html += PARTS.map(function (p) {
      return '<button class="chip ' + (filter.parts.indexOf(p) >= 0 ? 'active' : '') + '" data-part="' + p + '">' + p + '</button>';
    }).join('');
    $('#partChips').innerHTML = html;
  }

  function currentPool() {
    var allParts = filter.parts.indexOf('__all__') >= 0;
    return BANK.filter(function (q) {
      if (filter.types.indexOf(q.type) < 0) return false;
      if (!allParts && filter.parts.indexOf(q.part) < 0) return false;
      return true;
    });
  }

  function renderPool() {
    var pool = currentPool();
    $('#poolCount').textContent = pool.length;
    $('#btnStart').disabled = pool.length === 0;
    save(K.filter, { types: filter.types, count: filter.count, parts: filter.parts });
  }

  function toggleType(t) {
    var i = filter.types.indexOf(t);
    if (i >= 0) {
      if (filter.types.length === 1) { toast('至少保留一种题型'); return; }
      filter.types.splice(i, 1);
    } else filter.types.push(t);
    renderTypeChips(); renderPool();
  }

  function togglePart(p) {
    if (p === '__all__') {
      filter.parts = ['__all__'];
    } else {
      var idx = filter.parts.indexOf('__all__');
      if (idx >= 0) filter.parts.splice(idx, 1);
      var i = filter.parts.indexOf(p);
      if (i >= 0) filter.parts.splice(i, 1);
      else filter.parts.push(p);
      if (!filter.parts.length) filter.parts = ['__all__'];
    }
    renderPartChips(); renderPool();
  }

  /* ---------------- 答题会话 ---------------- */
  var session = null;
  var autoTimer = null;
  var AUTO_MS = 400;   // 答对后自动翻页延时

  function clearAuto() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  }

  function startSession(ids, opts) {
    opts = opts || {};
    if (!ids.length) { toast('没有可用的题目'); return; }
    clearAuto();

    session = {
      ids: ids.slice(),
      idx: 0,
      instant: opts.instant === undefined ? settings.instant : !!opts.instant,
      shuffle: opts.shuffle === undefined ? settings.shuffle : !!opts.shuffle,
      recite: !!opts.recite,
      order: {},
      sel: {},
      res: {},
      recorded: {},
      startedAt: Date.now(),
      label: opts.label || ''
    };

    session.ids.forEach(function (id) {
      var q = byId[id];
      var keys = q.options.map(function (o) { return o.key; });
      session.order[id] = session.shuffle ? shuffleArr(keys) : keys;
    });

    $('#quiz').classList.remove('hidden');
    renderQuiz();
  }

  function evalAnswer(q, chosen) {
    if (!chosen.length) return 'empty';
    var ans = q.answer;
    var missing = ans.filter(function (k) { return chosen.indexOf(k) < 0; });
    var extra = chosen.filter(function (k) { return ans.indexOf(k) < 0; });
    if (!missing.length && !extra.length) return 'correct';
    if (q.type === 'multi') return extra.length ? 'wrong' : 'short';
    return 'incorrect';
  }

  function record(q, status) {
    stats.answered++;
    if (status === 'correct') stats.correct++;

    if (q.type === 'single') { status === 'correct' ? stats.single.ok++ : stats.single.bad++; }
    else if (q.type === 'judge') { status === 'correct' ? stats.judge.ok++ : stats.judge.bad++; }
    else {
      if (status === 'correct') stats.multi.full++;
      else if (status === 'short') stats.multi.short++;
      else stats.multi.wrong++;
    }

    if (status === 'correct') {
      if (settings.autoRemove && wrongBook[q.id]) delete wrongBook[q.id];
      else if (wrongBook[q.id]) wrongBook[q.id].last = 'correct';
    } else {
      var w = wrongBook[q.id] || { n: 0, t: 0 };
      wrongBook[q.id] = { n: w.n + 1, t: Date.now(), last: status };
    }

    save(K.stats, stats);
    save(K.wrong, wrongBook);
    updateBadge();
  }

  /* 只练「错选 / 漏选」的多选题：错题本里题型为多选、且最近一次判定不是全对的题 */
  function badMultiIds() {
    return Object.keys(wrongBook).map(Number).filter(function (id) {
      var q = byId[id];
      if (!q || q.type !== 'multi') return false;
      var last = wrongBook[id] && wrongBook[id].last;
      return last !== 'correct';
    });
  }

  /* 题库维度：答案为「错误」的判断题 */
  function judgeFalseIds() {
    return BANK.filter(function (q) {
      if (q.type !== 'judge') return false;
      var txt = q.options.filter(function (o) { return q.answer.indexOf(o.key) >= 0; })
        .map(function (o) { return o.text; }).join('');
      return txt.indexOf('错误') >= 0;
    }).map(function (q) { return q.id; });
  }

  /* 题库维度：正确答案未覆盖全部选项的多选题（需要排除干扰项） */
  function multiPartialIds() {
    return BANK.filter(function (q) {
      return q.type === 'multi' && q.answer.length < q.options.length;
    }).map(function (q) { return q.id; });
  }

  function startSpecial(ids, opts) {
    if (!ids.length) { toast('没有符合条件的题目'); return; }
    var sh = shuffleArr(ids);
    var n = filter.count === 'all' ? sh.length : Math.min(Number(filter.count), sh.length);
    startSession(sh.slice(0, n), opts || {});
  }

  function updateBadge() {    $('#wrongBadge').textContent = wrongCount();
    var t = $('#wrongTotal');
    if (t) t.textContent = wrongCount() + ' 题';
    var bm = $('#badMultiCount');
    if (bm) bm.textContent = badMultiIds().length;
    var jf = $('#cntJudgeFalse');
    if (jf) jf.textContent = judgeFalseIds().length;
    var mp = $('#cntMultiPartial');
    if (mp) mp.textContent = multiPartialIds().length;
    var wt = $('#cntWrong');
    if (wt) wt.textContent = wrongCount();
    var rjf = $('#cntReciteJudgeFalse');
    if (rjf) rjf.textContent = judgeFalseIds().length;
    var rmp = $('#cntReciteMultiPartial');
    if (rmp) rmp.textContent = multiPartialIds().length;
  }

  function answerLabel(q, status) {
    if (q.type === 'multi') {
      if (status === 'correct') return '全选 · 全部选对';
      if (status === 'short') return '不全选 · 漏选';
      if (status === 'wrong') return '不全选 · 错选';
      return '未作答';
    }
    return status === 'correct' ? '回答正确' : (status === 'empty' ? '未作答' : '回答错误');
  }

  function correctText(q, keys) {
    if (q.type === 'judge') {
      var t = q.options.filter(function (o) { return q.answer.indexOf(o.key) >= 0; })
        .map(function (o) { return o.text; });
      return t.join('、');
    }
    var idxs = q.answer.map(function (k) { return keys.indexOf(k); });
    idxs.sort(function (a, b) { return a - b; });
    return idxs.map(function (i) { return LETTERS[i]; }).join('、');
  }

  function renderQuiz() {
    var s = session;
    var q = byId[s.ids[s.idx]];
    var total = s.ids.length;
    var keepScroll = $('#quizBody').scrollTop;
    var keys = s.order[q.id];
    var sel = s.sel[s.idx] || [];
    var res = s.res[s.idx];
    var locked = s.instant && res !== undefined;

    $('#quizCounter').textContent = (s.idx + 1) + ' / ' + total;
    $('#progressFill').style.width = ((s.idx + 1) / total * 100).toFixed(1) + '%';

    var optsHtml = keys.map(function (k, i) {
      var o = q.options.filter(function (x) { return x.key === k; })[0];
      var cls = 'opt' + (q.type === 'judge' ? ' judge' : '');
      var letter = LETTERS[i];
      if (q.type === 'judge') letter = o.text === '正确' ? '✓' : '✗';

      if (s.recite) {
        if (q.answer.indexOf(k) >= 0) cls += ' correct';
      } else if (locked) {
        if (q.answer.indexOf(k) >= 0) cls += ' correct';
        else if (sel.indexOf(k) >= 0) cls += ' wrong';
      } else if (sel.indexOf(k) >= 0) {
        cls += ' selected';
      }
      return '<button class="' + cls + '" data-k="' + k + '">' +
        '<span class="letter">' + letter + '</span>' +
        '<span class="txt">' + o.text + '</span></button>';
    }).join('');

    var meta = '<div class="q-meta">' +
      '<span class="tag tag-' + q.type + '">' + TYPE_NAME[q.type] + '</span>' +
      (q.part ? '<span class="tag tag-part">' + q.part + '</span>' : '') +
      (q.type === 'multi' ? '<span class="tag tag-part">多选题 · 少选不得分</span>' : '') +
      '<span class="idx">题库 #' + q.id + '</span></div>';

    var stem = q.stem.replace(/（\s*）/g, '<span class="blank">（　）</span>');

    var feedback = '';
    if (s.recite) {
      feedback = '<div class="verdict ok"><strong>背题模式</strong>' +
        '<span>正确答案：' + correctText(q, keys) + '</span></div>';
    } else if (locked) {
      var ok = res === 'correct';
      var autoHint = (ok && s.idx < total - 1)
        ? '<i class="auto-hint" data-ms="' + AUTO_MS + '">自动下一题…</i>' : '';
      feedback = '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' +
        '<strong>' + answerLabel(q, res) + '</strong>' +
        '<span>正确答案：' + correctText(q, keys) + '</span>' + autoHint + '</div>';
    }

    $('#quizBody').innerHTML = '<div class="qcard">' + meta +
      '<div class="stem">' + stem + '</div>' +
      '<div class="options">' + optsHtml + '</div>' +
      feedback + '</div>';

    renderFoot();
    renderCardGrid();
    syncSessionSwitch();
    $('#quizBody').scrollTop = keepScroll;
  }

  function syncSessionSwitch() {
    var el = $('#swSessionShuffle');
    if (el) el.classList.toggle('on', !!(session && session.shuffle));
  }

  function renderFoot() {
    var s = session;
    var q = byId[s.ids[s.idx]];
    var total = s.ids.length;
    var isLast = s.idx === total - 1;
    var sel = s.sel[s.idx] || [];
    var res = s.res[s.idx];
    var answered = res !== undefined;

    var left = '<button class="ghost" id="btnPrev"' + (s.idx === 0 ? ' disabled' : '') + '>上一题</button>';
    var right = '';

    if (s.recite) {
      right = '<button class="primary" id="btnNext">' + (isLast ? '结束背题' : '下一题') + '</button>';
      left += '<span class="sub-hint">背题模式 · 直接给出答案</span>';
    } else if (s.instant) {
      if (q.type === 'multi' && !answered) {
        right = '<button class="primary" id="btnSubmit"' + (sel.length ? '' : ' disabled') + '>提交答案</button>';
      } else if (answered) {
        right = '<button class="primary" id="btnNext">' + (isLast ? '查看成绩' : '下一题') + '</button>';
      } else {
        right = '<button class="primary" id="btnNext">' + (isLast ? '查看成绩' : '跳过本题') + '</button>';
      }
      var hint = '';
      if (!answered && q.type === 'multi') hint = '多选题需提交后判定';
      else if (!answered) hint = '点击选项即判定';
      if (hint) left += '<span class="sub-hint">' + hint + '</span>';
    } else {
      right = '<button class="primary" id="btnNext">' + (isLast ? '提交试卷' : '下一题') + '</button>';
    }

    $('#quizFoot').innerHTML = left + right;
  }

  function selectOption(k) {
    var s = session;
    var q = byId[s.ids[s.idx]];
    if (s.recite) return;
    if (s.instant && s.res[s.idx] !== undefined) return;

    var sel = (s.sel[s.idx] || []).slice();
    if (q.type === 'multi') {
      var i = sel.indexOf(k);
      if (i >= 0) sel.splice(i, 1); else sel.push(k);
    } else {
      sel = [k];
    }
    s.sel[s.idx] = sel;

    if (!s.instant && q.type !== 'multi') {
      renderQuiz();
      return;
    }

    if (s.instant && q.type !== 'multi') {
      submitCurrent();
      return;
    }
    renderQuiz();
  }

  function submitCurrent() {
    var s = session;
    var q = byId[s.ids[s.idx]];
    var sel = s.sel[s.idx] || [];
    if (!sel.length) { toast('请先选择答案'); return; }
    if (s.res[s.idx] !== undefined) return;

    var st = evalAnswer(q, sel);
    s.res[s.idx] = st;
    if (!s.recorded[s.idx]) {
      record(q, st);
      s.recorded[s.idx] = true;
    }
    renderQuiz();

    // 单选 / 判断 / 多选（提交后全选正确）答对都自动翻页；答错则停留，等用户自己点下一题
    clearAuto();
    if (s.instant && st === 'correct' && s.idx < s.ids.length - 1) {
      var answeredIdx = s.idx;
      autoTimer = setTimeout(function () {
        autoTimer = null;
        if (session !== s || s.idx !== answeredIdx) return;
        if (s.res[answeredIdx] !== 'correct') return;
        nextQuestion();
      }, AUTO_MS);
    }
  }

  function nextQuestion() {
    var s = session;
    clearAuto();
    if (s.idx < s.ids.length - 1) {
      s.idx++;
      renderQuiz();
      $('#quizBody').scrollTop = 0;
    } else {
      finishSession();
    }
  }

  function prevQuestion() {
    clearAuto();
    if (session.idx > 0) { session.idx--; renderQuiz(); $('#quizBody').scrollTop = 0; }
  }

  function finishSession() {
    clearAuto();
    var s = session;
    if (s.recite) {
      $('#quiz').classList.add('hidden');
      closeDrawer();
      toast('背题结束，共浏览 ' + s.ids.length + ' 题');
      return;
    }
    if (!s.instant) {
      s.ids.forEach(function (id, i) {
        if (s.res[i] !== undefined) return;
        var st = evalAnswer(byId[id], s.sel[i] || []);
        s.res[i] = st;
        if (!s.recorded[i] && st !== 'empty') {
          record(byId[id], st);
          s.recorded[i] = true;
        }
      });
    }
    stats.sessions++;
    save(K.stats, stats);
    showResult();
  }

  /* ---------------- 答题卡 ---------------- */
  function renderCardGrid() {
    if (!session) return;
    var s = session;
    var html = s.ids.map(function (id, i) {
      var cls = 'cell';
      var r = s.res[i];
      if (r !== undefined) cls += (r === 'correct' ? ' right' : ' err');
      else if ((s.sel[i] || []).length) cls += ' done';
      if (i === s.idx) cls += ' cur';
      return '<button class="' + cls + '" data-jump="' + i + '">' + (i + 1) + '</button>';
    }).join('');
    $('#cardGrid').innerHTML = html;
  }

  function openDrawer() {
    clearAuto();
    renderCardGrid();
    var f = $('#btnFinish');
    if (f) f.textContent = session.recite ? '结束背题' : '交卷并查看成绩';
    $('#mask').classList.remove('hidden');
    $('#drawer').classList.add('show');
  }
  function closeDrawer() {
    $('#mask').classList.add('hidden');
    $('#drawer').classList.remove('show');
  }

  /* ---------------- 成绩 ---------------- */
  function showResult() {
    var s = session;
    var total = s.ids.length;
    var correct = 0;
    var per = { single: { ok: 0, bad: 0 }, multi: { full: 0, short: 0, wrong: 0 }, judge: { ok: 0, bad: 0 } };
    var wrongIds = [];
    var blank = 0;

    s.ids.forEach(function (id, i) {
      var q = byId[id];
      var st = s.res[i] || 'empty';
      if (st === 'empty') blank++;
      if (st === 'correct') { correct++; }
      else wrongIds.push(id);

      if (q.type === 'single') st === 'correct' ? per.single.ok++ : per.single.bad++;
      else if (q.type === 'judge') st === 'correct' ? per.judge.ok++ : per.judge.bad++;
      else {
        if (st === 'correct') per.multi.full++;
        else if (st === 'short') per.multi.short++;
        else per.multi.wrong++;
      }
    });

    var pct = total ? Math.round(correct / total * 100) : 0;

    var wrongHtml = wrongIds.length
      ? wrongIds.map(function (id) {
          var q = byId[id];
          var txt = q.answer.map(function (k) {
            var o = q.options.filter(function (x) { return x.key === k; })[0];
            return o ? o.text : k;
          }).join('、');
          return '<div class="q-list-item">' +
            '<div class="ql-top"><span class="tag tag-' + q.type + '">' + TYPE_NAME[q.type] + '</span>' +
            '<span class="stem">' + q.stem + '</span></div>' +
            '<div class="ql-ans">正确答案：' + txt + '</div></div>';
        }).join('')
      : '<div class="empty" style="padding:22px 0"><span class="big">✓</span>本轮全对，没有错题</div>';

    $('#result').innerHTML =
      '<div class="score-ring"><div class="ring" style="--p:' + pct + '%">' +
        '<div class="in"><b>' + pct + '</b><span>分 · ' + correct + '/' + total + ' 正确</span></div>' +
      '</div></div>' +
      (blank ? '<p style="text-align:center;color:#8b9a93;font-size:13px;margin:2px 0 0">其中未作答 ' + blank + ' 题</p>' : '') +
      '<div class="result-card">' +
        '<div class="stat-line"><span>单选题</span><span class="v"><span class="good">正确 ' + per.single.ok + '</span> / <span class="bad">错误 ' + per.single.bad + '</span></span></div>' +
        '<div class="stat-line"><span>多选题</span><span class="v"><span class="good">全选 ' + per.multi.full + '</span> / <span class="warn">不全选 ' + (per.multi.short + per.multi.wrong) + '</span></span></div>' +
        '<div class="stat-sub" style="padding:2px 0 8px">其中 漏选 ' + per.multi.short + ' · 错选 ' + per.multi.wrong + '</div>' +
        '<div class="stat-line"><span>判断题</span><span class="v"><span class="good">正确 ' + per.judge.ok + '</span> / <span class="bad">错误 ' + per.judge.bad + '</span></span></div>' +
      '</div>' +
      '<div class="result-card"><div class="card-title" style="margin-bottom:4px">错题回顾</div>' + wrongHtml + '</div>' +
      '<div class="row-2">' +
        '<button class="ghost" id="resAgain">再来一组</button>' +
        '<button class="ghost" id="resRedo">重做错题</button>' +
      '</div>' +
      '<button class="primary" id="resHome" style="margin-top:10px">返回首页</button>';

    $('#result').classList.remove('hidden');
    $('#quiz').classList.add('hidden');
    $('#result').scrollTop = 0;
  }

  /* ---------------- 错题本 ---------------- */
  var wrongFilter = 'all';

  function renderWrong() {
    updateBadge();
    var ids = Object.keys(wrongBook).map(Number);
    var list = ids.map(function (id) { return byId[id]; }).filter(Boolean);
    if (wrongFilter !== 'all') list = list.filter(function (q) { return q.type === wrongFilter; });
    list.sort(function (a, b) { return (wrongBook[b.id].t || 0) - (wrongBook[a.id].t || 0); });

    $('#wrongFilters').innerHTML = ['all', 'single', 'multi', 'judge'].map(function (t) {
      var label = t === 'all' ? '全部' : TYPE_NAME[t];
      return '<button class="chip ' + (wrongFilter === t ? 'active' : '') + '" data-wf="' + t + '">' + label + '</button>';
    }).join('');

    if (!list.length) {
      $('#wrongList').innerHTML = '<div class="empty"><span class="big">◎</span>' +
        (wrongCount() ? '该分类下暂无错题' : '还没有错题，先去刷几道吧') + '</div>';
      return;
    }

    $('#wrongList').innerHTML = list.map(function (q) {
      return '<div class="wrong-item">' +
        '<div class="meta"><span class="tag tag-' + q.type + '">' + TYPE_NAME[q.type] + '</span>' +
        '<span class="tag tag-part">' + q.part + '</span>' +
        '<span style="margin-left:auto;font-size:12px;color:#94a39c">错 ' + wrongBook[q.id].n + ' 次</span></div>' +
        '<div class="stem">' + q.stem + '</div>' +
        '<div class="acts"><button class="ghost" data-review="' + q.id + '">重做本题</button>' +
        '<button class="ghost danger" data-remove="' + q.id + '">移除</button></div>' +
      '</div>';
    }).join('');
  }

  /* ---------------- 统计 ---------------- */
  function renderStats() {
    var s = stats;
    $('#stAnswered').textContent = s.answered;
    $('#stCorrect').textContent = s.correct;
    $('#stRate').textContent = (s.answered ? Math.round(s.correct / s.answered * 100) : 0) + '%';

    $('#statDetail').innerHTML =
      '<div class="stat-line"><span>单选题</span><span class="v"><span class="good">正确 ' + s.single.ok + '</span> · <span class="bad">错误 ' + s.single.bad + '</span></span></div>' +
      '<div class="stat-line"><span>多选题</span><span class="v"><span class="good">全选 ' + s.multi.full + '</span> · <span class="warn">不全选 ' + (s.multi.short + s.multi.wrong) + '</span></span></div>' +
      '<div class="stat-sub" style="padding:4px 0 8px">其中 漏选 ' + s.multi.short + ' · 错选 ' + s.multi.wrong + '</div>' +
      '<div class="stat-line"><span>判断题</span><span class="v"><span class="good">正确 ' + s.judge.ok + '</span> · <span class="bad">错误 ' + s.judge.bad + '</span></span></div>' +
      '<div class="stat-line"><span>练习轮次</span><span class="v">' + s.sessions + ' 轮</span></div>';

    function rate(ok, all) { return all ? Math.round(ok / all * 100) : 0; }
    var rows = [
      { name: '单选', ok: s.single.ok, all: s.single.ok + s.single.bad },
      { name: '多选（全对率）', ok: s.multi.full, all: s.multi.full + s.multi.short + s.multi.wrong },
      { name: '判断', ok: s.judge.ok, all: s.judge.ok + s.judge.bad }
    ];
    $('#typeStats').innerHTML = rows.map(function (r) {
      var p = rate(r.ok, r.all);
      return '<div style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:5px">' +
        '<span>' + r.name + '</span><span style="color:#5f7269">' + (r.all ? p + '% · ' + r.all + ' 题' : '暂无数据') + '</span></div>' +
        '<div class="progress"><i style="width:' + p + '%"></i></div></div>';
    }).join('') + '<div class="stat-line" style="border:none"><span>错题本存量</span><span class="v">' + wrongCount() + ' 题</span></div>';
  }

  /* ---------------- 设置 ---------------- */
  function syncSwitches() {
    ['#swShuffle', '#swShuffle2', '#swWrongShuffle'].forEach(function (sel) {
      var el = $(sel); if (el) el.classList.toggle('on', settings.shuffle);
    });
    ['#swInstant', '#swInstant2'].forEach(function (sel) {
      var el = $(sel); if (el) el.classList.toggle('on', settings.instant);
    });
    var a = $('#swAutoRemove'); if (a) a.classList.toggle('on', settings.autoRemove);
  }

  /* ---------------- 路由 ---------------- */
  function showTab(name) {
    $$('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    $$('.screen').forEach(function (sc) { sc.classList.toggle('active', sc.id === 'screen-' + name); });
    if (name === 'wrong') renderWrong();
    if (name === 'stats') renderStats();
  }

  /* ---------------- 事件 ---------------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;

    if (t.dataset.tab) { showTab(t.dataset.tab); return; }
    if (t.dataset.type) { toggleType(t.dataset.type); return; }
    if (t.dataset.part) { togglePart(t.dataset.part); return; }
    if (t.dataset.count) {
      filter.count = t.dataset.count === 'all' ? 'all' : Number(t.dataset.count);
      renderCountChips(); syncCountInput(); renderPool(); return;
    }
    if (t.dataset.wf) { wrongFilter = t.dataset.wf; renderWrong(); return; }
    if (t.dataset.jump !== undefined) {
      clearAuto();
      session.idx = Number(t.dataset.jump);
      closeDrawer();
      renderQuiz();
      $('#quizBody').scrollTop = 0;
      return;
    }

    switch (t.id) {
      case 'quickWrong':
        showTab('wrong'); break;
      case 'btnStart': {
        var pool = currentPool();
        if (!pool.length) { toast('没有符合条件的题目'); break; }
        var shuffled = shuffleArr(pool);
        var count = filter.count === 'all' ? shuffled.length : Math.min(Number(filter.count), shuffled.length);
        startSession(shuffled.slice(0, count).map(function (q) { return q.id; }));
        break;
      }
      case 'btnQuick20': {
        var p = BANK.slice();
        startSession(shuffleArr(p).slice(0, 20).map(function (q) { return q.id; }));
        break;
      }
      case 'btnWrongSession':
        if (!wrongCount()) { toast('错题本还是空的'); break; }
        startSession(shuffleArr(Object.keys(wrongBook).map(Number)).map(function (id) { return id; }));
        break;
      case 'btnRedoWrong': {
        var ids = Object.keys(wrongBook).map(Number);
        if (!ids.length) { toast('错题本还是空的'); break; }
        startSession(shuffleArr(ids));
        break;
      }
      case 'btnClearWrong':
        if (!wrongCount()) { toast('错题本已经是空的'); break; }
        askConfirm('确定清空错题本？此操作不可撤销。', function () {
          wrongBook = {}; save(K.wrong, wrongBook); renderWrong(); toast('已清空错题本');
        });
        break;
      case 'btnResetStats':
        askConfirm('确定重置累计统计？', function () { stats = newStats(); save(K.stats, stats); renderStats(); toast('统计已重置'); });
        break;
      case 'btnResetAll':
        askConfirm('将清除错题本、统计和偏好设置，确定继续？', function () {
          localStorage.removeItem(K.wrong); localStorage.removeItem(K.stats); localStorage.removeItem(K.settings);
          wrongBook = {}; stats = newStats();
          settings = { shuffle: true, instant: true, autoRemove: true };
          save(K.stats, stats); save(K.wrong, wrongBook); save(K.settings, settings);
          syncSwitches(); updateBadge(); renderStats(); renderWrong(); toast('已清除全部数据');
        });
        break;
      case 'swShuffle': case 'swShuffle2':
        settings.shuffle = !settings.shuffle; save(K.settings, settings); syncSwitches(); break;
      case 'swWrongShuffle':
        settings.shuffle = !settings.shuffle; save(K.settings, settings); syncSwitches();
        toast(settings.shuffle ? '重做时将打乱选项顺序' : '重做时保持原始选项顺序');
        break;
      case 'swSessionShuffle': {
        if (!session) break;
        session.shuffle = !session.shuffle;
        session.ids.forEach(function (id, i) {
          if (session.res[i] !== undefined) return;
          var keys = byId[id].options.map(function (o) { return o.key; });
          session.order[id] = session.shuffle ? shuffleArr(keys) : keys;
        });
        syncSessionSwitch();
        renderQuiz();
        toast(session.shuffle ? '本局已改为随机打乱' : '本局已改为原始顺序');
        break;
      }
      case 'btnBadMulti': {
        var bm = badMultiIds();
        if (!bm.length) { toast('错题本里还没有错选或漏选的多选题'); break; }
        startSpecial(bm, { label: '错选漏选多选' });
        break;
      }
      case 'btnJudgeFalse':
        startSpecial(judgeFalseIds(), { label: '判断·错误答案' });
        break;
      case 'btnMultiPartial':
        startSpecial(multiPartialIds(), { label: '多选·不全选' });
        break;
      case 'btnRecite': {
        var rp = currentPool();
        if (!rp.length) { toast('没有可背的题目'); break; }
        startSpecial(rp.map(function (q) { return q.id; }), { recite: true });
        break;
      }
      case 'btnReciteJudgeFalse': {
        var rj = judgeFalseIds();
        if (!rj.length) { toast('没有可背的题目'); break; }
        startSession(shuffleArr(rj), { recite: true, label: '背题·判断错误答案' });
        break;
      }
      case 'btnReciteMultiPartial': {
        var rm = multiPartialIds();
        if (!rm.length) { toast('没有可背的题目'); break; }
        startSession(shuffleArr(rm), { recite: true, label: '背题·多选不全选' });
        break;
      }
      case 'swInstant': case 'swInstant2':
        settings.instant = !settings.instant; save(K.settings, settings); syncSwitches();
        toast(settings.instant ? '已切换为练习模式（即时判定）' : '已切换为模拟考试模式');
        break;
      case 'swAutoRemove':
        settings.autoRemove = !settings.autoRemove; save(K.settings, settings); syncSwitches(); break;
      case 'btnQuizBack':
        askConfirm('退出本次练习？已答记录会保留在统计与错题本中。', function () {
          clearAuto();
          $('#quiz').classList.add('hidden'); closeDrawer();
        });
        break;
      case 'btnPrev': prevQuestion(); break;
      case 'btnSubmit': submitCurrent(); break;
      case 'btnNext': nextQuestion(); break;
      case 'btnCard': openDrawer(); break;
      case 'btnFinish': finishSession(); break;
      case 'resAgain': {
        $('#result').classList.add('hidden');
        var pool2 = currentPool();
        if (!pool2.length) { showTab('home'); break; }
        var sh = shuffleArr(pool2);
        var c = filter.count === 'all' ? sh.length : Math.min(Number(filter.count), sh.length);
        startSession(sh.slice(0, c).map(function (q) { return q.id; }));
        break;
      }
      case 'resRedo': {
        var bad = session.ids.filter(function (id, i) { return session.res[i] !== 'correct'; });
        $('#result').classList.add('hidden');
        if (!bad.length) { toast('本轮没有错题'); showTab('home'); break; }
        startSession(bad);
        break;
      }
      case 'resHome':
        $('#result').classList.add('hidden'); showTab('home'); break;
      default: break;
    }

    if (t.dataset.review) {
      startSession([Number(t.dataset.review)]);
      return;
    }
    if (t.dataset.remove) {
      delete wrongBook[Number(t.dataset.remove)];
      save(K.wrong, wrongBook); renderWrong(); toast('已移出错题本');
      return;
    }
    if (t.classList.contains('opt')) {
      selectOption(t.dataset.k);
    }
  });

  $('#mask').addEventListener('click', closeDrawer);

  var countInput = $('#countCustom');
  if (countInput) {
    countInput.addEventListener('input', function () {
      applyCustomCount(countInput.value);
    });
    countInput.addEventListener('change', function () {
      applyCustomCount(countInput.value);
      syncCountInput();
    });
    countInput.addEventListener('blur', function () {
      syncCountInput();
    });
    countInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { countInput.blur(); }
    });
  }

  /* ---------------- 初始化 ---------------- */
  var EXAM_DATE = new Date(2026, 11, 6);   // 2026 年 12 月 6 日，招聘考试当天

  function examDaysLeft() {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var exam = new Date(EXAM_DATE.getFullYear(), EXAM_DATE.getMonth(), EXAM_DATE.getDate());
    return Math.round((exam - today) / 86400000);
  }

  function updateCountdown() {
    var el = $('#examCountdown');
    if (!el) return;
    var d = examDaysLeft();
    el.className = 'countdown';
    el.title = '考试日：2026 年 12 月 6 日';
    if (d > 0) {
      if (d <= 7) {
        el.className = 'countdown urgent';
        el.innerHTML = '距考试 <b>' + d + '</b> 天';
      } else {
        el.textContent = '距考试 ' + d + ' 天';
      }
    } else if (d === 0) {
      el.className = 'countdown urgent';
      el.innerHTML = '今天考试 · <b>加油</b>';
    } else {
      el.className = 'countdown done';
      el.textContent = '考试已结束';
    }
  }

  function init() {
    var counts = { single: 0, multi: 0, judge: 0 };
    BANK.forEach(function (q) { counts[q.type]++; });
    $('#bankMeta').textContent = '公共与行业知识 · 2027版 · 共 ' + BANK.length + ' 题';

    renderTypeChips();
    renderCountChips();
    syncCountInput();
    renderPartChips();
    renderPool();
    updateCountdown();
    setInterval(updateCountdown, 600000);
    updateBadge();
    syncSwitches();

    $('#infoTotal').textContent = BANK.length + ' 题';
    $('#infoSingle').textContent = counts.single + ' 题';
    $('#infoMulti').textContent = counts.multi + ' 题';
    $('#infoJudge').textContent = counts.judge + ' 题';

    renderStats();
    renderWrong();
  }

  init();
})();
