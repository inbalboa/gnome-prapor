import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';

import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

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
        const addLayoutRow = new Adw.ActionRow();

        const addLayoutBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6,
            margin_top: 6,
            margin_bottom: 6,
        });

        this._layoutIdEntry = new Gtk.Entry({
            placeholder_text: _('Layout ID (e.g., en, de, ua)'),
            hexpand: true,
        });

        this._symbolEntry = new Gtk.Entry({
            placeholder_text: _('Symbols (e.g., 🇬🇧, EN, ⚡)'),
            hexpand: true,
        });

        const addButton = new Gtk.Button({
            label: _('Add'),
            css_classes: ['suggested-action'],
        });
        addButton.connect('clicked', () => this._addCustomSymbol());

        addLayoutBox.append(this._layoutIdEntry);
        addLayoutBox.append(this._symbolEntry);
        addLayoutBox.append(addButton);
        addLayoutRow.add_suffix(addLayoutBox);
        group.add(addLayoutRow);

        this._customSymbolsList = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['boxed-list'],
        });
        group.add(this._customSymbolsList);

        this._loadCustomSymbols();
        this._settings.connect('changed::custom-layout-symbols', () => this._loadCustomSymbols());
    }

    _addCustomSymbol() {
        const layoutId = this._layoutIdEntry.get_text().trim();
        const symbol = this._symbolEntry.get_text().trim();

        if (!layoutId || !symbol)
            return;

        try {
            const currentCustomSymbols = this._settings.get_value('custom-layout-symbols').deep_unpack();
            currentCustomSymbols[layoutId] = symbol;

            const variant = new GLib.Variant('a{ss}', currentCustomSymbols);
            this._settings.set_value('custom-layout-symbols', variant);

            this._layoutIdEntry.set_text('');
            this._symbolEntry.set_text('');
        } catch (e) {
            console.error('Error adding custom symbol:', e);
        }
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
            label: `<span size="large"><b>Prapor</b></span>`,
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

        const licenseLabel = _('This project is licensed under the GPL-3.0 License.');
        const urlLabel = _('See the %sLicense%s for details.').format('<a href="https://www.gnu.org/licenses/gpl.txt">', '</a>');

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


