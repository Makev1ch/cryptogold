# CryptoGold - Bitcoin Rate Indicator

A GNOME Shell extension that displays the current Bitcoin price in USD with 24-hour change percentage.

## Features

- Real-time Bitcoin price updates from CoinGecko API
- 24-hour change percentage with color coding (green for positive, red for negative)
- Multiple positioning options:
  - Right of clock
  - Left of clock  
  - Right panel side
  - Left panel side
- **NEW**: Custom position index control - place the indicator before or after other indicators
- **NEW**: Hide price functionality - click on the indicator to open context menu and hide/show the Bitcoin price
- **NEW**: Resource saving - when price is hidden, API requests are stopped to save bandwidth and battery
- **NEW**: Custom hidden text - set any custom text instead of "Hidden" (e.g., "HODL", "🚀", etc.)
- **NEW**: Smart color coding - only the hidden text part is grayed out, "BTC = " remains normal color
- Automatic error handling with retry mechanism
- Clean, modern UI design

## Installation

Download via Gnome Extension Store: soon

### or

```
git clone https://github.com/Makev1ch/cryptogold ~/.local/share/gnome-shell/extensions/cryptogold@makev1ch.github.com
```

The command above simply copies the extension to this folder
```
~/.local/share/gnome-shell/extensions/
```

### Then restart GNOME Shell

To restart GNOME Shell in X11, pressing Alt+F2 to open the Run Dialog and enter restart 
(or just r)

In Wayland Logout and Login again

## Configuration

Open GNOME Extensions app and click the settings gear for CryptoGold to configure:

- **Indicator position**: Choose where to place the indicator (right/left of clock, or panel sides)
- **Position index**: Fine-tune the exact position relative to other indicators:
  - `0` = Default position
  - `-1` = End of the indicator list
  - Positive numbers = Specific position (1 = first, 2 = second, etc.)
  - Negative numbers = Position from the end (-2 = second to last, etc.)
- **Hide Bitcoin Price**: Toggle to hide the price and stop API requests to save resources
- **Use Custom Hidden Text**: Enable to use custom text instead of "Hidden"
- **Custom Hidden Text**: Enter any text to display instead of "Hidden" (supports any alphabet, emojis, etc.)

### Context Menu

Click on the Bitcoin indicator to open a context menu with options to:
- **Hide Bitcoin Price**: Hide the current price and show "BTC = [Custom Text]" with custom text in grey
- **Show Bitcoin Price**: Restore the normal price display and resume API requests

### Smart Display

When the price is hidden:
- Only the custom text part is displayed in grey color (#727272)
- "BTC = " remains in normal white color
- All API requests are stopped to save bandwidth and battery life
- Settings and context menu are fully synchronized

## Technical Details

- Updates every 3 minutes (180 seconds) when working normally
- Retries every 7 seconds when encountering errors
- Uses CoinGecko API for reliable price data
- Follows GNOME Shell extension guidelines for security and performance
