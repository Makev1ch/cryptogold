'use strict';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class BitcoinExtension {
    constructor() {
        this._panelButton = null;
        this._session = new Soup.Session();
        this._timeoutId = null;
        this._isErrorState = false;  // Для отслеживания ошибки
    }

    _updateData() {
        const message = Soup.Message.new(
            'GET',
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
        );

        this._session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (session, result) => {
                try {
                    const bytes = session.send_and_read_finish(result);
                    const response = JSON.parse(new TextDecoder().decode(bytes.get_data()));

                    if (!response.bitcoin) {
                        throw new Error('Invalid response format');
                    }

                    const price = response.bitcoin.usd.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0
                    });
                    const change = response.bitcoin.usd_24h_change.toFixed(2);
                    const isPositive = change >= 0;

                    if (this._panelButton) {
                        const container = new St.BoxLayout({ vertical: false });

                        const priceLabel = new St.Label({
                            style_class: 'bitcoin-price',
                            text: `BTC = ${price}`,
                            y_align: Clutter.ActorAlign.CENTER
                        });

                        const separatorLabel = new St.Label({
                            style_class: 'separator-label',
                            text: '  |  ',
                            y_align: Clutter.ActorAlign.CENTER
                        });

                        const changeLabel = new St.Label({
                            style_class: isPositive ? 'positive-change' : 'negative-change',
                            text: `${change}%`,
                            y_align: Clutter.ActorAlign.CENTER
                        });

                        container.add_child(priceLabel);
                        container.add_child(separatorLabel);
                        container.add_child(changeLabel);

                        this._panelButton.set_child(container);
                    }

                    // Если успешное обновление, возвращаем к интервалу 3 минуты
                    if (this._isErrorState) {
                        this._isErrorState = false;
                        this._scheduleNextUpdate(180);  // Каждые 3 минуты
                    }

                } catch (e) {
                    log(`Error fetching Bitcoin price: ${e.message}`);
                    if (this._panelButton) {
                        this._panelButton.set_child(new St.Label({
                            text: 'soon',
                            style_class: 'error-text',
                            y_align: Clutter.ActorAlign.CENTER
                        }));
                    }

                    // Если ошибка, обновляем каждую 7 секунд
                    this._isErrorState = true;
                    this._scheduleNextUpdate(7);
                }
            }
        );
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

    enable() {
        this._panelButton = new St.Bin({
            style_class: 'panel-button bitcoin-container',
            reactive: false,
            x_expand: false,
            x_align: Clutter.ActorAlign.START
        });

        const centerBox = Main.panel._centerBox;
        const dateMenu = Main.panel.statusArea.dateMenu;
        const children = centerBox.get_children();

        const dateMenuIndex = children.indexOf(dateMenu.container);
        if (dateMenuIndex !== -1) {
            centerBox.insert_child_at_index(this._panelButton, dateMenuIndex + 1);
        } else {
            centerBox.add_child(this._panelButton);
        }

        this._updateData();
        this._scheduleNextUpdate(180);  // Начать с обновления каждые 3 минуты
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
    }
}
