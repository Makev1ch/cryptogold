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
    }

    _createContextMenu() {
        this._menu = new PopupMenu.PopupMenu(this._indicator, 0.5, St.Side.TOP);
        Main.uiGroup.add_child(this._menu.actor);
        this._menu.actor.hide();

        // Создаем меню с правильным состоянием
        this._updateContextMenu();
    }

    _togglePriceVisibility() {
        this._isPriceHidden = !this._isPriceHidden;
        this._settings.set_boolean('hide-price', this._isPriceHidden);
        
        if (this._isPriceHidden) {
            // Останавливаем API запросы
            if (this._timeoutId) {
                GLib.Source.remove(this._timeoutId);
                this._timeoutId = null;
            }
            this._showHiddenPrice();
        } else {
            // Возобновляем API запросы
            this._updateData();
            this._scheduleNextUpdate(180);
        }
        
        // Обновляем текст в меню
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

            // Получаем кастомный текст из настроек
            const useCustomText = this._settings ? this._settings.get_boolean('use-custom-text') : false;
            const customText = this._settings ? this._settings.get_string('custom-hidden-text') : 'Hidden';
            const hiddenText = useCustomText ? customText : 'Hidden';

            // Создаем контейнер для "BTC = " и скрытого текста
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
        
        // Добавляем обработчик клика для открытия контекстного меню
        this._indicator.connect('button-press-event', (actor, event) => {
            if (event.get_button() === Clutter.BUTTON_PRIMARY) {
                if (this._menu) {
                    this._menu.toggle();
                }
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
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
        this._createContextMenu();

        this._session = new Soup.Session({ timeout: 10 });
        this._isErrorState = false;

        // Проверяем состояние скрытия цены из настроек
        this._isPriceHidden = this._settings ? this._settings.get_boolean('hide-price') : false;

        if (this._isPriceHidden) {
            this._showHiddenPrice();
        } else {
            this._updateData();
            this._scheduleNextUpdate(180);
        }

        // Обновляем контекстное меню с правильным состоянием
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
                        this._scheduleNextUpdate(180);
                    }
                    // Обновляем контекстное меню
                    this._updateContextMenu();
                } else if (key === 'use-custom-text' || key === 'custom-hidden-text') {
                    // Обновляем отображение если цена скрыта
                    if (this._isPriceHidden) {
                        this._showHiddenPrice();
                    }
                }
            });
        }
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        if (this._menu) {
            this._menu.destroy();
            this._menu = null;
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
        if (!this._session || this._isPriceHidden) return;

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
        if (!this._isPriceHidden) {
            this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
                this._updateData();
                return GLib.SOURCE_CONTINUE;
            });
        }
    }
}
