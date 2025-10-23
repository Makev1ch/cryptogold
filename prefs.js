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

        // Add Currency settings
        const currencyGroup = new Adw.PreferencesGroup({ title: 'Currency Settings' });
        page.add(currencyGroup);

        // Currency API Provider selection
        const currencyApiLabels = [
            'CoinGecko — 5 min',
            'ExchangeRate — 24 h',
            'fawazahmed0 — 1 h',
            'FloatRates — 1 h',
            'Frankfurter — 1 h',
            'WoXy-Sensei — 1 h'
        ];
        const currencyApiIds = ['coingecko', 'exchangerate-api', 'fawazahmed0', 'floatrates', 'frankfurter', 'woxysensei'];

        const currencyApiModel = Gtk.StringList.new(currencyApiLabels);
        const currencyApiRow = new Adw.ComboRow({
            title: 'Currency Exchange API',
            model: currencyApiModel,
        });

        let currentCurrencyApi = settings.get_string('currency-api-provider') || 'coingecko';
        if (currentCurrencyApi && typeof currentCurrencyApi === 'string') {
            currentCurrencyApi = currentCurrencyApi.replace(/^['"]|['"]$/g, '');
        }
        const currencyApiIdx = Math.max(0, currencyApiIds.indexOf(currentCurrencyApi));
        currencyApiRow.set_selected(currencyApiIdx);

        currencyApiRow.connect('notify::selected', () => {
            const selected = currencyApiRow.get_selected();
            if (selected >= 0 && selected < currencyApiIds.length) {
                settings.set_string('currency-api-provider', currencyApiIds[selected]);
            }
        });

        currencyGroup.add(currencyApiRow);

        // Currency selection with search
        const currencyRow = new Adw.ComboRow({
            title: 'Display Currency',
        });

        // List of currencies supported by different providers
        // Common major currencies supported by most providers
        const allProviders = ['coingecko', 'exchangerate-api', 'fawazahmed0', 'floatrates', 'frankfurter', 'woxysensei'];
        const mostProviders = ['coingecko', 'exchangerate-api', 'fawazahmed0', 'floatrates', 'frankfurter'];
        const manyProviders = ['coingecko', 'exchangerate-api', 'fawazahmed0', 'floatrates'];
        const ecbProviders = ['frankfurter', 'woxysensei']; // European Central Bank based
        
        const currencies = [
            // Major currencies - available in all providers
            { code: 'USD', name: 'US Dollar', available: allProviders },
            { code: 'EUR', name: 'Euro', available: allProviders },
            { code: 'GBP', name: 'British Pound Sterling', available: allProviders },
            { code: 'JPY', name: 'Japanese Yen', available: allProviders },
            { code: 'CAD', name: 'Canadian Dollar', available: allProviders },
            { code: 'AUD', name: 'Australian Dollar', available: allProviders },
            { code: 'CHF', name: 'Swiss Franc', available: allProviders },
            { code: 'CNY', name: 'Chinese Yuan', available: allProviders },
            { code: 'SEK', name: 'Swedish Krona', available: allProviders },
            { code: 'NOK', name: 'Norwegian Krone', available: allProviders },
            { code: 'DKK', name: 'Danish Krone', available: allProviders },
            { code: 'PLN', name: 'Polish Zloty', available: allProviders },
            { code: 'CZK', name: 'Czech Koruna', available: allProviders },
            { code: 'HUF', name: 'Hungarian Forint', available: allProviders },
            { code: 'BRL', name: 'Brazilian Real', available: allProviders },
            { code: 'MXN', name: 'Mexican Peso', available: allProviders },
            { code: 'INR', name: 'Indian Rupee', available: allProviders },
            { code: 'KRW', name: 'South Korean Won', available: allProviders },
            { code: 'SGD', name: 'Singapore Dollar', available: allProviders },
            { code: 'HKD', name: 'Hong Kong Dollar', available: allProviders },
            { code: 'NZD', name: 'New Zealand Dollar', available: allProviders },
            { code: 'TRY', name: 'Turkish Lira', available: allProviders },
            { code: 'ZAR', name: 'South African Rand', available: allProviders },
            { code: 'THB', name: 'Thai Baht', available: allProviders },
            { code: 'IDR', name: 'Indonesian Rupiah', available: allProviders },
            { code: 'MYR', name: 'Malaysian Ringgit', available: allProviders },
            { code: 'PHP', name: 'Philippine Peso', available: allProviders },
            { code: 'ILS', name: 'Israeli New Shekel', available: allProviders },
            { code: 'RON', name: 'Romanian Leu', available: allProviders },
            
            // Available in most but not all
            { code: 'RUB', name: 'Russian Ruble', available: ['coingecko', 'exchangerate-api', 'fawazahmed0', 'floatrates'] },
            { code: 'AED', name: 'UAE Dirham', available: mostProviders },
            { code: 'SAR', name: 'Saudi Riyal', available: mostProviders },
            { code: 'ARS', name: 'Argentine Peso', available: manyProviders },
            { code: 'CLP', name: 'Chilean Peso', available: manyProviders },
            { code: 'COP', name: 'Colombian Peso', available: manyProviders },
            { code: 'PEN', name: 'Peruvian Sol', available: manyProviders },
            { code: 'TWD', name: 'New Taiwan Dollar', available: manyProviders },
            { code: 'VND', name: 'Vietnamese Dong', available: manyProviders },
            
            // Available in many providers
            { code: 'KWD', name: 'Kuwaiti Dinar', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'BHD', name: 'Bahraini Dinar', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'LBP', name: 'Lebanese Pound', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'KES', name: 'Kenyan Shilling', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'LKR', name: 'Sri Lankan Rupee', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'PKR', name: 'Pakistani Rupee', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'AMD', name: 'Armenian Dram', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'GEL', name: 'Georgian Lari', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'UAH', name: 'Ukrainian Hryvnia', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'GTQ', name: 'Guatemalan Quetzal', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'HNL', name: 'Honduran Lempira', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'CRC', name: 'Costa Rican Colón', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'DOP', name: 'Dominican Peso', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'BMD', name: 'Bermudian Dollar', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'NGN', name: 'Nigerian Naira', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'MMK', name: 'Burmese Kyat', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'SVC', name: 'Salvadoran Colón', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'VEF', name: 'Venezuelan Bolívar Fuerte', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            { code: 'XDR', name: 'IMF Special Drawing Rights', available: ['coingecko', 'exchangerate-api', 'fawazahmed0'] },
            
            // ECB-based providers only (Frankfurter, VATcomply, WoXy-Sensei)
            { code: 'ISK', name: 'Icelandic Króna', available: ['frankfurter', 'floatrates', 'fawazahmed0', 'exchangerate-api'] },
            { code: 'BGN', name: 'Bulgarian Lev', available: ['frankfurter', 'woxysensei', 'floatrates', 'fawazahmed0', 'exchangerate-api'] }
        ];

        // Create model for currency selection with availability checking
        const createCurrencyModel = (currentProvider) => {
            const currencyLabels = currencies.map(currency => {
                const isAvailable = currency.available.includes(currentProvider);
                if (isAvailable) {
                    return `${currency.code} - ${currency.name}`;
                } else {
                    return `❌ ${currency.code} - ${currency.name}`;
                }
            });
            return Gtk.StringList.new(currencyLabels);
        };

        // Initialize with current currency provider
        let currentCurrencyProvider = settings.get_string('currency-api-provider') || 'coingecko';
        if (currentCurrencyProvider && typeof currentCurrencyProvider === 'string') {
            currentCurrencyProvider = currentCurrencyProvider.replace(/^['"]|['"]$/g, '');
        }
        currencyRow.model = createCurrencyModel(currentCurrencyProvider);

        // Update currency list when API provider changes
        currencyApiRow.connect('notify::selected', () => {
            const selected = currencyApiRow.get_selected();
            if (selected >= 0 && selected < currencyApiIds.length) {
                const newProvider = currencyApiIds[selected];
                settings.set_string('currency-api-provider', newProvider);
                currencyRow.model = createCurrencyModel(newProvider);
            }
        });

        // Set current currency
        let currentCurrency = settings.get_string('currency') || 'USD';
        if (currentCurrency && typeof currentCurrency === 'string') {
            currentCurrency = currentCurrency.replace(/^['"]|['"]$/g, '');
        }
        const currencyIdx = Math.max(0, currencies.findIndex(c => c.code === currentCurrency));
        currencyRow.set_selected(currencyIdx);

        currencyRow.connect('notify::selected', () => {
            const selected = currencyRow.get_selected();
            if (selected >= 0 && selected < currencies.length) {
                const currency = currencies[selected];
                const currentProvider = settings.get_string('currency-api-provider') || 'coingecko';
                const cleanProvider = currentProvider ? currentProvider.replace(/^['"]|['"]$/g, '') : 'coingecko';
                
                // Check if currency is available for current provider
                if (currency.available.includes(cleanProvider)) {
                    settings.set_string('currency', currency.code);
                } else {
                    // Revert to previous selection if unavailable currency is selected
                    console.warn(`Currency ${currency.code} is not available for ${cleanProvider}`);
                    // Find a fallback currency (USD is always available)
                    const fallbackIndex = currencies.findIndex(c => c.code === 'USD');
                    if (fallbackIndex >= 0) {
                        currencyRow.set_selected(fallbackIndex);
                        settings.set_string('currency', 'USD');
                    }
                }
            }
        });

        currencyGroup.add(currencyRow);

        // Move thanks section under currency settings and make a single centered label
        const thanksMarkup = new Gtk.Label({
            label: 'Thanks <a href="https://github.com/MysteriousGitEntity">MysteriousGitEntity</a> for the feature ideas❤️',
            halign: Gtk.Align.CENTER,
            css_classes: ['dim-label'],
            margin_top: 12,
            margin_bottom: 8,
            use_markup: true,
        });
        currencyGroup.add(thanksMarkup);

        window.add(page);
    }
}


