# CryptoGold - Bitcoin Rate Indicator

A GNOME Shell extension that displays the current Bitcoin price in USD with 24-hour change percentage.

## Features

- Real-time Bitcoin price updates from multiple API providers
- 24-hour change percentage with color coding (green/red)
- Multiple positioning options (right/left of clock, panel sides)
- Custom position index control
- Hide price functionality with context menu
- Resource saving - stops API requests when hidden
- Custom hidden text (e.g., "HODL", "🚀")
- **NEW**: Multiple API providers support
- Automatic error handling with retry mechanism

## Supported API Providers

- **CoinGecko** (Default) - Free tier, 30s minimum interval
- **Binance.US** - Fast updates, 5s minimum interval
- **Bitstamp** - Reliable data, 1s minimum interval
- **Gate.io** - Global exchange, 1s minimum interval
- **MEXC** - High performance, 1s minimum interval
- **Huobi** - Professional trading data, 1s minimum interval
- **HitBTC** - European exchange, 1s minimum interval
- **Bybit** - Derivatives and spot trading, 1s minimum interval

## Installation

[Download via Gnome Extension Store](https://extensions.gnome.org/extension/7914/cryptogoldbitcoin-rate/)

### or

```bash
git clone https://github.com/Makev1ch/cryptogold ~/.local/share/gnome-shell/extensions/cryptogold@makev1ch.github.com
```

Restart GNOME Shell (Alt+F2 → restart in X11, or logout/login in Wayland).

## Configuration

In GNOME Extensions app configure:
- **Indicator position**: Choose placement (right/left of clock)
- **Position index**: Fine-tune position (0 = default, -1 = end)
- **Hide Bitcoin Price**: Stop API requests to save resources
- **Custom Hidden Text**: Any text instead of "Hidden"
- **API Provider**: Choose from 8 different data sources
- **Update Interval**: Set refresh rate (minimum varies by provider)

### Context Menu

Click the Bitcoin indicator to hide/show price with custom text.

## Technical Details

- Updates every 3 minutes (7 seconds on errors)
- Supports 8 different API providers
- Follows GNOME Shell extension guidelines
- Smart rate limiting based on provider capabilities
