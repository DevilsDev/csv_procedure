#!/usr/bin/env node
/**
 * Version: 2.7.4
 * Description: Thresh CLI. Hand-rolled subcommand dispatch — no commander dep.
 *
 *   thresh clean   <file> [-o dir] [--rules path] [--quiet]
 *   thresh preview <file> [--rules path] [--limit N]
 *   thresh serve   [--port N]
 *   thresh version
 *   thresh help [<command>]
 *
 *   The CLI is also exposed via the `clinisync` bin name on the package for
 *   backwards compatibility.
 *
 * Author: Ali Kahwaji
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { transformSheetWithStats } = require('../src/etl/transform');
const { writeCsvOutput, writeManifestOutput } = require('../src/etl/load');
const { createIdMapper } = require('../src/etl/idMapper');
const { extractSheets } = require('../src/etl/extract');
const { DEFAULT_RULE_SET, loadRuleSetFromPath } = require('../src/etl/rules');

const VERSION = (function () {
  try { return fs.readFileSync(path.resolve(__dirname, '..', 'VERSION'), 'utf8').trim(); }
  catch { return '0.0.0'; }
})();

// ---------- arg parsing ----------

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--' ) { positional.push(...argv.slice(i + 1)); break; }
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const key = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
      const val = eq === -1 ? (argv[i + 1] && !argv[i + 1].startsWith('-') ? argv[++i] : true) : arg.slice(eq + 1);
      options[key] = val;
    } else if (arg.startsWith('-') && arg.length > 1) {
      const key = arg.slice(1);
      const val = (argv[i + 1] && !argv[i + 1].startsWith('-')) ? argv[++i] : true;
      options[key] = val;
    } else {
      positional.push(arg);
    }
  }
  return { positional, options };
}

// ---------- output helpers ----------

function info(msg, opts)  { if (!opts || !opts.quiet) process.stderr.write(msg + '\n'); }
function fatal(msg, code) { process.stderr.write('error: ' + msg + '\n'); process.exit(code || 1); }

function loadRuleSet(rulesArg) {
  if (!rulesArg || rulesArg === true) return DEFAULT_RULE_SET;
  return loadRuleSetFromPath(path.resolve(rulesArg));
}

function emptySummary() {
  return {
    sheetsProcessed: 0,
    rowsProcessed: 0,
    duplicatesRemoved: 0,
    invalidDobCount: 0,
    missingNhiCount: 0,
    redactedCellCount: 0,
  };
}

function accumulate(summary, stats) {
  summary.sheetsProcessed += 1;
  summary.rowsProcessed += stats.rowsProcessed;
  summary.duplicatesRemoved += stats.duplicatesRemoved;
  summary.invalidDobCount += stats.invalidDobCount;
  summary.missingNhiCount += stats.missingNhiCount;
  summary.redactedCellCount += stats.redactedCellCount;
}

// ---------- commands ----------

async function cmdClean(positional, options) {
  if (positional.length === 0) fatal('clean: missing input file. Try: thresh clean <file>');
  const inputPath = path.resolve(positional[0]);
  if (!fs.existsSync(inputPath)) fatal('clean: file not found: ' + inputPath);

  const outputDir = path.resolve(options.o || options.output || './out');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const ruleSet = loadRuleSet(options.rules);
  const idMapper = createIdMapper();
  const sheets = extractSheets(inputPath);
  const baseName = path.parse(inputPath).name;

  const summary = emptySummary();
  const sheetOutputs = [];
  const writtenFiles = [];

  // load.js writes to ../../csvs by default. We want a configurable output dir,
  // so we re-implement the small CSV write here using sheet_to_csv directly.
  const xlsx = require('xlsx');
  const fsp = fs.promises;

  for (const sheet of sheets) {
    const result = transformSheetWithStats(sheet.rows, idMapper, { ruleSet });
    const safeBase = baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const safeSheet = String(sheet.name).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = 'converted-' + safeBase + '-' + safeSheet + '.csv';
    const fullPath = path.join(outputDir, fileName);

    const ws = xlsx.utils.aoa_to_sheet(result.rows);
    const csv = xlsx.utils.sheet_to_csv(ws);
    await fsp.writeFile(fullPath, csv, 'utf8');

    writtenFiles.push(fileName);
    sheetOutputs.push({ sheetName: sheet.name, fileName, ...result.stats });
    accumulate(summary, result.stats);

    info('  wrote ' + fileName + '  (' + result.stats.rowsProcessed + ' rows)', options);
  }

  const manifest = {
    sourceFileName: path.basename(inputPath),
    generatedAt: new Date().toISOString(),
    ...summary,
    files: writtenFiles,
    sheets: sheetOutputs,
  };
  const manifestName = 'manifest-' + baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
  await fsp.writeFile(path.join(outputDir, manifestName), JSON.stringify(manifest, null, 2));
  info('  wrote ' + manifestName, options);

  if (!options.quiet) {
    process.stderr.write(
      '\n' +
      'Summary:\n' +
      '  sheets             ' + summary.sheetsProcessed + '\n' +
      '  rows processed     ' + summary.rowsProcessed + '\n' +
      '  duplicates removed ' + summary.duplicatesRemoved + '\n' +
      '  invalid DOB        ' + summary.invalidDobCount + '\n' +
      '  missing NHI        ' + summary.missingNhiCount + '\n' +
      '  redacted cells     ' + summary.redactedCellCount + '\n' +
      '  output dir         ' + path.relative(process.cwd(), outputDir) + '\n'
    );
  } else {
    // In quiet mode, emit JSON to stdout so it can be piped into jq / other tools.
    process.stdout.write(JSON.stringify({ ...summary, files: writtenFiles, manifest: manifestName, outputDir }) + '\n');
  }
}

async function cmdPreview(positional, options) {
  if (positional.length === 0) fatal('preview: missing input file. Try: thresh preview <file>');
  const inputPath = path.resolve(positional[0]);
  if (!fs.existsSync(inputPath)) fatal('preview: file not found: ' + inputPath);

  const limit = Number(options.limit) > 0 ? Number(options.limit) : 25;
  const ruleSet = loadRuleSet(options.rules);
  const idMapper = createIdMapper();
  const sheets = extractSheets(inputPath);

  const summary = emptySummary();
  const sheetOutputs = [];

  for (const sheet of sheets) {
    const result = transformSheetWithStats(sheet.rows, idMapper, { ruleSet });
    const cappedRows = result.rows.slice(0, limit);
    const totalDataRows = Math.max(0, result.rows.length - 1);
    const previewedDataRows = Math.max(0, cappedRows.length - 1);
    sheetOutputs.push({
      sheetName: sheet.name,
      ...result.stats,
      previewRows: cappedRows,
      previewMeta: {
        totalDataRows,
        previewedDataRows,
        truncated: previewedDataRows < totalDataRows,
      },
    });
    accumulate(summary, result.stats);
  }

  process.stdout.write(JSON.stringify({
    sourceFileName: path.basename(inputPath),
    generatedAt: new Date().toISOString(),
    ...summary,
    sheets: sheetOutputs,
    previewLimit: limit,
    dryRun: true,
  }, null, 2) + '\n');
}

function cmdServe(positional, options) {
  if (options.port) process.env.PORT = String(options.port);
  // Defer-require so the CLI starts fast and doesn't pay the Express import cost
  // on commands that don't need it.
  require('../server.js');
}

function cmdVersion() {
  process.stdout.write('thresh ' + VERSION + '\n');
}

function cmdHelp(positional) {
  const which = positional[0];
  const usage = {
    clean: [
      'thresh clean <file> [options]',
      '',
      '  Run the ETL pipeline on <file> and write per-sheet CSVs + a manifest to disk.',
      '',
      'Options:',
      '  -o, --output <dir>   Output directory (default: ./out)',
      '      --rules <path>   Path to a custom rule-set JSON',
      '      --quiet          Print a single JSON summary to stdout instead of the human report',
    ],
    preview: [
      'thresh preview <file> [options]',
      '',
      '  Run the pipeline against <file> and emit a JSON dry-run report to stdout.',
      '  No files are written. Useful for inspecting custom rules before committing.',
      '',
      'Options:',
      '      --rules <path>   Path to a custom rule-set JSON',
      '      --limit <n>      Max rows to include in each sheet preview (default: 25)',
    ],
    serve: [
      'thresh serve [options]',
      '',
      '  Start the HTTP server on PORT (default 3000). Honors all the runtime env vars',
      '  from .env.example: CLINISYNC_API_KEY, CLINISYNC_CSV_TTL_HOURS, CLINISYNC_RULES_PATH,',
      '  REDIS_URL, CLAMAV_TCP_HOST.',
      '',
      'Options:',
      '      --port <n>       Override PORT (default: 3000)',
    ],
  };

  if (which && usage[which]) {
    process.stdout.write(usage[which].join('\n') + '\n');
    return;
  }

  process.stdout.write([
    'Thresh — privacy-first spreadsheet ETL.',
    '',
    'Usage:',
    '  thresh <command> [args] [options]',
    '',
    'Commands:',
    '  clean      Clean a workbook and write outputs to a directory.',
    '  preview    Dry-run: produce a JSON report without writing files.',
    '  serve      Run the HTTP server.',
    '  version    Print the installed version.',
    '  help [cmd] Show this help, or detailed help for a single command.',
    '',
    'Run `thresh help <command>` for full options.',
  ].join('\n') + '\n');
}

// ---------- dispatch ----------

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) { cmdHelp([]); return; }

  const [command, ...rest] = argv;
  const { positional, options } = parseArgs(rest);

  switch (command) {
    case 'clean':              await cmdClean(positional, options); break;
    case 'preview':            await cmdPreview(positional, options); break;
    case 'serve':              cmdServe(positional, options); break;
    case 'version':
    case '--version':
    case '-v':                 cmdVersion(); break;
    case 'help':
    case '--help':
    case '-h':                 cmdHelp(positional); break;
    default:
      fatal('unknown command: ' + command + '\nrun `thresh help` for usage.', 2);
  }
}

main().catch(function (err) {
  fatal(err && err.message ? err.message : String(err));
});
