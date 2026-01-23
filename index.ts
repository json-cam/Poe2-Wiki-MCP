// Import MCP SDK components for creating the server and handling stdio communication
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// Zod for input schema validation
import { z } from "zod";
// Wiki fetching utilities
import { fetchGemData, fetchCompatibleSupports } from "./wiki.ts";

// Initialize the MCP server with metadata
const server = new McpServer({
  name: "poe2-mechanical-source",
  version: "1.0.0",
});

// In-memory cache to store gem data and reduce redundant wiki API calls
// Cache entries expire after 1 hour (3600000ms)
const cache = new Map<string, { data: any; timestamp: number }>();

// Tool 1: Get Gem Info
// Fetches and parses the complete Item template data for a skill gem from the wiki
server.registerTool(
  "get_gem_info",
  {
    description:
      "Fetches complete mechanical template data for a PoE2 gem including all levels.",
    inputSchema: {
      gemName: z.string().describe("The name of the gem (e.g., 'Gas Grenade')"),
    },
  },
  async ({ gemName }) => {
    // Fetch gem data from the wiki API
    const data = await fetchGemData(gemName);

    // Check if we have a cached version that's less than 1 hour old
    const cached = cache.get(gemName);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return { content: [{ type: "text", text: JSON.stringify(cached.data) }] };
    }

    // Handle case where gem wasn't found on the wiki
    if (!data) {
      return {
        content: [{ type: "text", text: `Could not find gem "${gemName}".` }],
      };
    }

    // Clean up MediaWiki syntax from stat_text for human readability
    // This removes color codes, wiki links, HTML tags, and special characters
    const rawStatText = data.stat_text || "";
    const cleanStats = rawStatText
      .replace(/{{c\|.*?\|(.*?)}}/g, "$1") // {{c|gem|Impact}} → "Impact"
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1") // [[Link|Text]] or [[Text]] → "Text"
      .replace(/<.*?>/g, "") // Remove HTML tags like <br>, <big>
      .replace(/&nbsp;/g, " "); // Replace non-breaking spaces

    // Build a human-readable summary with cleaned stats
    const summary = `
# ${data.name || gemName}
**Tags:** ${data.gem_tags || "N/A"}
**Description:** ${data.gem_description || "N/A"}
**Requirement:** ${data.equipment_requirement || "N/A"}
**Cooldown:** ${data.static_cooldown || "None"}s

### Detailed Stats
${cleanStats}

### Progression Preview
- Level 1: Multiplier ${data.level1_damage_multiplier || "N/A"}%
- Level 20: Multiplier ${data.level20_damage_multiplier || "N/A"}%
    `.trim();

    // Return both human-readable summary and complete raw JSON data
    // The raw JSON preserves all template fields for detailed analysis
    return {
      content: [
        { type: "text", text: summary },
        {
          type: "text",
          text: "FULL_DATA_JSON: " + JSON.stringify(data, null, 2),
        },
      ],
    };
  },
);

// Tool 2: Get Compatible Supports
// Extracts the list of officially recommended support gems from a skill's wiki page
server.registerTool(
  "get_compatible_supports",
  {
    description:
      "Fetches the officially recommended support gems for a specific skill from the wiki.",
    inputSchema: {
      gemName: z
        .string()
        .describe("The name of the active gem (e.g., 'Gas Grenade')"),
    },
  },
  async ({ gemName }) => {
    // Fetch the list of recommended supports from the wiki page
    const supports = await fetchCompatibleSupports(gemName);

    // Handle case where no recommended supports section exists
    if (supports.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No recommended supports found on the wiki page for ${gemName}.`,
          },
        ],
      };
    }

    // Format the support gems as a bulleted list
    const supportList = supports.map((s) => `* **${s.name}**`).join("\n");
    
    // Return formatted list with a note for AI follow-up
    return {
      content: [
        {
          type: "text",
          text: `### Recommended Supports for ${gemName}\n\n${supportList}\n\n**Note to AI:** You may use the 'get_gem_info' tool to look up the specific mechanics and scaling for any of these supports to explain why they are recommended.`,
        },
      ],
    };
  },
);

// Main entry point - initialize stdio transport and start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PoE2 MCP Server running on stdio");
}

main().catch(console.error);
