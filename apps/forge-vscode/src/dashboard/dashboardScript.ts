export function dashboardScript(ctxJson: string, repo: string): string {
  return `
  <script>
    const vsc = acquireVsCodeApi();
    let activeTab = 'overview';
    let findings = [];
    const ctx = ${ctxJson};

    function switchTab(t) {
      document.querySelectorAll('.tab,.tab-content').forEach(e=>e.classList.remove('active'));
      const tabEl = document.querySelector('.tab[data-tab="'+t+'"]');
      if(tabEl) tabEl.classList.add('active');
      const contentEl = document.getElementById('tab-'+t);
      if(contentEl) contentEl.classList.add('active');
      activeTab = t;
    }

    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => switchTab(t.dataset.tab));
    });
    document.getElementById('ov-review-btn').addEventListener('click', () => switchTab('review'));
    document.getElementById('ov-chat-btn').addEventListener('click', () => switchTab('chat'));
    document.getElementById('ov-prs-btn').addEventListener('click', () => switchTab('prs'));
    document.getElementById('refresh-btn').addEventListener('click', () => refresh());
    document.getElementById('pr-load').addEventListener('click', loadPRs);
    document.getElementById('pr-repo').addEventListener('keydown', e => { if(e.key==='Enter') loadPRs(); });
    document.getElementById('pr-list').addEventListener('click', e => {
      const item = e.target.closest('.list-item');
      if (item && item.dataset.url) openReview(item.dataset.url);
    });
    document.getElementById('rv-submit').addEventListener('click', submitReview);
    document.getElementById('rv-url').addEventListener('keydown', e => { if(e.key==='Enter') submitReview(); });
    document.getElementById('chat-send').addEventListener('click', sendChat);
    document.getElementById('chat-input').addEventListener('keydown', e => {
      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}
    });
    document.getElementById('chat-input').addEventListener('input', () => {
      const el = document.getElementById('chat-input');
      el.style.height='auto';el.style.height=el.scrollHeight+'px';
    });

    window.addEventListener('message', e => {
      const d = e.data;
      if(d.type==='context') renderContext(d, 'ov-ctx');
      if(d.type==='data') updateOverview(d);
      if(d.type==='prs') renderPRs(d.prs);
      if(d.type==='progress'){document.getElementById('review-form').style.display='none';document.getElementById('review-progress').style.display='block';document.getElementById('rv-progress-text').textContent=d.message}
      if(d.type==='finding'){findings.push(d);renderFinding(d)}
      if(d.type==='summary')renderSummary(d);
      if(d.type==='reviewDone'){document.getElementById('review-progress').style.display='none'}
      if(d.type==='reviewError'){document.getElementById('review-progress').style.display='block';document.getElementById('rv-progress-text').textContent='❌ '+d.message}
      if(d.type==='chatMessage')appendChat(d.role, d.content);
      if(d.type==='chatExecuting'){document.getElementById('chat-send').disabled=d.executing}
    });

    function renderContext(info, elId) {
      const el = document.getElementById(elId);
      el.innerHTML = '<div class="row"><span>📁 ' + esc(info.projectPath||'No workspace') + '</span><span style="color:var(--vscode-charts-yellow)">' + (info.gitBranch?'⎇ '+info.gitBranch:'') + '</span></div>' +
        '<div class="row"><span class="provider">' + (info.provider||'No provider') + '</span><span class="services">' + (info.ghConnected?'✅ GitHub':'❌ GitHub') + '  ' + (info.glabConnected?'✅ GitLab':'❌ GitLab') + '</span></div>';
    }

    function updateOverview(d) {
      document.getElementById('prsOpen').textContent = d.prsOpen||0;
      document.getElementById('reviewsTotal').textContent = d.reviewsTotal||0;
      document.getElementById('findingsTotal').textContent = d.findingsTotal||0;
      document.getElementById('ov-reviews').innerHTML = d.recentReviews&&d.recentReviews.length?d.recentReviews.map(r=>'<div class="list-item"><span class="num">'+r.findings+'x</span><span class="title">'+(r.url||'unknown')+'</span><span class="meta">'+ago(r.date)+'</span></div>').join(''):'<div class="empty">No reviews</div>';
    }

    function loadPRs() {
      const repo = document.getElementById('pr-repo').value.trim() || (ctx.projectPath||'').split('/').slice(-2).join('/');
      document.getElementById('pr-repo').value = repo;
      document.getElementById('pr-list').innerHTML = '<div class="empty">Loading...</div>';
      vsc.postMessage({ type: 'loadPRs', repo });
    }

    function renderPRs(prs) {
      if(!prs||!prs.length){document.getElementById('pr-list').innerHTML='<div class="empty">No PRs found</div>';return}
      document.getElementById('pr-list').innerHTML = prs.map(p =>
        '<div class="list-item" data-url="' + esc(p.url) + '">' +
          '<span class="num">#'+p.number+'</span><span class="title">'+esc(p.title)+'</span>' +
          '<span class="state '+p.state+'">'+p.state+'</span>' +
          '<span class="meta">'+esc(p.author)+'</span><span class="meta">'+ago(p.time)+'</span>' +
        '</div>'
      ).join('');
    }

    function openReview(url) {
      switchTab('review');
      document.getElementById('rv-url').value = url || '';
    }

    function submitReview() {
      const url = document.getElementById('rv-url').value.trim();
      if(!/github\\.com\\/[^/]+\\/[^/]+\\/pull\\/\\d+/.test(url) && !/gitlab\\.com\\/.+\\/-\\/merge_requests\\/\\d+/.test(url)){
        document.getElementById('rv-url').classList.add('invalid');
        document.getElementById('rv-url-error').style.display='block';
        return;
      }
      document.getElementById('rv-url').classList.remove('invalid');
      document.getElementById('rv-url-error').style.display='none';
      document.getElementById('review-form').style.display='none';
      document.getElementById('review-progress').style.display='block';
      document.getElementById('review-summary').innerHTML='';
      document.getElementById('review-findings').innerHTML='';
      findings = [];
      const fmt = document.querySelector('input[name="rv-format"]:checked').value;
      vsc.postMessage({ type: 'submitReview', url, rulesFile: document.getElementById('rv-rules').value||undefined, format: fmt });
    }

    function renderFinding(f) {
      const div = document.createElement('div');
      div.className = 'finding';
      div.innerHTML = '<span class="sev '+f.severity+'">'+f.severity+'</span><span class="title">'+esc(f.title)+'</span>' +
        '<div class="file">📄 ' + esc(f.file) + (f.lineStart?':'+f.lineStart+(f.lineEnd?'-'+f.lineEnd:''):'') + ' | ' + esc(f.category) + '</div>' +
        '<div class="desc">'+esc(f.description)+'</div>' +
        '<div class="suggestion">💡 '+esc(f.suggestion)+'</div>';
      document.getElementById('review-findings').appendChild(div);
    }

    function renderSummary(s) {
      document.getElementById('review-summary').innerHTML =
        '<div class="stat critical"><div class="num">'+(s.critical||0)+'</div><div class="label">Critical</div></div>' +
        '<div class="stat major"><div class="num">'+(s.major||0)+'</div><div class="label">Major</div></div>' +
        '<div class="stat minor"><div class="num">'+(s.minor||0)+'</div><div class="label">Minor</div></div>' +
        '<div class="stat info"><div class="num">'+(s.info||0)+'</div><div class="label">Info</div></div>';
    }

    function sendChat() {
      const text = document.getElementById('chat-input').value.trim();
      if(!text) return;
      appendChat('user', text);
      document.getElementById('chat-input').value = '';
      document.getElementById('chat-input').style.height = 'auto';
      vsc.postMessage({ type: 'sendChat', text });
    }

    function appendChat(role, content) {
      const area = document.getElementById('chat-msgs');
      const div = document.createElement('div');
      div.className = 'chat-msg ' + role;
      div.textContent = content;
      area.appendChild(div);
      area.scrollTop = area.scrollHeight;
    }

    function refresh() { vsc.postMessage({ type: 'refresh' }); }

    function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;'); }
    function ago(t) { if(!t) return ''; const d=(Date.now()-new Date(t).getTime())/1000; if(d<60) return 'just now'; if(d<3600) return Math.floor(d/60)+'m ago'; if(d<86400) return Math.floor(d/3600)+'h ago'; return Math.floor(d/86400)+'d ago'; }

    renderContext(ctx, 'ov-ctx');
    document.getElementById('pr-repo').value = '${repo}';
    vsc.postMessage({ type: 'ready' });
  </script>`;
}
