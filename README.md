# Poe2 Wiki MCP Server

A Model Context Protocol (MCP) server that provides real-time access to Path of Exile 2 skill gem data from the official wiki.

> ⚠️ **Early Development**: This project is in its early stages and is subject to frequent changes. APIs, features, and data structures may change without notice.

## Features

- **Get Gem Info**: Fetch complete mechanical data for any PoE2 skill gem, including stats at all levels
- **Search Gems**: Search for skill gems by keyword
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

#### `search_gems`

Searches for skill gems matching a keyword.

**Input:**
- `query` (string): Keyword to search for (e.g., "Grenade")

**Output:**
- List of up to 5 matching gem names

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

1. The server registers two tools using the MCP SDK
2. When `get_gem_info` is called, it fetches the wiki page for the specified gem
3. The wiki template parser extracts structured data from the MediaWiki markup
4. Wiki syntax (colors, links, HTML tags) is cleaned up for readability
5. Results are cached for 1 hour to reduce API calls
6. Both a formatted summary and raw JSON are returned

## Development

This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## License

Private project
