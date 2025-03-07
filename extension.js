'use strict';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class BitcoinExtension {
    constructor() {
        this._panelButton = null;
        this._session = null;
        this._timeoutId = null;
    }

    _scheduleNextUpdate(interval) {
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }

        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            interval,
            () => {
                this._updateData();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    async _updateData() {
        try {
            this._session ??= new Soup.Session({ timeout: 10 });
            const message = Soup.Message.new(
                'GET',
                'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
            );

            const bytes = await this._session.send_and_read_async(
                message,
                GLib.PRIORITY_DEFAULT,
                null
            );
            const response = JSON.parse(new TextDecoder().decode(bytes.get_data()));

            const price = response.bitcoin.usd.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
            });

            const change = response.bitcoin.usd_24h_change.toFixed(2);
            const changeText = `${change}%`;

            const box = new St.BoxLayout({
                style_class: 'bitcoin-box',
                vertical: false,
                reactive: false
            });

            const priceLabel = new St.Label({
                style_class: 'bitcoin-price',
                text: `BTC ${price}`,
                y_align: Clutter.ActorAlign.CENTER
            });

            const changeLabel = new St.Label({
                style_class: change >= 0 ? 'positive-change' : 'negative-change',
                text: `| ${changeText}`,
                y_align: Clutter.ActorAlign.CENTER
            });

            box.add_child(priceLabel);
            box.add_child(changeLabel);

            this._panelButton.set_child(box);
            this._scheduleNextUpdate(300); // Обновление каждые 5 минут (300 секунд)
        } catch (e) {
            console.error(`Error: ${e.message}`);

            this._panelButton.set_child(new St.Label({
                style_class: 'bitcoin-error',
                text: 'BTC -- | --%',
                y_align: Clutter.ActorAlign.CENTER
            }));
            this._scheduleNextUpdate(7);
        }
    }

    enable() {
        this._panelButton = new St.Bin({
            style_class: 'panel-button bitcoin-container',
            reactive: false
        });

        const centerBox = Main.panel._centerBox;
        const dateMenu = Main.panel.statusArea.dateMenu;
        const children = centerBox.get_children();

        // Находим позицию для вставки после даты/времени
        const dateMenuIndex = children.indexOf(dateMenu.container);
        if (dateMenuIndex !== -1) {
            centerBox.insert_child_at_index(this._panelButton, dateMenuIndex + 1);
        } else {
            centerBox.add_child(this._panelButton);
        }

        this._updateData();
    }

    disable() {
        if (this._panelButton) {
            Main.panel._centerBox.remove_child(this._panelButton);
            this._panelButton.destroy();
            this._panelButton = null;
        }

        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }

        if (this._session) {
            this._session.abort();
            this._session = null;
        }
    }
}
