/**
 * Fetches the raw wiki page content for the specified Skill gem and parses the {{Item}} template
 * into a JSON object.
 *
 * @param {string} gemName - The name of the gem (e.g., "Gas Grenade")
 * @returns {Promise<Record<string, string> | null>} - The parsed JSON object or null if the page is not found
 */
export async function fetchGemData(gemName: string) {
  const baseUrl = "https://www.poe2wiki.net/w/api.php";
  const params = new URLSearchParams({
    action: "query",
    prop: "revisions",
    titles: gemName,
    rvprop: "content",
    format: "json",
    rvslots: "main",
    redirects: "1",
  });

  try {
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    const data = await response.json();
    if (!data.query?.pages) return null;

    const pageId = Object.keys(data.query.pages)[0];
    if (pageId === "-1") return null;

    const content = data.query.pages[pageId].revisions[0].slots.main["*"];

    const startIdx = content.indexOf("{{Item");
    if (startIdx === -1) return { raw: content.substring(0, 1000) };

    const remainingContent = content.substring(startIdx);

    const result: Record<string, string> = {};
    const lines = remainingContent.split("\n");

    let currentKey = "";

    for (const line of lines) {
      if (line.trim() === "}}") break;

      if (line.includes("=")) {
        // Handle lines starting with | (e.g., |stat_text = ...)
        const parts = line.split("=");
        const keyPart = parts[0].replace("|", "").trim();
        const valuePart = parts.slice(1).join("=").trim();

        if (keyPart) {
          currentKey = keyPart;
          result[currentKey] = valuePart;
        }
      } else if (currentKey && line.trim().startsWith("|") === false) {
        // This handles multi-line fields like stat_text
        // If the line doesn't have an '=' and doesn't start with '|',
        // it's a continuation of the previous key.
        result[currentKey] += "\n" + line.trim();
      }
    }

    return result;
  } catch (error) {
    console.error("Wiki Fetch Error:", error);
    return null;
  }
}

export async function fetchCompatibleSupports(gemName: string) {
  const baseUrl = "https://www.poe2wiki.net/w/api.php";
  const params = new URLSearchParams({
    action: "query",
    prop: "revisions",
    titles: gemName,
    rvprop: "content",
    format: "json",
    rvslots: "main",
    redirects: "1",
  });

  try {
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    const data = await response.json();
    const pages = data.query?.pages;
    if (!pages) return [];

    const pageId = Object.keys(pages)[0];
    const content = pages[pageId]?.revisions?.[0]?.slots?.main?.["*"];
    if (!content) return [];

    // 1. Target the specific "Recommended" section
    let startIdx = content.toLowerCase().indexOf("{{recommended support gems");
    if (startIdx === -1) {
      startIdx = content.toLowerCase().indexOf("==recommended support gems==");
    }

    if (startIdx === -1) return [];

    const lines = content.substring(startIdx).split("\n");
    const gems: string[] = [];

    for (const line of lines) {
      // Stop if we hit a new major section
      if (
        line.trim().startsWith("==") &&
        !line.toLowerCase().includes("recommended")
      )
        break;

      // Extract names from {{il|Gem Name}} or {{il|Gem Name|Display}}
      const ilMatches = line.matchAll(/{{il\|([^}|]+)(?:\|[^}]+)?}}/g);
      for (const match of ilMatches) {
        const name = match[1].trim();
        if (name && !gems.includes(name)) {
          gems.push(name);
        }
      }

      // Stop at the end of the template block
      if (line.trim() === "}}") break;
    }

    return gems.map((name) => ({
      name: name,
      description: "Recommended Support Gem",
    }));
  } catch (error) {
    console.error("Support Fetch Error:", error);
    return [];
  }
}

// Fallback logic to find links under a "Recommended" header if the template is missing
function fetchManualLinksFallback(content: string) {
  const recommendedSection = content.match(
    /==\s*Recommended support gems\s*==([\s\S]*?)(==|$)/i,
  );
  if (!recommendedSection) return [];

  const links = recommendedSection[1].matchAll(
    /\[\[([^]|]+)\]\]|{{il\|([^}|]+)}}/g,
  );

  return Array.from(links).map((m) => ({
    name: (m[1] || m[2]).trim(),
    description: "Manual Wiki Link",
  }));
}

// Simple fallback if the complex join fails
async function fetchSupportsFallback(tagConditions: string) {
  const baseUrl = "https://www.poe2wiki.net/w/api.php";
  const params = new URLSearchParams({
    action: "cargoquery",
    format: "json",
    tables: "items",
    fields: "name, tags",
    where: `class_id LIKE "%Support%Gem%" AND (${tagConditions})`,
    limit: "10",
  });
  const response = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await response.json();
  return (
    data.cargoquery?.map((item: any) => ({
      name: item.title.name,
      gem_tags: item.title.tags,
      description: "Refer to wiki for details.",
    })) || []
  );
}
