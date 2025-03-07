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

        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
            this._updateData();
            return GLib.SOURCE_CONTINUE;
        });
    }

    async _updateData() {
        try {
            this._session ??= new Soup.Session({ timeout: 10 });
            const message = Soup.Message.new(
                'GET', 
                'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
            );
            
            const bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
            const response = JSON.parse(new TextDecoder().decode(bytes.get_data()));
            
            const price = response.bitcoin.usd.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
            });
            
            const change = response.bitcoin.usd_24h_change.toFixed(2);
            const changeText = `${change}%`;
            
            const label = new St.Label({
                style_class: 'bitcoin-label',
                text: `₿ ${price} (${changeText})`,
                y_align: Clutter.ActorAlign.CENTER
            });
            
            // Устанавливаем цвет в зависимости от изменения
            if (change >= 0) {
                label.style = 'color: #4CAF50;'; // Зеленый для роста
            } else {
                label.style = 'color: #F44336;'; // Красный для падения
            }

            this._panelButton.set_child(label);
            this._scheduleNextUpdate(300);
        } catch (e) {
            console.error(`Error: ${e.message}`);
            
            this._panelButton.set_child(new St.Label({
                style_class: 'error-label',
                text: 'soon',
                y_align: Clutter.ActorAlign.CENTER
            }));
            this._scheduleNextUpdate(7);
        }
    }

    enable() {
        this._panelButton = new St.Bin({
            style_class: 'panel-button',
            reactive: false
        });
        
        // Добавляем в правую часть панели перед индикаторами системы
        Main.panel._rightBox.insert_child_at_index(this._panelButton, 0);
        this._updateData();
    }

    disable() {
        if (this._panelButton) {
            Main.panel._rightBox.remove_child(this._panelButton);
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
