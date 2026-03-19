# originCheck - Universal OpenClaw Monitoring Platform

## Step 1.1: Universal Config Reader

A cross-platform OpenClaw configuration discovery system with intelligent fallback mechanisms.

### Features

- ✅ **Cross-Platform Compatibility**: Windows, macOS, Linux
- ✅ **Auto-Discovery**: Finds OpenClaw configs in standard locations
- ✅ **5-Level Fallback**: Interactive wizard when auto-discovery fails
- ✅ **Robust Error Handling**: Graceful handling of all error scenarios
- ✅ **JSON Validation**: Ensures config files are properly formatted
- ✅ **Interactive Setup**: User-friendly configuration wizard

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/origincheck.git
cd origincheck

# Install dependencies
npm install

# Test on Linux VPS
npm run test:linux

# Run all tests
npm test
```

### Configuration Files

The system automatically looks for OpenClaw configuration in:

- **Windows**: `%USERPROFILE%\.openclaw\openclaw.json`
- **macOS**: `~/.openclaw/openclaw.json`
- **Linux**: `~/.openclaw/openclaw.json`

### Testing

```bash
# Linux VPS testing
npm run test:linux

# Configuration discovery testing
npm run test:discovery

# Error handling testing
npm run test:error

# Sample config testing
npm run test:sample
```

### Example Configuration

```json
{
  "gateway": {
    "url": "http://localhost:18789",
    "port": 18789,
    "auth": {
      "type": "none"
    }
  },
  "channels": {
    "slack": {
      "enabled": true,
      "bot_token": "xoxb-your-slack-bot-token"
    }
  },
  "workspace": "/home/user/openclaw-workspace"
}
```

### Fallback Mechanism

If auto-discovery fails, the system provides:

1. **Interactive Wizard**: User-friendly setup process
2. **Manual Path Entry**: Specify config location manually
3. **Sample Creation**: Generate a sample configuration
4. **Skip Option**: Continue with defaults

### Development Status

- ✅ **Step 1.1**: Universal Config Reader (Complete)
- 🔄 **Step 1.2**: Gateway URL Discovery (In Progress)
- ⏳ **Step 1.3**: Gateway Health Monitoring (Planned)

### Project Structure

```
originCheck/
├── lib/
│   ├── types/config.ts           # Type definitions
│   ├── utils/file-system.ts      # Cross-platform utilities
│   └── config-discovery.ts       # Main discovery class
├── examples/
│   ├── openclaw-config.json     # Full example config
│   └── minimal-config.json      # Minimal example config
├── scripts/
│   └── test-linux.js             # Linux VPS testing
├── tests/                        # Unit tests (Jest)
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

### License

MIT License - see LICENSE file for details.

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

**originCheck Step 1.1** - Production-ready universal OpenClaw configuration discovery. 🦞
