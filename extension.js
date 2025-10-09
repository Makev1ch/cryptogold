'use strict';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
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

        this._ = (s) => s;
    }

    _initSettings() {
        this._settings = this.getSettings();
    }

    _createIndicator() {
        this._indicator = new PanelMenu.Button(0.0, 'Bitcoin Indicator', false);
        this._box = new St.BoxLayout({ vertical: false });
        this._indicator.add_child(this._box);
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
                    
                    // Применяем пользовательский индекс позиции
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
                    
                    // Применяем пользовательский индекс позиции
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
                    
                    // Применяем пользовательский индекс позиции
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
                    
                    // Применяем пользовательский индекс позиции
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
        this._initSettings();
        this._createIndicator();
        this._placeIndicator();

        this._session = new Soup.Session({ timeout: 10 });
        this._isErrorState = false;

        this._updateData();
        this._scheduleNextUpdate(180);

        if (this._settings) {
            this._settingsChangedId = this._settings.connect('changed', (settings, key) => {
                if (key === 'position' || key === 'position-index') {
                    this._indicator?.destroy();
                    this._indicator = null;
                    this._box = null;
                    this._createIndicator();
                    this._placeIndicator();
                    this._updateData();
                }
            });
        }
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }

        if (this._settingsChangedId && this._settings) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        this._session?.abort();
        this._session = null;
        this._box = null;
        this._settings = null;
    }

    _updateData() {
        if (!this._session) return;

        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true';
        const message = Soup.Message.new('GET', url);

        this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            try {
                const bytes = session.send_and_read_finish(result);
                const response = JSON.parse(new TextDecoder().decode(bytes.get_data()));

                if (!response.bitcoin) throw new Error('Invalid response format');

                const price = response.bitcoin.usd.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                });
                const change = response.bitcoin.usd_24h_change.toFixed(2);
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
                    this._scheduleNextUpdate(180);
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
    }

    _scheduleNextUpdate(interval) {
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
        }
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
            this._updateData();
            return GLib.SOURCE_CONTINUE;
        });
    }
}
