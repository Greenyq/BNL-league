const { MapLabel, MapFile } = require('../models/Map');

const MAP_CATALOG = [
    ['Великие Земли', 'biome', [['Lost Temple', 'great-lands/lost-temple.jpg'], ['Scrimmage', 'great-lands/scrimmage.jpg'], ['Twisted Meadows', 'great-lands/twisted-meadows.jpg']]],
    ['Диагональная тройка', 'biome', [['Autumn Leaves v2', 'diagonal-three/autumn-leaves-v2.jpg'], ['Tidehunters', 'diagonal-three/tidehunters.jpg'], ['Turtle Rock v2', 'diagonal-three/turtle-rock-v2.jpg']]],
    ['Ледяной Рубеж', 'biome', [['Frozen Meadows', 'icy-frontier/frozen-meadows.jpg'], ['Northern Isles', 'icy-frontier/northern-isles.jpg'], ['Springtime', 'icy-frontier/springtime.jpg']]],
    ['Смежный мир', 'biome', [['Echo Isles v2', 'adjacent-world/echo-isles-v2.jpg'], ['Shallow Grave', 'adjacent-world/shallow-grave.jpg'], ['Terenas Stand', 'adjacent-world/terenas-stand.jpg']]],
    ['Три сезона', 'biome', [['Autumn Leaves v2', 'three-seasons/autumn-leaves-v2.jpg'], ['Hammerfall', 'three-seasons/hammerfall.jpg'], ['Last Refuge', 'three-seasons/last-refuge.jpg']]],
    ['Арена героев', 'arena', [['Last Refuge BNL', 'hero-arena/last-refuge-bnl.png'], ['Lost BNL', 'hero-arena/lost-temple-bnl.jpg'], ['Scrimmage BNL', 'hero-arena/scrimmage-bnl.jpg'], ['Shadow BNL', 'hero-arena/shallow-grave-bnl.jpg'], ['Springtime BNL', 'hero-arena/springtime-bnl.jpg']]],
];

async function initializeMapCatalog() {
    for (const [name, kind, maps] of MAP_CATALOG) {
        // Older installations have a unique `name_1` index and labels without a
        // season. Reuse and upgrade those records instead of inserting duplicates.
        let label = await MapLabel.findOne({ name });
        if (!label) {
            try { label = await MapLabel.create({ season: 'Season 3', name, kind, active: true }); }
            catch (err) {
                if (err.code !== 11000) throw err;
                label = await MapLabel.findOne({ name });
            }
        }
        if (!label) throw new Error(`Failed to initialize biome: ${name}`);
        if (label.season !== 'Season 3' || label.kind !== kind || label.active === undefined) {
            label.season = 'Season 3';
            label.kind = kind;
            if (label.active === undefined) label.active = true;
            await label.save();
        }
        for (const [title, image] of maps) {
            const previewImageUrl = `/images/maps/season-1/${image}`;
            await MapFile.updateOne(
                { labelId: String(label.id), title },
                { $setOnInsert: { labelId: String(label.id), title, description: '' }, $set: { previewImageUrl } },
                { upsert: true }
            );
        }
    }
}

let catalogReady = null;
function ensureMapCatalog() {
    if (!catalogReady) {
        catalogReady = initializeMapCatalog().catch(err => {
            catalogReady = null;
            throw err;
        });
    }
    return catalogReady;
}

module.exports = { ensureMapCatalog, MAP_CATALOG };
