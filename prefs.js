'use strict';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
// removed gettext usage per request

const SCHEMA = 'org.gnome.shell.extensions.cryptogold';

export default class CryptoGoldPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.set_default_size(520, 260);

        const _ = (s) => s;

        const settings = this.getSettings(SCHEMA);

        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({ title: 'Display settings' });
        page.add(group);

        const labels = [
            'Right of clock',
            'Left of clock',
            'Right panel side',
            'Left panel side',
        ];
        const ids = ['right-of-clock', 'left-of-clock', 'right', 'left'];

        const model = Gtk.StringList.new(labels);
        const row = new Adw.ComboRow({
            title: 'Indicator position',
            model,
        });

        let current = settings.get_string('position') || 'right';
        if (current && current.length > 1 && current[0] === "'" && current[current.length - 1] === "'")
            current = current.slice(1, -1);
        const idx = Math.max(0, ids.indexOf(current));
        row.set_selected(idx);

        row.connect('notify::selected', () => {
            const selected = row.get_selected();
            if (selected >= 0 && selected < ids.length)
                settings.set_string('position', ids[selected]);
        });

        group.add(row);
        window.add(page);
    }
}


