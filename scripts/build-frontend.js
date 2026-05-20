const fs = require('fs/promises');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const DIST_DIR = path.join(FRONTEND_DIR, 'dist');
const OUTPUT_FILE = path.join(DIST_DIR, 'app.js');

const FILES = [
    'i18n.js',
    'components/Standings.js',
    'components/Teams.js',
    'components/ClanWar.js',
    'components/BnlVsAll.js',
    'components/Maps.js',
    'components/Profile.js',
    'components/Admin.js',
    'components/Draft.js',
    'components/Portraits.js',
    'app.js',
];

const GLOBAL_EXPORTS = {
    'i18n.js': ['getLang', 'setLang', 't', 'useLang'],
    'components/Standings.js': ['Standings'],
    'components/Teams.js': ['Teams'],
    'components/ClanWar.js': ['ClanWar', 'MyMatchesPage', 'MatchesPage'],
    'components/BnlVsAll.js': ['BnlVsAll'],
    'components/Maps.js': ['Maps'],
    'components/Profile.js': ['Profile'],
    'components/Admin.js': ['Admin'],
    'components/Draft.js': ['DraftView', 'TeamRecruitView'],
    'components/Portraits.js': ['Portraits'],
};

async function buildOne(relativePath) {
    const inputPath = path.join(FRONTEND_DIR, relativePath);
    const source = await fs.readFile(inputPath, 'utf8');
    const result = await esbuild.transform(source, {
        loader: 'jsx',
        target: 'es2019',
        minify: false,
    });
    const exports = GLOBAL_EXPORTS[relativePath] || [];
    const exportCode = exports.length
        ? `\nObject.assign(globalThis, { ${exports.map(name => `${name}: typeof ${name} !== 'undefined' ? ${name} : undefined`).join(', ')} });\n`
        : '\n';
    return `(function () {\n${result.code}${exportCode}})();\n`;
}

async function main() {
    await fs.rm(DIST_DIR, { recursive: true, force: true });
    await fs.mkdir(DIST_DIR, { recursive: true });
    const bundledCode = (await Promise.all(FILES.map(buildOne))).join('\n');
    await fs.writeFile(OUTPUT_FILE, bundledCode);
    console.log(`Built ${FILES.length} frontend files into frontend/dist/app.js`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
