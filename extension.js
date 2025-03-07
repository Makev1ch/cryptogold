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
        this._isErrorState = false;
        this._clickHandlerId = null;
        this._isFetching = false;
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
        if (this._isFetching) return;
        this._isFetching = true;

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
            
            if (!response?.bitcoin?.usd || !response.bitcoin.usd_24h_change) {
                throw new Error('Invalid API response format');
            }

            const price = response.bitcoin.usd.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
            });

            const change = response.bitcoin.usd_24h_change.toFixed(2);
            const changeText = `${change}%`;

            if (!this._panelButton) return;

            const box = new St.BoxLayout({
                style_class: 'bitcoin-box',
                vertical: false,
                reactive: false
            });

            const priceLabel = new St.Label({
                style_class: 'bitcoin-price',
                text: `BTC = ${price}`,
                y_align: Clutter.ActorAlign.CENTER
            });

            const separatorLabel = new St.Label({
                style_class: 'separator-label',
                text: ' | ',
                y_align: Clutter.ActorAlign.CENTER
            });

            const changeLabel = new St.Label({
                style_class: change >= 0 ? 'positive-change' : 'negative-change',
                text: changeText,
                y_align: Clutter.ActorAlign.CENTER
            });

            box.add_child(priceLabel);
            box.add_child(separatorLabel);
            box.add_child(changeLabel);

            this._panelButton.set_child(box);

            if (this._isErrorState) {
                this._isErrorState = false;
                // Устанавливаем таймер на обновление каждые 3 минуты (180 секунд)
                this._scheduleNextUpdate(180);
            }
            
        } catch (e) {
            console.error(`Error: ${e.message}`);

            this._isErrorState = true;

            if (!this._panelButton) return;

            const errorBox = new St.BoxLayout({
                vertical: false,
                reactive: false
            });
            
            errorBox.add_child(new St.Label({
                style_class: 'bitcoin-error',
                text: 'BTC = --',
                y_align: Clutter.ActorAlign.CENTER
            }));
            
            errorBox.add_child(new St.Label({
                style_class: 'separator-label',
                text: ' | ',
                y_align: Clutter.ActorAlign.CENTER
            }));
            
            errorBox.add_child(new St.Label({
                style_class: 'bitcoin-error',
                text: '--%',
                y_align: Clutter.ActorAlign.CENTER
            }));
            
            this._panelButton.set_child(errorBox);
            // Устанавливаем таймер на обновление через 7 секунд в случае ошибки
            this._scheduleNextUpdate(7);
        } finally {
            this._isFetching = false;
        }
    }

    async _onClick() {
        if (this._isFetching) return Clutter.EVENT_STOP;

        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }

        // Сначала обновляем курс немедленно
        await this._updateData();

        // Устанавливаем таймер на обновление каждые 3 минуты (180 секунд)
        this._scheduleNextUpdate(180);

        return Clutter.EVENT_STOP;
    }

    enable() {
        this._panelButton = new St.Bin({
            style_class: 'panel-button bitcoin-container',
            reactive: true,
            x_expand: false,
            x_align: Clutter.ActorAlign.START
        });

        this._clickHandlerId = this._panelButton.connect(
            'button-press-event',
            () => this._onClick()
        );

        const centerBox = Main.panel._centerBox;
        const dateMenu = Main.panel.statusArea.dateMenu;
        const children = centerBox.get_children();

        const dateMenuIndex = children.indexOf(dateMenu.container);
        if (dateMenuIndex !== -1) {
            centerBox.insert_child_at_index(this._panelButton, dateMenuIndex + 1);
        } else {
            centerBox.add_child(this._panelButton);
        }

        // Сначала загружаем данные при активации расширения
        this._updateData();
    }

    disable() {
        if (this._panelButton) {
            if (this._clickHandlerId) {
                this._panelButton.disconnect(this._clickHandlerId);
                this._clickHandlerId = null;
            }
            
            Main.panel._centerBox.remove_child(this._panelButton);
            this._panelButton.destroy();
            this._panelButton = null;
        }

        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }

        if (this._session) {
            this._session.close();
            this._session = null;
        }
        
        this._isErrorState = false;
    }
}
