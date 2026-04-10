(function () {
  const LINKED_DATA_PATH_TEMPLATE = './data/{school}-linked-data.json';
  const EXPLORER_DATASETS = {
    'admission-data': './data/explorers/admission-data.json',
    'case-study': './data/explorers/case-study.json',
    'academic-programs': './data/explorers/academic-programs.json'
  };

  const jsonCache = new Map();

  function currentDocsifyPath() {
    const raw = (window.location.hash || '#/').replace(/^#/, '');
    const path = raw.split('?')[0] || '/';
    return path.startsWith('/') ? path : `/${path}`;
  }

  function currentSchoolSlug() {
    const match = currentDocsifyPath().match(/^\/schools\/([^/]+)/);
    return match ? match[1] : '';
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

  function schoolRoute(link, schoolSlug) {
    const normalized = String(link || '').trim();
    const activeSchool = schoolSlug || currentSchoolSlug() || 'harvard';
    if (!normalized) return '#/';
    if (normalized.startsWith('/') || normalized.startsWith('./') || normalized.startsWith('../')) return toDocsifyRoute(normalized);
    return toDocsifyRoute(`/schools/${activeSchool}/${normalized}`);
  }

  function pageRoute(path, fallback) {
    if (path) return toDocsifyRoute(path);
    if (fallback) return toDocsifyRoute(fallback);
    return '#/';
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

  function uniq(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function isTruthyLike(value) {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '').trim().toLowerCase();
    return ['true', 'yes', 'y', '1', 'comparable', 'only', '是'].includes(normalized);
  }

  function labelize(value) {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  function getField(item, keys, fallback = '') {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  }

  function stripHash(route) {
    return String(route || '').replace(/^#/, '');
  }

  function getLinkInfo(item, config) {
    const schoolSlug = getField(item, config.schoolKeys, currentSchoolSlug() || '');
    const route = getField(item, config.pathKeys, '');
    const label = getField(item, config.labelKeys, 'View detail');
    return {
      schoolSlug,
      route: route ? pageRoute(route) : '',
      label
    };
  }

  function normalizeCaseStudyRecord(item) {
    return {
      ...item,
      school: getField(item, ['school'], ''),
      school_slug: getField(item, ['school_slug', 'schoolSlug'], ''),
      application_cycle: String(getField(item, ['application_cycle', 'cycle_year', 'cycleYear'], '')),
      result: getField(item, ['result', 'outcome'], ''),
      track: getField(item, ['track', 'intended_major', 'intendedMajor', 'major', 'focus_area', 'focusArea'], ''),
      major: getField(item, ['intended_major', 'intendedMajor', 'major', 'track', 'focus_area', 'focusArea'], ''),
      source_type: getField(item, ['source_type', 'sourceType'], ''),
      completeness: getField(item, ['completeness', 'completeness_score', 'completenessScore'], ''),
      confidence: getField(item, ['confidence', 'confidence_level', 'confidenceLevel'], ''),
      public_signals: toArray(getField(item, ['public_signals', 'signals', 'highlights'], [])),
      sample_title: getField(item, ['sample_title', 'sampleTitle', 'title', 'student_alias', 'studentAlias'], 'Untitled case'),
      case_id: getField(item, ['case_id', 'caseId', 'id'], ''),
      case_page_path: getField(item, ['case_page_path', 'casePagePath', 'case_path', 'casePath'], ''),
      school_page_path: getField(item, ['school_page_path', 'schoolPagePath'], ''),
      source_page_path: getField(item, ['source_page_path', 'sourcePagePath'], ''),
      source_id: getField(item, ['source_id', 'sourceId'], '')
    };
  }

  function normalizeAdmissionDataRecord(item) {
    return {
      ...item,
      school: getField(item, ['school'], ''),
      school_slug: getField(item, ['school_slug', 'schoolSlug'], ''),
      cycle_year: String(getField(item, ['cycle_year', 'class_year', 'classYear'], '')),
      metric_type: getField(item, ['metric_type', 'metricType', 'metric_group', 'metricGroup'], ''),
      track: getField(item, ['track', 'track_label', 'trackLabel'], ''),
      source_tier: getField(item, ['source_tier', 'sourceTier', 'source_role', 'sourceRole'], ''),
      comparable_only: isTruthyLike(getField(item, ['comparable_only', 'comparableOnly'], false)),
      label: getField(item, ['label', 'metric_label', 'metricLabel', 'name'], 'Untitled metric'),
      value: getField(item, ['value', 'display_value', 'displayValue'], ''),
      source_id: getField(item, ['source_id', 'sourceId'], ''),
      notes: toArray(getField(item, ['notes', 'public_notes', 'publicNotes'], [])),
      room_link: getField(item, ['room_link', 'roomLink', 'detail_page_path', 'detailPagePath'], ''),
      school_page_path: getField(item, ['school_page_path', 'schoolPagePath'], ''),
      source_page_path: getField(item, ['source_page_path', 'sourcePagePath'], ''),
      statistic_scope: getField(item, ['statistic_scope', 'statisticScope'], '')
    };
  }

  function getUniqueOptions(records, key) {
    return uniq(records.map(item => item[key]).filter(value => value !== false));
  }

  function getCoverageOptions(payload, key) {
    return uniq(toArray(payload?.coverage).map(item => item?.[key]).filter(Boolean));
  }

  function renderExplorerFilter(label, key, options, value) {
    return `
      <label class="explorer-filter">
        <span>${escapeHtml(label)}</span>
        <select data-filter-key="${escapeHtml(key)}">
          <option value="">全部</option>
          ${options.map(option => `<option value="${escapeHtml(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(labelize(option))}</option>`).join('')}
        </select>
      </label>
    `;
  }

  function renderExplorerToggle(label, key, checked) {
    return `
      <label class="explorer-toggle">
        <input type="checkbox" data-filter-key="${escapeHtml(key)}" ${checked ? 'checked' : ''}>
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }

  function renderExplorerEmpty(title, detail) {
    return `
      <div class="linked-card explorer-empty">
        <h4>${escapeHtml(title)}</h4>
        <p class="linked-note">${escapeHtml(detail)}</p>
      </div>
    `;
  }

  function renderSummaryPills(items) {
    if (!items.length) return '<span class="linked-note">当前筛选：全部</span>';
    return items.map(item => `<span class="explorer-summary-pill">${escapeHtml(item)}</span>`).join('');
  }

  function renderMetricList(items, schoolSlug) {
    return items.map(item => `
      <div class="linked-card metric-card">
        <div class="linked-eyebrow">${escapeHtml(item.label)}</div>
        <div class="linked-metric">${escapeHtml(item.value)}</div>
        <div class="linked-note">来源：<a href="${escapeHtml(schoolRoute(item.roomLink, schoolSlug))}">${escapeHtml(item.sourceId)}</a></div>
      </div>
    `).join('');
  }

  function renderCaseList(cases, schoolSlug) {
    return cases.map(item => {
      const caseRoute = item.casePath ? pageRoute(item.casePath) : schoolRoute('case-study.md', schoolSlug);
      const sourceRoute = item.sourcePagePath ? pageRoute(item.sourcePagePath) : schoolRoute('sources.md', schoolSlug);
      return `
        <div class="linked-card">
          <div class="linked-eyebrow">${escapeHtml(item.sourceType)}</div>
          <h4>${escapeHtml(item.sampleTitle)}</h4>
          <ul>${toArray(item.signals).map(signal => `<li>${escapeHtml(signal)}</li>`).join('')}</ul>
          <p class="linked-note">案例页：<a href="${escapeHtml(caseRoute)}">${escapeHtml(item.caseId)}</a> · 来源：<a href="${escapeHtml(sourceRoute)}">${escapeHtml(item.sourceId)}</a></p>
        </div>
      `;
    }).join('');
  }

  function renderSourceUsage(items, schoolSlug) {
    return items.map(item => `
      <div class="linked-card">
        <div class="linked-eyebrow">${escapeHtml(item.sourceType)}</div>
        <h4>${escapeHtml(item.title)}</h4>
        <p><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">打开原始来源</a></p>
        <p class="linked-note">关联页面：${toArray(item.usedIn).map(room => `<a href="${escapeHtml(schoolRoute(room.link, schoolSlug))}">${escapeHtml(room.label)}</a>`).join(' / ')}</p>
      </div>
    `).join('');
  }

  function renderExplorerPagination(page, totalPages) {
    if (totalPages <= 1) return '';
    return `
      <div class="explorer-pagination">
        <button type="button" class="explorer-page-btn" data-page-action="prev" ${page <= 1 ? 'disabled' : ''}>上一页</button>
        <span class="explorer-page-status">第 ${page} / ${totalPages} 页</span>
        <button type="button" class="explorer-page-btn" data-page-action="next" ${page >= totalPages ? 'disabled' : ''}>下一页</button>
      </div>
    `;
  }

  function bindExplorerPagination(node, pageState, rerender) {
    node.querySelectorAll('[data-page-action]').forEach(button => {
      button.addEventListener('click', () => {
        if (button.dataset.pageAction === 'prev' && pageState.page > 1) pageState.page -= 1;
        if (button.dataset.pageAction === 'next' && pageState.page < pageState.totalPages) pageState.page += 1;
        rerender();
      });
    });
  }

  function renderCaseStudyExplorerResults(records) {
    if (!records.length) {
      return renderExplorerEmpty('当前条件下没有案例', '这通常表示当前聚合数据尚未覆盖该组合；请放宽筛选，或回到学校页查看原始内容。');
    }

    return `
      <div class="explorer-table-wrap">
        <table class="explorer-table explorer-table-cases">
          <thead>
            <tr>
              <th>School</th>
              <th>Cycle</th>
              <th>Case</th>
              <th>Result</th>
              <th>Track / Major</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(item => {
              const caseLink = getLinkInfo(item, { schoolKeys: ['school_slug'], pathKeys: ['case_page_path'], labelKeys: ['case_id'] });
              const schoolLink = getLinkInfo(item, { schoolKeys: ['school_slug'], pathKeys: ['school_page_path'], labelKeys: ['school'] });
              const sourceLink = getLinkInfo(item, { schoolKeys: ['school_slug'], pathKeys: ['source_page_path'], labelKeys: ['source_id'] });
              return `
                <tr>
                  <td>${schoolLink.route ? `<a href="${escapeHtml(schoolLink.route)}">${escapeHtml(schoolLink.label || item.school || 'Open school')}</a>` : escapeHtml(item.school || '—')}</td>
                  <td>${escapeHtml(item.application_cycle || '—')}</td>
                  <td>${caseLink.route ? `<a href="${escapeHtml(caseLink.route)}">${escapeHtml(item.sample_title)}</a>` : escapeHtml(item.sample_title)}</td>
                  <td>${escapeHtml(labelize(item.result || '—'))}</td>
                  <td>${escapeHtml(item.major || item.track || '—')}</td>
                  <td>${sourceLink.route ? `<a href="${escapeHtml(sourceLink.route)}">${escapeHtml(item.source_id || 'Open source')}</a>` : escapeHtml(item.source_id || '—')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderAdmissionDataExplorerResults(records) {
    if (!records.length) {
      return renderExplorerEmpty('当前条件下没有招生数据', '这表示当前聚合数据中没有可直接比较的记录；请修改筛选，或进入学校页查看完整上下文。');
    }

    return `
      <div class="explorer-table-wrap">
        <table class="explorer-table explorer-table-admission">
          <thead>
            <tr>
              <th>School</th>
              <th>Cycle</th>
              <th>Metric</th>
              <th>Value</th>
              <th>Track</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(item => {
              const detailLink = getLinkInfo(item, { schoolKeys: ['school_slug'], pathKeys: ['room_link', 'school_page_path'], labelKeys: ['label'] });
              const schoolLink = getLinkInfo(item, { schoolKeys: ['school_slug'], pathKeys: ['school_page_path'], labelKeys: ['school'] });
              const sourceLink = getLinkInfo(item, { schoolKeys: ['school_slug'], pathKeys: ['source_page_path'], labelKeys: ['source_id'] });
              return `
                <tr>
                  <td>${schoolLink.route ? `<a href="${escapeHtml(schoolLink.route)}">${escapeHtml(schoolLink.label || item.school || 'Open school')}</a>` : escapeHtml(item.school || '—')}</td>
                  <td>${escapeHtml(item.cycle_year || '—')}</td>
                  <td>${detailLink.route ? `<a href="${escapeHtml(detailLink.route)}">${escapeHtml(item.label)}</a>` : escapeHtml(item.label)}</td>
                  <td>${escapeHtml(item.value || '—')}</td>
                  <td>${escapeHtml(item.track || '—')}</td>
                  <td>${sourceLink.route ? `<a href="${escapeHtml(sourceLink.route)}">${escapeHtml(item.source_id || 'Open source')}</a>` : escapeHtml(item.source_id || '—')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function bindExplorerControls(node, filters, rerender) {
    node.querySelectorAll('[data-filter-key]').forEach(control => {
      const update = event => {
        filters[event.target.dataset.filterKey] = control.type === 'checkbox' ? event.target.checked : event.target.value;
        rerender();
      };
      control.addEventListener('change', update);
      if (control.type !== 'checkbox') control.addEventListener('input', update);
    });

    const resetButton = node.querySelector('.explorer-reset');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        Object.keys(filters).forEach(key => { filters[key] = typeof filters[key] === 'boolean' ? false : ''; });
        rerender();
      });
    }
  }

  function extractRecords(payload, keys) {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) {
      const value = payload?.[key];
      if (Array.isArray(value)) return value;
      if (value && Array.isArray(value.records)) return value.records;
    }
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  }

  function renderCaseStudyExplorer(node, payload) {
    const records = extractRecords(payload, ['records', 'caseStudyExplorer', 'case_studies']).map(normalizeCaseStudyRecord);
    if (!records.length) {
      node.innerHTML = `
        <section class="linked-section explorer-shell">
          <div class="explorer-header"><div><h3>Case Study Explorer</h3><p class="linked-note">按学校、申请周期、结果和材料完整度筛选站内已聚合的案例数据。</p></div></div>
          ${renderExplorerEmpty('聚合案例数据暂不可用', '预期数据文件为 wiki/data/explorers/case-study.json。当前前端不会伪造 Harvard 以外覆盖度。')}
        </section>
      `;
      return;
    }

    const filters = {
      school: node.dataset.school || '',
      application_cycle: node.dataset.applicationCycle || '',
      result: node.dataset.result || '',
      track: node.dataset.track || '',
      major: node.dataset.major || '',
      source_type: node.dataset.sourceType || '',
      completeness: node.dataset.completeness || '',
      confidence: node.dataset.confidence || ''
    };
    const pageState = { page: 1, pageSize: 50, totalPages: 1 };

    function applyFilters() {
      const filtered = records.filter(item => Object.entries(filters).every(([key, value]) => {
        if (value === '' || value === false) return true;
        if (typeof value === 'boolean') return item[key] === value;
        return item[key] === value;
      }));
      pageState.totalPages = Math.max(1, Math.ceil(filtered.length / pageState.pageSize));
      if (pageState.page > pageState.totalPages) pageState.page = pageState.totalPages;
      const start = (pageState.page - 1) * pageState.pageSize;
      const display = filtered.slice(start, start + pageState.pageSize);

      const summaryBits = [];
      if (filters.school) summaryBits.push(`School: ${labelize(filters.school)}`);
      if (filters.application_cycle) summaryBits.push(`Cycle: ${filters.application_cycle}`);
      if (filters.result) summaryBits.push(`Result: ${labelize(filters.result)}`);
      if (filters.track) summaryBits.push(`Track: ${labelize(filters.track)}`);
      if (filters.major) summaryBits.push(`Major: ${labelize(filters.major)}`);
      if (filters.source_type) summaryBits.push(`Source: ${labelize(filters.source_type)}`);
      if (filters.completeness) summaryBits.push(`Completeness: ${labelize(filters.completeness)}`);
      if (filters.confidence) summaryBits.push(`Confidence: ${labelize(filters.confidence)}`);

      node.innerHTML = `
        <section class="linked-section explorer-shell">
          <div class="explorer-header">
            <div>
              <h3>Case Study Explorer</h3>
              <p class="linked-note">按学校、申请周期、结果、方向与样本可信度筛选当前站点已聚合的公开案例。</p>
            </div>
            <button type="button" class="explorer-reset">重置筛选</button>
          </div>
          <div class="explorer-filters explorer-filters-dense">
            ${renderExplorerFilter('School', 'school', getCoverageOptions(payload, 'school').length ? getCoverageOptions(payload, 'school') : getUniqueOptions(records, 'school'), filters.school)}
            ${renderExplorerFilter('Application Cycle', 'application_cycle', getUniqueOptions(records, 'application_cycle'), filters.application_cycle)}
            ${renderExplorerFilter('Result', 'result', getUniqueOptions(records, 'result'), filters.result)}
            ${renderExplorerFilter('Track / Intended Major', 'track', getUniqueOptions(records, 'track'), filters.track)}
            ${renderExplorerFilter('Major', 'major', getUniqueOptions(records, 'major'), filters.major)}
            ${renderExplorerFilter('Source Type', 'source_type', getUniqueOptions(records, 'source_type'), filters.source_type)}
            ${renderExplorerFilter('Completeness', 'completeness', getUniqueOptions(records, 'completeness'), filters.completeness)}
            ${renderExplorerFilter('Confidence', 'confidence', getUniqueOptions(records, 'confidence'), filters.confidence)}
          </div>
          <div class="explorer-summary-bar">
            <div><strong>${filtered.length}</strong> / ${records.length} 条案例匹配当前条件，当前显示 ${filtered.length ? start + 1 : 0}-${Math.min(start + display.length, filtered.length)} 条</div>
            <div class="explorer-summary-pills">${renderSummaryPills(summaryBits)}</div>
          </div>
          <div class="linked-note explorer-data-note">仅展示聚合数据中实际存在的学校与字段，不推断缺失学校/案例。</div>
          <div class="explorer-results explorer-results-table">${renderCaseStudyExplorerResults(display)}</div>
          ${renderExplorerPagination(pageState.page, pageState.totalPages)}
        </section>
      `;
      bindExplorerControls(node, filters, () => { pageState.page = 1; applyFilters(); });
      bindExplorerPagination(node, pageState, applyFilters);
    }

    applyFilters();
  }

  function renderAdmissionDataExplorer(node, payload) {
    const records = extractRecords(payload, ['records', 'admissionDataExplorer', 'admission_data']).map(normalizeAdmissionDataRecord);
    if (!records.length) {
      node.innerHTML = `
        <section class="linked-section explorer-shell">
          <div class="explorer-header"><div><h3>Admission Data Explorer</h3><p class="linked-note">按学校、周期、指标类型与可比性筛选站内已聚合的招生数据。</p></div></div>
          ${renderExplorerEmpty('聚合招生数据暂不可用', '预期数据文件为 wiki/data/explorers/admission-data.json。当前前端不会伪造 Harvard 以外覆盖度。')}
        </section>
      `;
      return;
    }

    const filters = {
      school: node.dataset.school || '',
      cycle_year: node.dataset.cycleYear || '',
      metric_type: node.dataset.metricType || '',
      track: node.dataset.track || '',
      source_tier: node.dataset.sourceTier || '',
      comparable_only: isTruthyLike(node.dataset.comparableOnly || false)
    };
    const pageState = { page: 1, pageSize: 50, totalPages: 1 };

    function applyFilters() {
      const filtered = records.filter(item => Object.entries(filters).every(([key, value]) => {
        if (value === '' || value === false) return true;
        if (typeof value === 'boolean') return item[key] === value;
        return item[key] === value;
      }));
      pageState.totalPages = Math.max(1, Math.ceil(filtered.length / pageState.pageSize));
      if (pageState.page > pageState.totalPages) pageState.page = pageState.totalPages;
      const start = (pageState.page - 1) * pageState.pageSize;
      const display = filtered.slice(start, start + pageState.pageSize);

      const summaryBits = [];
      if (filters.school) summaryBits.push(`School: ${labelize(filters.school)}`);
      if (filters.cycle_year) summaryBits.push(`Cycle: ${filters.cycle_year}`);
      if (filters.metric_type) summaryBits.push(`Metric: ${labelize(filters.metric_type)}`);
      if (filters.track) summaryBits.push(`Track: ${labelize(filters.track)}`);
      if (filters.source_tier) summaryBits.push(`Source Tier: ${labelize(filters.source_tier)}`);
      if (filters.comparable_only) summaryBits.push('Comparable only');

      node.innerHTML = `
        <section class="linked-section explorer-shell">
          <div class="explorer-header">
            <div>
              <h3>Admission Data Explorer</h3>
              <p class="linked-note">用全站聚合数据快速找到可比较的招生信号，再跳回具体学校页核对上下文。</p>
            </div>
            <button type="button" class="explorer-reset">重置筛选</button>
          </div>
          <div class="explorer-filters explorer-filters-dense">
            ${renderExplorerFilter('School', 'school', getCoverageOptions(payload, 'school').length ? getCoverageOptions(payload, 'school') : getUniqueOptions(records, 'school'), filters.school)}
            ${renderExplorerFilter('Cycle / Class Year', 'cycle_year', getUniqueOptions(records, 'cycle_year'), filters.cycle_year)}
            ${renderExplorerFilter('Metric Type', 'metric_type', getUniqueOptions(records, 'metric_type'), filters.metric_type)}
            ${renderExplorerFilter('Track', 'track', getUniqueOptions(records, 'track'), filters.track)}
            ${renderExplorerFilter('Source Tier', 'source_tier', getUniqueOptions(records, 'source_tier'), filters.source_tier)}
            ${renderExplorerToggle('Comparable only', 'comparable_only', Boolean(filters.comparable_only))}
          </div>
          <div class="explorer-summary-bar">
            <div><strong>${filtered.length}</strong> / ${records.length} 条记录匹配当前条件，当前显示 ${filtered.length ? start + 1 : 0}-${Math.min(start + display.length, filtered.length)} 条</div>
            <div class="explorer-summary-pills">${renderSummaryPills(summaryBits)}</div>
          </div>
          <div class="linked-note explorer-data-note">结果仅来自已聚合字段；若某学校缺席，表示数据层尚未供给，不在前端“补齐”。</div>
          <div class="explorer-results explorer-results-table">${renderAdmissionDataExplorerResults(display)}</div>
          ${renderExplorerPagination(pageState.page, pageState.totalPages)}
        </section>
      `;
      bindExplorerControls(node, filters, () => { pageState.page = 1; applyFilters(); });
      bindExplorerPagination(node, pageState, applyFilters);
    }

    applyFilters();
  }

  function normalizeAcademicProgramRecord(item) {
    return {
      ...item,
      school: getField(item, ['school'], ''),
      school_slug: getField(item, ['school_slug', 'schoolSlug'], ''),
      program_name: getField(item, ['program_name', 'programName', 'name', 'major', 'concentration'], ''),
      original_label: getField(item, ['original_label', 'originalLabel'], 'major'),
      division: getField(item, ['division', 'college', 'school_unit', 'schoolUnit'], ''),
      degree: getField(item, ['degree'], ''),
      degree_category: getField(item, ['degree_category', 'degreeCategory'], ''),
      discipline_area: getField(item, ['discipline_area', 'disciplineArea', 'area', 'category'], ''),
      undergrad_open: item.undergrad_open !== false,
      source_page: getField(item, ['source_page', 'sourcePage'], '')
    };
  }

  function renderAcademicProgramsExplorerResults(records) {
    if (!records.length) {
      return renderExplorerEmpty('当前条件下没有匹配的专业/项目', '请放宽筛选条件，或回到学校页查看完整列表。');
    }
    return `
      <div class="explorer-table-wrap">
        <table class="explorer-table explorer-table-programs">
          <thead>
            <tr>
              <th>School</th>
              <th>Program</th>
              <th>College / Division</th>
              <th>Degree</th>
              <th>Area</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(item => {
              const schoolLink = item.source_page ? `<a href="${escapeHtml(item.source_page)}">${escapeHtml(item.school)}</a>` : escapeHtml(item.school);
              return `
                <tr>
                  <td>${schoolLink}</td>
                  <td>${escapeHtml(item.program_name)}</td>
                  <td>${escapeHtml(item.division || '—')}</td>
                  <td>${escapeHtml(item.degree || item.degree_category || '—')}</td>
                  <td>${escapeHtml(item.discipline_area || '—')}</td>
                  <td>${escapeHtml(item.original_label && item.original_label !== 'major' ? labelize(item.original_label) : 'Major')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderAcademicProgramsExplorer(node, payload) {
    const records = extractRecords(payload, ['records', 'programs']).map(normalizeAcademicProgramRecord);
    if (!records.length) {
      node.innerHTML = `
        <section class="linked-section explorer-shell">
          <div class="explorer-header"><div><h3>Academic Programs Explorer</h3><p class="linked-note">按学校、专业、学院/Division、学位类型筛选本科可选专业。</p></div></div>
          ${renderExplorerEmpty('聚合专业数据暂不可用', '预期数据文件为 wiki/data/explorers/academic-programs.json。')}
        </section>
      `;
      return;
    }

    const filters = {
      school: node.dataset.school || '',
      division: node.dataset.division || '',
      degree_category: node.dataset.degreeCategory || '',
      discipline_area: node.dataset.disciplineArea || '',
      search: ''
    };
    const pageState = { page: 1, pageSize: 50, totalPages: 1 };

    function applyFilters() {
      const searchLower = filters.search.toLowerCase().trim();
      const filtered = records.filter(item => {
        if (filters.school && item.school !== filters.school) return false;
        if (filters.division && item.division !== filters.division) return false;
        if (filters.degree_category && item.degree_category !== filters.degree_category) return false;
        if (filters.discipline_area && item.discipline_area !== filters.discipline_area) return false;
        if (searchLower && !item.program_name.toLowerCase().includes(searchLower)) return false;
        return true;
      });

      // Dynamically compute division options based on current school filter
      const divisionPool = filters.school ? records.filter(r => r.school === filters.school) : records;
      const divisionOptions = uniq(divisionPool.map(r => r.division).filter(Boolean)).sort();
      pageState.totalPages = Math.max(1, Math.ceil(filtered.length / pageState.pageSize));
      if (pageState.page > pageState.totalPages) pageState.page = pageState.totalPages;
      const start = (pageState.page - 1) * pageState.pageSize;
      const display = filtered.slice(start, start + pageState.pageSize);

      const summaryBits = [];
      if (filters.school) summaryBits.push(`School: ${filters.school}`);
      if (filters.division) summaryBits.push(`Division: ${filters.division}`);
      if (filters.degree_category) summaryBits.push(`Degree: ${filters.degree_category}`);
      if (filters.discipline_area) summaryBits.push(`Area: ${filters.discipline_area}`);
      if (filters.search) summaryBits.push(`Search: ${filters.search}`);

      node.innerHTML = `
        <section class="linked-section explorer-shell">
          <div class="explorer-header">
            <div>
              <h3>Academic Programs Explorer</h3>
              <p class="linked-note">按学校、学院/Division、学位类型、学科领域筛选全站 ${records.length} 个本科可选专业，或直接搜索专业名称。</p>
            </div>
            <button type="button" class="explorer-reset">重置筛选</button>
          </div>
          <div class="explorer-filters explorer-filters-dense">
            ${renderExplorerFilter('School', 'school', getCoverageOptions(payload, 'school').length ? getCoverageOptions(payload, 'school') : getUniqueOptions(records, 'school'), filters.school)}
            ${renderExplorerFilter('College / Division', 'division', divisionOptions, filters.division)}
            ${renderExplorerFilter('Degree Type', 'degree_category', getUniqueOptions(records, 'degree_category'), filters.degree_category)}
            ${renderExplorerFilter('Discipline Area', 'discipline_area', getUniqueOptions(records, 'discipline_area').filter(Boolean), filters.discipline_area)}
            <label class="explorer-filter">
              <span>Search Program</span>
              <input type="text" data-filter-key="search" placeholder="e.g. Computer Science" value="${escapeHtml(filters.search)}">
            </label>
          </div>
          <div class="explorer-summary-bar">
            <div><strong>${filtered.length}</strong> / ${records.length} 个专业匹配当前条件，当前显示 ${filtered.length ? start + 1 : 0}-${Math.min(start + display.length, filtered.length)} 条</div>
            <div class="explorer-summary-pills">${renderSummaryPills(summaryBits)}</div>
          </div>
          <div class="linked-note explorer-data-note">数据来自各校 academic-data 页面，仅包含本科可选专业。不同学校可能称之为 major / concentration / option。</div>
          <div class="explorer-results explorer-results-table">${renderAcademicProgramsExplorerResults(display)}</div>
          ${renderExplorerPagination(pageState.page, pageState.totalPages)}
        </section>
      `;
      bindExplorerControls(node, filters, () => { pageState.page = 1; applyFilters(); });
      bindExplorerPagination(node, pageState, applyFilters);
    }

    applyFilters();
  }

  function templateFor(view, data, schoolSlug) {
    if (view === 'school-hub') {
      return `
        <section class="linked-section">
          <h3>${escapeHtml(labelize(schoolSlug || data.school || 'School'))} 当前内容概览</h3>
          <div class="linked-grid linked-grid-3">
            <div class="linked-card"><div class="linked-eyebrow">Admission Data</div><div class="linked-metric">${escapeHtml(data.hubSummary.admissionMetricCount)}</div><p>当前已可查看的结构化招生数据与要求摘要。</p></div>
            <div class="linked-card"><div class="linked-eyebrow">Case Study</div><div class="linked-metric">${escapeHtml(data.hubSummary.caseCount)}</div><p>当前可浏览的公开案例样本。</p></div>
            <div class="linked-card"><div class="linked-eyebrow">Sources</div><div class="linked-metric">${escapeHtml(data.hubSummary.sourceCount)}</div><p>当前页面所涉及的主要来源入口。</p></div>
          </div>
        </section>
      `;
    }
    if (view === 'admission-data') {
      return `
        <section class="linked-section">
          <h3>相关内容</h3>
          <div class="linked-grid linked-grid-3">${renderMetricList(toArray(data.admissionHighlights), schoolSlug)}</div>
          <h4>相关案例</h4>
          <div class="linked-grid linked-grid-2">${renderCaseList(toArray(data.relatedCases), schoolSlug)}</div>
          <h4>相关来源</h4>
          <div class="linked-grid linked-grid-2">${renderSourceUsage(toArray(data.admissionSources), schoolSlug)}</div>
        </section>
      `;
    }
    if (view === 'case-study') {
      return `
        <section class="linked-section">
          <h3>相关内容</h3>
          <div class="linked-grid linked-grid-2">${renderCaseList(toArray(data.relatedCases), schoolSlug)}</div>
          <h4>相关招生信息</h4>
          <div class="linked-grid linked-grid-3">${renderMetricList(toArray(data.admissionHighlights), schoolSlug)}</div>
          <h4>相关来源</h4>
          <div class="linked-grid linked-grid-2">${renderSourceUsage(toArray(data.caseSources), schoolSlug)}</div>
        </section>
      `;
    }
    if (view === 'sources') {
      return `
        <section class="linked-section">
          <h3>来源与页面关联</h3>
          <div class="linked-grid linked-grid-2">${renderSourceUsage(toArray(data.allSourceUsage), schoolSlug)}</div>
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
        toggle.addEventListener('click', event => {
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

  async function fetchJson(path) {
    if (jsonCache.has(path)) return jsonCache.get(path);
    const promise = fetch(path).then(response => {
      if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
      return response.json();
    });
    jsonCache.set(path, promise);
    return promise;
  }

  async function mountLinkedSections() {
    const linkedNodes = Array.from(document.querySelectorAll('[data-linked-view]'));
    const caseExplorerNodes = Array.from(document.querySelectorAll('[data-explorer-view="case-study"]'));
    const admissionExplorerNodes = Array.from(document.querySelectorAll('[data-explorer-view="admission-data"]'));
    const academicExplorerNodes = Array.from(document.querySelectorAll('[data-explorer-view="academic-programs"]'));
    if (!linkedNodes.length && !caseExplorerNodes.length && !admissionExplorerNodes.length && !academicExplorerNodes.length) return;

    const schoolSlug = currentSchoolSlug();

    if (linkedNodes.length) {
      if (!schoolSlug) {
        linkedNodes.forEach(node => { node.innerHTML = '<p class="linked-error">未识别当前学校，无法加载关联内容。</p>'; });
      } else {
        const linkedPath = LINKED_DATA_PATH_TEMPLATE.replace('{school}', schoolSlug);
        try {
          const linkedData = await fetchJson(linkedPath);
          linkedNodes.forEach(node => {
            node.innerHTML = templateFor(node.getAttribute('data-linked-view'), linkedData, schoolSlug);
          });
        } catch (error) {
          linkedNodes.forEach(node => { node.innerHTML = '<p class="linked-error">关联内容加载失败，请稍后重试。</p>'; });
          console.error(error);
        }
      }
    }

    if (caseExplorerNodes.length) {
      try {
        const caseData = await fetchJson(EXPLORER_DATASETS['case-study']);
        caseExplorerNodes.forEach(node => renderCaseStudyExplorer(node, caseData));
      } catch (error) {
        caseExplorerNodes.forEach(node => {
          node.innerHTML = '<p class="linked-error">Case Study Explorer 加载失败。请检查 wiki/data/explorers/case-study.json。</p>';
        });
        console.error(error);
      }
    }

    if (admissionExplorerNodes.length) {
      try {
        const admissionData = await fetchJson(EXPLORER_DATASETS['admission-data']);
        admissionExplorerNodes.forEach(node => renderAdmissionDataExplorer(node, admissionData));
      } catch (error) {
        admissionExplorerNodes.forEach(node => {
          node.innerHTML = '<p class="linked-error">Admission Data Explorer 加载失败。请检查 wiki/data/explorers/admission-data.json。</p>';
        });
        console.error(error);
      }
    }

    if (academicExplorerNodes.length) {
      try {
        const academicData = await fetchJson(EXPLORER_DATASETS['academic-programs']);
        academicExplorerNodes.forEach(node => renderAcademicProgramsExplorer(node, academicData));
      } catch (error) {
        academicExplorerNodes.forEach(node => {
          node.innerHTML = '<p class="linked-error">Academic Programs Explorer 加载失败。请检查 wiki/data/explorers/academic-programs.json。</p>';
        });
        console.error(error);
      }
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
