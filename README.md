# CryptoGold - Bitcoin Rate Indicator

A GNOME Shell extension that displays the current Bitcoin price with real-time updates, fiat currency conversion, and multiple data sources.

## Features

- **Real-time Bitcoin price** from 8 different API providers
- **Fiat currency conversion** to 50+ local currencies
- **24-hour change percentage** with color coding (green/red)
- **Multiple positioning options** (right/left of clock, panel sides)
- **Custom position index control** for precise placement
- **Hide price functionality** with context menu
- **Resource saving** - stops API requests when hidden
- **Custom hidden text** (e.g., "HODL", "🚀")
- **Icon-based context menu** with toggle, refresh, and settings
- **Automatic error handling** with retry mechanism

## Supported Bitcoin API Providers

- **CoinGecko** (Default) - Free tier, 5min minimum interval
- **Binance.US** - Fast updates, 5s minimum interval  
- **Bitstamp** - Reliable data, 1s minimum interval
- **Gate.io** - Global exchange, 1s minimum interval
- **MEXC** - High performance, 1s minimum interval
- **Huobi** - Professional trading data, 1s minimum interval
- **HitBTC** - European exchange, 1s minimum interval
- **Bybit** - Derivatives and spot trading, 1s minimum interval

## Supported Fiat Currency Providers

- **CoinGecko** - 5min updates, 50+ currencies
- **ExchangeRate** - 24h updates, 165+ currencies  
- **fawazahmed0** - 1h updates, 340+ currencies
- **FloatRates** - 1h updates, 146 currencies
- **Frankfurter** - 1h updates, 30 ECB currencies
- **WoXy-Sensei** - 1h updates, ECB currencies

## Installation

[Download via Gnome Extension Store](https://extensions.gnome.org/extension/7914/cryptogoldbitcoin-rate/)

### or

```bash
git clone https://github.com/Makev1ch/cryptogold ~/.local/share/gnome-shell/extensions/cryptogold@makev1ch.github.com
```

Restart GNOME Shell (Alt+F2 → restart in X11, or logout/login in Wayland).

## Configuration

In GNOME Extensions app configure:

### Display Settings
- **Indicator position**: Choose placement (right/left of clock, panel sides)
- **Position index**: Fine-tune position (0 = default, -1 = end)
- **Hide Bitcoin Price**: Stop API requests to save resources
- **Custom Hidden Text**: Any text instead of "Hidden"

### API Settings  
- **API Provider**: Choose from 8 different Bitcoin data sources
- **Update Interval**: Set refresh rate (minimum varies by provider)

### Currency Settings
- **Currency Exchange API**: Choose from 6 fiat conversion providers
- **Display Currency**: Select from 50+ supported currencies

## Context Menu

Click the Bitcoin indicator to access:
- **👁️ Eye icon**: Toggle price visibility
- **🔄 Refresh icon**: Force update
- **⚙️ Settings icon**: Open preferences
