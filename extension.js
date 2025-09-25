'use strict';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup?version=3.0';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class BitcoinExtension extends Extension {
    enable() {
        // индикатор в панели
        this._indicator = new PanelMenu.Button(0.0, 'Bitcoin Indicator', false);

        // контейнер для текста
        this._box = new St.BoxLayout({ vertical: false });
        this._indicator.add_child(this._box);

        // добавляем в панель справа от dateMenu
        Main.panel.addToStatusArea('bitcoin-indicator', this._indicator, 1, 'center');

        this._session = new Soup.Session({ timeout: 10 });
        this._isErrorState = false;

        this._updateData();
        this._scheduleNextUpdate(180);
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

        this._session = null;
        this._box = null;
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
                log(`Error fetching Bitcoin price: ${e.message}`);

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
