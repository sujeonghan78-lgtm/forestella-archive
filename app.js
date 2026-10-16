// 화면 전환과 그리기
(function () {
  const view = document.getElementById('view');
  let data = null;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function header() {
    return `
      <header class="brand">
        <span class="brand-name">숲별 기록장</span>
        <span class="brand-sub">포레스텔라 비공식 팬 아카이브</span>
      </header>`;
  }

  function soon(title, note) {
    return `
      <section class="soon">
        <h1 class="h1">${esc(title)}</h1>
        <p>${esc(note)}</p>
      </section>`;
  }

  const routes = {
    home: () => `
      ${header()}
      ${soon('홈', '검색창, N년 전 오늘, 랜덤 무대가 다음 단계에서 들어와요.')}
      <p class="status">기록 ${data.events.length}건, 관련 영상 ${data.videos.length}개를 불러왔어요.</p>`,
    search: () => soon('검색', '다음 단계에서 만들어요.'),
    songs: () => soon('곡 아카이브', '사이트 2단계에서 만들어요.'),
    timeline: () => soon('연표', '사이트 2단계에서 만들어요.'),
    more: () => soon('더보기', '사이트 3단계에서 만들어요.'),
  };

  function currentRoute() {
    const path = location.hash.replace(/^#\/?/, '').split('/')[0];
    return routes[path] ? path : 'home';
  }

  function render() {
    const name = currentRoute();
    document.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.tab === name;
      t.classList.toggle('on', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    if (!data) return;
    view.innerHTML = routes[name]();
  }

  function showLoading() {
    view.innerHTML = `${header()}<p class="status">기록을 불러오는 중이에요…</p>`;
  }

  function showError(err) {
    view.innerHTML = `
      ${header()}
      <section class="soon">
        <p>기록을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.</p>
        <button type="button" class="btn" id="retry">다시 시도</button>
        <p class="status">${esc(err.message)}</p>
      </section>`;
    document.getElementById('retry').onclick = start;
  }

  async function start() {
    showLoading();
    try {
      data = await window.DATA.load(next => { data = next; render(); });
      render();
    } catch (err) {
      showError(err);
    }
  }

  window.addEventListener('hashchange', () => { render(); view.scrollTop = 0; window.scrollTo(0, 0); });
  render();
  start();
})();
