(function () {
  const DATA_PATH = './data/harvard-linked-data.json';

  function currentDocsifyPath() {
    const raw = (window.location.hash || '#/').replace(/^#/, '');
    const path = raw.split('?')[0] || '/';
    return path.startsWith('/') ? path : `/${path}`;
  }

  function toDocsifyRoute(href) {
    if (!href || /^(https?:|mailto:|tel:|#\/|#|javascript:)/i.test(href)) return href;
    const trimmed = href.trim();
    let normalized;

    if (trimmed.startsWith('/')) {
      normalized = trimmed;
    } else {
      const baseParts = currentDocsifyPath().split('/').filter(Boolean);
      if (baseParts.length) baseParts.pop();
      trimmed.split('/').forEach(part => {
        if (!part || part === '.') return;
        if (part === '..') {
          baseParts.pop();
          return;
        }
        baseParts.push(part);
      });
      normalized = `/${baseParts.join('/')}`;
    }

    normalized = normalized.replace(/\.md(?=$|[?#])/, '');
    return normalized === '/' ? '#/' : `#${normalized}`;
  }

  function schoolRoute(link, schoolSlug = 'harvard') {
    const normalized = String(link || '').trim();
    if (!normalized) return '#/';
    if (normalized.startsWith('/') || normalized.startsWith('./') || normalized.startsWith('../')) return toDocsifyRoute(normalized);
    return toDocsifyRoute(`/schools/${schoolSlug}/${normalized}`);
  }

  function resolveRelativeHashRoute(href) {
    const hashPath = String(href || '').replace(/^#/, '');
    if (!/^\/\.{1,2}\//.test(hashPath)) return href;

    const relativePath = hashPath.replace(/^\//, '');
    const baseParts = currentDocsifyPath().split('/').filter(Boolean);
    if (baseParts.length) baseParts.pop();

    relativePath.split('/').forEach(part => {
      if (!part || part === '.') return;
      if (part === '..') {
        baseParts.pop();
        return;
      }
      baseParts.push(part);
    });

    return `#/${baseParts.join('/')}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function stripFrontmatter(markdown) {
    return markdown.replace(/^---\n[\s\S]*?\n---\n*/, '');
  }

  function renderMetricList(items) {
    return items.map(item => `
      <div class="linked-card metric-card">
        <div class="linked-eyebrow">${escapeHtml(item.label)}</div>
        <div class="linked-metric">${escapeHtml(item.value)}</div>
        <div class="linked-note">来源：<a href="${escapeHtml(schoolRoute(item.roomLink))}">${escapeHtml(item.sourceId)}</a></div>
      </div>
    `).join('');
  }

  function renderCaseList(cases) {
    return cases.map(item => `
      <div class="linked-card">
        <div class="linked-eyebrow">${escapeHtml(item.sourceType)}</div>
        <h4>${escapeHtml(item.sampleTitle)}</h4>
        <ul>${item.signals.map(signal => `<li>${escapeHtml(signal)}</li>`).join('')}</ul>
        <p class="linked-note">案例页：<a href="${escapeHtml(schoolRoute(item.casePath || 'case-study.md'))}">${escapeHtml(item.caseId)}</a> · 来源：<a href="#/schools/harvard/sources">${escapeHtml(item.sourceId)}</a></p>
      </div>
    `).join('');
  }

  function renderSourceUsage(items) {
    return items.map(item => `
      <div class="linked-card">
        <div class="linked-eyebrow">${escapeHtml(item.sourceType)}</div>
        <h4>${escapeHtml(item.title)}</h4>
        <p><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">打开原始来源</a></p>
        <p class="linked-note">关联页面：${item.usedIn.map(room => `<a href="${escapeHtml(schoolRoute(room.link))}">${escapeHtml(room.label)}</a>`).join(' / ')}</p>
      </div>
    `).join('');
  }

  function normalizeCaseStudyRecord(item) {
    return {
      ...item,
      school: item.school || '',
      application_cycle: String(item.application_cycle || ''),
      source_type: item.source_type || '',
      confidence_level: item.confidence_level || '',
      public_signals: Array.isArray(item.public_signals) ? item.public_signals : []
    };
  }

  function normalizeAdmissionDataRecord(item) {
    return {
      ...item,
      school: item.school || '',
      cycle_year: String(item.cycle_year || ''),
      source_role: item.source_role || '',
      metric_group: item.metric_group || '',
      track: item.track || '',
      notes: Array.isArray(item.notes) ? item.notes : []
    };
  }

  function getUniqueOptions(records, key) {
    return Array.from(new Set(records.map(item => item[key]).filter(Boolean)));
  }

  function renderExplorerFilter(label, key, options, value) {
    return `
      <label class="explorer-filter">
        <span>${escapeHtml(label)}</span>
        <select data-filter-key="${escapeHtml(key)}">
          <option value="">全部</option>
          ${options.map(option => `
            <option value="${escapeHtml(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(option)}</option>
          `).join('')}
        </select>
      </label>
    `;
  }

  function renderExplorerEmpty() {
    return `
      <div class="linked-card explorer-empty">
        <h4>当前条件下没有结果</h4>
        <p class="linked-note">请切换筛选条件，或回到“全部”查看当前样本。</p>
      </div>
    `;
  }

  function renderCaseStudyExplorerResults(records) {
    if (!records.length) return renderExplorerEmpty();
    return records.map(item => `
      <article class="linked-card explorer-result-card">
        <div class="explorer-result-topline">
          <span class="linked-eyebrow">${escapeHtml(item.school)} · ${escapeHtml(item.application_cycle)}</span>
          <span class="explorer-badge">${escapeHtml(item.source_type)}</span>
        </div>
        <h4>${escapeHtml(item.sample_title)}</h4>
        <p class="linked-note">案例 ID：<a href="#/schools/harvard/case-study">${escapeHtml(item.case_id)}</a> · 可信度：${escapeHtml(item.confidence_level)} · 完整度：${escapeHtml(item.completeness_score)}</p>
        <ul>${item.public_signals.map(signal => `<li>${escapeHtml(signal)}</li>`).join('')}</ul>
      </article>
    `).join('');
  }

  function renderAdmissionDataExplorerResults(records) {
    if (!records.length) return renderExplorerEmpty();
    return records.map(item => `
      <article class="linked-card explorer-result-card explorer-result-card-compact">
        <div class="explorer-result-topline">
          <span class="linked-eyebrow">${escapeHtml(item.school)} · ${escapeHtml(item.cycle_year)}</span>
          <span class="explorer-badge">${escapeHtml(item.source_role)}</span>
        </div>
        <h4>${escapeHtml(item.label)}</h4>
        <div class="linked-metric explorer-inline-metric">${escapeHtml(item.value)}</div>
        <p class="linked-note">分组：${escapeHtml(item.metric_group)} · 方向：${escapeHtml(item.track)} · 来源：<a href="#/schools/harvard/admission-data">${escapeHtml(item.source_id)}</a></p>
        <ul>${item.notes.map(note => `<li>${escapeHtml(note)}</li>`).join('')}</ul>
      </article>
    `).join('');
  }

  function bindExplorerControls(node, filters, rerender) {
    node.querySelectorAll('[data-filter-key]').forEach(select => {
      select.addEventListener('change', event => {
        filters[event.target.dataset.filterKey] = event.target.value;
        rerender();
      });
    });

    const resetButton = node.querySelector('.explorer-reset');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        Object.keys(filters).forEach(key => { filters[key] = ''; });
        rerender();
      });
    }
  }

  function renderCaseStudyExplorer(node, data) {
    const records = (data.caseStudyExplorer?.records || []).map(normalizeCaseStudyRecord);
    const filters = {
      school: node.dataset.school || '',
      application_cycle: node.dataset.applicationCycle || '',
      source_type: node.dataset.sourceType || '',
      confidence_level: node.dataset.confidenceLevel || ''
    };

    function applyFilters() {
      const filtered = records.filter(item => Object.entries(filters).every(([key, value]) => !value || item[key] === value));
      const summaryBits = [];
      if (filters.school) summaryBits.push(`School = ${escapeHtml(filters.school)}`);
      if (filters.application_cycle) summaryBits.push(`Cycle = ${escapeHtml(filters.application_cycle)}`);
      if (filters.source_type) summaryBits.push(`Source Type = ${escapeHtml(filters.source_type)}`);
      if (filters.confidence_level) summaryBits.push(`Confidence = ${escapeHtml(filters.confidence_level)}`);

      node.innerHTML = `
        <section class="linked-section explorer-shell">
          <div class="explorer-header">
            <div>
              <h3>Case Study Explorer</h3>
              <p class="linked-note">按学校、申请周期、来源类型与可信度筛选当前公开案例样本。</p>
            </div>
            <button type="button" class="explorer-reset">重置筛选</button>
          </div>
          <div class="explorer-filters">
            ${renderExplorerFilter('School', 'school', getUniqueOptions(records, 'school'), filters.school)}
            ${renderExplorerFilter('Application Cycle', 'application_cycle', getUniqueOptions(records, 'application_cycle'), filters.application_cycle)}
            ${renderExplorerFilter('Source Type', 'source_type', getUniqueOptions(records, 'source_type'), filters.source_type)}
            ${renderExplorerFilter('Confidence Level', 'confidence_level', getUniqueOptions(records, 'confidence_level'), filters.confidence_level)}
          </div>
          <div class="explorer-summary-bar">
            <div><strong>${filtered.length}</strong> / ${records.length} 条案例匹配当前条件</div>
            <div class="linked-note">${summaryBits.length ? `当前筛选：${summaryBits.join(' · ')}` : '当前筛选：全部'}</div>
          </div>
          <div class="linked-grid linked-grid-2 explorer-results">${renderCaseStudyExplorerResults(filtered)}</div>
        </section>
      `;
      bindExplorerControls(node, filters, applyFilters);
    }

    applyFilters();
  }

  function renderAdmissionDataExplorer(node, data) {
    const records = (data.admissionDataExplorer?.records || []).map(normalizeAdmissionDataRecord);
    const filters = {
      school: node.dataset.school || '',
      cycle_year: node.dataset.cycleYear || '',
      source_role: node.dataset.sourceRole || '',
      metric_group: node.dataset.metricGroup || ''
    };

    function applyFilters() {
      const filtered = records.filter(item => Object.entries(filters).every(([key, value]) => !value || item[key] === value));
      const summaryBits = [];
      if (filters.school) summaryBits.push(`School = ${escapeHtml(filters.school)}`);
      if (filters.cycle_year) summaryBits.push(`Cycle Year = ${escapeHtml(filters.cycle_year)}`);
      if (filters.source_role) summaryBits.push(`Source Role = ${escapeHtml(filters.source_role)}`);
      if (filters.metric_group) summaryBits.push(`Metric Group = ${escapeHtml(filters.metric_group)}`);

      node.innerHTML = `
        <section class="linked-section explorer-shell">
          <div class="explorer-header">
            <div>
              <h3>Admission Data Explorer</h3>
              <p class="linked-note">按学校、申请周期、来源类型与数据分组筛选当前招生信息。</p>
            </div>
            <button type="button" class="explorer-reset">重置筛选</button>
          </div>
          <div class="explorer-filters">
            ${renderExplorerFilter('School', 'school', getUniqueOptions(records, 'school'), filters.school)}
            ${renderExplorerFilter('Cycle Year', 'cycle_year', getUniqueOptions(records, 'cycle_year'), filters.cycle_year)}
            ${renderExplorerFilter('Source Role', 'source_role', getUniqueOptions(records, 'source_role'), filters.source_role)}
            ${renderExplorerFilter('Metric Group', 'metric_group', getUniqueOptions(records, 'metric_group'), filters.metric_group)}
          </div>
          <div class="explorer-summary-bar">
            <div><strong>${filtered.length}</strong> / ${records.length} 条记录匹配当前条件</div>
            <div class="linked-note">${summaryBits.length ? `当前筛选：${summaryBits.join(' · ')}` : '当前筛选：全部'}</div>
          </div>
          <div class="linked-grid linked-grid-2 explorer-results">${renderAdmissionDataExplorerResults(filtered)}</div>
        </section>
      `;
      bindExplorerControls(node, filters, applyFilters);
    }

    applyFilters();
  }

  function templateFor(view, data) {
    if (view === 'school-hub') {
      return `
        <section class="linked-section">
          <h3>Harvard 当前内容概览</h3>
          <div class="linked-grid linked-grid-3">
            <div class="linked-card">
              <div class="linked-eyebrow">Admission Data</div>
              <div class="linked-metric">${escapeHtml(data.hubSummary.admissionMetricCount)} 项</div>
              <p>当前已可查看的结构化招生数据与要求摘要。</p>
            </div>
            <div class="linked-card">
              <div class="linked-eyebrow">Case Study</div>
              <div class="linked-metric">${escapeHtml(data.hubSummary.caseCount)} 条</div>
              <p>当前可浏览的公开案例样本。</p>
            </div>
            <div class="linked-card">
              <div class="linked-eyebrow">Sources</div>
              <div class="linked-metric">${escapeHtml(data.hubSummary.sourceCount)} 个</div>
              <p>当前页面所涉及的主要来源入口。</p>
            </div>
          </div>
        </section>
      `;
    }
    if (view === 'admission-data') {
      return `
        <section class="linked-section">
          <h3>相关内容</h3>
          <div class="linked-grid linked-grid-3">${renderMetricList(data.admissionHighlights)}</div>
          <h4>相关案例</h4>
          <div class="linked-grid linked-grid-2">${renderCaseList(data.relatedCases)}</div>
          <h4>相关来源</h4>
          <div class="linked-grid linked-grid-2">${renderSourceUsage(data.admissionSources)}</div>
        </section>
      `;
    }
    if (view === 'case-study') {
      return `
        <section class="linked-section">
          <h3>相关内容</h3>
          <div class="linked-grid linked-grid-2">${renderCaseList(data.relatedCases)}</div>
          <h4>相关招生信息</h4>
          <div class="linked-grid linked-grid-3">${renderMetricList(data.admissionHighlights)}</div>
          <h4>相关来源</h4>
          <div class="linked-grid linked-grid-2">${renderSourceUsage(data.caseSources)}</div>
        </section>
      `;
    }
    if (view === 'sources') {
      return `
        <section class="linked-section">
          <h3>来源与页面关联</h3>
          <div class="linked-grid linked-grid-2">${renderSourceUsage(data.allSourceUsage)}</div>
        </section>
      `;
    }
    return '';
  }

  function normalizeInternalLinks() {
    document.querySelectorAll('.markdown-section a[href]').forEach(anchor => {
      const href = anchor.getAttribute('href');
      if (!href || /^https?:/i.test(href)) return;
      if (/^#\/\.{1,2}\//.test(href)) {
        anchor.setAttribute('href', resolveRelativeHashRoute(href));
        return;
      }
      if (/\?id=/.test(href) || /^#/.test(href)) return;
      if (/\.md($|[?#])/.test(href) || /^\.?\//.test(href) || /^\.\.\//.test(href)) {
        anchor.setAttribute('href', toDocsifyRoute(href));
      }
    });
  }

  function initCollapsibleSidebar() {
    const sidebar = document.querySelector('.sidebar-nav');
    if (!sidebar) return;

    sidebar.querySelectorAll('li').forEach(item => {
      const childList = item.querySelector(':scope > ul');
      const link = item.querySelector(':scope > a');
      if (!childList || !link) return;

      let toggle = item.querySelector(':scope > .sidebar-node-toggle');
      if (!toggle) {
        toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'sidebar-node-toggle';
        toggle.setAttribute('aria-label', `切换 ${link.textContent.trim()} 导航`);
        link.insertAdjacentElement('afterend', toggle);
        toggle.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          syncState(item.classList.contains('is-collapsed'));
        });
      }

      item.classList.add('sidebar-collapsible');
      item.setAttribute('data-collapsible-label', link.textContent.trim());
      const storageKey = `sidebar:${link.getAttribute('href') || link.textContent.trim()}`;
      const forcedExpanded = item.classList.contains('active') || item.querySelector('li.active');
      const storedState = window.localStorage.getItem(storageKey);

      function syncState(expanded) {
        item.classList.toggle('is-collapsed', !expanded);
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        window.localStorage.setItem(storageKey, expanded ? 'expanded' : 'collapsed');
      }

      if (forcedExpanded) {
        syncState(true);
      } else if (storedState === 'collapsed') {
        syncState(false);
      } else if (storedState === 'expanded') {
        syncState(true);
      } else {
        syncState(link.textContent.trim() !== 'Harvard');
      }
    });
  }

  async function mountLinkedSections() {
    const linkedNodes = Array.from(document.querySelectorAll('[data-linked-view]'));
    const caseExplorerNodes = Array.from(document.querySelectorAll('[data-explorer-view="case-study"]'));
    const admissionExplorerNodes = Array.from(document.querySelectorAll('[data-explorer-view="admission-data"]'));
    if (!linkedNodes.length && !caseExplorerNodes.length && !admissionExplorerNodes.length) return;

    try {
      const response = await fetch(DATA_PATH);
      const data = await response.json();
      linkedNodes.forEach(node => { node.innerHTML = templateFor(node.getAttribute('data-linked-view'), data); });
      caseExplorerNodes.forEach(node => renderCaseStudyExplorer(node, data));
      admissionExplorerNodes.forEach(node => renderAdmissionDataExplorer(node, data));
    } catch (error) {
      linkedNodes.forEach(node => { node.innerHTML = '<p class="linked-error">内容加载失败，请稍后重试。</p>'; });
      caseExplorerNodes.forEach(node => { node.innerHTML = '<p class="linked-error">Explorer 加载失败，请稍后重试。</p>'; });
      admissionExplorerNodes.forEach(node => { node.innerHTML = '<p class="linked-error">Explorer 加载失败，请稍后重试。</p>'; });
      console.error(error);
    }
  }

  window.$docsify = window.$docsify || {};
  const previousPlugins = window.$docsify.plugins || [];
  window.$docsify.plugins = [].concat(previousPlugins, [function (hook) {
    hook.beforeEach(function (markdown) {
      return stripFrontmatter(markdown);
    });
    hook.doneEach(function () {
      normalizeInternalLinks();
      initCollapsibleSidebar();
      mountLinkedSections();
    });
  }]);
})();
