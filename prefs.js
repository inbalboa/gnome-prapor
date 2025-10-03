import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';


import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {extractLayoutId} from './flags.js';

export default class PraporMenuPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        if (!iconTheme.get_search_path().includes(`${this.path}/media`))
            iconTheme.add_search_path(`${this.path}/media`);

        const settings = this.getSettings();
        const settingsPage = new SettingsPage(settings);
        window.add(settingsPage);

        const aboutPage = new AboutPage(this.metadata);
        window.add(aboutPage);
    }
}

export const SettingsPage = GObject.registerClass(class PraporSettingsPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('Settings'),
            icon_name: 'settings-symbolic',
        });

        this._settings = settings;

        const mainGroup = new Adw.PreferencesGroup({
            title: _('Hiding the system indicator'),
            description: _('Hide the system indicator not to double information in the status area'),
        });
        this.add(mainGroup);

        const hideRow = new Adw.SwitchRow({
            title: _('Hide'),
            active: this._settings.get_boolean('hide-system-indicator'),
        });
        hideRow.connect('notify::active', () => this._settings.set_boolean('hide-system-indicator', hideRow.get_active()));
        mainGroup.add(hideRow);

        const customSymbolsGroup = new Adw.PreferencesGroup({
            title: _('Custom Layout Symbols'),
            description: _('Set custom symbols for specific keyboard layouts'),
        });
        this.add(customSymbolsGroup);

        this._createCustomSymbolsUI(customSymbolsGroup);
    }

    _createCustomSymbolsUI(group) {
        this._inputSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.input-sources' });

        this._symbolEntry = new Adw.EntryRow({
            title: _('Custom symbol'),
        });

        const addButton = new Gtk.Button({
            icon_name: 'list-add-symbolic',
            css_classes: ['suggested-action'],
            valign: Gtk.Align.CENTER,
        });
        addButton.set_tooltip_text(_('Add'));
        addButton.connect('clicked', () => this._addCustomSymbol());

        this._symbolEntry.add_suffix(addButton);
        group.add(this._symbolEntry);

        const spacer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
        spacer.set_size_request(-1, 12);
        group.add(spacer);

        this._customSymbolsList = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['boxed-list'],
        });
        group.add(this._customSymbolsList);

        this._loadCustomSymbols();
        this._settings.connect('changed::custom-layout-symbols', () => this._loadCustomSymbols());
    }

    _showLayoutPickerDialog(onPicked) {
        try {
            const sources = this._inputSettings.get_value('sources').deep_unpack();

            const layoutIds = [];
            for (const [_type, sourceId] of sources) {
                const id = extractLayoutId(sourceId ?? '');
                if (id)
                    layoutIds.push(id);
            }

            if (layoutIds.length === 0) {
                return;
            }

            const parent = this.get_root();
            const dialog = new Gtk.Dialog({
                transient_for: parent instanceof Gtk.Window ? parent : null,
                modal: true,
                title: _('Choose layout'),
            });

            dialog.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
            dialog.add_button(_('Add'), Gtk.ResponseType.OK);

            const box = dialog.get_content_area();
            box.set_spacing(6);

            const listBox = new Gtk.ListBox({
                selection_mode: Gtk.SelectionMode.SINGLE,
                css_classes: ['boxed-list'],
                activate_on_single_click: true,
            });

            let preselectRow = null;
            layoutIds.forEach((id, idx) => {
                const row = new Adw.ActionRow({
                    title: id,
                    activatable: true,
                });
                row._layoutId = id;
                listBox.append(row);
                if (idx === 0)
                    preselectRow = row;
            });

            listBox.connect('row-activated', (_lb, row) => {
                listBox.select_row(row);
            });

            box.append(listBox);
            listBox.select_row(preselectRow);

            dialog.connect('response', (_d, response) => {
                if (response === Gtk.ResponseType.OK) {
                    const selected = listBox.get_selected_row();
                    if (selected)
                        onPicked(selected._layoutId);
                }
                dialog.destroy();
            });

            dialog.present();
        } catch (e) {
            console.error('Failed to open layout picker dialog:', e);
        }
    }

    _getCurrentLayoutId() {
        try {
            const inputSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.input-sources' });
            const sources = inputSettings.get_value('sources').deep_unpack();
            const currentIndex = inputSettings.get_uint('current');
            const current = sources[currentIndex] ?? sources[0];
            if (!current)
                return '';

            const [_type, sourceId] = current;
            return extractLayoutId(sourceId ?? '');
        } catch (e) {
            console.error('Failed to get current layout from input-sources:', e);
            return '';
        }
    }

    _addCustomSymbol() {
        const symbol = this._symbolEntry.get_text().trim();
        if (!symbol)
            return;

        this._showLayoutPickerDialog((layoutId) => {
            try {
                const currentCustomSymbols = this._settings.get_value('custom-layout-symbols').deep_unpack();
                currentCustomSymbols[layoutId] = symbol;

                const variant = new GLib.Variant('a{ss}', currentCustomSymbols);
                this._settings.set_value('custom-layout-symbols', variant);

                this._symbolEntry.set_text('');
            } catch (e) {
                console.error('Error adding custom symbol:', e);
            }
        });
    }

    _loadCustomSymbols() {
        let child = this._customSymbolsList.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._customSymbolsList.remove(child);
            child = next;
        }

        try {
            const customSymbols = this._settings.get_value('custom-layout-symbols').deep_unpack();
            for (const [layoutId, symbol] of Object.entries(customSymbols))
                this._createCustomSymbolRow(layoutId, symbol);
        } catch (e) {
            console.error('Error loading custom symbols:', e);
        }
    }

    _createCustomSymbolRow(layoutId, symbol) {
        const row = new Adw.ActionRow({
            title: symbol,
            subtitle: `Layout: ${layoutId}`,
        });

        const deleteButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
        });
        deleteButton.connect('clicked', () => this._removeCustomSymbol(layoutId));

        row.add_suffix(deleteButton);
        this._customSymbolsList.append(row);
    }

    _removeCustomSymbol(layoutId) {
        try {
            const currentCustomSymbols = this._settings.get_value('custom-layout-symbols').deep_unpack();
            delete currentCustomSymbols[layoutId];

            const variant = new GLib.Variant('a{ss}', currentCustomSymbols);
            this._settings.set_value('custom-layout-symbols', variant);
        } catch (e) {
            console.error('Error removing custom symbol:', e);
        }
    }
});

export const AboutPage = GObject.registerClass(class PraporAboutPage extends Adw.PreferencesPage {
    _init(metadata) {
        super._init({
            title: _('About'),
            icon_name: 'help-about-symbolic',
        });

        const PROJECT_IMAGE = 'prapor-logo';
        const EXTERNAL_LINK_ICON = 'adw-external-link-symbolic';

        const praporGroup = new Adw.PreferencesGroup();
        const praporBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 10,
            margin_bottom: 10,
            hexpand: false,
            vexpand: false,
        });

        const projectImage = new Gtk.Image({
            margin_bottom: 15,
            icon_name: PROJECT_IMAGE,
            pixel_size: 100,
        });

        const praporLabel = new Gtk.Label({
            label: '<span size="large"><b>Prapor</b></span>',
            use_markup: true,
            vexpand: true,
            valign: Gtk.Align.FILL,
        });

        const projectDescriptionLabel = new Gtk.Label({
            label: _('Displays the current keyboard layout as a country flag'),
            hexpand: false,
            vexpand: false,
            margin_bottom: 5,
        });

        praporBox.append(projectImage);
        praporBox.append(praporLabel);
        praporBox.append(projectDescriptionLabel);
        praporGroup.add(praporBox);

        this.add(praporGroup);
        // -----------------------------------------------------------------------

        // Extension/OS Info Group------------------------------------------------
        const extensionInfoGroup = new Adw.PreferencesGroup();
        const praporVersionRow = new Adw.ActionRow({
            title: _('Prapor Version'),
        });
        const releaseVersion = metadata['version-name'] ? metadata['version-name'] : 'unknown';
        praporVersionRow.add_suffix(new Gtk.Label({
            label: `${releaseVersion}`,
        }));

        const gnomeVersionRow = new Adw.ActionRow({
            title: _('GNOME Version'),
        });
        gnomeVersionRow.add_suffix(new Gtk.Label({
            label: `${Config.PACKAGE_VERSION.toString()}`,
        }));

        const createdByRow = new Adw.ActionRow({
            title: _('Made by'),
        });
        createdByRow.add_suffix(new Gtk.Label({
            label: 'Serhiy Shliapuhin',
        }));

        const githubLinkRow = new Adw.ActionRow({
            title: 'GitHub',
        });
        githubLinkRow.add_suffix(new Gtk.LinkButton({
            icon_name: EXTERNAL_LINK_ICON,
            uri: 'https://github.com/inbalboa/gnome-prapor',
        }));

        const contributorRow = new Adw.ActionRow({
            title: _('Contributors'),
        });
        contributorRow.add_suffix(new Gtk.LinkButton({
            icon_name: EXTERNAL_LINK_ICON,
            uri: 'https://github.com/inbalboa/gnome-prapor/graphs/contributors',
        }));

        extensionInfoGroup.add(praporVersionRow);
        extensionInfoGroup.add(gnomeVersionRow);
        extensionInfoGroup.add(createdByRow);
        extensionInfoGroup.add(githubLinkRow);
        extensionInfoGroup.add(contributorRow);

        this.add(extensionInfoGroup);
        // -----------------------------------------------------------------------

        const licenseLabel = _('Licensed under the GNU General Public License v3.0 or later.');
        const urlLabel = _('© 2025 Serhiy Shliapuhin. See the %sLICENSE%s for details.').format('<a href="https://www.gnu.org/licenses/gpl.txt">', '</a>');

        const gnuSoftwareGroup = new Adw.PreferencesGroup();
        const gnuSofwareLabel = new Gtk.Label({
            label: `<span size="small">${licenseLabel}\n${urlLabel}</span>`,
            use_markup: true,
            justify: Gtk.Justification.CENTER,
        });

        const gnuSofwareLabelBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.END,
            vexpand: true,
            margin_top: 5,
            margin_bottom: 10,
        });
        gnuSofwareLabelBox.append(gnuSofwareLabel);
        gnuSoftwareGroup.add(gnuSofwareLabelBox);
        this.add(gnuSoftwareGroup);
    }
});


