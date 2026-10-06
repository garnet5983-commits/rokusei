(() => {
  'use strict';
  const E = window.Rokusei, D = window.RokuseiData;
  const KEY = 'rokusei-diary.profile.v1';
  const VERSION = '1.2.0';
  const main = document.querySelector('#main');
  const nav = document.querySelector('#nav');
  let profile = null, storageWarning = '', page = 'home';
  let today = E.japanToday(), selectedDay = today, calendarMonth = today.slice(0, 7), calendarMode = 'day';
  let selectedStar = 0, selectedPositive = true, compatResult = null, deferredInstall = null, registration = null;
  let offlineReady = false, toastTimer;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateLabel = iso => { const p = E.parseDate(iso); return `${p.year}年${p.month}月${p.day}日`; };
  const scopeLabel = (iso, scale) => { const p = E.parseDate(iso); return scale === 'year' ? `${p.year}年` : scale === 'month' ? `${p.year}年${p.month}月` : dateLabel(iso); };
  const getProfile = () => profile ? E.birthProfile(profile.birthday, today) : null;
  function toast(message) {
    const el = document.querySelector('#toast'); el.textContent = message; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 5000);
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) profile = E.validateBackup(JSON.parse(raw), today);
  } catch (_) { storageWarning = '保存した情報を読み込めませんでした。バックアップから復元するか、もう一度登録してください。'; }
  if (profile) { selectedStar = getProfile().star; selectedPositive = getProfile().positive; }
  function saveProfile(value) {
    const backup = { app:'rokusei-diary', schema:1, profile:value };
    const valid = E.validateBackup(backup, today);
    try { localStorage.setItem(KEY, JSON.stringify(backup)); storageWarning = ''; }
    catch (_) { storageWarning = 'この環境では情報を保存できません。今回は利用できますが、再起動すると再登録が必要です。通常のブラウザで開き、保存を許可してください。'; }
    profile = valid;
    const p = getProfile(); selectedStar = p.star; selectedPositive = p.positive;
  }
  function orbit(star = 0, caption = 'YOUR CELESTIAL GUIDE') {
    return `<div class="orbit" aria-hidden="true"><span class="orbit-ring"></span><span class="orbit-symbol">${D.stars[star].symbol}</span><i></i><span class="orbit-caption">${caption}</span></div>`;
  }
  function pageHead(en, title, description = '') {
    return `<div class="page-head"><p class="eyebrow">${en}</p><h1 class="heading">${title}</h1>${description ? `<p class="muted small">${description}</p>` : ''}</div>`;
  }
  function birthdayFields(prefix, birthday = '') {
    const [by,bm,bd] = birthday.split('-').map(Number);
    const currentYear = E.parseDate(today).year;
    let years = '<option value="">年</option>';
    for (let y = currentYear; y >= 1900; y--) years += `<option value="${y}"${y === by ? ' selected' : ''}>${y}年</option>`;
    let months = '<option value="">月</option>', days = '<option value="">日</option>';
    for (let m = 1; m <= 12; m++) months += `<option value="${m}"${m === bm ? ' selected' : ''}>${m}月</option>`;
    const maxDays = by && bm ? new Date(Date.UTC(by,bm,0)).getUTCDate() : 31;
    for (let d = 1; d <= maxDays; d++) days += `<option value="${d}"${d === bd ? ' selected' : ''}>${d}日</option>`;
    return `<div class="field"><span>生年月日 <small>必須</small></span><div class="date-selects" data-birthday="${prefix}"><select id="${prefix}-year" aria-label="生まれた年" required>${years}</select><select id="${prefix}-month" aria-label="生まれた月" required>${months}</select><select id="${prefix}-day" aria-label="生まれた日" required>${days}</select></div></div>`;
  }
  function readBirthday(prefix) {
    const values = ['year','month','day'].map(k => document.getElementById(`${prefix}-${k}`).value);
    if (values.some(v => !v)) throw new Error('生年月日の年・月・日を選んでください。');
    const birthday = `${values[0]}-${values[1].padStart(2,'0')}-${values[2].padStart(2,'0')}`;
    E.birthProfile(birthday, today); return birthday;
  }
  function registrationForm(edit = false) {
    return `<form id="profile-form" novalidate><label class="field"><span>ニックネーム <small>任意</small></span><input id="nickname" type="text" placeholder="あなた" maxlength="30" autocomplete="nickname" value="${esc(profile?.nickname)}"></label>${birthdayFields('birth',profile?.birthday)}<p class="form-error" id="profile-error" role="alert"></p><button class="button full" type="submit">${edit ? '登録内容を保存する' : '私の運命星を調べる'} <span aria-hidden="true">→</span></button><p class="small muted" style="margin:14px 0 0">生年月日と名前は、この端末内だけに保存します。</p></form>`;
  }
  function onboarding() {
    return `<section class="onboarding">${orbit(0,'A LITTLE GUIDE FOR EVERY DAY')}<p class="eyebrow">YOUR PERSONAL STAR DIARY</p><h1 class="heading">今日の星を、<br>暮らしのヒントに。</h1><p class="intro">生年月日を一度登録するだけ。<br>今日・今月・今年の運気を、あなたの手元に。</p><div class="panel">${registrationForm()}</div>${storageWarning ? `<p class="form-error">${esc(storageWarning)}</p>` : ''}<div class="feature-row"><span>✧ ログイン不要</span><span>✧ 端末内に保存</span><span>✧ オフライン対応</span></div><p class="notice">六星占術の周期を参考にした非公式アプリです。<br>占いは自分を振り返るヒントとしてお楽しみください。</p></section>`;
  }
  function reigoBlock(p, c) {
    if (!p.reigo) return '';
    const sub = D.cycles[c.subIndex];
    return `<section class="sub-panel"><p class="eyebrow">REIGO · ANOTHER PERSPECTIVE</p><h3>もうひとつの星：${E.STARS[p.opposite]}（${p.positive?'＋':'−'}）</h3><p>サブの運気は〈${sub.name}〉。${sub.title}</p><p>${sub.description}</p><p>メインとサブの両方を読み、今の状況に合うヒントを選んでください。</p></section>`;
  }
  function domainCards(index) {
    const c = D.cycles[index];
    return `<div class="domain-grid">${[['♡','恋愛・家庭',c.love],['◇','仕事・勉強',c.work],['◈','お金',c.money],['◎','人間関係',c.relationship]].map(([icon,title,text])=>`<article class="domain-card"><h3>${icon}　${title}</h3><p>${text}</p></article>`).join('')}</div>`;
  }

  function dailyDetail(p, iso) {
    const day=E.cycle(p,iso,'day'), month=E.cycle(p,iso,'month'), year=E.cycle(p,iso,'year');
    const reading=D.dailyReading(p,day,month,year);
    return `<div class="daily-reading"><section class="panel"><p class="eyebrow">YOUR DAY IN CONTEXT</p><h2>今日と、今月・今年の流れ</h2><p>${reading.context}</p>${reading.reigo?`<div class="sub-panel"><h3>霊合星人の今日の読み方</h3><p>${reading.reigo}</p></div>`:''}</section><div class="section-title"><h2>分野ごとの詳しい日運</h2><small>DAILY READING</small></div><div class="daily-grid">${reading.cards.map(card=>`<article class="domain-card daily-card"><h3>${card.title}</h3><p>${card.text}</p><details class="disclosure"><summary>${p.label}のあなたへのヒント</summary><p>${card.personal}</p></details></article>`).join('')}</div><section class="panel"><p class="eyebrow">THREE SMALL ACTIONS</p><h2>この日に試したいこと</h2><ul class="daily-actions">${reading.actions.map(action=>`<li>${action}</li>`).join('')}</ul><p class="tiny muted">すべて行う必要はありません。実際の予定に合うものを一つ選んでください。</p></section><section class="panel"><h2>一日の過ごし方の提案</h2><p class="tiny muted">時刻別の吉凶を計算したものではありません。起床・活動・休息のタイミングに合わせてお使いください。</p>${reading.plan.map(([label,text])=>`<div class="daily-plan"><h3>${label}</h3><p>${text}</p></div>`).join('')}</section></div>`;
  }

  function periodCard(p, scale) {
    const c = E.cycle(p,today,scale), content = D.cycles[c.index];
    return `<button class="period-card" data-detail="${scale}" data-date="${today}"><span class="arrow" aria-hidden="true">↗</span><p class="period-label">${scale==='month'?'今月':'今年'} · ${scopeLabel(today,scale)}</p><span class="period-name">${c.name}</span><span class="period-title">${content.title}</span>${c.subName?`<p class="sub-cycle">サブ：${c.subName}</p>`:''}</button>`;
  }
  function home() {
    const p = getProfile(), c = E.cycle(p,today), content = D.cycles[c.index];
    const weekday = new Intl.DateTimeFormat('ja-JP',{weekday:'long',timeZone:'UTC'}).format(new Date(E.parseDate(today).time));
    return `<div class="greeting"><div><p class="eyebrow">A MOMENT WITH YOUR STAR</p><h1>${esc(profile.nickname || 'あなた')}の星の手帳</h1><p>${dateLabel(today)} ${weekday} · 日本時間</p></div><span class="star-badge">${p.label}${p.reigo?'<br>霊合星人':''}</span></div>${storageWarning?`<p class="form-error">${esc(storageWarning)}</p>`:''}<section class="hero"><div class="hero-content"><p class="hero-date">TODAY'S FORTUNE · 今日の運勢</p><div class="cycle-line"><h2 class="cycle-name" style="color:${content.color}">${c.name}</h2><span class="cycle-kana">${content.kana}</span></div><span class="cycle-tag">${content.label}</span><h2>${content.title}</h2><p class="description">${content.description}</p>${c.subName?`<p class="sub-cycle">霊合星人のサブ運気：${c.subName}</p>`:''}<button class="text-button" data-detail="day" data-date="${today}">今日の詳しい運勢</button></div>${orbit(p.star)}</section><div class="period-grid">${periodCard(p,'month')}${periodCard(p,'year')}</div>${dailyDetail(p,today)}<div class="panel"><p class="eyebrow">KNOW YOURSELF</p><h2>${D.stars[p.star].title}</h2><p class="small muted">${D.stars[p.star].summary}</p><button class="text-button" data-goto="stars">あなたの運命星を詳しく読む</button></div><p class="notice">運気は12の周期から計算し、解説は本アプリ独自の文章です。同じ星・同じ周期には同じ基本解説が表示されます。結果は出来事や成果を保証するものではありません。</p>`;
  }
  function fortuneDetail(p, iso, scale, inDialog = false) {
    const c = E.cycle(p,iso,scale), data = D.cycles[c.index], s = D.scopes[scale];
    return `<section>${inDialog ? `<p class="eyebrow">${p.label}</p><h2 id="dialog-title" class="heading">${scopeLabel(iso,scale)}の${scale==='day'?'日運':scale==='month'?'月運':'年運'}</h2>` : `<p class="eyebrow">${scopeLabel(iso,scale)} · ${scale==='day'?'日運':scale==='month'?'月運':'年運'}</p>`}<div class="cycle-line"><h3 class="cycle-name" style="color:${data.color}">${data.name}</h3><span class="cycle-kana">${data.kana}</span><span class="cycle-tag">${data.label}</span></div><h3 style="font-family:var(--serif);font-weight:400">${data.title}</h3><p class="small muted">${s.intro} ${data.description}</p><div class="action-card"><div><p class="eyebrow">${s.actionLabel}</p><p>${data.action}</p><p class="tiny muted">${s.suffix}</p></div></div>${scale==='day'?dailyDetail(p,iso):domainCards(c.index)+reigoBlock(p,c)}<p class="notice">運気名は周期から算出しています。過ごし方や分野別の文章は独自解説です。占いだけで重要な判断を決めず、実際の状況と照らしてお読みください。</p></section>`;
  }
  function calendar() {
    const p = getProfile(), [year,month] = calendarMonth.split('-').map(Number);
    let content = '';
    if (calendarMode === 'day') {
      const first = `${calendarMonth}-01`, offset = new Date(E.parseDate(first).time).getUTCDay();
      const days = new Date(Date.UTC(year,month,0)).getUTCDate();
      content = `<div class="panel"><div class="calendar-head"><button class="icon-button" data-month-step="-1" aria-label="前の月">‹</button><h2>${year}年${month}月</h2><button class="icon-button" data-month-step="1" aria-label="次の月">›</button></div><div class="calendar-grid">${['日','月','火','水','木','金','土'].map(w=>`<span class="weekday">${w}</span>`).join('')}${'<span></span>'.repeat(offset)}${Array.from({length:days},(_,i)=>{
        const iso = `${calendarMonth}-${String(i+1).padStart(2,'0')}`, c = E.cycle(p,iso);
        return `<button class="cal-day${iso===today?' today':''}${iso===selectedDay?' selected':''}" data-day="${iso}" style="--day-color:${D.cycles[c.index].color}" aria-label="${dateLabel(iso)} ${c.name}${c.subName?' サブ '+c.subName:''}" aria-pressed="${iso===selectedDay}"><strong>${i+1}</strong><small>${c.name}</small>${c.subName?`<small class="sub">${c.subName}</small>`:''}</button>`;
      }).join('')}</div><div class="legend"><span><i style="background:#d9bf8c"></i>前進・実り</span><span><i style="background:#a9c6aa"></i>始まり・成長</span><span><i style="background:#9ca6c8"></i>整える・見直す</span></div><button class="text-button" id="calendar-today">今日に戻る</button>${p.reigo?'<p class="tiny muted">各日の下段は、サブの星の運気です。</p>':''}</div><div class="panel" id="selected-fortune">${fortuneDetail(p,selectedDay,'day')}</div>`;
    } else if (calendarMode === 'month') {
      content = `<div class="calendar-head"><button class="icon-button" data-year-step="-1" aria-label="前年">‹</button><h2>${year}年の月運</h2><button class="icon-button" data-year-step="1" aria-label="翌年">›</button></div><div class="month-list">${Array.from({length:12},(_,i)=>{
        const iso = `${year}-${String(i+1).padStart(2,'0')}-01`, c = E.cycle(p,iso,'month');
        return `<button class="timeline-card${iso.slice(0,7)===today.slice(0,7)?' current':''}" data-detail="month" data-date="${iso}"><span class="time">${i+1}月</span><span class="name" style="color:${D.cycles[c.index].color}">${c.name}</span>${c.subName?`<span class="sub">サブ：${c.subName}</span>`:''}</button>`;
      }).join('')}</div><p class="notice">六星占術の月運は、同じ星・同じ月なら毎年同じ周期です。タップすると詳しく読めます。</p>`;
    } else {
      content = `<div class="calendar-head"><button class="icon-button" data-year-step="-12" aria-label="前の12年">‹</button><h2>${year}〜${Math.min(year+11,2199)}年</h2><button class="icon-button" data-year-step="12" aria-label="次の12年">›</button></div><div class="year-list">${Array.from({length:Math.min(12,2200-year)},(_,i)=>{
        const iso = `${year+i}-01-01`, c = E.cycle(p,iso,'year');
        return `<button class="timeline-card${year+i===E.parseDate(today).year?' current':''}" data-detail="year" data-date="${iso}"><span class="time">${year+i}年</span><span class="name" style="color:${D.cycles[c.index].color}">${c.name}</span><span class="sub">${c.kind==='通常'?'':c.kind}${c.subName?' · サブ：'+c.subName:''}</span></button>`;
      }).join('')}</div><p class="notice">年運は12年周期。陰影・停止・減退が大殺界に当たります。年の切り替えは1月1日です。</p>`;
    }
    return pageHead('YOUR FORTUNE CALENDAR','星の流れを、見渡す。','日・月・年の周期を、ひとつの手帳に。')+`<div class="tabs" aria-label="表示期間">${[['day','日運'],['month','月運'],['year','年運']].map(([key,label])=>`<button data-calendar-mode="${key}" class="${key===calendarMode?'active':''}" aria-pressed="${key===calendarMode}">${label}</button>`).join('')}</div>`+content;
  }
  function starsPage() {
    const own = getProfile(), star = D.stars[selectedStar];
    const viewingOwn = own.star === selectedStar && own.positive === selectedPositive;
    const view = {star:selectedStar, positive:selectedPositive, reigo:viewingOwn && own.reigo};
    const yearCycle = E.cycle(view,today,'year'), monthCycle = E.cycle(view,today,'month');
    return pageHead('SIX STARS · TWELVE RHYTHMS','あなたを知る、星のこと。','6つの星の特徴と、＋／−による運気の違い。')+`<div class="star-grid">${D.stars.map((s,i)=>`<button class="star-select${selectedStar===i?' active':''}" data-star="${i}" style="--star-color:${s.color}" aria-pressed="${selectedStar===i}"><span aria-hidden="true">${s.symbol}</span>${E.STARS[i]}</button>`).join('')}</div><div class="panel"><div class="star-intro" style="--star-color:${star.color}"><div class="symbol" aria-hidden="true">${star.symbol}</div><p class="eyebrow">${star.en}</p><h2>${E.STARS[selectedStar]}${viewingOwn?' <small class="small muted">あなたの星</small>':''}</h2><p class="tagline">${star.title}</p><div class="tag-list">${star.tags.map(t=>`<span>${t}</span>`).join('')}</div><p class="summary">${star.summary}</p></div>${star.sections.map(([title,text],i)=>`<details class="disclosure"${i===0?' open':''}><summary>${title}</summary><p>${text}</p></details>`).join('')}<p class="notice">運命星ごとの性質を参考にした独自解説です。個人の能力や適職を生年月日だけで確定するものではありません。</p></div><div class="panel"><h2>＋／−の違い</h2><p class="small muted">生まれた年の十二支で区分します。＋は子・寅・辰・午・申・戌、−は丑・卯・巳・未・酉・亥です。同じ星でも、−の運気は＋より1段階前の周期になります。</p><div class="tabs">${[true,false].map(pos=>`<button data-polarity="${pos?'plus':'minus'}" class="${pos===selectedPositive?'active':''}" aria-pressed="${pos===selectedPositive}">${pos?'＋ プラス':'− マイナス'}</button>`).join('')}</div><div class="key-value"><span>今年 · ${E.parseDate(today).year}年</span><strong>${yearCycle.name}${yearCycle.subName?' / '+yearCycle.subName:''}</strong></div><div class="key-value"><span>今月 · ${E.parseDate(today).month}月</span><strong>${monthCycle.name}${monthCycle.subName?' / '+monthCycle.subName:''}</strong></div></div>${viewingOwn?`<div class="panel"><h2>あなたの判定結果</h2><div class="key-value"><span>運命星</span><strong>${own.label}</strong></div><div class="key-value"><span>星数</span><strong>${own.number}</strong></div><div class="key-value"><span>生まれ年の十二支</span><strong>${own.branchLabel}</strong></div><div class="key-value"><span>霊合星人</span><strong>${own.reigo?'該当します':'該当しません'}</strong></div>${own.reigo?`<p class="small muted">メインは${own.label}。対になる${E.STARS[own.opposite]}（${own.positive?'＋':'−'}）の性質や運気も併せて読む区分です。</p>`:''}</div>`:''}`;
  }
  function compatReading(a,b) {
    const r=window.RokuseiCompat.compare(a,b),timing=window.RokuseiCompat.timing(a,b,today,E);
    const sub=p=>p.reigo?`${E.STARS[p.opposite]}（${p.positive?'＋':'−'}）`:'';
    return `<section class="compat-result"><div class="panel"><p class="eyebrow">TWO STARS · ONE CONVERSATION</p><div class="compat-pair">${[a,b].map((p,i)=>`${i?'<span class="compat-separator" aria-hidden="true">×</span>':''}<div class="compat-star"><div class="symbol" aria-hidden="true">${D.stars[p.star].symbol}</div><p>${i?esc(compatResult.nickname||'お相手'):esc(profile.nickname||'あなた')}</p><p>${p.label}</p><span class="tiny muted">${p.reigo?'霊合星人 · サブ '+sub(p):''}</span></div>`).join('')}</div><div class="compat-score"><p class="eyebrow">アプリ独自の相性度</p><p class="score-number">${r.total}<span>％</span></p><p class="score-description">性格傾向の近さを比較する、娯楽用の目安</p><p class="tiny muted">公式の相性度・的中率・交際や結婚の成功確率ではありません。</p></div><h2 class="compat-label">${r.title}</h2><p>${r.summary}</p><p class="small muted">「こうなる」と決める結果ではなく、関係を育てる可能性と話し合うポイントとしてお読みください。</p><details class="disclosure score-method"><summary>相性度の計算方法と限界</summary><p>6星の特徴を参考に、このアプリで独自に設定した6つの傾向（行動速度・感情表現・計画性・一人の時間・変化志向・実用性）を比較します。これらは実際の性格を測定した値ではなく、編集上の仮定です。近いほど高いスコアとなり、違いが補い合う良さは数値に表していません。</p><p>各傾向は1〜5。分野ごとに重みをつけた差の平均をdとし、95−12.5×dを5％刻みに丸めます。総合値は6分野の平均を同じ刻みで表示。同じ星でも満点とはしません。低い数値も「悪い関係」という意味ではありません。</p><p>霊合星人は主星75％・サブ星25％の独自配分で傾向を比較します。この比率も公式ルールではありません。＋／−と日・月・年の運気は相性度に加減せず、下の運気比較で表示します。同じ星の組み合わせなら同じ基本結果になり、生年月日だけで個人の性格や関係の未来までは分かりません。</p></details></div><div class="section-title"><h2>分野別の相性度</h2><small>SIX PERSPECTIVES</small></div><div class="compat-score-grid">${r.scores.map(s=>`<article class="domain-card"><div class="score-heading"><h3>${s.title}</h3><strong>${s.value}％</strong></div><div class="score-track" aria-hidden="true"><span style="width:${s.value}%"></span></div><p>${s.question}</p></article>`).join('')}</div><p class="tiny muted">数値は傾向の近さの目安。高くても良い関係を保証せず、低くても補い合える関係を否定しません。</p><div class="section-title"><h2>ふたりの関係を詳しく読む</h2><small>YOUR RELATIONSHIP</small></div><div class="compat-reading-grid">${r.sections.map(s=>`<article class="panel compat-reading-card"><h3>${s.title}</h3><p>${s.text}</p><div class="compat-action"><p class="eyebrow">関係を育てるヒント</p><p>${s.action}</p></div></article>`).join('')}</div>${r.reigo?`<div class="sub-panel"><h3>霊合星人を含むふたりの読み方</h3><p>${a.reigo?'あなたのサブ星は'+sub(a)+'。':''}${b.reigo?'相手のサブ星は'+sub(b)+'。':''}数値には上記の独自配分を使い、関係の文章は主星の組み合わせを中心に書いています。</p><p>${a.reigo?'あなたのサブ星の視点：'+D.stars[a.opposite].summary:''}</p><p>${b.reigo?'相手のサブ星の視点：'+D.stars[b.opposite].summary:''}</p></div>`:''}<div class="section-title"><h2>今日・今月・今年のふたり</h2><small>CYCLES TOGETHER</small></div><div class="panel">${timing.map(x=>`<article class="compat-timing"><h3>${x.label}の運気</h3><div class="key-value"><span>あなた</span><strong>${x.a.name}${x.a.subName?' ／ サブ '+x.a.subName:''}</strong></div><div class="key-value"><span>お相手</span><strong>${x.b.name}${x.b.subName?' ／ サブ '+x.b.subName:''}</strong></div><p>${x.text}</p></article>`).join('')}</div><p class="notice">本アプリ独自の比較スコアと解説です。公式の相性鑑定ではありません。実際の相手の言葉や行動を大切にし、関係を続ける・終える判断を占いだけで決めないでください。相手の入力情報は保存・外部送信しません。</p></section>`;
  }
  function compat() {
    return pageHead('TWO PERSONALITIES','ふたりの星を、知る。','相性度・関係の傾向・8つの視点から、ふたりを知る。')+`<div class="panel"><form id="compat-form" novalidate><label class="field"><span>お相手のニックネーム <small>任意</small></span><input id="partner-name" maxlength="30" placeholder="お相手" value="${esc(compatResult?.nickname)}"></label>${birthdayFields('partner',compatResult?.birthday)}<p class="form-error" id="compat-error" role="alert"></p><button class="button full" type="submit">ふたりの詳しい相性を見る <span aria-hidden="true">→</span></button><p class="small muted">お相手の入力内容は端末に保存しません。</p></form></div>${compatResult?compatReading(getProfile(),E.birthProfile(compatResult.birthday,today)):''}`;
  }
  function settings() {
    const p = getProfile();
    return pageHead('YOUR DIARY SETTINGS','手帳の設定。','登録情報・バックアップ・ホーム画面への追加。')+`${p?`<div class="panel"><h2>登録情報</h2><p class="small muted">${p.label}${p.reigo?' · 霊合星人':''}</p>${registrationForm(true)}${storageWarning?`<p class="form-error">${esc(storageWarning)}</p>`:''}</div><div class="panel settings-section"><h2>バックアップと復元</h2><p class="backup-note">保存データには生年月日とニックネームが含まれます。自分で管理し、GitHubにアップロードしないでください。Safariとホーム画面のアプリで保存領域が分かれる場合も、復元で引き継げます。</p><div class="button-row"><button class="button secondary" id="export-backup">バックアップを保存</button><button class="button secondary" id="import-backup">ファイルから復元</button></div><input id="backup-file" type="file" accept="application/json,.json" hidden></div>`:`<div class="panel"><p class="small muted">生年月日を登録すると、あなたの運勢が表示されます。</p><button class="button" data-goto="home">登録画面へ</button><button class="button secondary" id="import-backup">バックアップから復元</button><input id="backup-file" type="file" accept="application/json,.json" hidden></div>`}<div class="panel"><h2>ホーム画面に追加</h2><p class="small muted">最初に公開したサイトをブラウザで開いてください。</p><h3 class="small">iPhone・iPad</h3><ol class="install-list"><li>Safariでこのサイトを開く。</li><li>共有ボタンを押す。</li><li>「ホーム画面に追加」を選び、「追加」を押す。</li><li>追加したアイコンから開き、生年月日を登録する。</li></ol><h3 class="small">Android</h3><p class="small muted">Chromeのメニューから「ホーム画面に追加」または「アプリをインストール」を選んでください。</p><button class="button secondary" id="install-button"${deferredInstall?'':' hidden'}>アプリをインストール</button><div class="status-line"><span class="status-dot"></span><span id="offline-status">${statusText()}</span></div><p class="tiny muted">初回は通信が必要です。「オフラインの準備ができています」と表示されたら、通信がなくても利用できます。端末のデータ削除後は、再読み込みが必要です。</p></div><div class="panel"><h2>アプリについて</h2><div class="key-value"><span>バージョン</span><strong>${VERSION}</strong></div><div class="key-value"><span>更新日</span><strong>2026年10月6日</strong></div><div class="key-value"><span>日付の基準</span><strong>日本時間（Asia/Tokyo）</strong></div><div class="key-value"><span>生年月日の対応</span><strong>1900年1月1日〜今日</strong></div><p class="small muted">運命星・＋／−・霊合星人と12の運気を計算します。星数は日付の干支番号、年の区分は暦年で算出します。月運は毎年同じ月に同じ周期、日運は12日ごとの周期です。</p><p class="small muted">性格・過ごし方・相性比較の文章は独自解説であり、公式の鑑定文ではありません。相性度は独自に設定した性格傾向の近さを数値化した娯楽用モデルで、公式鑑定や実証された成功確率ではありません。ラッキーカラーは算出していません。</p><h3 class="small">プライバシー</h3><p class="small muted">入力した生年月日・ニックネームをサーバーや外部APIに送信する処理はありません。広告・解析・ログイン機能もありません。ブラウザのデータを消すと登録は消えます。公開サイトへのアクセスはホスティング側の通信記録に残る場合があります。</p><details class="disclosure"><summary>参考資料</summary><ul class="source-list">${D.sources.map(([title,url])=>`<li><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></li>`).join('')}</ul><p>資料確認日：2026年10月2日。公開資料で判定・周期を照合し、本文は独自に執筆しています。</p></details><p class="notice">六星占術を参考にした非公式の占いアプリです。細木数子・細木かおり氏および公式サービスとの提携・監修関係はありません。宿命大殺界・方位鑑定は含みません。</p><button class="text-button" id="check-update">アプリの更新を確認</button></div>${p?`<div class="panel"><h2>登録情報を削除</h2><p class="small muted">この端末の登録を削除して、初回登録に戻します。</p><button class="button danger" id="delete-profile">登録情報を削除する</button></div>`:''}`;
  }
  function statusText() {
    if (location.protocol === 'file:') return '公開サイトでオフライン機能が有効になります';
    return offlineReady ? 'オフラインの準備ができています' : 'オフラインの準備中です';
  }
  function render(scroll = false) {
    if (!profile && page !== 'settings') main.innerHTML = onboarding();
    else main.innerHTML = ({home,calendar,stars:starsPage,compat,settings}[page] || home)();
    nav.hidden = !profile;
    document.querySelectorAll('[data-page]').forEach(el=>{el.classList.toggle('active',el.dataset.page===page);if(el.dataset.page===page)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    if (scroll) { window.scrollTo({top:0,behavior:'instant'}); main.focus({preventScroll:true}); }
  }
  function go(next) {
    page = next;
    if (next === 'stars' && profile) {const p=getProfile();selectedStar=p.star;selectedPositive=p.positive;}
    render(true);
  }
  function detail(iso,scale) {
    const dialog = document.querySelector('#detail-dialog');
    document.querySelector('#dialog-content').innerHTML = fortuneDetail(getProfile(),iso,scale,true);
    dialog.showModal();
  }
  document.querySelector('#close-dialog').addEventListener('click',()=>document.querySelector('#detail-dialog').close());
  document.querySelector('#detail-dialog').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}});
  document.querySelector('#open-settings').addEventListener('click',()=>go('settings'));
  document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();go('home');});
  nav.addEventListener('click',e=>{const btn=e.target.closest('[data-page]');if(btn)go(btn.dataset.page);});
  main.addEventListener('submit',e=>{
    e.preventDefault();
    if (e.target.id==='profile-form') {
      try {
        const nickname=document.querySelector('#nickname').value.trim().slice(0,30), birthday=readBirthday('birth');
        saveProfile({nickname,birthday});go('home');toast(storageWarning||'登録しました。次からは運勢がすぐ表示されます。');
      } catch(error){document.querySelector('#profile-error').textContent=error.message;}
    }
    if (e.target.id==='compat-form') {
      try {compatResult={birthday:readBirthday('partner'),nickname:document.querySelector('#partner-name').value.trim().slice(0,30)};render();}
      catch(error){document.querySelector('#compat-error').textContent=error.message;}
    }
  });
  main.addEventListener('change',async e=>{
    const group=e.target.closest('[data-birthday]');
    if(group && !e.target.id.endsWith('-day')) {
      const prefix=group.dataset.birthday, y=Number(document.getElementById(prefix+'-year').value), m=Number(document.getElementById(prefix+'-month').value), select=document.getElementById(prefix+'-day'), previous=Number(select.value);
      const last=y&&m?new Date(Date.UTC(y,m,0)).getUTCDate():31;
      select.innerHTML='<option value="">日</option>'+Array.from({length:last},(_,i)=>`<option value="${i+1}">${i+1}日</option>`).join('');select.value=previous&&previous<=last?String(previous):'';
    }
    if(e.target.id==='backup-file' && e.target.files[0]) {
      try {
        const file=e.target.files[0];if(file.size>65536)throw new Error('バックアップファイルのサイズが大きすぎます。');
        const restored=E.validateBackup(JSON.parse(await file.text()),today);
        if(!window.confirm(`${restored.nickname||'あなた'} / ${dateLabel(restored.birthday)} の登録情報を復元しますか？${profile?'現在の登録情報は置き換わります。':''}`))return;
        saveProfile(restored);compatResult=null;go('home');toast(storageWarning||'バックアップを復元しました。');
      }catch(error){toast(error instanceof SyntaxError?'JSON形式のバックアップファイルを選んでください。':error.message);}
      finally {e.target.value='';}
    }
  });
  main.addEventListener('click',async e=>{
    const btn=e.target.closest('button');if(!btn)return;
    if(btn.dataset.goto){go(btn.dataset.goto);return;}
    if(btn.dataset.detail){detail(btn.dataset.date,btn.dataset.detail);return;}
    if(btn.dataset.day){selectedDay=btn.dataset.day;render();return;}
    if(btn.dataset.monthStep){const [y,m]=calendarMonth.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+Number(btn.dataset.monthStep),1));const yy=d.getUTCFullYear();if(yy<1900||yy>2199){toast('カレンダーは1900〜2199年に対応しています。');return;}calendarMonth=d.toISOString().slice(0,7);selectedDay=calendarMonth+'-01';render();return;}
    if(btn.dataset.yearStep){const year=Number(calendarMonth.slice(0,4))+Number(btn.dataset.yearStep);if(year<1900||year>2199){toast('カレンダーは1900〜2199年に対応しています。');return;}calendarMonth=year+calendarMonth.slice(4);render();return;}
    if(btn.dataset.calendarMode){calendarMode=btn.dataset.calendarMode;render();return;}
    if(btn.dataset.star){selectedStar=Number(btn.dataset.star);const own=getProfile();selectedPositive=own.star===selectedStar?own.positive:true;render();return;}
    if(btn.dataset.polarity){selectedPositive=btn.dataset.polarity==='plus';render();return;}
    if(btn.id==='calendar-today'){calendarMonth=today.slice(0,7);selectedDay=today;render();return;}
    if(btn.id==='export-backup') {
      const data={app:'rokusei-diary',schema:1,version:VERSION,exportedAt:new Date().toISOString(),profile};
      const file=new File([JSON.stringify(data,null,2)],`rokusei-backup-${today}.json`,{type:'application/json'});
      try {
        if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'六星手帳のバックアップ'});return;}
        const url=URL.createObjectURL(file), a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('バックアップを保存しました。');
      }catch(error){if(error.name!=='AbortError')toast('バックアップを保存できませんでした。通常のブラウザでお試しください。');}
      return;
    }
    if(btn.id==='import-backup'){document.querySelector('#backup-file').click();return;}
    if(btn.id==='delete-profile') {
      if(!window.confirm('この端末の登録情報を削除しますか？必要なら先にバックアップしてください。'))return;
      try{localStorage.removeItem(KEY);}catch(_){toast('保存情報を削除できませんでした。ブラウザの設定を確認してください。');return;}
      profile=null;compatResult=null;storageWarning='';go('home');toast('登録情報を削除しました。');return;
    }
    if(btn.id==='install-button'&&deferredInstall){await deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;render();return;}
    if(btn.id==='check-update') {
      if(!registration){toast('公開サイトをオンラインで開いてお試しください。');return;}
      if(!navigator.onLine){toast('更新の確認には通信が必要です。');return;}
      try{await registration.update();if(registration.waiting)showUpdate();else toast('更新を確認しました。新しい版が届くと上部に表示します。');}catch(_){toast('更新を確認できませんでした。時間をおいてお試しください。');}
    }
  });
  function refreshDate() {
    const next=E.japanToday();if(next===today)return;
    const previous=today;today=next;
    if(selectedDay===previous)selectedDay=next;
    if(calendarMonth===previous.slice(0,7))calendarMonth=next.slice(0,7);
    // 編集中の入力は維持。運勢・暦などの日付依存ページを更新する。
    if(profile&&(['home','calendar','stars'].includes(page)||(page==='compat'&&compatResult&&!document.querySelector('#compat-form')?.contains(document.activeElement))))render();
  }
  setInterval(refreshDate,30000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshDate();});
  window.addEventListener('focus',refreshDate);
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;if(page==='settings')render();});
  window.addEventListener('appinstalled',()=>{deferredInstall=null;toast('ホーム画面に追加しました。');});
  function showUpdate(){document.querySelector('#update-banner').hidden=false;}
  document.querySelector('#apply-update').addEventListener('click',()=>{registration?.waiting?.postMessage({type:'SKIP_WAITING'});});
  function setReady(){offlineReady=true;const el=document.querySelector('#offline-status');if(el)el.textContent=statusText();}
  let updating=false;
  if('serviceWorker' in navigator && location.protocol!=='file:') {
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updating)location.reload();else setReady();});
    navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(reg=>{
      registration=reg;if(reg.waiting)showUpdate();
      reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate();});});
      navigator.serviceWorker.ready.then(setReady);
    }).catch(()=>{const el=document.querySelector('#offline-status');if(el)el.textContent='オフラインの準備ができませんでした。オンラインで再読み込みしてください。';});
    document.querySelector('#apply-update').addEventListener('click',()=>{updating=true;});
  }
  render();
})();
