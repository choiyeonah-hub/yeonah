# -*- coding: utf-8 -*-
import io, re

src = io.open("index.html", encoding="utf-8").read()
s = src

# ── 제목: 갤러리·탭에 이름만 ─────────────────────────────
s = s.replace("<title>손주한통 — 어머니께 오늘 일정을 전화로 읽어드립니다</title>", "<title>손주한통</title>")
s = s.replace('<link rel="manifest" href="/manifest.json" />\n', "")

# ── 스크립트 호스트: unpkg(차단) → cdnjs, supabase 제거 ──
s = s.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n', "")
s = s.replace('<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>',
              '<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>')
s = s.replace('<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>',
              '<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>')
s = s.replace('<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>',
              '<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js"></script>')

# ── 부팅 스크립트 교체 ──────────────────────────────────
i = s.index("<script>\n/* ── 부팅")
j = s.index("</script>", i) + len("</script>")

demo_boot = '''<script>
/* ══ 체험판 부팅 ══════════════════════════════════════
   로그인·서버 없이 이 기기(localStorage)에만 저장합니다.
   AI 분석은 내장 간이 버전 — 실제 배포판에서는 Claude가 합니다. */
(function () {
  var gate = document.getElementById('gate');
  var bar = document.getElementById('bar');

  /* 저장: 브라우저가 저장을 막아도 앱은 떠야 합니다 */
  var mem = {};
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] == null ? null : mem[k]; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} mem[k] = v; }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} delete mem[k]; }

  window.storage = {
    get: function (k) { var v = lsGet('meonjeon-demo:' + k); if (v == null) return Promise.reject(new Error('empty')); return Promise.resolve({ key: k, value: v }); },
    set: function (k, v) { lsSet('meonjeon-demo:' + k, v); return Promise.resolve({ key: k, value: v }); },
    delete: function (k) { lsDel('meonjeon-demo:' + k); return Promise.resolve({ deleted: true }); },
    list: function () { return Promise.resolve({ keys: ['meonjeon'] }); },
  };
  window.__ME = 'm1';

  /* ── 간이 AI: /api/classify·/api/weather 를 이 안에서 처리 ── */
  var CAT_RULES = [
    [/청소|화장실|싱크대|베란다|분리수거|쓰레기|설거지|정리/, 'home'],
    [/아이랑|놀이|체험|활동|나들이|키즈/, 'kid'],
    [/냉장고|유통기한|먹어야|반찬|식단|이유식|밀키트|장보|장 봐/, 'food'],
    [/빨래|세탁|옷 정리|계절옷|드라이|이불/, 'laundry'],
    [/운동화|신발|사이즈|옷(이|가)? ?작/, 'kid'],
    [/어린이집|유치원|학교|알림장|준비물|학원|숙제/, 'edu'],
    [/병원|접종|검진|약|영양제/, 'health'],
    [/자동차|엔진오일|주유|타이어|세차|검사/, 'transport'],
    [/시부모|부모님|장인|장모|친정/, 'parents'],
    [/생일|명절|추석|설날|제사|경조사|결혼식|돌잔치|손님/, 'event'],
    [/보험|카드값|세금|관리비|연말정산|적금|납부/, 'finance'],
    [/사료|산책|모래|동물병원|강아지|고양이/, 'pet'],
    [/여행|여권|항공|숙소/, 'travel'],
    [/에어컨|세탁기|건조기|정수기|필터|가전|보일러/, 'appliance'],
  ];
  var ST_RULES = [
    [/사야|사기|살 것|구매|주문|장보/, 'buy'],
    [/오늘|당장|지금|급/, 'now'],
    [/확인|알아보|찾아보|언제였|언제 갈|모르겠/, 'check'],
    [/비교|고르|정할|결정/, 'decide'],
    [/일 수도|할 수도|오시면|되면|확정되면/, 'conditional'],
    [/기억|잊지|말아야|알아두/, 'remember'],
  ];
  function guess(rules, text, fb) { for (var i = 0; i < rules.length; i++) if (rules[i][0].test(text)) return rules[i][1]; return fb; }
  function toTitle(cl) {
    var t = cl.replace(/(해야\\s*(되고|하고|돼|해|겠다|지)|인 것 같아|것 같아|는 것 같다|라고 했어|래|네|다)\\s*$/g, '').trim();
    t = t.replace(/^(아 맞다|그리고|근데|참)\\s*/, '');
    return t.slice(0, 18);
  }
  function splitSpeech(sp) {
    var marked = sp.replace(/(되|하|았|었|해|돼|둬|와|져|졌|간|온|는데|니까)고\\s/g, '$1고\\u0001')
                   .replace(/([다요래봐야어아지])[.]?\\s+(?=[가-힣])/g, '$1\\u0001');
    return marked.split(/[\\u0001.!?\\n]/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length >= 4; });
  }
  function classifySpeech(sp) {
    if (sp.indexOf('다음 주 화요일 단수') >= 0) {
      return [
        { title: '단수 전 물 받아두기', category: 'home', status: 'remember', note: '다음 주 화요일 단수' },
        { title: '휴지 구매', category: 'home', status: 'buy', note: '떨어지기 전에' },
        { title: '아이 운동화 사이즈 확인', category: 'kid', status: 'check', note: '작아진 듯' },
        { title: '시부모님 방문 준비', category: 'event', status: 'conditional', note: '토요일 확정되면' },
        { title: '엔진오일 교체일 확인', category: 'transport', status: 'check', note: '기록이 없음' },
        { title: '두부 먼저 먹기', category: 'food', status: 'now', note: '유통기한 임박' },
      ];
    }
    var out = splitSpeech(sp).map(function (cl) {
      return { title: toTitle(cl), category: guess(CAT_RULES, cl, 'etc'), status: guess(ST_RULES, cl, 'week'), note: '' };
    }).filter(function (x) { return x.title.length >= 2; });
    return out.slice(0, 8);
  }
  function discoverItems() {
    var m = new Date().getMonth() + 1;
    if (m >= 8 && m <= 9) return [
      { title: '명절 승차권 예매', why: '추석 기차표는 한 달 전에 열려요', when: '9월에', category: 'event' },
      { title: '가을 환절기 옷 꺼내기', why: '아침저녁 기온차가 커지기 전에', when: '9월에', category: 'laundry' },
    ];
    if (m >= 10 && m <= 12) return [
      { title: '보일러 점검 예약', why: '첫 추위에 몰리면 예약이 안 돼요', when: '11월에', category: 'appliance' },
      { title: '연말정산 영수증 정리', why: '몰아서 하면 놓치는 게 생겨요', when: '12월에', category: 'finance' },
    ];
    return [
      { title: '에어컨 필터 청소', why: '본격 냉방 전에 한 번', when: '5월에', category: 'appliance' },
      { title: '여름옷 정리', why: '작아진 아이 옷부터', when: '5월에', category: 'laundry' },
    ];
  }
  function fakeWeather() {
    var t = { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_probability_max: [] };
    var codes = [0, 1, 2, 3, 61, 1, 0, 2, 1, 3, 0, 1];
    for (var i = 0; i < 12; i++) {
      var d = new Date(Date.now() + i * 86400000);
      var p = function (n) { return String(n).length < 2 ? '0' + n : '' + n; };
      t.time.push(d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()));
      t.weather_code.push(codes[i]);
      t.temperature_2m_max.push(26 - i % 4);
      t.temperature_2m_min.push(17 - i % 3);
      t.precipitation_probability_max.push(codes[i] >= 60 ? 75 : 10 + (i % 3) * 10);
    }
    return t;
  }
  var NL = String.fromCharCode(10);
  function aiText(obj) { return { content: [{ type: 'text', text: JSON.stringify(obj) }] }; }
  function handleClassify(body) {
    var prompt = (body && body.prompt) || '';
    if (body && body.images && body.images.length) {
      if (/냉장고/.test(prompt)) return aiText({
        tasks: [
          { title: '두부 먼저 먹기', category: 'food', status: 'now', note: '유통기한 임박' },
          { title: '애호박 소진', category: 'food', status: 'now', note: '무르기 전에' },
          { title: '달걀 구매', category: 'food', status: 'buy', note: '2개 남음' },
        ],
        menu: [
          { day: '월', dish: '두부조림', use: '두부·양파', tip: '두부조림 레시피' },
          { day: '수', dish: '애호박전', use: '애호박·달걀', tip: '애호박전 만들기' },
          { day: '금', dish: '야채볶음밥', use: '남은 야채', tip: '냉장고털이 볶음밥' },
        ],
      });
      return aiText([
        { title: '체육복 챙기기', category: 'edu', status: 'week', note: '금요일 체육', newCategory: '', cycle: '' },
        { title: '현장학습 동의서 제출', category: 'edu', status: 'now', note: '이번 주 수요일까지', newCategory: '', cycle: '' },
        { title: '견학 도시락 준비', category: 'food', status: 'remember', note: '다음 주 금요일', newCategory: '', cycle: '' },
      ]);
    }
    if (/여행을 준비합니다/.test(prompt)) return aiText([
      { title: '숙소·교통 예약 확인', category: 'travel', daysBefore: 14, note: '취소 기한도' },
      { title: '짐 목록 만들기', category: 'travel', daysBefore: 5, note: '아이 짐 따로' },
      { title: '상비약 챙기기', category: 'health', daysBefore: 3, note: '' },
      { title: '화분·반려동물 맡기기', category: 'home', daysBefore: 2, note: '' },
      { title: '냉장고 정리', category: 'food', daysBefore: 1, note: '상할 것 먼저' },
      { title: '짐 싸기', category: 'travel', daysBefore: 1, note: '충전기 확인' },
    ]);
    if (/을 준비합니다/.test(prompt) && /제사|기일|차례/.test(prompt)) return aiText([
      { title: '제수 메뉴 정하기', category: 'food', daysBefore: 7, note: '어른들께 여쭤보기' },
      { title: '제기·향·초 확인', category: 'event', daysBefore: 5, note: '모자란 건 주문' },
      { title: '제수 장보기 목록', category: 'food', daysBefore: 4, note: '과일·나물·전 재료' },
      { title: '제수 장보기', category: 'food', daysBefore: 2, note: '생물은 하루 전' },
      { title: '집 정리·상 자리', category: 'home', daysBefore: 1, note: '' },
      { title: '음식 장만·전 부치기', category: 'food', daysBefore: 1, note: '' },
      { title: '지방·축문 준비', category: 'event', daysBefore: 1, note: '' },
    ]);
    var m = prompt.match(/발화: "([\\s\\S]*?)"/);
    if (m) {
      var ANSWERS = [
        [/보험/, '자동차 보험 갱신 전에는 이 순서로 보시면 됩니다.' + NL + NL + '1. 지금 보험의 만기일과 보험료를 먼저 확인하세요. 갱신 안내문이나 보험사 앱에 있습니다.' + NL + '2. 다이렉트 3곳 이상 견적을 같은 조건(자기부담금·특약)으로 비교하세요. 조건이 다르면 금액 비교가 의미 없습니다.' + NL + '3. 블랙박스·마일리지·자녀할인 특약이 빠지지 않았는지 보세요. 마일리지는 나중에 환급받는 구조라 신청만 해두면 됩니다.' + NL + '4. 만기 하루 전에 하면 선택지가 없어집니다. 2주 전에 끝내세요.',
          [['보험 만기일·현재 보험료 확인','transport','check','갱신 안내문에 있어요'],['다이렉트 3곳 견적 비교','transport','week','같은 조건으로'],['마일리지·자녀할인 특약 확인','transport','check','빠지기 쉬워요']]],
        [/놓친|빠진|챙길/, '지금 시기에 이 집에서 빠지기 쉬운 건 세 가지예요.' + NL + NL + '아이가 5살이면 이맘때 취학 전 건강검진 안내가 나옵니다. 기간이 정해져 있어서 놓치면 다시 잡기 어려워요.' + NL + '어린이집 방학·행사 일정은 보통 2주 전에 공지되는데, 알림장을 놓치면 당일 아침에 알게 됩니다.' + NL + '환절기 전에 아이 옷 사이즈를 한 번 재두면 급하게 사는 일이 줄어요.',
          [['영유아 건강검진 시기 확인','kid','check','기간이 정해져 있어요'],['어린이집 방학·행사 일정 확인','edu','week','2주 전 공지'],['아이 옷·신발 사이즈 재기','kid','week','환절기 전에']]],
        [/검사/, '자동차 정기검사는 이렇게 챙기시면 됩니다.' + NL + NL + '비사업용 승용차는 최초 등록 4년 뒤 첫 검사를 받고, 그 뒤로는 2년마다입니다.' + NL + '만료일 전후 31일 안에만 받으면 되니 한 달 전부터 예약하면 넉넉해요.' + NL + '기한을 넘기면 과태료가 붙고 날짜가 지날수록 올라갑니다.' + NL + '설정 → 자동차에서 최초등록 연월만 넣어두시면 다음 검사 시점을 저희가 계산해 미리 알려드려요.',
          [['자동차 최초등록 연월 등록','transport','now','설정에서 한 번만'],['정기검사 예약','transport','week','만료 한 달 전']]],
        [/검진/, '올해 받아야 할 검진을 정리하면 이렇습니다.' + NL + NL + '성인 일반건강검진은 출생연도 홀짝에 따라 해마다 대상이 갈립니다. 직장가입자는 사무직이면 2년마다예요.' + NL + '아이는 영유아 건강검진이 월령 구간마다 있고, 구강검진은 따로 있습니다.' + NL + '연말에 몰리면 예약이 안 되니 상반기에 끝내는 편이 낫습니다.',
          [['건강검진 대상 여부 확인','health','check','출생연도 홀짝'],['검진 예약','health','week','상반기에'],['아이 영유아검진 차수 확인','kid','check','월령 구간']]],
        [/명절|추석|설/, '명절은 준비 시점이 서로 다릅니다.' + NL + NL + '기차표는 명절 한 달 전에 예매가 열리고 몇 분 만에 마감됩니다. 이게 가장 먼저예요.' + NL + '선물은 2주 전, 성묘나 차례 음식 재료는 3~4일 전이 적당합니다.' + NL + '연휴 전날 마트가 붐비니 장보기는 그 전에 끝내두세요.',
          [['명절 승차권 예매일 확인','event','check','한 달 전 오픈'],['선물 목록 정하기','event','week','2주 전'],['차례·성묘 준비물 정리','event','week','']]],
        [/계절옷|옷 정리|환절기/, '계절옷 정리는 한 번에 하려면 하루가 통째로 날아갑니다. 나눠서 하세요.' + NL + NL + '먼저 지금 입는 옷만 남기고, 작아진 아이 옷을 골라냅니다. 이게 제일 오래 걸려요.' + NL + '세탁·드라이가 필요한 것만 따로 빼서 맡기고, 나머지를 보관합니다.' + NL + '집에 자리가 없으면 짐 보관 서비스를 쓰는 방법도 있어요.',
          [['작아진 아이 옷 골라내기','laundry','week','제일 오래 걸려요'],['겨울옷 드라이 맡기기','laundry','week','보관 전에'],['보관 공간 정하기','laundry','decide','짐 보관 서비스도']]],
        [/가전|청소 주기/, '가전 청소는 주기가 다 달라서 한 번 정해두면 편합니다.' + NL + NL + '에어컨 필터는 2주에 한 번, 세탁기 통세척은 2~3개월에 한 번이 적당해요.' + NL + '정수기 필터와 공기청정기 필터는 제품마다 다르니 구입 시기를 기준으로 잡으시면 됩니다.' + NL + '건조기 먼지망은 쓸 때마다인데, 이건 습관이라 알림보다 자리를 바꾸는 게 낫습니다.',
          [['에어컨 필터 청소 주기 등록','appliance','week','2주에 한 번'],['세탁기 통세척','appliance','week','2~3개월'],['정수기 필터 교체 시기 확인','appliance','check','구입 시기 기준']]],
        [/밀린|집안일 정리/, '밀린 집안일은 목록을 보면 더 하기 싫어집니다. 오늘 할 것만 세 개 고르세요.' + NL + NL + '먼저 시간이 지나면 나빠지는 것부터 — 음식물, 빨래, 상한 재료.' + NL + '그다음 손님이나 가족이 볼 것 — 화장실, 현관.' + NL + '나머지는 미뤄도 아무 일도 안 생깁니다. 미루셔도 돼요.',
          [['음식물·상한 재료 처리','home','now','더 나빠지기 전에'],['빨래 돌리기','home','now',''],['화장실 청소','home','week','']]],
      ];
      for (var ai2 = 0; ai2 < ANSWERS.length; ai2++) {
        if (ANSWERS[ai2][0].test(m[1])) return aiText({
          answer: ANSWERS[ai2][1],
          items: ANSWERS[ai2][2].map(function (r) { return { title: r[0], category: r[1], status: r[2], note: r[3] }; }),
        });
      }
      if (/식단|메뉴|레시피/.test(m[1]) && /짜|추천|알려/.test(m[1])) return aiText({
        answer: '월: 두부조림 + 계란국' + String.fromCharCode(10) + '화: 제육볶음 + 콩나물무침' + String.fromCharCode(10) + '수: 된장찌개 + 애호박전' + String.fromCharCode(10) + '목: 카레라이스' + String.fromCharCode(10) + '금: 냉장고털이 볶음밥' + String.fromCharCode(10) + '(실제판에서는 우리 집 냉장고·가족 취향에 맞춰 짜드려요)',
        items: [
          { title: '주간 장보기 목록 만들기', category: 'food', status: 'week', note: '위 식단 재료' },
          { title: '장보기', category: 'food', status: 'buy', note: '이번 주 안에' },
          { title: '두부·계란 먼저 확인', category: 'food', status: 'check', note: '있는 재료부터' },
        ],
      });
      if (/[?？]\s*$/.test(m[1]) || /알려줘|정리해줘|추천|찾아줘|확인해줘|짜줘|어때|있을까|해야 해/.test(m[1])) {
        return aiText({
          answer: '체험판에서는 미리 준비한 답만 보여드릴 수 있어요.' + NL + '실제 앱에서는 이 질문에 우리 집 상황(아이 나이·차·반려동물·이번 달 시기)과 이미 챙기고 있는 일을 함께 보고, 빠진 것만 골라 이렇게 답해드립니다.' + NL + NL + '아래는 말씀하신 내용에서 뽑아낸 할 일이에요.',
          items: classifySpeech(m[1]),
        });
      }
      return aiText(classifySpeech(m[1]));
    }
    if (/2개만 제안/.test(prompt)) return aiText(discoverItems());
    return aiText([]);
  }

  /* 뷰어는 alert·confirm 같은 브라우저 팝업을 조용히 막습니다.
     화면 안에 직접 그리는 패널로 바꿉니다. confirm은 바로 실행으로. */
  (function () {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(15,26,21,.45);padding:24px';
    box.innerHTML = '<div style="background:#fff;border-radius:20px;max-width:340px;width:100%;padding:20px 18px;box-shadow:0 22px 48px -22px rgba(15,26,21,.4)">' +
      '<div id="demo-msg" style="font-size:14px;line-height:1.7;color:#0F1A15;white-space:pre-wrap;word-break:break-all"></div>' +
      '<button id="demo-ok" style="margin-top:16px;width:100%;background:#0F1A15;color:#fff;border:none;border-radius:14px;padding:13px 0;font-size:14px;font-weight:600;font-family:inherit">확인</button></div>';
    document.body.appendChild(box);
    box.querySelector('#demo-ok').onclick = function () { box.style.display = 'none'; };
    box.onclick = function (e) { if (e.target === box) box.style.display = 'none'; };
    window.alert = function (msg) {
      box.querySelector('#demo-msg').textContent = String(msg);
      box.style.display = 'flex';
    };
    /* 체험판 데이터뿐이라, 확인창 대신 바로 실행합니다 */
    window.confirm = function () { return true; };
  })();

  /* 체험판 뷰어는 바깥 사이트로 이동을 막습니다 — 어디로 가는지는 알려줍니다 */
  var realOpen = window.open ? window.open.bind(window) : null;
  window.open = function (u) {
    var w2 = null;
    try { w2 = realOpen ? realOpen.apply(window, arguments) : null; } catch (e) {}
    if (!w2) alert('체험판에서는 바깥 사이트로 이동이 막혀 있어요.' + '\\n' + '실제 배포판에서는 여기로 연결됩니다:' + '\\n\\n' + u);
    return w2;
  };

  var realFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    var u = String(url);
    if (u.indexOf('/api/classify') === 0) {
      var body = {};
      try { body = JSON.parse(opts && opts.body || '{}'); } catch (e) {}
      var res = handleClassify(body);
      return new Promise(function (ok) { setTimeout(function () { ok({ ok: true, status: 200, json: function () { return Promise.resolve(res); } }); }, 900); });
    }
    if (u.indexOf('/api/weather') === 0) {
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(fakeWeather()); } });
    }
    return realFetch(url, opts);
  };

  /* ── 예시 집안을 미리 채워둡니다 ──────────────────────
     체험판을 열면 첫 설정부터 나왔습니다. 구경하러 오신 분은
     거기서 그냥 닫으십니다 — 이 앱이 무엇을 하는지 못 보고요.
     그래서 한 집을 미리 넣어 "오늘" 화면부터 보이게 합니다.
     번호는 000-0000-0000 입니다. 진짜 번호를 넣지 마세요.
     맨 위 "처음부터"를 누르면 지워지고 첫 설정을 볼 수 있습니다. */
  if (lsGet('meonjeon-demo:meonjeon') == null && lsGet('meonjeon-demo:noseed') == null) {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    var r = function (t, w, k, o) {
      var x = { id: 'cl' + Math.random().toString(36).slice(2, 8), time: t, what: w,
                kind: k || 'sked', kid: 'demo-k1', alert: !!o };
      return x;
    };
    lsSet('meonjeon-demo:meonjeon', JSON.stringify({
      onboarded: true,
      children: [{ id: 'demo-k1', name: '지호', age: '5', months: 60, klass: '햇님' }],
      elders: [{ id: 'demo-e1', label: '할머니', phone: '00000000000', how: 'call' }],
      callOn: true, callAt: '07:50', callMax: 2, callHeadsUp: true,
      callPlan: {
        '1': [r('09:00', '유치원 데려다주기'), r('14:30', '유치원 하원하기', 'sked', true), r('16:00', '피아노 데려다주기')],
        '2': [r('09:00', '유치원 데려다주기'), r('14:30', '유치원 하원하기', 'sked', true), r('15:00', '소아과 가기', 'sked', true)],
        '3': [r('09:00', '유치원 데려다주기'), r('14:30', '유치원 하원하기', 'sked', true), r('16:30', '태권도 데려다주기')],
        '4': [r('09:00', '유치원 데려다주기'), r('14:30', '유치원 하원하기', 'sked', true), r('', '간식 챙겨주기')],
        '5': [r('09:00', '유치원 데려다주기'), r('13:30', '유치원 하원하기', 'sked', true)]
      }
    }));
  }

  /* 상단 띠: 체험판임을 분명히 */
  bar.style.display = 'flex';
  bar.innerHTML = '<span>🌱 <b>체험판</b> · 이 기기에만 저장 · AI는 간이 버전(실제판은 Claude)</span>' +
    '<button id="demo-reset">처음부터</button>';
  var resetArmed = false;
  document.getElementById('demo-reset').onclick = function () {
    var b = document.getElementById('demo-reset');
    if (!resetArmed) { resetArmed = true; b.textContent = '한 번 더 누르면 초기화'; setTimeout(function () { resetArmed = false; b.textContent = '처음부터'; }, 3000); return; }
    lsDel('meonjeon-demo:meonjeon'); lsSet('meonjeon-demo:noseed', '1'); location.reload();
  };
  gate.style.display = 'none';
  document.getElementById('root').style.paddingTop = '34px';

  /* Babel이 앱을 컴파일해 startApp을 만들 때까지 기다립니다 */
  var tries = 0;
  (function wait() {
    if (window.startApp) return window.startApp();
    if (++tries > 400) {
      gate.style.display = 'block';
      gate.innerHTML = '<h1>앱을 불러오지 못했어요</h1><p>네트워크 상태를 확인하고 새로고침해 주세요.</p>';
      return;
    }
    setTimeout(wait, 50);
  })();
})();
</script>'''

s = s[:i] + demo_boot + s[j:]

io.open("demo.html", "w", encoding="utf-8").write(s)
print("demo written", len(s))

# ── 체험판: 캘린더 파일 저장 대신 안내 (뷰어에서 다운로드가 막혀 있음) ──
s = io.open("demo.html", encoding="utf-8").read()
i = s.index("/* 캘린더로 내보내기 (.ics)")
j = s.index("/* ══════════ 앱 ══════════ */")
s = s[:i] + '''/* ── 체험판에 없는 화면들 ────────────────────────────
   아래 잘라내는 구간(캘린더·알림·베타지표)에 컴포넌트가 하나둘 들어가면서,
   체험판은 그것들을 부르는데 정의가 없는 상태가 됐습니다.
   리액트는 그러면 화면을 통째로 안 그립니다 — 첫 설정만 보이고 끝났습니다.
   빈 것으로라도 반드시 만들어둬야 합니다. */
function BetaAll() { return null; }
function SkippedCats() { return null; }
function PendingDates() { return null; }
function EnvCheck() { return null; }
function PushBox() { return null; }
function InAppNotice() { return null; }
function CalButtons({ title, whenMs, note, style }) {
  return (
    <button className="press" onClick={() => downloadICS(title, whenMs, note)}
      style={{ background: "transparent", border: `1px solid ${C.line}`, borderRadius: 999,
               padding: "6px 13px", fontSize: 12, color: C.ink2, ...(style || {}) }}>
      달력에 넣기
    </button>
  );
}

/* 캘린더로 내보내기 — 체험판에서는 파일 저장이 막혀 있어 안내만 합니다 */
function downloadICS(title, whenMs, note) {
  const d0 = new Date(whenMs);
  alert(`체험판에서는 캘린더 파일 저장이 꺼져 있어요.\\n실제 배포판에서는 "${title}" (${d0.getMonth() + 1}월 ${d0.getDate()}일) 일정이 .ics 파일로 저장됩니다.`);
}

''' + s[j:]
io.open("demo.html", "w", encoding="utf-8").write(s)
print("ics patched")
