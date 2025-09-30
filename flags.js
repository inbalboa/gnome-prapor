const LAYOUT_FLAGS = {
    'us': '🇺🇸',
    'gb': '🇬🇧',
    'de': '🇩🇪',
    'fr': '🇫🇷',
    'es': '🇪🇸',
    'it': '🇮🇹',
    'pt': '🇵🇹',
    'pl': '🇵🇱',
    'cz': '🇨🇿',
    'sk': '🇸🇰',
    'hu': '🇭🇺',
    'ro': '🇷🇴',
    'bg': '🇧🇬',
    'hr': '🇭🇷',
    'rs': '🇷🇸',
    'si': '🇸🇮',
    'ba': '🇧🇦',
    'mk': '🇲🇰',
    'al': '🇦🇱',
    'gr': '🇬🇷',
    'tr': '🇹🇷',
    'ua': '🇺🇦',
    'by': '🇧🇾',
    'lt': '🇱🇹',
    'lv': '🇱🇻',
    'ee': '🇪🇪',
    'fi': '🇫🇮',
    'se': '🇸🇪',
    'no': '🇳🇴',
    'dk': '🇩🇰',
    'is': '🇮🇸',
    'nl': '🇳🇱',
    'be': '🇧🇪',
    'ch': '🇨🇭',
    'at': '🇦🇹',
    'lu': '🇱🇺',
    'jp': '🇯🇵',
    'kr': '🇰🇷',
    'cn': '🇨🇳',
    'tw': '🇹🇼',
    'hk': '🇭🇰',
    'in': '🇮🇳',
    'th': '🇹🇭',
    'vn': '🇻🇳',
    'id': '🇮🇩',
    'my': '🇲🇾',
    'sg': '🇸🇬',
    'ph': '🇵🇭',
    'br': '🇧🇷',
    'ar': '🇦🇷',
    'mx': '🇲🇽',
    'ca': '🇨🇦',
    'au': '🇦🇺',
    'nz': '🇳🇿',
    'za': '🇿🇦',
    'eg': '🇪🇬',
    'ma': '🇲🇦',
    'il': '🇮🇱',
    'sa': '🇸🇦',
    'ae': '🇦🇪',
    'ir': '🇮🇷',
    'pk': '🇵🇰',
    'bd': '🇧🇩',
    'lk': '🇱🇰',
    'mm': '🇲🇲',
    'kh': '🇰🇭',
    'la': '🇱🇦',
    'mn': '🇲🇳',
    'kz': '🇰🇿',
    'uz': '🇺🇿',
    'kg': '🇰🇬',
    'tj': '🇹🇯',
    'tm': '🇹🇲',
    'af': '🇦🇫',
    'am': '🇦🇲',
    'az': '🇦🇿',
    'ge': '🇬🇪',
    'md': '🇲🇩',
    'me': '🇲🇪',
    'xk': '🇽🇰',
    'default': '⌨️',
};

// Handle special cases and variants
const LAYOUT_ID_MAPPINGS = {
    'eng': 'us',
    'ger': 'de',
    'fra': 'fr',
    'spa': 'es',
    'ita': 'it',
    'por': 'pt',
    'rus': 'ru',
    'pol': 'pl',
    'cze': 'cz',
    'hun': 'hu',
    'rom': 'ro',
    'bul': 'bg',
    'hrv': 'hr',
    'srp': 'rs',
    'slv': 'si',
    'bos': 'ba',
    'mkd': 'mk',
    'alb': 'al',
    'gre': 'gr',
    'tur': 'tr',
    'ukr': 'ua',
    'bel': 'by',
    'lit': 'lt',
    'lav': 'lv',
    'est': 'ee',
    'fin': 'fi',
    'swe': 'se',
    'nor': 'no',
    'dan': 'dk',
    'ice': 'is',
    'dut': 'nl',
    'fle': 'be',
    'ger(switzerland)': 'ch',
    'austria': 'at',
    'jpn': 'jp',
    'kor': 'kr',
    'chi': 'cn',
    'taiwanese': 'tw',
    'hongkong': 'hk',
    'ind': 'in',
    'tha': 'th',
    'vie': 'vn',
    'indonesian': 'id',
    'malay': 'my',
    'singapore': 'sg',
    'filipino': 'ph',
    'portuguese(brazil)': 'br',
    'spanish(argentina)': 'ar',
    'spanish(mexico)': 'mx',
    'canadian': 'ca',
    'australian': 'au',
    'newzealand': 'nz',
};

// Map common IBus engines to country codes
const IBUS_MAPPING = {
    'libpinyin': 'cn',
    'hangul': 'kr',
    'anthy': 'jp',
    'mozc': 'jp',
    'rime': 'cn',
    'table': 'cn',
    'chewing': 'tw',
    'unikey': 'vn',
    'm17n:hi:itrans': 'in',
    'm17n:ar:kbd': 'sa',
    'm17n:fa:isiri': 'ir',
    'm17n:th:kesmanee': 'th',
    'm17n:my:zawgyi': 'mm',
    'm17n:bn:itrans': 'bd',
    'm17n:ta:tamil99': 'in',
    'm17n:te:itrans': 'in',
    'm17n:ml:itrans': 'in',
    'm17n:kn:itrans': 'in',
    'm17n:gu:itrans': 'in',
    'm17n:pa:itrans': 'in',
    'm17n:or:itrans': 'in',
    'm17n:as:itrans': 'in',
};

export function extractLayoutId(sourceId) {
    // Handle different input source ID formats
    // Examples: "xkb:us::eng", "xkb:de::ger", "ibus:libpinyin"

    if (sourceId.startsWith('xkb:')) {
        const parts = sourceId.split(':');
        return parts[1] || 'us';
    }
    if (sourceId.startsWith('ibus:')) {
        const engine = sourceId.replace('ibus:', '');
        return IBUS_MAPPING[engine] || 'default';
    }
    return sourceId;
}

export class FlagMapper {
    constructor(customSymbols) {
        this._cache = new Map();
        this._customSymbols = customSymbols;
    }

    getFlagBySourceId(sourceId) {
        if (this._cache.has(sourceId))
            return this._cache.get(sourceId);

        const flagSmb = this._computeFlag(sourceId);
        this._cache.set(sourceId, flagSmb);
        return flagSmb;
    }

    getDefault() {
        return LAYOUT_FLAGS.default;
    }

    _computeFlag(sourceId) {
        let layoutId = extractLayoutId(sourceId).toLowerCase();

        if (LAYOUT_ID_MAPPINGS[layoutId])
            layoutId = LAYOUT_ID_MAPPINGS[layoutId];

        if (this._customSymbols.has(layoutId))
            return this._customSymbols.get(layoutId);

        return LAYOUT_FLAGS[layoutId] || LAYOUT_FLAGS.default;
    }

    set customSymbols(newCustomSymbols) {
        this._customSymbols = newCustomSymbols;
        this._cache.clear();
    }

    destroy() {
        this._cache.clear();
        this._customSymbols.clear();
        this._cache = null;
        this._customSymbols = null;
    }
}
