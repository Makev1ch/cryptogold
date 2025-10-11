# CryptoGold - Bitcoin Rate Indicator

A GNOME Shell extension that displays the current Bitcoin price in USD with 24-hour change percentage.

## Features

- Real-time Bitcoin price updates from CoinGecko API
- 24-hour change percentage with color coding (green/red)
- Multiple positioning options (right/left of clock, panel sides)
- **NEW**: Custom position index control
- **NEW**: Hide price functionality with context menu
- **NEW**: Resource saving - stops API requests when hidden
- **NEW**: Custom hidden text (e.g., "HODL", "🚀")
- Automatic error handling with retry mechanism

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

### Context Menu

Click the Bitcoin indicator to hide/show price with custom text.

## Technical Details

- Updates every 3 minutes (7 seconds on errors)
- Uses CoinGecko API
- Follows GNOME Shell extension guidelines
