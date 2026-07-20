export function commonScript(): string {
  return `
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;'); }
function ago(t) { if(!t) return ''; const d=(Date.now()-new Date(t).getTime())/1000; if(d<60) return 'just now'; if(d<3600) return Math.floor(d/60)+'m ago'; if(d<86400) return Math.floor(d/3600)+'h ago'; return Math.floor(d/86400)+'d ago'; }
function renderContext(info, elId) {
  const el = document.getElementById(elId);
  if(!el) return;
  el.innerHTML = '<div class="row"><span>📁 ' + esc(info.projectPath||'No workspace') + '</span><span class="branch">' + (info.gitBranch?'⎇ '+info.gitBranch:'') + '</span></div>' +
    '<div class="row"><span class="provider">' + (info.provider||'No provider') + '</span><span class="services">' + (info.ghConnected?'✅ GitHub':'❌ GitHub') + '  ' + (info.glabConnected?'✅ GitLab':'❌ GitLab') + '</span></div>';
}
`;
}
