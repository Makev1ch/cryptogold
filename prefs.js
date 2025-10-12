'use strict';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
// removed gettext usage per request

const SCHEMA = 'org.gnome.shell.extensions.cryptogold';

export default class CryptoGoldPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.set_default_size(650, 640);

        const _ = (s) => s;

        const settings = this.getSettings(SCHEMA);

        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({ title: 'Display Settings' });
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
            title: 'Indicator Position',
            model,
        });

        let current = settings.get_string('position') || 'right';
        // Clean up any quotes that might be present
        if (current && typeof current === 'string') {
            current = current.replace(/^['"]|['"]$/g, '');
        }
        const idx = Math.max(0, ids.indexOf(current));
        row.set_selected(idx);

        row.connect('notify::selected', () => {
            const selected = row.get_selected();
            if (selected >= 0 && selected < ids.length)
                settings.set_string('position', ids[selected]);
        });

        group.add(row);

        // Add position index setting
        const positionIndexRow = new Adw.SpinRow({
            title: 'Position Index',
            subtitle: '0 = beginning, -1 = end, positive numbers = specific position',
            adjustment: new Gtk.Adjustment({
                lower: -10,
                upper: 10,
                step_increment: 1,
                page_increment: 1,
            }),
        });

        const currentIndex = settings.get_int('position-index') || 0;
        positionIndexRow.set_value(currentIndex);

        positionIndexRow.connect('notify::value', () => {
            const value = positionIndexRow.get_value();
            settings.set_int('position-index', value);
        });

        group.add(positionIndexRow);

        // Add hide price setting
        const hidePriceRow = new Adw.ActionRow({
            title: 'Hide Bitcoin Price',
            subtitle: 'Hide price and stop API requests to save resources',
        });

        const hidePriceSwitch = new Gtk.Switch({
            active: settings.get_boolean('hide-price') || false,
            valign: Gtk.Align.CENTER,
        });

        hidePriceSwitch.connect('notify::active', () => {
            settings.set_boolean('hide-price', hidePriceSwitch.get_active());
        });

        hidePriceRow.add_suffix(hidePriceSwitch);
        hidePriceRow.set_activatable_widget(hidePriceSwitch);
        group.add(hidePriceRow);

        // Add custom text settings
        const customTextRow = new Adw.ActionRow({
            title: 'Use Custom Hidden Text',
            subtitle: 'Set custom text instead of "Hidden"',
        });

        const customTextSwitch = new Gtk.Switch({
            active: settings.get_boolean('use-custom-text') || false,
            valign: Gtk.Align.CENTER,
        });

        customTextSwitch.connect('notify::active', () => {
            settings.set_boolean('use-custom-text', customTextSwitch.get_active());
        });

        customTextRow.add_suffix(customTextSwitch);
        customTextRow.set_activatable_widget(customTextSwitch);
        group.add(customTextRow);

        // Add custom text input
        const customTextInputRow = new Adw.ActionRow({
            title: 'Custom Hidden Text',
            subtitle: 'Enter custom text',
        });

        const customTextEntry = new Gtk.Entry({
            placeholder_text: 'Enter custom text...',
            hexpand: true,
            height_request: 24,
            margin_top: 8,
            margin_bottom: 8,
            margin_start: 30,
        });

        const currentCustomText = settings.get_string('custom-hidden-text') || 'Hidden';
        // Remove quotes if present
        const cleanText = currentCustomText.replace(/^['"]|['"]$/g, '');
        customTextEntry.set_text(cleanText);

        customTextEntry.connect('changed', () => {
            const text = customTextEntry.get_text();
            settings.set_string('custom-hidden-text', text || 'Hidden');
        });

        customTextInputRow.add_suffix(customTextEntry);
        customTextInputRow.set_activatable_widget(customTextEntry);

        // Enable/disable input based on switch state
        const updateInputState = () => {
            customTextInputRow.set_sensitive(customTextSwitch.get_active());
        };
        customTextSwitch.connect('notify::active', updateInputState);
        updateInputState();

        group.add(customTextInputRow);

        // Add API Provider settings
        const apiGroup = new Adw.PreferencesGroup({ title: 'API Settings' });
        page.add(apiGroup);

        // API Provider selection
        const providerLabels = [
            'CoinGecko (Default)',
            'Binance.US',
            'Bitstamp',
            'Gate.io',
            'MEXC',
            'Huobi',
            'HitBTC',
            'Bybit'
        ];
        const providerIds = ['coingecko', 'binance', 'bitstamp', 'gateio', 'mexc', 'huobi', 'hitbtc', 'bybit'];

        const providerModel = Gtk.StringList.new(providerLabels);
        const providerRow = new Adw.ComboRow({
            title: 'API Provider',
            subtitle: 'Choose the data source for Bitcoin prices',
            model: providerModel,
        });

        let currentProvider = settings.get_string('api-provider') || 'coingecko';
        // Clean up any quotes that might be present
        if (currentProvider && typeof currentProvider === 'string') {
            currentProvider = currentProvider.replace(/^['"]|['"]$/g, '');
        }
        const providerIdx = Math.max(0, providerIds.indexOf(currentProvider));
        providerRow.set_selected(providerIdx);

        providerRow.connect('notify::selected', () => {
            const selected = providerRow.get_selected();
            if (selected >= 0 && selected < providerIds.length) {
                settings.set_string('api-provider', providerIds[selected]);
                // Update minimum interval based on provider
                updateMinInterval();
            }
        });

        apiGroup.add(providerRow);

        // Update interval setting
        const intervalRow = new Adw.SpinRow({
            title: 'Update Interval',
            subtitle: 'How often to update the price (in seconds)',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 3600,
                step_increment: 1,
                page_increment: 30,
            }),
        });

        const currentInterval = settings.get_int('update-interval') || 180;
        intervalRow.set_value(currentInterval);

        intervalRow.connect('notify::value', () => {
            const value = intervalRow.get_value();
            settings.set_int('update-interval', value);
        });

        // Function to update minimum interval based on provider
        const updateMinInterval = () => {
            const selectedProvider = settings.get_string('api-provider') || 'coingecko';
            let minInterval = 1;
            
            switch (selectedProvider) {
                case 'coingecko':
                    minInterval = 30; // 30 seconds for CoinGecko
                    break;
                case 'binance':
                    minInterval = 5; // 5 seconds for Binance
                    break;
                case 'bitstamp':
                case 'gateio':
                case 'mexc':
                case 'huobi':
                case 'hitbtc':
                case 'bybit':
                    minInterval = 1; // 1 second for others
                    break;
            }
            
            intervalRow.adjustment.set_lower(minInterval);
            const currentValue = intervalRow.get_value();
            if (currentValue < minInterval) {
                intervalRow.set_value(minInterval);
            }
        };

        // Initialize minimum interval
        updateMinInterval();

        apiGroup.add(intervalRow);

        // Add thanks section under API settings
        const thanksLabel = new Gtk.Label({
            label: 'Thanks ',
            halign: Gtk.Align.CENTER,
            css_classes: ['dim-label'],
            margin_top: 20,
            margin_bottom: 20,
        });
        
        const linkLabel = new Gtk.Label({
            label: '<a href="https://github.com/MysteriousGitEntity">MysteriousGitEntity</a>',
            halign: Gtk.Align.CENTER,
            css_classes: ['dim-label'],
            margin_top: 20,
            margin_bottom: 20,
            use_markup: true,
        });
        
        const thanksText = new Gtk.Label({
            label: ' for the feature ideas❤️',
            halign: Gtk.Align.CENTER,
            css_classes: ['dim-label'],
            margin_top: 20,
            margin_bottom: 20,
        });
        
        // Wrap the labels in a horizontal container
        const thanksContainer = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            halign: Gtk.Align.CENTER,
        });
        thanksContainer.append(thanksLabel);
        thanksContainer.append(linkLabel);
        thanksContainer.append(thanksText);
        
        // Add the container to the API group
        apiGroup.add(thanksContainer);

        window.add(page);
    }
}


