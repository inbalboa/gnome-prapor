import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {FlagMapper, extractLayoutId} from './flags.js';
import {LayoutMenuItem} from './layoutItem.js';

const APP_NAME = 'Prapor';
const KEYBOARD_VIEWER_CMD = 'tecla';

function logPrapor(message, error = null) {
    if (error)
        console.error(`${APP_NAME}: ${message}`, error);
    else
        console.debug(`${APP_NAME}: ${message}`);
}

function notifyPrapor(message) {
    Main.notify(APP_NAME, message);
}

const PraporIndicator = GObject.registerClass(
    class PraporIndicator extends PanelMenu.Button {
        _init(extension) {
            super._init(0.0, 'PraporIndicator');

            this._settings = extension.getSettings();
            this._keyboard = Main.panel.statusArea.keyboard;
            this._keyboardVisibilityChangedId = null;
            this._flagMapper = new FlagMapper(this._getCustomSymbols());

            this._flagLabel = new St.Label({
                text: this._flagMapper.getDefault(),
                style_class: 'prapor-label',
                y_align: Clutter.ActorAlign.CENTER,
            });
            this.add_child(this._flagLabel);

            this._inputSourceManager = Main.inputMethod._inputSourceManager;
            if (!this._inputSourceManager) {
                logPrapor('Initialization error:', 'Input source manager not available');
                notifyPrapor(_('Input source manager not available.'));
                this.destroy();
                return;
            }

            this._buildMenu();

            this._inputSourceChangedId = this._inputSourceManager.connect(
                'current-source-changed',
                this._onLayoutChanged.bind(this)
            );

            this._switchSystemIndicator();

            this._systemIndicatorSettingsChangedId = this._settings.connect('changed::hide-system-indicator', () => this._switchSystemIndicator());
            this._customSymbolsSettingsChangedId = this._settings.connect('changed::custom-layout-symbols', () => this._onCustomSymbolsChanged());
        }

        _buildMenu() {
            this._layoutSection = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(this._layoutSection);

            this._updateLayoutItems();

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            const showLayoutItem = new PopupMenu.PopupMenuItem(_('Show Keyboard Layout'));
            showLayoutItem.connect('activate', () => this._showKeyboardLayout());
            this.menu.addMenuItem(showLayoutItem);

            const settingsItem = new PopupMenu.PopupMenuItem(_('Keyboard Settings'));
            settingsItem.connect('activate', () => this._openKeyboardSettings());
            this.menu.addMenuItem(settingsItem);
        }

        _getCustomSymbols() {
            const customSymbols = new Map();
            try {
                const customSymbolsDict = this._settings.get_value('custom-layout-symbols').deep_unpack();
                for (const [layoutId, symbol] of Object.entries(customSymbolsDict))
                    customSymbols.set(layoutId, symbol);
            } catch (e) {
                logPrapor('Error loading custom symbols:', e);
            }
            return customSymbols;
        }

        _refillLayoutItems() {
            const sources = Object.values(this._inputSourceManager.inputSources);
            let needsRefill = !this._layoutItems || this._layoutItems.length !== sources.length;
            if (!needsRefill) {
                for (const source of sources) {
                    if (this._layoutItems[source.index].sourceId !== source.id) {
                        needsRefill = true;
                        break;
                    }
                }
            }
            if (!needsRefill)
                return false;

            this._layoutItems = Array.from({length: sources.length});
            for (const source of sources) {
                const flagSmb = this._flagMapper.getFlagBySourceId(source.id);
                const displayName = source.displayName || source.id;
                this._layoutItems[source.index] = new LayoutMenuItem(displayName, flagSmb, source.id, () => source.activate(true));
            }
            return true;
        }

        _updateLayoutItems() {
            const currentSourceId = this._inputSourceManager.currentSource?.id;
            const layoutsChanged = this._refillLayoutItems();

            let currentFlagSymbolText;
            this._layoutItems.forEach(i => {
                if (currentSourceId && i.sourceId === currentSourceId) {
                    i.makeActive();
                    currentFlagSymbolText = i.flagSymbol;
                } else {
                    i.makeInactive();
                }
            });
            this._flagLabel.text = currentFlagSymbolText ?? this._flagMapper.getDefault();

            if (layoutsChanged) {
                this._layoutSection.removeAll();
                this._layoutItems.forEach(i => this._layoutSection.addMenuItem(i));
            }
        }

        _onLayoutChanged() {
            this._updateLayoutItems();
        }

        _onCustomSymbolsChanged() {
            this._flagMapper.customSymbols = this._getCustomSymbols();
            this._layoutItems.length = 0;
            this._updateLayoutItems();
        }

        _switchSystemIndicator() {
            if (!this._settings) {
                logPrapor('System indicator switching error:', 'Settings not available');
                return;
            }
            const hide = this._settings.get_boolean('hide-system-indicator');
            if (hide) {
                if (this._keyboard) {
                    if (this._keyboardVisibilityChangedId) {
                        this._keyboard.disconnect(this._keyboardVisibilityChangedId);
                        this._keyboardVisibilityChangedId = null;
                    }
                    this._keyboardVisibilityChangedId = this._keyboard.connect('notify::visible', () => this._keyboard.hide());
                    this._keyboard.hide();
                }
            } else if (this._keyboardVisibilityChangedId) {
                if (this._keyboard) {
                    this._keyboard.disconnect(this._keyboardVisibilityChangedId);
                    this._keyboard.show();
                }
                this._keyboardVisibilityChangedId = null;
            }
        }

        _showKeyboardLayout() {
            const currentSourceId = this._inputSourceManager.currentSource?.id;
            const currentLayoutId = extractLayoutId(currentSourceId);
            try {
                Gio.Subprocess.new([KEYBOARD_VIEWER_CMD, currentLayoutId], Gio.SubprocessFlags.NONE);
            } catch (e) {
                logPrapor(`Could not open keyboard layout viewer for layout ${currentLayoutId}:`, e);
                try {
                    Gio.Subprocess.new([KEYBOARD_VIEWER_CMD], Gio.SubprocessFlags.NONE);
                } catch (ee) {
                    logPrapor('Could not open keyboard layout viewer :', ee);
                    notifyPrapor(_(`No keyboard layout viewer found. Install '${KEYBOARD_VIEWER_CMD}'.`));
                }
            }
        }

        _openKeyboardSettings() {
            try {
                Gio.Subprocess.new(['gnome-control-center', 'keyboard'], Gio.SubprocessFlags.NONE);
            } catch (e) {
                logPrapor('Could not open keyboard settings:', e);
                notifyPrapor(_('Could not open keyboard settings.'));
            }
        }

        destroy() {
            if (this._inputSourceChangedId) {
                this._inputSourceManager.disconnect(this._inputSourceChangedId);
                this._inputSourceChangedId = null;
            }
            if (this._systemIndicatorSettingsChangedId) {
                this._settings.disconnect(this._systemIndicatorSettingsChangedId);
                this._systemIndicatorSettingsChangedId = null;
            }
            if (this._customSymbolsSettingsChangedId) {
                this._settings.disconnect(this._customSymbolsSettingsChangedId);
                this._customSymbolsSettingsChangedId = null;
            }
            if (this._keyboardVisibilityChangedId) {
                this._keyboard.disconnect(this._keyboardVisibilityChangedId);
                this._keyboardVisibilityChangedId = null;
            }
            if (this._flagMapper) {
                this._flagMapper.destroy();
                this._flagMapper = null;
            }
            if (this._keyboard)
                this._keyboard.show();

            super.destroy();
        }
    }
);

export default class PraporExtension extends Extension {
    enable() {
        this._indicator = new PraporIndicator(this);
        Main.panel.addToStatusArea('prapor-indicator', this._indicator, Main.panel._rightBox.get_n_children() - 1, 'right');
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
