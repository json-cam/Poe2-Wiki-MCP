import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchGemData } from "./wiki.ts"; // Import our fetcher

const server = new McpServer({
  name: "poe2-mechanical-source",
  version: "1.0.0",
});

const cache = new Map<string, { data: any; timestamp: number }>();

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
    const data = await fetchGemData(gemName);

    const cached = cache.get(gemName);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return { content: [{ type: "text", text: JSON.stringify(cached.data) }] };
    }

    if (!data) {
      return {
        content: [{ type: "text", text: `Could not find gem "${gemName}".` }],
      };
    }

    // This cleans up the wiki syntax for the human-readable summary
    const rawStatText = data.stat_text || "";
    const cleanStats = rawStatText
      .replace(/{{c\|.*?\|(.*?)}}/g, "$1") // Changes {{c|gem|Impact}} to "Impact"
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1") // Changes [[Link|Text]] or [[Text]] to "Text"
      .replace(/<.*?>/g, "") // Removes <br>, <big>, etc.
      .replace(/&nbsp;/g, " "); // Fixes non-breaking spaces

    // Now use 'cleanStats' in your response text
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

    return {
      content: [
        { type: "text", text: summary },
        // Keep the raw JSON exactly as is so Claude can still see hidden keys
        {
          type: "text",
          text: "FULL_DATA_JSON: " + JSON.stringify(data, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "search_gems",
  {
    description: "Search for a list of skill gems matching a keyword",
    inputSchema: {
      query: z.string().describe("Keyword to search for (e.g., 'Grenade')"),
    },
  },
  async ({ query }) => {
    const url = `https://www.poe2wiki.net/w/api.php?action=opensearch&search=${query}&limit=5&format=json`;
    const response = await fetch(url);
    const [, names] = await response.json();

    return {
      content: [
        {
          type: "text",
          text:
            names.length > 0
              ? `Found: ${names.join(", ")}`
              : "No gems found matching that name.",
        },
      ],
    };
  },
);

// Standard Main loop
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PoE2 MCP Server running on stdio");
}

main().catch(console.error);
