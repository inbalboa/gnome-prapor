import GObject from 'gi://GObject';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

export const LayoutMenuItem = GObject.registerClass(
class LayoutMenuItem extends PopupMenu.PopupBaseMenuItem {
    _init(displayName, flagSmb, sourceId, clickCallback) {
        super._init({
            reactive: true,
            can_focus: true,
            style_class: 'popup-menu-item',
        });

        this._displayName = displayName;
        this._flagSmb = flagSmb;
        this._sourceId = sourceId;

        const itemBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
        });

        // name on the left
        const nameLabel = new St.Label({
            text: displayName,
            x_expand: true,
            x_align: Clutter.ActorAlign.START,
        });
        itemBox.add_child(nameLabel);

        // flag on the right
        const flagLabel = new St.Label({
            text: flagSmb,
            x_align: Clutter.ActorAlign.END,
            style: 'margin-left: 10px;',
        });
        itemBox.add_child(flagLabel);

        this.add_child(itemBox);

        this.connect('activate', () => {
            this._parent._getTopMenu().close();
            clickCallback();
        });
    }

    makeActive() {
        this.setOrnament(PopupMenu.Ornament.DOT);
    }

    makeInactive() {
        this.setOrnament(PopupMenu.Ornament.NONE);
        this.setOrnament(PopupMenu.Ornament.RADIO);
    }

    destroy() {
        super.destroy();
    }
});
