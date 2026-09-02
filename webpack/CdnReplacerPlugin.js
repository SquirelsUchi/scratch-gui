class CdnReplacerPlugin {
  name = 'CdnReplacerPlugin';

  constructor(options = {}) {
    this.from = options.from || 'https://cdn.local';
    this.to = options.to || '<%ASSETS_CDN_HOST-%>/<%APP_NAME-%>/';
    this.includeExtensions = options.includeExtensions || ['.js', '.css', '.html', '.map', '.txt', '.json'];
    this.verbose = !!options.verbose;

    const escaped = this._escapeRegex(this.from);
    this.rePlain = new RegExp(`${escaped}(?:/)?`, 'g');
    const encoded = encodeURIComponent(this.from);
    this.reEncoded = new RegExp(`${encoded}(?:%2F)?`, 'g');
  }

  apply(compiler) {
    const { Compilation, sources } = compiler.webpack;
    compiler.hooks.thisCompilation.tap(this.name, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: this.name,
          stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
        },
        (assets) => this._processAssets(assets, compilation, sources)
      );
    });
  }

  _processAssets(assets, compilation, sources) {
    const summary = {
      totalFiles: 0,
      totalOccurrences: 0,
      details: []
    };
    for (const [filename, asset] of Object.entries(assets)) {
      if (!this._shouldProcess(filename)) continue;
      this._processSingleAsset(filename, asset, sources, summary, compilation);
    }
    this._logSummary(summary);
  }

  _processSingleAsset(filename, asset, sources, summary, compilation) {
    const input = asset.source().toString();
    const output = this._transform(input);
    if (output === input) return;

    const countPlain = (input.match(this.rePlain) || []).length;
    const countEncoded = (input.match(this.reEncoded) || []).length;
    const total = countPlain + countEncoded;

    if (total > 0) {
      summary.totalFiles++;
      summary.totalOccurrences += total;
      if (this.verbose) summary.details.push(`${filename}→${total}`);
    }

    compilation.updateAsset(filename, new sources.RawSource(output));
  }

  _logSummary(summary) {
    if (summary.totalOccurrences === 0) return;
    const head = `🟢 [ReplaceCdnLocalPlugin] replaced ${
      summary.totalOccurrences
    } occurrence(s) across ${summary.totalFiles} file(s)`;
    if (this.verbose && summary.details.length) {
      console.log(`${head}: ${summary.details.join(', ')}`);
    } else {
      console.log(head);
    }
  }

  _shouldProcess(filename) {
    const lower = filename.toLowerCase();
    return this.includeExtensions.some((ext) => lower.endsWith(ext));
  }

  _transform(content) {
    let out = content.replace(this.rePlain, this._normalizedTo());
    out = out.replace(this.reEncoded, encodeURIComponent(this._normalizedTo()).replace(/%2F/gi, '/'));
    return out;
  }

  _normalizedTo() {
    return this.to.endsWith('/') ? this.to : `${this.to}/`;
  }

  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = { CdnReplacerPlugin };
