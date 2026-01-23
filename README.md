# Poe2 Wiki MCP Server

A Model Context Protocol (MCP) server that provides real-time access to Path of Exile 2 skill gem data from the official wiki.

> ⚠️ **Early Development**: This project is in its early stages and is subject to frequent changes. APIs, features, and data structures may change without notice.

## Vision

The ultimate goal of this project is to create a **centralized hub for all Path of Exile 2 in-game data**, providing players with a comprehensive, AI-enhanced resource for build planning and theorycrafting. By consolidating information from multiple sources—including the official wiki, community databases, and game data—this server aims to:

- **Streamline Information Access**: Aggregate skill gems, passive trees, items, mechanics, and more into a single, easily accessible source
- **Enable Intelligent Build Analysis**: Leverage AI to provide build feedback, optimization suggestions, and synergy discovery
- **Inspire Innovation**: Help players discover novel build combinations and strategies they may never have considered
- **Reduce Context Switching**: Eliminate the need to juggle multiple wikis, spreadsheets, and tools while planning your character

Currently focused on skill gem data, the project will expand to include passive skills, unique items, ascendancy mechanics, crafting systems, and more—all designed to work seamlessly with AI assistants to provide intelligent, context-aware guidance for both new and veteran players.

## Features

- **Get Gem Info**: Fetch complete mechanical data for any PoE2 skill gem, including stats at all levels
- **Get Compatible Supports**: Retrieve officially recommended support gems for any active skill gem
- Automatic wiki syntax cleanup for human-readable output
- In-memory caching (1 hour TTL) for improved performance
- Full raw JSON data access for detailed analysis

## Installation

```bash
bun install
```

## Usage

### Running the Server

```bash
bun run index.ts
```

The server runs on stdio and communicates using the Model Context Protocol.

### Available Tools

#### `get_gem_info`

Fetches complete mechanical template data for a PoE2 skill gem.

**Input:**
- `gemName` (string): The name of the gem (e.g., "Gas Grenade")

**Output:**
- Human-readable summary with tags, description, requirements, cooldown, and stats
- Full JSON data including all progression levels

#### `get_compatible_supports`

Fetches officially recommended support gems for a specific active skill gem from the wiki.

**Input:**
- `gemName` (string): The name of the active gem (e.g., "Gas Grenade")

**Output:**
- List of recommended support gems extracted from the wiki's "Recommended Support Gems" section

## Project Structure

- `index.ts` - Main MCP server implementation with tool registration
- `wiki.ts` - Wiki API fetcher and template parser
- `package.json` - Project dependencies and metadata
- `tsconfig.json` - TypeScript configuration

## Dependencies

- `@modelcontextprotocol/sdk` - MCP SDK for server implementation
- `zod` - Schema validation
- `bun` - Fast JavaScript runtime

## How It Works

1. The server registers tools using the MCP SDK
2. When `get_gem_info` is called, it fetches the wiki page for the specified gem and parses the `{{Item}}` template
3. When `get_compatible_supports` is called, it extracts recommended support gems from the wiki's "Recommended Support Gems" section
4. Wiki syntax (colors, links, HTML tags) is cleaned up for readability
5. Results are cached for 1 hour to reduce API calls
6. Both formatted summaries and raw JSON data are returned where applicable

## Development

This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## License

Private project
