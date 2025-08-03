import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {panel} from 'resource:///org/gnome/shell/ui/main.js';

import {FlagMapper} from './flags.js';
import {LayoutMenuItem} from './layoutItem.js';

const PraporIndicator = GObject.registerClass(
    class PraporIndicator extends PanelMenu.Button {
        _init(extension) {
            super._init(0.0, 'PraporIndicator');

            this._settings = extension.getSettings();
            this._keyboard = panel.statusArea.keyboard;
            this._keyboardVisibilityChangedId = null;
            this._flagMapper = new FlagMapper();

            this._flagLabel = new St.Label({
                text: this._flagMapper.getDefault(),
                style_class: 'prapor-label',
                y_align: Clutter.ActorAlign.CENTER,
            });
            this.add_child(this._flagLabel);

            this._inputSourceManager = Main.inputMethod._inputSourceManager;
            if (!this._inputSourceManager) {
                console.error('Prapor: Input source manager not available');
                Main.notify('Prapor', _('Input source manager not available.'));
                this.destroy();
                return;
            }

            this._buildMenu();

            this._inputSourceChangedId = this._inputSourceManager.connect(
                'current-source-changed',
                this._onLayoutChanged.bind(this)
            );

            this._switchSystemIndicator();

            this._settingsChangedId = this._settings.connect('changed', () => this._switchSystemIndicator());
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

        _refillLayoutItems() {
            const sources = Object.values(this._inputSourceManager.inputSources);
            let refill = !this._layoutItems || this._layoutItems.length !== sources.length;
            if (!refill) {
                for (const source of sources) {
                    if (this._layoutItems[source.index]._sourceId !== source.id) {
                        refill = true;
                        break;
                    }
                }
            }
            if (!refill)
                return false;

            this._layoutItems = Array.apply(null, Array(sources.length)).map(() => {});
            for (const source of sources) {
                const flagSmb = this._flagMapper.getFlagBySourceId(source.id);
                const displayName = source.displayName || source.id;
                this._layoutItems[source.index] = new LayoutMenuItem(displayName, flagSmb, source.id, () => source.activate(true));
            }
            return true;
        }

        _updateLayoutItems() {
            const currentSource = this._inputSourceManager.currentSource;
            const isNewLayouts = this._refillLayoutItems();

            let labelText;
            this._layoutItems.forEach(i => {
                if (currentSource && i._sourceId === currentSource.id) {
                    i.makeActive();
                    labelText = i._flagSmb;
                } else {
                    i.makeInactive();
                }
            });
            this._flagLabel.text = labelText || this._flagMapper.getDefault();

            if (isNewLayouts) {
                this._layoutSection.removeAll();
                this._layoutItems.forEach(i => this._layoutSection.addMenuItem(i));
            }
        }

        _onLayoutChanged() {
            this._updateLayoutItems();
        }

        _switchSystemIndicator() {
            if (!this._settings) {
                console.error('Prapor: settings not available');
                return;
            }
            const hide = this._settings.get_boolean('hide-system-indicator');
            if (hide) {
                if (this._keyboard) {
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
            try {
                Gio.Subprocess.new(['tecla'], Gio.SubprocessFlags.NONE);
            } catch (e) {
                console.error('Prapor: could not open keyboard layout viewer:', e);
                Main.notify('Prapor', _('No keyboard layout viewer found. Install Tecla.'));
            }
        }

        _openKeyboardSettings() {
            try {
                Gio.Subprocess.new(['gnome-control-center', 'keyboard'], Gio.SubprocessFlags.NONE);
            } catch (e) {
                console.error('Prapor: could not open keyboard settings:', e);
                Main.notify('Prapor', _('Could not open keyboard settings.'));
            }
        }

        destroy() {
            if (this._inputSourceChangedId) {
                this._inputSourceManager.disconnect(this._inputSourceChangedId);
                this._inputSourceChangedId = null;
            }
            if (this._settingsChangedId) {
                this._settings.disconnect(this._settingsChangedId);
                this._settingsChangedId = null;
            }
            if (this._keyboardVisibilityChangedId) {
                this._keyboard.disconnect(this._keyboardVisibilityChangedId);
                this._keyboardVisibilityChangedId = null;
            }
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

