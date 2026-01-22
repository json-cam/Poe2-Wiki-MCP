import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchGemData, fetchCompatibleSupports } from "./wiki.ts";

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
  "get_compatible_supports",
  {
    description:
      "Finds support gems that are mechanically compatible with an active skill gem based on shared tags.",
    inputSchema: {
      gemName: z
        .string()
        .describe(
          "The name of the active gem to find supports for (e.g., 'Gas Grenade')",
        ),
    },
  },
  async ({ gemName }) => {
    // 1. First, get the active gem's data to see its tags
    const activeGem = await fetchGemData(gemName);

    if (!activeGem || !activeGem.gem_tags) {
      return {
        content: [
          {
            type: "text",
            text: `Could not find tags for ${gemName} to determine compatibility.`,
          },
        ],
      };
    }

    // 2. Extract tags (e.g., "Attack, AoE, Projectile" -> ["Attack", "AoE", "Projectile"])
    const tags = activeGem.gem_tags.split(",").map((t) => t.trim());

    // 3. Fetch supports that match those tags
    const supports = await fetchCompatibleSupports(tags);

    if (supports.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No matching support gems found for tags: ${activeGem.gem_tags}`,
          },
        ],
      };
    }

    // 4. Format the output
    const supportList = supports
      .map((s: any) => `* **${s.name}** (${s.gem_tags})\n  _${s.description}_`)
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `### Compatible Supports for ${gemName}\nBased on tags: **${activeGem.gem_tags}**\n\n${supportList}`,
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
