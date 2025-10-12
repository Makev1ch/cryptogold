'use strict';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
// removed gettext usage per request
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class BitcoinExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._box = null;
        this._session = null;
        this._timeoutId = null;
        this._isErrorState = false;
        this._settings = null;
        this._settingsChangedId = null;
        this._menu = null;
        this._isPriceHidden = false;

        this._ = (s) => s;
    }

    _initSettings() {
        this._settings = this.getSettings();
        if (!this._settings) {
            console.error('CryptoGold: Failed to initialize settings');
            return false;
        }
        return true;
    }

    _createContextMenu() {
        if (!this._indicator) {
            console.error('CryptoGold: Cannot create context menu without indicator');
            return false;
        }
        
        this._menu = new PopupMenu.PopupMenu(this._indicator, 0.5, St.Side.TOP);
        Main.uiGroup.add_child(this._menu.actor);
        this._menu.actor.hide();

        this._updateContextMenu();
        return true;
    }

    _togglePriceVisibility() {
        this._isPriceHidden = !this._isPriceHidden;
        this._settings.set_boolean('hide-price', this._isPriceHidden);
        
        if (this._isPriceHidden) {
            if (this._timeoutId) {
                GLib.Source.remove(this._timeoutId);
                this._timeoutId = null;
            }
            this._showHiddenPrice();
        } else {
            this._updateData();
            this._scheduleNextUpdate(180);
        }
        
        this._updateContextMenu();
    }

    _updateContextMenu() {
        if (this._menu) {
            this._menu.removeAll();
            const toggleItem = new PopupMenu.PopupMenuItem(this._isPriceHidden ? 'Show Bitcoin Price' : 'Hide Bitcoin Price');
            toggleItem.connect('activate', () => {
                this._togglePriceVisibility();
            });
            this._menu.addMenuItem(toggleItem);
        }
    }

    _showHiddenPrice() {
        if (this._box) {
            this._box.destroy_all_children();

            const useCustomText = this._settings ? this._settings.get_boolean('use-custom-text') : false;
            const customText = this._settings ? this._settings.get_string('custom-hidden-text') : 'Hidden';
            const hiddenText = useCustomText ? customText : 'Hidden';

            const hiddenContainer = new St.BoxLayout({ vertical: false });
            hiddenContainer.style_class = 'hidden-price';

            const btcLabel = new St.Label({
                text: 'BTC = ',
                y_align: Clutter.ActorAlign.CENTER,
            });

            const hiddenTextLabel = new St.Label({
                text: hiddenText,
                style_class: 'hidden-text',
                y_align: Clutter.ActorAlign.CENTER,
            });

            hiddenContainer.add_child(btcLabel);
            hiddenContainer.add_child(hiddenTextLabel);
            this._box.add_child(hiddenContainer);
        }
    }

    _createIndicator() {
        this._indicator = new PanelMenu.Button(0.0, 'Bitcoin Indicator', false);
        this._box = new St.BoxLayout({ vertical: false });
        this._indicator.add_child(this._box);
        
        this._indicator.connect('button-press-event', (actor, event) => {
            if (event.get_button() === Clutter.BUTTON_PRIMARY) {
                if (this._menu) {
                    this._menu.toggle();
                }
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        return true;
    }

    _placeIndicator() {
        const pos = this._settings ? this._settings.get_string('position') : 'right';
        const positionIndex = this._settings ? this._settings.get_int('position-index') : 0;
    
        switch (pos) {
            case 'right-of-clock': {
                const dateMenu = Main.panel.statusArea && Main.panel.statusArea.dateMenu;
                const centerBox = Main.panel._centerBox;
                if (dateMenu && dateMenu.container && centerBox) {
                    const children = centerBox.get_children();
                    const idx = children.indexOf(dateMenu.container);
                    let targetIdx = idx >= 0 ? idx + 1 : -1;
                    
                    if (positionIndex !== 0) {
                        if (positionIndex === -1) {
                            targetIdx = children.length;
                        } else if (positionIndex > 0) {
                            targetIdx = Math.min(positionIndex, children.length);
                        } else {
                            targetIdx = Math.max(0, children.length + positionIndex);
                        }
                    }
                    
                    if (targetIdx >= 0)
                        centerBox.insert_child_at_index(this._indicator.container ?? this._indicator, targetIdx);
                    else
                        centerBox.add_child(this._indicator.container ?? this._indicator);
                    return;
                }
                Main.panel.addToStatusArea('bitcoin-indicator', this._indicator, 1, 'center');
                return;
            }
            case 'left-of-clock': {
                const dateMenu = Main.panel.statusArea && Main.panel.statusArea.dateMenu;
                const centerBox = Main.panel._centerBox;
                if (dateMenu && dateMenu.container && centerBox) {
                    const children = centerBox.get_children();
                    const idx = children.indexOf(dateMenu.container);
                    let targetIdx = idx >= 0 ? idx : 0;
                    
                    if (positionIndex !== 0) {
                        if (positionIndex === -1) {
                            targetIdx = children.length;
                        } else if (positionIndex > 0) {
                            targetIdx = Math.min(positionIndex, children.length);
                        } else {
                            targetIdx = Math.max(0, children.length + positionIndex);
                        }
                    }
                    
                    centerBox.insert_child_at_index(this._indicator.container ?? this._indicator, targetIdx);
                    return;
                }
                Main.panel.addToStatusArea('bitcoin-indicator', this._indicator, 1, 'center');
                return;
            }
            case 'left': {
                Main.panel.addToStatusArea('bitcoin-indicator', this._indicator, 1, 'left');
                const parent = (this._indicator.container ?? this._indicator).get_parent();
                if (parent && parent.insert_child_at_index) {
                    const children = parent.get_children();
                    let targetIdx = Math.min(children.length, 1);
                    
                    if (positionIndex !== 0) {
                        if (positionIndex === -1) {
                            targetIdx = children.length;
                        } else if (positionIndex > 0) {
                            targetIdx = Math.min(positionIndex, children.length);
                        } else {
                            targetIdx = Math.max(0, children.length + positionIndex);
                        }
                    }
                    
                    parent.remove_child(this._indicator.container ?? this._indicator);
                    parent.insert_child_at_index(this._indicator.container ?? this._indicator, targetIdx);
                }
                return;
            }
            case 'right':
            default: {
                Main.panel.addToStatusArea('bitcoin-indicator', this._indicator, 1, 'right');
                const parent = (this._indicator.container ?? this._indicator).get_parent();
                if (parent && parent.insert_child_at_index && positionIndex !== 0) {
                    const children = parent.get_children();
                    let targetIdx = children.length;
                    
                    if (positionIndex === -1) {
                        targetIdx = children.length;
                    } else if (positionIndex > 0) {
                        targetIdx = Math.min(positionIndex, children.length);
                    } else {
                        targetIdx = Math.max(0, children.length + positionIndex);
                    }
                    
                    parent.remove_child(this._indicator.container ?? this._indicator);
                    parent.insert_child_at_index(this._indicator.container ?? this._indicator, targetIdx);
                }
                return;
            }
        }
    }

    enable() {
        if (!this._initSettings()) {
            console.error('CryptoGold: Failed to initialize settings, extension disabled');
            return;
        }

        if (!this._createIndicator()) {
            console.error('CryptoGold: Failed to create indicator, extension disabled');
            return;
        }

        this._placeIndicator();

        if (!this._createContextMenu()) {
            console.warn('CryptoGold: Failed to create context menu, continuing without it');
        }

        this._session = new Soup.Session({ timeout: 15 });
        this._isErrorState = false;

        this._isPriceHidden = this._settings ? this._settings.get_boolean('hide-price') : false;

        if (this._isPriceHidden) {
            this._showHiddenPrice();
        } else {
            this._updateData();
            const interval = this._settings ? this._settings.get_int('update-interval') : 180;
            this._scheduleNextUpdate(interval);
        }

        this._updateContextMenu();

        if (this._settings) {
            this._settingsChangedId = this._settings.connect('changed', (settings, key) => {
                if (key === 'position' || key === 'position-index') {
                    this._indicator?.destroy();
                    this._indicator = null;
                    this._box = null;
                    this._menu?.destroy();
                    this._menu = null;
                    this._createIndicator();
                    this._placeIndicator();
                    this._createContextMenu();
                    if (this._isPriceHidden) {
                        this._showHiddenPrice();
                    } else {
                        this._updateData();
                    }
                } else if (key === 'hide-price') {
                    this._isPriceHidden = this._settings.get_boolean('hide-price');
                    if (this._isPriceHidden) {
                        if (this._timeoutId) {
                            GLib.Source.remove(this._timeoutId);
                            this._timeoutId = null;
                        }
                        this._showHiddenPrice();
                    } else {
                        this._updateData();
                        const interval = this._settings ? this._settings.get_int('update-interval') : 180;
                        this._scheduleNextUpdate(interval);
                    }
                    this._updateContextMenu();
                } else if (key === 'use-custom-text' || key === 'custom-hidden-text') {
                    if (this._isPriceHidden) {
                        this._showHiddenPrice();
                    }
                } else if (key === 'api-provider' || key === 'update-interval') {
                    if (!this._isPriceHidden) {
                        if (this._timeoutId) {
                            GLib.Source.remove(this._timeoutId);
                            this._timeoutId = null;
                        }
                        this._updateData();
                        const interval = this._settings ? this._settings.get_int('update-interval') : 180;
                        this._scheduleNextUpdate(interval);
                    }
                }
            });
        }
    }

    disable() {
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }

        if (this._settingsChangedId && this._settings) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        if (this._session) {
            this._session.abort();
            this._session = null;
        }

        if (this._menu) {
            this._menu.destroy();
            this._menu = null;
        }

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        if (this._box) {
            this._box.destroy();
            this._box = null;
        }
        this._settings = null;
        this._isErrorState = false;
        this._isPriceHidden = false;
    }

    _getApiConfig() {
        const provider = this._settings ? this._settings.get_string('api-provider') : 'coingecko';
        
        // Validate provider string to prevent injection
        const validProviders = ['coingecko', 'binance', 'bitstamp', 'gateio', 'mexc', 'huobi', 'hitbtc', 'bybit'];
        const safeProvider = validProviders.includes(provider) ? provider : 'coingecko';
        
        const configs = {
            'coingecko': {
                url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
                parser: (response) => {
                    if (!response || typeof response !== 'object') {
                        throw new Error('Invalid response format');
                    }
                    if (!response.bitcoin || typeof response.bitcoin !== 'object') {
                        throw new Error('Missing bitcoin data');
                    }
                    if (typeof response.bitcoin.usd !== 'number' || typeof response.bitcoin.usd_24h_change !== 'number') {
                        throw new Error('Invalid price or change data');
                    }
                    return {
                        price: response.bitcoin.usd,
                        change: response.bitcoin.usd_24h_change
                    };
                }
            },
            'binance': {
                url: 'https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSDT',
                parser: (response) => {
                    if (!response.price || !response.priceChangePercent) throw new Error('Invalid response format');
                    return {
                        price: parseFloat(response.price),
                        change: parseFloat(response.priceChangePercent)
                    };
                }
            },
            'bitstamp': {
                url: 'https://www.bitstamp.net/api/v2/ticker/BTCUSD',
                parser: (response) => {
                    if (!response.last || !response.percent_change_24) throw new Error('Invalid response format');
                    return {
                        price: parseFloat(response.last),
                        change: parseFloat(response.percent_change_24)
                    };
                }
            },
            'gateio': {
                url: 'https://api.gateio.ws/api/v4/spot/tickers?currency_pair=BTC_USDT',
                parser: (response) => {
                    if (!response[0] || !response[0].last || !response[0].change_percentage) throw new Error('Invalid response format');
                    return {
                        price: parseFloat(response[0].last),
                        change: parseFloat(response[0].change_percentage)
                    };
                }
            },
            'mexc': {
                url: 'https://api.mexc.com/api/v3/ticker/24hr?symbol=BTCUSDT',
                parser: (response) => {
                    if (!response || typeof response !== 'object') {
                        throw new Error('Invalid response format');
                    }
                    if (!response.lastPrice || !response.priceChangePercent) {
                        throw new Error('Missing price or change data');
                    }
                    const price = parseFloat(response.lastPrice);
                    const change = parseFloat(response.priceChangePercent);
                    if (!isFinite(price) || !isFinite(change)) {
                        throw new Error('Invalid numeric data');
                    }
                    return {
                        price: price,
                        change: change * 100 // Multiply by 100 as per notice
                    };
                }
            },
            'huobi': {
                url: 'https://api.huobi.pro/market/detail/merged?symbol=btcusdt',
                parser: (response) => {
                    if (!response.tick || !response.tick.close || !response.tick.open) throw new Error('Invalid response format');
                    const price = response.tick.close;
                    const open = response.tick.open;
                    const change = ((price - open) / open) * 100;
                    return {
                        price: parseFloat(price),
                        change: change
                    };
                }
            },
            'hitbtc': {
                url: 'https://api.hitbtc.com/api/2/public/ticker/btcusd',
                parser: (response) => {
                    if (!response.last || !response.open) throw new Error('Invalid response format');
                    const price = parseFloat(response.last);
                    const open = parseFloat(response.open);
                    const change = ((price - open) / open) * 100;
                    return {
                        price: price,
                        change: change
                    };
                }
            },
            'bybit': {
                url: 'https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT',
                parser: (response) => {
                    if (!response.result || !response.result.list || !response.result.list[0]) throw new Error('Invalid response format');
                    const ticker = response.result.list[0];
                    if (!ticker.lastPrice || !ticker.price24hPcnt) throw new Error('Invalid response format');
                    return {
                        price: parseFloat(ticker.lastPrice),
                        change: parseFloat(ticker.price24hPcnt) * 100 // Multiply by 100 as per notice
                    };
                }
            }
        };

        return configs[safeProvider] || configs['coingecko'];
    }

    _validatePriceData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data structure');
        }
        
        if (typeof data.price !== 'number' || !isFinite(data.price) || data.price <= 0) {
            throw new Error('Invalid price value');
        }
        
        if (typeof data.change !== 'number' || !isFinite(data.change)) {
            throw new Error('Invalid change value');
        }
        
        return true;
    }

    _updateData() {
        if (!this._session || this._isPriceHidden) return;

        try {
            const apiConfig = this._getApiConfig();
            if (!apiConfig || !apiConfig.url) {
                throw new Error('Invalid API configuration');
            }

            const message = Soup.Message.new('GET', apiConfig.url);
            if (!message) {
                throw new Error('Failed to create HTTP message');
            }
            
            // Set timeout using Soup.Session timeout property (already set to 15 seconds in enable())

            this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            try {
                const bytes = session.send_and_read_finish(result);
                if (!bytes || bytes.get_size() === 0) {
                    throw new Error('Empty response from API');
                }
                
                const responseText = new TextDecoder().decode(bytes.get_data());
                if (!responseText || responseText.trim() === '') {
                    throw new Error('Empty response text');
                }
                
                const response = JSON.parse(responseText);
                const data = apiConfig.parser(response);
                
                // Validate data before using
                this._validatePriceData(data);
                
                const price = data.price.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                });
                const change = data.change.toFixed(2);
                const isPositive = change >= 0;

                if (this._box) {
                    this._box.destroy_all_children();

                    const priceLabel = new St.Label({
                        style_class: 'bitcoin-price',
                        text: `BTC = ${price}`,
                        y_align: Clutter.ActorAlign.CENTER,
                    });

                    const separatorLabel = new St.Label({
                        style_class: 'separator-label',
                        text: '  |  ',
                        y_align: Clutter.ActorAlign.CENTER,
                    });

                    const changeLabel = new St.Label({
                        style_class: isPositive ? 'positive-change' : 'negative-change',
                        text: `${change}%`,
                        y_align: Clutter.ActorAlign.CENTER,
                    });

                    this._box.add_child(priceLabel);
                    this._box.add_child(separatorLabel);
                    this._box.add_child(changeLabel);
                }

                if (this._isErrorState) {
                    this._isErrorState = false;
                    const interval = this._settings ? this._settings.get_int('update-interval') : 180;
                    this._scheduleNextUpdate(interval);
                }
            } catch (e) {
                console.error(`Error fetching Bitcoin price: ${e.message}`);

                if (this._box) {
                    this._box.destroy_all_children();
                    this._box.add_child(new St.Label({
                        text: 'soon',
                        style_class: 'error-text',
                        y_align: Clutter.ActorAlign.CENTER,
                    }));
                }

                this._isErrorState = true;
                this._scheduleNextUpdate(7);
            }
        });
        } catch (e) {
            console.error(`CryptoGold: Error in _updateData(): ${e.message}`);
            this._isErrorState = true;
            this._scheduleNextUpdate(7);
        }
    }

    _scheduleNextUpdate(interval) {
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }
        
        const safeInterval = Math.max(1, Math.min(3600, interval || 180));
        
        if (!this._isPriceHidden) {
            this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, safeInterval, () => {
                this._updateData();
                return GLib.SOURCE_CONTINUE;
            });
        }
    }
}
