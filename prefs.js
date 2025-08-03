import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

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

        const mainGroup = new Adw.PreferencesGroup();
        this.add(mainGroup);

        const hideRow = new Adw.SwitchRow({
            title: _('Hide the system indicator'),
            subtitle: _('Hide the system indicator not to double information in the status area'),
            active: this._settings.get_boolean('hide-system-indicator'),
        });
        hideRow.connect('notify::active', () => this._settings.set_boolean('hide-system-indicator', hideRow.get_active()));
        mainGroup.add(hideRow);
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

